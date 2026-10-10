import type { DeviceRecord, ExportRow, Insights, LicenseRecord, Order, OrderMeta, Ping, Stats, Store, Usage } from './ports';

/** In-memory store for tests. JavaScript runs each method to completion, so markOrderPaid is atomic here. */
export class MemoryStore implements Store {
  private orders = new Map<string, Order>();
  private licenses = new Map<string, LicenseRecord>();
  private devices = new Map<string, DeviceRecord[]>();
  private failures = new Map<string, string[]>();
  private meta = new Map<string, OrderMeta>();
  private hits = new Map<string, { view: number; start: number }>();
  private installs = new Map<string, { firstSeen: string; lastSeen: string; lang: string; platform: string }>();
  private log: { at: string; action: string; target: string }[] = [];

  licenseCount(): number {
    return this.licenses.size;
  }
  async createOrder(order: Order) {
    this.orders.set(order.id, { ...order });
  }
  async getOrder(id: string) {
    const o = this.orders.get(id);
    return o ? { ...o } : null;
  }
  async updateOrder(id: string, patch: Partial<Pick<Order, 'emailSentAt'>>) {
    const o = this.orders.get(id);
    if (o) this.orders.set(id, { ...o, ...patch });
  }
  async markOrderPaid(orderId: string, code: string, at: string) {
    const o = this.orders.get(orderId);
    if (!o) throw new Error('unknown order');
    if (o.licenseCode) return { code: o.licenseCode, first: false };
    if (this.licenses.has(code)) throw new Error('code collision');
    this.licenses.set(code, { code, orderId, status: 'active', createdAt: at });
    this.orders.set(orderId, { ...o, status: 'paid', licenseCode: code, paidAt: at });
    return { code, first: true };
  }
  async findOrdersByEmail(email: string) {
    return [...this.orders.values()].filter((o) => o.email.toLowerCase() === email.toLowerCase()).map((o) => ({ ...o }));
  }
  async getLicense(code: string) {
    const l = this.licenses.get(code);
    return l ? { ...l } : null;
  }
  async setLicenseStatus(code: string, status: LicenseRecord['status']) {
    const l = this.licenses.get(code);
    if (!l) return false;
    this.licenses.set(code, { ...l, status });
    return true;
  }
  async listDevices(code: string) {
    return (this.devices.get(code) ?? []).map((d) => ({ ...d }));
  }
  async addDevice(code: string, device: DeviceRecord) {
    this.devices.set(code, [...(this.devices.get(code) ?? []), { ...device }]);
  }
  async removeDevice(code: string, deviceId: string) {
    const list = this.devices.get(code) ?? [];
    const next = list.filter((d) => d.deviceId !== deviceId);
    this.devices.set(code, next);
    return next.length !== list.length;
  }
  async clearDevices(code: string) {
    this.devices.set(code, []);
  }
  async recordFailure(key: string, at: string) {
    this.failures.set(key, [...(this.failures.get(key) ?? []), at]);
  }
  async countPaidOrders() {
    return [...this.orders.values()].filter((o) => o.status === 'paid' && o.amountSen > 0).length;
  }
  async stats(recent: number): Promise<Stats> {
    const orders = [...this.orders.values()];
    const paid = orders.filter((o) => o.status === 'paid' && o.amountSen > 0);
    const free = orders.filter((o) => o.status === 'paid' && o.amountSen === 0);
    const lic = [...this.licenses.values()];
    return {
      orders: orders.length,
      paid: paid.length,
      complimentary: free.length,
      pending: orders.length - paid.length - free.length,
      revenueSen: paid.reduce((n, o) => n + o.amountSen, 0),
      activeLicenses: lic.filter((l) => l.status === 'active').length,
      revokedLicenses: lic.filter((l) => l.status === 'revoked').length,
      devices: [...this.devices.values()].reduce((n, d) => n + d.length, 0),
      recent: orders
        .map((o, i) => ({ o, i }))
        .sort((a, b) => (a.o.createdAt < b.o.createdAt ? 1 : a.o.createdAt > b.o.createdAt ? -1 : b.i - a.i))
        .slice(0, recent)
        .map(({ o }) => ({
          id: o.id, name: o.name, email: o.email, amountSen: o.amountSen, status: o.status, createdAt: o.createdAt, paidAt: o.paidAt,
          licenseStatus: o.licenseCode ? (this.licenses.get(o.licenseCode)?.status ?? null) : null,
        })),
    };
  }
  async countFailures(key: string, since: string) {
    return (this.failures.get(key) ?? []).filter((t) => t >= since).length;
  }

