// Browser check: Excel import for Bahan (full version only), preview with problem rows, update by name.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { activatePro } from './e2e-license.mjs';
const require = createRequire(process.env.PW_ROOT + '/');
const { chromium } = require('playwright');
const { unzipSync, zipSync, strFromU8, strToU8 } = require(process.cwd() + '/node_modules/fflate');
const S = process.argv[2] ?? '.';
const url = process.env.APP_URL ?? 'http://localhost:4173/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ms-MY', acceptDownloads: true });
await ctx.addInitScript(() => localStorage.setItem('ul-app-lang', 'ms'));
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
const ok = (name, cond) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`); if (!cond) process.exitCode = 1; };
const box = (name) => page.getByRole('textbox', { name, exact: true });
const saveSheet = () => page.getByRole('button', { name: 'Simpan' }).last().click();

await page.goto(url + '#/bahan');
await page.getByRole('button', { name: 'Import Excel' }).click();
ok('free: import is locked with the full-version note', await page.getByText(/Import Excel ada dalam versi penuh/).isVisible());
await page.keyboard.press('Escape');

await activatePro(page, url);
await page.goto(url + '#/bahan');
await page.getByRole('button', { name: 'Tambah bahan' }).first().click();
await box('Nama').fill('Gula');
await box('Harga beli (RM)').fill('3');
await box('Kuantiti dalam pek').fill('1');
await page.getByRole('combobox', { name: 'Unit pek' }).fill('kg');
await saveSheet();
await page.getByText('Gula', { exact: true }).first().waitFor();

await page.getByRole('button', { name: 'Import Excel' }).click();
const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Muat turun templat' }).click()]);
const tpl = '/tmp/claude-0/shots/template.xlsx';
await download.saveAs(tpl);
const files = unzipSync(new Uint8Array(readFileSync(tpl)));
let sheet = strFromU8(files['xl/worksheets/sheet1.xml']);
ok('template has unit dropdown', sheet.includes('type="list"') && sheet.includes('kg,g,l,ml,biji'));
ok('template prefilled names, no prices', sheet.includes('Tepung gandum') && !/<c r="B\d+"[^>]*><v>/.test(sheet));
const fill = (row, price, qty) => { sheet = sheet.replace(new RegExp(`(<c r="D${row}")`), `<c r="B${row}"><v>${price}</v></c><c r="C${row}"><v>${qty}</v></c>$1`); };
const rowOf = (name) => Number(new RegExp(`<c r="A(\\d+)"[^>]*><is><t[^>]*>${name}</t>`).exec(sheet)[1]);
fill(rowOf('Tepung gandum'), 3.5, 1);
fill(rowOf('Gula'), 4, 1);
fill(rowOf('Telur'), 12, 30);
sheet = sheet.replace(new RegExp(`(<c r="D${rowOf('Garam')}")`), `<c r="B${rowOf('Garam')}" t="inlineStr"><is><t>abc</t></is></c><c r="C${rowOf('Garam')}"><v>1</v></c>$1`);
files['xl/worksheets/sheet1.xml'] = strToU8(sheet);
const filled = '/tmp/claude-0/shots/filled.xlsx';
writeFileSync(filled, zipSync(files));

await page.locator('input[type=file]').setInputFiles(filled);
await page.getByTestId('import-pratonton').waitFor();
const pv = await page.getByTestId('import-pratonton').innerText();
ok('preview: 2 new, 1 price update, 1 problem', /Bahan baharu\s*2/.test(pv) && /Kemas kini harga\s*1/.test(pv) && /Baris bermasalah\s*1/.test(pv));
ok('problem row is named with its reason', /Garam\): Harga tak sah/.test(await page.getByTestId('import-masalah').innerText()));
await page.screenshot({ path: `${S}/d-01-pratonton.png`, fullPage: true });
await page.getByRole('button', { name: 'Import 3 bahan' }).click();
await page.getByText(/Siap: 2 baharu, 1 dikemas kini/).waitFor();
ok('result message', true);
await page.getByRole('button', { name: 'Tutup' }).last().click();
await page.getByText('Tepung gandum', { exact: true }).first().waitFor();
ok('new ingredients listed', (await page.getByText('Telur', { exact: true }).count()) > 0);
ok('Gula price updated to RM4.00', await page.getByText(/RM4\.00 \/ 1 kg/).isVisible());
ok('only one Gula (no duplicate)', (await page.getByText('Gula', { exact: true }).count()) === 1);

await page.getByRole('button', { name: 'Import Excel' }).click();
await page.locator('input[type=file]').setInputFiles({ name: 'rosak.xlsx', mimeType: 'application/octet-stream', buffer: Buffer.from('PKnot a zip') });
await page.getByText(/bukan templat Excel/).waitFor();
ok('a broken file is refused with a message', true);

ok('no console errors', errors.length === 0);
if (errors.length) console.log(errors);
await browser.close();
