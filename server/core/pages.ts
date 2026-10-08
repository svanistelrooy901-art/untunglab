const rm = (sen: number) => `RM${sen % 100 === 0 ? sen / 100 : (sen / 100).toFixed(2)}`;

const shell = (title: string, body: string) => `<!doctype html>
<html lang="ms"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
body{margin:0;background:#F7F8FA;color:#111827;font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main{max-width:30rem;margin:0 auto;padding:24px 16px}
h1{font-size:1.5rem;margin:0 0 4px}p{color:#475569;margin:8px 0}
.card{background:#fff;border:1px solid #E5E7EB;border-radius:16px;padding:16px;margin-top:16px}
label{display:block;font-weight:600;font-size:.9rem;margin-top:12px}
input{width:100%;box-sizing:border-box;min-height:44px;border:1px solid #9CA3AF;border-radius:12px;padding:0 12px;font-size:1rem;margin-top:4px}
button{min-height:44px;border:0;border-radius:12px;background:#0F766E;color:#fff;font-weight:600;font-size:1rem;padding:0 16px;margin-top:16px;width:100%}
button[disabled]{opacity:.5}
.code{font:700 1.5rem/1.2 ui-monospace,Menlo,monospace;letter-spacing:.04em;text-align:center;padding:16px;background:#F0FDFA;border:1px solid #99F6E4;border-radius:12px;user-select:all}
.err{color:#B91C1C;font-weight:600}
</style></head><body><main>${body}</main></body></html>`;

