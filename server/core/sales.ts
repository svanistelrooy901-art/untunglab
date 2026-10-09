/** Sales page body (BM + EN) and the install mockups. Everything bilingual is wrapped by L(); CSS shows one language at a time. */

export const L = (ms: string, en: string) => `<span lang="ms">${ms}</span><span lang="en">${en}</span>`;

export const LANG_HEAD_SCRIPT = `<script>(function(){var l='ms';try{var s=localStorage.getItem('ul-lang');if(s==='en'||s==='ms')l=s;}catch(e){}document.documentElement.dataset.lang=l;document.documentElement.lang=l;})();</script>`;

export const LANG_CSS = `
html[data-lang=ms] [lang=en],html[data-lang=en] [lang=ms]{display:none!important}
.lang{display:inline-flex;border:1.5px solid rgba(117,248,234,.45);border-radius:999px;overflow:hidden}
.lang button{border:0;background:transparent;color:#B5CDCE;font:700 .8rem system-ui;padding:7px 12px;cursor:pointer;min-height:34px}
html[data-lang=ms] .lang [data-l=ms],html[data-lang=en] .lang [data-l=en]{background:#75F8E8;color:#04171B}
.top .wrap .right{display:flex;gap:10px;align-items:center}
`;

export const LANG_TOGGLE_SCRIPT = `
document.querySelectorAll('.lang button').forEach(function(b){b.addEventListener('click',function(){
 var l=b.dataset.l;document.documentElement.dataset.lang=l;document.documentElement.lang=l;
 try{localStorage.setItem('ul-lang',l);}catch(e){}
});});
function T(ms,en){return document.documentElement.dataset.lang==='en'?en:ms;}
`;

export const INSTALL_CSS = `
.inst{display:grid;gap:14px;margin-top:26px}
.inst .c{background:#fff;border:1px solid #D9E7E7;border-radius:20px;padding:22px}
.inst h3{margin:0 0 4px;font-size:1.15rem;font-weight:800}
.inst .who{font-size:.85rem;color:#0F766E;font-weight:700;margin:0 0 12px}
.inst ol{margin:14px 0 0;padding-left:1.2rem;color:#33494B;line-height:1.65}
.shots{display:flex;gap:10px;justify-content:center;align-items:flex-start}
.shots svg{display:block;width:calc(50% - 5px);height:auto;border-radius:14px}
.shots.wide{flex-direction:column;align-items:stretch}.shots.wide svg{width:100%}
.shots .cap{display:flex;flex-direction:column;gap:6px;width:calc(50% - 5px);font-size:.82rem;color:#4D6668;text-align:center}
.inst .warn{margin-top:14px;background:#FFF4E5;border:1px solid #F5D7A6;border-radius:12px;padding:12px 14px;color:#6B4200;font-size:.9rem;line-height:1.5}
.wrap>.tip{margin-top:20px;background:#EAF4F3;border-radius:14px;padding:14px 16px;color:#33494B;font-size:.96rem}
@media(min-width:820px){.inst{grid-template-columns:repeat(3,1fr)}}
`;

// ---------- install mockups (inline SVG, drawn to look like the real browser UI) ----------

const RING = '#FF5A36';
const ring = (cx: number, cy: number, r: number) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${RING}" stroke-width="3"/>`;
const badge = (x: number, y: number, n: number) =>
  `<circle cx="${x}" cy="${y}" r="10" fill="${RING}"/><text x="${x}" y="${y + 4.5}" text-anchor="middle" font-size="13" font-weight="800" fill="#fff">${n}</text>`;
