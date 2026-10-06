import { createRequire } from 'node:module';
const require = createRequire(process.env.PW_ROOT + '/');
const { chromium } = require('playwright');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--allow-file-access-from-files'] });
const p = await b.newPage({viewport:{width:800,height:900}});
await p.goto('file:///tmp/f3d/flask_t.html');
await p.waitForFunction(()=>window.READY,null,{timeout:30000});
for (const [name,kind,ry,rz] of [['neutral','neutral',-0.35,-0.04],['happy','happy',0.2,0.03],['wow','wow',0.4,0.07]]) {
  await p.evaluate(([k,ry,rz])=>{setPose(k,ry,rz,0);render1();},[kind,ry,rz]);
  await p.screenshot({path:`/tmp/f3d/t_${name}.png`,omitBackground:true});
}
await b.close();
