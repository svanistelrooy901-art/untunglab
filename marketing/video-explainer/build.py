import json, base64, html
P = '/tmp/explainer/proj'
KU = json.load(open('/tmp/explainer/proj/assets/ku_svgs.json'))
DUR = 74.0

def b64(p): return base64.b64encode(open(p, 'rb').read()).decode()
def shot(n): return f'data:image/png;base64,{b64(f"{P}/shots/{n}.png")}'
def ku(pose, h=520): return KU[pose].replace('<svg ', f'<svg height="{h}" ', 1)

# ---------- captions: (t0, t1, text with *key*) ----------
CAPS = [
 (0.3, 3.4, 'Jual brownies RM6. *Untung* RM5.09?'),
 (3.7, 7.6, 'Tapi kos bukan *bahan* je.'),
 (7.8, 11.8, 'Untung sebenar cuma *RM1.34.*'),
 (12.2, 17.8, 'Ramai peniaga rasa untung, padahal *tipis.*'),
 (18.3, 20.6, 'Kenalkan *UntungLab.*'),
 (20.8, 22.9, 'Tak perlu pandai *akaun.*'),
 (23.2, 27.8, 'Sesuai untuk *kuih,* nasi, minuman dan frozen.'),
 (28.3, 31.6, 'Masuk harga *pek.*'),
 (31.8, 35.8, 'App kira kos *seunit.*'),
 (36.3, 40.2, 'Semua kos *masuk.*'),
 (40.4, 43.8, 'Kos sebenar *RM4.66* sebiji.'),
 (44.3, 47.9, 'Menu *rugi?* Terus nampak.'),
 (48.1, 51.8, 'Nasi lemak rugi *RM0.45* sebungkus.'),
 (52.3, 57.8, 'Ayam naik? *2 menu* terjejas.'),
 (58.3, 63.8, 'Pilih *margin.* App cadang harga.'),
 (64.3, 66.4, '*Ringkasnya,*'),
 (66.6, 68.8, 'untung sebenar, *setiap* menu.'),
]
cap_html = []
for i, (a, b, txt) in enumerate(CAPS):
    words = []
    for j, w in enumerate(txt.split(' ')):
        key = w.startswith('*')
        w = w.strip('*')
        words.append(f'<span class="w{" k" if key else ""}" id="c{i}w{j}">{html.escape(w)}</span>')
    cap_html.append(f'<div class="cap" id="cap{i}">{" ".join(words)}</div>')

# ---------- phone screens + highlights (CSS px of 390x844 screenshots) ----------
PH = {  # scene: list of (shot, t0, t1, [(x,y,w,h,tOn), ...])
 's6': [('b1-bahan-tambah', 28.0, 32.0, [(14, 434, 181, 56, 28.9), (195, 434, 181, 56, 29.3), (14, 594, 362, 50, 30.4)]),
        ('m1-menu-bahan', 32.0, 36.0, [(27, 256, 336, 54, 32.5), (27, 336, 168, 54, 33.0)])],
 's7': [('m3-pecahan', 36.0, 40.3, [(16, 426, 358, 44, 36.8), (16, 471, 358, 44, 37.3), (16, 516, 358, 44, 37.8), (16, 561, 358, 44, 38.3), (16, 606, 358, 44, 38.8)]),
        ('m2-hasil', 40.3, 44.0, [(24, 214, 342, 42, 40.8)])],
 's8': [('d2-dashboard-alerts', 44.0, 52.0, [(16, 578, 358, 152, 44.9)])],
 's9': [('k3-kesan-hasil', 52.0, 58.0, [(10, 246, 370, 82, 52.8), (10, 548, 370, 188, 54.2), (10, 350, 370, 192, 55.0)])],
 's10': [('m2-hasil', 58.0, 64.0, [(118, 452, 78, 52, 58.8), (236, 504, 120, 48, 59.6)])],
}
TITLES = {'s6': 'Masuk bahan', 's7': 'Kos sebenar', 's8': 'Menu rugi', 's9': 'Kesan Harga', 's10': 'Cadangan Harga'}
SC_T = {'s6': (28, 36), 's7': (36, 44), 's8': (44, 52), 's9': (52, 58), 's10': (58, 64)}
S = 1.4

