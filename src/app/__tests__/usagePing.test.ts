import { describe, expect, it, vi } from 'vitest';
import { PING_EVERY_DAYS, makeInstallId, platformOf, sendUsagePing, setUsagePingOff, shouldPing, usagePingOff, type PingDeps } from '../usagePing';

const now = new Date('2026-10-10T12:00:00Z');
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();
const mem = (init: Record<string, string> = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), _m: m };
};
const ok = () => vi.fn(async () => new Response('{"ok":true}', { status: 200 }));
const deps = (over: Partial<PingDeps> = {}): PingDeps => ({
  apiUrl: 'https://beli.example.com/', storage: mem(), fetchImpl: ok() as unknown as typeof fetch, now, ua: 'Mozilla/5.0 (Linux; Android 14)',
  lang: 'ms', version: '0.1.0', random: (n) => new Uint8Array(n).map((_, i) => i + 1), ...over,
});

describe('usage ping schedule', () => {
  it('pings on first run, then only after the week has passed', () => {
    expect(shouldPing({ off: false, lastPing: null, now })).toBe(true);
    expect(shouldPing({ off: false, lastPing: daysAgo(PING_EVERY_DAYS - 1), now })).toBe(false);
    expect(shouldPing({ off: false, lastPing: daysAgo(PING_EVERY_DAYS), now })).toBe(true);
    expect(shouldPing({ off: false, lastPing: 'garbage', now })).toBe(true);
  });
  it('never pings when switched off', () => {
    expect(shouldPing({ off: true, lastPing: null, now })).toBe(false);
  });
});

describe('usage ping content', () => {
  it('an install id is 32 hex characters from the random source', () => {
    expect(makeInstallId((n) => new Uint8Array(n).fill(255))).toBe('f'.repeat(32));
  });
  it('device type is coarse', () => {
    expect(platformOf('Mozilla/5.0 (Linux; Android 14; SM-A175F)')).toBe('android');
    expect(platformOf('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')).toBe('ios');
    expect(platformOf('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('desktop');
    expect(platformOf('weird')).toBe('other');
  });
  it('sends only the id, version, language and device type, then remembers the time', async () => {
    const d = deps();
    expect(await sendUsagePing(d)).toBe(true);
    const [url, init] = (d.fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://beli.example.com/api/ping');
    const body = JSON.parse(String(init.body));
    expect(Object.keys(body).sort()).toEqual(['id', 'lang', 'platform', 'version']);
    expect(body).toMatchObject({ lang: 'ms', platform: 'android', version: '0.1.0' });
    expect(body.id).toMatch(/^[0-9a-f]{32}$/);
    // the next start in the same week sends nothing, and keeps the same id
    expect(await sendUsagePing({ ...d, now: new Date(now.getTime() + 86_400_000) })).toBe(false);
    expect((d.fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
    const later = deps({ storage: d.storage, now: new Date(now.getTime() + 7 * 86_400_000) });
    await sendUsagePing(later);
    expect(JSON.parse(String(((later.fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit])[1].body)).id).toBe(body.id);
  });
});

describe('usage ping never gets in the way', () => {
  it('does nothing without a server address or when switched off', async () => {
    const a = deps({ apiUrl: null });
    expect(await sendUsagePing(a)).toBe(false);
    const storage = mem();
    setUsagePingOff(storage, true);
    expect(usagePingOff(storage)).toBe(true);
    const b = deps({ storage });
    expect(await sendUsagePing(b)).toBe(false);
    expect(b.fetchImpl).not.toHaveBeenCalled();
    setUsagePingOff(storage, false);
    expect(usagePingOff(storage)).toBe(false);
  });
  it('offline, a server error or blocked storage are swallowed, and the next start tries again', async () => {
    const storage = mem();
    expect(await sendUsagePing(deps({ storage, fetchImpl: (async () => { throw new TypeError('offline'); }) as unknown as typeof fetch }))).toBe(false);
    expect(await sendUsagePing(deps({ storage, fetchImpl: (async () => new Response('x', { status: 500 })) as unknown as typeof fetch }))).toBe(false);
    expect(storage._m.has('untunglab.lastPing')).toBe(false);
    expect(await sendUsagePing(deps({ storage }))).toBe(true);
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    await expect(sendUsagePing(deps({ storage: blocked }))).resolves.toBeTypeOf('boolean');
  });
});
