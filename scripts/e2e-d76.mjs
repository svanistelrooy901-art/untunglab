import { createRequire } from 'node:module';
import { fillRemainingOperating } from '/home/claude/untunglab/scripts/e2e-ops.mjs';
import { activatePro } from '/home/claude/untunglab/scripts/e2e-license.mjs';
const require = createRequire(process.env.PW_ROOT + '/');
const { chromium } = require('playwright');
const S = process.argv[2] ?? 'docs/qa/phase-14';
const url = 'http://localhost:4181/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, locale: 'ms-MY' });
await ctx.addInitScript(() => localStorage.setItem('ul-app-lang', 'ms')); // skip the first-open language prompt
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERR', String(e)));
const box = (n) => page.getByRole('textbox', { name: n, exact: true });
const saveSheet = () => page.getByRole('button', { name: 'Simpan' }).last().click();
let N = 0;
const snap = async (name) => { await page.waitForTimeout(120); await page.screenshot({ path: `${S}/${name}.png` }); console.log('snap', name); };
const place = async (sel, y = 170) => { await page.evaluate(([sel, y]) => { const e = document.querySelector(sel); if (e) { const r = e.getBoundingClientRect(); window.scrollBy(0, r.top - y); } }, [sel, y]); await page.waitForTimeout(100); };
const placeText = async (text, y = 170) => { await page.evaluate(([t, y]) => { const els = [...document.querySelectorAll('h2,h3,summary,span,div,p')].filter(e => e.children.length === 0 && e.textContent.trim() === t); const e = els[0]; if (e) { const r = e.getBoundingClientRect(); window.scrollBy(0, r.top - y); } }, [text, y]); await page.waitForTimeout(100); };
// type text progressively
const typeSteps = async (loc, steps) => { for (const [v, name] of steps) { await loc.fill(v); if (name) await snap(name); } };

await activatePro(page, url);
await page.goto(url + '#/bahan');
for (const [n, price, qty, unit] of [['Butter', '12', '250', 'g'], ['Cooking chocolate', '20', '500', 'g'], ['Telur', '15', '30', 'biji'], ['Tepung', '4', '1000', 'g'], ['Gula', '3', '1000', 'g']]) {
  await page.getByRole('button', { name: 'Tambah bahan' }).first().click();
  await box('Nama').fill(n); await box('Harga beli (RM)').fill(price); await box('Kuantiti dalam pek').fill(qty);
  await page.getByRole('combobox', { name: 'Unit pek' }).fill(unit);
  await saveSheet(); await page.getByText(n, { exact: true }).first().waitFor();
}
await page.goto(url + '#/pembungkusan');
for (const [n, p] of [['Kotak', '1.00'], ['Kertas baking', '0.15'], ['Sticker', '0.10'], ['Beg plastik', '0.20']]) {
  await page.getByRole('button', { name: 'Tambah pembungkusan' }).first().click();
  await box('Nama').fill(n); await box('Harga beli (RM)').fill(p); await box('Bilangan dalam satu beli').fill('1');
  await saveSheet(); await page.getByText(n, { exact: true }).first().waitFor();
}
await page.goto(url + '#/peralatan');
await page.getByRole('button', { name: 'Tambah peralatan' }).first().click();
await page.getByRole('button', { name: /Oven/ }).click();
await saveSheet();

await page.goto(url + '#/kos-operasi');
await page.getByRole('button', { name: /^Elektrik/ }).click();
await page.getByRole('tab', { name: 'Kira Lebih Tepat' }).click();
await box('Kadar elektrik (RM sekilowatt jam)').fill('0.50');
await page.getByRole('button', { name: 'Simpan kadar' }).click();
await box('Elektrik am sebulan (RM)').fill('0');
await saveSheet();

