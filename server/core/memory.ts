import type { DeviceRecord, LicenseRecord, Order, Stats, Store } from './ports';

/** In-memory store for tests. JavaScript runs each method to completion, so markOrderPaid is atomic here. */
export class MemoryStore implements Store {
  private orders = new Map<string, Order>();
  private licenses = new Map<string, LicenseRecord>();
  private devices = new Map<string, DeviceRecord[]>();
  private failures = new Map<string, string[]>();

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
    return [...this.orders.values()].filter((o) => o.status === 'paid').length;
  }
  async stats(recent: number): Promise<Stats> {
    const orders = [...this.orders.values()];
    const paid = orders.filter((o) => o.status === 'paid');
    const lic = [...this.licenses.values()];
    return {
      orders: orders.length,
      paid: paid.length,
      pending: orders.length - paid.length,
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
}
