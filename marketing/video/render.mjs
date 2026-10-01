import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(process.env.PW_ROOT + '/');
const { chromium } = require('playwright');
const [,, from, to, out, fps='30'] = process.argv;
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 });
const page = await ctx.newPage();
page.on('pageerror', e => console.log('PAGEERR', String(e)));
await page.goto('file:///tmp/vidwork/video.html');
await page.waitForFunction(() => window.READY === true, null, {timeout: 15000});
const step = parseInt(process.env.STEP ?? '1'), off = parseInt(process.env.OFF ?? '0');
const times = process.env.TIMES ? process.env.TIMES.split(',').map(Number) : null;
const list = times ?? Array.from({length: Math.ceil((parseInt(to)-parseInt(from))/step)}, (_, i) => (parseInt(from)+i*step+off)/parseInt(fps));
for (const t of list) {
  await page.evaluate((t) => window.seek(t), t);
  await page.screenshot({ path: `${out}/${String(Math.round(t*parseInt(fps))).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 });
}
await browser.close();