const SALES_CSS = `
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:#F6FAFA;color:#0B1F21;font:17px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
a{color:inherit}img{max-width:100%;display:block}
.wrap{max-width:68rem;margin:0 auto;padding:0 20px}
.top{position:sticky;top:0;z-index:10;background:rgba(1,20,22,.94);backdrop-filter:blur(10px);border-bottom:1px solid rgba(117,248,234,.15)}
.top .wrap{display:flex;align-items:center;justify-content:space-between;height:60px}
.top img{height:30px;width:auto}
.btn{display:inline-block;border:0;border-radius:999px;background:linear-gradient(90deg,#0AA89A,#2F7BFF 75%,#7A5CFF);color:#fff;font-weight:700;font-size:1rem;padding:14px 26px;text-decoration:none;cursor:pointer;min-height:44px;box-shadow:0 10px 30px rgba(47,123,255,.28)}
.btn.sm{padding:9px 18px;font-size:.92rem;min-height:40px;box-shadow:none}
.btn.ghost{background:transparent;color:#75F8E8;border:1.5px solid rgba(117,248,234,.5);box-shadow:none}
.hero{background:radial-gradient(900px 600px at 80% 20%,#0C3B43 0,#04171B 55%,#010608 100%);color:#fff;padding:56px 0 72px;overflow:hidden}
.hero .wrap{display:grid;gap:36px;align-items:center}
.eyebrow{font-size:.8rem;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:#75F8E8}
h1{font-size:clamp(2.2rem,6vw,3.7rem);line-height:1.04;letter-spacing:-.03em;margin:10px 0 16px;font-weight:800}
h1 em,h2 em{font-style:normal;background:linear-gradient(90deg,#2DD4BF,#4F9BFF 70%,#9B82FF);-webkit-background-clip:text;background-clip:text;color:transparent}
.hero p.lead{font-size:1.15rem;color:#B5CDCE;max-width:34rem;margin:0 0 24px}
.cta-row{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.note{font-size:.88rem;color:#8FB0B2;margin-top:14px}
.phone{width:min(270px,70vw);margin:0 auto;border-radius:38px;padding:8px;background:linear-gradient(135deg,#D7DDE0,#8A9498 40%,#E9EEF0 70%,#7C868A);box-shadow:0 40px 80px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.2) inset}
.phone .in{border-radius:31px;overflow:hidden;background:#fff;border:6px solid #05090A}
.phone img{width:100%;height:auto}
section{padding:64px 0}
h2{font-size:clamp(1.7rem,4.2vw,2.5rem);line-height:1.1;letter-spacing:-.025em;margin:0 0 14px;font-weight:800}
.sub{color:#4D6668;font-size:1.08rem;max-width:40rem;margin:0 0 8px}
.compare{display:grid;gap:14px;margin-top:28px}
.num{border-radius:22px;padding:24px;background:#fff;border:1px solid #D9E7E7}
.num small{display:block;font-size:.8rem;letter-spacing:.1em;text-transform:uppercase;font-weight:700;color:#6B8486}
.num b{display:block;font-size:2.8rem;letter-spacing:-.03em;line-height:1.1;margin:6px 0 4px}
.num.bad b{color:#8FA3A5;text-decoration:line-through;text-decoration-color:#E5484D}
.num.good{background:#04171B;color:#fff;border-color:#04171B}.num.good b{color:#75F8E8}.num.good small{color:#8FD9D0}
.feat{display:grid;gap:28px;align-items:center;padding:34px 0}
.feat .t .tag{font-size:.78rem;letter-spacing:.12em;text-transform:uppercase;font-weight:700;color:#0F766E}
.feat h3{font-size:1.6rem;line-height:1.15;letter-spacing:-.02em;margin:6px 0 10px;font-weight:800}
.feat p{color:#4D6668;margin:0}
.feat ul{margin:12px 0 0;padding-left:1.1rem;color:#33494B}
.feat .phone{width:min(230px,64vw)}
.alt{background:#EAF4F3}
.dark{background:#04171B;color:#fff}.dark .sub{color:#A9C4C5}
.tiles{display:grid;gap:14px;margin-top:26px}
.tile{border-radius:20px;padding:22px;background:rgba(255,255,255,.06);border:1px solid rgba(117,248,234,.16)}
.tile b{display:block;font-size:1.1rem;margin-bottom:4px;color:#75F8E8}.tile span{color:#B5CDCE;font-size:.98rem}
.buy{background:radial-gradient(800px 500px at 20% 0,#0C3B43 0,#04171B 60%,#010608 100%);color:#fff}
.buy .grid{display:grid;gap:28px;align-items:start}
.price{font-size:3.6rem;font-weight:800;letter-spacing:-.04em;line-height:1}
.price s{font-size:1.5rem;color:#7C9A9C;margin-left:10px;font-weight:600}
.badge{display:inline-block;background:#FDECC8;color:#7A4300;font-weight:700;font-size:.85rem;border-radius:999px;padding:5px 12px;margin-bottom:10px}
.list{list-style:none;padding:0;margin:18px 0 0}.list li{padding:6px 0 6px 28px;position:relative;color:#CFE3E3}
.list li:before{content:"✓";position:absolute;left:0;color:#75F8E8;font-weight:800}
.form{background:#fff;color:#0B1F21;border-radius:24px;padding:24px;box-shadow:0 30px 70px rgba(0,0,0,.4)}
label{display:block;font-weight:600;font-size:.92rem;margin-top:14px}
input{width:100%;min-height:48px;border:1.5px solid #9CB0B1;border-radius:12px;padding:0 14px;font-size:1rem;margin-top:5px;background:#fff;color:#0B1F21}
input:focus{outline:3px solid #99F6E4;border-color:#0F766E}
.form button{width:100%;margin-top:20px;font-size:1.1rem;padding:16px}
.form .fine{font-size:.85rem;color:#5B7375;margin:12px 0 0}
.err{color:#B91C1C;font-weight:600}
details{background:#fff;border:1px solid #D9E7E7;border-radius:16px;padding:16px 20px;margin-top:12px}
summary{font-weight:700;cursor:pointer;list-style:none}summary::-webkit-details-marker{display:none}
summary:after{content:"+";float:right;color:#0F766E;font-size:1.3rem;line-height:1}
details[open] summary:after{content:"−"}details p{margin:10px 0 0;color:#4D6668}
footer{background:#010608;color:#7C9A9C;padding:34px 0;font-size:.9rem}
footer a{color:#75F8E8}
@media(min-width:820px){
 .hero .wrap{grid-template-columns:1.15fr .85fr}.hero{padding:84px 0 96px}
 .compare{grid-template-columns:repeat(3,1fr)}
 .feat{grid-template-columns:1fr 1fr;gap:64px}.feat.rev .ph{order:-1}
 .tiles{grid-template-columns:repeat(3,1fr)}
 .buy .grid{grid-template-columns:1.1fr .9fr;gap:56px}
}
`;

