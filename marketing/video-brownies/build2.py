import json,os
os.chdir('/tmp/cs'); exec(open('gen.py').read().split("hero=svg")[0]); os.chdir('/tmp/vid2')
INKC="#011416";M="#75F8E8";T="#0E8F86"
# --- eyes blink variant
_eyes=eyes
def eyes(e):
    if e=='blink':
        return f'<path d="M96 120 Q104 124 112 120" stroke="{INK}" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M128 120 Q136 124 144 120" stroke="{INK}" stroke-width="3.2" fill="none" stroke-linecap="round"/>'
    return _eyes(e)
def head_(e):
    base='happy' if e=='blink' else e
    h=f'<ellipse cx="120" cy="118" rx="42" ry="48" fill="{SKIN}" stroke="{HJ}" stroke-width="8"/>'
    h+=f'<path d="M77 104 C80 62 160 62 163 104 C150 84 90 84 77 104Z" fill="{HJ_L}"/>'
    h+=f'<ellipse cx="92" cy="133" rx="8" ry="5" fill="{BLUSH}" opacity=".55"/><ellipse cx="148" cy="133" rx="8" ry="5" fill="{BLUSH}" opacity=".55"/>'
    h+=f'<path d="M118 124 Q122 130 117 132" stroke="{SKIN_D}" stroke-width="2.2" fill="none" stroke-linecap="round"/>'
    return h+brows(base)+eyes(e)+mouth(base)
head=head_
def kus(pairs):
    out=''
    for p,e in pairs:
        for ee in (e,'blink'):
            out+=f'<div class="ku" data-k="{p}|{e}" data-b="{1 if ee=="blink" else 0}" style="display:none">{svg(FIG,figure(p,ee),label="Kak Untung")}</div>'
    return out
IMG=lambda n:f'assets/{n}.png'
scenes=[];cfg={"scenes":[]}
def add(id,start,dur,html,**kw):
    scenes.append(f'<section class="scene" id="sc-{id}" style="display:none">{html}</section>')
    cfg["scenes"].append(dict(id=id,start=start,dur=dur,**kw))
def phone_scene(id,start,dur,tag,title,states,bubbles,chips,kupairs,kusched,extra='',card=None):
    st=''.join(f'<img class="st" src="{IMG(n)}" data-n="{n}" style="opacity:0">' for n,_ in states)
    ph=f'<div class="phone">{st}</div>'
    capb=f'<div class="cap"><div class="tag">{tag} &middot; SKRIN SEBENAR</div><div class="ttl">{title}</div></div>'
    bub='<div class="bubble" id="b-'+id+'"></div>'
    chs=''.join(f'<div class="chip" id="c-{id}-{i}" style="opacity:0">{c[2]}</div>' for i,c in enumerate(chips))
    html=f'<div class="bg"></div>{capb}{ph}{chs}{extra}{bub}<div class="kuwrap">{kus(kupairs)}</div>'
    add(id,start,dur,html,kind="phone",states=[[t,n] for n,t in states],bubbles=bubbles,chips=[[c[0],c[1]] for c in chips],ku=kusched)
# S1 hook
hook=f'<div class="bg dark"></div><div class="hk"><div class="hk0">JOM KIRA KOS BROWNIES</div><div class="hk1" id="hk1">Jual brownies RM6.</div><div class="hk2" id="hk2">Untung RM5.09?</div></div><div class="big" id="hkbig">RM5.09<span> / unit?</span></div><div class="hk3" id="hk3">Bahan RM0.91. Jual RM6. Nampak senang kan...</div><div class="bubble" id="b-hook"></div><div class="kuwrap kw170">'+kus([('wave','think')])+'</div>'
add('hook',0,8,hook,kind="hook",bubbles=[[2.6,6.5,"Betul ke?"]],ku=[[0,"wave|think"]])
# S2
s2=[('s2_0',0),('s2_1',1.4),('s2_2',2.5),('s2_3',3.9),('s2_4',5.4),('s2_5',6.9)]
phone_scene('menu',8,10,'CARA MULA','Isi nama, hasil, harga jual',s2,[[0.8,4.6,"Isi nama, hasil, harga jual."],[7.2,9.6,"Siap. Senang je."]],[],[('point','happy')],[[0,"point|happy"]])
# S3
s3=[];ing_t=[]
for i in range(5):
    b=0.3+3.4*i; s3+= [(f's3_{i}a',b),(f's3_{i}b',b+1.0),(f's3_{i}c',b+2.0)]
