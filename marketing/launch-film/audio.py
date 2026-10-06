import numpy as np, wave
sr=44100;D=68;n=sr*D;L=np.zeros(n);R=np.zeros(n)
def add(t,x,pan=0):
    i=int(t*sr);x=x[:n-i];L[i:i+len(x)]+=x*(1-max(pan,0));R[i:i+len(x)]+=x*(1+min(pan,0))
def padd(*xs):
    m=max(len(x) for x in xs);o=np.zeros(m)
    for x in xs:o[:len(x)]+=x
    return o
def tt(d):return np.arange(int(d*sr))/sr
def tone(f,d,a=.3,dec=6):t=tt(d);return a*np.sin(2*np.pi*f*t)*np.exp(-dec*t)*np.minimum(1,t/.005)
def noise(d,a=.3,f0=200,f1=6000,up=True):
    t=tt(d);x=np.random.randn(len(t));X=np.fft.rfft(x);fr=np.fft.rfftfreq(len(t),1/sr)
    c=np.linspace(f0,f1,len(X)) if False else None
    X[(fr<f0)|(fr>f1)]=0;x=np.fft.irfft(X,len(t));env=(t/d)**2 if up else np.exp(-5*t/d)
    return a*x/np.abs(x).max()*env*np.minimum(1,(d-t)/.05+0)
rng=np.random.default_rng(1)
# bed: soft pad with beat
for sec in range(D):
    dark=sec<13 or sec>=62
    base=[55,55,49,58][(sec//4)%4]*(1 if dark else 2)
    add(sec,tone(base,1.2,.12,1.5))
    if not dark:
        add(sec+.0,tone(110,.2,.08,18));add(sec+.5,tone(165,.15,.04,20))
        if sec%2==0:
            k=tt(.25);add(sec,0.25*np.sin(2*np.pi*(120*np.exp(-12*k)+40)*k)*np.exp(-9*k))
def whoosh(t,d=.9,a=.35):add(t,noise(d,a,300,7000,True))
def click(t):add(t,padd(tone(1800,.05,.12,80),tone(900,.08,.08,50)))
def pop(t,f=700):add(t,padd(tone(f,.18,.2,18),tone(f*2,.1,.08,30)))
def ding(t):add(t,padd(tone(1320,1.4,.25,2.5),tone(1980,1.2,.12,3),tone(2640,.8,.06,4)))
add(2.95,tone(520,.2,.12,14));add(3.1,tone(620,.3,.1,10))
add(8.4,noise(.55,.3,2000,9000,False));add(8.4,tone(90,.4,.2,8))
add(9.0,noise(.35,.3,3000,12000,False));add(9.0,tone(1500,.2,.08,30))
add(8.6,noise(1.2,.3,200,5000,True))
pop(9.9,500);add(9.9,tone(65,1.5,.35,2))
whoosh(13.0,1.4,.4);add(14.2,padd(tone(784,1.6,.18,2.4),tone(988,1.4,.12,2.6),tone(1175,1.2,.1,3)))
for t in [19.4,21.4,24.6,29,31,34,37.8,41,42.4,44.2,46.8,47.4,56,57.3]:click(t)
for t in [21.4,24.6,31,34,42.4,44.2,47.4,57.3]:pop(t,800)
for t in [49.4,51.8,53.8]:pop(t,650);click(t-.05)
whoosh(18.9,.9,.3);whoosh(29,.5,.2);whoosh(38,.5,.2);whoosh(47,.5,.2);whoosh(56,.5,.2)
whoosh(61.6,1.0,.35);add(63.2,tone(98,1.5,.3,2));ding(64.8)
f=np.ones(n)
f[:sr]*=np.linspace(0,1,sr);f[-sr*2:]*=np.linspace(1,0,sr*2)
st=np.stack([L*f,R*f],1);st=st/np.abs(st).max()*.8
w=wave.open('audio.wav','wb');w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes((st*32767).astype('<i2').tobytes());w.close()