def phone_scene(sid):
    a, b = SC_T[sid]
    layers = []
    for k, (n, t0, t1, hl) in enumerate(PH[sid]):
        hls = ''.join(f'<div class="hl" id="{sid}h{k}_{m}" style="left:{x*S}px;top:{y*S}px;width:{w*S}px;height:{h*S}px"></div>' for m, (x, y, w, h, _) in enumerate(hl))
        layers.append(f'<div class="scr" id="{sid}s{k}"><img src="{shot(n)}">{hls}</div>')
    extra = ''
    if sid == 's8':
        extra = '<div class="float red" id="s8f"><small>Nasi Lemak Ayam</small><b>−RM0.45</b><small>setiap jualan</small></div>'
    if sid == 's9':
        extra = '<div class="float org" id="s9f"><small>Harga Ayam</small><b>naik</b><small>2 menu terjejas</small></div>'
    if sid == 's10':
        extra = '<div class="float mint" id="s10f"><small>Margin 30%</small><b>RM6.80</b><small>harga dicadangkan</small></div>'
    if sid == 's7':
        extra = '<div class="float mint" id="s7f"><small>Kos sebenar</small><b>RM4.66</b><small>sebiji brownies</small></div>'
    return f'''<div class="scene" id="{sid}"><div class="ttl" id="{sid}t">{TITLES[sid]}</div>
<div class="phone" id="{sid}p"><div class="screen">{''.join(layers)}</div><div class="notch"></div></div>{extra}</div>'''

ICON = {
 'kek': '<svg viewBox="0 0 160 160" width="150"><rect x="20" y="70" width="120" height="58" rx="10" fill="#C7D2D0"/><rect x="28" y="62" width="34" height="30" rx="5" fill="#5B3A29"/><rect x="63" y="62" width="34" height="30" rx="5" fill="#6B4430"/><rect x="98" y="62" width="34" height="30" rx="5" fill="#5B3A29"/><rect x="45" y="94" width="34" height="28" rx="5" fill="#6B4430"/><rect x="80" y="94" width="34" height="28" rx="5" fill="#5B3A29"/><path d="M32 70 l8 -4 l8 4 l8 -4" stroke="#8A5A3C" stroke-width="3" fill="none"/></svg>',
 'nasi': '<svg viewBox="0 0 160 160" width="150"><ellipse cx="80" cy="110" rx="62" ry="22" fill="#2F855A"/><ellipse cx="80" cy="104" rx="56" ry="18" fill="#3FA06A"/><path d="M44 102 C44 72 76 62 86 80 C96 66 120 80 112 102Z" fill="#FFFDF5"/><ellipse cx="110" cy="96" rx="14" ry="9" fill="#fff"/><circle cx="110" cy="96" r="5" fill="#F6B73C"/><path d="M52 100 q10 -10 22 0 q-10 8 -22 0" fill="#C53030"/><path d="M84 106 l14 -4 l-2 8z" fill="#8B5E34"/></svg>',
 'air': '<svg viewBox="0 0 160 160" width="150"><path d="M48 50 L112 50 L104 134 Q103 140 96 140 L64 140 Q57 140 56 134Z" fill="#E7F4F2" stroke="#0F766E" stroke-width="4"/><path d="M52 78 L108 78 L104 132 Q103 136 97 136 L63 136 Q57 136 56 132Z" fill="#C8894D"/><path d="M52 78 L108 78 L107 90 L53 90Z" fill="#F3E2C7"/><rect x="88" y="24" width="8" height="64" rx="4" transform="rotate(12 92 56)" fill="#0F766E"/></svg>',
 'frozen': '<svg viewBox="0 0 160 160" width="150"><rect x="26" y="40" width="108" height="92" rx="12" fill="#DBEAFE"/><rect x="26" y="40" width="108" height="26" rx="12" fill="#93C5FD"/><g stroke="#1D4ED8" stroke-width="5" stroke-linecap="round"><path d="M80 78 v40"/><path d="M62 88 l36 20"/><path d="M62 108 l36 -20"/></g></svg>',
}

def xcard(i, t): return f'<div class="xc" id="x{i}"><span class="xi">✕</span>{t}</div>'
def pcard(i, k, t): return f'<div class="pc" id="pc{i}">{ICON[k]}<b>{t}</b></div>'
def rcard(i, t): return f'<div class="rc" id="rc{i}"><span class="rn">{i+1}</span>{t}</div>'

