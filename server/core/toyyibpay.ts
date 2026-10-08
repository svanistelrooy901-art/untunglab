import type { ToyyibClient, Transaction } from './ports';

/**
 * Request shapes follow ToyyibPay's public API reference (createBill, getBillTransactions).
 * They have NOT been run against ToyyibPay from this environment: confirm them in the sandbox (dev.toyyibpay.com).
 */
export function createToyyibClient(opts: {
  baseUrl: string;
  secretKey: string;
  categoryCode: string;
  productName: string;
  fetchImpl?: typeof fetch;
}): ToyyibClient {
  const f = opts.fetchImpl ?? fetch;
  const base = opts.baseUrl.replace(/\/+$/, '');

  return {
    async createBill(input) {
      const form = new URLSearchParams({
        userSecretKey: opts.secretKey,
        categoryCode: opts.categoryCode,
        billName: opts.productName.slice(0, 30),
        billDescription: `${opts.productName} (akses seumur hidup)`.slice(0, 100),
        billPriceSetting: '1',
        billPayorInfo: '1',
        billAmount: String(input.amountSen),
        billReturnUrl: input.returnUrl,
        billCallbackUrl: input.callbackUrl,
        billExternalReferenceNo: input.orderId,
        billTo: input.name,
        billEmail: input.email,
        billPhone: input.phone.replace(/[^0-9]/g, ''),
        billPaymentChannel: '0',
        billContentEmail: 'Terima kasih. Kod lesen UntungLab akan dihantar ke emel ini selepas bayaran disahkan.',
        billChargeToCustomer: '1',
      });
      const res = await f(`${base}/index.php/api/createBill`, { method: 'POST', body: form });
      const text = await res.text();
      let json: unknown = null;
      try {
        json = JSON.parse(text);
      } catch {
        /* not JSON: reported below */
      }
      const billCode = Array.isArray(json) ? (json[0] as { BillCode?: unknown } | undefined)?.BillCode : undefined;
      if (typeof billCode !== 'string' || billCode === '') {
        // The reply never contains our secret; keep a short copy so the cause (wrong key, wrong category, bad field) is visible.
        throw new Error(`ToyyibPay createBill failed: HTTP ${res.status}, reply: ${text.replace(/\s+/g, ' ').slice(0, 300)}`);
      }
      return { billCode, payUrl: `${base}/${billCode}` };
    },

    async getTransactions(billCode) {
      const form = new URLSearchParams({ billCode, billpaymentStatus: '1' });
      const res = await f(`${base}/index.php/api/getBillTransactions`, { method: 'POST', body: form });
      const json = (await res.json()) as unknown;
      if (!Array.isArray(json)) return [];
      return json.map((row): Transaction => {
        const r = row as Record<string, unknown>;
        return {
          orderId: String(r.billExternalReferenceNo ?? ''),
          status: String(r.billpaymentStatus ?? ''),
          amountSen: toSen(r.billpaymentAmount),
        };
      });
    },
  };
}

/** "59.00" or "59" is ringgit, "5900" is sen. Anything else is unreadable. */
export function toSen(value: unknown): number | null {
  const text = String(value ?? '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const n = Number(text);
  if (text.includes('.')) return Math.round(n * 100);
  return n >= 1000 ? n : n * 100;
}
