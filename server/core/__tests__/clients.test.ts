import { describe, expect, it } from 'vitest';
import { createBrevoMailer } from '../brevo';
import { createToyyibClient } from '../toyyibpay';

describe('ToyyibPay client (request shapes follow the public API reference; confirm in sandbox)', () => {
  it('createBill posts a form with amount in sen, our reference and URLs, and reads the BillCode', async () => {
    let seen: { url: string; body: URLSearchParams } | null = null;
    const client = createToyyibClient({
      baseUrl: 'https://dev.toyyibpay.com',
      secretKey: 'sekret',
      categoryCode: 'cat1',
      productName: 'UntungLab Lifetime',
      fetchImpl: (async (url: string, init: RequestInit) => {
        seen = { url, body: new URLSearchParams(String(init.body)) };
        return new Response(JSON.stringify([{ BillCode: 'abc123' }]));
      }) as unknown as typeof fetch,
    });
    const r = await client.createBill({ amountSen: 5900, orderId: 'ord1', name: 'Aminah', email: 'a@b.co', phone: '0123456789', callbackUrl: 'https://api/cb', returnUrl: 'https://api/terima' });
    expect(r).toEqual({ billCode: 'abc123', payUrl: 'https://dev.toyyibpay.com/abc123' });
    expect(seen!.url).toBe('https://dev.toyyibpay.com/index.php/api/createBill');
    const b = seen!.body;
    expect(b.get('userSecretKey')).toBe('sekret');
    expect(b.get('categoryCode')).toBe('cat1');
    expect(b.get('billAmount')).toBe('5900');
    expect(b.get('billExternalReferenceNo')).toBe('ord1');
    expect(b.get('billCallbackUrl')).toBe('https://api/cb');
    expect(b.get('billReturnUrl')).toBe('https://api/terima');
    expect(b.get('billTo')).toBe('Aminah');
    expect(b.get('billEmail')).toBe('a@b.co');
    expect(b.get('billPriceSetting')).toBe('1');
    expect(b.get('billPayorInfo')).toBe('1');
  });
  it('a response without a BillCode is an error, not a guess', async () => {
    const client = createToyyibClient({ baseUrl: 'https://x', secretKey: 's', categoryCode: 'c', productName: 'p', fetchImpl: (async () => new Response(JSON.stringify({ status: 'error' }))) as unknown as typeof fetch });
    await expect(client.createBill({ amountSen: 1, orderId: 'o', name: 'n', email: 'e@e.co', phone: '0123456789', callbackUrl: 'c', returnUrl: 'r' })).rejects.toThrow();
  });
  it('getTransactions normalises status, order id and the amount to sen', async () => {
    const client = createToyyibClient({
      baseUrl: 'https://x', secretKey: 's', categoryCode: 'c', productName: 'p',
      fetchImpl: (async () => new Response(JSON.stringify([
        { billpaymentStatus: '1', billExternalReferenceNo: 'ord1', billpaymentAmount: '59.00' },
        { billpaymentStatus: '3', billExternalReferenceNo: 'ord1', billpaymentAmount: '59' },
        { billpaymentStatus: '1', billExternalReferenceNo: 'ord2', billpaymentAmount: '5900' },
      ]))) as unknown as typeof fetch,
    });
    expect(await client.getTransactions('bill')).toEqual([
      { status: '1', orderId: 'ord1', amountSen: 5900 },
      { status: '3', orderId: 'ord1', amountSen: 5900 },
      { status: '1', orderId: 'ord2', amountSen: 5900 },
    ]);
  });
  it('an unreadable amount becomes null, which never matches the price', async () => {
    const client = createToyyibClient({ baseUrl: 'https://x', secretKey: 's', categoryCode: 'c', productName: 'p', fetchImpl: (async () => new Response(JSON.stringify([{ billpaymentStatus: '1', billExternalReferenceNo: 'o', billpaymentAmount: 'abc' }]))) as unknown as typeof fetch });
    expect((await client.getTransactions('b'))[0]!.amountSen).toBeNull();
  });
});

describe('Brevo mailer', () => {
  it('sends the code to the buyer with the api key in a header, never in the body', async () => {
    let seen: { url: string; headers: Record<string, string>; body: any } | null = null;
    const mailer = createBrevoMailer({
      apiKey: 'brevo-key', senderEmail: 'hello@example.com', senderName: 'UntungLab', appUrl: 'https://app.example.com',
      fetchImpl: (async (url: string, init: RequestInit) => {
        seen = { url, headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) };
        return new Response('{}', { status: 201 });
      }) as unknown as typeof fetch,
    });
    await mailer.sendCode('aminah@example.com', 'Aminah', 'UL-K3M7-ABCD-2345');
    expect(seen!.url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(seen!.headers['api-key']).toBe('brevo-key');
    expect(seen!.body.to).toEqual([{ email: 'aminah@example.com', name: 'Aminah' }]);
    expect(seen!.body.sender).toEqual({ email: 'hello@example.com', name: 'UntungLab' });
    expect(seen!.body.textContent).toContain('UL-K3M7-ABCD-2345');
    expect(JSON.stringify(seen!.body)).not.toContain('brevo-key');
  });
  it('a Brevo error is thrown so the caller can record that the email was not sent', async () => {
    const mailer = createBrevoMailer({ apiKey: 'k', senderEmail: 'a@b.co', senderName: 'n', appUrl: 'u', fetchImpl: (async () => new Response('bad', { status: 401 })) as unknown as typeof fetch });
    await expect(mailer.sendCode('a@b.co', 'n', 'UL-K3M7-ABCD-2345')).rejects.toThrow();
  });
});
