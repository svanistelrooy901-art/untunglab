/** No 0/O, 1/I/L or U, so a code read off a screen or an email cannot be mistyped into another valid character. */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
const LENGTH = 12;
/** Largest multiple of the alphabet size that fits in a byte. Bytes at or above it are discarded to avoid modulo bias. */
const LIMIT = 256 - (256 % CODE_ALPHABET.length);

const group = (chars: string) => `UL-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;

export function generateCode(randomBytes: (n: number) => Uint8Array): string {
  let chars = '';
  while (chars.length < LENGTH) {
    for (const b of randomBytes(LENGTH * 2)) {
      if (b < LIMIT && chars.length < LENGTH) chars += CODE_ALPHABET[b % CODE_ALPHABET.length];
    }
  }
  return group(chars);
}

/** Canonical form of what a person typed, or null if it can never be a valid code. */
export function normaliseCode(input: string): string | null {
  let s = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.startsWith('UL')) s = s.slice(2);
  if (s.length !== LENGTH) return null;
  for (const ch of s) if (!CODE_ALPHABET.includes(ch)) return null;
  return group(s);
}
