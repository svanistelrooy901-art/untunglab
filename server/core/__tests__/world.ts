import { generateKeyPair } from '../../../src/license/token';
import { createHandler, type Config } from '../api';
import { md5 } from '../md5';
import { MemoryStore } from '../memory';
import type { Mailer, ToyyibClient, Transaction } from '../ports';

export async function makeWorld(over: Partial<Config> = {}) {
  const keys = await generateKeyPair();
  const store = new MemoryStore();
  let clock = new Date('2026-09-30T08:00:00.000Z');
  const bills: { amountSen: number; orderId: string; name: string; email: string; phone: string; callbackUrl: string; returnUrl: string }[] = [];
  const state: { transactions: Transaction[]; billCode: string } = { transactions: [], billCode: 'BILL123' };
  const toyyib: ToyyibClient = {
    async createBill(input) {
      bills.push(input);
      return { billCode: state.billCode, payUrl: `https://dev.toyyibpay.com/${state.billCode}` };
    },
    async getTransactions() {
      return state.transactions;
    },
  };
  const sent: { to: string; code: string }[] = [];
  let mailFails = false;
  const mailer: Mailer = {
    async sendCode(to, _name, code) {
      if (mailFails) throw new Error('brevo down');
      sent.push({ to, code });
    },
  };
  let counter = 0;
  const config: Config = {
    priceSen: 5900,
    toyyibSecret: 'sekret',
    adminToken: 'admin-token',
    privateKeyJwk: keys.privateJwk,
    appOrigin: 'https://app.example.com',
    publicBaseUrl: 'https://api.example.com',
    maxDevices: 2,
    failureLimit: 10,
    failureWindowMinutes: 60,
    ...over,
  };
  const handler = createHandler({
    store,
    toyyib,
    mailer,
    now: () => clock,
    randomBytes: (n) => {
      counter++;
      const b = new Uint8Array(n);
      for (let i = 0; i < n; i++) b[i] = (i * 7 + counter * 13) % 256;
      return b;
    },
    config,
  });
  const call = (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) =>
    handler(new Request(`https://api.example.com${path}`, { method, headers: { 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) }));
  const json = async (res: Response) => (await res.json()) as Record<string, any>;

  const buyer = { name: 'Aminah', email: 'aminah@example.com', phone: '0123456789' };
  const order = async () => (await json(await call('POST', '/api/order', buyer))) as { orderId: string; payUrl: string };
  const callbackBody = (o: { orderId: string }, over: Record<string, string> = {}) => {
    const f = { refno: 'TP1', status: '1', reason: 'ok', billcode: state.billCode, order_id: o.orderId, amount: '59.00', transaction_time: '2026-09-30 16:00:00', ...over };
    return { ...f, hash: over.hash ?? md5('sekret' + f.status + f.order_id + f.refno + 'ok') };
  };
  const callback = (fields: Record<string, string>) =>
    handler(new Request('https://api.example.com/api/toyyibpay/callback', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(fields).toString() }));
  const confirmPaid = (orderId: string, over: Partial<Transaction> = {}) => {
    state.transactions = [{ orderId, status: '1', amountSen: 5900, ...over }];
  };
  /** Full happy path: order, ToyyibPay confirms, callback delivered. Returns the licence code. */
  const buy = async () => {
    const o = await order();
    confirmPaid(o.orderId);
    await callback(callbackBody(o));
    const status = await json(await call('GET', `/api/order/${o.orderId}`));
    return { orderId: o.orderId as string, code: status.code as string };
  };
  return {
    keys, store, bills, state, sent, config, call, json, order, callback, callbackBody, confirmPaid, buy,
    setMailFails: (v: boolean) => (mailFails = v),
    advance: (minutes: number) => (clock = new Date(clock.getTime() + minutes * 60_000)),
    admin: (path: string, body: unknown) => call('POST', path, body, { authorization: 'Bearer admin-token' }),
  };
}
