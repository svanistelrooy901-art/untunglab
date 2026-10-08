import { generateCode, normaliseCode } from '../../src/license/code';
import { signLicense, type LicensePayload } from '../../src/license/token';
import { md5 } from './md5';
import { renderBuyPage, renderReturnPage } from './pages';
import type { Mailer, Order, Store, ToyyibClient } from './ports';

export interface Config {
  /** Normal price in sen. */
  priceSen: number;
  /** Early-bird price in sen for the first `earlyBirdSlots` paid orders (D-80). Optional; 0 slots = no early bird. */
  earlyBirdPriceSen?: number;
  earlyBirdSlots?: number;
  toyyibSecret: string;
  adminToken: string;
  privateKeyJwk: JsonWebKey;
  /** The app's origin, allowed to call the API from a browser. */
  appOrigin: string;
  /** Full address of the app (with path), used for the images and links on the sales page. Optional. */
  appUrl?: string;
  /** Public base URL of this server, used for ToyyibPay's callback and return URLs. */
  publicBaseUrl: string;
  maxDevices: number;
  failureLimit: number;
  failureWindowMinutes: number;
}

export interface Deps {
  store: Store;
  toyyib: ToyyibClient;
  mailer: Mailer;
  now: () => Date;
  randomBytes: (n: number) => Uint8Array;
  config: Config;
}

const hex = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[0-9][0-9\s-]{7,14}$/;