  async getMeta(orderId: string): Promise<OrderMeta> {
    return { ...(this.meta.get(orderId) ?? { source: null, note: null }) };
  }
  async setMeta(orderId: string, patch: { source?: string; note?: string }) {
    const cur = this.meta.get(orderId) ?? { source: null, note: null };
    this.meta.set(orderId, {
      source: patch.source === undefined ? cur.source : patch.source || null,
      note: patch.note === undefined ? cur.note : patch.note || null,
    });
  }
  async logAdmin(at: string, action: string, target: string) {
    this.log.push({ at, action, target });
  }
  async listAdminLog(limit: number) {
    return this.log.map((l, i) => ({ l, i })).sort((a, b) => (a.l.at < b.l.at ? 1 : a.l.at > b.l.at ? -1 : b.i - a.i)).slice(0, limit).map(({ l }) => ({ ...l }));
  }
  async insights(sinceDay: string): Promise<Insights> {
    const myDay = (iso: string) => new Date(new Date(iso).getTime() + 8 * 3600_000).toISOString().slice(0, 10);
    const priced = [...this.orders.values()].filter((o) => o.amountSen > 0);
    const days = new Map<string, { created: number; paid: number; revenueSen: number }>();
    const bucket = (day: string) => days.get(day) ?? days.set(day, { created: 0, paid: 0, revenueSen: 0 }).get(day)!;
    for (const o of priced) {
      if (myDay(o.createdAt) >= sinceDay) bucket(myDay(o.createdAt)).created++;
      if (o.status === 'paid' && o.paidAt && myDay(o.paidAt) >= sinceDay) {
        const b = bucket(myDay(o.paidAt));
        b.paid++;
        b.revenueSen += o.amountSen;
      }
    }
    const src = new Map<string, { orders: number; paid: number }>();
    for (const o of priced) {
      const key = this.meta.get(o.id)?.source ?? '';
      const b = src.get(key) ?? src.set(key, { orders: 0, paid: 0 }).get(key)!;
      b.orders++;
      if (o.status === 'paid') b.paid++;
    }
    const paidOrders = [...this.orders.values()].filter((o) => o.status === 'paid' && o.licenseCode).sort((a, b) => (a.paidAt! < b.paidAt! ? -1 : 1));
    return {
      daily: [...days.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([day, v]) => ({ day, ...v })),
      sources: [...src.entries()].map(([source, v]) => ({ source, ...v })).sort((a, b) => b.orders - a.orders),
      unactivated: paidOrders
        .filter((o) => o.amountSen > 0 && this.licenses.get(o.licenseCode!)?.status === 'active' && (this.devices.get(o.licenseCode!) ?? []).length === 0)
        .slice(0, 20)
        .map((o) => ({ orderId: o.id, name: o.name, email: o.email, code: o.licenseCode!, paidAt: o.paidAt! })),
      emailPending: paidOrders.filter((o) => !o.emailSentAt).slice(0, 20).map((o) => ({ orderId: o.id, name: o.name, email: o.email, code: o.licenseCode! })),
    };
  }
  async exportRows(): Promise<ExportRow[]> {
    return [...this.orders.values()]
      .map((o, i) => ({ o, i }))
      .sort((a, b) => (a.o.createdAt < b.o.createdAt ? -1 : a.o.createdAt > b.o.createdAt ? 1 : a.i - b.i))
      .map(({ o }) => {
        const m = this.meta.get(o.id);
        return {
          orderId: o.id, name: o.name, email: o.email, phone: o.phone, amountSen: o.amountSen, status: o.status, createdAt: o.createdAt, paidAt: o.paidAt,
          code: o.licenseCode, licenseStatus: o.licenseCode ? (this.licenses.get(o.licenseCode)?.status ?? null) : null,
          devices: o.licenseCode ? (this.devices.get(o.licenseCode) ?? []).length : 0, source: m?.source ?? null, note: m?.note ?? null,
        };
      });
  }

  async countHit(at: string, kind: 'view' | 'start') {
    const day = new Date(new Date(at).getTime() + 8 * 3600_000).toISOString().slice(0, 10);
    const h = this.hits.get(day) ?? { view: 0, start: 0 };
    h[kind]++;
    this.hits.set(day, h);
  }
  async recordPing(p: Ping) {
    const cur = this.installs.get(p.id);
    this.installs.set(p.id, { firstSeen: cur?.firstSeen ?? p.at, lastSeen: p.at, lang: p.lang, platform: p.platform });
  }
  async usage(sinceDay: string, nowIso: string): Promise<Usage> {
    const myDay = (iso: string) => new Date(new Date(iso).getTime() + 8 * 3600_000).toISOString().slice(0, 10);
    const tally = (pick: (i: { lang: string; platform: string }) => string) => {
      const m = new Map<string, number>();
      for (const i of this.installs.values()) m.set(pick(i), (m.get(pick(i)) ?? 0) + 1);
      return [...m.entries()].map(([key, n]) => ({ key, n })).sort((a, b) => b.n - a.n || (a.key < b.key ? -1 : 1));
    };
    const weekAgo = new Date(new Date(nowIso).getTime() - 7 * 86_400_000).toISOString();
    const fresh = new Map<string, number>();
    for (const i of this.installs.values()) if (myDay(i.firstSeen) >= sinceDay) fresh.set(myDay(i.firstSeen), (fresh.get(myDay(i.firstSeen)) ?? 0) + 1);
    return {
      hits: [...this.hits.entries()].filter(([d]) => d >= sinceDay).sort(([a], [b]) => (a < b ? -1 : 1)).map(([day, h]) => ({ day, ...h })),
      installs: {
        total: this.installs.size,
        newByDay: [...fresh.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([day, n]) => ({ day, n })),
        activeWeek: [...this.installs.values()].filter((i) => i.lastSeen >= weekAgo).length,
        byLang: tally((i) => i.lang),
        byPlatform: tally((i) => i.platform),
      },
    };
  }
}
