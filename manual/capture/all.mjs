// Captures every manual screen in one run, in the language given by LANG_CODE (ms or en).
//   npx vite build --outDir dist-e2e ... (scripts/e2e-build.sh), serve dist-e2e on :4181, then
//   LANG_CODE=ms npx tsx manual/capture/all.mjs   and   LANG_CODE=en npx tsx manual/capture/all.mjs
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { LANG, S, url, ctx, page, box, saveSheet, top, snap, scrollToText, dialogScroll, activatePro } from './cap.mjs';
const require = createRequire('/home/claude/.npm-global/lib/node_modules/');
const { chromium } = require('playwright');
const { unzipSync, zipSync, strFromU8, strToU8 } = require('/home/claude/untunglab/node_modules/fflate');
const en = LANG === 'en';
// Names typed into the app follow the manual's language; the engine does the rest.
const N = en
  ? { butter: 'Butter', choc: 'Cooking chocolate', egg: 'Eggs', flour: 'Flour', sugar: 'Sugar', walnut: 'Walnut', milk: 'Fresh milk', eggUnit: 'pcs', box: 'Cake box', paper: 'Baking paper', sticker: 'Sticker', bag: 'Plastic bag', cat: 'Cakes', variation: 'Walnut Brownies' }
  : { butter: 'Butter', choc: 'Cooking chocolate', egg: 'Telur', flour: 'Tepung', sugar: 'Gula', walnut: 'Walnut', milk: 'Susu segar', eggUnit: 'biji', box: 'Kotak', paper: 'Kertas baking', sticker: 'Sticker', bag: 'Beg plastik', cat: 'Kek', variation: 'Walnut Brownies' };
const wait = (ms = 400) => page.waitForTimeout(ms);
const close = async () => { await page.getByRole('button', { name: 'Tutup' }).last().click().catch(() => {}); await wait(300); };

// ---- first-open language prompt (a fresh browser that has not chosen a language yet)
{
  const b2 = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const c2 = await b2.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: en ? 'en-MY' : 'ms-MY' });
  const p2 = await c2.newPage();
  await p2.goto(url);
  await p2.waitForTimeout(900);
  await p2.screenshot({ path: `${S}/50-bahasa-popup.png` });
  console.log('snap 50-bahasa-popup');
  await b2.close();
}

// ---- Mula di sini, Lagi, Lesen
await page.goto(url); await wait(800);
await snap('01-mula', [[page.getByText('Mula di sini')], [page.getByText('Nyatakan kerja sendiri atau ada pekerja, dan kos masa anda')]]);
await page.getByRole('link', { name: 'Lagi' }).or(page.getByRole('button', { name: 'Lagi' })).first().click(); await wait();
await snap('02-lagi');
await page.keyboard.press('Escape');
await page.goto(url + '#/lesen'); await wait(500);
await snap('03-lesen-percuma', [[box('Kod lesen')], [page.getByRole('button', { name: 'Aktifkan' })]]);
await activatePro(page, url);
await page.goto(url + '#/lesen'); await wait(500);
await snap('04-lesen-pro');

// ---- Kos Operasi
await page.goto(url + '#/kos-operasi'); await wait(600);
await box('Nilai Masa (RM sejam)').fill('15');
await box('Anggaran Jualan Bulanan (RM)').fill('2400');
await page.getByRole('button', { name: 'Simpan' }).first().click();
await page.getByText('✓ Disimpan').waitFor();
await top();
await snap('05a-kos-operasi-atas', [[page.getByText('Siapa buat kerja?')], [page.getByTestId('kad-pekerja').getByRole('radio', { name: 'Kerja sendiri' })]]);
await scrollToText('Tetapan bisnes', 110);
await snap('05e-tetapan-bisnes', [[page.getByText('Tetapan bisnes')], [box('Nilai Masa (RM sejam)')], [box('Anggaran Jualan Bulanan (RM)')]]);
await top();

