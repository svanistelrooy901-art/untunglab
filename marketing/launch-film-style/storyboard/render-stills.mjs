import { createRequire } from 'node:module';
const require = createRequire(process.env.PW_ROOT + '/');
const { chromium } = require('playwright');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--allow-file-access-from-files'] });
const p = await b.newPage({viewport:{width:1920,height:1080}});
await p.goto('file:///tmp/sbf/sb.html'); await p.waitForTimeout(800);
const els = await p.locator('.sc').all();
for (let i=0;i<els.length;i++) await els[i].screenshot({path:`/tmp/sbf/s${i+1}.png`});
console.log(els.length); await b.close();