body = f'''
<div class="bgdots"></div>
<!-- S1+S2 receipt -->
<div class="scene" id="s1">
 <div class="rwrap"><div class="rfront" id="rf">
  <div class="rh"><span>RESIT</span><span>BROWNIES · SEBIJI</span></div>
  <div class="rl" id="rf1"><span>Harga jual</span><span>RM6.00</span></div>
  <div class="rl" id="rf2"><span>Bahan</span><span>−RM0.91</span></div>
  <div class="rdash"></div>
  <div class="rbig" id="rf3"><span>UNTUNG</span><b>RM5.09?</b></div>
  <div class="rzig"></div>
 </div>
 <div class="rback" id="rb">
  <div class="rh"><span>KOS SEBENAR</span><span>BROWNIES · SEBIJI</span></div>
  <div class="rl" id="rb1"><span>Bahan</span><span>RM0.91</span></div>
  <div class="rl hid" id="rb2"><span>Bungkusan</span><span>RM1.45</span></div>
  <div class="rl hid" id="rb3"><span>Masa awak</span><span>RM1.50</span></div>
  <div class="rl hid" id="rb4"><span>Elektrik oven</span><span>RM0.04</span></div>
  <div class="rl hid" id="rb5"><span>Sewa &amp; bil</span><span>RM0.76</span></div>
  <div class="rdash"></div>
  <div class="rl tot" id="rb6"><span>Jumlah kos</span><span>RM4.66</span></div>
  <div class="rl old" id="rb7"><span>Untung disangka</span><span class="strk">RM5.09<i id="strike"></i></span></div>
  <div class="rzig"></div>
 </div>
 <div class="stamp" id="stamp"><small>UNTUNG SEBENAR</small><b>RM1.34</b></div>
 </div>
</div>
<!-- S3 pain -->
<div class="scene" id="s3"><div class="ku" id="s3k">{ku('Tunjuk', 640)}</div>
 <div class="xlist">{xcard(0,'Kira guna agak')}{xcard(1,'Lupa kos bungkusan &amp; masa')}{xcard(2,'Tak tahu bila harga bahan naik')}</div></div>
<!-- S4 brand -->
<div class="scene" id="s4"><div class="center">
 <div class="appicon" id="s4i"><img src="data:image/png;base64,{b64(P+'/assets/flask.png')}"></div>
 <div class="kenal" id="s4a">Kenalkan</div>
 <div class="word" id="s4w"><img src="data:image/png;base64,{b64(P+'/assets/logo-dark.png')}" style="width:760px"></div>
 <div class="tag" id="s4b">Tahu untung sebenar setiap menu</div>
 <div class="verbs" id="s4c">Bahan · Kos · Untung · Harga</div>
 <div class="pill" id="s4d">Tanpa login · Guna offline</div>
</div></div>
<!-- S5 personas -->
<div class="scene" id="s5"><div class="h2" id="s5h"><mark>Sesuai untuk</mark></div>
 <div class="pgrid">{pcard(0,'kek','Kuih &amp; Kek')}{pcard(1,'nasi','Nasi &amp; Lauk')}{pcard(2,'air','Minuman')}{pcard(3,'frozen','Frozen &amp; Katering')}</div></div>
{phone_scene('s6')}{phone_scene('s7')}{phone_scene('s8')}{phone_scene('s9')}{phone_scene('s10')}
<!-- stepper -->
<div id="step"><span id="st0"><i>1</i>Bahan</span><span id="st1"><i>2</i>Kos</span><span id="st2"><i>3</i>Untung</span><span id="st3"><i>4</i>Harga</span></div>
<!-- S11 recap -->
<div class="scene" id="s11"><div class="h2" id="s11h"><mark>Ringkasnya</mark></div>
 <div class="rlist">{rcard(0,'Kira kos sebenar')}{rcard(1,'Tahu bila harga bahan naik')}{rcard(2,'Tak perlu pandai akaun')}</div></div>
<!-- S12 CTA -->
<div class="scene" id="s12"><div class="center cta">
 <div class="word" id="s12w"><img src="data:image/png;base64,{b64(P+'/assets/logo-dark.png')}" style="width:700px"></div>
 <div class="mula" id="s12a">Mula <mark>PERCUMA</mark></div>
 <div class="mula2" id="s12b">hari ini.</div>
 <div class="url" id="s12c">untunglab.space</div>
 <div class="small" id="s12d">Tanpa login · Guna offline · BM &amp; English</div>
</div><div class="ku kuc" id="s12k">{ku('Bagus!', 470)}</div></div>
<div id="caps">{''.join(cap_html)}</div>
'''

