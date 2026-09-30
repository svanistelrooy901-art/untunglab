import { describe, expect, it } from 'vitest';
import { CODE_ALPHABET, generateCode, normaliseCode } from '../code';
import { FREE_LIMITS, canAdd, canUseDetailedOperating, limitState } from '../entitlement';
import { generateKeyPair, signLicense, verifyLicense, type LicensePayload } from '../token';

const payload = (over: Partial<LicensePayload> = {}): LicensePayload => ({ v: 1, plan: 'lifetime', deviceId: 'dev-1', codeHint: 'K3M7', issuedAt: '2026-09-30T00:00:00.000Z', ...over });

describe('licence code', () => {
  it('has the format UL-XXXX-XXXX-XXXX from an unambiguous alphabet', () => {
    const code = generateCode((n) => crypto.getRandomValues(new Uint8Array(n)));
    expect(code).toMatch(/^UL-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    for (const ch of 'O0I1LU') expect(CODE_ALPHABET).not.toContain(ch);
  });
  it('is random: 2000 codes, no repeats, every alphabet character shows up', () => {
    const seen = new Set<string>();
    const chars = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const c = generateCode((n) => crypto.getRandomValues(new Uint8Array(n)));
      seen.add(c);
      for (const ch of c.slice(3).replace(/-/g, '')) chars.add(ch);
    }
    expect(seen.size).toBe(2000);
    expect(chars.size).toBe(CODE_ALPHABET.length);
  });
  it('does not favour early characters (no modulo bias): bytes 240-255 are skipped', () => {
    let calls = 0;
    const code = generateCode((n) => {
      calls++;
      return calls === 1 ? new Uint8Array(n).fill(255) : new Uint8Array(n).fill(0);
    });
    expect(code).toBe('UL-AAAA-AAAA-AAAA');
  });
  it('accepts what a person types: lower case, spaces, missing dashes, missing prefix', () => {
    expect(normaliseCode('ul-k3m7-abcd-2345')).toBe('UL-K3M7-ABCD-2345');
    expect(normaliseCode(' K3M7 ABCD 2345 ')).toBe('UL-K3M7-ABCD-2345');
    expect(normaliseCode('ULK3M7ABCD2345')).toBe('UL-K3M7-ABCD-2345');
  });
  it('rejects wrong length and characters that can never appear in a code', () => {
    expect(normaliseCode('')).toBeNull();
    expect(normaliseCode('UL-K3M7-ABCD')).toBeNull();
    expect(normaliseCode('UL-K3M7-ABCD-234O')).toBeNull();
    expect(normaliseCode('UL-K3M7-ABCD-2341')).toBeNull();
  });
});

describe('licence token (ECDSA P-256, verified offline)', () => {
  it('a signed token verifies for its own device', async () => {
    const { publicJwk, privateJwk } = await generateKeyPair();
    const token = await signLicense(payload(), privateJwk);
    const r = await verifyLicense(token, publicJwk, 'dev-1');
    expect(r).toEqual({ ok: true, payload: payload() });
  });
  it('a token copied to another device is refused', async () => {
    const { publicJwk, privateJwk } = await generateKeyPair();
    const token = await signLicense(payload(), privateJwk);
    expect(await verifyLicense(token, publicJwk, 'dev-2')).toEqual({ ok: false, reason: 'wrong_device' });
  });
  it('an edited payload, a foreign key and garbage are refused', async () => {
    const a = await generateKeyPair();
    const b = await generateKeyPair();
    const token = await signLicense(payload(), a.privateJwk);
    const [body, sig] = token.split('.');
    const forged = btoa(JSON.stringify(payload({ deviceId: 'dev-2' }))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    expect(await verifyLicense(`${forged}.${sig}`, a.publicJwk, 'dev-2')).toEqual({ ok: false, reason: 'bad_signature' });
    expect(await verifyLicense(token, b.publicJwk, 'dev-1')).toEqual({ ok: false, reason: 'bad_signature' });
    expect(await verifyLicense('nonsense', a.publicJwk, 'dev-1')).toEqual({ ok: false, reason: 'malformed' });
    expect(await verifyLicense(`${body}`, a.publicJwk, 'dev-1')).toEqual({ ok: false, reason: 'malformed' });
    expect(await verifyLicense('a.b', a.publicJwk, 'dev-1')).toEqual({ ok: false, reason: 'malformed' });
  });
  it('an unknown token version is refused, not guessed', async () => {
    const { publicJwk, privateJwk } = await generateKeyPair();
    const token = await signLicense({ ...payload(), v: 2 } as unknown as LicensePayload, privateJwk);
    expect(await verifyLicense(token, publicJwk, 'dev-1')).toEqual({ ok: false, reason: 'unsupported' });
  });
});

describe('free plan limits (D-58)', () => {
  it('are 2 menus, 10 bahan, 2 pembungkusan', () => {
    expect(FREE_LIMITS).toEqual({ menus: 2, ingredients: 10, packaging: 2 });
  });
  it('free can add up to the limit and not beyond; pro is unlimited', () => {
    expect(canAdd('free', 'menus', 1)).toBe(true);
    expect(canAdd('free', 'menus', 2)).toBe(false);
    expect(canAdd('free', 'menus', 5)).toBe(false); // e.g. after restoring a bigger backup: nothing deleted, nothing new
    expect(canAdd('free', 'ingredients', 9)).toBe(true);
    expect(canAdd('free', 'ingredients', 10)).toBe(false);
    expect(canAdd('free', 'packaging', 1)).toBe(true);
    expect(canAdd('free', 'packaging', 2)).toBe(false);
    expect(canAdd('pro', 'menus', 500)).toBe(true);
  });
  it('Kira Lebih Tepat is a paid feature', () => {
    expect(canUseDetailedOperating('free')).toBe(false);
    expect(canUseDetailedOperating('pro')).toBe(true);
  });
  it('limitState reports used, limit and whether more can be added', () => {
    expect(limitState('free', 'menus', 2)).toEqual({ used: 2, limit: 2, canAdd: false });
    expect(limitState('free', 'ingredients', 3)).toEqual({ used: 3, limit: 10, canAdd: true });
    expect(limitState('pro', 'menus', 9)).toEqual({ used: 9, limit: null, canAdd: true });
  });
});
