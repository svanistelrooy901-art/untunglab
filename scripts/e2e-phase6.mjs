// Browser check for Phase 6 (Menu / Resipi). Runs the Doc 06 M01 case through the real screens.
// Usage: PW_ROOT=$(npm root -g) APP_URL=http://localhost:4173/ node scripts/e2e-phase6.mjs <screenshot-dir>
import { createRequire } from 'node:module';
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

// --- master data ---
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

// --- menu with nothing set up yet: gaps must be named ---
await page.goto(url + '#/menu');
await page.getByText('Cipta menu pertama anda').waitFor();
await page.screenshot({ path: `${S}/p6-01-kosong.png` });
await page.getByRole('link', { name: 'Tambah menu' }).first().click();
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
ok('names missing Nilai Masa', await page.getByText(/Isi Nilai Masa di Kos Operasi/).first().isVisible());
ok('names missing sales', await page.getByText(/Isi Anggaran Jualan Bulanan di Kos Operasi/).first().isVisible());
await page.screenshot({ path: `${S}/p6-02-tidak-lengkap.png`, fullPage: true });
await page.getByRole('button', { name: 'Simpan menu' }).click();
await page.getByRole('link', { name: /Nasi Lemak/ }).waitFor();
ok('list shows incomplete menu', true);

// --- finish setup ---
await page.goto(url + '#/kos-operasi');
await box('Nilai Masa (RM sejam)').fill('25');
await box('Anggaran Jualan Bulanan (RM)').fill('3000');
await page.getByRole('button', { name: 'Simpan' }).first().click();
await page.getByText('✓ Disimpan').waitFor();
await page.getByRole('button', { name: /^Gas/ }).click();
await box('Jumlah sebulan (RM)').fill('600');
await saveSheet();

// --- M01 ---
await page.goto(url + '#/menu');
await page.getByText('Menu Ini Rugi').first().waitFor();
ok('M01 status Menu Ini Rugi', true);
ok('M01 cost RM12.44', await page.getByText(/Kos Sebenar RM12\.44/).isVisible());
ok('M01 profit −RM0.44 and −3.7%', await page.getByText(/−RM0\.44/).first().isVisible() && await page.getByText(/−3\.7%/).first().isVisible());
await page.screenshot({ path: `${S}/p6-03-senarai-rugi.png` });

await page.getByText('Nasi Lemak').first().click();
await page.getByText('Pecahan kos seunit').waitFor();
await page.locator('summary', { hasText: /^›?\s*Bahan/ }).first().click();
await page.getByText('Ayam · 1200 g').waitFor();
ok('breakdown line shows chicken RM18', await page.getByText('RM18.0000').isVisible());
await page.screenshot({ path: `${S}/p6-04-pecahan.png`, fullPage: true });

// --- M03: change an ingredient price, list must move ---
await page.goto(url + '#/bahan');
await page.getByText('Ayam', { exact: true }).first().click();
await box('Harga beli (RM)').fill('30');
await saveSheet();
await page.goto(url + '#/menu');
await page.getByText(/Kos Sebenar RM14\.24/).waitFor();
ok('menu follows live ingredient price (RM12.44 + RM1.80 more chicken)', true);

// --- Elektrik appliance view ---
await page.goto(url + '#/peralatan');
await page.getByRole('button', { name: 'Tambah peralatan' }).first().click();
await page.getByRole('button', { name: /Oven/ }).click();
await saveSheet();
await page.goto(url + '#/kos-operasi');
await page.getByRole('button', { name: /^Elektrik/ }).click();
await page.getByRole('tab', { name: 'Kira Lebih Tepat' }).click();
await page.getByText('Oven · 2,000 W').waitFor();
ok('appliance listed without tariff prompts for it', await page.getByText(/Simpan kadar elektrik di atas/).isVisible());
await box('Kadar elektrik (RM sekilowatt jam)').fill('0.50');
await page.getByRole('button', { name: 'Simpan kadar' }).click();
await page.getByText('RM1.00 / sejam').waitFor();
ok('oven RM1.00 an hour at RM0.50', true);
await page.screenshot({ path: `${S}/p6-05-elektrik-alat.png` });
await page.keyboard.press('Escape');

// --- equipment in a menu: C05 RM0.75 per batch ---
await page.goto(url + '#/menu');
await page.getByText('Nasi Lemak').first().click();
await page.getByRole('button', { name: '+ Tambah peralatan' }).click();
await page.locator('#eq-0').selectOption({ index: 1 });
await box('Masa guna (minit)').fill('45');
await page.locator('summary', { hasText: 'Utiliti Pengeluaran' }).click();
ok('C05 oven RM0.75 in the breakdown', await page.getByText('RM0.7500').isVisible());
await page.screenshot({ path: `${S}/p6-06-utiliti.png`, fullPage: true });
await page.getByRole('button', { name: 'Simpan menu' }).click();
await page.getByRole('link', { name: /Nasi Lemak/ }).waitFor();

await page.reload();
await page.waitForTimeout(1500);
await ctx.setOffline(true);
await page.goto(url + '#/menu');
await page.getByText('Nasi Lemak').first().waitFor();
ok('menus available offline', await page.getByText('Nasi Lemak').first().isVisible());
await page.setViewportSize({ width: 1280, height: 800 });
await page.screenshot({ path: `${S}/p6-07-desktop.png` });
ok('no console errors', errors.length === 0);
if (errors.length) console.log(errors);
await browser.close();