css = '''
@font-face{font-family:J;font-weight:500;src:url(assets/fonts/plus-jakarta-sans-latin-500-normal.woff2)}
@font-face{font-family:J;font-weight:600;src:url(assets/fonts/plus-jakarta-sans-latin-600-normal.woff2)}
@font-face{font-family:J;font-weight:700;src:url(assets/fonts/plus-jakarta-sans-latin-700-normal.woff2)}
@font-face{font-family:J;font-weight:800;src:url(assets/fonts/plus-jakarta-sans-latin-800-normal.woff2)}
@font-face{font-family:M;font-weight:600;src:url(assets/fonts/jetbrains-mono-latin-600-normal.woff2)}
@font-face{font-family:M;font-weight:800;src:url(assets/fonts/jetbrains-mono-latin-800-normal.woff2)}
*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1920px;overflow:hidden}
body{background:#EEF2EF;color:#0B1F21;font-family:J,sans-serif;position:relative}
.bgdots{position:absolute;inset:0;background-image:radial-gradient(#C9D6D3 1.6px,transparent 1.6px);background-size:36px 36px;opacity:.55}
.scene{position:absolute;inset:0;display:none}
mark{background:#75F8E8;color:#011416;padding:0 .18em;border-radius:.14em;box-decoration-break:clone;-webkit-box-decoration-break:clone}
/* receipt */
.rwrap{position:absolute;left:190px;top:300px;width:700px;height:1040px;perspective:1600px}
.rfront,.rback{position:absolute;left:0;top:0;width:700px;background:#FFFEF9;border-radius:22px 22px 0 0;padding:44px 52px 40px;box-shadow:0 30px 60px rgba(1,20,22,.14);font-family:M;font-weight:600}
.rh{display:flex;justify-content:space-between;font-size:24px;letter-spacing:.14em;color:#5B6E6F;border-bottom:3px solid #0B1F21;padding-bottom:22px;margin-bottom:22px}
.rl{display:flex;justify-content:space-between;font-size:42px;padding:16px 0}
.rl.hid span:first-child::before{content:"+ ";color:#DC2626}
.rl.hid{color:#B42318}
.rl.tot{font-weight:800;font-size:46px}
.rl.old{color:#7A8C8D}
.strk{position:relative}.strk i{position:absolute;left:-6px;right:-6px;top:50%;height:6px;background:#DC2626;border-radius:3px;transform-origin:left center}
.rdash{border-top:4px dashed #9FB1B1;margin:16px 0}
.rbig{display:flex;justify-content:space-between;align-items:baseline;padding-top:14px}
.rbig span{font-size:40px;font-weight:800}.rbig b{font-size:96px;font-weight:800;color:#0F766E;font-family:M}
.rzig{position:absolute;left:0;right:0;bottom:-26px;height:26px;background:linear-gradient(-45deg,transparent 13px,#FFFEF9 0) 0 0/26px 26px repeat-x,linear-gradient(45deg,transparent 13px,#FFFEF9 0) 0 0/26px 26px repeat-x}
.stamp{position:absolute;left:150px;top:820px;width:430px;padding:20px 0;border:8px solid #0F766E;border-radius:26px;text-align:center;color:#0F766E;background:rgba(117,248,232,.28);font-family:J}
.stamp small{display:block;font-size:30px;font-weight:800;letter-spacing:.12em}.stamp b{display:block;font-size:110px;font-weight:800;line-height:1}
/* pain */
.ku{position:absolute}
#s3k{left:-10px;top:760px}
.xlist{position:absolute;left:420px;top:560px;width:620px;display:flex;flex-direction:column;gap:28px}
.xc{background:#fff;border-radius:26px;padding:30px 30px;font-size:44px;font-weight:800;line-height:1.15;box-shadow:0 16px 40px rgba(1,20,22,.10);display:flex;gap:22px;align-items:center}
.xi{flex:0 0 62px;height:62px;border-radius:50%;background:#FEE2E2;color:#DC2626;display:flex;align-items:center;justify-content:center;font-size:38px}
/* brand */
.center{position:absolute;left:0;right:0;top:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding-bottom:260px}
.appicon{width:300px;height:300px;border-radius:72px;background:#011416;display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 30px 60px rgba(1,20,22,.25)}
.appicon img{height:190px;width:auto}
.kenal{margin-top:56px;font-size:52px;font-weight:700;color:#3E5556}
.word{margin-top:10px}
.tag{margin-top:34px;font-size:50px;font-weight:800;max-width:900px;line-height:1.15}
.verbs{margin-top:26px;font-size:40px;font-weight:600;color:#3E5556}
.pill{margin-top:40px;background:#75F8E8;color:#011416;font-family:M;font-weight:800;font-size:36px;padding:18px 40px;border-radius:999px}
/* personas */
.h2{position:absolute;left:0;right:0;top:300px;text-align:center;font-size:84px;font-weight:800}
.pgrid{position:absolute;left:110px;top:500px;width:860px;display:grid;grid-template-columns:1fr 1fr;gap:40px}
.pc{background:#fff;border-radius:34px;height:400px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;box-shadow:0 18px 44px rgba(1,20,22,.10)}
.pc svg{width:250px;height:250px}.pc b{font-size:44px;font-weight:800}
/* phone */
.ttl{position:absolute;left:50%;top:222px;transform:translateX(-50%);background:#75F8E8;color:#011416;font-size:64px;font-weight:800;padding:6px 26px;border-radius:14px;z-index:5;white-space:nowrap}
.phone{position:absolute;left:251px;top:300px;width:578px;height:1214px;border-radius:78px;background:#0B1214;padding:16px;box-shadow:0 40px 80px rgba(1,20,22,.28)}
.screen{position:relative;width:546px;height:1182px;border-radius:62px;overflow:hidden;background:#fff}
.scr{position:absolute;inset:0}.scr img{width:546px;height:1182px;display:block}
.notch{position:absolute;left:50%;top:30px;width:150px;height:40px;margin-left:-75px;border-radius:30px;background:#0B1214}
.hl{position:absolute;border:6px solid #14B8A6;border-radius:18px;background:rgba(117,248,232,.16);box-shadow:0 0 0 6px rgba(117,248,232,.45),0 0 40px rgba(20,184,166,.5)}
.float{position:absolute;right:26px;top:980px;min-width:250px;background:#fff;border-radius:28px;padding:22px 26px;box-shadow:0 24px 50px rgba(1,20,22,.22);z-index:6;border:5px solid #14B8A6}
.float small{display:block;font-size:28px;font-weight:700;color:#3E5556}.float b{display:block;font-size:60px;font-weight:800;line-height:1.05;color:#0F766E}
.float.red{border-color:#DC2626}.float.red b{color:#DC2626}
.float.org{border-color:#EA580C}.float.org b{color:#EA580C}
#s7f,#s10f{left:34px;right:auto}
#step{position:absolute;left:0;right:0;top:120px;display:flex;justify-content:center;gap:14px;z-index:8}
#step span{display:flex;align-items:center;gap:10px;background:#fff;border-radius:999px;padding:10px 24px 10px 12px;font-size:30px;font-weight:700;color:#5B6E6F;box-shadow:0 6px 16px rgba(1,20,22,.08)}
#step i{font-style:normal;width:40px;height:40px;border-radius:50%;background:#E2E8E6;display:flex;align-items:center;justify-content:center;font-size:24px}
#step span.on{background:#011416;color:#fff}#step span.on i{background:#75F8E8;color:#011416}
/* recap */
.rlist{position:absolute;left:120px;top:520px;width:840px;display:flex;flex-direction:column;gap:34px}
.rc{background:#fff;border-radius:30px;padding:40px 40px;font-size:52px;font-weight:800;display:flex;align-items:center;gap:30px;box-shadow:0 18px 44px rgba(1,20,22,.10)}
.rn{flex:0 0 90px;height:90px;border-radius:24px;background:#75F8E8;display:flex;align-items:center;justify-content:center;font-size:56px}
/* cta */
.cta{padding-bottom:520px}
.mula{margin-top:60px;font-size:132px;font-weight:800;line-height:1}
.mula2{font-size:132px;font-weight:800;line-height:1.1}
.url{margin-top:44px;background:#011416;color:#75F8E8;font-family:M;font-weight:800;font-size:56px;padding:20px 46px;border-radius:24px}
.small{margin-top:28px;font-size:34px;font-weight:600;color:#3E5556}
.kuc{left:305px;top:1110px}
/* captions */
.cap{position:absolute;left:70px;right:70px;top:1556px;text-align:center;font-size:56px;font-weight:800;line-height:1.3;display:none}
.cap .w{display:inline-block;opacity:0;padding:0 2px}
.cap .w.k.on{background:#75F8E8;border-radius:10px;padding:0 12px}
#caps{position:absolute;inset:0;z-index:20;pointer-events:none}
'''

