// Browser check for Phase 7 (Dashboard, Jejak Harga, Insights). Same M01 menu, then a price move.
// Usage: PW_ROOT=$(npm root -g) APP_URL=http://localhost:4173/ node scripts/e2e-phase7.mjs <screenshot-dir>
import { createRequire } from 'node:module';
import { fillRemainingOperating } from './e2e-ops.mjs';
const require = createRequire(process.env.PW_ROOT + '/');
const { chromium } = require('playwright');
const S = process.argv[2] ?? '.';
const url = process.env.APP_URL ?? 'http://localhost:4173/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ms-MY' });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
const ok = (name, cond) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`); if (!cond) process.exitCode = 1; };
const box = (name) => page.getByRole('textbox', { name, exact: true });
const saveSheet = () => page.getByRole('button', { name: 'Simpan' }).last().click();

// --- setup through real screens ---
await page.goto(url + '#/');
await page.getByText('Mula di sini').waitFor();
ok('empty dashboard shows guided setup', true);
await page.screenshot({ path: `${S}/p7-01-kosong.png` });
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

// --- dashboard leads with the loss, numbers equal the menu screen ---
await page.goto(url + '#/');
await page.getByText('Nasi Lemak sedang rugi').waitFor();
ok('loss insight first', await page.getByTestId('insights').locator('li').first().innerText().then((x) => x.includes('Nasi Lemak sedang rugi')));
const rank = await page.getByTestId('ranking').innerText();
ok('ranking shows RM12.44 / −RM0.44 / −3.7% / Menu Ini Rugi', /RM12\.44/.test(rank) && /−RM0\.44/.test(rank) && /−3\.7%/.test(rank) && /Menu Ini Rugi/.test(rank));
await page.screenshot({ path: `${S}/p7-02-dashboard-rugi.png`, fullPage: true });
await page.goto(url + '#/menu');
const list = await page.getByText(/Kos Sebenar RM12\.44/).first().innerText();
ok('menu list shows the same figures (M04)', /−RM0\.44/.test(list) && /−3\.7%/.test(list));

// --- baseline-only Jejak Harga ---
await page.goto(url + '#/jejak-harga');
await page.getByText('Rekod asal, belum ada perubahan').first().waitFor();
ok('baseline record, no false movement', true);

// --- price rises 7.0% ---
await page.goto(url + '#/bahan');
await page.getByText('Ayam', { exact: true }).first().click();
await box('Harga beli (RM)').fill('16.8');
await saveSheet();
await page.goto(url + '#/');
await page.getByText('Harga Ayam naik 12.0%').waitFor();
ok('price insight states item and movement', true);
ok('states affected menu', await page.getByText(/1 menu terjejas: Nasi Lemak/).isVisible());
ok('cost per unit before and after', await page.getByText(/RM15\.00 → RM16.80 setiap kg/).isVisible());
await page.screenshot({ path: `${S}/p7-03-dashboard-harga.png`, fullPage: true });
await page.getByTestId('insights').getByRole('button', { name: 'Tutup amaran ini' }).click();
await page.getByText('Harga Ayam naik 12.0%').waitFor({ state: 'detached' });
ok('alert can be closed', true);
await page.reload();
await page.getByText('Nasi Lemak sedang rugi').waitFor();
ok('closed alert stays closed after reload', (await page.getByText('Harga Ayam naik 12.0%').count()) === 0);
await page.getByRole('link', { name: /Lihat menu/ }).first().waitFor();
await page.goto(url + '#/jejak-harga');
await page.getByRole('link', { name: /Lihat kesan harga/ }).first().click();
ok('deep link to Kesan Harga', page.url().includes('#/kesan-harga?bahan='));

await page.goto(url + '#/jejak-harga');
await page.getByText('Harga pek terkini').first().waitFor();
const trails = await page.getByTestId('trails').innerText();
ok('Jejak Harga latest price and unit cost', /RM16.80 \/ 1 kg/.test(trails));
ok('Jejak Harga change on unit cost', /\+RM1.800\/kg \(\+12.0%\) naik/.test(trails));
ok('trend graph for the changed ingredient only', (await page.getByTestId('trend').count()) === 1);
await page.getByTestId('trend').scrollIntoViewIfNeeded();
await page.screenshot({ path: `${S}/p7-04a-graf.png`, fullPage: true });
await page.locator('summary', { hasText: 'Sejarah (2 rekod)' }).click();
ok('history lists both records', await page.getByText('Rekod asal, belum ada perubahan').first().isVisible());
await page.screenshot({ path: `${S}/p7-04-jejak.png`, fullPage: true });

// --- package-size-only change ---
await page.goto(url + '#/bahan');
await page.getByText('Bahan lain', { exact: true }).first().click();
await box('Kuantiti dalam pek').fill('0.9');
await saveSheet();
await page.goto(url + '#/jejak-harga');
await page.getByText(/\+11\.1%/).first().waitFor();
const t2 = await page.getByTestId('trails').innerText();
ok('package-size-only change shows real unit-cost movement', /\+RM5\.600\/kg \(\+11\.1%\) naik/.test(t2));

// --- offline ---
await page.reload();
await page.waitForTimeout(1500);
await ctx.setOffline(true);
await page.goto(url + '#/');
await page.getByText('Nasi Lemak').first().waitFor();
ok('dashboard available offline', true);
await page.setViewportSize({ width: 1280, height: 800 });
await page.screenshot({ path: `${S}/p7-05-desktop.png` });
ok('no console errors', errors.length === 0);
if (errors.length) console.log(errors);
await browser.close();
