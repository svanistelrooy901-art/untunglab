/**
 * Anonymous usage count (D-94). Once a week at most, the app tells the licence server that one install exists:
 * a random id made on this device, the app version, language and a coarse device type. No recipes, prices, names,
 * emails or business data. Everything here is best-effort: a blocked storage, no internet or a server error never
 * stops the app, and the person can switch it off in Tetapan.
 */
export const PING_EVERY_DAYS = 6;

const KEY_ID = 'untunglab.installId';
const KEY_LAST = 'untunglab.lastPing';
const KEY_OFF = 'untunglab.pingOff';

export type PingStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function shouldPing(o: { off: boolean; lastPing: string | null; now: Date }): boolean {
  if (o.off) return false;
  if (!o.lastPing) return true;
  const last = new Date(o.lastPing).getTime();
  if (!Number.isFinite(last)) return true;
  return o.now.getTime() - last >= PING_EVERY_DAYS * 86_400_000;
}

export function makeInstallId(random: (n: number) => Uint8Array): string {
  return [...random(16)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function platformOf(ua: string): 'android' | 'ios' | 'desktop' | 'other' {
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/windows|macintosh|linux|cros/i.test(ua)) return 'desktop';
  return 'other';
}

function read(storage: PingStorage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function write(storage: PingStorage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    /* blocked storage: the count is simply skipped */
  }
}

export const usagePingOff = (storage: PingStorage): boolean => read(storage, KEY_OFF) === '1';
export const setUsagePingOff = (storage: PingStorage, off: boolean): void => write(storage, KEY_OFF, off ? '1' : '0');

export interface PingDeps {
  apiUrl: string | null;
  storage: PingStorage;
  fetchImpl: typeof fetch;
  now: Date;
  ua: string;
  lang: 'ms' | 'en';
  version: string;
  random: (n: number) => Uint8Array;
}

/** Returns true when a count was sent and accepted. Never throws. */
export async function sendUsagePing(d: PingDeps): Promise<boolean> {
  try {
    if (!d.apiUrl) return false;
    if (!shouldPing({ off: usagePingOff(d.storage), lastPing: read(d.storage, KEY_LAST), now: d.now })) return false;
    let id = read(d.storage, KEY_ID);
    if (!id || !/^[A-Za-z0-9]{16,40}$/.test(id)) {
      id = makeInstallId(d.random);
      write(d.storage, KEY_ID, id);
    }
    const res = await d.fetchImpl(`${d.apiUrl.replace(/\/+$/, '')}/api/ping`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, version: d.version, lang: d.lang, platform: platformOf(d.ua) }),
    });
    if (!res.ok) return false;
    write(d.storage, KEY_LAST, d.now.toISOString());
    return true;
  } catch {
    return false;
  }
}
