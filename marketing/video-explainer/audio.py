import numpy as np, soundfile as sf, json, re
from scipy.signal import butter, sosfilt, fftconvolve
SR = 48000; DUR = 74.5; N = int(SR * DUR); rng = np.random.default_rng(7)
BPM = 110; b = lambda n: n * 60 / BPM
def tt(d): return np.arange(int(SR * d)) / SR
def lp(x, f): return sosfilt(butter(4, f, 'lp', fs=SR, output='sos'), x)
def hp(x, f): return sosfilt(butter(4, f, 'hp', fs=SR, output='sos'), x)
def bp(x, a, c): return sosfilt(butter(2, [a, c], 'bp', fs=SR, output='sos'), x)
def env(n, a=0.004, d=0.2):
    t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)
def place(buf, sig, t0, g=1.0, pan=0.0):
    i = int(t0 * SR); n = min(len(sig), N - i)
    if n <= 0 or i < 0: return
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i:i + n, 0] += sig[:n] * g * l; buf[i:i + n, 1] += sig[:n] * g * r
mid = lambda m: 440 * 2 ** ((m - 69) / 12)
IR = rng.standard_normal(int(SR * 1.4)) * np.exp(-np.arange(int(SR * 1.4)) / (SR * 0.35)); IR = lp(IR, 5000); IR /= np.abs(IR).sum() / 6
def reverb(x, wet=0.18): return x + wet * np.stack([fftconvolve(x[:, c], IR)[:len(x)] for c in range(2)], 1)

# instruments
def kick(): t = tt(0.32); f = 45 + 75 * np.exp(-t / 0.045); return np.tanh(2 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.12))
def hat(): n = int(SR * 0.05); return hp(rng.standard_normal(n), 7500) * env(n, 0.001, 0.015)
def clap():
    n = int(SR * 0.25); x = np.zeros(n)
    for d in (0, 0.011, 0.022): i = int(d * SR); m = n - i; x[i:] += bp(rng.standard_normal(m), 900, 3200) * env(m, 0.001, 0.05 if d < 0.02 else 0.12)
    return x * 0.6
def pluck(f, d=0.45):
    t = tt(d); x = sum(np.sin(2 * np.pi * f * k * t) / k ** 1.6 for k in range(1, 6)); return x * env(len(t), 0.002, 0.16)
def marimba(f, d=0.6):
    t = tt(d); return (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 3.98 * t) * np.exp(-t / 0.03)) * env(len(t), 0.002, 0.22)
def bass(f, d=0.4):
    t = tt(d); x = np.sin(2 * np.pi * f * t) + 0.6 * np.sin(4 * np.pi * f * t) + 0.35 * np.sin(6 * np.pi * f * t); return np.tanh(1.4 * x) * env(len(t), 0.004, 0.18)
def pad(fs, d):
    t = tt(d); x = sum(np.sin(2 * np.pi * f * (1 + dt) * t + p) for f in fs for dt, p in ((0, 0), (0.004, 1), (-0.004, 2)))
    a = np.minimum(1, t / 0.4) * np.minimum(1, (d - t) / 0.4); return lp(x, 1800) * a / (3 * len(fs))
def bell(f, d=1.2):
    t = tt(d); m = np.sin(2 * np.pi * f * 3.5 * t) * 2.2 * np.exp(-t / 0.15); return np.sin(2 * np.pi * f * t + m) * env(len(t), 0.002, 0.35)
def pop(): t = tt(0.12); f = 900 * np.exp(-t / 0.03) + 300; return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.001, 0.035)
def click(): n = int(SR * 0.03); return bp(rng.standard_normal(n), 2000, 6000) * env(n, 0.0005, 0.006)
def plip(f=1800): t = tt(0.15); return np.sin(2 * np.pi * f * t) * env(len(t), 0.001, 0.05)
def whoosh(d=0.5):
    n = int(SR * d); x = rng.standard_normal(n); t = np.arange(n) / n; out = np.zeros(n); seg = 2400
    for i in range(0, n, seg):
        c = 500 + 3500 * np.sin(np.pi * t[i]) ** 2; out[i:i + seg] = bp(x[i:i + seg], c * 0.6, min(c * 1.6, 20000))[:len(out[i:i + seg])]
    return lp(out * np.sin(np.pi * t) ** 1.5, 9000)
def thud(): t = tt(0.25); f = 120 * np.exp(-t / 0.05) + 60; return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.002, 0.07) + 0.3 * lp(rng.standard_normal(len(t)), 1200) * env(len(t), 0.001, 0.02)
def paper(): n = int(SR * 0.35); return bp(rng.standard_normal(n), 1500, 7000) * env(n, 0.03, 0.09) * (1 + 0.5 * np.sin(np.arange(n) / SR * 2 * np.pi * 23))
def stamp(): return 1.4 * thud() + 0.5 * np.pad(lp(clap(), 4000), (0, 0))[:int(SR * 0.25)]
def buzz(): t = tt(0.22); return lp(np.sign(np.sin(2 * np.pi * 140 * t)) * 0.4, 1600) * env(len(t), 0.003, 0.08)
def swipe(): t = tt(0.3); f = 600 + 2400 * t / 0.3; return 0.4 * np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.01, 0.12) + 0.4 * whoosh(0.3)
def chime():
    x = np.zeros(int(SR * 1.6))
    for k, m in enumerate((72, 76, 79, 84)): s = bell(mid(m)); i = int(k * 0.07 * SR); x[i:i + len(s)] += s[:len(x) - i]
    return x
