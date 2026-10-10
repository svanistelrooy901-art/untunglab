// Captures real app screens for the UntungLab explainer (SiniSlot-style). Serve dist-e2e on :4181 first.
// Writes PNGs + boxes.json (highlight rectangles in CSS px of a 390x844 viewport) + numbers.txt into $OUT.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { activatePro } from '../../scripts/e2e-license.mjs';
import { fillRemainingOperating } from '../../scripts/e2e-ops.mjs';
const require = createRequire('/home/claude/.npm-global/lib/node_modules/');
const { chromium } = require('playwright');
const OUT = process.env.OUT ?? '/tmp/explainer-shots';
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const url = 'http://localhost:4181/';
const ctx = await chromium.launchPersistentContext(`${OUT}/../explainer-profile`, { executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'ms-MY' });
await ctx.addInitScript(() => { localStorage.setItem('ul-app-lang', 'ms'); localStorage.setItem('untunglab.lastBackupAt', new Date().toISOString()); });
const page = ctx.pages()[0] ?? (await ctx.newPage());
page.on('pageerror', (e) => console.log('PAGEERR', String(e)));
const box = (n) => page.getByRole('textbox', { name: n, exact: true });
const saveSheet = () => page.getByRole('button', { name: 'Simpan' }).last().click();
const wait = (ms = 400) => page.waitForTimeout(ms);
const scrollTo = async (text, y = 120) => { await page.evaluate(([t, y]) => { const e = [...document.querySelectorAll('h1,h2,h3,summary,span,div,p,button,label')].find((e) => e.textContent.trim() === t || (e.children.length === 0 && e.textContent.trim().startsWith(t))); if (e) window.scrollBy(0, e.getBoundingClientRect().top - y); }, [text, y]); await wait(200); };
const boxes = {};
const snap = async (name, marks = {}) => {
  await wait(300);
  boxes[name] = {};
  for (const [k, loc] of Object.entries(marks)) { const b = await loc.first().boundingBox().catch(() => null); if (b) boxes[name][k] = b; else console.log('MISSING', name, k); }
  await page.screenshot({ path: `${OUT}/${name}.png` }); console.log('snap', name);
};

await page.goto(url); await wait(800);
await activatePro(page, url);

// Kos Operasi
await page.goto(url + '#/kos-operasi'); await wait(600);
await box('Nilai Masa (RM sejam)').fill('15');
await box('Anggaran Jualan Bulanan (RM)').fill('2400');
await page.getByRole('button', { name: 'Simpan' }).first().click();
await page.getByText('✓ Disimpan').waitFor();
await page.getByRole('button', { name: /Ruang Kerja/ }).click(); await wait();
await page.getByRole('tab', { name: 'Kira Lebih Tepat' }).click();
await box('Kos rumah atau sewa sebulan (RM)').fill('1500');
await page.getByRole('button', { name: '20%', exact: true }).click();
await page.getByText('RM300.00 sebulan').waitFor();
await saveSheet(); await wait(600);
await page.getByRole('button', { name: /^Elektrik/ }).click(); await wait();
await box('Bil sebulan (RM)').fill('100');
await page.getByRole('button', { name: '5%', exact: true }).click();
await box('Kadar elektrik (RM sekilowatt jam)').fill('0.50');
await page.getByRole('button', { name: 'Simpan kadar' }).click();
await page.getByText('Kadar semasa: RM0.5 / kWh').waitFor();
await saveSheet(); await wait(600);
await fillRemainingOperating(page, url);

// Bahan
await page.goto(url + '#/bahan');
const addIng = async (n, price, qty, unit, shot) => {
  await page.getByRole('button', { name: 'Tambah bahan' }).first().click();
  await box('Nama').fill(n); await box('Harga beli (RM)').fill(price); await box('Kuantiti dalam pek').fill(qty);
  await page.getByRole('combobox', { name: 'Unit pek' }).fill(unit);
  if (shot) await snap(shot, { harga: box('Harga beli (RM)'), qty: box('Kuantiti dalam pek'), kos: page.getByText('Kos seunit').first() });
  await saveSheet(); await page.getByText(n, { exact: true }).first().waitFor();
};
await addIng('Butter', '12', '250', 'g', 'b1-bahan-tambah');
for (const [n, p, q, u] of [['Cooking chocolate', '20', '500', 'g'], ['Telur', '15', '30', 'biji'], ['Tepung', '4', '1000', 'g'], ['Gula', '3', '1000', 'g'], ['Ayam', '12.50', '1000', 'g'], ['Beras', '3.20', '1000', 'g'], ['Santan', '2.80', '200', 'ml']]) await addIng(n, p, q, u);
await page.goto(url + '#/pembungkusan');
for (const [n, p] of [['Kotak', '1.00'], ['Kertas baking', '0.15'], ['Sticker', '0.10'], ['Beg plastik', '0.20']]) {
  await page.getByRole('button', { name: 'Tambah pembungkusan' }).first().click();
  await box('Nama').fill(n); await box('Harga beli (RM)').fill(p); await box('Bilangan dalam satu beli').fill('1');
  await saveSheet(); await page.getByText(n, { exact: true }).first().waitFor();
}
await page.goto(url + '#/peralatan');
await page.getByRole('button', { name: 'Tambah peralatan' }).first().click(); await wait(300);
await page.getByRole('button', { name: /Oven/ }).first().click(); await wait(300);
await saveSheet(); await wait(400);

