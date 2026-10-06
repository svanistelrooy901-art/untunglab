import { describe, expect, it } from 'vitest';
import { verifyLicense } from '../../../src/license/token';
import { md5 } from '../md5';
import { makeWorld } from './world';

describe('md5', () => {
  it('matches the standard test vectors', () => {
    expect(md5('')).toBe('d41d8cd98f00b204e9800998ecf8427e');
    expect(md5('abc')).toBe('900150983cd24fb0d6963f7d28e17f72');
    expect(md5('The quick brown fox jumps over the lazy dog')).toBe('9e107d9d372bb6826bd81d3542a419d6');
    expect(md5('a'.repeat(100))).toBe('36a92cc94a9e0fa21f625f8bfb007adf');
    expect(md5('ayam-ñ-🍗')).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe('POST /api/order', () => {
  it('creates a pending order and a ToyyibPay bill for exactly the price, with our callback and return URLs', async () => {
    const w = await makeWorld();
    const res = await w.call('POST', '/api/order', { name: 'Aminah', email: 'aminah@example.com', phone: '0123456789' });
    expect(res.status).toBe(200);
    const body = await w.json(res);
    expect(body.payUrl).toBe('https://dev.toyyibpay.com/BILL123');
    expect(body.orderId).toMatch(/^[0-9a-f]{32}$/);
    expect(w.bills).toHaveLength(1);
    expect(w.bills[0]).toMatchObject({ amountSen: 5900, orderId: body.orderId, email: 'aminah@example.com', callbackUrl: 'https://api.example.com/api/toyyibpay/callback', returnUrl: 'https://api.example.com/terima' });
    expect((await w.store.getOrder(body.orderId))?.status).toBe('pending');
  });
  it('the price comes from the server; a price in the request is ignored', async () => {
    const w = await makeWorld();
    await w.call('POST', '/api/order', { name: 'A', email: 'a@b.co', phone: '0123456789', amountSen: 1, price: 1 });
    expect(w.bills[0]!.amountSen).toBe(5900);
  });
  it('refuses a missing name, a bad email or a bad phone, and creates nothing', async () => {
    const w = await makeWorld();
    for (const bad of [{ name: '', email: 'a@b.co', phone: '0123456789' }, { name: 'A', email: 'nope', phone: '0123456789' }, { name: 'A', email: 'a@b.co', phone: 'abc' }, {}]) {
      const res = await w.call('POST', '/api/order', bad);
      expect(res.status).toBe(400);
    }
    expect(w.bills).toHaveLength(0);
  });
  it('if ToyyibPay cannot make the bill, the buyer sees a clear failure', async () => {
    const w = await makeWorld();
    w.state.billCode = '';
    const res = await w.call('POST', '/api/order', { name: 'A', email: 'a@b.co', phone: '0123456789' });
    expect([502, 500]).toContain(res.status);
  });
});

describe('ToyyibPay callback', () => {
  it('a verified, confirmed payment issues one licence code and emails it once', async () => {
    const w = await makeWorld();
    const { orderId, code } = await w.buy();
    expect(code).toMatch(/^UL-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(w.sent).toEqual([{ to: 'aminah@example.com', code }]);
    expect((await w.store.getOrder(orderId))?.status).toBe('paid');
  });
  it('the same callback delivered twice (or in parallel) gives the same code and one email', async () => {
    const w = await makeWorld();
    const o = await w.order();
    w.confirmPaid(o.orderId);
    await Promise.all([w.callback(w.callbackBody(o)), w.callback(w.callbackBody(o)), w.callback(w.callbackBody(o))]);
    const status = await w.json(await w.call('GET', `/api/order/${o.orderId}`));
    expect(w.sent).toHaveLength(1);
    expect(w.sent[0]!.code).toBe(status.code);
    expect(w.store.licenseCount()).toBe(1);
  });
  it('a wrong hash is refused and issues nothing', async () => {
    const w = await makeWorld();
    const o = await w.order();
    w.confirmPaid(o.orderId);
    const res = await w.callback(w.callbackBody(o, { hash: 'deadbeef' }));
    expect(res.status).toBe(400);
    expect(w.store.licenseCount()).toBe(0);
  });
  it('a hash made with the wrong secret is refused', async () => {
    const w = await makeWorld({ toyyibSecret: 'another' });
    const o = await w.order();
    w.confirmPaid(o.orderId);
    expect((await w.callback(w.callbackBody(o))).status).toBe(400);
  });
  it('failed or pending payments issue nothing', async () => {
    const w = await makeWorld();
    for (const status of ['2', '3', '4']) {
      const o = await w.order();
      w.confirmPaid(o.orderId);
      await w.callback(w.callbackBody(o, { status }));
      expect((await w.json(await w.call('GET', `/api/order/${o.orderId}`))).status).toBe('pending');
    }
    expect(w.store.licenseCount()).toBe(0);
  });
  it('a genuine-looking callback that ToyyibPay does not confirm issues nothing', async () => {
    const w = await makeWorld();
    const o = await w.order();
    w.state.transactions = [];
    await w.callback(w.callbackBody(o));
    expect(w.store.licenseCount()).toBe(0);
  });
  it('a payment for the wrong amount, wrong order or unpaid status issues nothing', async () => {
    const w = await makeWorld();
    const o = await w.order();
    w.confirmPaid(o.orderId, { amountSen: 100 });
    await w.callback(w.callbackBody(o));
    w.confirmPaid('someone-else');
    await w.callback(w.callbackBody(o));
    w.confirmPaid(o.orderId, { status: '3' });
    await w.callback(w.callbackBody(o));
    expect(w.store.licenseCount()).toBe(0);
  });
  it('a callback for an order we never created is acknowledged and ignored', async () => {
    const w = await makeWorld();
    w.confirmPaid('ghost');
    const res = await w.callback(w.callbackBody({ orderId: 'ghost' }));
    expect(res.status).toBe(200);
    expect(w.store.licenseCount()).toBe(0);
  });
  it('an email failure does not lose the licence; the code is still on the order and can be resent', async () => {
    const w = await makeWorld();
    w.setMailFails(true);
    const { orderId, code } = await w.buy();
    expect(code).toMatch(/^UL-/);
    expect(w.sent).toHaveLength(0);
    w.setMailFails(false);
    const res = await w.admin('/api/admin/resend', { orderId });
    expect(res.status).toBe(200);
    expect(w.sent).toEqual([{ to: 'aminah@example.com', code }]);
  });
});

describe('GET /api/order/:id', () => {
  it('is pending before payment and shows the code after', async () => {
    const w = await makeWorld();
    const o = await w.order();
    expect(await w.json(await w.call('GET', `/api/order/${o.orderId}`))).toEqual({ status: 'pending' });
    w.confirmPaid(o.orderId);
    await w.callback(w.callbackBody(o));
    const after = await w.json(await w.call('GET', `/api/order/${o.orderId}`));
    expect(after.status).toBe('paid');
    expect(after.code).toMatch(/^UL-/);
  });
  it('an unknown order id says nothing about others', async () => {
    const w = await makeWorld();
    expect((await w.call('GET', '/api/order/ffffffffffffffffffffffffffffffff')).status).toBe(404);
  });
});

describe('POST /api/activate', () => {
  const activate = (w: Awaited<ReturnType<typeof makeWorld>>, code: string, deviceId: string, deviceLabel = 'Telefon', ip = '1.1.1.1') =>
    w.call('POST', '/api/activate', { code, deviceId, deviceLabel }, { 'cf-connecting-ip': ip });

  it('returns a token the app can verify offline for that device only', async () => {
    const w = await makeWorld();
    const { code } = await w.buy();
    const res = await activate(w, code, 'dev-1');
    expect(res.status).toBe(200);
    const body = await w.json(res);
    expect(body.devices).toEqual({ used: 1, max: 2 });
    expect(body.codeHint).toBe(code.slice(-4));
    expect(await verifyLicense(body.token, w.keys.publicJwk, 'dev-1')).toMatchObject({ ok: true, payload: { plan: 'lifetime', deviceId: 'dev-1' } });
    expect(await verifyLicense(body.token, w.keys.publicJwk, 'dev-2')).toEqual({ ok: false, reason: 'wrong_device' });
  });
  it('accepts the code as people type it', async () => {
    const w = await makeWorld();
    const { code } = await w.buy();
    const typed = code.toLowerCase().replace(/-/g, ' ');
    expect((await activate(w, typed, 'dev-1')).status).toBe(200);
  });
  it('allows two devices, refuses a third and names the devices already using it', async () => {
    const w = await makeWorld();
    const { code } = await w.buy();
    expect((await activate(w, code, 'dev-1', 'iPhone Aminah')).status).toBe(200);
    expect((await activate(w, code, 'dev-2', 'iPad')).status).toBe(200);
    const third = await activate(w, code, 'dev-3', 'Telefon lain');
    expect(third.status).toBe(409);
    const body = await w.json(third);
    expect(body.error).toBe('device_limit');
    expect(body.devices.map((d: { label: string }) => d.label).sort()).toEqual(['iPad', 'iPhone Aminah']);
    expect(JSON.stringify(body)).not.toContain('dev-1');
  });
  it('activating the same device again does not use another slot', async () => {
    const w = await makeWorld();
    const { code } = await w.buy();
    await activate(w, code, 'dev-1');
    await activate(w, code, 'dev-1');
    await activate(w, code, 'dev-1');
    expect((await activate(w, code, 'dev-2')).status).toBe(200);
  });
  it('a code that does not exist, or is malformed, is invalid', async () => {
    const w = await makeWorld();
    await w.buy();
    expect((await w.json(await activate(w, 'UL-AAAA-BBBB-CCCC', 'dev-1'))).error).toBe('invalid_code');
    expect((await w.json(await activate(w, 'rubbish', 'dev-1'))).error).toBe('invalid_code');
  });
  it('a revoked code cannot be activated on a new device', async () => {
    const w = await makeWorld();
    const { code } = await w.buy();
    await w.admin('/api/admin/revoke', { code });
    const res = await activate(w, code, 'dev-1');
    expect(res.status).toBe(403);
    expect((await w.json(res)).error).toBe('revoked');
  });
  it('too many wrong guesses from one address are stopped, then allowed again after the window', async () => {
    const w = await makeWorld();
    const { code } = await w.buy();
    for (let i = 0; i < 10; i++) expect((await activate(w, 'UL-AAAA-BBBB-CCCC', 'd', 'p', '9.9.9.9')).status).toBe(404);
    expect((await activate(w, code, 'dev-1', 'p', '9.9.9.9')).status).toBe(429);
    expect((await activate(w, code, 'dev-1', 'p', '8.8.8.8')).status).toBe(200); // another address is unaffected
    w.advance(61);
    expect((await activate(w, code, 'dev-1', 'p', '9.9.9.9')).status).toBe(200);
  });
  it('needs a device id', async () => {
    const w = await makeWorld();
    const { code } = await w.buy();
    expect((await w.call('POST', '/api/activate', { code })).status).toBe(400);
  });
});

describe('POST /api/release', () => {
  it('frees a slot so another device can activate', async () => {
    const w = await makeWorld();
    const { code } = await w.buy();
    await w.call('POST', '/api/activate', { code, deviceId: 'dev-1', deviceLabel: 'a' });
    await w.call('POST', '/api/activate', { code, deviceId: 'dev-2', deviceLabel: 'b' });
    expect((await w.call('POST', '/api/release', { code, deviceId: 'dev-1' })).status).toBe(200);
    expect((await w.call('POST', '/api/activate', { code, deviceId: 'dev-3', deviceLabel: 'c' })).status).toBe(200);
  });
  it('cannot release a device that is not on the code, or with a wrong code', async () => {
    const w = await makeWorld();
    const { code } = await w.buy();
    await w.call('POST', '/api/activate', { code, deviceId: 'dev-1', deviceLabel: 'a' });
    expect((await w.call('POST', '/api/release', { code, deviceId: 'nobody' })).status).toBe(404);
    expect((await w.call('POST', '/api/release', { code: 'UL-AAAA-BBBB-CCCC', deviceId: 'dev-1' })).status).toBe(404);
  });
});

describe('admin', () => {
  it('needs the admin token', async () => {
    const w = await makeWorld();
    const { code } = await w.buy();
    expect((await w.call('POST', '/api/admin/revoke', { code })).status).toBe(401);
    expect((await w.call('POST', '/api/admin/revoke', { code }, { authorization: 'Bearer wrong' })).status).toBe(401);
    expect((await w.admin('/api/admin/revoke', { code })).status).toBe(200);
  });
  it('reset-devices clears every device on a code', async () => {
    const w = await makeWorld();
    const { code } = await w.buy();
    await w.call('POST', '/api/activate', { code, deviceId: 'dev-1', deviceLabel: 'a' });
    await w.call('POST', '/api/activate', { code, deviceId: 'dev-2', deviceLabel: 'b' });
    expect((await w.admin('/api/admin/reset-devices', { code })).status).toBe(200);
    expect((await w.call('POST', '/api/activate', { code, deviceId: 'dev-3', deviceLabel: 'c' })).status).toBe(200);
    expect((await w.call('POST', '/api/activate', { code, deviceId: 'dev-4', deviceLabel: 'd' })).status).toBe(200);
  });
  it('lookup finds a buyer by email and shows their code and devices', async () => {
    const w = await makeWorld();
    const { code } = await w.buy();
    await w.call('POST', '/api/activate', { code, deviceId: 'dev-1', deviceLabel: 'iPhone' });
    const found = await w.json(await w.admin('/api/admin/lookup', { email: 'aminah@example.com' }));
    expect(found.results[0]).toMatchObject({ code, status: 'active', devices: [{ label: 'iPhone' }] });
  });
  it('is disabled when no admin token is configured', async () => {
    const w = await makeWorld({ adminToken: '' });
    expect((await w.call('POST', '/api/admin/lookup', { email: 'x' }, { authorization: 'Bearer ' })).status).toBe(401);
  });
});

describe('browser access', () => {
  it('answers the app origin (and only it) in CORS, including preflight', async () => {
    const w = await makeWorld();
    const pre = await w.call('OPTIONS', '/api/activate', undefined, { origin: 'https://app.example.com' });
    expect(pre.status).toBe(204);
    expect(pre.headers.get('access-control-allow-origin')).toBe('https://app.example.com');
    const other = await w.call('OPTIONS', '/api/activate', undefined, { origin: 'https://evil.example.com' });
    expect(other.headers.get('access-control-allow-origin')).toBeNull();
  });
  it('unknown routes are 404', async () => {
    const w = await makeWorld();
    expect((await w.call('GET', '/api/nothing')).status).toBe(404);
  });
});

describe('early bird (D-80)', () => {
  const early = { priceSen: 4900, earlyBirdPriceSen: 3900, earlyBirdSlots: 2 };
  const buy = async (w: Awaited<ReturnType<typeof makeWorld>>, n: number) => {
    const res = await w.call('POST', '/api/order', { name: 'A', email: `a${n}@b.co`, phone: '0123456789' });
    return (await w.json(res)).orderId as string;
  };
  it('charges RM39 for the first slots of paid orders, then RM49', async () => {
    const w = await makeWorld(early);
    const o1 = await buy(w, 1);
    expect(w.bills[0]!.amountSen).toBe(3900);
    // a pending order does not use up a place
    const o2 = await buy(w, 2);
    expect(w.bills[1]!.amountSen).toBe(3900);
    await w.store.markOrderPaid(o1, 'UL-AAAA-BBBB-CCCC', '2026-10-06T00:00:00.000Z');
    const o3 = await buy(w, 3);
    expect(w.bills[2]!.amountSen).toBe(3900);
    await w.store.markOrderPaid(o2, 'UL-AAAA-BBBB-DDDD', '2026-10-06T00:00:00.000Z');
    await buy(w, 4);
    expect(w.bills[3]!.amountSen).toBe(4900);
    // the price of an order already created stays what it was
    expect((await w.store.getOrder(o3))?.amountSen).toBe(3900);
  });
  it('without early-bird config the normal price applies', async () => {
    const w = await makeWorld({ priceSen: 4900 });
    await buy(w, 1);
    expect(w.bills[0]!.amountSen).toBe(4900);
  });
  it('the buy page shows the early-bird price and places left, then the normal price', async () => {
    const w = await makeWorld(early);
    let html = await (await w.call('GET', '/beli')).text();
    expect(html).toContain('RM39');
    expect(html).toContain('2 pembeli pertama');
    expect(html).toContain('RM49');
    const o1 = await buy(w, 1);
    const o2 = await buy(w, 2);
    await w.store.markOrderPaid(o1, 'UL-AAAA-BBBB-CCCC', '2026-10-06T00:00:00.000Z');
    await w.store.markOrderPaid(o2, 'UL-AAAA-BBBB-DDDD', '2026-10-06T00:00:00.000Z');
    html = await (await w.call('GET', '/beli')).text();
    expect(html).not.toContain('early bird');
    expect(html).toContain('RM49');
  });
});

describe('pages', () => {
  it('the buy page shows the price from config and links nothing secret', async () => {
    const w = await makeWorld();
    const html = await (await w.call('GET', '/beli')).text();
    expect(html).toContain('RM59');
    expect(html).not.toContain('sekret');
    expect(html).not.toContain('admin-token');
  });
  it('the return page is served', async () => {
    const w = await makeWorld();
    const res = await w.call('GET', '/terima?order_id=abc&status_id=1');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
  });
});
