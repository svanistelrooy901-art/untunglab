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

    it('counts failures only inside the window', async () => {
      const s = await make();
      await s.recordFailure('1.1.1.1', '2026-09-30T00:00:00.000Z');
      await s.recordFailure('1.1.1.1', '2026-09-30T01:00:00.000Z');
      await s.recordFailure('2.2.2.2', '2026-09-30T01:00:00.000Z');
      expect(await s.countFailures('1.1.1.1', '2026-09-30T00:30:00.000Z')).toBe(1);
      expect(await s.countFailures('1.1.1.1', '2026-09-29T00:00:00.000Z')).toBe(2);
      expect(await s.countFailures('3.3.3.3', '2026-09-29T00:00:00.000Z')).toBe(0);
    });
  });
}
