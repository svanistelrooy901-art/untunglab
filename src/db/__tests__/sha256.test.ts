import { describe, expect, it } from 'vitest';
import { sha256Hex, sha256HexFallback } from '../sha256';

describe('sha256 (backup checksum works on insecure origins too)', () => {
  const vectors: [string, string][] = [
    ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
    ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
    ['abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq', '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1'],
  ];
  for (const [input, hex] of vectors) {
    it(`fallback matches the known digest for ${JSON.stringify(input.slice(0, 12))}`, () => {
      expect(sha256HexFallback(new TextEncoder().encode(input))).toBe(hex);
    });
  }
  it('handles multi-byte text and equals WebCrypto', async () => {
    const text = 'Brownies Kak Untung — RM6.78 · 日本語'.repeat(40);
    const bytes = new TextEncoder().encode(text);
    const web = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((b) => b.toString(16).padStart(2, '0')).join('');
    expect(sha256HexFallback(bytes)).toBe(web);
    expect(await sha256Hex(text)).toBe(web);
  });
  it('falls back when crypto.subtle is missing', async () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    Object.defineProperty(globalThis, 'crypto', { value: {}, configurable: true });
    try {
      expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    } finally {
      if (original) Object.defineProperty(globalThis, 'crypto', original);
    }
  });
});
