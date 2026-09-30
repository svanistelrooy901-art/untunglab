// Test double for the licence server, used by browser checks. The app under test is built with a throw-away public key
// (see scripts/e2e-build.sh); this signs tokens with the matching private key exactly like server/core does.
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';

export const API = 'https://license.test';
export const GOOD_CODE = 'UL-ABCD-EFGH-JKMN';
const keys = JSON.parse(readFileSync(process.env.E2E_KEYS ?? '/tmp/e2e-keys.json', 'utf8'));
const b64u = (buf) => Buffer.from(buf).toString('base64url');

export async function sign(deviceId, codeHint = 'JKMN') {
  const payload = { v: 1, plan: 'lifetime', deviceId, codeHint, issuedAt: new Date().toISOString() };
  const key = await webcrypto.subtle.importKey('jwk', keys.privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const body = b64u(Buffer.from(JSON.stringify(payload)));
  const sig = await webcrypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, Buffer.from(body));
  return `${body}.${b64u(sig)}`;
}

/** mode: 'ok' | 'network' | 'device_limit' | 'invalid' | 'revoked'. Records requests in state.calls. */
export async function mockLicenseServer(page, state = { mode: 'ok', calls: [] }) {
  await page.route(`${API}/**`, async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const body = req.postDataJSON?.() ?? {};
    state.calls.push({ path, body });
    const json = (status, obj) => route.fulfill({ status, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(obj) });
    if (state.mode === 'network') return route.abort('internetdisconnected');
    if (path === '/api/release') return json(200, { ok: true });
    if (state.mode === 'device_limit') return json(409, { error: 'device_limit', devices: [{ label: 'Android · Chrome', activatedAt: '2026-08-01T00:00:00Z' }, { label: 'Windows · Edge', activatedAt: '2026-08-05T00:00:00Z' }] });
    if (state.mode === 'revoked') return json(403, { error: 'revoked' });
    if (state.mode === 'invalid' || body.code !== GOOD_CODE) return json(404, { error: 'invalid_code' });
    return json(200, { token: await sign(body.deviceId), codeHint: 'JKMN' });
  });
  return state;
}

/** Goes through the real Lesen screen. */
export async function activatePro(page, url) {
  const state = await mockLicenseServer(page);
  await page.goto(url + '#/lesen');
  await page.getByRole('textbox', { name: 'Kod lesen', exact: true }).fill(GOOD_CODE);
  await page.getByRole('button', { name: 'Aktifkan' }).click();
  await page.getByText('Berjaya diaktifkan pada peranti ini.').waitFor();
  await page.getByText('UntungLab Penuh').first().waitFor();
  return state;
}