export function createHandler(deps: Deps): (req: Request) => Promise<Response> {
  const { store, toyyib, mailer, config } = deps;

  return async function handle(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const origin = req.headers.get('origin');
    const cors: Record<string, string> = {};
    if (origin && origin === config.appOrigin) {
      cors['access-control-allow-origin'] = origin;
      cors['access-control-allow-methods'] = 'GET, POST, OPTIONS';
      cors['access-control-allow-headers'] = 'content-type, authorization';
      cors.vary = 'origin';
    }
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...cors } });
    const html = (body: string) => new Response(body, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    try {
      const path = url.pathname.replace(/\/+$/, '') || '/';
      if (req.method === 'GET' && path === '/') return Response.redirect(`${config.publicBaseUrl}/beli`, 302);
      if (req.method === 'GET' && path === '/beli') return html(renderBuyPage(...(await currentPrice()), config.appUrl));
      if (req.method === 'GET' && path === '/terima') return html(renderReturnPage());

      if (req.method === 'POST' && path === '/api/order') return await createOrder(req, json);
      const orderMatch = /^\/api\/order\/([0-9a-f]{32})$/.exec(path);
      if (req.method === 'GET' && orderMatch) return await orderStatus(orderMatch[1]!, json);
      if (req.method === 'POST' && path === '/api/toyyibpay/callback') return await callback(req);
      if (req.method === 'POST' && path === '/api/activate') return await activate(req, json);
      if (req.method === 'POST' && path === '/api/release') return await release(req, json);
      if (path.startsWith('/api/admin/')) return await admin(req, path, json);
      return json(404, { error: 'not_found' });
    } catch (e) {
      console.error('unhandled', e);
      return json(500, { error: 'server' });
    }
  };

  // ---------- helpers ----------

  async function readJson(req: Request): Promise<Record<string, unknown>> {
    try {
      const v = (await req.json()) as unknown;
      return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }

  function str(v: unknown, max: number): string {
    return typeof v === 'string' ? v.trim().slice(0, max) : '';
  }
  function clientKey(req: Request): string {
    return req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for') ?? 'unknown';
  }

  type Json = (status: number, body: unknown) => Response;

  // ---------- buying ----------

  /** Price now and early-bird places left (null when there is no early bird or it is used up). The price is always decided here, never by the client. */
  async function currentPrice(): Promise<[number, number | null, number]> {
    const slots = config.earlyBirdSlots ?? 0;
    if (slots > 0 && config.earlyBirdPriceSen !== undefined) {
      const paid = await store.countPaidOrders();
      if (paid < slots) return [config.earlyBirdPriceSen, slots - paid, config.priceSen];
    }
    return [config.priceSen, null, config.priceSen];
  }

  async function createOrder(req: Request, json: Json): Promise<Response> {
    const body = await readJson(req);
    const name = str(body.name, 100);
    const email = str(body.email, 120);
    const phone = str(body.phone, 20);
    if (!name || !EMAIL.test(email) || !PHONE.test(phone)) return json(400, { error: 'invalid_input' });

    const [price] = await currentPrice();
    const orderId = hex(deps.randomBytes(16));
    let bill: { billCode: string; payUrl: string };
    try {
      bill = await toyyib.createBill({
        amountSen: price, // the price is never taken from the request
        orderId,
        name,
        email,
        phone,
        callbackUrl: `${config.publicBaseUrl}/api/toyyibpay/callback`,
        returnUrl: `${config.publicBaseUrl}/terima`,
      });
    } catch (e) {
      console.error('createBill failed', e);
      return json(502, { error: 'payment_unavailable' });
    }
    if (!bill.billCode) return json(502, { error: 'payment_unavailable' });

    const order: Order = {
      id: orderId, name, email, phone, amountSen: price, status: 'pending', billCode: bill.billCode,
      licenseCode: null, emailSentAt: null, createdAt: deps.now().toISOString(), paidAt: null,
    };
    await store.createOrder(order);
    return json(200, { orderId, payUrl: bill.payUrl });
  }

  async function orderStatus(id: string, json: Json): Promise<Response> {
    const order = await store.getOrder(id);
    if (!order) return json(404, { error: 'not_found' });
    return order.status === 'paid' && order.licenseCode ? json(200, { status: 'paid', code: order.licenseCode }) : json(200, { status: 'pending' });
  }

  /**
   * ToyyibPay's callback is never trusted on its own: the hash must match AND ToyyibPay must confirm the payment
   * (right order, paid status, right amount) when asked directly. Only then is a licence issued.
   */
  async function callback(req: Request): Promise<Response> {
    const f = new URLSearchParams(await req.text());
    const status = f.get('status') ?? '';
    const orderId = f.get('order_id') ?? '';
    const refno = f.get('refno') ?? '';
    const hash = f.get('hash') ?? '';
    if (!status || !orderId || !refno || !hash) return new Response('bad request', { status: 400 });
    if (!safeEqual(hash.toLowerCase(), md5(config.toyyibSecret + status + orderId + refno + 'ok'))) return new Response('bad hash', { status: 400 });
    if (status !== '1') return new Response('OK');

    const order = await store.getOrder(orderId);
    if (!order || order.status === 'paid') return new Response('OK');

    let transactions;
    try {
      transactions = await toyyib.getTransactions(order.billCode);
    } catch (e) {
      console.error('getTransactions failed', e);
      return new Response('try again', { status: 500 });
    }
    const confirmed = transactions.some((t) => t.orderId === order.id && t.status === '1' && t.amountSen === order.amountSen);
    if (!confirmed) return new Response('OK');

    let issued: { code: string; first: boolean } | null = null;
    for (let attempt = 0; attempt < 5 && !issued; attempt++) {
      try {
        issued = await store.markOrderPaid(order.id, generateCode(deps.randomBytes), deps.now().toISOString());
      } catch (e) {
        if (attempt === 4) throw e;
      }
    }
    if (issued?.first) {
      try {
        await mailer.sendCode(order.email, order.name, issued.code);
        await store.updateOrder(order.id, { emailSentAt: deps.now().toISOString() });
      } catch (e) {
        console.error('email failed; the code is on the order and can be resent', e);
      }
    }
    return new Response('OK');
  }

  // ---------- devices ----------

  async function rateLimited(key: string): Promise<boolean> {
    const since = new Date(deps.now().getTime() - config.failureWindowMinutes * 60_000).toISOString();
    return (await store.countFailures(key, since)) >= config.failureLimit;
  }

  async function activate(req: Request, json: Json): Promise<Response> {
    const key = clientKey(req);
    if (await rateLimited(key)) return json(429, { error: 'rate_limited' });
    const body = await readJson(req);
    const deviceId = str(body.deviceId, 100);
    if (!deviceId) return json(400, { error: 'invalid_input' });
    const deviceLabel = str(body.deviceLabel, 60) || 'Peranti';

    const code = normaliseCode(typeof body.code === 'string' ? body.code : '');
    const license = code ? await store.getLicense(code) : null;
    if (!code || !license) {
      await store.recordFailure(key, deps.now().toISOString());
      return json(404, { error: 'invalid_code' });
    }
    if (license.status === 'revoked') return json(403, { error: 'revoked' });

    const devices = await store.listDevices(code);
    const known = devices.some((d) => d.deviceId === deviceId);
    if (!known) {
      if (devices.length >= config.maxDevices) {
        return json(409, { error: 'device_limit', devices: devices.map((d) => ({ label: d.label, activatedAt: d.activatedAt })) });
      }
      await store.addDevice(code, { deviceId, label: deviceLabel, activatedAt: deps.now().toISOString() });
    }
    const payload: LicensePayload = { v: 1, plan: 'lifetime', deviceId, codeHint: code.slice(-4), issuedAt: deps.now().toISOString() };
    return json(200, {
      token: await signLicense(payload, config.privateKeyJwk),
      codeHint: payload.codeHint,
      devices: { used: known ? devices.length : devices.length + 1, max: config.maxDevices },
    });
  }

  async function release(req: Request, json: Json): Promise<Response> {
    const key = clientKey(req);
    if (await rateLimited(key)) return json(429, { error: 'rate_limited' });
    const body = await readJson(req);
    const code = normaliseCode(typeof body.code === 'string' ? body.code : '');
    const deviceId = str(body.deviceId, 100);
    const license = code ? await store.getLicense(code) : null;
    if (!code || !license) {
      await store.recordFailure(key, deps.now().toISOString());
      return json(404, { error: 'invalid_code' });
    }
    if (!deviceId || !(await store.removeDevice(code, deviceId))) return json(404, { error: 'unknown_device' });
    return json(200, { ok: true });
  }

  // ---------- admin ----------

  async function admin(req: Request, path: string, json: Json): Promise<Response> {
    const auth = req.headers.get('authorization') ?? '';
    if (!config.adminToken || !safeEqual(auth, `Bearer ${config.adminToken}`)) return json(401, { error: 'unauthorized' });
    if (req.method !== 'POST') return json(404, { error: 'not_found' });
    const body = await readJson(req);
    const code = normaliseCode(typeof body.code === 'string' ? body.code : '');

    switch (path) {
      case '/api/admin/revoke': {
        if (!code || !(await store.setLicenseStatus(code, 'revoked'))) return json(404, { error: 'invalid_code' });
        return json(200, { ok: true });
      }
      case '/api/admin/reset-devices': {
        if (!code || !(await store.getLicense(code))) return json(404, { error: 'invalid_code' });
        await store.clearDevices(code);
        return json(200, { ok: true });
      }
      case '/api/admin/lookup': {
        const email = str(body.email, 120);
        const orders = email ? await store.findOrdersByEmail(email) : code ? [await orderOfCode(code)].filter((o): o is Order => o !== null) : [];
        const results = [];
        for (const o of orders) {
          if (!o.licenseCode) {
            results.push({ orderId: o.id, email: o.email, status: 'unpaid' });
            continue;
          }
          const license = await store.getLicense(o.licenseCode);
          const devices = await store.listDevices(o.licenseCode);
          results.push({ orderId: o.id, email: o.email, name: o.name, code: o.licenseCode, status: license?.status ?? 'unknown', devices: devices.map((d) => ({ label: d.label, activatedAt: d.activatedAt })) });
        }
        return json(200, { results });
      }
      case '/api/admin/resend': {
        const order = await store.getOrder(str(body.orderId, 40));
        if (!order?.licenseCode) return json(404, { error: 'not_found' });
        await mailer.sendCode(order.email, order.name, order.licenseCode);
        await store.updateOrder(order.id, { emailSentAt: deps.now().toISOString() });
        return json(200, { ok: true });
      }
      default:
        return json(404, { error: 'not_found' });
    }
  }

  async function orderOfCode(code: string): Promise<Order | null> {
    const license = await store.getLicense(code);
    return license ? store.getOrder(license.orderId) : null;
  }
}
