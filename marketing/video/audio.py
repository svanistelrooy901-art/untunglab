import numpy as np, wave
SR=44100; T=45.0; N=int(SR*T)
rng=np.random.default_rng(7)
L=np.zeros(N);R=np.zeros(N)
def add(sig,t,pan=0.0,g=1.0):
    i=int(t*SR); 
    if i>=N: return
    sig=sig[:N-i]*g
    L[i:i+len(sig)]+=sig*(1-max(0,pan)); R[i:i+len(sig)]+=sig*(1+min(0,pan))
def env(n,a=.005,r=.2):
    e=np.ones(n);na=max(1,int(a*SR));e[:na]=np.linspace(0,1,na)
    nr=min(n,int(r*SR));e[-nr:]*=np.linspace(1,0,nr)**2;return e
def tone(f,d,kind='sine',a=.005,r=.2):
    t=np.arange(int(d*SR))/SR
    if kind=='sine': y=np.sin(2*np.pi*f*t)
    elif kind=='pluck': y=(np.sin(2*np.pi*f*t)+.4*np.sin(4*np.pi*f*t)*np.exp(-t*8)+.2*np.sin(6*np.pi*f*t)*np.exp(-t*12))*np.exp(-t*5)
    elif kind=='saw': y=2*((f*t)%1)-1;y=y*.5
    elif kind=='pad': y=sum(np.sin(2*np.pi*f*(1+d_)*t) for d_ in(-.004,0,.004))/3
    return y*env(len(t),a,r)
def mid(n): return 440*2**((n-69)/12)
BPM=108;beat=60/BPM
# chords: Am F C G per 4 beats*2
prog=[(57,[57,60,64]),(53,[53,57,60]),(48,[52,55,60]),(55,[55,59,62])]
bars=int(T/(beat*4))+1
for b in range(bars):
    root,ch=prog[b%4];t0=b*beat*4
    if t0>=T:break
    for n in ch: add(tone(mid(n+12),beat*4,'pad',a=.4,r=.5),t0,g=.07)
    for k in range(8):
        add(tone(mid(root-12),beat*.45,'sine',r=.1),t0+k*beat/2,g=.28)
    arp=[ch[0],ch[1],ch[2],ch[1]+12,ch[2],ch[1],ch[0]+12,ch[1]]
    if t0>=4:
        for k,n in enumerate(arp): add(tone(mid(n+12),.35,'pluck'),t0+k*beat/2,pan=(-.3 if k%2 else .3),g=.14)
def kick(t):
    x=np.arange(int(.25*SR))/SR;f=120*np.exp(-x*22)+45;ph=2*np.pi*np.cumsum(f)/SR
    add(np.sin(ph)*np.exp(-x*12),t,g=.55)
def hat(t,g=.08):
    x=np.arange(int(.05*SR))/SR;add(rng.standard_normal(len(x))*np.exp(-x*90),t,g=g)
def clap(t):
    x=np.arange(int(.18*SR))/SR;add(rng.standard_normal(len(x))*np.exp(-x*28),t,g=.18)
for k in range(int(T/beat)):
    t=k*beat
    if t<4: continue
    if t<T-4: 
        kick(t)
        if k%2==1: clap(t)
        hat(t+beat/2)
    elif k%4==0: kick(t)
def whoosh(t,d=.5,up=True):
    n=int(d*SR);x=rng.standard_normal(n);
    from numpy.fft import rfft,irfft
    # simple moving band: modulate lowpass by cumulative smoothing
    y=np.zeros(n);a=np.linspace(.02,.5,n) if up else np.linspace(.5,.02,n);s=0
    for i in range(n): s+=a[i]*(x[i]-s);y[i]=s
    y*=np.sin(np.linspace(0,np.pi,n))**1.5;add(y,t,g=1.6)
def pop(t,f=700):
    x=np.arange(int(.12*SR))/SR;add(np.sin(2*np.pi*(f+f*2*np.exp(-x*40))*x)*np.exp(-x*30),t,g=.35)
def ding(t,f=1318):
    add(tone(f,.6,'sine',r=.5)*np.exp(-np.arange(int(.6*SR))/SR*5),t,g=.25)
    add(tone(f*1.5,.5,'sine',r=.4)*np.exp(-np.arange(int(.5*SR))/SR*7),t+.05,g=.12)
def buzz(t):
    add(tone(110,.35,'saw',a=.01,r=.15),t,g=.3)
sc={'hook':0,'calc':4,'real':8,'reass':12,'templ':16,'menu':21,'price':28,'offl':32,'dash':36,'end':41}
for k,v in sc.items():
    if v>0: whoosh(v-.25,.4)
# mascot arrivals (pops)
for t in [.4+.9,4.5+.9,8.6+.9,10.9+.8,12.5+.9,16.5+.9,19.2+.8,21.5+.9,24.5+.8,28.7+.9,32.5+.9,36.4+.9,37.9+.8,39.2+.8,41.5+.9]: pop(t)
# hook pain
add(tone(80,1.2,'sine',r=.8),1.6,g=.3)
# list rows ticks
for lt in [1.0,1.4,2.0,2.4]: pop(4+lt,900)
for lt in [.9,1.4,1.9,2.5,2.8]: pop(8+lt,820)
buzz(8+3.3)
# checkmarks templ
for k in range(6): ding(16+1.0+k*.35,1046+k*60)
# menu: fields ticks, result
for lt in [.2,.42,.64,.86,1.08]: pop(21+lt,1000)
add(np.zeros(1),0)
buzz(21+3.6)
# dash
for k in range(4): pop(36+2.1+k*.15,900+k*80)
ding(36+2.0,880)
# end: chime rise + button
for k,n in enumerate([69,73,76,81]): ding(41+.2+k*.18,mid(n+12))
ding(41+2.7,1568)
# master: fades, normalise
fo=np.ones(N);fi=int(.5*SR);fo[:fi]=np.linspace(0,1,fi);fo[-int(1.5*SR):]=np.linspace(1,0,int(1.5*SR))
# duck-less soft clip
def fin(x):
    x=np.tanh(x*1.1)*fo;return x
L=fin(L);R=fin(R);m=max(abs(L).max(),abs(R).max());L/=m/.89;R/=m/.89
st=np.stack([L,R],1);pcm=(st*32767).astype('<i2')
w=wave.open('audio.wav','wb');w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes(pcm.tobytes());w.close()
print('ok')