// Menu: Brownies
const menu = async (name, yieldN, mins, price, ings, packs, oven) => {
  await page.goto(url + '#/menu/baru'); await wait(500);
  await box('Nama menu').fill(name);
  await box('Hasil setiap batch (bilangan jualan)').fill(yieldN);
  await box('Masa penyediaan setiap batch (minit)').fill(mins);
  await box('Harga Jual seunit (RM)').fill(price);
  for (let i = 0; i < ings.length; i++) {
    await page.getByRole('button', { name: '+ Tambah bahan' }).click();
    await page.locator(`#ing-${i}`).selectOption({ label: ings[i][0] });
    await page.getByRole('textbox', { name: 'Kuantiti guna' }).nth(i).fill(ings[i][1]);
  }
  for (let i = 0; i < packs.length; i++) {
    await page.getByRole('button', { name: '+ Tambah pembungkusan' }).click();
    await page.locator(`#pack-${i}`).selectOption({ label: packs[i] });
  }
  if (oven) { await page.getByRole('button', { name: '+ Tambah peralatan' }).click(); await page.locator('#eq-0').selectOption({ index: 1 }); await box('Masa guna (minit)').fill(oven); }
};
await menu('Brownies', '20', '120', '6', [['Butter', '150'], ['Cooking chocolate', '200'], ['Telur', '4'], ['Tepung', '120'], ['Gula', '180']], ['Kotak', 'Kertas baking', 'Sticker', 'Beg plastik'], '45');
await page.locator('#ing-0').evaluate((e) => window.scrollBy(0, e.getBoundingClientRect().top - 260)); await wait(200);
await snap('m1-menu-bahan', { ing0: page.locator('#ing-0'), qty0: page.getByRole('textbox', { name: 'Kuantiti guna' }).first() });
await page.getByRole('button', { name: 'Simpan menu' }).click();
await page.getByRole('link', { name: /Brownies/ }).waitFor(); await wait();
await menu('Nasi Lemak Ayam', '10', '60', '6', [['Ayam', '1500'], ['Beras', '1500'], ['Santan', '400']], ['Kotak'], null);
await page.getByRole('button', { name: 'Simpan menu' }).click(); await wait(800);
await menu('Nasi Ayam Madu', '10', '60', '9', [['Ayam', '1500'], ['Beras', '1500']], ['Kotak'], null);
await page.getByRole('button', { name: 'Simpan menu' }).click(); await wait(800);

await page.goto(url + '#/menu'); await wait(500);
await page.getByRole('link', { name: /^Brownies/ }).first().click(); await wait(700);
await scrollTo('Hasil pengiraan', 190);
await snap('m2-hasil', { kos: page.getByText('Kos Sebenar').first(), untung: page.getByText('Anggaran Untung').first() });
await scrollTo('Pecahan kos seunit', 190);
await snap('m3-pecahan', { title: page.getByText('Pecahan kos seunit').first() });
fs.writeFileSync(`${OUT}/brownies.txt`, await page.evaluate(() => document.body.innerText));
await scrollTo('Cadangan Harga', 190);
await page.getByRole('button', { name: '30%', exact: true }).click().catch(() => {});
await wait(300);
await snap('m4-cadangan', { chip: page.getByRole('button', { name: '30%', exact: true }), harga: page.getByTestId('cad-harga'), guna: page.getByText('Guna harga ini').first() });

// Ayam price up -> history
await page.goto(url + '#/bahan'); await wait(500);
await page.getByText('Ayam', { exact: true }).first().click(); await wait(400);
await box('Harga beli (RM)').fill('14.30');
await saveSheet(); await wait(700);

await page.goto(url + '#/'); await wait(900);
await snap('d1-dashboard', { rugi: page.getByText(/sedang rugi/).first(), naik: page.getByText(/Harga Ayam naik/).first() });
fs.writeFileSync(`${OUT}/dashboard.txt`, await page.evaluate(() => document.body.innerText));
await page.getByText(/sedang rugi/).first().scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, -140)); await wait(300);
await snap('d2-dashboard-alerts', { rugi: page.getByText(/sedang rugi/).first(), naik: page.getByText(/Harga Ayam naik/).first() });
await page.getByRole('link', { name: /Lihat kesan harga/ }).first().click(); await wait(900);
await snap('k1-kesan', {});
fs.writeFileSync(`${OUT}/kesan.txt`, await page.evaluate(() => document.body.innerText));
await page.evaluate(() => window.scrollTo(0, 380)); await wait(300);
await snap('k2-kesan-bawah', {});
fs.writeFileSync(`${OUT}/boxes.json`, JSON.stringify(boxes, null, 1));
await ctx.close();