# ---------- JS timeline ----------
js = []
J = js.append
J(f'const {{track,on,scenes,prog,clamp,E}}=ENG; ENG.setDur({DUR});')
J("scenes([['s1',0,12],['s3',12,18],['s4',18,23],['s5',23,28],['s6',28,36],['s7',36,44],['s8',44,52],['s9',52,58],['s10',58,64],['s11',64,69],['s12',69,74.5]]);")
# receipt front
J("track('#rf',[[0,{o:0,y:60,s:.96}],[0.15,{o:1,y:0,s:1},'outBack'],[3.5,{sx:1}],[3.8,{sx:0.02},'inCubic']]);")
J("track('#rf1',[[0.2,{o:0,x:-30}],[0.5,{o:1,x:0}]]);track('#rf2',[[0.7,{o:0,x:-30}],[1.0,{o:1,x:0}]]);track('#rf3',[[1.3,{o:0,s:.7}],[1.7,{o:1,s:1},'outBack']]);")
J("track('#rb',[[3.8,{o:0,sx:.02}],[3.81,{o:1,sx:.02}],[4.1,{sx:1},'outCubic']]);")
for i, t in enumerate([4.4, 5.2, 6.0, 6.8, 7.6], start=1):
    J(f"track('#rb{i}',[[{t},{{o:0,y:-50}}],[{t+0.3},{{o:1,y:0}},'outBack']]);")