phone_scene('bahan',18,18,'LANGKAH 1','Isi bahan satu-satu',s3,[[0.8,4.5,"Satu-satu masuk."],[6.5,10,"Harga pek, berapa guna."],[11.5,15,"App kira kos sendiri."],[16.3,17.9,"Lima bahan siap."]],[(15.9,17.95,'<b>Jumlah bahan</b><br><span class="big2">RM18.22</span> sebatch<br><small>RM18.22 &divide; 20 = RM0.91 seunit</small>')],[('phone','happy'),('point','happy')],[[0,"phone|happy"],[11,"point|happy"]])
# S4
s4=[(f's4_{i}',0.4+2.1*i) for i in range(4)]
phone_scene('pack',36,10,'LANGKAH 2','Jangan lupa packaging',s4,[[0.8,3.5,"Ramai lupa yang ni."],[8.0,9.8,"Semua kos."]],[(8.7,9.95,'<b>Packaging seunit</b><br><span class="big2">RM1.45</span><br><small>RM1.00 + 0.15 + 0.10 + 0.20</small>')],[('point','wow'),('point','happy')],[[0,"point|wow"],[7.8,"point|happy"]])
# S5
s5=[('s5_0',0.3),('s5_1',1.8),('s5_2',3.3),('s5_menulist_incomplete',6.0),('s5_ko_0',8.0),('s5_ko_1',9.2),('s5_ko_2',10.6),('s5_ko_3',12.0)]
phone_scene('upah',46,14,'LANGKAH 3','Masa dan oven pun kos',s5,[[0.8,3.2,"Oven pun ada kos."],[6.3,7.9,"Nilai masa kosong?"],[9.6,13.8,"Kerja kita ada nilai."]],[(4.0,5.9,'<b>Elektrik oven</b><br><span class="big2">RM0.75</span> sebatch<br><small>2kW &times; 45 min &times; RM0.50</small>'),(10.2,13.9,'<b>Upah sebatch</b><br><span class="big2">RM30.00</span><br><small>RM15 / jam &times; 2 jam</small>')],[('phone','happy'),('point','think'),('phone','happy')],[[0,"phone|happy"],[6.0,"point|think"],[9.0,"phone|happy"]])
# S6
s6=[('s6_0',0.3),('s6_1',2.0),('s6_2',4.2)]
phone_scene('sewa',60,10,'LANGKAH 4','Sewa ruang kerja',s6,[[0.8,3.4,"Sewa pun kena masuk."],[8.3,9.8,"Semua dah masuk."]],[(5.0,7.9,'<b>Sewa ruang kerja</b><br><span class="big2">RM300</span> sebulan<br><small>RM1,500 &times; 20%</small>'),(8.0,9.95,'<b>Seunit</b><br><span class="big2">RM0.75</span><br><small>RM300 &divide; 400 biji</small>')],[('point','think'),('point','happy')],[[0,"point|think"],[8.1,"point|happy"]])
# S7a
s7=[('s7_list',0.3),('s7_0',2.2),('s7_1',4.2)]
phone_scene('rev1',70,7,'REVEAL','Untung sebenar sebiji?',s7,[[0.6,2.1,"Jom tengok hasilnya."],[4.6,6.9,"Untung sebenar berapa ya?"]],[],[('wave','think')],[[0,"wave|think"]])
# S7b
pop=f'<div class="pop" id="pop7"><div class="p1">KALAU TAK MASUK SEMUA KOS</div><div class="p2">Untung RM5.09 &middot; 84.8%</div><div class="pr" id="pr7"><div class="p3">UNTUNG SEBENAR</div><div class="p4">RM1.35</div><div class="p5">22.5% &middot; RM540 sebulan</div></div></div>'
phone_scene('rev2',77,9,'REVEAL','Untung sebenar sebiji?',[('s7_1',0),('s7_2',5.0)],[[2.6,8.8,"Bukan RM5.09. Cuma RM1.35."]],[],[('wave','think'),('wave','wow')],[[0,"wave|think"],[1.5,"wave|wow"]],extra=pop)
# S8 graphic
rows=''.join(f'<div class="tr" id="tr{i}"><span>Margin {a}</span><b>{b}</b></div>' for i,(a,b) in enumerate([('20%','RM5.81'),('30%','RM6.64'),('40%','RM7.75'),('50%','RM9.30')]))
s8=f'<div class="bg dark"></div><div class="cap dk"><div class="tag">BAHAGIAN 7 &middot; GRAFIK</div><div class="ttl wh">Nak margin berapa? Jual berapa?</div></div><div class="tbl">{rows}</div><div class="mk" id="mk"><b>Markup bukan margin.</b><br>RM4.65 &times; 1.30 = RM6.05<br>Itu markup 30%, margin cuma 23.1%.</div><div class="bubble dk" id="b-harga"></div><div class="kuwrap">'+kus([('point','proud')])+'</div>'
add('harga',86,14,s8,kind="harga",bubbles=[[1.0,4.8,"Kira ikut formula."],[9.8,13.5,"Bukan tekaan."]],ku=[[0,"point|proud"]])
# S9 volume
vv=[('100',3.00),('200',1.50),('400',0.75),('600',0.50),('1,000',0.30)]
bars=''.join(f'<div class="vr" id="vr{i}"><div class="vl">{a}</div><div class="vt"><div class="vb" data-w="{v/3*100:.0f}"></div></div><div class="vv">RM{v:.2f}</div></div>' for i,(a,v) in enumerate(vv))
appbar=f'<div class="appbar"><span>Kira dengan bijak, untung<br>dengan yakin</span><img src="assets/logo.png"></div>'
s9=f'<div class="bg"></div>{appbar}<div class="cap" style="top:58px"><div class="tag">BAHAGIAN 8</div><div class="ttl">Jual lebih, sewa seunit turun</div></div><div class="vcard"><div class="vh">Kos sewa seunit (RM300 sebulan)</div>{bars}<div class="vn">Tukar Anggaran Jualan, app kira semula.</div></div><div class="bubble" id="b-volum"></div><div class="kuwrap">'+kus([('wave','proud')])+'</div>'
add('volum',100,10,s9,kind="volum",bubbles=[[1.2,4.5,"Makin laku,"],[4.6,8.5,"makin jimat."]],ku=[[0,"wave|proud"]])
# S10
phone_scene('dash',110,8,'DASHBOARD','Semua menu, satu skrin',[('s10_0',0),('s10_1',4.0)],[[0.8,3.6,"Semua menu, satu skrin."],[4.4,7.6,"Nampak yang rugi terus."]],[],[('phone','happy')],[[0,"phone|happy"]])
# S11
end=f'<div class="bg dark"></div><div class="en1" id="en1">Kira betul.<br>Untung <span>jelas.</span></div><div class="enc" id="enc">Mula percuma hari ini</div><img class="enl" id="enl" src="assets/logo-penuh.png"><div class="kuwrap kw170">'+kus([('wave','proud')])+'</div>'
add('end',118,7,end,kind="end",bubbles=[],ku=[[0,"wave|proud"]])
css=open('style2.css').read()
js=open('engine2.js').read()
html=f'<!doctype html><html lang="ms"><head><meta charset="utf-8"><title>UntungLab Brownies</title><style>@font-face{{font-family:Inter;src:url(assets/inter.woff2) format("woff2");font-weight:100 900}}{css}</style></head><body><div id="stage">{"".join(scenes)}</div><script>const CFG={json.dumps(cfg)};{js}</script></body></html>'
open('video2.html','w').write(html); json.dump(cfg,open('cfg.json','w'))
print(len(html),sum(c['dur'] for c in cfg['scenes']))