def coin(): t = tt(0.4); return np.concatenate([np.sin(2 * np.pi * 988 * t[:int(SR * .07)]), np.sin(2 * np.pi * 1319 * t)]) [:len(t)] * env(len(t), 0.001, 0.12)

# ---------------- music ----------------
mus = np.zeros((N, 2))
prog = [(48, (60, 64, 67)), (45, (57, 60, 64)), (41, (57, 60, 65)), (43, (59, 62, 67))]  # C Am F G
bar = b(4); nb = int(np.ceil(DUR / bar))
for i in range(nb):
    t0 = i * bar; root, ch = prog[i % 4]
    if t0 >= DUR - 0.5: break
    soft = t0 < 12 or (12 <= t0 < 17.5)
    place(mus, pad([mid(m) for m in ch], bar + 0.3), t0, 0.5 if soft else 0.38)
    for k in range(8):
        tk = t0 + b(k * 0.5)
        if not soft or k % 2 == 0: place(mus, bass(mid(root)), tk, 0.33 if not soft else 0.22)
    arp = [ch[0], ch[1], ch[2], ch[1] + 12, ch[2], ch[1], ch[0] + 12, ch[2]]
    for k, m in enumerate(arp):
        place(mus, marimba(mid(m + 12)), t0 + b(k * 0.5), 0.15 if not soft else 0.2, pan=-0.3 if k % 2 else 0.3)
    if t0 >= 17.4 and t0 < 69:
        for k in range(4): place(mus, kick(), t0 + b(k), 0.5)
        for k in (1, 3): place(mus, clap(), t0 + b(k), 0.22)
        for k in range(8): place(mus, hat(), t0 + b(k * 0.5 + 0.25), 0.12, pan=0.2)
# outro ring
place(mus, pad([mid(m) for m in (60, 64, 67, 72)], 4.0), 69.2, 0.5)
mus = reverb(mus)
# duck under stamp and CTA
def duck(t0, d, g=0.3):
    i0, i1 = int(t0 * SR), int((t0 + d) * SR); r = np.ones(N); r[i0:i1] = g
    w = int(0.15 * SR); r[i1:i1 + w] = np.linspace(g, 1, len(r[i1:i1 + w])); return r
mus *= (duck(10.0, 0.6) * duck(69.4, 0.5, 0.45))[:, None]

# ---------------- SFX ----------------
fx = np.zeros((N, 2))
place(fx, whoosh(0.45), 0.0, 0.5)
place(fx, click(), 0.2, 0.5); place(fx, click(), 0.7, 0.5); place(fx, bell(mid(84)), 1.35, 0.35)
place(fx, paper(), 3.5, 0.7); place(fx, whoosh(0.4), 3.6, 0.4)
for i, t in enumerate([4.4, 5.2, 6.0, 6.8, 7.6]): place(fx, thud(), t + 0.15, 0.8 if i else 0.5, pan=0.15 * ((-1) ** i))
place(fx, bell(mid(79)), 8.6, 0.4); place(fx, swipe(), 9.4, 0.6); place(fx, stamp(), 10.2, 1.0)
for t in [12, 18, 23, 28, 36, 44, 52, 58, 64, 69]: place(fx, whoosh(0.5), t - 0.25, 0.45)
for i, t in enumerate([12.6, 13.4, 14.2]): place(fx, buzz(), t + 0.1, 0.35, pan=0.3)
place(fx, pop(), 18.2, 0.6); place(fx, chime(), 18.85, 0.35); place(fx, pop(), 21.25, 0.5)
for i, t in enumerate([23.5, 24.1, 24.7, 25.3]): place(fx, pop(), t + 0.05, 0.55, pan=-0.3 if i % 2 == 0 else 0.3)
src = open('/tmp/explainer/proj/build.py').read()
for m in re.finditer(r"\((\d+), (\d+), (\d+), (\d+), ([\d.]+)\)", src.split('TITLES')[0]):
    t = float(m.group(5)); place(fx, click(), t, 0.6); place(fx, plip(1600 + 200 * (t % 3)), t + 0.05, 0.25)
for t, kind in [(41.2, 'ding'), (48.2, 'low'), (52.9, 'low'), (60.4, 'ding')]:
    place(fx, pop(), t, 0.5); place(fx, bell(mid(84)) if kind == 'ding' else buzz(), t + 0.08, 0.35)
for i, t in enumerate([64.6, 65.4, 66.2]): place(fx, pop(), t + 0.05, 0.55); place(fx, plip(1400 + 250 * i), t + 0.1, 0.3)
place(fx, chime(), 69.5, 0.5); place(fx, coin(), 70.55, 0.35); place(fx, pop(), 71.1, 0.4)
# soft tick on each caption start
for m in re.finditer(r"\(([\d.]+), ([\d.]+), '", src): place(fx, plip(2400), float(m.group(1)), 0.06)
fx = reverb(fx, 0.08)
fx = lp(fx.T, 9000).T

def norm(x): return x / (np.abs(x).max() + 1e-9) * 0.9
def master(x):
    x = hp(x.T, 45); x = x - 0.68 * lp(x, 130); x = x + 0.30 * bp(x, 2500, 7000) + 0.2 * hp(x, 10000); return x.T
mix = norm(master(mus * 0.8 + fx)); sfxo = norm(master(fx))
sf.write('/tmp/explainer/proj/mix_raw.wav', mix, SR); sf.write('/tmp/explainer/proj/sfx_raw.wav', sfxo, SR)
X = np.abs(np.fft.rfft(mix[:, 0])); f = np.fft.rfftfreq(N, 1 / SR)
print('low/mid', round(X[f < 150].sum() / X[(f >= 150) & (f < 4000)].sum(), 2))
