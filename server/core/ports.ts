/** What the server core needs from the outside world. Real versions live in server/worker; tests use fakes. */

export interface Order {
  id: string;
  name: string;
  email: string;
  phone: string;
  amountSen: number;
  status: 'pending' | 'paid';
  billCode: string;
  licenseCode: string | null;
  emailSentAt: string | null;
  createdAt: string;
  paidAt: string | null;
}

export interface LicenseRecord {
  code: string;
  orderId: string;
  status: 'active' | 'revoked';
  createdAt: string;
}

export interface DeviceRecord {
  deviceId: string;
  label: string;
  activatedAt: string;
}

export interface Stats {
  orders: number;
  /** Paid orders with a price above RM0. */
  paid: number;
  /** Free (RM0) licences issued by the admin. */
  complimentary: number;
  pending: number;
  revenueSen: number;
  activeLicenses: number;
  revokedLicenses: number;
  devices: number;
  /** Newest first. No phone numbers. */
  recent: { id: string; name: string; email: string; amountSen: number; status: Order['status']; createdAt: string; paidAt: string | null; licenseStatus: LicenseRecord['status'] | null }[];
}

export interface OrderMeta {
  source: string | null;
  note: string | null;
}

export interface Insights {
  /** Malaysian days (UTC+8), only days with activity, oldest first. RM0 orders are left out. */
  daily: { day: string; created: number; paid: number; revenueSen: number }[];
  /** Where buyers came from (`?src=` on the buy link); '' is "no source". RM0 orders are left out. */
  sources: { source: string; orders: number; paid: number }[];
  /** Paid, licence still active, but no device ever activated (oldest first). */
  unactivated: { orderId: string; name: string; email: string; code: string; paidAt: string }[];
  /** Paid but the licence email was never recorded as sent (oldest first). */
  emailPending: { orderId: string; name: string; email: string; code: string }[];
}

export interface ExportRow {
  orderId: string; name: string; email: string; phone: string; amountSen: number; status: Order['status'];
  createdAt: string; paidAt: string | null; code: string | null; licenseStatus: LicenseRecord['status'] | null;
  devices: number; source: string | null; note: string | null;
}

export interface Usage {
  /** Malaysian days with any hit, oldest first. */
  hits: { day: string; view: number; start: number }[];
  installs: {
    total: number;
    newByDay: { day: string; n: number }[];
    /** Installs seen in the 7 days up to `now`. */
    activeWeek: number;
    byLang: { key: string; n: number }[];
    byPlatform: { key: string; n: number }[];
  };
}

export interface Ping {
  /** Random id made by the app on the device. It is not tied to a person. */
  id: string;
  at: string;
  version: string;
  lang: string;
  platform: string;
}

export interface Store {
  createOrder(order: Order): Promise<void>;
  getOrder(id: string): Promise<Order | null>;
  updateOrder(id: string, patch: Partial<Pick<Order, 'emailSentAt'>>): Promise<void>;
  /**
   * Atomically marks the order paid and creates its licence. If the order already has one, returns it with
   * `first: false`. Throws if `code` is already used by another licence (the caller retries with a new code).
   */
  markOrderPaid(orderId: string, code: string, at: string): Promise<{ code: string; first: boolean }>;
  findOrdersByEmail(email: string): Promise<Order[]>;
  getLicense(code: string): Promise<LicenseRecord | null>;
  setLicenseStatus(code: string, status: LicenseRecord['status']): Promise<boolean>;
  listDevices(code: string): Promise<DeviceRecord[]>;
  addDevice(code: string, device: DeviceRecord): Promise<void>;
  removeDevice(code: string, deviceId: string): Promise<boolean>;
  clearDevices(code: string): Promise<void>;
  recordFailure(key: string, at: string): Promise<void>;
  countFailures(key: string, since: string): Promise<number>;
  /** Paid orders above RM0 (free admin-issued licences do not count); decides whether early-bird places remain. */
  countPaidOrders(): Promise<number>;
  /** Totals for the admin dashboard plus the `recent` newest orders. */
  stats(recent: number): Promise<Stats>;
  getMeta(orderId: string): Promise<OrderMeta>;
  /** Only the fields given change; an empty string clears. */
  setMeta(orderId: string, patch: { source?: string; note?: string }): Promise<void>;
  logAdmin(at: string, action: string, target: string): Promise<void>;
  /** Newest first. */
  listAdminLog(limit: number): Promise<{ at: string; action: string; target: string }[]>;
  insights(sinceDay: string): Promise<Insights>;
  /** One more visit to the sales page ('view') or press of the free-trial button ('start'), on the Malaysian day of `at`. */
  countHit(at: string, kind: 'view' | 'start'): Promise<void>;
  /** First sighting creates the install; later ones refresh last-seen, version, language and platform. */
  recordPing(ping: Ping): Promise<void>;
  usage(sinceDay: string, nowIso: string): Promise<Usage>;
  exportRows(): Promise<ExportRow[]>;
}

export interface Transaction {
  orderId: string;
  /** ToyyibPay status: '1' paid, '2' pending, '3' failed, '4' pending. */
  status: string;
  /** Null when the amount could not be read; never matches the price. */
  amountSen: number | null;
}

export interface ToyyibClient {
  createBill(input: {
    amountSen: number;
    orderId: string;
    name: string;
    email: string;
    phone: string;
    callbackUrl: string;
    returnUrl: string;
  }): Promise<{ billCode: string; payUrl: string }>;
  getTransactions(billCode: string): Promise<Transaction[]>;
}

export interface Mailer {
  sendCode(to: string, name: string, code: string): Promise<void>;
}
