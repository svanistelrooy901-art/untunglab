// Browser check for Phase 10 (Lesen: free limits, activation, offline, release). The licence server is a test double.
// Build first with scripts/e2e-build.sh, serve dist-e2e, then:
// E2E_KEYS=/tmp/e2e-keys.json PW_ROOT=$(npm root -g) APP_URL=http://localhost:4181/ node scripts/e2e-phase10.mjs <screenshot-dir>
import { createRequire } from 'node:module';
import { GOOD_CODE, mockLicenseServer, sign } from './e2e-license.mjs';
const require = createRequire(process.env.PW_ROOT + '/');
const { chromium } = require('playwright');
const S = process.argv[2] ?? '.';
const url = process.env.APP_URL ?? 'http://localhost:4181/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ms-MY' });
await ctx.addInitScript(() => localStorage.setItem('ul-app-lang', 'ms')); // skip the first-open language prompt
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && !/ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(m.text()) && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
const ok = (name, cond) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`); if (!cond) process.exitCode = 1; };
const box = (name) => page.getByRole('textbox', { name, exact: true });
const saveSheet = () => page.getByRole('button', { name: 'Simpan' }).last().click();
const server = await mockLicenseServer(page);

async function addBahan(n) {
  await page.getByRole('button', { name: 'Tambah bahan' }).first().click();
  await box('Nama').fill(n);
  await box('Harga beli (RM)').fill('10');
  await box('Kuantiti dalam pek').fill('1');
  await page.getByRole('combobox', { name: 'Unit pek' }).fill('kg');
  await saveSheet();
  await page.getByText(n, { exact: true }).first().waitFor();
}
async function addPack(n) {
  await page.getByRole('button', { name: 'Tambah pembungkusan' }).first().click();
  await box('Nama').fill(n);
  await box('Harga beli (RM)').fill('0.70');
  await box('Bilangan dalam satu beli').fill('1');
  await saveSheet();
  await page.getByText(n, { exact: true }).first().waitFor();
}
async function addMenu(n) {
  await page.goto(url + '#/menu/baru');
  await box('Nama menu').fill(n);
  await box('Hasil setiap batch (bilangan jualan)').fill('10');
  await box('Masa penyediaan setiap batch (minit)').fill('60');
  await box('Harga Jual seunit (RM)').fill('12');
  await page.getByRole('button', { name: '+ Tambah bahan' }).click();
  await page.locator('#ing-0').selectOption({ index: 1 });
  await box('Kuantiti guna').fill('100');
  await page.getByRole('button', { name: 'Simpan menu' }).click();
  await page.getByRole('link', { name: new RegExp(n) }).waitFor();
}

// --- free plan ---
await page.goto(url + '#/lesen');
await page.getByTestId('plan-name').getByText('Versi Percuma').waitFor();
ok('starts on free plan', true);
await page.screenshot({ path: `${S}/p10-01-lesen-percuma.png` });

await page.goto(url + '#/pembungkusan');
await addPack('Kotak A');
await addPack('Kotak B');
ok('packaging: 2 / 2 shown', await page.getByText('2 / 2 digunakan').isVisible());
ok('packaging: add disabled at limit', await page.getByRole('button', { name: 'Tambah pembungkusan' }).first().isDisabled());
ok('packaging: upgrade link shown', await page.getByRole('link', { name: 'Buka versi penuh' }).isVisible());
await page.screenshot({ path: `${S}/p10-02-pembungkusan-penuh.png` });
// existing items stay editable
await page.getByText('Kotak A', { exact: true }).click();
await box('Harga beli (RM)').fill('0.80');
await saveSheet();
await page.getByText('RM0.80 / 1 pcs').waitFor();
ok('existing packaging still editable at limit', true);
// archive one, add one, then restoring would exceed the limit
await page.getByText('Kotak B', { exact: true }).click();
await page.getByRole('button', { name: 'Arkibkan', exact: true }).click();
await page.getByText('1 / 2 digunakan').waitFor();
await addPack('Kotak C');
await page.getByRole('checkbox').check();
await page.getByText('Kotak B').click();
ok('restore blocked while at limit', await page.getByRole('button', { name: 'Pulihkan' }).isDisabled());
await page.keyboard.press('Escape');

await page.goto(url + '#/bahan');
for (let i = 1; i <= 10; i++) await addBahan(`Bahan ${i}`);
ok('bahan: 10 / 10', await page.getByText('10 / 10 digunakan').isVisible());
ok('bahan: add disabled at limit', await page.getByRole('button', { name: 'Tambah bahan' }).first().isDisabled());
await page.screenshot({ path: `${S}/p10-03-bahan-penuh.png` });

await addMenu('Menu Satu');
await addMenu('Menu Dua');
await page.goto(url + '#/menu');
await page.getByText('2 / 2 digunakan').waitFor();
ok('menu: add disabled at limit', await page.getByRole('button', { name: 'Tambah menu' }).first().isDisabled());
await page.goto(url + '#/menu/baru');
await page.getByText('Had versi percuma dicapai').waitFor();
ok('menu/baru shows limit screen', true);
await page.screenshot({ path: `${S}/p10-04-menu-penuh.png` });

await page.goto(url + '#/kos-operasi');
await page.getByRole('button', { name: /Ruang Kerja/ }).click();
ok('detailed tab is open on free (D-77: trial has every feature)', await page.getByRole('tab', { name: 'Kira Lebih Tepat' }).isEnabled());
await page.getByRole('tab', { name: 'Kira Lebih Tepat' }).click();
ok('no preview lock shown', (await page.getByTestId('tab-pratonton').count()) === 0);
ok('detailed fields are editable on free', await page.getByRole('textbox', { name: 'Kos rumah atau sewa sebulan (RM)', exact: true }).isEnabled());
ok('detailed Simpan is enabled on free', await page.getByRole('button', { name: 'Simpan' }).last().isEnabled());
await page.screenshot({ path: `${S}/p10-05-tab-pratonton.png` });
await page.keyboard.press('Escape');

// --- activation errors ---
await page.goto(url + '#/lesen');
const activate = async (code) => { await box('Kod lesen').fill(code); await page.getByRole('button', { name: 'Aktifkan' }).click(); };
ok('activate disabled for malformed code', await (async () => { await box('Kod lesen').fill('abc'); return page.getByRole('button', { name: 'Aktifkan' }).isDisabled(); })());
await activate('UL-XXXX-XXXX-XXXX'.replace(/X/g, 'A'));
await page.getByText('Kod ini tidak dijumpai. Semak semula ejaan.').waitFor();
ok('unknown code message', true);
server.mode = 'revoked';
await activate(GOOD_CODE);
await page.getByText('Kod ini telah dibatalkan. Hubungi penjual.').waitFor();
ok('revoked message', true);
server.mode = 'device_limit';
await activate(GOOD_CODE);
await page.getByText(/sudah digunakan pada 2 peranti/).waitFor();
ok('device limit lists both devices', (await page.getByText('Android · Chrome').isVisible()) && (await page.getByText('Windows · Edge').isVisible()));
await page.screenshot({ path: `${S}/p10-06-had-peranti.png` });
ok('still free after failures', await page.getByTestId('plan-name').getByText('Versi Percuma').isVisible());
server.mode = 'network';
await activate(GOOD_CODE);
await page.getByText('Tiada sambungan internet. Sambung dan cuba lagi.').waitFor();
ok('offline activation explains itself', true);
server.mode = 'ok';

// --- activate ---
await activate(GOOD_CODE);
await page.getByText('Berjaya diaktifkan pada peranti ini.').waitFor();
await page.getByTestId('plan-name').getByText('UntungLab Penuh').waitFor();
ok('now full version', true);
ok('server was sent this device id and label', server.calls.some((c) => c.path === '/api/activate' && typeof c.body.deviceId === 'string' && c.body.deviceLabel));
await page.screenshot({ path: `${S}/p10-07-aktif.png` });

await page.goto(url + '#/bahan');
await page.getByText('Bahan 10', { exact: true }).waitFor();
ok('limits lifted: no counter, add enabled', (await page.getByRole('button', { name: 'Tambah bahan' }).first().isEnabled()) && (await page.getByTestId('limit-note').count()) === 0);
await addBahan('Bahan 11');
ok('11th ingredient accepted on full version', true);
await page.goto(url + '#/kos-operasi');
await page.getByRole('button', { name: /Ruang Kerja/ }).click();
await page.getByRole('tab', { name: 'Kira Lebih Tepat' }).click();
ok('detailed fields editable on full version', await page.getByRole('textbox', { name: 'Kos rumah atau sewa sebulan (RM)', exact: true }).isEnabled());
await page.keyboard.press('Escape');

// --- offline after activation ---
await ctx.setOffline(true);
await page.reload();
await page.goto(url + '#/lesen');
await page.getByTestId('plan-name').getByText('UntungLab Penuh').waitFor();
ok('full version works offline after reload', true);
await ctx.setOffline(false);

// --- tampered / copied activation is ignored ---
const dbNames = await page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name));
const stolen = await sign('some-other-device-id');
await page.evaluate(async ({ name, token }) => {
  await new Promise((res, rej) => {
    const open = indexedDB.open(name);
    open.onsuccess = () => {
      const tx = open.result.transaction('license', 'readwrite');
      tx.objectStore('license').put({ id: 'activation', token, codeHint: 'JKMN', activatedAt: new Date().toISOString() });
      tx.oncomplete = () => (open.result.close(), res());
      tx.onerror = () => rej(tx.error);
    };
    open.onerror = () => rej(open.error);
  });
}, { name: dbNames[0], token: stolen });
await page.reload();
await page.goto(url + '#/lesen');
await page.getByTestId('plan-name').getByText('Versi Percuma').waitFor();
ok('token issued for another device is rejected', true);
await page.goto(url + '#/bahan');
await page.getByText('Bahan 11', { exact: true }).waitFor();
ok('over-limit data untouched (11 bahan still visible)', true);
ok('but adding is blocked again', await page.getByRole('button', { name: 'Tambah bahan' }).first().isDisabled());

// --- release ---
await page.goto(url + '#/lesen');
await box('Kod lesen').fill(GOOD_CODE);
await page.getByRole('button', { name: 'Aktifkan' }).click();
await page.getByTestId('plan-name').getByText('UntungLab Penuh').waitFor();
await page.getByRole('button', { name: 'Lepaskan peranti ini' }).click();
await box('Kod lesen').fill(GOOD_CODE);
await page.getByRole('button', { name: 'Ya, lepaskan' }).click();
await page.getByText(/Peranti dilepaskan/).waitFor();
await page.getByTestId('plan-name').getByText('Versi Percuma').waitFor();
ok('release returns this device to free', true);
ok('release call carried code and device id', server.calls.some((c) => c.path === '/api/release' && c.body.code === GOOD_CODE && typeof c.body.deviceId === 'string'));
await page.screenshot({ path: `${S}/p10-08-dilepaskan.png` });

ok('no console errors', errors.length === 0);
if (errors.length) console.log(errors);
await browser.close();