// ---- scene 2: menu baru ----
await page.goto(url + '#/menu/baru');
await snap('s2_0');
await typeSteps(box('Nama menu'), [['S', null], ['Standard B', 's2_1'], ['Standard Brownies', 's2_2']]);
await typeSteps(box('Hasil setiap batch (bilangan jualan)'), [['20', 's2_3']]);
await typeSteps(box('Masa penyediaan setiap batch (minit)'), [['120', 's2_4']]);
await typeSteps(box('Harga Jual seunit (RM)'), [['6', 's2_5']]);
// ---- scene 3: bahan ----
const usage = [['Butter', '150'], ['Cooking chocolate', '200'], ['Telur', '4'], ['Tepung', '120'], ['Gula', '180']];
for (let i = 0; i < 5; i++) {
  await page.getByRole('button', { name: '+ Tambah bahan' }).click();
  await place(`#ing-${i}`, 150);
  await snap(`s3_${i}a`);
  await page.locator(`#ing-${i}`).selectOption({ label: usage[i][0] });
  await snap(`s3_${i}b`);
  await page.getByRole('textbox', { name: 'Kuantiti guna' }).nth(i).fill(usage[i][1]);
  await snap(`s3_${i}c`);
}
// ---- scene 4: packaging ----
for (let i = 0; i < 4; i++) {
  await page.getByRole('button', { name: '+ Tambah pembungkusan' }).click();
  await place(`#pack-${i}`, 150);
  await page.locator(`#pack-${i}`).selectOption({ index: i + 1 });
  await snap(`s4_${i}`);
}
// ---- scene 5: oven ----
await page.getByRole('button', { name: '+ Tambah peralatan' }).click();
await place('#eq-0', 150);
await snap('s5_0');
await page.locator('#eq-0').selectOption({ index: 1 });
await snap('s5_1');
await box('Masa guna (minit)').fill('45');
await snap('s5_2');
await page.getByRole('button', { name: 'Simpan menu' }).click();
await page.getByRole('link', { name: /Standard Brownies/ }).waitFor();
await snap('s5_menulist_incomplete');
// Kos operasi: nilai masa + tariff
await page.goto(url + '#/kos-operasi');
await snap('s5_ko_0');
await box('Nilai Masa (RM sejam)').fill('15');
await snap('s5_ko_1');
await box('Anggaran Jualan Bulanan (RM)').fill('2400');
await snap('s5_ko_2');
await page.getByRole('button', { name: 'Simpan' }).first().click();
await page.getByText('✓ Disimpan').waitFor();
await snap('s5_ko_3');
// ---- scene 6: sewa ----
await page.getByRole('button', { name: /Ruang Kerja/ }).click();
await page.getByRole('tab', { name: 'Kira Lebih Tepat' }).click();
await snap('s6_0');
await box('Kos rumah atau sewa sebulan (RM)').fill('1500');
await snap('s6_1');
await page.getByRole('button', { name: '20%', exact: true }).click();
await page.getByText('RM300.00 sebulan').waitFor();
await snap('s6_2');
await saveSheet();
await fillRemainingOperating(page, url);
// ---- scene 7: reveal ----
await page.goto(url + '#/menu');
await page.getByText('Standard Brownies').first().click();
await page.waitForTimeout(500);
const card = page.getByTestId('cadangan-harga');
await card.scrollIntoViewIfNeeded();
const read = async () => (await page.getByTestId('cad-harga').innerText()).trim();
const out = {};
for (const m of [20, 30, 40, 50]) { await page.getByTestId(`cad-chip-${m}`).click(); out[m] = await read(); await snap(`d76-${m}`); }
console.log('SUGGESTED', JSON.stringify(out));
await page.getByTestId('cad-chip-30').click();
await page.getByTestId('cad-guna').click();
await page.waitForTimeout(300);
const body = await page.locator('body').innerText();
console.log('MARGIN30', /Margin\s*\n?\s*30\.0%/.test(body), body.match(/Margin[^\n]*\n[^\n]*%/)?.[0]);
await snap('d76-applied');
await browser.close();
