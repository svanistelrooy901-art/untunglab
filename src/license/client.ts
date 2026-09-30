import { normaliseCode } from './code';

export interface DeviceInfo {
  label: string;
  activatedAt: string;
}

export type ActivateError = 'invalid_code' | 'revoked' | 'device_limit' | 'rate_limited' | 'network' | 'server' | 'bad_response';
export type ActivateResult =
  | { ok: true; token: string; codeHint: string }
  | { ok: false; error: Exclude<ActivateError, 'device_limit'> }
  | { ok: false; error: 'device_limit'; devices: DeviceInfo[] };

const KNOWN = new Set<string>(['invalid_code', 'revoked', 'device_limit', 'rate_limited']);
const url = (base: string, path: string) => `${base.replace(/\/+$/, '')}${path}`;

async function post(base: string, path: string, body: unknown, fetchImpl: typeof fetch): Promise<{ status: number; json: Record<string, unknown> } | 'network'> {
  try {
    const res = await fetchImpl(url(base, path), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    let json: Record<string, unknown> = {};
    try {
      json = (await res.json()) as Record<string, unknown>;
    } catch {
      json = {};
    }
    return { status: res.status, json };
  } catch {
    return 'network';
  }
}

/** The only place the app talks to the licence server, and only when the user activates or releases a device. */
export async function activateDevice(apiUrl: string, code: string, deviceId: string, deviceLabel: string, fetchImpl: typeof fetch = fetch): Promise<ActivateResult> {
  const normalised = normaliseCode(code);
  if (!normalised) return { ok: false, error: 'invalid_code' };
  const r = await post(apiUrl, '/api/activate', { code: normalised, deviceId, deviceLabel }, fetchImpl);
  if (r === 'network') return { ok: false, error: 'network' };
  if (r.status === 200) {
    return typeof r.json.token === 'string' && typeof r.json.codeHint === 'string'
      ? { ok: true, token: r.json.token, codeHint: r.json.codeHint }
      : { ok: false, error: 'bad_response' };
  }
  const error = typeof r.json.error === 'string' && KNOWN.has(r.json.error) ? r.json.error : null;
  if (error === 'device_limit') return { ok: false, error, devices: Array.isArray(r.json.devices) ? (r.json.devices as DeviceInfo[]) : [] };
  if (error) return { ok: false, error: error as 'invalid_code' | 'revoked' | 'rate_limited' };
  return { ok: false, error: 'server' };
}

export type ReleaseResult = { ok: true } | { ok: false; error: 'invalid_code' | 'network' | 'server' };

export async function releaseDevice(apiUrl: string, code: string, deviceId: string, fetchImpl: typeof fetch = fetch): Promise<ReleaseResult> {
  const normalised = normaliseCode(code);
  if (!normalised) return { ok: false, error: 'invalid_code' };
  const r = await post(apiUrl, '/api/release', { code: normalised, deviceId }, fetchImpl);
  if (r === 'network') return { ok: false, error: 'network' };
  if (r.status === 200) return { ok: true };
  return { ok: false, error: r.status === 404 ? 'invalid_code' : 'server' };
}
