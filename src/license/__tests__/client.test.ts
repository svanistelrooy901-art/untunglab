import { describe, expect, it } from 'vitest';
import { activateDevice, releaseDevice } from '../client';

const json = (status: number, body: unknown) => async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('licence client', () => {
  it('sends the normalised code, device id and label; returns the token', async () => {
    let seen: { url: string; body: unknown } | null = null;
    const fetchImpl = (async (url: string, init: RequestInit) => {
      seen = { url, body: JSON.parse(String(init.body)) };
      return new Response(JSON.stringify({ token: 'a.b', codeHint: 'K3M7', devices: { used: 1, max: 2 } }), { status: 200 });
    }) as unknown as typeof fetch;
    const r = await activateDevice('https://api.example.com/', 'ul k3m7 abcd 2345', 'dev-1', 'iPhone', fetchImpl);
    expect(r).toEqual({ ok: true, token: 'a.b', codeHint: 'K3M7' });
    expect(seen).toEqual({ url: 'https://api.example.com/api/activate', body: { code: 'UL-K3M7-ABCD-2345', deviceId: 'dev-1', deviceLabel: 'iPhone' } });
  });
  it('a badly typed code is refused before any request', async () => {
    let called = false;
    const r = await activateDevice('https://x', 'abc', 'dev', 'p', (async () => { called = true; return new Response('{}'); }) as unknown as typeof fetch);
    expect(r).toEqual({ ok: false, error: 'invalid_code' });
    expect(called).toBe(false);
  });
  it('maps every server answer to a named error', async () => {
    const run = (status: number, body: unknown) => activateDevice('https://x', 'UL-K3M7-ABCD-2345', 'd', 'p', json(status, body) as unknown as typeof fetch);
    expect(await run(404, { error: 'invalid_code' })).toEqual({ ok: false, error: 'invalid_code' });
    expect(await run(403, { error: 'revoked' })).toEqual({ ok: false, error: 'revoked' });
    expect(await run(409, { error: 'device_limit', devices: [{ label: 'iPhone', activatedAt: '2026-09-01' }] })).toEqual({ ok: false, error: 'device_limit', devices: [{ label: 'iPhone', activatedAt: '2026-09-01' }] });
    expect(await run(429, { error: 'rate_limited' })).toEqual({ ok: false, error: 'rate_limited' });
    expect(await run(500, {})).toEqual({ ok: false, error: 'server' });
    expect(await run(200, { nothing: true })).toEqual({ ok: false, error: 'bad_response' });
  });
  it('no internet is its own error', async () => {
    const r = await activateDevice('https://x', 'UL-K3M7-ABCD-2345', 'd', 'p', (async () => { throw new TypeError('Failed to fetch'); }) as unknown as typeof fetch);
    expect(r).toEqual({ ok: false, error: 'network' });
  });
  it('release reports success, or the reason', async () => {
    expect(await releaseDevice('https://x', 'UL-K3M7-ABCD-2345', 'd', json(200, { ok: true }) as unknown as typeof fetch)).toEqual({ ok: true });
    expect(await releaseDevice('https://x', 'UL-K3M7-ABCD-2345', 'd', json(404, { error: 'invalid_code' }) as unknown as typeof fetch)).toEqual({ ok: false, error: 'invalid_code' });
    expect(await releaseDevice('https://x', 'UL-K3M7-ABCD-2345', 'd', (async () => { throw new TypeError('x'); }) as unknown as typeof fetch)).toEqual({ ok: false, error: 'network' });
  });
});