J("track('#rb6',[[8.5,{o:0,s:.8}],[8.85,{o:1,s:1},'outBack']]);track('#rb7',[[9.0,{o:0}],[9.25,{o:1}]]);")
J("track('#strike',[[9.4,{sx:0}],[9.7,{sx:1},'outCubic']]);")
J("track('#stamp',[[10.0,{o:0,s:2.2,r:-14}],[10.25,{o:1,s:1,r:-8},'inCubic'],[11.95,{o:1}]]);")
# pain
J("track('#s3k',[[12,{o:0,x:-80}],[12.4,{o:1,x:0},'outCubic']]);")
for i, t in enumerate([12.6, 13.4, 14.2]):
    J(f"track('#x{i}',[[{t},{{o:0,x:80}}],[{t+0.35},{{o:1,x:0}},'outBack']]);")
# brand
J("track('#s4i',[[18.1,{o:0,s:.4}],[18.5,{o:1,s:1},'outBack']]);track('#s4a',[[18.6,{o:0,y:20}],[18.9,{o:1,y:0}]]);track('#s4w',[[18.8,{o:0,y:30}],[19.2,{o:1,y:0}]]);")
J("track('#s4b',[[19.6,{o:0,y:20}],[19.95,{o:1,y:0}]]);track('#s4c',[[20.4,{o:0}],[20.8,{o:1}]]);track('#s4d',[[21.2,{o:0,s:.6}],[21.55,{o:1,s:1},'outBack']]);")
# personas
J("track('#s5h',[[23.05,{o:0,y:30}],[23.4,{o:1,y:0}]]);")
for i, t in enumerate([23.5, 24.1, 24.7, 25.3]):
    J(f"track('#pc{i}',[[{t},{{o:0,s:.6}}],[{t+0.38},{{o:1,s:1}},'outBack']]);")
