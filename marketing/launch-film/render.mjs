import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(process.env.PW_ROOT + '/');
const { chromium } = require('playwright');
const [,, from, to, out, fps='30'] = process.argv;
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--allow-file-access-from-files'] });
const page = await (await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })).newPage();
page.on('pageerror', e => console.log('PAGEERR', String(e)));
page.on('console', m => m.type()==='error' && console.log('CERR', m.text()));
await page.goto('file:///tmp/film/film.html');
await page.waitForFunction(() => window.READY === true, null, {timeout: 60000});
await page.waitForTimeout(500);
const times = process.env.TIMES ? process.env.TIMES.split(',').map(Number) : null;
const list = times ?? Array.from({length: parseInt(to)-parseInt(from)}, (_, i) => (parseInt(from)+i)/parseInt(fps));
const t0=Date.now();
for (const t of list) {
  await page.evaluate((t) => window.seek(t), t);
  await page.screenshot({ path: `${out}/${String(Math.round(t*parseInt(fps))).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 });
}
console.log('done', list.length, 'frames in', ((Date.now()-t0)/1000).toFixed(1),'s');
await b.close();
