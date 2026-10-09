// Browser check: menu categories (accordion, free) and variations (full version only).
import { createRequire } from 'node:module';
import { activatePro } from './e2e-license.mjs';
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
const box = (name) => page.getByRole('textbox', { name, exact: true });
const saveSheet = () => page.getByRole('button', { name: 'Simpan' }).last().click();

await page.goto(url + '#/bahan');
for (const [n, price, qty] of [['Tepung', '10', '1'], ['Coklat', '30', '1']]) {
  await page.getByRole('button', { name: 'Tambah bahan' }).first().click();
  await box('Nama').fill(n);
  await box('Harga beli (RM)').fill(price);
  await box('Kuantiti dalam pek').fill(qty);
  await page.getByRole('combobox', { name: 'Unit pek' }).fill('kg');
  await saveSheet();
  await page.getByText(n, { exact: true }).first().waitFor();
}

async function newMenu(name, cat, price) {
  await page.goto(url + '#/menu/baru');
  await box('Nama menu').fill(name);
  if (cat) await page.getByRole('combobox', { name: 'Kategori (pilihan)' }).fill(cat);
  await box('Hasil setiap batch (bilangan jualan)').fill('10');
  await box('Masa penyediaan setiap batch (minit)').fill('30');
  await box('Harga Jual seunit (RM)').fill(price);
  await page.getByRole('button', { name: '+ Tambah bahan' }).click();
  await page.locator('#ing-0').selectOption({ label: 'Tepung' });
  await box('Kuantiti guna').fill('500');
  await page.getByRole('button', { name: 'Simpan menu' }).click();
  await page.getByRole('link', { name: new RegExp(name) }).waitFor();
}
await newMenu('Brownies', 'Kek', '12');
await newMenu('Roti', '', '5');

ok('category accordion appears', await page.getByTestId('menu-kategori').isVisible());
ok('uncategorised group exists', await page.getByRole('button', { name: /Tanpa kategori/ }).isVisible());
await page.getByRole('button', { name: /^Kek/ }).click();
ok('collapsing hides the menu', (await page.getByRole('link', { name: /Brownies/ }).count()) === 0);
await page.getByRole('button', { name: /^Kek/ }).click();
await page.getByRole('link', { name: /Brownies/ }).waitFor();
ok('expanding shows it again', true);

// free: variation is locked
await page.getByRole('link', { name: /Brownies/ }).click();
await page.getByTestId('variasi-bahagian').waitFor();
ok('free sees the full-version note, no add button', (await page.getByRole('link', { name: '+ Tambah variasi' }).count()) === 0 && (await page.getByText(/Variasi menu ada dalam versi penuh/).isVisible()));

// full version
await activatePro(page, url);
await page.goto(url + '#/menu');
await page.getByRole('link', { name: /Brownies/ }).click();
await page.getByRole('link', { name: '+ Tambah variasi' }).click();
await page.getByTestId('variasi-nota').waitFor();
ok('variation form hides yield and time', (await box('Hasil setiap batch (bilangan jualan)').count()) === 0);
ok('base lines listed read-only', await page.getByTestId('variasi-asas').getByText(/Tepung · 500/).isVisible());
await box('Nama menu').fill('Brownies Coklat');
await box('Harga Jual seunit (RM)').fill('15');
await page.getByRole('button', { name: '+ Tambah bahan' }).click();
await page.locator('#ing-0').selectOption({ label: 'Coklat' });
await box('Kuantiti guna').fill('100');
await page.screenshot({ path: `${S}/e-01-variasi.png`, fullPage: true });
await page.getByRole('button', { name: 'Simpan menu' }).click();
await page.getByRole('link', { name: /Brownies Coklat/ }).waitFor();
ok('variation listed under its base', await page.getByRole('link', { name: /↳ Brownies Coklat/ }).isVisible());
await page.screenshot({ path: `${S}/e-02-senarai.png`, fullPage: true });

// live inherit: change the base quantity, variation follows
await page.getByRole('link', { name: /^Brownies\b|^Brownies RM/ }).first().click();
await page.getByTestId('variasi-bahagian').getByText('↳ Brownies Coklat').waitFor();
ok('base shows its variations', true);
await page.getByRole('link', { name: /↳ Brownies Coklat/ }).click();
await page.getByTestId('variasi-asas').getByText(/Tepung · 500/).waitFor();

// delete the base: the variation survives, with the base lines
await page.goto(url + '#/menu');
await page.getByRole('link', { name: /^Brownies RM/ }).click();
await page.getByRole('button', { name: 'Padam menu' }).click();
ok('delete warns that variations stay', await page.getByText(/Variasi tidak terpadam/).isVisible());
await page.getByRole('button', { name: 'Ya, padam' }).click();
await page.getByRole('link', { name: /Brownies Coklat/ }).waitFor();
await page.waitForTimeout(600);
ok('variation survives as its own menu', (await page.getByRole('link', { name: /↳/ }).count()) === 0);
await page.getByRole('link', { name: /Brownies Coklat/ }).click();
await box('Hasil setiap batch (bilangan jualan)').waitFor();
ok('it now has its own yield and both ingredients', (await box('Hasil setiap batch (bilangan jualan)').inputValue()) === '10' && (await page.locator('#ing-1').count()) === 1);

ok('no console errors', errors.length === 0);
if (errors.length) console.log(errors);
await browser.close();
