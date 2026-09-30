import type { DeviceRecord, LicenseRecord, Order, Store } from '../core/ports';
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

  async countFailures(key: string, since: string) {
    const r = await this.db.prepare('SELECT COUNT(*) AS n FROM failures WHERE key = ? AND at >= ?').bind(key, since).first<{ n: number }>();
    return r?.n ?? 0;
  }
}