// workers: add two, show the team rate, then go back to working alone (the numbers stay stored)
await page.getByTestId('kad-pekerja').getByRole('radio', { name: 'Ada pekerja' }).click(); await wait();
await page.getByRole('button', { name: '+ Tambah pekerja' }).click(); await wait();
await box('Nama').fill(en ? 'Siti' : 'Siti');
await box('Gaji sebulan (RM)').fill('2080');
await page.getByRole('button', { name: '26', exact: true }).click();
await snap('05c-pekerja-borang', [[box('Nama')], [box('Gaji sebulan (RM)')], [page.getByRole('button', { name: '26', exact: true })], [box('Jam sehari')]]);
await page.getByRole('button', { name: 'Simpan pekerja' }).click(); await wait();
await page.getByRole('button', { name: '+ Tambah pekerja' }).click(); await wait();
await box('Nama').fill(en ? 'Adik' : 'Adik'); await box('Gaji sebulan (RM)').fill('800'); await box('Hari sebulan').fill('10'); await box('Jam sehari').fill('4');
await page.getByRole('button', { name: 'Simpan pekerja' }).click(); await wait(500);
await top();
await snap('05d-pekerja-senarai', [[page.getByTestId('kad-pekerja').getByRole('radio', { name: 'Ada pekerja' })], [page.getByText('Senarai pekerja')], [page.getByText('Kadar sejam pasukan')]]);
await page.getByTestId('kad-pekerja').getByRole('radio', { name: 'Kerja sendiri' }).click(); await wait();

await scrollToText('Ringkasan', 110);
await snap('05b-kos-operasi-senarai', [[page.getByText('Kos Operasi Bersama sebulan')], [page.getByText('Kadar Kos Operasi')], [page.getByRole('button', { name: /Ruang Kerja/ })]]);
await page.getByRole('button', { name: /Ruang Kerja/ }).click(); await wait();
await page.getByRole('tab', { name: 'Kira Lebih Tepat' }).click();
await box('Kos rumah atau sewa sebulan (RM)').fill('1500');
await page.getByRole('button', { name: '20%', exact: true }).click();
await page.getByText('RM300.00 sebulan').waitFor();
await snap('06-ruang-kerja', [[page.getByRole('tab', { name: 'Mudah' })], [page.getByRole('tab', { name: 'Kira Lebih Tepat' })], [box('Kos rumah atau sewa sebulan (RM)')], [page.getByRole('button', { name: '20%', exact: true })]]);
await saveSheet();

// Elektrik: bill x % (general electricity only) plus the electricity rate
await page.getByRole('button', { name: /^Elektrik/ }).click(); await wait();
await box('Bil sebulan (RM)').fill('200', { timeout: 5000 }).catch(async (e) => { await page.screenshot({ path: `${S}/DEBUG.png` }); throw e; });
await page.getByRole('button', { name: '5%', exact: true }).click();
await snap('07-elektrik', [[box('Bil sebulan (RM)')], [page.getByRole('button', { name: '5%', exact: true })], [page.getByText('Hasil pengiraan')]]);
await box('Kadar elektrik (RM sekilowatt jam)').fill('0.50');
await dialogScroll();
await wait(300);
await snap('07b-elektrik-kadar', [[box('Kadar elektrik (RM sekilowatt jam)')], [page.getByRole('button', { name: 'RM0.35', exact: true })], [page.getByRole('button', { name: 'Simpan kadar' })]]);
await page.getByRole('button', { name: 'Simpan kadar' }).click();
await page.getByText('Kadar semasa: RM0.5 / kWh').waitFor();
await saveSheet();

// Air, Internet, Gas: same idea
const guided = async (re, bill, pct) => {
  await wait(600);
  await page.getByRole('button', { name: re }).click(); await wait(500);
  await box('Bil sebulan (RM)').fill(bill, { timeout: 5000 }).catch(async (e) => { await page.screenshot({ path: `${S}/DEBUG.png` }); throw e; });
  await page.getByRole('button', { name: `${pct}%`, exact: true }).click();
  await saveSheet(); await wait(300);
};
await guided(en ? /^Water/ : /^Air/, '80', 10);
await guided(/^Internet/, '100', 10);
await guided(/^Gas/, '100', 5);

// Kos Lain: a list of named costs
await page.getByRole('button', { name: /^Kos Lain/ }).click(); await wait(300);
await page.getByRole('button', { name: '+ Tambah kos lain' }).click(); await wait(300);
await page.getByRole('button', { name: 'Penghantaran', exact: true }).click();
await box('Jumlah sebulan (RM)').fill('7');
await snap('07c-kos-lain', [[page.getByRole('button', { name: 'Penghantaran', exact: true })], [box('Jumlah sebulan (RM)')], [page.getByRole('button', { name: 'Tambah kos lain', exact: true })]]);
await page.getByRole('button', { name: 'Tambah kos lain', exact: true }).click(); await wait(300);
await saveSheet(); await wait(400);
await top();
await scrollToText('Ringkasan', 110);
await snap('08-kos-operasi-siap', [[page.getByText('Kadar Kos Operasi')]]);

