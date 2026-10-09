import type { DeviceRecord, LicenseRecord, Order, Stats, Store } from '../core/ports';
import type { D1Database } from './d1';

interface OrderRow {
  id: string; name: string; email: string; phone: string; amount_sen: number; status: 'pending' | 'paid'; bill_code: string;
  license_code: string | null; email_sent_at: string | null; created_at: string; paid_at: string | null;
}

const toOrder = (r: OrderRow): Order => ({
  id: r.id, name: r.name, email: r.email, phone: r.phone, amountSen: r.amount_sen, status: r.status, billCode: r.bill_code,
  licenseCode: r.license_code, emailSentAt: r.email_sent_at, createdAt: r.created_at, paidAt: r.paid_at,
});

export class D1Store implements Store {
  constructor(private db: D1Database) {}

  async createOrder(o: Order) {
    await this.db
      .prepare('INSERT INTO orders (id, name, email, phone, amount_sen, status, bill_code, license_code, email_sent_at, created_at, paid_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .bind(o.id, o.name, o.email, o.phone, o.amountSen, o.status, o.billCode, o.licenseCode, o.emailSentAt, o.createdAt, o.paidAt)
      .run();
  }

  async getOrder(id: string) {
    const r = await this.db.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first<OrderRow>();
    return r ? toOrder(r) : null;
  }

  async updateOrder(id: string, patch: Partial<Pick<Order, 'emailSentAt'>>) {
    if (patch.emailSentAt !== undefined) await this.db.prepare('UPDATE orders SET email_sent_at = ? WHERE id = ?').bind(patch.emailSentAt, id).run();
  }

  /**
   * Insert the licence first (its primary key rejects a duplicate code), then claim the order only if nobody else has.
   * The loser of a race deletes its own unused licence and returns the winner's code.
   */
  async markOrderPaid(orderId: string, code: string, at: string) {
    await this.db.prepare('INSERT INTO licenses (code, order_id, status, created_at) VALUES (?,?,?,?)').bind(code, orderId, 'active', at).run();
    const claim = await this.db
      .prepare("UPDATE orders SET status = 'paid', license_code = ?, paid_at = ? WHERE id = ? AND license_code IS NULL")
      .bind(code, at, orderId)
      .run();
    if (claim.meta.changes === 1) return { code, first: true };
    await this.db.prepare('DELETE FROM licenses WHERE code = ?').bind(code).run();
    const existing = await this.getOrder(orderId);
    if (!existing?.licenseCode) throw new Error('unknown order');
    return { code: existing.licenseCode, first: false };
  }

  async findOrdersByEmail(email: string) {
    const r = await this.db.prepare('SELECT * FROM orders WHERE lower(email) = lower(?) ORDER BY created_at').bind(email).all<OrderRow>();
    return (r.results ?? []).map(toOrder);
  }

  async getLicense(code: string) {
    const r = await this.db.prepare('SELECT code, order_id, status, created_at FROM licenses WHERE code = ?').bind(code).first<{ code: string; order_id: string; status: LicenseRecord['status']; created_at: string }>();
    return r ? { code: r.code, orderId: r.order_id, status: r.status, createdAt: r.created_at } : null;
  }

  async setLicenseStatus(code: string, status: LicenseRecord['status']) {
    const r = await this.db.prepare('UPDATE licenses SET status = ? WHERE code = ?').bind(status, code).run();
    return r.meta.changes === 1;
  }

  async listDevices(code: string): Promise<DeviceRecord[]> {
    const r = await this.db.prepare('SELECT device_id, label, activated_at FROM devices WHERE code = ? ORDER BY activated_at').bind(code).all<{ device_id: string; label: string; activated_at: string }>();
    return (r.results ?? []).map((d) => ({ deviceId: d.device_id, label: d.label, activatedAt: d.activated_at }));
  }

  async addDevice(code: string, d: DeviceRecord) {
    await this.db.prepare('INSERT OR IGNORE INTO devices (code, device_id, label, activated_at) VALUES (?,?,?,?)').bind(code, d.deviceId, d.label, d.activatedAt).run();
  }

  async removeDevice(code: string, deviceId: string) {
    const r = await this.db.prepare('DELETE FROM devices WHERE code = ? AND device_id = ?').bind(code, deviceId).run();
    return r.meta.changes === 1;
  }

  async clearDevices(code: string) {
    await this.db.prepare('DELETE FROM devices WHERE code = ?').bind(code).run();
  }

  async recordFailure(key: string, at: string) {
    await this.db.prepare('INSERT INTO failures (key, at) VALUES (?,?)').bind(key, at).run();
  }

  async countPaidOrders() {
    const r = await this.db.prepare("SELECT COUNT(*) AS n FROM orders WHERE status = 'paid'").first<{ n: number }>();
    return r?.n ?? 0;
  }
  async countFailures(key: string, since: string) {
    const r = await this.db.prepare('SELECT COUNT(*) AS n FROM failures WHERE key = ? AND at >= ?').bind(key, since).first<{ n: number }>();
    return r?.n ?? 0;
  }

  async stats(recent: number): Promise<Stats> {
    const o = await this.db
      .prepare("SELECT COUNT(*) AS n, COALESCE(SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END), 0) AS paid, COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_sen ELSE 0 END), 0) AS revenue FROM orders")
      .first<{ n: number; paid: number; revenue: number }>();
    const l = await this.db
      .prepare("SELECT COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) AS active, COALESCE(SUM(CASE WHEN status = 'revoked' THEN 1 ELSE 0 END), 0) AS revoked FROM licenses")
      .first<{ active: number; revoked: number }>();
    const d = await this.db.prepare('SELECT COUNT(*) AS n FROM devices').first<{ n: number }>();
    const r = await this.db
      .prepare('SELECT o.id, o.name, o.email, o.amount_sen, o.status, o.created_at, o.paid_at, l.status AS license_status FROM orders o LEFT JOIN licenses l ON l.code = o.license_code ORDER BY o.created_at DESC, o.rowid DESC LIMIT ?')
      .bind(recent)
      .all<{ id: string; name: string; email: string; amount_sen: number; status: 'pending' | 'paid'; created_at: string; paid_at: string | null; license_status: 'active' | 'revoked' | null }>();
    const total = o?.n ?? 0;
    const paid = o?.paid ?? 0;
    return {
      orders: total, paid, pending: total - paid, revenueSen: o?.revenue ?? 0,
      activeLicenses: l?.active ?? 0, revokedLicenses: l?.revoked ?? 0, devices: d?.n ?? 0,
      recent: (r.results ?? []).map((x) => ({ id: x.id, name: x.name, email: x.email, amountSen: x.amount_sen, status: x.status, createdAt: x.created_at, paidAt: x.paid_at, licenseStatus: x.license_status })),
    };
  }
}