export function renderBuyPage(priceSen: number, earlyLeft: number | null = null, normalSen: number = priceSen, appUrl: string = ''): string {
  const base = appUrl ? (appUrl.endsWith('/') ? appUrl : appUrl + '/') : '';
  const img = (f: string, alt: string) => (base ? `<img src="${base}sales/${f}" alt="${alt}" loading="lazy" width="540" height="1169">` : '');
  const logo = base ? `<img src="${base}logo-penuh.png" alt="UntungLab">` : '<b style="color:#75F8E8">UntungLab</b>';
  const tryLink = base ? `<a class="btn ghost" href="${base}">Cuba percuma dahulu</a>` : '';
  const early = earlyLeft !== null;
  const priceBlock = early
    ? `<span class="badge">Harga Early Bird: ${earlyLeft} pembeli pertama yang tinggal</span><div class="price">${rm(priceSen)}<s>${rm(normalSen)}</s></div><p style="color:#A9C4C5;margin:8px 0 0">Bayar sekali, guna selamanya. Selepas ${earlyLeft} tempat ini habis, harga menjadi ${rm(normalSen)}.</p>`
    : `<div class="price">${rm(priceSen)}</div><p style="color:#A9C4C5;margin:8px 0 0">Bayar sekali, guna selamanya.</p>`;
  const body = `
<header class="top"><div class="wrap">${logo}<a class="btn sm" href="#beli">Beli ${rm(priceSen)}</a></div></header>

<div class="hero"><div class="wrap">
 <div>
  <div class="eyebrow">Untuk peniaga makanan rumah</div>
  <h1>Jual RM6. <em>Untung sebenar berapa?</em></h1>
  <p class="lead">UntungLab kira kos sebenar setiap menu anda: bahan, pembungkusan, masa dan kos operasi seperti sewa dan api. Anda terus nampak untung sebenar, dan harga yang patut dijual.</p>
  <div class="cta-row"><a class="btn" href="#beli">Beli sekarang, ${rm(priceSen)}</a>${tryLink}</div>
  <div class="note">Tiada akaun, tiada log masuk. Data kekal di telefon anda. Boleh digunakan tanpa internet.</div>
 </div>
 <div class="ph"><div class="phone"><div class="in">${img('dashboard.jpg', 'Dashboard UntungLab')}</div></div></div>
</div></div>

<section><div class="wrap">
 <div class="eyebrow" style="color:#0F766E">Masalahnya</div>
 <h2>Kos bahan sahaja <em>tidak cukup</em>.</h2>
 <p class="sub">Kebanyakan peniaga kira untung dengan menolak kos bahan daripada harga jual. Sewa, elektrik, gas, bungkusan dan masa anda sendiri terlepas pandang, jadi untung nampak besar tetapi sebenarnya kecil.</p>
 <div class="compare">
  <div class="num bad"><small>Anggaran biasa</small><b>RM5.09</b><span>harga jual tolak kos bahan</span></div>
  <div class="num good"><small>Untung sebenar</small><b>RM1.35</b><span>selepas semua kos, 22.5% margin</span></div>
  <div class="num"><small>Contoh</small><b>Brownies RM6</b><span>nombor sebenar daripada enjin UntungLab</span></div>
 </div>
</div></section>

<section class="alt"><div class="wrap">
 <div class="feat"><div class="t"><div class="tag">1. Bahan</div><h3>Isi harga pek dan kuantiti. Kos seunit keluar sendiri.</h3><p>Beli butter 250 g RM12? UntungLab tahu itu RM48 sekilogram dan kira kos bahan dalam resipi anda. Tak perlu kalkulator.</p></div><div class="ph"><div class="phone"><div class="in">${img('bahan.jpg', 'Senarai bahan dengan harga')}</div></div></div></div>
 <div class="feat rev"><div class="t"><div class="tag">2. Kos operasi</div><h3>Sewa, api dan air pun dikira.</h3><p>Masukkan kos bulanan perniagaan anda sekali sahaja. UntungLab membahagikannya kepada setiap menu dengan cara yang adil, jadi harga anda menanggung semuanya.</p></div><div class="ph"><div class="phone"><div class="in">${img('operasi.jpg', 'Skrin kos operasi')}</div></div></div></div>
 <div class="feat"><div class="t"><div class="tag">3. Hasil</div><h3>Untung sebenar. Bukan tekaan.</h3><p>Kos sebenar, untung sebiji dan margin, dengan status yang jelas seperti <b>Margin Sihat</b>, <b>Margin Rendah</b> atau <b>Menu Ini Rugi</b>.</p></div><div class="ph"><div class="phone"><div class="in">${img('hasil.jpg', 'Skrin hasil pengiraan')}</div></div></div></div>
 <div class="feat rev"><div class="t"><div class="tag">4. Cadangan harga</div><h3>Pilih margin. Harga terus keluar.</h3><p>Nak untung 20%, 30%, 40% atau 50%? Satu ketikan dan UntungLab beritahu harga yang patut dijual, dikira daripada kos sebenar anda.</p></div><div class="ph"><div class="phone"><div class="in">${img('cadangan.jpg', 'Skrin cadangan harga')}</div></div></div></div>
 <div class="feat"><div class="t"><div class="tag">5. Dashboard</div><h3>Semua menu. Satu skrin.</h3><p>Nampak menu mana yang menguntungkan dan mana yang rugi, serta purata margin perniagaan anda.</p></div><div class="ph"><div class="phone"><div class="in">${img('dashboard.jpg', 'Dashboard semua menu')}</div></div></div></div>
</div></section>

<section class="dark"><div class="wrap">
 <h2>Dibina supaya <em>mudah dan selamat</em>.</h2>
 <p class="sub">Tiada langganan bulanan. Tiada data anda dihantar ke mana-mana.</p>
 <div class="tiles">
  <div class="tile"><b>Tanpa akaun</b><span>Buka dan guna. Tiada pendaftaran atau kata laluan.</span></div>
  <div class="tile"><b>Data di telefon anda</b><span>Resipi dan harga anda kekal pada peranti anda. Ada fungsi sandaran bila anda tukar telefon.</span></div>
  <div class="tile"><b>Boleh luar talian</b><span>Pasang ke skrin utama seperti app dan guna walaupun tiada internet.</span></div>
 </div>
</div></section>

<section class="buy" id="beli"><div class="wrap"><div class="grid">
 <div>
  <div class="eyebrow">Beli UntungLab</div>
  <h2 style="margin-top:8px">Kira betul. <em>Untung jelas.</em></h2>
  ${priceBlock}
  <ul class="list">
   <li>Akses seumur hidup, bayaran sekali sahaja</li>
   <li>Boleh digunakan pada 2 peranti</li>
   <li>Semua fungsi: kos operasi, hasil, cadangan harga, dashboard</li>
   <li>Kod lesen dihantar ke emel anda selepas bayaran</li>
   <li>Bayaran balik dalam 7 hari jika tidak sesuai</li>
  </ul>
 </div>
 <div class="form">
  <form id="f">
   <label for="n">Nama</label><input id="n" autocomplete="name" required maxlength="100">
   <label for="e">Emel (kod lesen dihantar ke sini)</label><input id="e" type="email" autocomplete="email" required maxlength="120">
   <label for="p">Nombor telefon</label><input id="p" type="tel" autocomplete="tel" required maxlength="20">
   <button class="btn" id="b" type="submit">Bayar ${rm(priceSen)}</button>
   <p id="m" class="err" role="alert"></p>
  </form>
  <p class="fine">Pembayaran selamat melalui ToyyibPay (FPX). Bayaran balik dalam 7 hari selepas pembelian: balas emel kod lesen anda.</p>
  <p class="fine">Nama, emel dan telefon anda hanya digunakan untuk menghantar kod lesen dan sokongan pembelian ini.</p>
 </div>
</div></div></section>

<section><div class="wrap" style="max-width:46rem">
 <h2>Soalan lazim</h2>
 <details><summary>Adakah saya boleh cuba dahulu?</summary><p>Boleh. Versi percuma membuka semua fungsi, dengan had bilangan: 2 menu, 10 bahan dan 2 pembungkusan. Beli bila anda sudah yakin.</p></details>
 <details><summary>Apa maksud akses seumur hidup?</summary><p>Anda bayar sekali dan tiada yuran bulanan. Akses seumur hidup bermaksud selagi produk UntungLab beroperasi.</p></details>
 <details><summary>Berapa peranti boleh digunakan?</summary><p>Satu kod lesen boleh digunakan pada 2 peranti, contohnya telefon dan tablet anda.</p></details>
 <details><summary>Bagaimana kalau saya tukar telefon?</summary><p>Data disimpan di telefon anda. Buat sandaran dalam UntungLab sebelum menukar telefon, kemudian pulihkan di telefon baharu dan masukkan kod lesen yang sama.</p></details>
 <details><summary>Perlukah internet?</summary><p>Hanya untuk membeli dan mengaktifkan kod lesen sekali. Selepas itu UntungLab boleh digunakan tanpa internet.</p></details>
 <details><summary>Bagaimana dengan bayaran balik?</summary><p>Dalam 7 hari selepas pembelian, balas emel kod lesen anda dan kami akan uruskan bayaran balik.</p></details>
 <details><summary>Adakah data saya dihantar kepada anda?</summary><p>Tidak. Resipi, bahan dan harga anda kekal pada peranti anda. Hanya nama, emel dan telefon digunakan untuk menghantar kod lesen dan sokongan pembelian.</p></details>
 <div style="text-align:center;margin-top:34px"><a class="btn" href="#beli">Beli ${rm(priceSen)}</a></div>
</div></section>

<footer><div class="wrap">UntungLab oleh Digital Sambal. Kira dengan betul, untung dengan yakin.</div></footer>

<script>
document.getElementById('f').addEventListener('submit',async(ev)=>{
 ev.preventDefault();const b=document.getElementById('b'),m=document.getElementById('m');
 b.disabled=true;m.textContent='';
 try{
  const r=await fetch('/api/order',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:document.getElementById('n').value,email:document.getElementById('e').value,phone:document.getElementById('p').value})});
  const j=await r.json();
  if(r.ok&&j.payUrl){location.href=j.payUrl;return;}
  m.textContent=r.status===400?'Semak semula nama, emel dan nombor telefon anda.':'Pembayaran tidak dapat dimulakan sekarang. Cuba sebentar lagi.'+(j.detail?' ['+j.detail+']':'');
 }catch(e){m.textContent='Tiada sambungan internet. Cuba lagi.';}
 b.disabled=false;
});
</script>`;
  return `<!doctype html>
<html lang="ms"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>UntungLab: tahu untung sebenar setiap menu</title>
<meta name="description" content="UntungLab mengira kos sebenar menu anda termasuk kos operasi, menunjukkan untung sebenar dan mencadangkan harga jualan. Bayar sekali, guna selamanya.">
<meta name="theme-color" content="#011416">
<style>${SALES_CSS}</style></head><body>${body}</body></html>`;
}