// ---- Bahan, Pembungkusan, Peralatan
await page.goto(url + '#/bahan');
const addIng = async (n, price, qty, unit, snapName, marks) => {
  await page.getByRole('button', { name: 'Tambah bahan' }).first().click();
  await box('Nama').fill(n); await box('Harga beli (RM)').fill(price); await box('Kuantiti dalam pek').fill(qty);
  await page.getByRole('combobox', { name: 'Unit pek' }).fill(unit);
  if (snapName) await snap(snapName, marks());
  await saveSheet(); await page.getByText(n, { exact: true }).first().waitFor();
};
await addIng(N.butter, '12', '250', 'g', '09-bahan-tambah', () => [[box('Nama')], [box('Harga beli (RM)')], [box('Kuantiti dalam pek')], [page.getByRole('combobox', { name: 'Unit pek' })], [page.getByText('Kos seunit').first()]]);
for (const [n, p, q, u] of [[N.choc, '20', '500', 'g'], [N.egg, '15', '30', N.eggUnit], [N.flour, '4', '1000', 'g'], [N.sugar, '3', '1000', 'g'], [N.walnut, '30', '250', 'g']]) await addIng(n, p, q, u);
await top(); await wait(300);
await snap('10-bahan-senarai', [[page.getByRole('button', { name: 'Tambah bahan' })], [page.getByRole('button', { name: 'Import Excel' })], [page.getByText(N.butter, { exact: true })]]);
// pack mapping
await page.getByRole('button', { name: 'Tambah bahan' }).first().click(); await wait(300);
await box('Nama').fill(N.milk); await box('Harga beli (RM)').fill('15'); await box('Kuantiti dalam pek').fill('30');
await page.getByRole('combobox', { name: 'Unit pek' }).fill(N.eggUnit);
await page.getByText('Mapping pek (pilihan)').first().click(); await wait(400);
await dialogScroll();
await snap('09b-bahan-pemetaan');
await page.getByRole('button', { name: 'Batal' }).last().click(); await wait(300);

await page.goto(url + '#/pembungkusan');
for (const [n, p] of [[N.box, '1.00'], [N.paper, '0.15'], [N.sticker, '0.10'], [N.bag, '0.20']]) {
  await page.getByRole('button', { name: 'Tambah pembungkusan' }).first().click();
  await box('Nama').fill(n); await box('Harga beli (RM)').fill(p); await box('Bilangan dalam satu beli').fill('1');
  if (n === N.box) await snap('11-pembungkusan-tambah', [[box('Nama')], [box('Harga beli (RM)')], [box('Bilangan dalam satu beli')], [page.getByText('Kos seunit').first()]]);
  await saveSheet(); await page.getByText(n, { exact: true }).first().waitFor();
}
await top(); await snap('12-pembungkusan-senarai', [[page.getByRole('button', { name: 'Tambah pembungkusan' })]]);

await page.goto(url + '#/peralatan');
await page.getByRole('button', { name: 'Tambah peralatan' }).first().click(); await wait(300);
await snap('13-peralatan-pilih', [[page.locator('dialog[open] input').first()], [page.getByRole('button', { name: /Oven/ }).first()], [page.getByRole('button', { name: /Peralatan sendiri/ })]]);
await page.getByRole('button', { name: /Oven/ }).first().click(); await wait(300);
await snap('14-peralatan-watt', [[box('Watt (W)')]]);
await saveSheet(); await top(); await wait(300);
await snap('15-peralatan-senarai');

