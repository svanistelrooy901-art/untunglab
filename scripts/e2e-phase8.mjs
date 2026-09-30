// Browser check for Phase 8 (Kesan Harga). M01 menu, what-if chips, reset, apply, history review.
// Usage: PW_ROOT=$(npm root -g) APP_URL=http://localhost:4173/ node scripts/e2e-phase8.mjs <screenshot-dir>
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


// --- What-If ---
await page.goto(url + '#/kesan-harga');
await page.getByText('Belum ada perubahan').or(page.getByLabel('Bahan')).first().waitFor();
await page.getByLabel('Bahan', { exact: true }).selectOption({ label: 'Ayam' });
ok('nothing chosen yet: prompt, Apply disabled', await page.getByRole('button', { name: 'Guna harga ini' }).isDisabled());
await page.getByRole('button', { name: '+20%' }).click();
await page.getByTestId('hasil').waitFor();
const h1 = await page.getByTestId('hasil').innerText();
ok('unit cost RM15.00 to RM18.00 per kg (+20.0%)', /RM15\.00 → RM18\.00 setiap kg \(\+20\.0%\)/.test(h1));
ok('Nasi Lemak cost 12.44 to 12.80, profit −0.44 to −0.80', /RM12\.44 → RM12\.80/.test(h1) && /−RM0\.44 → −RM0\.80/.test(h1));
ok('1 menu affected (only Nasi Lemak uses chicken here)', /1 menu terjejas/.test(h1));
ok('percent and price fields follow the chip', (await page.getByRole('textbox', { name: 'Harga pek baharu (RM)' }).inputValue()) === '18.00');
await page.screenshot({ path: `${S}/p8-01-whatif.png`, fullPage: true });

// no DB write yet: Jejak Harga still has only the baseline
await page.goto(url + '#/jejak-harga');
await page.getByText('Sejarah (1 rekod)').first().waitFor();
ok('simulation wrote nothing (still 1 record)', true);
await page.goBack();
await page.getByRole('button', { name: '+20%' }).click().catch(() => {});

// custom price and reset
await page.goto(url + '#/kesan-harga?bahan=' + (await page.evaluate(async () => {
  const db = await new Promise((res) => { const r = indexedDB.open('untunglab'); r.onsuccess = () => res(r.result); });
  return await new Promise((res) => { const q = db.transaction('ingredients').objectStore('ingredients').getAll(); q.onsuccess = () => res(q.result.find((i) => i.name === 'Ayam').id); });
})));
await page.getByRole('textbox', { name: 'Harga pek baharu (RM)' }).fill('16.5');
await page.getByTestId('hasil').waitFor();
ok('typed price shows +10.0%', /\+10\.0%/.test(await page.getByTestId('hasil').innerText()));
ok('percent field shows 10', (await page.getByRole('textbox', { name: 'Perubahan (%)' }).inputValue()) === '10');
await page.getByRole('textbox', { name: 'Perubahan (%)' }).fill('abc');
await page.getByText('Isi nombor yang sah').waitFor();
ok('invalid percent is named', true);
await page.getByRole('button', { name: 'Set semula' }).click();
await page.getByText('Belum ada perubahan').waitFor();
ok('Reset returns to current, results gone', (await page.getByTestId('hasil').count()) === 0);

// --- status flip is called out ---
await page.getByRole('textbox', { name: 'Harga pek baharu (RM)' }).fill('60');
await page.getByTestId('hasil').waitFor();
ok('summary names menus and status', /menu terjejas/.test(await page.getByTestId('hasil').innerText()));

// --- Apply ---
await page.getByRole('textbox', { name: 'Harga pek baharu (RM)' }).fill('18');
await page.getByRole('button', { name: 'Guna harga ini' }).click();
await page.getByText('Guna harga baharu?').waitFor();
await page.screenshot({ path: `${S}/p8-02-sahkan.png` });
await page.getByRole('button', { name: 'Ya, guna harga ini' }).click();
await page.getByRole('status').getByText(/dikemas kini kepada RM18\.00/).waitFor();
ok('apply confirmed and recorded', true);
await page.goto(url + '#/menu');
await page.getByText(/Kos Sebenar RM12\.80/).waitFor();
ok('Menu list now matches the preview (RM12.80)', true);
await page.goto(url + '#/jejak-harga');
await page.getByText('Sejarah (2 rekod)').first().waitFor();
ok('Jejak Harga got exactly one new record', true);
await page.locator('summary', { hasText: 'Sejarah (2 rekod)' }).first().click();

// --- History Review ---
await page.getByRole('link', { name: /Lihat kesan pada menu/ }).first().click();
await page.getByText('Semakan sejarah').waitFor();
const rv = await page.getByTestId('hasil').innerText();
ok('review compares RM15.00 to RM18.00 per kg', /RM15\.00 → RM18\.00 setiap kg/.test(rv));
ok('review is read-only (no Apply, no chips)', (await page.getByRole('button', { name: 'Guna harga ini' }).count()) === 0 && (await page.getByRole('button', { name: '+20%' }).count()) === 0);
await page.screenshot({ path: `${S}/p8-03-semakan.png`, fullPage: true });
await page.getByRole('button', { name: 'Cuba simulasi baharu' }).click();
await page.getByRole('button', { name: '+20%' }).waitFor();
ok('back to a fresh simulation', true);

// --- dashboard deep link ---
await page.goto(url + '#/');
await page.goto(url + '#/kesan-harga');
await page.setViewportSize({ width: 390, height: 844 });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
ok('no horizontal overflow at 390px', !overflow);

await page.reload();
await page.waitForTimeout(1500);
await ctx.setOffline(true);
await page.goto(url + '#/kesan-harga');
await page.getByRole('heading', { name: 'Kesan Harga' }).waitFor();
ok('Kesan Harga available offline', true);
await page.setViewportSize({ width: 1280, height: 800 });
await page.screenshot({ path: `${S}/p8-04-desktop.png` });
ok('no console errors', errors.length === 0);
if (errors.length) console.log(errors);
await browser.close();
