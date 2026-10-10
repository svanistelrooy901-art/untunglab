import type { DeviceRecord, ExportRow, Insights, LicenseRecord, Order, OrderMeta, Ping, Stats, Store, Usage } from '../core/ports';
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
    const r = await this.db.prepare("SELECT COUNT(*) AS n FROM orders WHERE status = 'paid' AND amount_sen > 0").first<{ n: number }>();
    return r?.n ?? 0;
  }
  async countFailures(key: string, since: string) {
    const r = await this.db.prepare('SELECT COUNT(*) AS n FROM failures WHERE key = ? AND at >= ?').bind(key, since).first<{ n: number }>();
    return r?.n ?? 0;
  }

  async stats(recent: number): Promise<Stats> {
    const o = await this.db
      .prepare("SELECT COUNT(*) AS n, COALESCE(SUM(CASE WHEN status = 'paid' AND amount_sen > 0 THEN 1 ELSE 0 END), 0) AS paid, COALESCE(SUM(CASE WHEN status = 'paid' AND amount_sen = 0 THEN 1 ELSE 0 END), 0) AS free, COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_sen ELSE 0 END), 0) AS revenue FROM orders")
      .first<{ n: number; paid: number; free: number; revenue: number }>();
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
      orders: total, paid, complimentary: o?.free ?? 0, pending: total - paid - (o?.free ?? 0), revenueSen: o?.revenue ?? 0,
      activeLicenses: l?.active ?? 0, revokedLicenses: l?.revoked ?? 0, devices: d?.n ?? 0,
      recent: (r.results ?? []).map((x) => ({ id: x.id, name: x.name, email: x.email, amountSen: x.amount_sen, status: x.status, createdAt: x.created_at, paidAt: x.paid_at, licenseStatus: x.license_status })),
    };
  }

  async getMeta(orderId: string): Promise<OrderMeta> {
    const r = await this.db.prepare('SELECT source, note FROM order_meta WHERE order_id = ?').bind(orderId).first<{ source: string | null; note: string | null }>();
    return { source: r?.source ?? null, note: r?.note ?? null };
  }

  async setMeta(orderId: string, patch: { source?: string; note?: string }) {
    const cur = await this.getMeta(orderId);
    const source = patch.source === undefined ? cur.source : patch.source || null;
    const note = patch.note === undefined ? cur.note : patch.note || null;
    await this.db
      .prepare('INSERT INTO order_meta (order_id, source, note) VALUES (?,?,?) ON CONFLICT(order_id) DO UPDATE SET source = excluded.source, note = excluded.note')
      .bind(orderId, source, note)
      .run();
  }

  async logAdmin(at: string, action: string, target: string) {
    await this.db.prepare('INSERT INTO admin_log (at, action, target) VALUES (?,?,?)').bind(at, action, target).run();
  }

  async listAdminLog(limit: number) {
    const r = await this.db.prepare('SELECT at, action, target FROM admin_log ORDER BY at DESC, id DESC LIMIT ?').bind(limit).all<{ at: string; action: string; target: string }>();
    return r.results ?? [];
  }

  async insights(sinceDay: string): Promise<Insights> {
    const day = (col: string) => `substr(datetime(${col}, '+8 hours'), 1, 10)`;
    const daily = await this.db
      .prepare(
        `SELECT day, SUM(created) AS created, SUM(paid) AS paid, SUM(rev) AS rev FROM (
           SELECT ${day('created_at')} AS day, 1 AS created, 0 AS paid, 0 AS rev FROM orders WHERE amount_sen > 0
           UNION ALL
           SELECT ${day('paid_at')} AS day, 0, 1, amount_sen FROM orders WHERE status = 'paid' AND amount_sen > 0 AND paid_at IS NOT NULL
         ) WHERE day >= ? GROUP BY day ORDER BY day`,
      )
      .bind(sinceDay)
      .all<{ day: string; created: number; paid: number; rev: number }>();
    const sources = await this.db
      .prepare(
        `SELECT COALESCE(m.source, '') AS source, COUNT(*) AS orders, SUM(CASE WHEN o.status = 'paid' THEN 1 ELSE 0 END) AS paid
           FROM orders o LEFT JOIN order_meta m ON m.order_id = o.id WHERE o.amount_sen > 0 GROUP BY COALESCE(m.source, '') ORDER BY orders DESC, source`,
      )
      .all<{ source: string; orders: number; paid: number }>();
    const unactivated = await this.db
      .prepare(
        `SELECT o.id, o.name, o.email, o.license_code, o.paid_at FROM orders o JOIN licenses l ON l.code = o.license_code
           WHERE o.status = 'paid' AND o.amount_sen > 0 AND l.status = 'active' AND NOT EXISTS (SELECT 1 FROM devices d WHERE d.code = o.license_code)
           ORDER BY o.paid_at LIMIT 20`,
      )
      .all<{ id: string; name: string; email: string; license_code: string; paid_at: string }>();
    const emailPending = await this.db
      .prepare("SELECT id, name, email, license_code FROM orders WHERE status = 'paid' AND license_code IS NOT NULL AND email_sent_at IS NULL ORDER BY paid_at LIMIT 20")
      .all<{ id: string; name: string; email: string; license_code: string }>();
    return {
      daily: (daily.results ?? []).map((d) => ({ day: d.day, created: d.created, paid: d.paid, revenueSen: d.rev })),
      sources: (sources.results ?? []).map((x) => ({ source: x.source, orders: x.orders, paid: x.paid })),
      unactivated: (unactivated.results ?? []).map((x) => ({ orderId: x.id, name: x.name, email: x.email, code: x.license_code, paidAt: x.paid_at })),
      emailPending: (emailPending.results ?? []).map((x) => ({ orderId: x.id, name: x.name, email: x.email, code: x.license_code })),
    };
  }

  async exportRows(): Promise<ExportRow[]> {
    const r = await this.db
      .prepare(
        `SELECT o.id, o.name, o.email, o.phone, o.amount_sen, o.status, o.created_at, o.paid_at, o.license_code, l.status AS license_status,
                (SELECT COUNT(*) FROM devices d WHERE d.code = o.license_code) AS devices, m.source, m.note
           FROM orders o LEFT JOIN licenses l ON l.code = o.license_code LEFT JOIN order_meta m ON m.order_id = o.id ORDER BY o.created_at, o.rowid`,
      )
      .all<{ id: string; name: string; email: string; phone: string; amount_sen: number; status: 'pending' | 'paid'; created_at: string; paid_at: string | null; license_code: string | null; license_status: 'active' | 'revoked' | null; devices: number; source: string | null; note: string | null }>();
    return (r.results ?? []).map((x) => ({
      orderId: x.id, name: x.name, email: x.email, phone: x.phone, amountSen: x.amount_sen, status: x.status, createdAt: x.created_at, paidAt: x.paid_at,
      code: x.license_code, licenseStatus: x.license_status, devices: x.devices, source: x.source, note: x.note,
    }));
  }

  async countHit(at: string, kind: 'view' | 'start') {
    const day = new Date(new Date(at).getTime() + 8 * 3600_000).toISOString().slice(0, 10);
    await this.db.prepare('INSERT INTO hits (day, kind, n) VALUES (?,?,1) ON CONFLICT(day, kind) DO UPDATE SET n = n + 1').bind(day, kind).run();
  }

  async recordPing(p: Ping) {
    await this.db
      .prepare(
        'INSERT INTO installs (id, first_seen, last_seen, version, lang, platform) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET last_seen = excluded.last_seen, version = excluded.version, lang = excluded.lang, platform = excluded.platform',
      )
      .bind(p.id, p.at, p.at, p.version, p.lang, p.platform)
      .run();
  }

  async usage(sinceDay: string, nowIso: string): Promise<Usage> {
    const hits = await this.db
      .prepare("SELECT day, SUM(CASE WHEN kind = 'view' THEN n ELSE 0 END) AS view, SUM(CASE WHEN kind = 'start' THEN n ELSE 0 END) AS start FROM hits WHERE day >= ? GROUP BY day ORDER BY day")
      .bind(sinceDay)
      .all<{ day: string; view: number; start: number }>();
    const fresh = await this.db
      .prepare("SELECT substr(datetime(first_seen, '+8 hours'), 1, 10) AS day, COUNT(*) AS n FROM installs WHERE substr(datetime(first_seen, '+8 hours'), 1, 10) >= ? GROUP BY day ORDER BY day")
      .bind(sinceDay)
      .all<{ day: string; n: number }>();
    const total = await this.db.prepare('SELECT COUNT(*) AS n FROM installs').first<{ n: number }>();
    const weekAgo = new Date(new Date(nowIso).getTime() - 7 * 86_400_000).toISOString();
    const active = await this.db.prepare('SELECT COUNT(*) AS n FROM installs WHERE last_seen >= ?').bind(weekAgo).first<{ n: number }>();
    const byLang = await this.db.prepare('SELECT lang AS key, COUNT(*) AS n FROM installs GROUP BY lang ORDER BY n DESC, key').all<{ key: string; n: number }>();
    const byPlatform = await this.db.prepare('SELECT platform AS key, COUNT(*) AS n FROM installs GROUP BY platform ORDER BY n DESC, key').all<{ key: string; n: number }>();
    return {
      hits: (hits.results ?? []).map((h) => ({ day: h.day, view: h.view, start: h.start })),
      installs: {
        total: total?.n ?? 0,
        newByDay: (fresh.results ?? []).map((f) => ({ day: f.day, n: f.n })),
        activeWeek: active?.n ?? 0,
        byLang: byLang.results ?? [],
        byPlatform: byPlatform.results ?? [],
      },
    };
  }
}