const tx = (x: number, y: number, ms: string, en: string, o: { size?: number; fill?: string; weight?: number; anchor?: string } = {}) => {
  const a = `x="${x}" y="${y}" font-size="${o.size ?? 11}" fill="${o.fill ?? '#111'}" font-weight="${o.weight ?? 500}" text-anchor="${o.anchor ?? 'start'}"`;
  return `<text lang="ms" ${a}>${ms}</text><text lang="en" ${a}>${en}</text>`;
};
const svg = (w: number, h: number, inner: string, label: string) =>
  `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

/** The app's own landing screen, kept simple, used as page content behind browser chrome. */
const appPage = (x: number, y: number, w: number, h: number) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#F4F7F7"/>
<rect x="${x}" y="${y}" width="${w}" height="40" fill="#04171B"/>
<text x="${x + 12}" y="${y + 25}" font-size="13" font-weight="800" fill="#75F8E8">UntungLab</text>
<rect x="${x + 12}" y="${y + 52}" width="${w - 24}" height="46" rx="10" fill="#fff"/>
<rect x="${x + 20}" y="${y + 62}" width="60" height="7" rx="3" fill="#C9D6D7"/><rect x="${x + 20}" y="${y + 76}" width="90" height="12" rx="4" fill="#0AA89A"/>
<rect x="${x + 12}" y="${y + 106}" width="${w - 24}" height="46" rx="10" fill="#fff"/>
<rect x="${x + 20}" y="${y + 116}" width="70" height="7" rx="3" fill="#C9D6D7"/><rect x="${x + 20}" y="${y + 130}" width="50" height="12" rx="4" fill="#2F7BFF"/>`;

const phoneFrame = (inner: string, label: string) =>
  svg(
    200,
    260,
    `<rect x="3" y="3" width="194" height="254" rx="28" fill="#15191C"/><rect x="9" y="9" width="182" height="242" rx="22" fill="#fff"/><clipPath id="cp"><rect x="9" y="9" width="182" height="242" rx="22"/></clipPath><g clip-path="url(#cp)">${inner}</g>`,
    label,
  );

const iosA = () =>
  phoneFrame(
    `${appPage(9, 9, 182, 190)}
<rect x="9" y="198" width="182" height="53" fill="#F2F3F5"/>
<rect x="30" y="204" width="140" height="20" rx="10" fill="#E1E4E8"/><text x="100" y="218" font-size="10" text-anchor="middle" fill="#444">untunglab.space</text>
<g stroke="#2F7BFF" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
 <path d="M32 232l-6 6 6 6"/><path d="M60 232l6 6-6 6"/>
 <path d="M93 239v9h14v-9M100 246v-15M95 236l5-5 5 5"/>
 <path d="M133 233h16v14h-16zM141 233v14"/><rect x="167" y="233" width="12" height="12" rx="2"/><path d="M171 230h10v10"/>
</g>${ring(100, 240, 16)}${badge(120, 222, 1)}`,
    'Safari',
  );

const iosB = () =>
  phoneFrame(
    `${appPage(9, 9, 182, 190)}<rect x="9" y="9" width="182" height="242" fill="#000" opacity=".4"/>
<rect x="9" y="70" width="182" height="181" rx="16" fill="#F2F3F5"/>
<rect x="19" y="80" width="26" height="26" rx="7" fill="#04171B"/><text x="32" y="98" font-size="14" font-weight="800" text-anchor="middle" fill="#75F8E8">U</text>
<text x="52" y="94" font-size="11" font-weight="700" fill="#111">UntungLab</text>
<rect x="19" y="116" width="162" height="30" rx="8" fill="#fff"/>${tx(30, 135, 'Salin', 'Copy', { size: 11 })}
<rect x="19" y="152" width="162" height="34" rx="8" fill="#fff" stroke="${RING}" stroke-width="0"/>
${tx(52, 173, 'Tambah ke Skrin Utama', 'Add to Home Screen', { size: 10.5, weight: 700 })}
<rect x="28" y="161" width="16" height="16" rx="4" fill="none" stroke="#111" stroke-width="1.6"/><path d="M36 164v10M31 169h10" stroke="#111" stroke-width="1.6"/>
<rect x="19" y="192" width="162" height="30" rx="8" fill="#fff"/>${tx(30, 211, 'Tambah Penanda', 'Add Bookmark', { size: 11 })}
<rect x="17" y="150" width="166" height="38" rx="10" fill="none" stroke="${RING}" stroke-width="3"/>${badge(176, 150, 2)}`,
    'Share sheet',
  );

const andA = () =>
  phoneFrame(
    `${appPage(9, 44, 182, 207)}
<rect x="9" y="9" width="182" height="35" fill="#fff"/><rect x="18" y="16" width="124" height="22" rx="11" fill="#EEF0F2"/><text x="80" y="31" font-size="10" text-anchor="middle" fill="#444">untunglab.space</text>
<g fill="#444"><circle cx="171" cy="20" r="2.3"/><circle cx="171" cy="27" r="2.3"/><circle cx="171" cy="34" r="2.3"/></g>
<circle cx="160" cy="27" r="1" fill="none"/>${ring(171, 27, 15)}${badge(148, 48, 1)}`,
    'Chrome Android',
  );

