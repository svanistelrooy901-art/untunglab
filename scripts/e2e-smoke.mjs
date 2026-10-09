import { createRequire } from 'node:module';
const require = createRequire(process.env.PW_ROOT + '/');
const { chromium } = require('playwright');
const S = process.argv[2] ?? '.';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(async () => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ms-MY' });
await ctx.addInitScript(() => localStorage.setItem('ul-app-lang', 'ms')); // skip the first-open language prompt
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
const url = process.env.APP_URL ?? 'http://localhost:4173/';
await page.goto(url + '#/bahan');
await page.getByRole('button', { name: 'Tambah bahan' }).first().waitFor();
await page.screenshot({ path: `${S}/01-bahan-kosong.png` });

// add ingredient with invalid data
await page.getByRole('button', { name: 'Tambah bahan' }).first().click();
await page.getByRole('button', { name: 'Simpan' }).click();
await page.screenshot({ path: `${S}/02-bahan-ralat.png` });

await page.getByLabel('Nama').fill('Ayam');
await page.getByLabel('Harga beli (RM)').fill('60');
await page.getByLabel('Kuantiti dalam pek').fill('2');
await page.getByLabel('Unit pek').fill('kg');
console.log('preview:', await page.locator('text=/RM30.00 \\/ kg/').count());
await page.screenshot({ path: `${S}/03-bahan-borang.png` });
await page.getByRole('button', { name: 'Simpan' }).click();
await page.getByText('Ayam').first().waitFor();

// edit: change package size only -> history record
await page.getByText('Ayam').first().click();
await page.getByLabel('Kuantiti dalam pek').fill('1');
await page.getByRole('button', { name: 'Simpan' }).click();
await page.getByText('RM60.00 / kg').first().waitFor();
await page.getByText('Ayam').first().click();
await page.getByText('Sejarah harga').waitFor();
await page.screenshot({ path: `${S}/04-bahan-sejarah.png` });
console.log('history text:', await page.locator('text=/\\+100.0%/').count());
await page.keyboard.press('Escape');

// reload: data persists
await page.reload();
await page.getByText('RM60.00 / kg').first().waitFor();
console.log('persisted after reload: yes');

// pembungkusan
await page.goto(url + '#/pembungkusan');
await page.getByRole('button', { name: 'Tambah pembungkusan' }).first().click();
await page.getByLabel('Nama').fill('Kotak kek');
await page.getByLabel('Harga beli (RM)').fill('1');
await page.getByLabel('Bilangan dalam satu beli').fill('300');
await page.getByRole('button', { name: 'Simpan' }).click();
await page.getByText('RM0.0033 / pcs').waitFor();
await page.screenshot({ path: `${S}/05-pembungkusan.png` });

// peralatan
await page.goto(url + '#/peralatan');
await page.getByRole('button', { name: 'Tambah peralatan' }).first().click();
await page.screenshot({ path: `${S}/06-peralatan-preset.png` });
await page.getByRole('button', { name: /Induction cooker/ }).click();
await page.screenshot({ path: `${S}/07-peralatan-borang.png` });
await page.getByRole('button', { name: 'Simpan' }).click();
await page.getByText('Anggaran UntungLab').first().waitFor();
await page.screenshot({ path: `${S}/08-peralatan-senarai.png` });
await page.getByRole('button', { name: 'Guna nilai ini' }).click();
await page.getByText('Disahkan oleh anda').waitFor();
console.log('equipment confirm ok');

// offline
await page.waitForTimeout(1500);
await ctx.setOffline(true);
await page.reload();
await page.getByRole('heading', { name: 'Peralatan Saya' }).waitFor();
await page.goto(url + '#/bahan');
await page.getByText('RM60.00 / kg').first().waitFor();
console.log('offline reload + data: ok');
await page.setViewportSize({ width: 1280, height: 800 });
await page.screenshot({ path: `${S}/09-desktop-bahan-offline.png` });
console.log('console errors:', JSON.stringify(errors));
await browser.close();
