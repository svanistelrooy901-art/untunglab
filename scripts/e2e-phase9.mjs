// Browser check for Phase 9 (Sandaran). Export, refuse bad files, restore on a brand-new device, offline.
// Usage: PW_ROOT=$(npm root -g) APP_URL=http://localhost:4173/ node scripts/e2e-phase9.mjs <screenshot-dir>
import { createRequire } from 'node:module';
import { fillRemainingOperating } from './e2e-ops.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const require = createRequire(process.env.PW_ROOT + '/');
const { chromium } = require('playwright');
const S = process.argv[2] ?? '.';
const url = process.env.APP_URL ?? 'http://localhost:4173/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'ms-MY' });
await ctx.addInitScript(() => localStorage.setItem('ul-app-lang', 'ms')); // skip the first-open language prompt
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
const ok = (name, cond) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`); if (!cond) process.exitCode = 1; };
const box = (name) => page.getByRole('textbox', { name, exact: true });
const saveSheet = () => page.getByRole('button', { name: 'Simpan' }).last().click();

// --- setup through real screens ---
await page.goto(url + '#/');
await page.goto(url + '#/bahan');
for (const [n, price, qty] of [['Ayam', '15', '1'], ['Bahan lain', '50.4', '1']]) {
  await page.getByRole('button', { name: 'Tambah bahan' }).first().click();
  await box('Nama').fill(n);
  await box('Harga beli (RM)').fill(price);
  await box('Kuantiti dalam pek').fill(qty);
  await page.getByRole('combobox', { name: 'Unit pek' }).fill('kg');
  await saveSheet();
  await page.getByText(n, { exact: true }).first().waitFor();
}
await page.goto(url + '#/pembungkusan');
await page.getByRole('button', { name: 'Tambah pembungkusan' }).first().click();
await box('Nama').fill('Kotak');
await box('Harga beli (RM)').fill('0.70');
await box('Bilangan dalam satu beli').fill('1');
await saveSheet();
await page.getByText('Kotak', { exact: true }).first().waitFor();
await page.goto(url + '#/kos-operasi');
await box('Nilai Masa (RM sejam)').fill('25');
await box('Anggaran Jualan Bulanan (RM)').fill('3000');
await page.getByRole('button', { name: 'Simpan' }).first().click();
await page.getByText('✓ Disimpan').waitFor();
await page.getByRole('button', { name: /^Gas/ }).click();
await page.getByRole('radio', { name: 'Jumlah terus' }).click({ timeout: 1200 }).catch(() => {});
await box('Jumlah sebulan (RM)').fill('600');
await saveSheet();
await fillRemainingOperating(page, url);

await page.goto(url + '#/menu/baru');
await box('Nama menu').fill('Nasi Lemak');
await box('Hasil setiap batch (bilangan jualan)').fill('10');
await box('Masa penyediaan setiap batch (minit)').fill('60');
await box('Harga Jual seunit (RM)').fill('12');
await page.getByRole('button', { name: '+ Tambah bahan' }).click();
await page.locator('#ing-0').selectOption({ label: 'Ayam' });
await box('Kuantiti guna').fill('1200');
await page.getByRole('button', { name: '+ Tambah bahan' }).click();
await page.locator('#ing-1').selectOption({ label: 'Bahan lain' });
await page.getByRole('textbox', { name: 'Kuantiti guna' }).nth(1).fill('1000');
await page.getByRole('button', { name: '+ Tambah pembungkusan' }).click();
await page.locator('#pack-0').selectOption({ label: 'Kotak' });
await page.getByRole('button', { name: 'Simpan menu' }).click();
await page.getByRole('link', { name: /Nasi Lemak/ }).waitFor();



// a price change so history has two records
await page.goto(url + '#/kesan-harga');
await page.getByLabel('Bahan', { exact: true }).selectOption({ label: 'Ayam' });
await page.getByRole('button', { name: '+20%' }).click();
await page.getByRole('button', { name: 'Guna harga ini' }).click();
await page.getByRole('button', { name: 'Ya, guna harga ini' }).click();
await page.getByRole('status').getByText(/dikemas kini/).waitFor();

// --- reminder before any backup ---
await page.goto(url + '#/');
await page.getByTestId('peringatan-sandaran').waitFor();
ok('reminder shown when data exists and nothing was backed up', /belum simpan backup/i.test(await page.getByTestId('peringatan-sandaran').innerText()));

// --- export ---
await page.goto(url + '#/sandaran');
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Simpan backup' }).click()]);
const file = `${S}/${dl.suggestedFilename()}`;
await dl.saveAs(file);
ok('download named untunglab-sandaran-YYYY-MM-DD.json', /^untunglab-sandaran-\d{4}-\d{2}-\d{2}\.json$/.test(dl.suggestedFilename()));
await page.getByRole('status').getByText(/Backup disimpan/).waitFor();
await page.screenshot({ path: `${S}/p9-01-sandaran.png`, fullPage: true });
await page.goto(url + '#/');
await page.getByText('Nasi Lemak').first().waitFor();
ok('reminder gone after backup', (await page.getByTestId('peringatan-sandaran').count()) === 0);

const good = readFileSync(file, 'utf8');
const parsed = JSON.parse(good);
ok('file has app, format, checksum and tables', parsed.app === 'untunglab' && parsed.format === 1 && /^sha256:/.test(parsed.checksum) && parsed.data.priceHistory.length === 3);

// --- refuse bad files ---
const tampered = structuredClone(parsed); tampered.data.ingredients[0].purchasePrice = 1;
writeFileSync(`${S}/tampered.json`, JSON.stringify(tampered));
writeFileSync(`${S}/truncated.json`, good.slice(0, good.length - 50));
writeFileSync(`${S}/other.json`, '{"hello":"world"}');
await page.goto(url + '#/sandaran');
for (const [f, msg] of [['tampered.json', /berubah atau rosak/], ['truncated.json', /rosak atau tidak lengkap/], ['other.json', /bukan fail backup UntungLab/]]) {
  await page.getByTestId('fail-sandaran').setInputFiles(`${S}/${f}`);
  await page.getByRole('alert').getByText(msg).waitFor();
  ok(`${f} refused with a clear reason`, (await page.getByTestId('pratonton').count()) === 0);
}
await page.screenshot({ path: `${S}/p9-02-fail-rosak.png` });

// --- restore over changed data (same device) ---
await page.goto(url + '#/bahan');
await page.getByText('Ayam', { exact: true }).first().click();
await box('Harga beli (RM)').fill('99');
await saveSheet();
await page.getByText('RM99.00').first().waitFor();
await page.goto(url + '#/sandaran');
await page.getByTestId('fail-sandaran').setInputFiles(file);
await page.getByTestId('pratonton').waitFor();
ok('preview names counts', /2 bahan, 1 menu, 1 pembungkusan, 0 peralatan, 3 rekod harga/.test(await page.getByTestId('pratonton').innerText()));
await page.screenshot({ path: `${S}/p9-03-pratonton.png` });
await page.getByRole('button', { name: 'Ganti data dalam peranti' }).click();
await page.getByText('Ganti semua data?').waitFor();
await page.getByRole('button', { name: 'Ya, ganti data' }).click();
await page.getByRole('status').getByText(/Data dipulihkan/).waitFor();
await page.goto(url + '#/menu');
await page.getByText(/Kos Sebenar RM12\.80/).waitFor();
ok('restore brought back the RM18 chicken price (cost RM12.80), not RM99', true);
await page.goto(url + '#/jejak-harga');
await page.getByText('Sejarah (2 rekod)').first().waitFor();
ok('history restored (2 records for Ayam)', true);

// --- brand-new device, offline ---
const fresh = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ms-MY' });
await fresh.addInitScript(() => localStorage.setItem('ul-app-lang', 'ms')); // skip the first-open language prompt
const p2 = await fresh.newPage();
const errors2 = [];
p2.on('pageerror', (e) => errors2.push(String(e)));
await p2.goto(url + '#/sandaran');
await p2.getByText('Belum pernah simpan backup').waitFor();
await p2.waitForTimeout(1500); // let the service worker cache the app
await fresh.setOffline(true);
await p2.getByTestId('fail-sandaran').setInputFiles(file);
await p2.getByTestId('pratonton').waitFor();
await p2.getByRole('button', { name: 'Ganti data dalam peranti' }).click();
await p2.getByRole('button', { name: 'Ya, ganti data' }).click();
await p2.getByRole('status').getByText(/Data dipulihkan/).waitFor();
await p2.goto(url + '#/');
await p2.getByText('Nasi Lemak').first().waitFor();
const rank = await p2.getByTestId('ranking').innerText();
ok('new device (offline): Nasi Lemak numbers identical to the original', /RM12\.80/.test(rank) && /−RM0\.80/.test(rank) && /−6\.7%/.test(rank));
await p2.screenshot({ path: `${S}/p9-04-peranti-baru.png`, fullPage: true });
const overflow = await p2.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
ok('no horizontal overflow at 390px', !overflow);
ok('no errors on the new device', errors2.length === 0);

ok('no console errors', errors.length === 0);
if (errors.length) console.log(errors);
await browser.close();
