import re, json
SB="storyboard/"  # needs the storyboard generators (gen.py, gen2.py, gen3.py)
src3=open(SB+"gen3.py").read().split('boards={};order=[];notes={}')[0]
src3=src3.replace("open('gen.py')","open(SB+'gen.py')").replace("open('gen2.py')","open(SB+'gen2.py')")
import os; os.chdir(SB); exec(src3); os.chdir("/tmp/vidwork")
def body(h):
    return re.search(r'</helmet>\s*(.*?)\s*</x-dc>', h, re.S).group(1)
def fix(s):
    return s.replace(LOGO,'assets/logo.png').replace(FULL,'assets/logo-penuh.png').replace(MASCOT,'assets/mascot.png')
bodies=[fix(body(h)) for (_,h) in frames]
bar=fix(appbar())
A_b=bodies[5].replace(fix(appbar()),''); B_b=bodies[6].replace(fix(appbar()),'')
assert A_b!=bodies[5] and B_b!=bodies[6]
ids=['hook','calc','real','reass','templ','menu','price','offl','dash','end']
parts={}
parts['hook']=bodies[0];parts['calc']=bodies[1];parts['real']=bodies[2];parts['reass']=bodies[3];parts['templ']=bodies[4]
parts['menu']=f'<div id="mA" class="layer">{A_b}</div><div id="mB" class="layer">{B_b}</div><div id="mBar" style="position:absolute;left:0;top:0;width:360px;height:56px;z-index:6">{bar}</div>'
parts['price']=bodies[7];parts['offl']=bodies[8];parts['dash']=bodies[9];parts['end']=bodies[10]
scenes=''.join(f'<section class="scene" id="sc-{i}">{parts[i]}</section>' for i in ids)
html=f'''<!doctype html><html lang="ms"><head><meta charset="utf-8"><title>UntungLab launch</title>
<style>
@font-face{{font-family:'Inter';src:url(assets/inter.woff2) format('woff2');font-weight:100 900}}
html,body{{margin:0;background:#011416}}
body{{font-family:'Inter',system-ui,sans-serif;font-variant-numeric:tabular-nums}}
#stage{{position:relative;width:360px;height:640px;overflow:hidden}}
.scene{{position:absolute;left:0;top:0;width:360px;height:640px;overflow:hidden}}
.layer{{position:absolute;left:0;top:0;width:360px;height:640px}}
#mascot{{position:absolute;left:0;top:0;width:56px;height:56px;border-radius:99px;background:#011416;border:2px solid #75F8E8;display:flex;align-items:center;justify-content:center;z-index:50;box-shadow:0 6px 18px rgba(1,20,22,.35);box-sizing:border-box}}
#mascot img{{width:30px;height:auto}}
#bubble{{position:absolute;left:0;top:0;z-index:51;padding:6px 11px;border-radius:12px;background:#011416;color:#75F8E8;font-size:12px;font-weight:700;white-space:nowrap;border:1.5px solid #75F8E8;opacity:0}}
</style></head><body><div id="stage">{scenes}<div id="mascot"><img src="assets/mascot.png" alt=""></div><div id="bubble"></div></div>
<script>{open('engine.js').read()}</script></body></html>'''
open('video.html','w').write(html)
print(len(html))