// ---- Menu
await page.goto(url + '#/menu/baru'); await wait(500);
await box('Nama menu').fill('Standard Brownies');
await page.getByRole('combobox', { name: 'Kategori (pilihan)' }).fill(N.cat);
await box('Hasil setiap batch (bilangan jualan)').fill('20');
await box('Masa penyediaan setiap batch (minit)').fill('120');
await box('Harga Jual seunit (RM)').fill('6');
await snap('20-menu-asas', [[box('Nama menu')], [page.getByRole('combobox', { name: 'Kategori (pilihan)' })], [box('Hasil setiap batch (bilangan jualan)')], [box('Masa penyediaan setiap batch (minit)')], [box('Harga Jual seunit (RM)')]]);
const usage = [[N.butter, '150'], [N.choc, '200'], [N.egg, '4'], [N.flour, '120'], [N.sugar, '180']];
for (let i = 0; i < 5; i++) {
  await page.getByRole('button', { name: '+ Tambah bahan' }).click();
  await page.locator(`#ing-${i}`).selectOption({ label: usage[i][0] });
  await page.getByRole('textbox', { name: 'Kuantiti guna' }).nth(i).fill(usage[i][1]);
}
await scrollToText('Bahan', 120);
await snap('21-menu-bahan', [[page.locator('#ing-0')], [page.getByRole('textbox', { name: 'Kuantiti guna' }).first()], [page.getByRole('button', { name: '+ Tambah bahan' })]]);
for (let i = 0; i < 4; i++) {
  await page.getByRole('button', { name: '+ Tambah pembungkusan' }).click();
  await page.locator(`#pack-${i}`).selectOption({ index: i + 1 });
}
await scrollToText('Pembungkusan', 120);
await snap('22-menu-pembungkusan', [[page.locator('#pack-0')], [page.getByRole('button', { name: '+ Tambah pembungkusan' })]]);
await page.getByRole('button', { name: '+ Tambah peralatan' }).click();
await page.locator('#eq-0').selectOption({ index: 1 });
await box('Masa guna (minit)').fill('45');
await scrollToText('Peralatan', 120);
await snap('23-menu-peralatan', [[page.locator('#eq-0')], [box('Masa guna (minit)')]]);
await page.getByRole('button', { name: 'Simpan menu' }).click();
await page.getByRole('link', { name: /Standard Brownies/ }).waitFor(); await wait();
await snap('24-menu-senarai', [[page.getByRole('button', { name: new RegExp(N.cat) })], [page.getByRole('link', { name: /Standard Brownies/ })], [page.getByRole('link', { name: /Tambah menu/ }).or(page.getByRole('button', { name: /Tambah menu/ }))]]);
await page.getByRole('link', { name: /Standard Brownies/ }).click(); await wait(600);
await snap('25-menu-ringkasan');
await scrollToText('Hasil pengiraan', 100);
await snap('26-menu-hasil', [[page.getByText('Kos Sebenar').first()], [page.getByText('Anggaran Untung').first()]]);
await scrollToText('Pecahan kos seunit', 100);
await snap('27-menu-pecahan');
await scrollToText('Cadangan Harga', 100);
await page.getByRole('button', { name: '30%', exact: true }).click().catch(() => {});
await snap('28-cadangan', [[page.getByRole('button', { name: '30%', exact: true })], [page.getByText('Guna harga ini').first()]]);
console.log((await page.evaluate(() => document.body.innerText)).slice(0, 600));

// ---- Dashboard, Kesan Harga, Jejak Harga, Laporan, Sandaran
await page.goto(url + '#/'); await wait(800);
await snap('30-dashboard', [[page.getByText('Purata margin semua menu')]]);
await page.evaluate(() => window.scrollTo(0, 420)); await wait(200);
await snap('31-dashboard-bawah');
await page.goto(url + '#/kesan-harga'); await wait(600);
await page.locator('select').first().selectOption({ label: N.butter }); await wait(300);
await snap('33-kesan-pilih', [[page.locator('select').first()], [page.getByRole('button', { name: '+10%', exact: true })]]);
await page.getByRole('button', { name: '+20%', exact: true }).click(); await wait(500);
await scrollToText('Kesan pada kos', 110);
await snap('34-kesan-hasil', [[page.getByText('Kesan pada kos')], [page.getByText('Sebelum').first()], [page.getByRole('button', { name: 'Guna harga ini' })]]);
await page.getByRole('button', { name: 'Guna harga ini' }).click(); await wait(400);
await snap('35-kesan-sahkan', [[page.getByRole('button', { name: 'Ya, guna harga ini' })]]);
await page.getByRole('button', { name: 'Ya, guna harga ini' }).click(); await wait(600);
await snap('36-kesan-berjaya');
await page.goto(url + '#/jejak-harga'); await wait(600);
await snap('37-jejak-senarai');
await page.getByText(N.butter).first().click(); await wait(600);
await snap('38-jejak-butiran');
await scrollToText('Trend kos seunit', 100);
await snap('39-jejak-trend');
await page.goto(url + '#/laporan'); await wait(600);
await snap('40-laporan', [[page.getByRole('button', { name: /Eksport CSV/ })]]);
await page.goto(url + '#/sandaran'); await wait(600);
await snap('41-sandaran', [[page.getByRole('button', { name: /backup/i })]]);
await scrollToText('Pulihkan daripada backup', 110);
await snap('42-sandaran-pulih', [[page.getByText('Pilih fail backup').first()]]);
await page.goto(url + '#/'); await wait(700);
await snap('43-dashboard-amaran');

