/**
 * A licence token proves, without any server, that a code was activated on this device.
 * ECDSA P-256 is used because every current browser and Cloudflare Workers support it in WebCrypto.
 * Only the server holds the private key; the app ships the public key and can only verify.
 */
export interface LicensePayload {
  v: 1;
  plan: 'lifetime';
  deviceId: string;
  /** Last four characters of the code, so support can recognise it. Not enough to use the code. */
  codeHint: string;
  issuedAt: string;
}

export type VerifyResult =
  | { ok: true; payload: LicensePayload }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'unsupported' | 'wrong_device' };

const ALGORITHM = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const SIGN = { name: 'ECDSA', hash: 'SHA-256' } as const;

function toBase64Url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(text) || text.length % 4 === 1) return null;
  try {
    const s = atob(text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4));
    return Uint8Array.from(s, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

export async function generateKeyPair(): Promise<{ publicJwk: JsonWebKey; privateJwk: JsonWebKey }> {
  const pair = await crypto.subtle.generateKey(ALGORITHM, true, ['sign', 'verify']);
  return { publicJwk: await crypto.subtle.exportKey('jwk', pair.publicKey), privateJwk: await crypto.subtle.exportKey('jwk', pair.privateKey) };
}

export async function signLicense(payload: LicensePayload, privateJwk: JsonWebKey): Promise<string> {
  const key = await crypto.subtle.importKey('jwk', privateJwk, ALGORITHM, false, ['sign']);
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign(SIGN, key, new TextEncoder().encode(body));
  return `${body}.${toBase64Url(new Uint8Array(sig))}`;
}

export async function verifyLicense(token: string, publicJwk: JsonWebKey, deviceId: string): Promise<VerifyResult> {
  const parts = token.split('.');
  if (parts.length !== 2) return { ok: false, reason: 'malformed' };
  const [body, sig] = parts as [string, string];
  const bodyBytes = fromBase64Url(body);
  const sigBytes = fromBase64Url(sig);
  if (!bodyBytes || !sigBytes) return { ok: false, reason: 'malformed' };
  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(bodyBytes));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (typeof payload !== 'object' || payload === null) return { ok: false, reason: 'malformed' };
  let valid = false;
  try {
    const key = await crypto.subtle.importKey('jwk', publicJwk, ALGORITHM, false, ['verify']);
    valid = await crypto.subtle.verify(SIGN, key, sigBytes as BufferSource, new TextEncoder().encode(body));
  } catch {
    valid = false;
  }
  if (!valid) return { ok: false, reason: 'bad_signature' };
  const p = payload as Partial<LicensePayload>;
  if (p.v !== 1 || p.plan !== 'lifetime') return { ok: false, reason: 'unsupported' };
  if (typeof p.deviceId !== 'string' || typeof p.codeHint !== 'string' || typeof p.issuedAt !== 'string') return { ok: false, reason: 'malformed' };
  if (p.deviceId !== deviceId) return { ok: false, reason: 'wrong_device' };
  return { ok: true, payload: p as LicensePayload };
}
