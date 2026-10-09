// Phase 12: mandatory Kos Operasi, Isi/Sunting affordances, appliances follow Elektrik mode, smaller trend chart.
// E2E_KEYS=/tmp/e2e-keys.json PW_ROOT=$(npm root -g) APP_URL=http://localhost:4181/ node scripts/e2e-phase12.mjs <dir>
import { createRequire } from 'node:module';
import { activatePro } from './e2e-license.mjs';
const require = createRequire(process.env.PW_ROOT + '/');
const { chromium } = require('playwright');
const S = process.argv[2] ?? '.';
const url = process.env.APP_URL ?? 'http://localhost:4181/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ms-MY' });
await ctx.addInitScript(() => localStorage.setItem('ul-app-lang', 'ms')); // skip the first-open language prompt
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
const ok = (name, cond, detail) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail !== undefined ? '  ' + JSON.stringify(detail) : ''}`); if (!cond) process.exitCode = 1; };
const box = (name) => page.getByRole('textbox', { name, exact: true });
const saveSheet = () => page.getByRole('button', { name: 'Simpan' }).last().click();

await activatePro(page, url);

// ---- setup (nothing in Kos Operasi yet) ----
await page.goto(url + '#/bahan');
for (const [n, price] of [['Ayam', '15'], ['Bahan lain', '50.4']]) {
  await page.getByRole('button', { name: 'Tambah bahan' }).first().click();
  await box('Nama').fill(n);
  await box('Harga beli (RM)').fill(price);
  await box('Kuantiti dalam pek').fill('1');
  await page.getByRole('combobox', { name: 'Unit pek' }).fill('kg');
  await saveSheet();
  await page.getByText(n, { exact: true }).first().waitFor();
}
// price change so Jejak Harga has a trend
await page.getByText('Ayam', { exact: true }).first().click();
await box('Harga beli (RM)').fill('18');
await saveSheet();
await page.getByText('RM18.00 / 1 kg').waitFor();
await page.goto(url + '#/peralatan');
await page.getByRole('button', { name: 'Tambah peralatan' }).first().click();
await page.getByRole('button', { name: /Oven/ }).click();
await saveSheet();
await page.goto(url + '#/menu/baru');
await box('Nama menu').fill('Roti');
await box('Hasil setiap batch (bilangan jualan)').fill('10');
await box('Harga Jual seunit (RM)').fill('12');
await page.getByRole('button', { name: '+ Tambah bahan' }).click();
await page.locator('#ing-0').selectOption({ label: 'Ayam' });
await box('Kuantiti guna').fill('500');
ok('builder: no Peralatan section while Elektrik is not filled', (await page.getByRole('button', { name: '+ Tambah peralatan' }).count()) === 0);
ok('builder: pointer to Kos Operasi shown', await page.getByTestId('peralatan-tersembunyi').isVisible());
await page.getByRole('button', { name: 'Simpan menu' }).click();
await page.getByRole('link', { name: /Roti/ }).waitFor();

// ---- Kos Operasi affordances ----
await page.goto(url + '#/kos-operasi');
await page.getByTestId('ops-kemajuan').waitFor();
ok('intro tells the user to tap rows and that all 6 are required', await page.getByText(/Tekan setiap baris.*Semua 6 baris wajib/).isVisible());
ok('progress starts at 0 / 6', await page.getByTestId('ops-kemajuan').getByText('0 / 6 kategori diisi').isVisible());
ok('every blank row has a visible "+ Isi" button', (await page.getByText('+ Isi', { exact: true }).count()) === 6);
ok('blank rows say they are mandatory', (await page.getByText('Belum diisi (wajib)').count()) === 6);
await page.screenshot({ path: `${S}/p12-01-kos-operasi-kosong.png`, fullPage: true });

// the menu is incomplete and names what is missing
await page.goto(url + '#/menu');
await page.getByText(/Kos Operasi belum lengkap/).first().waitFor().catch(() => {});
await page.getByRole('link', { name: /Roti/ }).click();
await page.getByText(/Belum diisi: Ruang Kerja, Elektrik, Air, Internet \/ Telefon, Gas, Kos Lain/).first().waitFor();
ok('menu names the six missing categories', true);

// fill with real values and with "Tiada kos ini"
await page.goto(url + '#/kos-operasi');
await box('Nilai Masa (RM sejam)').fill('25');
await box('Anggaran Jualan Bulanan (RM)').fill('3000');
await page.getByRole('button', { name: 'Simpan' }).first().click();
await page.getByText('✓ Disimpan').waitFor();
await page.getByRole('button', { name: /^Gas/ }).click();
await page.getByRole('radio', { name: 'Jumlah terus' }).click({ timeout: 1200 }).catch(() => {});
await box('Jumlah sebulan (RM)').fill('600');
await saveSheet();
await page.getByTestId('ops-kemajuan').getByText('1 / 6 kategori diisi').waitFor();
ok('progress follows: 1 / 6', true);
ok('a filled row shows "Sunting"', await page.getByText('Sunting', { exact: true }).first().isVisible());
await page.getByRole('button', { name: /^Air/ }).click();
await page.getByRole('button', { name: 'Tiada kos ini (RM0)' }).click();
await page.getByTestId('ops-kemajuan').getByText('2 / 6 kategori diisi').waitFor();
ok('"Tiada kos ini" saves RM0 and counts as filled', true);
for (const name of [/^Ruang Kerja/, /^Internet/, /^Kos Lain/]) {
  await page.getByRole('button', { name }).click();
  await page.getByRole('button', { name: 'Tiada kos ini (RM0)' }).click();
  await page.getByRole('button', { name: 'Tiada kos ini (RM0)' }).waitFor({ state: 'detached' });
}
// Elektrik in Mudah with a real monthly bill
await page.getByRole('button', { name: /^Elektrik/ }).click();
await page.getByRole('radio', { name: 'Jumlah terus' }).click({ timeout: 1200 }).catch(() => {});
await box('Jumlah sebulan (RM)').fill('150');
await saveSheet();
await page.getByTestId('ops-kemajuan').getByText('Semua kategori telah diisi.').waitFor();
ok('all six filled: progress turns into a done message', true);
await page.screenshot({ path: `${S}/p12-02-kos-operasi-penuh.png`, fullPage: true });

// ---- Elektrik Mudah: no tariff needed, builder hides Peralatan ----
await page.goto(url + '#/menu');
await page.getByRole('link', { name: /Roti/ }).click();
await page.getByText('Hasil pengiraan').waitFor();
ok('Mudah: menu complete without any electricity tariff', (await page.getByText(/kadar elektrik \(RM\/kWh\)/).count()) === 0 && await page.getByText('Kos Sebenar').first().isVisible());
ok('Mudah: Peralatan section hidden', (await page.getByRole('button', { name: '+ Tambah peralatan' }).count()) === 0);
ok('Mudah with no appliance lines: section is simply gone, no clutter', (await page.getByTestId('peralatan-tersembunyi').count()) === 0);

// ---- Kira Lebih Tepat: section returns, appliances cost money ----
await page.goto(url + '#/kos-operasi');
await page.getByRole('button', { name: /^Elektrik/ }).click();
await box('Kadar elektrik (RM sekilowatt jam)').fill('0.50');
await page.getByRole('button', { name: 'Simpan kadar' }).click();
await page.getByText('Kadar semasa: RM0.5 / kWh').waitFor();
await page.getByRole('radio', { name: 'Kira dari bil' }).click({ timeout: 1200 }).catch(() => {});
await box('Bil sebulan (RM)').fill('150');
await page.getByRole('button', { name: '5%', exact: true }).click();
await saveSheet();
await page.goto(url + '#/menu');
await page.getByRole('link', { name: /Roti/ }).click();
await page.getByRole('button', { name: '+ Tambah peralatan' }).click();
await page.locator('#eq-0').selectOption({ index: 1 });
await box('Masa guna (minit)').fill('45').catch(async () => page.getByRole('textbox', { name: /minit/i }).last().fill('45'));
await page.getByRole('button', { name: 'Simpan menu' }).click();
await page.getByRole('link', { name: /Roti/ }).waitFor();
await page.getByRole('link', { name: /Roti/ }).click();
const costLine = async () => (await page.getByText(/Utiliti Pengeluaran/).first().locator('xpath=..').innerText());
const withOven = await costLine();
ok('Lebih Tepat: oven electricity counted (RM0.075 a portion)', /RM0\.08|RM0\.075/.test(withOven), withOven);

// switch back to Mudah: line kept but no longer counted
await page.goto(url + '#/kos-operasi');
await page.getByRole('button', { name: /^Elektrik/ }).click();
await page.getByRole('radio', { name: 'Jumlah terus' }).click();
await box('Jumlah sebulan (RM)').fill('150');
await saveSheet();
await page.goto(url + '#/menu');
await page.getByRole('link', { name: /Roti/ }).click();
await page.getByText('Hasil pengiraan').waitFor();
const mudahOven = await costLine();
ok('back to Mudah: appliance electricity no longer counted', /RM0\.00/.test(mudahOven), mudahOven);
ok('back to Mudah: note explains why the oven line does not count', await page.getByTestId('peralatan-tersembunyi').getByText(/tidak dikira kerana Elektrik/).isVisible());
ok('back to Mudah: stored oven line not deleted', await (async () => {
  await page.goto(url + '#/kos-operasi');
  await page.getByRole('button', { name: /^Elektrik/ }).click();
  await page.getByRole('radio', { name: 'Kira dari bil' }).click();
  await box('Bil sebulan (RM)').fill('150');
  await page.getByRole('button', { name: '5%', exact: true }).click();
  await page.getByRole('button', { name: 'Simpan' }).last().click();
  await page.goto(url + '#/menu');
  await page.getByRole('link', { name: /Roti/ }).click();
  await page.getByText('Hasil pengiraan').waitFor();
  await page.locator('#eq-0').waitFor({ timeout: 5000 }).catch(() => {});
  return (await page.locator('#eq-0').count()) === 1;
})());

// ---- Jejak Harga chart is smaller ----
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto(url + '#/jejak-harga');
await page.getByTestId('trend').first().waitFor();
const d = await page.getByTestId('trend').first().boundingBox();
ok('desktop chart capped at 320px wide', d.width <= 321, d);
ok('desktop chart height at most 140px', d.height <= 140, d);
await page.screenshot({ path: `${S}/p12-03-jejak-desktop.png` });
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(url + '#/jejak-harga');
await page.getByTestId('trend').first().waitFor();
const m = await page.getByTestId('trend').first().boundingBox();
ok('mobile chart fits the screen and is compact', m.width <= 321 && m.height <= 140, m);
await page.screenshot({ path: `${S}/p12-04-jejak-mobile.png` });

ok('no console errors', errors.length === 0, errors.slice(0, 3));
await browser.close();
