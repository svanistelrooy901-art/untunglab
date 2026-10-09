// Browser check: guided Kos Operasi, Kos Lain list (free limit 3), workers.
// Usage: PW_ROOT=$(npm root -g) APP_URL=http://localhost:4181/ node scripts/e2e-bc.mjs <screenshot-dir>
import { createRequire } from 'node:module';
const require = createRequire(process.env.PW_ROOT + '/');
const { chromium } = require('playwright');
const S = process.argv[2] ?? '.';
const url = process.env.APP_URL ?? 'http://localhost:4173/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ms-MY' });
await ctx.addInitScript(() => localStorage.setItem('ul-app-lang', 'ms'));
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
const ok = (name, cond) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`); if (!cond) process.exitCode = 1; };
const save = () => page.getByRole('button', { name: 'Simpan' }).last().click();
const box = (name) => page.getByRole('textbox', { name, exact: true });

await page.goto(url + '#/kos-operasi');
await page.getByText('Ringkasan').waitFor();

// Guided: Gas 80 x 10% = 8
await page.getByRole('button', { name: /^Gas/ }).click();
await box('Bil sebulan (RM)').fill('80');
await page.getByRole('button', { name: '10%', exact: true }).click();
ok('guided result RM8', await page.getByText('RM8.00 sebulan').isVisible());
ok('chips 3 and 20 exist', (await page.getByRole('button', { name: '3%', exact: true }).count()) === 1 && (await page.getByRole('button', { name: '20%', exact: true }).count()) === 1);
await page.screenshot({ path: `${S}/bc-01-panduan.png` });
await save();
await page.getByText('RM80.00 × 10%').waitFor();
ok('row shows bill × %', true);

// Elektrik: warning about equipment and tariff chips
await page.getByRole('button', { name: /^Elektrik/ }).click();
ok('electricity note: general only', await page.getByText(/elektrik am sahaja/).isVisible());
await page.getByRole('button', { name: 'RM0.35', exact: true }).click();
ok('tariff chip fills the field', (await box('Kadar elektrik (RM sekilowatt jam)').inputValue()) === '0.35');
await page.getByRole('button', { name: 'Simpan kadar' }).click();
await page.getByText('Kadar semasa: RM0.35 / kWh').waitFor();
await box('Bil sebulan (RM)').fill('200');
await page.getByRole('button', { name: '5%', exact: true }).click();
await page.screenshot({ path: `${S}/bc-02-elektrik.png` });
await save();

// Kos Lain: free limit of 3
await page.getByRole('button', { name: /^Kos Lain/ }).click();
for (const [label, amt] of [['Penghantaran', '150'], ['Iklan', '50'], ['Pengangkutan', '30']]) {
  await page.getByRole('button', { name: '+ Tambah kos lain' }).click();
  await page.getByRole('button', { name: label, exact: true }).click();
  await box('Jumlah sebulan (RM)').fill(amt);
  await page.getByRole('button', { name: 'Tambah kos lain', exact: true }).click();
}
ok('three items listed with total RM230', await page.getByText('RM230.00 sebulan').isVisible());
ok('fourth blocked with upgrade link', (await page.getByRole('button', { name: '+ Tambah kos lain' }).count()) === 0 && (await page.getByTestId('limit-note').isVisible()));
await page.screenshot({ path: `${S}/bc-03-kos-lain.png` });
await save();
await page.getByText('3 kos lain bulanan').waitFor();
ok('Kos Lain row saved', true);

// Workers
await page.getByTestId('kad-pekerja').getByRole('radio', { name: 'Ada pekerja' }).click();
await page.getByRole('button', { name: '+ Tambah pekerja' }).click();
await box('Nama').fill('Siti');
await box('Gaji sebulan (RM)').fill('2080');
await page.getByRole('button', { name: '26', exact: true }).click();
await page.getByRole('button', { name: 'Simpan pekerja' }).click();
await page.getByText('RM10.00 / sejam').first().waitFor();
ok('one worker: RM10 an hour', true);
await page.getByRole('button', { name: '+ Tambah pekerja' }).click();
await box('Nama').fill('Adik');
await box('Gaji sebulan (RM)').fill('800');
await box('Hari sebulan').fill('10');
await box('Jam sehari').fill('4');
await page.getByRole('button', { name: 'Simpan pekerja' }).click();
// total pay 2880 / (208 + 40) hours = 11.6129
await page.getByText('RM11.61 / sejam').waitFor();
ok('team rate weighted: RM11.61', true);
ok('Nilai Masa field hidden in team mode', (await box('Nilai Masa (RM sejam)').count()) === 0);
await page.screenshot({ path: `${S}/bc-04-pekerja.png`, fullPage: true });
await page.getByTestId('kad-pekerja').getByRole('radio', { name: 'Kerja sendiri' }).click();
await box('Nilai Masa (RM sejam)').waitFor();
await page.getByTestId('kad-pekerja').getByRole('radio', { name: 'Ada pekerja' }).click();
await page.getByText('RM11.61 / sejam').waitFor();
ok('switching back and forth keeps workers', true);

// Mula step reflects the team rate
await page.goto(url);
await page.getByText(/[1-9] \/ 7 siap/).waitFor({ timeout: 4000 }).catch(() => {});
ok('Mula step 1 done with a team rate', await page.getByText(/[1-9] \/ 7 siap/).isVisible());

ok('no console errors', errors.length === 0);
if (errors.length) console.log(errors);
await browser.close();
