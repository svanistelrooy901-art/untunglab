// Browser check for Phase 5 (Kos Operasi, onboarding checklist, tooltips).
// Usage: PW_ROOT=$(npm root -g) APP_URL=http://localhost:4173/ node scripts/e2e-phase5.mjs <screenshot-dir>
import { createRequire } from 'node:module';
import { activatePro } from './e2e-license.mjs';
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
const save = () => page.getByRole('button', { name: 'Simpan' }).last().click();

await activatePro(page, url);
await page.goto(url);
await page.getByText('0 / 7 siap').waitFor();
await page.screenshot({ path: `${S}/p5-01-mula.png` });

await page.goto(url + '#/kos-operasi');
await page.getByText('Ringkasan').waitFor();
ok('missing sales explains what to enter', await page.getByText(/Isi Anggaran Jualan Bulanan di atas/).isVisible());
await page.screenshot({ path: `${S}/p5-02-tiada-jualan.png` });

await page.getByRole('button', { name: /Maklumat: Nilai Masa/ }).click();
ok('tooltip shows on tap', await page.getByText(/RM20\/jam × 30 minit = RM10 kos masa/).isVisible());
await page.getByRole('button', { name: /Maklumat: Nilai Masa/ }).click();

await page.getByRole('textbox', { name: 'Nilai Masa (RM sejam)', exact: true }).fill('20');
await page.getByRole('textbox', { name: 'Anggaran Jualan Bulanan (RM)', exact: true }).fill('6000');
await page.getByRole('button', { name: 'Simpan' }).first().click();
await page.getByText('✓ Disimpan').waitFor();

// Ruang Kerja: Lebih Tepat 2000 x 15%
await page.getByRole('button', { name: /Ruang Kerja/ }).click();
await page.getByRole('tab', { name: 'Kira Lebih Tepat' }).click();
await page.getByRole('textbox', { name: 'Kos rumah atau sewa sebulan (RM)', exact: true }).fill('2000');
await page.getByRole('button', { name: '15%', exact: true }).click();
ok('workspace result RM300', await page.getByText('RM300.00 sebulan').isVisible());
await page.screenshot({ path: `${S}/p5-03-ruang-kerja.png` });
await save();

// Air: 100 x 30%
await page.getByRole('button', { name: /^Air/ }).click();
await page.getByRole('tab', { name: 'Kira Lebih Tepat' }).click();
await page.getByRole('textbox', { name: 'Purata bil air sebulan (RM)', exact: true }).fill('100');
await page.getByRole('textbox', { name: '% air untuk bisnes', exact: true }).fill('30');
ok('water result RM30', await page.getByText('RM30.00 sebulan').isVisible());
await save();

// Gas: Mudah 270
await page.getByRole('button', { name: /^Gas/ }).click();
await page.getByRole('textbox', { name: 'Jumlah sebulan (RM)', exact: true }).fill('270');
await save();

await page.getByText('RM600.00').first().waitFor();
ok('C07 shared total RM600', await page.getByText('RM600.00').first().isVisible());
ok('C07 rate 10.0%', await page.getByText('10.0%').first().isVisible());
await page.screenshot({ path: `${S}/p5-04-ringkasan.png`, fullPage: true });

// Switch Ruang Kerja to Mudah 400: advanced data must survive
await page.getByRole('button', { name: /Ruang Kerja/ }).click();
await page.getByRole('tab', { name: 'Mudah' }).click();
await page.getByRole('textbox', { name: 'Jumlah sebulan (RM)', exact: true }).fill('400');
await save();
await page.getByRole('button', { name: /Ruang Kerja/ }).click();
await page.getByRole('tab', { name: 'Kira Lebih Tepat' }).click();
ok('Lebih Tepat data kept after Mudah', (await page.getByRole('textbox', { name: 'Kos rumah atau sewa sebulan (RM)', exact: true }).inputValue()) === '2000');
await page.keyboard.press('Escape');

// Elektrik warning + tariff
await page.getByRole('button', { name: /^Elektrik/ }).click();
await page.getByRole('tab', { name: 'Kira Lebih Tepat' }).click();
ok('double-count warning shown', await page.getByText(/dikira dua kali/).isVisible());
await page.getByRole('textbox', { name: 'Kadar elektrik (RM sekilowatt jam)', exact: true }).fill('0.50');
await page.getByRole('button', { name: 'Simpan kadar' }).click();
await page.getByText('Kadar semasa: RM0.5 / kWh').waitFor();
await page.screenshot({ path: `${S}/p5-05-elektrik.png` });
await page.keyboard.press('Escape');

// validation
await page.getByRole('button', { name: /^Internet/ }).click();
await save();
ok('invalid amount message', await page.getByText('Isi jumlah RM sebulan').isVisible());
await page.keyboard.press('Escape');

await page.goto(url);
await page.getByText(/[3-9] \/ 7 siap/).waitFor();
await page.screenshot({ path: `${S}/p5-06-mula-progress.png` });

await page.reload();
await page.getByText(/[3-9] \/ 7 siap/).waitFor();
await page.waitForTimeout(1500);
await ctx.setOffline(true);
await page.goto(url + '#/kos-operasi');
await page.getByText('RM700.00').first().waitFor().catch(() => {});
ok('works offline with saved data', await page.getByText('RM700.00').first().isVisible());
await page.setViewportSize({ width: 1280, height: 800 });
await page.screenshot({ path: `${S}/p5-07-desktop.png`, fullPage: true });
ok('no console errors', errors.length === 0);
if (errors.length) console.log(errors);
await browser.close();
