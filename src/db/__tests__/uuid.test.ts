import { afterEach, describe, expect, it, vi } from 'vitest';
import { newUuid } from '../uuid';

const real = globalThis.crypto;
const rnd = <T extends ArrayBufferView<ArrayBuffer>>(a: T): T => real.getRandomValues(a);
const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('newUuid (phone opened over plain http has no crypto.randomUUID)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('works when crypto.randomUUID is missing, as on http://192.168.x.x', () => {
    vi.stubGlobal('crypto', { getRandomValues: rnd });
    const id = newUuid();
    expect(id).toMatch(V4);
  });
  it('gives different ids in the fallback', () => {
    vi.stubGlobal('crypto', { getRandomValues: rnd });
    expect(new Set(Array.from({ length: 500 }, () => newUuid())).size).toBe(500);
  });
  it('uses the native one when present', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'native-id', getRandomValues: rnd });
    expect(newUuid()).toBe('native-id');
  });
});