const andB = () =>
  phoneFrame(
    `${appPage(9, 44, 182, 207)}
<rect x="9" y="9" width="182" height="35" fill="#fff"/><rect x="18" y="16" width="124" height="22" rx="11" fill="#EEF0F2"/>
<rect x="9" y="44" width="182" height="207" fill="#000" opacity=".25"/>
<rect x="46" y="38" width="140" height="150" rx="10" fill="#fff" stroke="#D0D5D9"/>
${tx(58, 62, 'Tab baharu', 'New tab', { size: 11 })}${tx(58, 86, 'Sejarah', 'History', { size: 11 })}
<rect x="50" y="98" width="132" height="28" rx="7" fill="#E7F7F5"/>
<rect x="58" y="106" width="12" height="12" rx="2" fill="none" stroke="#111" stroke-width="1.6"/><path d="M64 108v6M61 112l3 3 3-3" stroke="#111" stroke-width="1.5" fill="none"/>
${tx(78, 117, 'Pasang app', 'Install app', { size: 11, weight: 700 })}
${tx(58, 148, 'Tetapan', 'Settings', { size: 11 })}${tx(58, 172, 'Bantuan', 'Help', { size: 11 })}
<rect x="48" y="96" width="136" height="32" rx="9" fill="none" stroke="${RING}" stroke-width="3"/>${badge(178, 96, 2)}`,
    'Chrome menu',
  );

const desk = (inner: string, label: string) =>
  svg(
    320,
    200,
    `<rect x="2" y="2" width="316" height="196" rx="10" fill="#fff" stroke="#C9D0D4" stroke-width="2"/>
<rect x="2" y="2" width="316" height="30" rx="10" fill="#E8ECEF"/><rect x="2" y="22" width="316" height="10" fill="#E8ECEF"/>
<circle cx="16" cy="17" r="4" fill="#FF5F57"/><circle cx="30" cy="17" r="4" fill="#FEBC2E"/><circle cx="44" cy="17" r="4" fill="#28C840"/>
<rect x="2" y="32" width="316" height="28" fill="#fff" stroke="#E1E4E8"/>
<g stroke="#667" stroke-width="1.8" fill="none" stroke-linecap="round"><path d="M18 46l-5-4 5-4M13 42h12"/><path d="M48 38l5 4-5 4"/></g>
<rect x="70" y="38" width="204" height="18" rx="9" fill="#EEF0F2"/><text x="82" y="51" font-size="10" fill="#444">untunglab.space</text>
${appPage(2, 60, 316, 136)}${inner}`,
    label,
  );

const deskA = () =>
  desk(
    `<rect x="250" y="40" width="16" height="14" rx="2" fill="none" stroke="#2F7BFF" stroke-width="1.8"/><path d="M258 43v6M255 47l3 3 3-3" stroke="#2F7BFF" stroke-width="1.8" fill="none"/>
${ring(258, 47, 13)}${badge(280, 70, 1)}`,
    'Chrome desktop',
  );

const deskB = () =>
  desk(
    `<rect x="154" y="62" width="158" height="100" rx="10" fill="#fff" stroke="#C9D0D4" stroke-width="1.5"/>
<rect x="164" y="72" width="22" height="22" rx="6" fill="#04171B"/><text x="175" y="88" font-size="13" font-weight="800" text-anchor="middle" fill="#75F8E8">U</text>
${tx(194, 87, 'Pasang UntungLab?', 'Install UntungLab?', { size: 10.5, weight: 700 })}
<rect x="164" y="126" width="62" height="24" rx="12" fill="#fff" stroke="#9CB0B1"/>${tx(195, 142, 'Batal', 'Cancel', { size: 11, anchor: 'middle' })}
<rect x="238" y="126" width="66" height="24" rx="12" fill="#2F7BFF"/>${tx(271, 142, 'Pasang', 'Install', { size: 11, anchor: 'middle', fill: '#fff', weight: 700 })}
<rect x="235" y="123" width="72" height="30" rx="15" fill="none" stroke="${RING}" stroke-width="3"/>${badge(308, 123, 2)}`,
    'Install dialog',
  );

