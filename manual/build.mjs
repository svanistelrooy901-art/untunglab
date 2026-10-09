/**
 * Builds the UntungLab user manual in both languages:
 *   npx tsx manual/build.mjs            (both)   |   LANGS=en npx tsx manual/build.mjs
 * -> public/manual/UntungLab-Manual.pdf (Bahasa Melayu) and UntungLab-Manual-EN.pdf (English).
 * Screens in manual/shots (BM) and manual/shots-en (EN) are real captures of the app (see manual/capture).
 * Text lives in manual/content.mjs as BM/EN pairs, so both languages always share one structure.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { INSTALL_MOCKS } from '../server/core/sales.ts';
import { makeBody } from './content.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const require = createRequire(process.env.PW_ROOT ? process.env.PW_ROOT + '/' : '/home/claude/.npm-global/lib/node_modules/');
const { chromium } = require('playwright');

const logoB64 = fs.readFileSync(path.join(root, 'public', 'logo-penuh.png')).toString('base64');
const fontB64 = fs.readFileSync(path.join(root, 'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')).toString('base64');

const UI = {
  ms: { file: 'UntungLab-Manual.pdf', shots: 'shots', version: 'Versi 1.0 · Oktober 2026', fig: 'Rajah', tip: 'Tip', warn: 'Perhatian', note: 'Ingat', footer: 'UntungLab · Manual Pengguna · ', title: 'UntungLab · Manual Pengguna',
    coverH1: 'Manual<br><em>Pengguna</em>', coverP: 'Panduan lengkap untuk mengira kos sebenar, untung dan harga jual menu anda.', toc: 'Kandungan',
    tocNote: 'Gambar skrin dalam manual ini diambil daripada UntungLab sebenar dengan contoh menu Standard Brownies. Nombor merah pada gambar sepadan dengan nombor dalam keterangan di bawahnya. Angka contoh anda akan berbeza, kerana ia dikira daripada harga dan kos anda sendiri.' },
  en: { file: 'UntungLab-Manual-EN.pdf', shots: 'shots-en', version: 'Version 1.0 · October 2026', fig: 'Figure', tip: 'Tip', warn: 'Warning', note: 'Remember', footer: 'UntungLab · User Manual · ', title: 'UntungLab · User Manual',
    coverH1: 'User<br><em>Manual</em>', coverP: 'A complete guide to working out the real cost, profit and selling price of your menu.', toc: 'Contents',
    tocNote: 'The screenshots in this manual were taken from the real UntungLab with a sample Standard Brownies menu item. The red numbers on a picture match the numbers in the caption below it. Your own figures will differ, because they are worked out from your own prices and costs.' },
};

async function build(lang, browser) {
  const ui = UI[lang];
  const L = (ms, en) => (lang === 'ms' ? ms : en);
  const b64 = (f) => fs.readFileSync(path.join(here, ui.shots, f)).toString('base64');
  let figNo = 0;
  const fig = (file, caption, legend = []) => {
    figNo += 1;
    return `<figure><div class="ph"><img src="data:image/jpeg;base64,${b64(file + '.jpg')}"></div>
<figcaption><b>${ui.fig} ${figNo}.</b> ${caption}${legend.length ? `<ol class="lg">${legend.map((l, i) => `<li><i>${i + 1}</i><span>${l}</span></li>`).join('')}</ol>` : ''}</figcaption></figure>`;
  };
  const figs = (...f) => `<div class="figs n${f.length}">${f.join('')}</div>`;
  const tip = (t) => `<div class="call tip"><b>${ui.tip}</b>${t}</div>`;
  const warn = (t) => `<div class="call warn"><b>${ui.warn}</b>${t}</div>`;
  const note = (t) => `<div class="call note"><b>${ui.note}</b>${t}</div>`;
  const steps = (...s) => `<ol class="st">${s.map((x) => `<li>${x}</li>`).join('')}</ol>`;
  const chapters = [];
  const chapter = (id, title, lead, body) => {
    chapters.push([id, title]);
    const n = chapters.length;
    return `<section class="chap" id="${id}"><header class="ch"><span class="no">${n}</span><div><h1>${title}</h1><p class="lead">${lead}</p></div></header>${body}</section>`;
  };
  const body = makeBody({ L, fig, figs, tip, warn, note, steps, chapter, INSTALL_MOCKS });
  return { ui, body, chapters, b64, figCount: figNo };
}

// ---------------------------------------------------------------- html
async function render(lang, browser) {
const { ui, body, chapters, b64 } = await build(lang, browser);
const toc = chapters.map(([id, title], i) => `<li><a href="#${id}"><span>${i + 1}</span>${title}</a></li>`).join('');
const css = `
@font-face{font-family:Inter;src:url(data:font/woff2;base64,${fontB64}) format('woff2');font-weight:100 900}
@page{size:A4;margin:18mm 17mm 20mm 17mm;@bottom-center{content:"${ui.footer}" counter(page);font:500 8pt Inter;color:#7C9A9C}}
@page cover{margin:0;@bottom-center{content:none}}
*{box-sizing:border-box}
html{font:10pt/1.55 Inter,system-ui,sans-serif;color:#10282B}
body{margin:0}
.cover{page:cover;height:297mm;width:210mm;background:radial-gradient(900px 700px at 85% 15%,#0F5A63 0,#04171B 55%,#010608 100%);color:#fff;padding:26mm 22mm;position:relative;break-after:page;overflow:hidden}
.cover img.logo{height:15mm}
.cover h1{font-size:44pt;line-height:1.05;letter-spacing:-.03em;margin:50mm 0 8mm;font-weight:800}
.cover h1 em{display:inline-block;padding-bottom:2mm;font-style:normal;background:linear-gradient(90deg,#2DD4BF,#4F9BFF 70%,#9B82FF);-webkit-background-clip:text;background-clip:text;color:transparent}
.cover p{font-size:13pt;color:#B5CDCE;max-width:80mm;margin:0;position:relative;z-index:2}
.cover .ver{position:absolute;left:22mm;bottom:20mm;font-size:9.5pt;color:#8FB0B2}
.cover .phone{position:absolute;right:-10mm;bottom:-40mm;width:84mm;border-radius:11mm;padding:2.4mm;background:linear-gradient(135deg,#D7DDE0,#8A9498 40%,#E9EEF0 70%,#7C868A);transform:rotate(-8deg);box-shadow:0 8mm 16mm rgba(0,0,0,.5)}
.cover .phone .scr{width:100%;aspect-ratio:780/1688;border-radius:9mm;border:1.6mm solid #05090A;background-size:cover;background-position:top}
.toc{break-after:page}
.toc h1{font-size:24pt;margin:0 0 6mm;letter-spacing:-.02em}
.toc ol{list-style:none;padding:0;margin:0}
.toc li{border-bottom:.3mm solid #D9E7E7}
.toc a{display:flex;gap:5mm;align-items:center;padding:2.6mm 0;color:#10282B;text-decoration:none;font-size:11.5pt;font-weight:600}
.toc a span{display:inline-flex;width:8mm;height:8mm;border-radius:50%;background:#0AA89A;color:#fff;align-items:center;justify-content:center;font-size:9pt;font-weight:800}
.toc p{color:#4D6668;font-size:9pt;margin-top:5mm}
.chap{break-before:page}
.ch{display:flex;gap:6mm;align-items:flex-start;border-bottom:.5mm solid #0AA89A;padding-bottom:5mm;margin-bottom:6mm}
.ch .no{flex:none;width:15mm;height:15mm;border-radius:4mm;background:linear-gradient(135deg,#0AA89A,#2F7BFF);color:#fff;font-size:17pt;font-weight:800;display:flex;align-items:center;justify-content:center}
h1{font-size:22pt;margin:0;letter-spacing:-.02em;line-height:1.1}
.lead{margin:2mm 0 0;color:#4D6668;font-size:10.5pt}
h2{font-size:13.5pt;margin:6mm 0 2.5mm;break-after:avoid-page;letter-spacing:-.01em;color:#04171B;break-after:avoid}
h3{font-size:11pt;margin:0 0 2mm}
p{margin:0 0 3mm}
a{color:#0F766E}
ul.bl{padding-left:5mm;margin:0 0 3mm}ul.bl li{margin-bottom:1.6mm}
ol.st{counter-reset:s;list-style:none;padding:0;margin:0 0 4mm}
ol.st li{counter-increment:s;position:relative;padding:0 0 2mm 9mm}
ol.st li:before{content:counter(s);position:absolute;left:0;top:.3mm;width:6mm;height:6mm;border-radius:50%;background:#0AA89A;color:#fff;font-size:8.5pt;font-weight:800;display:flex;align-items:center;justify-content:center}
table.tb{width:100%;border-collapse:collapse;margin:0 0 4mm;font-size:9.5pt}table.tb tr{break-inside:avoid}
.tb th{background:#EAF4F3;text-align:left;padding:2.2mm 3mm;font-size:9pt;color:#0F4F55}
.tb td{padding:2.2mm 3mm;border-bottom:.25mm solid #D9E7E7;vertical-align:top}
.tb td:first-child{font-weight:600;white-space:nowrap}
.tb.gl td:first-child,.tb.calc td:first-child{white-space:normal}
.tb.calc td:last-child,.tb.calc th:last-child{text-align:right;white-space:nowrap;font-weight:700}
.tb.calc .tot td{background:#04171B;color:#fff;border:0}
.tb.calc .tot:nth-last-child(n+2) td{background:#0F3E44}
.tb.st4 td:first-child{width:46mm}
.pill{display:inline-block;border-radius:99px;padding:.6mm 3mm;font-weight:700;font-size:9pt;border:.3mm solid}
.pill.loss{background:#FEE2E2;color:#991B1B;border-color:#FCA5A5}.pill.low{background:#FFEDD5;color:#9A3412;border-color:#FDBA74}
.pill.watch{background:#FEF3C7;color:#92400E;border-color:#FCD34D}.pill.ok{background:#DCFCE7;color:#166534;border-color:#86EFAC}
.eq{display:flex;align-items:stretch;gap:1.6mm;margin:3mm 0 4mm;break-inside:avoid}
.eq span{align-self:center;font-weight:800;color:#0F766E;font-size:12pt}
.eq .b{flex:1;background:#EAF4F3;border-radius:2.5mm;padding:3mm 1.5mm;text-align:center;font-weight:700;display:flex;align-items:center;justify-content:center}
.eq .b small{font-size:8pt;line-height:1.2}
.eq .res{background:#04171B;color:#75F8E8}
.eq.small{max-width:112mm}
.call{border-radius:3mm;padding:3mm 4mm;margin:2mm 0 4mm;font-size:9.5pt;break-inside:avoid;border-left:1.4mm solid}
.call>b:first-child{display:block;font-size:8.5pt;letter-spacing:.08em;text-transform:uppercase;margin-bottom:.6mm}
.call.tip{background:#E7F7F5;border-color:#0AA89A}.call.tip>b:first-child{color:#0F766E}
.call.warn{background:#FFF4E5;border-color:#F59E0B;color:#6B4200}.call.warn>b:first-child{color:#B45309}
.call.note{background:#EEF2FF;border-color:#6366F1}.call.note>b:first-child{color:#4338CA}
.call.small{font-size:8.8pt}
.figs{display:flex;gap:4mm;margin:3mm 0 5mm;align-items:flex-start;break-inside:avoid;justify-content:center}
.figs figure{margin:0;flex:1;min-width:0}
.figs.n1 figure{max-width:50mm;flex:none}
.figs.n2 figure{max-width:78mm}
.ph{border-radius:5mm;padding:1.1mm;background:linear-gradient(135deg,#D7DDE0,#8A9498 40%,#E9EEF0 70%,#7C868A);box-shadow:0 2mm 5mm rgba(4,23,27,.2)}
.ph img{display:block;width:100%;border-radius:4mm;border:.7mm solid #05090A}
.figs.n2 .ph{max-width:46mm;margin:0 auto}.figs.n3 .ph{max-width:100%}.figs.n3{gap:3mm}.figs.n3 figure{max-width:52mm}
figcaption{font-size:8pt;line-height:1.4;color:#33494B;margin-top:2mm}
.lg{list-style:none;padding:0;margin:1.4mm 0 0}
.lg li{display:flex;gap:1.6mm;margin-bottom:.8mm}
.lg i{flex:none;width:4mm;height:4mm;border-radius:50%;background:#FF5A36;color:#fff;font-style:normal;font-weight:800;font-size:6.5pt;display:flex;align-items:center;justify-content:center;margin-top:.2mm}
.inst{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin:3mm 0 4mm}
.inst .c{border:.3mm solid #D9E7E7;border-radius:3.5mm;padding:4mm;break-inside:avoid}
.inst .c.wide{grid-column:1/-1}
.mk{display:flex;gap:2.5mm;margin-bottom:3mm}
.mk svg{width:calc(50% - 1.25mm);height:auto;border-radius:2mm;border:.25mm solid #E1E4E8}
.mk.w{flex-direction:column}.mk.w svg{width:100%}
.inst .c.wide .mk.w{flex-direction:row}.inst .c.wide .mk.w svg{width:calc(50% - 1.25mm)}
[lang=${lang === 'ms' ? 'en' : 'ms'}]{display:none}
dl.faq{margin:0}dl.faq dt{font-weight:700;margin-top:3mm;break-after:avoid}dl.faq dd{margin:.8mm 0 0;color:#33494B}
.end{margin-top:8mm;font-weight:700;color:#0F766E;text-align:center}
`;

const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${ui.title}</title><style>${css}</style></head><body>
<section class="cover"><img class="logo" src="data:image/png;base64,${logoB64}">
<h1>${ui.coverH1}</h1>
<p>${ui.coverP}</p>
<div class="ver">${ui.version} · untunglab.space</div>
<div class="phone"><div class="scr" style="background-image:url(data:image/jpeg;base64,${b64('30-dashboard.jpg')})"></div></div></section>
<section class="toc"><h1>${ui.toc}</h1><ol>${toc}</ol><p>${ui.tocNote}</p></section>
${body.join('\n')}
</body></html>`;

fs.writeFileSync(path.join(here, `manual-${lang}.html`), html);
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
const out = path.join(root, 'public', 'manual', ui.file);
fs.mkdirSync(path.dirname(out), { recursive: true });
await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true });
await page.close();
console.log('wrote', out, (fs.statSync(out).size / 1e6).toFixed(2) + ' MB');
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const lang of (process.env.LANGS ?? 'ms,en').split(',')) await render(lang, browser);
await browser.close();
