// Phase 11 UX audit (Doc 06 §7): every route at 390px and 1280px. Checks horizontal overflow, tap targets >= 44px,
// leftover English UI words, placeholder screens, and that loss is conveyed by text. Needs the e2e build (Pro, no limits).
// E2E_KEYS=/tmp/e2e-keys.json PW_ROOT=$(npm root -g) APP_URL=http://localhost:4181/ node scripts/e2e-phase11-audit.mjs <dir>
import { createRequire } from 'node:module';
import { fillRemainingOperating } from './e2e-ops.mjs';
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
let failures = 0;
const ok = (name, cond, detail) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? '  ' + JSON.stringify(detail) : ''}`); if (!cond) { failures++; process.exitCode = 1; } };
const box = (name) => page.getByRole('textbox', { name, exact: true });
const saveSheet = () => page.getByRole('button', { name: 'Simpan' }).last().click();

await activatePro(page, url);

// ---- seed through real screens ----
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
await page.getByText('RM600.00').first().waitFor();
async function menu(name, price, a, b) {
  await page.goto(url + '#/menu/baru');
  await box('Nama menu').fill(name);
  await box('Hasil setiap batch (bilangan jualan)').fill('10');
  await box('Masa penyediaan setiap batch (minit)').fill('60');
  await box('Harga Jual seunit (RM)').fill(price);
  await page.getByRole('button', { name: '+ Tambah bahan' }).click();
  await page.locator('#ing-0').selectOption({ label: 'Ayam' });
  await box('Kuantiti guna').fill(a);
  await page.getByRole('button', { name: '+ Tambah bahan' }).click();
  await page.locator('#ing-1').selectOption({ label: 'Bahan lain' });
  await page.getByRole('textbox', { name: 'Kuantiti guna' }).nth(1).fill(b);
  await page.getByRole('button', { name: '+ Tambah pembungkusan' }).click();
  await page.locator('#pack-0').selectOption({ label: 'Kotak' });
  await page.getByRole('button', { name: 'Simpan menu' }).click();
  await page.getByRole('link', { name: new RegExp(name) }).waitFor();
}
await menu('Nasi Lemak', '12', '1200', '1000');
await menu('Sandwic Ayam', '15', '800', '500');
await page.goto(url + '#/menu/baru');
await box('Nama menu').fill('Belum siap');
await page.getByRole('button', { name: 'Simpan menu' }).click().catch(() => {});
await page.goto(url + '#/menu');

// ---- audit helpers ----
const ENGLISH = /\b(Loading|Save|Cancel|Add|Delete|Submit|Error|Settings|Search|Edit|Close|Back|Next|Previous|Yes|No|Please|Failed|Success|Undo|Confirm|Retry|Upload|Download|Name|Price)\b/;
async function audit(route, label) {
  await page.goto(url + '#' + route);
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const vw = window.innerWidth;
    const visible = (el) => { const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
    const small = [];
    for (const el of document.querySelectorAll('button, a[href], [role=tab], select, summary, input:not([type=hidden])')) {
      if (!visible(el)) continue;
      if (el instanceof HTMLInputElement && el.type === 'file') continue; // visually hidden; its visible label is checked instead
      let target = el;
      if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) target = el.closest('label') ?? el;
      const b = target.getBoundingClientRect();
      if (b.height < 43.5 || (b.width < 43.5)) small.push(`${el.tagName.toLowerCase()}:${(el.getAttribute('aria-label') || el.textContent || el.getAttribute('name') || '').trim().slice(0, 30)}:${Math.round(b.width)}x${Math.round(b.height)}`);
    }
    const text = document.body.innerText;
    return { overflow: document.documentElement.scrollWidth - vw, small, text };
  });
  ok(`${label} ${route}: no horizontal overflow`, r.overflow <= 0, r.overflow);
  ok(`${label} ${route}: tap targets >= 44px`, r.small.length === 0, r.small);
  ok(`${label} ${route}: no placeholder screen`, !r.text.includes('Sedang dibina'));
  const m = r.text.match(ENGLISH);
  ok(`${label} ${route}: no English UI words`, !m, m && m[0]);
  return r;
}

const routes = ['/', '/menu', '/bahan', '/pembungkusan', '/peralatan', '/kesan-harga', '/jejak-harga', '/kos-operasi', '/laporan', '/sandaran', '/lesen', '/lagi'];
for (const r of routes) await audit(r, '390');
await page.screenshot({ path: `${S}/p11-lagi.png` });

// key screens with content
await page.goto(url + '#/menu');
const first = page.getByRole('link', { name: /Nasi Lemak/ });
await first.click();
await page.waitForTimeout(400);
{
  const text = await page.evaluate(() => document.body.innerText);
  ok('loss shown by words and value, not colour alone', /Menu Ini Rugi/.test(text) && /−RM0\.44/.test(text));
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  ok('menu detail: no horizontal overflow', ov <= 0, ov);
  await page.screenshot({ path: `${S}/p11-menu-detail.png`, fullPage: true });
}
await audit('/laporan', '390 (with data)');
{
  const text = await page.evaluate(() => document.body.innerText);
  ok('laporan lists both menus and the loss label', /Nasi Lemak/.test(text) && /Sandwic Ayam/.test(text) && /Menu Ini Rugi/.test(text));
  await page.screenshot({ path: `${S}/p11-laporan.png`, fullPage: true });
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Eksport CSV' }).click()]);
  const { readFileSync } = await import('node:fs');
  const csv = readFileSync(await dl.path(), 'utf8');
  ok('CSV downloads with a dated BM name', /^untunglab-laporan-menu-\d{4}-\d{2}-\d{2}\.csv$/.test(dl.suggestedFilename()), dl.suggestedFilename());
  ok('CSV has BOM, header and the loss row with a plain minus', csv.startsWith('\uFEFFMenu,Harga Jual (RM)') && /Nasi Lemak,12\.00,.*,-0\.44,-3\.7,Menu Ini Rugi/.test(csv));
  await page.getByText('Laporan disimpan.').waitFor();
}

// sheets and dialogs
await page.goto(url + '#/bahan');
await page.getByRole('button', { name: 'Tambah bahan' }).first().click();
await page.waitForTimeout(300);
{
  const small = await page.evaluate(() => [...document.querySelectorAll('[role=dialog] button, [role=dialog] input, [role=dialog] summary, [role=dialog] select')].filter((el) => { const b = el.getBoundingClientRect(); return b.width > 0 && (b.height < 43.5 || b.width < 43.5); }).map((el) => `${el.tagName}:${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 25)}:${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`));
  ok('bahan sheet: tap targets >= 44px', small.length === 0, small);
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  ok('bahan sheet: no horizontal overflow', ov <= 0, ov);
  await page.screenshot({ path: `${S}/p11-bahan-sheet.png` });
}
await page.keyboard.press('Escape');

// desktop
await page.setViewportSize({ width: 1280, height: 800 });
for (const r of ['/', '/menu', '/laporan', '/kesan-harga']) {
  await page.goto(url + '#' + r);
  await page.waitForTimeout(300);
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  ok(`1280 ${r}: no horizontal overflow`, ov <= 0, ov);
}
await page.screenshot({ path: `${S}/p11-desktop-laporan.png` });

// 320px small phone
await page.setViewportSize({ width: 320, height: 640 });
for (const r of ['/', '/menu', '/laporan', '/kos-operasi', '/lesen']) {
  await page.goto(url + '#' + r);
  await page.waitForTimeout(300);
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  ok(`320 ${r}: no horizontal overflow`, ov <= 0, ov);
  if (ov > 0) console.log('  widest offenders:', await page.evaluate(() => [...document.querySelectorAll('main *')].filter((e) => e.getBoundingClientRect().right > innerWidth + 0.5).slice(0, 4).map((e) => `${e.tagName}.${String(e.className).slice(0, 60)} right=${Math.round(e.getBoundingClientRect().right)}`)));
}

ok('no console errors', errors.length === 0, errors.slice(0, 3));
await browser.close();
console.log(failures ? `\n${failures} check(s) failed` : '\nall audit checks passed');
