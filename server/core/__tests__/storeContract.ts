import { describe, expect, it } from 'vitest';
import type { Order, Store } from '../ports';

const order = (over: Partial<Order> = {}): Order => ({
  id: 'o1', name: 'Aminah', email: 'Aminah@Example.com', phone: '0123456789', amountSen: 5900, status: 'pending', billCode: 'B1',
  licenseCode: null, emailSentAt: null, createdAt: '2026-09-30T00:00:00.000Z', paidAt: null, ...over,
});

/** The same behaviour is required of the in-memory store used in tests and the D1 store used in production. */
export function describeStore(name: string, make: () => Promise<Store>) {
  describe(`${name} satisfies the Store contract`, () => {
    it('stores and returns an order', async () => {
      const s = await make();
      await s.createOrder(order());
      expect(await s.getOrder('o1')).toEqual(order());
      expect(await s.getOrder('nope')).toBeNull();
    });

    it('marks an order paid once, creating exactly one licence', async () => {
      const s = await make();
      await s.createOrder(order());
      expect(await s.markOrderPaid('o1', 'UL-AAAA-BBBB-CCCC', '2026-09-30T01:00:00.000Z')).toEqual({ code: 'UL-AAAA-BBBB-CCCC', first: true });
      expect(await s.markOrderPaid('o1', 'UL-DDDD-EEEE-FFFF', '2026-09-30T02:00:00.000Z')).toEqual({ code: 'UL-AAAA-BBBB-CCCC', first: false });
      expect(await s.getLicense('UL-DDDD-EEEE-FFFF')).toBeNull();
      expect(await s.getLicense('UL-AAAA-BBBB-CCCC')).toMatchObject({ orderId: 'o1', status: 'active' });
      expect(await s.getOrder('o1')).toMatchObject({ status: 'paid', licenseCode: 'UL-AAAA-BBBB-CCCC', paidAt: '2026-09-30T01:00:00.000Z' });
    });

    it('parallel callbacks race safely: one winner, one licence, everyone sees the same code', async () => {
      const s = await make();
      await s.createOrder(order());
      const results = await Promise.all(['UL-AAAA-AAAA-AAAA', 'UL-BBBB-BBBB-BBBB', 'UL-CCCC-CCCC-CCCC'].map((c) => s.markOrderPaid('o1', c, '2026-09-30T01:00:00.000Z')));
      expect(results.filter((r) => r.first)).toHaveLength(1);
      expect(new Set(results.map((r) => r.code)).size).toBe(1);
      const winner = results[0]!.code;
      for (const c of ['UL-AAAA-AAAA-AAAA', 'UL-BBBB-BBBB-BBBB', 'UL-CCCC-CCCC-CCCC']) {
        expect(!!(await s.getLicense(c))).toBe(c === winner);
      }
    });

    it('refuses a code that another order already owns, so the caller can pick a new one', async () => {
      const s = await make();
      await s.createOrder(order());
      await s.createOrder(order({ id: 'o2' }));
      await s.markOrderPaid('o1', 'UL-AAAA-BBBB-CCCC', '2026-09-30T01:00:00.000Z');
      await expect(s.markOrderPaid('o2', 'UL-AAAA-BBBB-CCCC', '2026-09-30T01:00:00.000Z')).rejects.toThrow();
      expect((await s.getOrder('o2'))?.status).toBe('pending');
    });

    it('finds orders by email without caring about case, and records email sent', async () => {
      const s = await make();
      await s.createOrder(order());
      expect((await s.findOrdersByEmail('aminah@example.com')).map((o) => o.id)).toEqual(['o1']);
      expect(await s.findOrdersByEmail('other@example.com')).toEqual([]);
      await s.updateOrder('o1', { emailSentAt: '2026-09-30T03:00:00.000Z' });
      expect((await s.getOrder('o1'))?.emailSentAt).toBe('2026-09-30T03:00:00.000Z');
    });

    it('revokes a licence, and says so when the code does not exist', async () => {
      const s = await make();
      await s.createOrder(order());
      await s.markOrderPaid('o1', 'UL-AAAA-BBBB-CCCC', '2026-09-30T01:00:00.000Z');
      expect(await s.setLicenseStatus('UL-AAAA-BBBB-CCCC', 'revoked')).toBe(true);
      expect((await s.getLicense('UL-AAAA-BBBB-CCCC'))?.status).toBe('revoked');
      expect(await s.setLicenseStatus('UL-ZZZZ-ZZZZ-ZZZZ', 'revoked')).toBe(false);
    });

    it('adds, lists, removes and clears devices; adding the same device twice never duplicates it', async () => {
      const s = await make();
      await s.createOrder(order());
      await s.markOrderPaid('o1', 'UL-AAAA-BBBB-CCCC', '2026-09-30T01:00:00.000Z');
      const c = 'UL-AAAA-BBBB-CCCC';
      await s.addDevice(c, { deviceId: 'd1', label: 'iPhone', activatedAt: '2026-09-30T01:00:00.000Z' });
      await s.addDevice(c, { deviceId: 'd2', label: 'iPad', activatedAt: '2026-09-30T02:00:00.000Z' });
      expect((await s.listDevices(c)).map((d) => d.deviceId).sort()).toEqual(['d1', 'd2']);
      expect(await s.removeDevice(c, 'd1')).toBe(true);
      expect(await s.removeDevice(c, 'd1')).toBe(false);
      await s.clearDevices(c);
      expect(await s.listDevices(c)).toEqual([]);
    });

    it('counts only paid orders', async () => {
      const s = await make();
      await s.createOrder(order());
      expect(await s.countPaidOrders()).toBe(0);
      await s.markOrderPaid('o1', 'UL-AAAA-BBBB-CCCC', '2026-09-30T01:00:00.000Z');
      expect(await s.countPaidOrders()).toBe(1);
    });

    it('counts failures only inside the window', async () => {
      const s = await make();
      await s.recordFailure('1.1.1.1', '2026-09-30T00:00:00.000Z');
      await s.recordFailure('1.1.1.1', '2026-09-30T01:00:00.000Z');
      await s.recordFailure('2.2.2.2', '2026-09-30T01:00:00.000Z');
      expect(await s.countFailures('1.1.1.1', '2026-09-30T00:30:00.000Z')).toBe(1);
      expect(await s.countFailures('1.1.1.1', '2026-09-29T00:00:00.000Z')).toBe(2);
      expect(await s.countFailures('3.3.3.3', '2026-09-29T00:00:00.000Z')).toBe(0);
    });

    it('summarises orders, revenue, licences and devices for the admin dashboard', async () => {
      const s = await make();
      await s.createOrder(order({ id: 'o1', email: 'a@x.com', createdAt: '2026-09-30T00:00:00.000Z' }));
      await s.createOrder(order({ id: 'o2', email: 'b@x.com', amountSen: 3900, createdAt: '2026-09-30T00:10:00.000Z' }));
      await s.createOrder(order({ id: 'o3', email: 'c@x.com', createdAt: '2026-09-30T00:20:00.000Z' }));
      await s.markOrderPaid('o1', 'UL-AAAA-AAAA-AAAA', '2026-09-30T01:00:00.000Z');
      await s.markOrderPaid('o2', 'UL-BBBB-BBBB-BBBB', '2026-09-30T02:00:00.000Z');
      await s.setLicenseStatus('UL-BBBB-BBBB-BBBB', 'revoked');
      await s.addDevice('UL-AAAA-AAAA-AAAA', { deviceId: 'd1', label: 'iPhone', activatedAt: '2026-09-30T03:00:00.000Z' });
      await s.addDevice('UL-AAAA-AAAA-AAAA', { deviceId: 'd2', label: 'Laptop', activatedAt: '2026-09-30T03:00:00.000Z' });
      const st = await s.stats(2);
      expect(st).toMatchObject({ orders: 3, paid: 2, pending: 1, revenueSen: 9800, complimentary: 0, activeLicenses: 1, revokedLicenses: 1, devices: 2 });
      expect(st.recent.map((r) => r.id)).toEqual(['o3', 'o2']);
      expect(st.recent[1]).toMatchObject({ email: 'b@x.com', status: 'paid', licenseStatus: 'revoked', amountSen: 3900 });
      expect(st.recent[0]).toMatchObject({ licenseStatus: null });
    });

    it('free (RM0) licences are counted apart: not as buyers, not in revenue, not against early-bird places', async () => {
      const s = await make();
      await s.createOrder(order({ id: 'o1', email: 'a@x.com' }));
      await s.createOrder(order({ id: 'o2', email: 'me@x.com', amountSen: 0, billCode: 'FREE' }));
      await s.markOrderPaid('o1', 'UL-AAAA-AAAA-AAAA', '2026-09-30T01:00:00.000Z');
      await s.markOrderPaid('o2', 'UL-BBBB-BBBB-BBBB', '2026-09-30T02:00:00.000Z');
      expect(await s.countPaidOrders()).toBe(1);
      expect(await s.stats(10)).toMatchObject({ orders: 2, paid: 1, complimentary: 1, pending: 0, revenueSen: 5900, activeLicenses: 2 });
    });

    it('keeps a source and a note per order, and an admin action log (newest first)', async () => {
      const s = await make();
      await s.createOrder(order({ id: 'o1' }));
      expect(await s.getMeta('o1')).toEqual({ source: null, note: null });
      await s.setMeta('o1', { source: 'fb' });
      await s.setMeta('o1', { note: 'minta refund' });
      expect(await s.getMeta('o1')).toEqual({ source: 'fb', note: 'minta refund' });
      await s.setMeta('o1', { note: '' });
      expect(await s.getMeta('o1')).toEqual({ source: 'fb', note: null });
      await s.logAdmin('2026-09-30T01:00:00.000Z', 'revoke', 'UL-AAAA-BBBB-CCCC');
      await s.logAdmin('2026-09-30T02:00:00.000Z', 'resend', 'o1');
      expect((await s.listAdminLog(10)).map((l) => l.action)).toEqual(['resend', 'revoke']);
      expect(await s.listAdminLog(1)).toEqual([{ at: '2026-09-30T02:00:00.000Z', action: 'resend', target: 'o1' }]);
    });

    it('insights: sales by Malaysian day, sources, bought-but-never-activated, and emails not sent', async () => {
      const s = await make();
      // 2026-09-30T17:00Z is already 2026-10-01 in Malaysia (UTC+8).
      await s.createOrder(order({ id: 'o1', email: 'a@x.com', createdAt: '2026-09-30T17:00:00.000Z' }));
      await s.createOrder(order({ id: 'o2', email: 'b@x.com', amountSen: 3900, createdAt: '2026-10-01T02:00:00.000Z' }));
      await s.createOrder(order({ id: 'o3', email: 'c@x.com', createdAt: '2026-10-02T02:00:00.000Z' }));
      await s.createOrder(order({ id: 'o4', email: 'me@x.com', amountSen: 0, billCode: 'FREE', createdAt: '2026-10-02T03:00:00.000Z' }));
      await s.setMeta('o1', { source: 'fb' });
      await s.setMeta('o2', { source: 'fb' });
      await s.markOrderPaid('o1', 'UL-AAAA-AAAA-AAAA', '2026-09-30T18:00:00.000Z');
      await s.markOrderPaid('o2', 'UL-BBBB-BBBB-BBBB', '2026-10-01T03:00:00.000Z');
      await s.markOrderPaid('o4', 'UL-DDDD-DDDD-DDDD', '2026-10-02T03:00:00.000Z');
      await s.updateOrder('o2', { emailSentAt: '2026-10-01T03:00:05.000Z' });
      await s.addDevice('UL-BBBB-BBBB-BBBB', { deviceId: 'd1', label: 'iPhone', activatedAt: '2026-10-01T04:00:00.000Z' });
      const i = await s.insights('2026-10-01');
      expect(i.daily).toEqual([
        { day: '2026-10-01', created: 2, paid: 2, revenueSen: 9800 },
        { day: '2026-10-02', created: 1, paid: 0, revenueSen: 0 },
      ]);
      expect(i.sources).toEqual([
        { source: 'fb', orders: 2, paid: 2 },
        { source: '', orders: 1, paid: 0 },
      ]);
      expect(i.unactivated).toEqual([{ orderId: 'o1', name: 'Aminah', email: 'a@x.com', code: 'UL-AAAA-AAAA-AAAA', paidAt: '2026-09-30T18:00:00.000Z' }]);
      expect(i.emailPending.map((e) => e.orderId)).toEqual(['o1', 'o4']);
    });

    it('exports every order with its licence, devices, source and note', async () => {
      const s = await make();
      await s.createOrder(order({ id: 'o1', email: 'a@x.com' }));
      await s.createOrder(order({ id: 'o2', email: 'b@x.com', createdAt: '2026-09-30T00:10:00.000Z' }));
      await s.setMeta('o1', { source: 'wa', note: 'reseller' });
      await s.markOrderPaid('o1', 'UL-AAAA-AAAA-AAAA', '2026-09-30T01:00:00.000Z');
      await s.addDevice('UL-AAAA-AAAA-AAAA', { deviceId: 'd1', label: 'iPhone', activatedAt: '2026-09-30T03:00:00.000Z' });
      const rows = await s.exportRows();
      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({ orderId: 'o1', email: 'a@x.com', phone: '0123456789', amountSen: 5900, status: 'paid', code: 'UL-AAAA-AAAA-AAAA', licenseStatus: 'active', devices: 1, source: 'wa', note: 'reseller' });
      expect(rows[1]).toMatchObject({ orderId: 'o2', status: 'pending', code: null, licenseStatus: null, devices: 0, source: null, note: null });
    });

    it('stats on an empty store are all zero', async () => {
      const s = await make();
      expect(await s.stats(10)).toEqual({ orders: 0, paid: 0, complimentary: 0, pending: 0, revenueSen: 0, activeLicenses: 0, revokedLicenses: 0, devices: 0, recent: [] });
    });
  });
}
