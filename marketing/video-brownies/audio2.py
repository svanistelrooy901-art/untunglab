import numpy as np, wave, json
from scipy.signal import butter, sosfilt, fftconvolve
SR=44100; T=125.0; N=int(SR*T)
rng=np.random.default_rng(11)
cfg=json.load(open('cfg.json'))
L=np.zeros(N);R=np.zeros(N)
def lp(x,f): return sosfilt(butter(2,f,'low',fs=SR,output='sos'),x)
def hp(x,f): return sosfilt(butter(2,f,'high',fs=SR,output='sos'),x)
def bp(x,a,b): return sosfilt(butter(2,[a,b],'band',fs=SR,output='sos'),x)
def add(sig,t,g=1.0,pan=0.0):
    i=int(t*SR)
    if i<0 or i>=N: return
    sig=sig[:N-i]*g; a=np.cos((pan+1)*np.pi/4); b=np.sin((pan+1)*np.pi/4)
    L[i:i+len(sig)]+=sig*a*1.41; R[i:i+len(sig)]+=sig*b*1.41
def env(n,a=.004,r=.2):
    e=np.ones(n);na=max(1,int(a*SR));e[:na]=np.linspace(0,1,na);nr=min(n,int(r*SR));e[-nr:]*=np.linspace(1,0,nr)**2;return e
def mid(n): return 440*2**((n-69)/12)
def tone(f,d,kind='sine',a=.004,r=.2):
    t=np.arange(int(d*SR))/SR
    if kind=='sine': y=np.sin(2*np.pi*f*t)
    elif kind=='pluck': y=(np.sin(2*np.pi*f*t)+.4*np.sin(4*np.pi*f*t)*np.exp(-t*8)+.2*np.sin(6*np.pi*f*t)*np.exp(-t*12))*np.exp(-t*5)
    elif kind=='bass': y=(np.sin(2*np.pi*f*t)+.5*np.sin(4*np.pi*f*t)+.3*np.sin(6*np.pi*f*t))*np.exp(-t*3.2)
    elif kind=='pad': y=sum(np.sin(2*np.pi*f*(1+k)*t) for k in(-.004,0,.004))/3
    elif kind=='bell': y=(np.sin(2*np.pi*f*t)+.5*np.sin(2*np.pi*f*2.76*t)*np.exp(-t*6))*np.exp(-t*4)
    return y*env(len(t),a,r)
BPM=100; beat=60/BPM
prog=[(57,[57,60,64]),(53,[53,57,60]),(48,[52,55,60]),(55,[55,59,62])]
def kick(t,g=.5):
    x=np.arange(int(.28*SR))/SR;f=110*np.exp(-x*24)+42;ph=2*np.pi*np.cumsum(f)/SR;add(np.tanh(np.sin(ph)*1.4)*np.exp(-x*11),t,g)
def hat(t,g=.07):
    x=np.arange(int(.05*SR))/SR;add(hp(rng.standard_normal(len(x)),7000)*np.exp(-x*100),t,g,pan=.3)
def clap(t,g=.14):
    x=np.arange(int(.2*SR))/SR;add(bp(rng.standard_normal(len(x)),900,3500)*np.exp(-x*26),t,g)
# sections: (start,end,level) level 0 pad only,1 light,2 groove,3 strong
secs=[(0,8,0),(8,70,1),(70,78.5,0),(78.5,86,3),(86,118,2),(118,125,3)]
def level(t):
    for a,b,l in secs:
        if a<=t<b: return l
    return 1
bars=int(T/(beat*4))+1
for b in range(bars):
    t0=b*beat*4
    if t0>=T: break
    root,ch=prog[b%4];lv=level(t0)
    for n in ch: add(tone(mid(n+12),beat*4,'pad',a=.5,r=.6),t0,.06 if lv else .05)
    if lv>=1:
        for k in range(8): add(tone(mid(root-12),beat*.5,'bass',r=.1),t0+k*beat/2,.2 if lv<3 else .26)
        arp=[ch[0],ch[1],ch[2],ch[1]+12,ch[2],ch[1],ch[0]+12,ch[1]]
        for k,n in enumerate(arp): add(tone(mid(n+12),.4,'pluck'),t0+k*beat/2,.1 if lv==1 else .14,pan=(-.35 if k%2 else .35))
    for k in range(4):
        tt=t0+k*beat
        if lv>=2 and tt<T-1: kick(tt,.45 if lv==2 else .55); hat(tt+beat/2)
        if lv>=2 and k%2==1: clap(tt,.14)
        if lv==1 and k%2==0: kick(tt,.18)
        if lv==1: hat(tt+beat/2,.04)
