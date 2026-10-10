// Browser check for the anonymous usage count (D-94): one ping on first start, none again that week, none when switched off.
// Run: bash scripts/e2e-build.sh, serve dist-e2e, then  PW_ROOT=... APP_URL=http://localhost:4181/ node scripts/e2e-usage.mjs
import { createRequire } from 'node:module';
const require = createRequire((process.env.PW_ROOT ?? '/home/claude/.npm-global/lib/node_modules') + '/');
const { chromium } = require('playwright');
const APP = process.env.APP_URL ?? 'http://localhost:4181/';
let fails = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); if (!ok) fails++; };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-A175F) Chrome/120 Mobile' });
const pings = [];
await ctx.route('https://license.test/**', async (route) => {
  const req = route.request();
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' };
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  if (new URL(req.url()).pathname === '/api/ping') pings.push(JSON.parse(req.postData() ?? '{}'));
  return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: '{"ok":true}' });
});
const page = await ctx.newPage();
await page.goto(APP);
await page.evaluate(() => localStorage.setItem('ul-app-lang', 'ms'));
await page.reload();
await page.waitForTimeout(5500);
check('first start sends one count', pings.length === 1, JSON.stringify(pings[0]));
check('it holds only id, version, language and device type', pings[0] && Object.keys(pings[0]).sort().join() === 'id,lang,platform,version');
check('device type is android', pings[0]?.platform === 'android');

await page.reload();
await page.waitForTimeout(5500);
check('starting again the same week sends nothing', pings.length === 1);

await page.goto(APP + '#/tetapan');
await page.waitForTimeout(500);
const box = page.getByLabel('Benarkan kiraan penggunaan tanpa nama');
check('Tetapan shows the switch, on by default', (await box.count()) === 1 && (await box.isChecked()));
await box.uncheck();
await page.evaluate(() => localStorage.removeItem('untunglab.lastPing'));
await page.reload();
await page.waitForTimeout(5500);
check('switched off: nothing is sent even when a week is due', pings.length === 1);

await page.goto(APP + '#/tetapan');
await page.waitForTimeout(500);
check('the switch stays off after reload', !(await page.getByLabel('Benarkan kiraan penggunaan tanpa nama').isChecked()));
await page.getByLabel('Benarkan kiraan penggunaan tanpa nama').check();
await page.reload();
await page.waitForTimeout(5500);
check('switched on again: the count is sent, with the same id', pings.length === 2 && pings[1].id === pings[0].id);

await browser.close();
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
process.exit(fails ? 1 : 0);
