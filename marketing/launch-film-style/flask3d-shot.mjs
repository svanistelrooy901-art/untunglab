import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(process.env.PW_ROOT + '/');
const { chromium } = require('playwright');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--allow-file-access-from-files'] });
const p = await b.newPage({viewport:{width:1600,height:700}});
p.on('console',m=>console.log('C',m.text()));p.on('pageerror',e=>console.log('ERR',String(e)));
await p.goto('file:///tmp/f3d/flask.html');
await p.waitForFunction(()=>window.READY,null,{timeout:30000});
await p.evaluate(()=>{setPose('neutral',-0.35,-0.06,-5.0);});
// single render with three flasks needs multiple meshes; instead render 3 separate stills
for (const [name,kind,ry,rz] of [['a','neutral',-0.4,-0.04],['b','happy',0.0,0.0],['c','wow',0.45,0.07]]) {
  await p.evaluate(([k,ry,rz])=>{setPose(k,ry,rz,0);render1();},[kind,ry,rz]);
  await p.screenshot({path:`/tmp/f3d/flask_${name}.png`});
  console.log('ok',name);
}
await b.close();