// ---------- page ----------

export interface SalesOpts {
  priceSen: number;
  earlyLeft: number | null;
  normalSen: number;
  base: string;
  rm: (sen: number) => string;
}

export function salesBody(o: SalesOpts): string {
  const { base, rm, priceSen, normalSen, earlyLeft } = o;
  const price = rm(priceSen);
  const img = (f: string, alt: string) => (base ? `<img src="${base}sales/${f}" alt="${alt}" loading="lazy" width="540" height="1169">` : '');
  const logo = base ? `<img src="${base}logo-penuh.png" alt="UntungLab">` : '<b style="color:#75F8E8">UntungLab</b>';
  const tryLink = base ? `<a class="btn ghost" href="${base}">${L('Cuba percuma dahulu', 'Try it free first')}</a>` : '';
  const tryLinkSolid = base ? `<a class="btn" href="${base}">${L('Cuba percuma dahulu', 'Try it free first')}</a>` : '';
  const priceBlock =
    earlyLeft !== null
      ? `<span class="badge">${L(`Harga Early Bird: ${earlyLeft} pembeli pertama yang tinggal`, `Early Bird price: ${earlyLeft} spots left for the first buyers`)}</span><div class="price">${price}<s>${rm(normalSen)}</s></div><p style="color:#A9C4C5;margin:8px 0 0">${L(`Bayar sekali, guna selamanya. Selepas ${earlyLeft} tempat ini habis, harga menjadi ${rm(normalSen)}.`, `Pay once, use it for good. After these ${earlyLeft} spots are gone, the price becomes ${rm(normalSen)}.`)}</p>`
      : `<div class="price">${price}</div><p style="color:#A9C4C5;margin:8px 0 0">${L('Bayar sekali, guna selamanya.', 'Pay once, use it for good.')}</p>`;

  const faq = (qm: string, qe: string, am: string, ae: string) => `<details><summary>${L(qm, qe)}</summary><p>${L(am, ae)}</p></details>`;
  const feat = (rev: boolean, tagM: string, tagE: string, hM: string, hE: string, pM: string, pE: string, file: string, alt: string) =>
    `<div class="feat${rev ? ' rev' : ''}"><div class="t"><div class="tag">${L(tagM, tagE)}</div><h3>${L(hM, hE)}</h3><p>${L(pM, pE)}</p></div><div class="ph"><div class="phone"><div class="in">${img(file, alt)}</div></div></div></div>`;

  return `
<header class="top"><div class="wrap">${logo}<div class="right"><div class="lang" role="group" aria-label="Language"><button type="button" data-l="ms">BM</button><button type="button" data-l="en">EN</button></div><a class="btn sm" href="#beli">${L('Beli', 'Buy')} ${price}</a></div></div></header>

<div class="hero"><div class="wrap">
 <div>
  <div class="eyebrow">${L('Untuk peniaga makanan rumah', 'For home food businesses')}</div>
  <h1>${L('Jual RM6. <em>Untung sebenar berapa?</em>', 'Sell at RM6. <em>What do you really earn?</em>')}</h1>
  <p class="lead">${L('UntungLab kira kos sebenar setiap menu anda: bahan, pembungkusan, masa dan kos operasi seperti sewa dan api. Anda terus nampak untung sebenar, dan harga yang patut dijual.', 'UntungLab works out the real cost of every item on your menu: ingredients, packaging, your time and running costs like rent and utilities. You see your true profit, and the price you should charge.')}</p>
  <div class="cta-row"><a class="btn" href="#beli">${L('Beli sekarang', 'Buy now')}, ${price}</a>${tryLink}</div>
  <div class="note">${L('Tiada akaun, tiada log masuk. Data kekal di telefon anda. Boleh digunakan tanpa internet.', 'No account, no login. Your data stays on your phone. Works without internet.')}</div>
  <div class="note" lang="en" style="margin-top:6px">The app itself is currently in Bahasa Melayu.</div>
 </div>
 <div class="ph"><div class="phone"><div class="in">${img('dashboard.jpg', 'Dashboard UntungLab')}</div></div></div>
</div></div>

<section><div class="wrap">
 <div class="eyebrow" style="color:#0F766E">${L('Masalahnya', 'The problem')}</div>
 <h2>${L('Kos bahan sahaja <em>tidak cukup</em>.', 'Ingredient cost alone <em>is not enough</em>.')}</h2>
 <p class="sub">${L('Kebanyakan peniaga kira untung dengan menolak kos bahan daripada harga jual. Sewa, elektrik, gas, bungkusan dan masa anda sendiri terlepas pandang, jadi untung nampak besar tetapi sebenarnya kecil.', 'Most sellers work out profit by taking ingredient cost off the selling price. Rent, electricity, gas, packaging and your own time get missed, so profit looks big when it is really small.')}</p>
 <div class="compare">
  <div class="num bad"><small>${L('Anggaran biasa', 'Usual estimate')}</small><b>RM5.09</b><span>${L('harga jual tolak kos bahan', 'selling price minus ingredients')}</span></div>
  <div class="num good"><small>${L('Untung sebenar', 'Real profit')}</small><b>RM1.35</b><span>${L('selepas semua kos, 22.5% margin', 'after all costs, 22.5% margin')}</span></div>
  <div class="num"><small>${L('Contoh', 'Example')}</small><b>Brownies RM6</b><span>${L('nombor sebenar daripada enjin UntungLab', 'real numbers from the UntungLab engine')}</span></div>
 </div>
</div></section>

<section class="alt"><div class="wrap">
 ${feat(false, '1. Bahan', '1. Ingredients', 'Isi harga pek dan kuantiti. Kos seunit keluar sendiri.', 'Enter pack price and quantity. Unit cost appears by itself.', 'Beli butter 250 g RM12? UntungLab tahu itu RM48 sekilogram dan kira kos bahan dalam resipi anda. Tak perlu kalkulator.', 'Bought 250 g of butter for RM12? UntungLab knows that is RM48 a kilo and works out the cost in your recipe. No calculator needed.', 'bahan.jpg', 'Senarai bahan dengan harga')}
 ${feat(true, '2. Kos operasi', '2. Running costs', 'Sewa, api dan air pun dikira.', 'Rent, power and water are counted too.', 'Masukkan kos bulanan perniagaan anda sekali sahaja. UntungLab membahagikannya kepada setiap menu dengan cara yang adil, jadi harga anda menanggung semuanya.', 'Enter your monthly business costs once. UntungLab spreads them fairly across every menu item, so your price covers everything.', 'operasi.jpg', 'Skrin kos operasi')}
 ${feat(false, '3. Hasil', '3. Results', 'Untung sebenar. Bukan tekaan.', 'Real profit. Not guesswork.', 'Kos sebenar, untung sebiji dan margin, dengan status yang jelas seperti <b>Margin Sihat</b>, <b>Margin Rendah</b> atau <b>Menu Ini Rugi</b>.', 'Real cost, profit per piece and margin, with clear statuses such as <b>Healthy Margin</b>, <b>Low Margin</b> or <b>This Item Loses Money</b>.', 'hasil.jpg', 'Skrin hasil pengiraan')}
 ${feat(true, '4. Cadangan harga', '4. Price suggestion', 'Pilih margin. Harga terus keluar.', 'Pick a margin. The price appears.', 'Nak untung 20%, 30%, 40% atau 50%? Satu ketikan dan UntungLab beritahu harga yang patut dijual, dikira daripada kos sebenar anda.', 'Want 20%, 30%, 40% or 50% profit? One tap and UntungLab tells you the price to charge, worked out from your real cost.', 'cadangan.jpg', 'Skrin cadangan harga')}
 ${feat(false, '5. Dashboard', '5. Dashboard', 'Semua menu. Satu skrin.', 'Every item. One screen.', 'Nampak menu mana yang menguntungkan dan mana yang rugi, serta purata margin perniagaan anda.', 'See which items make money and which lose it, plus the average margin of your business.', 'dashboard.jpg', 'Dashboard semua menu')}
</div></section>

<section class="dark"><div class="wrap">
 <h2>${L('Dibina supaya <em>mudah dan selamat</em>.', 'Built to be <em>simple and safe</em>.')}</h2>
 <p class="sub">${L('Tiada langganan bulanan. Tiada data anda dihantar ke mana-mana.', 'No monthly subscription. None of your data is sent anywhere.')}</p>
 <div class="tiles">
  <div class="tile"><b>${L('Tanpa akaun', 'No account')}</b><span>${L('Buka dan guna. Tiada pendaftaran atau kata laluan.', 'Open and use it. No sign-up or password.')}</span></div>
  <div class="tile"><b>${L('Data di telefon anda', 'Data on your phone')}</b><span>${L('Resipi dan harga anda kekal pada peranti anda. Ada fungsi sandaran bila anda tukar telefon.', 'Your recipes and prices stay on your device. There is a backup function for when you change phones.')}</span></div>
  <div class="tile"><b>${L('Boleh luar talian', 'Works offline')}</b><span>${L('Pasang ke skrin utama seperti app dan guna walaupun tiada internet.', 'Add it to your home screen like an app and use it even without internet.')}</span></div>
 </div>
</div></section>

<section class="alt" id="pasang"><div class="wrap">
 <div class="eyebrow" style="color:#0F766E">${L('Cara pasang', 'How to install')}</div>
 <h2>${L('Pasang di skrin utama. <em>Dua minit sahaja.</em>', 'Add it to your home screen. <em>Two minutes.</em>')}</h2>
 <p class="sub">${L('UntungLab ialah app web. Tiada Play Store atau App Store. Anda hanya perlu tambah ke skrin utama sekali, dan ia akan jadi seperti app biasa. Ikut gambar bernombor di bawah.', 'UntungLab is a web app. There is no Play Store or App Store. Just add it to your home screen once and it behaves like a normal app. Follow the numbered pictures below.')}</p>
 <div class="inst">
  <div class="c"><h3>iPhone / iPad</h3><p class="who">${L('Guna Safari', 'Use Safari')}</p>
   <div class="shots">${iosA()}${iosB()}</div>
   <ol><li>${L('Buka UntungLab di <b>Safari</b>.', 'Open UntungLab in <b>Safari</b>.')}</li><li>${L('Tekan butang <b>Kongsi</b> (kotak dengan anak panah ke atas) di bawah skrin.', 'Tap the <b>Share</b> button (a box with an arrow pointing up) at the bottom of the screen.')}</li><li>${L('Tatal dan pilih <b>Tambah ke Skrin Utama</b>.', 'Scroll and tap <b>Add to Home Screen</b>.')}</li><li>${L('Tekan <b>Tambah</b>. Ikon UntungLab muncul di skrin anda.', 'Tap <b>Add</b>. The UntungLab icon appears on your screen.')}</li></ol></div>
  <div class="c"><h3>Android</h3><p class="who">${L('Guna Chrome', 'Use Chrome')}</p>
   <div class="shots">${andA()}${andB()}</div>
   <ol><li>${L('Buka UntungLab di <b>Chrome</b>.', 'Open UntungLab in <b>Chrome</b>.')}</li><li>${L('Tekan menu <b>⋮</b> (tiga titik) di penjuru atas.', 'Tap the <b>⋮</b> menu (three dots) at the top corner.')}</li><li>${L('Pilih <b>Pasang app</b> atau <b>Tambah ke skrin utama</b>.', 'Choose <b>Install app</b> or <b>Add to Home screen</b>.')}</li><li>${L('Tekan <b>Pasang</b>. Ikon UntungLab muncul di skrin anda.', 'Tap <b>Install</b>. The UntungLab icon appears on your screen.')}</li></ol>
   <div class="warn"><b>${L('Keluar amaran "app tidak selamat"?', 'See an "unsafe app" warning?')}</b> ${L('Itu amaran biasa Android / Google Play Protect untuk app yang dipasang dari web, bukan dari Play Store. UntungLab tidak mengambil data anda; semuanya kekal di telefon. Tekan <b>Lagi butiran</b> (More details), kemudian <b>Pasang juga</b> (Install anyway). Jika anda tidak pasti, anda boleh terus guna UntungLab di Chrome tanpa memasangnya.', 'This is a normal Android / Google Play Protect warning for apps installed from the web instead of the Play Store. UntungLab does not collect your data; everything stays on your phone. Tap <b>More details</b>, then <b>Install anyway</b>. If you are unsure, you can simply keep using UntungLab inside Chrome without installing it.')}</div></div>
  <div class="c"><h3>${L('Komputer', 'Computer')}</h3><p class="who">${L('Chrome atau Edge', 'Chrome or Edge')}</p>
   <div class="shots wide">${deskA()}${deskB()}</div>
   <ol><li>${L('Buka UntungLab di Chrome atau Edge.', 'Open UntungLab in Chrome or Edge.')}</li><li>${L('Cari ikon <b>Pasang</b> di hujung bar alamat (atas, sebelah kanan).', 'Look for the <b>Install</b> icon at the end of the address bar (top right).')}</li><li>${L('Atau tekan menu <b>⋮</b> dan pilih <b>Pasang UntungLab</b>.', 'Or open the <b>⋮</b> menu and choose <b>Install UntungLab</b>.')}</li><li>${L('Tekan <b>Pasang</b>. UntungLab buka dalam tetingkapnya sendiri.', 'Click <b>Install</b>. UntungLab opens in its own window.')}</li></ol></div>
 </div>
 <div class="tip">${L('<b>Penting:</b> pasang dan buka sekali semasa ada internet, supaya app boleh dipakai tanpa internet selepas itu. Data anda disimpan di peranti itu sahaja, jadi pasang di telefon yang anda guna untuk berniaga. Selepas bayar, kod lesen diaktifkan di dalam app (Lesen).', '<b>Important:</b> install and open it once while you have internet, so the app works offline afterwards. Your data is stored on that device only, so install it on the phone you use for your business. After paying, the licence code is activated inside the app (Lesen / Licence).')}</div>
 ${tryLinkSolid ? `<div class="cta-row" style="margin-top:20px">${tryLinkSolid}</div>` : ''}
</div></section>

<section class="buy" id="beli"><div class="wrap"><div class="grid">
 <div>
  <div class="eyebrow">${L('Beli UntungLab', 'Buy UntungLab')}</div>
  <h2 style="margin-top:8px">${L('Kira betul. <em>Untung jelas.</em>', 'Count it right. <em>Profit made clear.</em>')}</h2>
  ${priceBlock}
  <ul class="list">
   <li>${L('Akses seumur hidup, bayaran sekali sahaja', 'Lifetime access, one payment only')}</li>
   <li>${L('Boleh digunakan pada 2 peranti', 'Use it on 2 devices')}</li>
   <li>${L('Semua fungsi: kos operasi, hasil, cadangan harga, dashboard', 'All features: running costs, results, price suggestion, dashboard')}</li>
   <li>${L('Kod lesen dihantar ke emel anda selepas bayaran', 'Licence code sent to your email after payment')}</li>
   <li>${L('Bayaran balik dalam 7 hari jika tidak sesuai', '7-day refund if it is not for you')}</li>
  </ul>
 </div>
 <div class="form">
  <form id="f">
   <label for="n">${L('Nama', 'Name')}</label><input id="n" autocomplete="name" required maxlength="100">
   <label for="e">${L('Emel (kod lesen dihantar ke sini)', 'Email (your licence code is sent here)')}</label><input id="e" type="email" autocomplete="email" required maxlength="120">
   <label for="p">${L('Nombor telefon', 'Phone number')}</label><input id="p" type="tel" autocomplete="tel" required maxlength="20">
   <button class="btn" id="b" type="submit">${L('Bayar', 'Pay')} ${price}</button>
   <p id="m" class="err" role="alert"></p>
  </form>
  <p class="fine">${L('Pembayaran selamat melalui ToyyibPay (FPX). Bayaran balik dalam 7 hari selepas pembelian: balas emel kod lesen anda.', 'Secure payment through ToyyibPay (FPX). Refund within 7 days of purchase: reply to your licence code email.')}</p>
  <p class="fine">${L('Nama, emel dan telefon anda hanya digunakan untuk menghantar kod lesen dan sokongan pembelian ini.', 'Your name, email and phone are used only to send the licence code and support this purchase.')}</p>
 </div>
</div></div></section>

<section><div class="wrap" style="max-width:46rem">
 <h2>${L('Soalan lazim', 'FAQ')}</h2>
 ${faq('Adakah saya boleh cuba dahulu?', 'Can I try it first?', 'Boleh. Versi percuma membuka semua fungsi, dengan had bilangan: 2 menu, 10 bahan dan 2 pembungkusan. Beli bila anda sudah yakin.', 'Yes. The free version unlocks every feature, with count limits: 2 menu items, 10 ingredients and 2 packaging items. Buy when you are confident.')}
 ${faq('Apa maksud akses seumur hidup?', 'What does lifetime access mean?', 'Anda bayar sekali dan tiada yuran bulanan. Akses seumur hidup bermaksud selagi produk UntungLab beroperasi.', 'You pay once and there is no monthly fee. Lifetime access means for as long as the UntungLab product is operating.')}
 ${faq('Berapa peranti boleh digunakan?', 'How many devices can I use?', 'Satu kod lesen boleh digunakan pada 2 peranti, contohnya telefon dan tablet anda.', 'One licence code works on 2 devices, for example your phone and your tablet.')}
 ${faq('Bagaimana kalau saya tukar telefon?', 'What if I change phones?', 'Data disimpan di telefon anda. Buat sandaran dalam UntungLab sebelum menukar telefon, kemudian pulihkan di telefon baharu dan masukkan kod lesen yang sama.', 'Your data is stored on your phone. Make a backup inside UntungLab before changing phones, then restore it on the new phone and enter the same licence code.')}
 ${faq('Perlukah internet?', 'Do I need internet?', 'Hanya untuk membeli dan mengaktifkan kod lesen sekali. Selepas itu UntungLab boleh digunakan tanpa internet.', 'Only to buy and to activate the licence code once. After that UntungLab works without internet.')}
 ${faq('Bagaimana dengan bayaran balik?', 'What about refunds?', 'Dalam 7 hari selepas pembelian, balas emel kod lesen anda dan kami akan uruskan bayaran balik.', 'Within 7 days of purchase, reply to your licence code email and we will handle the refund.')}
 ${faq('Adakah data saya dihantar kepada anda?', 'Is my data sent to you?', 'Tidak. Resipi, bahan dan harga anda kekal pada peranti anda. Hanya nama, emel dan telefon digunakan untuk menghantar kod lesen dan sokongan pembelian.', 'No. Your recipes, ingredients and prices stay on your device. Only your name, email and phone are used to send the licence code and support the purchase.')}
 ${faq('Adakah app ini ada dalam Bahasa Inggeris?', 'Is the app available in English?', 'Buat masa ini app dalam Bahasa Melayu sahaja.', 'For now the app is in Bahasa Melayu only.')}
 <div style="text-align:center;margin-top:34px"><a class="btn" href="#beli">${L('Beli', 'Buy')} ${price}</a></div>
</div></section>

<footer><div class="wrap">${L('UntungLab oleh Digital Sambal. Kira dengan betul, untung dengan yakin.', 'UntungLab by Digital Sambal. Count it right, profit with confidence.')}</div></footer>

<script>
${LANG_TOGGLE_SCRIPT}
document.getElementById('f').addEventListener('submit',async(ev)=>{
 ev.preventDefault();const b=document.getElementById('b'),m=document.getElementById('m');
 b.disabled=true;m.textContent='';
 try{
  const r=await fetch('/api/order',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:document.getElementById('n').value,email:document.getElementById('e').value,phone:document.getElementById('p').value})});
  const j=await r.json();
  if(r.ok&&j.payUrl){location.href=j.payUrl;return;}
  m.textContent=r.status===400?T('Semak semula nama, emel dan nombor telefon anda.','Please check your name, email and phone number.'):T('Pembayaran tidak dapat dimulakan sekarang. Cuba sebentar lagi.','Payment cannot be started right now. Please try again shortly.')+(j.detail?' ['+j.detail+']':'');
 }catch(e){m.textContent=T('Tiada sambungan internet. Cuba lagi.','No internet connection. Please try again.');}
 b.disabled=false;
});
</script>`;
}

/** The install mockups, reused by the user manual (manual/build.mjs). */
export const INSTALL_MOCKS = { iosA: iosA(), iosB: iosB(), andA: andA(), andB: andB(), deskA: deskA(), deskB: deskB() };
