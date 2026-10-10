(function () {
  const E = {
    lin: t => t, outExpo: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t), outCubic: t => 1 - Math.pow(1 - t, 3),
    inCubic: t => t * t * t, inExpo: t => t <= 0 ? 0 : Math.pow(2, 10 * t - 10),
    inOutCubic: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
    outBack: t => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  };
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const prog = (t, s, d, ez = 'lin') => E[ez](clamp((t - s) / d));
  const DEF = { o: 1, x: 0, y: 0, s: 1, sx: 1, sy: 1, r: 0, b: 0 };
  const TR = [], UP = []; let BPM = 120, SC = [], DUR = 30;
  function track(sel, keys, opt = {}) {           // keys: [[t,{o,x,y,s,sx,sy,r,b},ease],...]
    const els = typeof sel === 'string' ? [...document.querySelectorAll(sel)] : [sel];
    els.forEach(el => TR.push({ el, keys, base: opt.base || '' }));
  }
  function valueAt(keys, t) {
    let prev = { ...DEF, ...keys[0][1] }; if (t <= keys[0][0]) return prev;
    for (let i = 1; i < keys.length; i++) {
      const t0 = keys[i - 1][0], t1 = keys[i][0], cur = { ...prev, ...keys[i][1] };
      if (t < t1) { const p = E[keys[i][2] || 'outExpo']((t - t0) / Math.max(1e-6, t1 - t0)); const o = {};
        for (const k in cur) o[k] = prev[k] + (cur[k] - prev[k]) * p; return o; }
      prev = cur;
    } return prev;
  }
  function applyV(tr, v) {
    const el = tr.el; el.style.opacity = clamp(v.o);
    el.style.transform = `${tr.base} translate3d(${v.x}px,${v.y}px,0) rotate(${v.r}deg) scale(${v.s * v.sx},${v.s * v.sy})`;
    el.style.filter = v.b > 0.05 ? `blur(${v.b}px)` : 'none';
  }
  const B = n => n * 60 / BPM, on = fn => UP.push(fn), scenes = l => { SC = l; };
  const rnd = s => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const $ = id => document.getElementById(id);
  function hud(opt) {   // opt: {label, chapters:[[t,'NAME']], colors:[[t,'css']], inAt}
    const h = document.createElement('div'); h.id = 'hud';
    h.innerHTML = `<i class="cn tl"></i><i class="cn tr"></i><i class="cn bl"></i><i class="cn br"></i>
      <div class="hl">${opt.label}</div><div class="hr"><span id="hudN"></span><span id="hudC"></span></div>
      <div class="tc" id="hudT"></div><div class="pb"><b id="hudP"></b></div>`;
    document.body.appendChild(h);
    on(t => { let ch = opt.chapters[0]; for (const c of opt.chapters) if (t >= c[0]) ch = c;
      $('hudN').textContent = String(opt.chapters.indexOf(ch) + 1).padStart(2, '0') + ' / ' + String(opt.chapters.length).padStart(2, '0');
      $('hudC').textContent = ch[1]; let col = opt.colors[0][1]; for (const c of opt.colors) if (t >= c[0]) col = c[1]; h.style.color = col;
      const f = Math.floor(t * 30 + 1e-6), s = Math.floor(f / 30);
      $('hudT').textContent = `00:00:${String(s).padStart(2, '0')}:${String(f % 30).padStart(2, '0')}`;
      $('hudP').style.transform = `scaleX(${clamp(t / DUR)})`; h.style.opacity = prog(t, opt.inAt || 0, 0.4, 'outCubic'); });
  }
  const WIPES = [];
  function pixelWipe(tCut, color, cell = 90, dur = 0.26) { WIPES.push({ tCut, color, cell, dur }); }
  function drawWipes(t) {
    const cv = $('wipe'); if (!cv) return; const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height);
    for (const w of WIPES) { if (t < w.tCut - w.dur || t > w.tCut + w.dur) continue;
      const cols = Math.ceil(cv.width / w.cell), rows = Math.ceil(cv.height / w.cell), maxd = cols + rows; g.fillStyle = w.color;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const d = (c + r) / maxd * 0.55 + rnd(r * 97 + c) * 0.45;
        const k = t < w.tCut ? clamp(((t - (w.tCut - w.dur)) / w.dur) * 1.6 - d * 0.6) : 1 - clamp(((t - w.tCut) / w.dur) * 1.6 - d * 0.6);
        if (k <= 0) continue; const s = w.cell * E.outCubic(k) + 1;
        g.fillRect(c * w.cell + (w.cell - s) / 2, r * w.cell + (w.cell - s) / 2, s, s); } }
  }
  window.renderAt = function (t) {
    for (const [id, a, b] of SC) { const el = $(id); if (el) el.style.display = (t >= a && t < b) ? 'block' : 'none'; }
    for (const tr of TR) applyV(tr, valueAt(tr.keys, t)); for (const fn of UP) fn(t); drawWipes(t);
  };
  window.ENG = { E, clamp, prog, track, on, scenes, hud, pixelWipe, rnd, B, setBPM: b => BPM = b, setDur: d => DUR = d };
})();