export function renderReturnPage(): string {
  return shell(
    'Kod lesen UntungLab',
    `<h1>Terima kasih</h1>
<div class="card" id="c"><p id="s">Menunggu pengesahan bayaran…</p></div>
<script>
const id=new URLSearchParams(location.search).get('order_id');
const c=document.getElementById('c');
let tries=0;
async function poll(){
 if(!id||!/^[0-9a-f]{32}$/.test(id)){c.innerHTML='<p class="err">Pautan ini tidak lengkap. Semak emel anda untuk kod lesen.</p>';return;}
 try{
  const r=await fetch('/api/order/'+id);const j=await r.json();
  if(j.status==='paid'&&j.code){
   c.innerHTML='<p>Kod lesen anda:</p><div class="code" id="k"></div><p>Kod ini juga dihantar ke emel anda. Buka UntungLab, pergi ke <b>Lagi &gt; Lesen</b> dan masukkan kod ini.</p>';
   document.getElementById('k').textContent=j.code;return;
  }
 }catch(e){}
 tries++;
 if(tries>40){c.innerHTML='<p>Pengesahan bayaran mengambil masa lebih lama. Kod akan dihantar ke emel anda sebaik sahaja bayaran disahkan. Jika tiada dalam masa 30 minit, hubungi kami dengan emel pembelian anda.</p>';return;}
 setTimeout(poll,3000);
}
poll();
</script>`,
  );
}