# phone scenes
for sid, (a, b) in SC_T.items():
    J(f"track('#{sid}t',[[{a+0.1},{{o:0,y:-20,s:.8}}],[{a+0.45},{{o:1,y:0,s:1}},'outBack']],{{base:'translateX(-50%)'}});")
    J(f"track('#{sid}p',[[{a},{{o:0,y:120}}],[{a+0.45},{{o:1,y:0}},'outCubic'],[{b-0.01},{{s:1.0}}]]);")
    for k, (n, t0, t1, hl) in enumerate(PH[sid]):
        J(f"track('#{sid}s{k}',[[{t0-0.01},{{o:0}}],[{t0+0.25},{{o:1}}],[{t1-0.01},{{o:1}}],[{t1},{{o:0}}]]);")
        for m, (*_, ton) in enumerate(hl):
            J(f"track('#{sid}h{k}_{m}',[[{ton},{{o:0,s:1.15}}],[{ton+0.3},{{o:1,s:1}},'outBack']]);")
J("track('#s7f',[[41.2,{o:0,s:.6}],[41.55,{o:1,s:1},'outBack']]);")
J("track('#s8f',[[48.2,{o:0,s:.6}],[48.55,{o:1,s:1},'outBack']]);")
J("track('#s9f',[[52.9,{o:0,s:.6}],[53.25,{o:1,s:1},'outBack']]);")
J("track('#s10f',[[60.4,{o:0,s:.6}],[60.75,{o:1,s:1},'outBack']]);")
# stepper
J("track('#step',[[0,{o:0}],[27.9,{o:0,y:-30}],[28.3,{o:1,y:0}],[63.7,{o:1}],[64.0,{o:0}]]);")
J("on(t=>{const idx=t<36?0:t<44?1:t<58?2:3;for(let i=0;i<4;i++)document.getElementById('st'+i).className=(i===idx?'on':'');});")
# recap
J("track('#s11h',[[64.05,{o:0,y:30}],[64.4,{o:1,y:0}]]);")
for i, t in enumerate([64.6, 65.4, 66.2]):
    J(f"track('#rc{i}',[[{t},{{o:0,x:-80}}],[{t+0.35},{{o:1,x:0}},'outBack']]);")
# cta
J("track('#s12w',[[69.05,{o:0,y:30}],[69.4,{o:1,y:0}]]);track('#s12a',[[69.5,{o:0,s:.7}],[69.85,{o:1,s:1},'outBack']]);track('#s12b',[[69.9,{o:0,y:20}],[70.2,{o:1,y:0}]]);")
J("track('#s12c',[[70.5,{o:0,s:.6}],[70.85,{o:1,s:1},'outBack']]);track('#s12d',[[71.1,{o:0}],[71.5,{o:1}]]);track('#s12k',[[69.6,{o:0,y:80}],[70.1,{o:1,y:0},'outCubic']]);")
# idle bob for Kak Untung
J("on(t=>{for(const id of ['s3k','s12k']){const e=document.getElementById(id); if(!e) continue; const sv=e.querySelector('svg'); sv.style.transform=`translateY(${Math.sin(t*2.4)*6}px)`;}});")
# captions
J(f"const CAPS={json.dumps([[a,b,len(t.split(' '))] for a,b,t in CAPS])};")
J("""on(t=>{CAPS.forEach(([a,b,n],i)=>{const c=document.getElementById('cap'+i);const vis=t>=a&&t<b;c.style.display=vis?'block':'none';if(!vis)return;
 const out=clamp((b-t)/0.18);c.style.opacity=out;
 for(let j=0;j<n;j++){const w=document.getElementById('c'+i+'w'+j);const p=prog(t,a+j*0.09,0.22,'outBack');w.style.opacity=clamp(p*1.4);w.style.transform=`translateY(${(1-p)*24}px) scale(${0.85+0.15*p})`;
  if(w.classList.contains('k')) w.classList.toggle('on',t>a+j*0.09+0.12);}});});""")
J('renderAt(0);')

page = f'''<!doctype html><html><head><meta charset="utf-8"><style>{css}</style></head><body>{body}
<script>{open(P+'/engine.js').read()}</script><script>{chr(10).join(js)}</script></body></html>'''
open(P + '/scene.html', 'w').write(page)
print('ok', len(page))