def whoosh(t,d=.45,g=1.3):
    n=int(d*SR);x=rng.standard_normal(n);y=np.zeros(n);a=np.linspace(.02,.5,n);s=0
    for i in range(n): s+=a[i]*(x[i]-s);y[i]=s
    y*=np.sin(np.linspace(0,np.pi,n))**1.5;add(y,t,g)
def pop(t,f=700,g=.3):
    x=np.arange(int(.12*SR))/SR;add(np.sin(2*np.pi*(f+f*2*np.exp(-x*40))*x)*np.exp(-x*30),t,g)
def tick(t,f=1400,g=.1):
    x=np.arange(int(.03*SR))/SR;add(np.sin(2*np.pi*f*x)*np.exp(-x*150)+.4*hp(rng.standard_normal(len(x)),3000)*np.exp(-x*200),t,g,pan=-.1)
def ding(t,f=1318,g=.22):
    add(tone(f,.7,'bell',r=.5),t,g); add(tone(f*1.5,.5,'sine',r=.4)*np.exp(-np.arange(int(.5*SR))/SR*7),t+.04,g*.5)
def boom(t,g=.7):
    x=np.arange(int(1.2*SR))/SR;f=70*np.exp(-x*2.5)+35;ph=2*np.pi*np.cumsum(f)/SR;add(np.sin(ph)*np.exp(-x*3.2),t,g)
    add(lp(rng.standard_normal(len(x)),600)*np.exp(-x*5),t,.3)
def stamp(t):
    x=np.arange(int(.25*SR))/SR;add(np.sin(2*np.pi*(180*np.exp(-x*30)+60)*x)*np.exp(-x*18),t,.6);add(hp(rng.standard_normal(len(x)),1500)*np.exp(-x*40),t,.2)
def riser(t,d):
    n=int(d*SR);x=rng.standard_normal(n);env_=np.linspace(0,1,n)**2.2;y=bp(x,800,6000)*env_;add(y,t,.5)
    add(np.sin(2*np.pi*np.cumsum(np.linspace(200,1200,n))/SR)*env_*.25,t,.3)
for c in cfg['scenes']:
    s=c['start']
    if s>0: whoosh(s-.22)
    for b in c.get('bubbles',[]): pop(s+b[0]+.04,820+60*(hash(b[2])%5))
    for ch in c.get('chips',[]): ding(s+ch[0]+.05,1568,.2)
    if c['kind']=='phone':
        for k,(t,n) in enumerate(c['states']):
            if t>0.2: tick(s+t,1300+(k%3)*120)
    if c['id']=='hook':
        for t in (.3,1.0): add(np.sin(2*np.pi*80*np.arange(int(.2*SR))/SR)*np.exp(-np.arange(int(.2*SR))/SR*14),s+t,.5)
        boom(s+1.8,.55)
    if c['id']=='rev1': riser(s+4.0,3.0)
    if c['id']=='rev2':
        pop(s+1.5,500,.45); boom(s+1.5,.35)
        stamp(s+2.6); boom(s+2.75,.8); ding(s+2.8,1046,.3); ding(s+2.95,1568,.2)
        # low sad->bright motif
        for k,n in enumerate([60,64,67,72]): add(tone(mid(n+12),.5,'bell',r=.4),s+3.1+k*.14,.12)
    if c['id']=='harga':
        for k in range(4): pop(s+.7+k*.55+.1,900+k*110,.22)
        pop(s+5.3,600,.3)
    if c['id']=='volum':
        for k in range(5): tick(s+.9+k*.4,900+k*200,.14)
    if c['id']=='end':
        for k,n in enumerate([69,73,76,81]): ding(s+1.0+k*.12,mid(n+12),.18)
        ding(s+2.3,1568,.3)
# master
fo=np.ones(N);fi=int(.6*SR);fo[:fi]=np.linspace(0,1,fi);fo[-int(2*SR):]=np.linspace(1,0,int(2*SR))
x=np.stack([L,R],1)
for ch in (0,1):
    y=x[:,ch]; y=hp(y,40); y=y-0.5*lp(y,130)+0.0*y; x[:,ch]=y
x=np.tanh(x*1.05)*fo[:,None]
m=np.abs(x).max();x=x/m*.88
pcm=(x*32767).astype('<i2')
w=wave.open('mix_raw.wav','w');w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes(pcm.tobytes());w.close()
print('audio ok')