// ---- Tetapan (bahasa) and the in-app Manual
await page.goto(url + '#/tetapan'); await wait(500);
await snap('51-tetapan', [[page.getByText('Bahasa', { exact: true })], [page.getByRole('radio', { name: en ? 'English' : 'Bahasa Melayu' })]]);
await page.goto(url + '#/manual'); await wait(600);
await snap('52-manual');

// ---- Variation (full version) and category list
await page.goto(url + '#/menu'); await wait(500);
await page.getByRole('link', { name: /Standard Brownies/ }).click(); await wait(600);
await scrollToText('Variasi menu ini', 110);
await snap('29a-variasi-tambah', [[page.getByTestId('variasi-bahagian').getByRole('link', { name: /Tambah variasi/ })]]);
await page.getByRole('link', { name: '+ Tambah variasi' }).click(); await wait(600);
await box('Nama menu').fill(N.variation);
await box('Harga Jual seunit (RM)').fill('7.50');
await page.getByRole('button', { name: '+ Tambah bahan' }).click();
await page.locator('#ing-0').selectOption({ label: N.walnut });
await box('Kuantiti guna').fill('30');
await top();
await snap('29b-variasi-borang', [[page.getByTestId('variasi-nota')], [page.getByTestId('variasi-asas')], [box('Harga Jual seunit (RM)')]]);
await page.getByRole('button', { name: 'Simpan menu' }).click();
await page.getByRole('link', { name: /↳/ }).waitFor(); await wait();
await snap('29c-menu-variasi-senarai', [[page.getByRole('button', { name: new RegExp(N.cat) })], [page.getByRole('link', { name: /↳/ })]]);

// ---- Import Excel (preview only: nothing is confirmed)
await page.goto(url + '#/bahan'); await wait(500);
await page.getByRole('button', { name: 'Import Excel' }).click(); await wait(400);
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Muat turun templat' }).click()]);
await dl.saveAs(`${S}/template.xlsx`);
const files = unzipSync(new Uint8Array(readFileSync(`${S}/template.xlsx`)));
let sheet = strFromU8(files['xl/worksheets/sheet1.xml']);
const rowOf = (name) => Number(new RegExp(`<c r="A(\\d+)"[^>]*><is><t[^>]*>${name}</t>`).exec(sheet)[1]);
const fill = (name, price, qty) => { const r = rowOf(name); sheet = sheet.replace(new RegExp(`(<c r="D${r}")`), `<c r="B${r}"><v>${price}</v></c><c r="C${r}"><v>${qty}</v></c>$1`); };
const firstRows = en ? ['Plain flour', 'Sugar', 'Eggs', 'Salt'] : ['Tepung gandum', 'Gula', 'Telur', 'Garam'];
fill(firstRows[0], 4.5, 1);
fill(firstRows[1], 3.5, 1);
fill(firstRows[2], 16, 30);
{ const r = rowOf(firstRows[3]); sheet = sheet.replace(new RegExp(`(<c r="D${r}")`), `<c r="B${r}" t="inlineStr"><is><t>abc</t></is></c><c r="C${r}"><v>1</v></c>$1`); }
files['xl/worksheets/sheet1.xml'] = strToU8(sheet);
writeFileSync(`${S}/filled.xlsx`, zipSync(files));
await page.locator('input[type=file]').setInputFiles(`${S}/filled.xlsx`);
await page.getByTestId('import-pratonton').waitFor(); await wait(300);
await dialogScroll(0);
await snap('09c-bahan-import', [[page.getByRole('button', { name: 'Muat turun templat' })], [page.locator('dialog[open] label').first()], [page.getByTestId('import-pratonton')], [page.getByTestId('import-masalah')]]);
await page.getByRole('button', { name: 'Tutup' }).last().click().catch(() => {});
console.log('done', LANG);
await ctx.close();
