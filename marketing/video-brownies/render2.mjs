import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(process.env.PW_ROOT + '/');
const { chromium } = require('playwright');
const [,, from, to, out, fps='30'] = process.argv;
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--allow-file-access-from-files'] });
const page = await (await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 })).newPage();
page.on('pageerror', e => console.log('PAGEERR', String(e)));
await page.goto('file:///tmp/vid2/video2.html');
await page.waitForFunction(() => window.READY === true && window.seek, null, {timeout: 20000});
await page.waitForTimeout(500);
const times = process.env.TIMES ? process.env.TIMES.split(',').map(Number) : null;
const list = times ?? Array.from({length: parseInt(to)-parseInt(from)}, (_, i) => (parseInt(from)+i)/parseInt(fps));
for (const t of list) {
  await page.evaluate((t) => window.seek(t), t);
  await page.screenshot({ path: `${out}/${String(Math.round(t*parseInt(fps))).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 });
}
await browser.close();
