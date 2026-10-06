import { createRequire } from 'node:module';
const require = createRequire(process.env.PW_ROOT + '/');
const { chromium } = require('playwright');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--allow-file-access-from-files'] });
const p = await b.newPage({viewport:{width:1920,height:1080}});
await p.goto('file:///tmp/ph/mock.html'); await p.waitForTimeout(600);
await p.screenshot({path:'/tmp/ph/mock1.png'}); await b.close();
