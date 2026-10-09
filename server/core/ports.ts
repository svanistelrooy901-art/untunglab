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
  paid: number;
  pending: number;
  revenueSen: number;
  activeLicenses: number;
  revokedLicenses: number;
  devices: number;
  /** Newest first. No phone numbers. */
  recent: { id: string; name: string; email: string; amountSen: number; status: Order['status']; createdAt: string; paidAt: string | null; licenseStatus: LicenseRecord['status'] | null }[];
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
  /** Orders that are paid; decides whether early-bird places remain. */
  countPaidOrders(): Promise<number>;
  /** Totals for the admin dashboard plus the `recent` newest orders. */
  stats(recent: number): Promise<Stats>;
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
