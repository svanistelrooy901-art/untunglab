/**
 * Admin dashboard (D-90). One static page: it contains no secret. Mamu types ADMIN_TOKEN into it; the token lives in a
 * JavaScript variable only (never localStorage, cookies or the URL), so closing or reloading the tab forgets it.
 * All text from the database is written with textContent, never innerHTML.
 */
/**
 * The other products keep their own data and their own admin token (D-100): this page calls their Workers directly from
 * the browser (CORS allows only this page's address), so UntungLab's Worker never holds another product's secret.
 */
export const PRODUCT_APIS = { sme: 'https://smelab.untunglab.space', jl: 'https://jualan.untunglab.space' } as const;

export const ADMIN_CSP =
  `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self' ${PRODUCT_APIS.sme} ${PRODUCT_APIS.jl}; img-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'; object-src 'none'`;

export function renderAdminPage(): string {
  return `<!doctype html>
<html lang="ms"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>UntungLab Admin</title>
<style>
:root{--bg:#020F12;--ink:#E6FBF8;--mut:#8FB3B5;--line:rgba(117,248,234,.16);--glass:rgba(8,32,36,.72);--teal:#0AA89A;--mint:#75F8E8;--blue:#2F7BFF;--vio:#7A5CFF;--bad:#FF5C7A;--grad:linear-gradient(90deg,#0AA89A,#2F7BFF 70%,#7A5CFF)}
*{box-sizing:border-box}
body{margin:0;color:var(--ink);font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background-color:#020F12;background-image:radial-gradient(60rem 30rem at 10% -10%,rgba(10,168,154,.28),transparent 60%),radial-gradient(50rem 30rem at 100% 0,rgba(122,92,255,.22),transparent 55%);background-repeat:no-repeat;background-attachment:fixed;color-scheme:dark;min-height:100vh;-webkit-font-smoothing:antialiased}
main{max-width:46rem;margin:0 auto;padding:22px 16px 70px}
h1{font-size:1.5rem;letter-spacing:-.02em;margin:0 0 4px;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
h1::after{content:"";display:block;height:2px;width:56px;margin-top:8px;background:var(--grad);border-radius:2px;box-shadow:0 0 14px var(--blue)}
h2{font-size:.78rem;letter-spacing:.14em;text-transform:uppercase;color:var(--mint);margin:0 0 10px;font-weight:700}
p{color:var(--mut)}
.card{background:var(--glass);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid var(--line);border-radius:18px;padding:16px;margin-top:14px;box-shadow:0 10px 40px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.04)}
.card .card{background:rgba(255,255,255,.03);box-shadow:none}
input,textarea{width:100%;min-height:44px;color:var(--ink);background:rgba(2,15,18,.7);border:1px solid rgba(117,248,234,.28);border-radius:12px;padding:0 12px;font-size:1rem}
input:focus,textarea:focus{outline:none;border-color:var(--mint);box-shadow:0 0 0 3px rgba(117,248,234,.18)}
input::placeholder,textarea::placeholder{color:#5F8A8C}
textarea{min-height:60px;padding:8px 12px;font:inherit;margin-top:8px}
button{min-height:44px;border:0;border-radius:12px;background:var(--grad);color:#fff;font-weight:700;font-size:.95rem;padding:0 14px;cursor:pointer;box-shadow:0 6px 22px rgba(47,123,255,.3);transition:transform .12s,box-shadow .12s}
button:hover{transform:translateY(-1px);box-shadow:0 8px 28px rgba(47,123,255,.45)}button:active{transform:none}
button:focus-visible{outline:2px solid var(--mint);outline-offset:2px}
button.alt{background:transparent;color:var(--mint);border:1px solid rgba(117,248,234,.5);box-shadow:none}
button.alt:hover{background:rgba(117,248,234,.08)}
button.bad{background:linear-gradient(90deg,#C81E4A,#FF5C7A);box-shadow:0 6px 22px rgba(255,92,122,.28)}
button[disabled]{opacity:.5;cursor:default;transform:none}
.row{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.row>*{flex:1 1 9rem}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(8.5rem,1fr));gap:8px}
.stat{position:relative;background:rgba(117,248,234,.05);border:1px solid var(--line);border-radius:14px;padding:10px 12px;overflow:hidden}
.stat::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--grad)}
.stat b{display:block;font-size:1.55rem;line-height:1.2;font-variant-numeric:tabular-nums;text-shadow:0 0 18px rgba(117,248,234,.35)}
.stat span{font-size:.75rem;color:var(--mut)}
.msg{margin-top:8px;font-weight:600}.err{color:var(--bad)}.ok{color:var(--mint)}
.mono{font:600 1rem ui-monospace,Menlo,Consolas,monospace;word-break:break-all;color:var(--mint);letter-spacing:.03em}
.muted{color:var(--mut);font-size:.85rem}.muted .mono{font-size:.8rem;font-weight:600}
table{width:100%;border-collapse:collapse;font-size:.85rem}
td,th{text-align:left;padding:7px 4px;border-bottom:1px solid var(--line);vertical-align:top;word-break:break-word}
th{color:var(--mut);font-weight:600;font-size:.72rem;letter-spacing:.08em;text-transform:uppercase}
.pill{white-space:nowrap;display:inline-block;border-radius:999px;padding:1px 9px;font-size:.72rem;font-weight:700;background:rgba(255,255,255,.1);color:var(--mut);border:1px solid var(--line)}
.pill.active,.pill.paid{background:rgba(10,168,154,.18);color:var(--mint);border-color:rgba(117,248,234,.4)}
.pill.revoked{background:rgba(255,92,122,.16);color:#FF9DB0;border-color:rgba(255,92,122,.4)}
.bars{display:flex;align-items:flex-end;gap:3px;height:96px;margin-top:8px;padding-bottom:1px;border-bottom:1px solid var(--line)}
.bar{flex:1 1 0;min-height:2px;background:linear-gradient(180deg,var(--mint),var(--blue) 60%,var(--vio));border-radius:3px 3px 0 0;box-shadow:0 0 12px rgba(47,123,255,.45);transform-origin:bottom;animation:rise .5s ease-out both}
.bar.zero{background:rgba(143,179,181,.35);box-shadow:none}
@keyframes rise{from{transform:scaleY(0)}to{transform:scaleY(1)}}
.axis{display:flex;justify-content:space-between;font-size:.72rem;color:var(--mut);margin-top:4px}
ul.plain{list-style:none;margin:0;padding:0}ul.plain li{padding:9px 0;border-bottom:1px solid var(--line);font-size:.9rem;word-break:break-word}
.hide{display:none}
.tabs{display:flex;gap:4px;margin-top:14px;overflow-x:auto;padding-bottom:2px}
.tab{flex:0 0 auto;min-height:40px;padding:0 12px;background:transparent;color:var(--mut);border:1px solid var(--line);box-shadow:none;border-radius:999px}
.tab:hover{background:rgba(117,248,234,.08);transform:none;box-shadow:none}
.tab[aria-selected=true]{background:var(--grad);color:#fff;border-color:transparent;box-shadow:0 6px 22px rgba(47,123,255,.3)}
.kv{display:flex;flex-wrap:wrap;gap:4px 12px;margin:6px 0}
#trOn{margin-top:10px;border-top:1px solid var(--line);padding-top:10px}#trOn summary{cursor:pointer;color:var(--mint);font-weight:700;font-size:.85rem;letter-spacing:.04em;padding:6px 0}#trOn[open] summary{margin-bottom:8px}
@media (prefers-reduced-motion:reduce){.bar{animation:none}button{transition:none}}
</style></head><body><main>
<h1>UntungLab Admin</h1>
<div class="card" id="login">
  <h2>Masuk</h2>
  <p class="muted">Masukkan ADMIN_TOKEN. Ia hanya disimpan dalam halaman ini; tutup atau muat semula tab, ia hilang.</p>
  <input id="token" type="password" autocomplete="off" aria-label="Admin token">
  <div class="row"><button id="enter">Masuk</button></div>
  <div class="msg err" id="loginErr"></div>
</div>
<div id="app" class="hide">
  <div class="tabs" id="tabs" role="tablist" aria-label="Produk">
    <button class="tab" role="tab" data-tab="ul" aria-selected="true">UL</button>
    <button class="tab" role="tab" data-tab="sme" aria-selected="false">smeLab</button>
    <button class="tab" role="tab" data-tab="jl" aria-selected="false">JL</button>
    <button class="tab" role="tab" data-tab="kl" aria-selected="false">KL</button>
    <button class="tab" role="tab" data-tab="pl" aria-selected="false">PL</button>
    <button class="tab" id="lock" style="margin-left:auto">Kunci</button>
  </div>
  <div id="p-ul">
  <div class="card"><h2>Ringkasan</h2><div class="stats" id="stats"></div><div class="row"><button class="alt" id="refresh">Muat semula data</button></div></div>
  <div class="card"><h2>Cari pembeli</h2>
    <input id="q" placeholder="Emel atau kod UL-XXXX-XXXX-XXXX" aria-label="Emel atau kod">
    <div class="row"><button id="find">Cari</button></div>
    <div class="msg" id="findMsg"></div><div id="results"></div></div>
  <div class="card"><h2>Jana kod percuma</h2>
    <p class="muted">Untuk akaun sendiri, tester atau hadiah (RM0). Tak guna tempat early bird dan tak dikira dalam jumlah RM. Emel kod dihantar sekali.</p>
    <input id="iname" placeholder="Nama" aria-label="Nama"><div style="height:8px"></div>
    <input id="iemail" type="email" placeholder="Emel" aria-label="Emel">
    <div class="row"><button id="issue">Jana kod</button></div>
    <div class="msg" id="issueMsg"></div><div class="mono" id="issueCode"></div></div>
  <div class="card"><h2>Pengguna dan pelawat</h2><div class="stats" id="ustats"></div>
    <div class="bars" id="ubars" role="img" aria-label="Pemasangan baharu setiap hari, 30 hari terakhir"></div><div class="axis"><span id="uFrom"></span><span id="uMax"></span><span id="uTo"></span></div>
    <p class="muted" id="uconv"></p>
    <p class="muted" id="ulang"></p>
    <p class="muted hide" id="trOff">Mahu tahu asal pelawat (rujukan, negara, peranti)? Isi secret CF_ANALYTICS_TOKEN di Worker dan bahagian "Asal pelawat" akan muncul di bawah.</p>
    <div class="msg err" id="trErr"></div>
    <details class="more hide" id="trOn"><summary>Asal pelawat dan halaman (Cloudflare)</summary>
      <div class="stats" id="trStats"></div>
      <div class="bars" id="trBars" role="img" aria-label="Lawatan setiap hari, 30 hari terakhir"></div><div class="axis"><span id="trFrom"></span><span id="trMax"></span><span id="trTo"></span></div>
      <p class="muted" id="trFunnel"></p>
      <h2 style="margin-top:14px">Dari mana pelawat datang</h2><table><thead><tr><th>Sumber</th><th>Lawatan</th></tr></thead><tbody id="trRef"></tbody></table>
      <h2 style="margin-top:14px">Halaman</h2><table><thead><tr><th>Halaman</th><th>Lawatan</th><th>Dibuka</th></tr></thead><tbody id="trPages"></tbody></table>
      <div class="row" style="margin-top:14px"><div><h2>Peranti</h2><table><tbody id="trDev"></tbody></table></div><div><h2>Negara</h2><table><tbody id="trCty"></tbody></table></div></div>
      <p class="muted">30 hari, waktu Malaysia. Pelayar dengan ad-blocker dan app yang dibuka tanpa internet tak dikira, jadi nombor sebenar lebih tinggi sedikit. App hanya dikira bila dibuka; skrin dan data dalam app tak dihantar.</p>
    </details>
    <p class="muted">Lawatan dan klik dikira di server tanpa cookie. Pemasangan dikira daripada satu ID rawak dalam app; tiada emel, IP atau data perniagaan disimpan. Robot dan pratonton pautan tak dikira.</p></div>
  <div class="card"><h2>Jualan 30 hari</h2><div class="bars" id="bars" role="img" aria-label="Pesanan berbayar setiap hari, 30 hari terakhir"></div><div class="axis"><span id="axFrom"></span><span id="axMax"></span><span id="axTo"></span></div><p class="muted" id="conv"></p><p class="muted">Hari dikira ikut waktu Malaysia. Pesanan RM0 tak dikira.</p></div>
  <div class="card"><h2>Dari mana pembeli datang</h2><p class="muted">Letak <span class="mono">?src=fb</span> pada pautan beli, contohnya <span class="mono">https://beli.untunglab.space/beli?src=fb</span>. Guna huruf kecil, nombor, - atau _ (maks 20).</p><table><thead><tr><th>Sumber</th><th>Klik beli</th><th>Bayar</th></tr></thead><tbody id="sources"></tbody></table></div>
  <div class="card"><h2>Dibeli tapi belum diaktifkan</h2><p class="muted">Mungkin tersekat. Hantar semula emel atau tanya mereka.</p><ul class="plain" id="unact"></ul></div>
  <div class="card"><h2>Emel kod belum direkod hantar</h2><p class="muted">Tekan Hantar semula; kalau masih gagal, salin kod dan beri sendiri.</p><ul class="plain" id="mailp"></ul></div>
  <div class="card"><h2>Pesanan terkini</h2><div style="overflow-x:auto"><table><thead><tr><th>Tarikh</th><th>Pembeli</th><th style="white-space:nowrap">RM</th><th>Status</th></tr></thead><tbody id="recent"></tbody></table></div></div>
  <div class="card"><h2>Eksport dan log</h2><div class="row"><button class="alt" id="export">Muat turun CSV (semua pembeli)</button></div><div class="msg" id="expMsg"></div>
    <h2 style="margin-top:14px">Tindakan admin terkini</h2><ul class="plain" id="log"></ul></div>
  </div>
  <div id="p-sme" class="hide"></div>
  <div id="p-jl" class="hide"></div>
  <div id="p-kl" class="hide"></div>
  <div id="p-pl" class="hide"></div>
</div>
<script>
(function(){
var token='';
var $=function(id){return document.getElementById(id)};
function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e}
function rm(sen){return (sen/100).toFixed(2)}
function api(path,body){
  return fetch(path,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify(body||{})}).then(function(r){
    return r.json().catch(function(){return {}}).then(function(j){if(!r.ok){var e=new Error(r.status===401?'Token salah.':r.status===429?'Terlalu banyak cubaan. Tunggu sebentar.':'Gagal ('+r.status+').');e.status=r.status;throw e}return j})});
}
function msg(id,text,bad){var m=$(id);m.textContent=text;m.className='msg '+(bad?'err':'ok')}
function pill(s){return el('span','pill '+s,s)}
function renderStats(s){
  var box=$('stats');box.textContent='';
  var items=[['Pesanan',s.orders],['Dah bayar (pengguna)',s.paid],['Kod percuma (ujian)',s.complimentary],['Kod dari smeLab',s.smelab],['Belum bayar',s.pending],['Jumlah RM',rm(s.revenueSen)],['Lesen aktif',s.activeLicenses],['Dibatalkan',s.revokedLicenses],['Peranti aktif',s.devices]];
  if(s.earlyBirdLeft!==null&&s.earlyBirdLeft!==undefined)items.push(['Early bird tinggal',s.earlyBirdLeft]);
  items.forEach(function(i){var d=el('div','stat');d.appendChild(el('b','',String(i[1])));d.appendChild(el('span','',i[0]));box.appendChild(d)});
  var t=$('recent');t.textContent='';
  s.recent.forEach(function(o){var tr=el('tr');
    tr.appendChild(el('td','',o.createdAt.slice(0,16).replace('T',' ')));
    var who=el('td');who.appendChild(el('div','',o.name));who.appendChild(el('div','muted',o.email));tr.appendChild(who);
    var am=el('td','',rm(o.amountSen));am.style.whiteSpace='nowrap';tr.appendChild(am);
    var st=el('td');st.appendChild(pill(o.licenseStatus||o.status));tr.appendChild(st);t.appendChild(tr)});
}
function day(d){var m=['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogo','Sep','Okt','Nov','Dis'];return Number(d.slice(8))+' '+m[Number(d.slice(5,7))-1]}
function renderInsights(i,s){
  lastInsights=i;
  var bars=$('bars');bars.textContent='';var max=0;
  i.daily.forEach(function(d){if(d.paid>max)max=d.paid});
  i.daily.forEach(function(d){var b=el('div','bar'+(d.paid?'':' zero'));b.style.height=(d.paid&&max?Math.max(4,Math.round(d.paid/max*100)):2)+'%';b.title=day(d.day)+': '+d.paid+' bayar, RM'+rm(d.revenueSen)+', '+d.created+' klik beli';bars.appendChild(b)});
  $('axFrom').textContent=day(i.daily[0].day);$('axTo').textContent=day(i.daily[i.daily.length-1].day);$('axMax').textContent='tertinggi '+max+'/hari';
  var tot=s.paid+s.pending;$('conv').textContent=tot?('Kadar bayar: '+s.paid+' daripada '+tot+' yang klik beli ('+Math.round(s.paid/tot*100)+'%). Selebihnya belum bayar atau masih dalam proses.'):'Belum ada pesanan.';
  var sb=$('sources');sb.textContent='';
  i.sources.forEach(function(x){var tr=el('tr');tr.appendChild(el('td','',x.source||'(tiada sumber)'));tr.appendChild(el('td','',String(x.orders)));tr.appendChild(el('td','',String(x.paid)));sb.appendChild(tr)});
  if(!i.sources.length){var er=el('tr'),ec=el('td','muted','Tiada data lagi.');ec.colSpan=3;er.appendChild(ec);sb.appendChild(er)}
  function list(id,rows,withPaid,empty){var u=$(id);u.textContent='';
    rows.forEach(function(r){var li=el('li');li.appendChild(el('div','',r.name+' · '+r.email));li.appendChild(el('div','mono',r.code));if(withPaid&&r.paidAt)li.appendChild(el('div','muted','Bayar '+r.paidAt.slice(0,10)));
      var b=el('button','alt','Hantar semula emel');b.style.marginTop='6px';b.onclick=function(){b.disabled=true;api('/api/admin/resend',{orderId:r.orderId}).then(function(){b.textContent='Dihantar';return load()}).catch(function(e){b.textContent=e.message;b.disabled=false})};li.appendChild(b);u.appendChild(li)});
    if(!rows.length)u.appendChild(el('li','muted',empty))}
  list('unact',i.unactivated,true,'Semua pembeli dah aktifkan.');
  list('mailp',i.emailPending,false,'Tiada masalah emel.');
}
var lastInsights=null;
function pageLabel(p){var h=p.host||'',path=p.path||'/';
  if(h.indexOf('beli.')===0)return path==='/beli'?'Halaman jualan':path==='/terima'?'Selepas bayar':h+path;
  return 'App UntungLab'+(path&&path!=='/'&&path!=='/index.html'?' '+path:'')}
function rows(id,list,cols,empty){var t=$(id);t.textContent='';
  list.forEach(function(r){var tr=el('tr');cols.forEach(function(c){tr.appendChild(el('td','',String(c(r))))});t.appendChild(tr)});
  if(!list.length){var er=el('tr'),ec=el('td','muted',empty);ec.colSpan=cols.length;er.appendChild(ec);t.appendChild(er)}}
function renderTraffic(t){
  $('trErr').textContent='';
  if(!t.configured){$('trOff').className='muted';$('trOn').className='hide';return}
  $('trOff').className='muted hide';
  if(t.error){$('trOn').className='hide';$('trErr').textContent='Tak dapat baca data Cloudflare: '+t.error;return}
  $('trOn').className='';
  var tot=0,views=0,max=0;t.daily.forEach(function(d){tot+=d.visits;views+=d.views;if(d.visits>max)max=d.visits});
  var merged={},order=[];t.pages.forEach(function(p){var k=pageLabel(p);if(!merged[k]){merged[k]={label:k,visits:0,views:0};order.push(k)}merged[k].visits+=p.visits;merged[k].views+=p.views});
  var pages=order.map(function(k){return merged[k]});
  var buy=merged['Halaman jualan']?merged['Halaman jualan'].visits:0,app=0;pages.forEach(function(p){if(p.label.indexOf('App')===0)app+=p.views});
  var today=t.daily[t.daily.length-1];
  var box=$('trStats');box.textContent='';
  [['Lawatan (30 hari)',tot],['Hari ini',today?today.visits:0],['Lawat halaman jualan',buy],['App dibuka (online)',app],['Halaman dibuka',views]].forEach(function(i){var d=el('div','stat');d.appendChild(el('b','',String(i[1])));d.appendChild(el('span','',i[0]));box.appendChild(d)});
  var bars=$('trBars');bars.textContent='';
  t.daily.forEach(function(d){var b=el('div','bar'+(d.visits?'':' zero'));b.style.height=(d.visits&&max?Math.max(4,Math.round(d.visits/max*100)):2)+'%';b.title=day(d.day)+': '+d.visits+' lawatan, '+d.views+' halaman';bars.appendChild(b)});
  $('trFrom').textContent=day(t.daily[0].day);$('trTo').textContent=day(t.daily[t.daily.length-1].day);$('trMax').textContent='tertinggi '+max+'/hari';
  var f=$('trFunnel');
  if(lastInsights){var cr=0,pd=0;lastInsights.daily.forEach(function(d){cr+=d.created;pd+=d.paid});
    f.textContent='Corong 30 hari: '+buy+' lawat halaman jualan → '+cr+' klik beli → '+pd+' bayar'+(buy?' ('+(Math.round(pd/buy*1000)/10)+'% daripada pelawat).':'.')}else f.textContent='';
  var dev={desktop:'Komputer',mobile:'Telefon',tablet:'Tablet'};
  rows('trRef',t.referrers,[function(r){return r.label||'(terus / tiada rujukan)'},function(r){return r.visits}],'Tiada data lagi.');
  rows('trPages',pages,[function(r){return r.label},function(r){return r.visits},function(r){return r.views}],'Tiada data lagi.');
  rows('trDev',t.devices,[function(r){return dev[r.label]||r.label||'?'},function(r){return r.visits}],'Tiada data.');
  rows('trCty',t.countries,[function(r){return r.label||'?'},function(r){return r.visits}],'Tiada data.');
}
function loadTraffic(){return api('/api/admin/traffic').then(renderTraffic).catch(function(e){$('trOn').className='hide';$('trErr').textContent=e.message})}
function renderUsage(u){
  var box=$('ustats');box.textContent='';
  [['Lawatan halaman beli (30 hari)',u.totals.view],['Tekan "Cuba percuma" (30 hari)',u.totals.start],['Pemasangan baharu (30 hari)',u.totals.installs30],['Jumlah pemasangan',u.installs.total],['Aktif 7 hari',u.installs.activeWeek]].forEach(function(i){var d=el('div','stat');d.appendChild(el('b','',String(i[1])));d.appendChild(el('span','',i[0]));box.appendChild(d)});
  var bars=$('ubars');bars.textContent='';var max=0;u.daily.forEach(function(d){if(d.installs>max)max=d.installs});
  u.daily.forEach(function(d){var b=el('div','bar'+(d.installs?'':' zero'));b.style.height=(d.installs&&max?Math.max(4,Math.round(d.installs/max*100)):2)+'%';b.title=day(d.day)+': '+d.installs+' pemasangan baharu, '+d.start+' tekan Cuba percuma, '+d.view+' lawatan';bars.appendChild(b)});
  $('uFrom').textContent=day(u.daily[0].day);$('uTo').textContent=day(u.daily[u.daily.length-1].day);$('uMax').textContent='tertinggi '+max+'/hari';
  var t=u.totals,parts=[];
  if(t.view)parts.push(Math.round(t.start/t.view*100)+'% lawatan menekan Cuba percuma');
  if(t.start)parts.push('Pemasangan baharu ialah '+Math.round(t.installs30/t.start*100)+'% daripada tekanan (kasar; ada yang buka app terus, tanpa halaman ini)');
  $('uconv').textContent=parts.join('. ')||'Belum ada data.';
  function tally(a){return a.map(function(x){return x.key+' '+x.n}).join(', ')||'-'}
  $('ulang').textContent='Bahasa: '+tally(u.installs.byLang)+'. Peranti: '+tally(u.installs.byPlatform)+'.';
}
function renderLog(l){var u=$('log');u.textContent='';
  l.entries.forEach(function(e){u.appendChild(el('li','',e.at.slice(0,16).replace('T',' ')+' UTC · '+e.action+' · '+e.target))});
  if(!l.entries.length)u.appendChild(el('li','muted','Belum ada.'))}
function load(){return api('/api/admin/stats').then(function(s){renderStats(s);return Promise.all([api('/api/admin/insights'),api('/api/admin/log'),api('/api/admin/usage')]).then(function(r){renderInsights(r[0],s);renderLog(r[1]);renderUsage(r[2]);loadTraffic()})})}
function card(r){
  var c=el('div','card');
  if(r.status==='unpaid'){c.appendChild(el('div','',r.email));c.appendChild(el('div','muted','Belum bayar (order '+r.orderId+')'));return c}
  c.appendChild(el('div','',r.name+' · '+r.email));
  c.appendChild(el('div','mono',r.code));
  var p=el('div');p.appendChild(pill(r.status));p.appendChild(el('span','muted',' '+r.devices.length+' peranti'));c.appendChild(p);
  r.devices.forEach(function(d){c.appendChild(el('div','muted',d.label+' · '+d.activatedAt.slice(0,10)))});
  if(r.source)c.appendChild(el('div','muted','Sumber: '+r.source));
  var note=el('textarea');note.maxLength=300;note.placeholder='Nota (contoh: minta refund 8 Okt)';note.value=r.note||'';note.setAttribute('aria-label','Nota');c.appendChild(note);
  var nb=el('button','alt','Simpan nota');nb.style.marginTop='6px';nb.onclick=function(){nb.disabled=true;api('/api/admin/note',{orderId:r.orderId,note:note.value}).then(function(){msg('findMsg','Nota disimpan.',false);return load()}).catch(function(e){msg('findMsg',e.message,true)}).then(function(){nb.disabled=false})};c.appendChild(nb);
  var row=el('div','row');
  function act(label,cls,path,confirmText,done){var b=el('button',cls,label);b.onclick=function(){
    if(confirmText&&!window.confirm(confirmText))return;
    b.disabled=true;api(path,{code:r.code,orderId:r.orderId}).then(function(){msg('findMsg',done,false);return find(true)}).catch(function(e){msg('findMsg',e.message,true)}).then(function(){b.disabled=false})};row.appendChild(b)}
  if(r.status==='revoked')act('Pulihkan kod','alt','/api/admin/restore','','Kod dipulihkan.');
  else act('Batalkan (revoke)','bad','/api/admin/revoke','Batalkan kod '+r.code+'? Peranti baharu tak boleh aktifkan lagi.','Kod dibatalkan.');
  act('Hantar semula emel','alt','/api/admin/resend','','Emel dihantar.');
  act('Reset peranti','alt','/api/admin/reset-devices','Kosongkan semua peranti untuk kod ini?','Peranti di-reset.');
  c.appendChild(row);return c;
}
function find(quiet){
  var q=$('q').value.trim();if(!q)return Promise.resolve();
  var body=q.indexOf('@')>=0?{email:q}:{code:q};
  return api('/api/admin/lookup',body).then(function(j){
    var box=$('results');box.textContent='';
    if(!quiet)msg('findMsg',j.results.length?'':'Tiada rekod.',!j.results.length);
    j.results.forEach(function(r){box.appendChild(card(r))});
    return load();
  }).catch(function(e){msg('findMsg',e.message,true)});
}
/* ---- other products: own data, own token (D-100) ---- */
var APIS=${JSON.stringify(PRODUCT_APIS)};
var P={sme:{name:'smeLab',base:APIS.sme,token:''},jl:{name:'JualanLab',base:APIS.jl,token:''}};
function tiles(box,items){box.textContent='';items.forEach(function(i){var d=el('div','stat');d.appendChild(el('b','',String(i[1])));d.appendChild(el('span','',i[0]));box.appendChild(d)})}
function when(t){return t?t.slice(0,16).replace('T',' '):'-'}
function say(node,text,bad){node.textContent=text;node.className='msg '+(bad?'err':'ok')}
function remote(p,action,body){
  return fetch(p.base+'/api/admin/'+action,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+p.token},body:JSON.stringify(body||{})}).then(function(r){
    return r.json().catch(function(){return {}}).then(function(j){
      if(!r.ok){var m=r.status===401?'Token salah.':r.status===429?'Terlalu banyak cubaan. Tunggu sebentar.':r.status===404?'Tak dijumpai (atau API admin belum dihidupkan di '+p.name+').':r.status===409?'Tak boleh: '+(j.error||'konflik')+'.':r.status===400?'Input tak sah: '+(j.error||'')+'.':'Gagal ('+r.status+').';var e=new Error(m);e.status=r.status;throw e}
      return j})},function(){throw new Error('Tak dapat sambung ke '+p.name+'. Semak token dan sambungan.')});
}
function simpleTable(head,rows){
  var wrap=el('div');wrap.style.overflowX='auto';var t=el('table');var h=el('tr');head.forEach(function(x){h.appendChild(el('th','',x))});var th=el('thead');th.appendChild(h);t.appendChild(th);
  var tb=el('tbody');rows.forEach(function(r){var tr=el('tr');r.forEach(function(c){var td=el('td');if(c&&c.nodeType)td.appendChild(c);else td.textContent=String(c);tr.appendChild(td)});tb.appendChild(tr)});
  if(!rows.length){var er=el('tr'),ec=el('td','muted','Tiada data lagi.');ec.colSpan=head.length;er.appendChild(ec);tb.appendChild(er)}
  t.appendChild(tb);wrap.appendChild(t);return wrap}
function who(name,email){var d=el('div');d.appendChild(el('div','',name));d.appendChild(el('div','muted',email));return d}
function connectUi(p,box,build){
  box.textContent='';
  var cc=el('div','card');cc.appendChild(el('h2','','Sambung ke '+p.name));
  cc.appendChild(el('p','muted','Token admin '+p.name+' berasingan daripada UntungLab. Ia hanya disimpan dalam halaman ini; tutup atau muat semula tab, ia hilang.'));
  var inp=el('input');inp.type='password';inp.autocomplete='off';inp.setAttribute('aria-label','Token admin '+p.name);cc.appendChild(inp);
  var row=el('div','row');var go=el('button','','Sambung');row.appendChild(go);cc.appendChild(row);
  var m=el('div','msg err');cc.appendChild(m);box.appendChild(cc);
  var dash=el('div','hide');box.appendChild(dash);
  var built=build(dash);
  function enter(){p.token=inp.value.trim();inp.value='';m.textContent='';go.disabled=true;
    built.load().then(function(){cc.className='card hide';dash.className=''}).catch(function(e){p.token='';m.textContent=e.message}).then(function(){go.disabled=false})}
  go.onclick=enter;inp.addEventListener('keydown',function(e){if(e.key==='Enter')enter()});
}
function lookupCard(title,placeholder,label){
  var c=el('div','card');c.appendChild(el('h2','',title));
  var q=el('input');q.placeholder=placeholder;q.setAttribute('aria-label',label);c.appendChild(q);
  var r=el('div','row');var b=el('button','','Cari');r.appendChild(b);c.appendChild(r);
  var m=el('div','msg');c.appendChild(m);var res=el('div');c.appendChild(res);
  return {card:c,q:q,btn:b,msg:m,res:res}}
function buildSme(dash){
  var p=P.sme;
  var c1=el('div','card');c1.appendChild(el('h2','','Ringkasan smeLab'));var st=el('div','stats');c1.appendChild(st);
  c1.appendChild(el('p','muted','Bayaran balik dibuat manual (bank atau DuitNow); selepas itu batalkan akses di bawah.'));
  var rr=el('div','row');var rf=el('button','alt','Muat semula data');rr.appendChild(rf);c1.appendChild(rr);dash.appendChild(c1);
  var L=lookupCard('Cari pembeli (smeLab)','Emel atau ID pesanan','Emel atau ID pesanan smeLab');dash.appendChild(L.card);
  var c3=el('div','card');c3.appendChild(el('h2','','Pesanan terkini'));var rec=el('div');c3.appendChild(rec);dash.appendChild(c3);
  var items={untunglab:'UntungLab',jualanlab:'JualanLab',combo:'Combo'};
  function load(){return remote(p,'stats').then(function(s){
    tiles(st,[['Akaun',s.accounts],['Pesanan',s.orders.total],['Dah bayar',s.orders.paid],['Belum bayar',s.orders.pending],['Jumlah RM',rm(s.revenueSen)],['UL sahaja',s.byItem.untunglab],['JL sahaja',s.byItem.jualanlab],['Combo',s.byItem.combo],['Akses UL aktif',s.active.untunglab],['Akses JL aktif',s.active.jualanlab],['Akses dibatalkan',s.revoked],['Early bird UL tinggal',s.earlyLeft.untunglab],['Early bird JL tinggal',s.earlyLeft.jualanlab]]);
    rec.textContent='';rec.appendChild(simpleTable(['Tarikh','Pembeli','Item','Status'],s.recent.map(function(o){return [when(o.createdAt),who(o.name,o.email),items[o.item]+' RM'+rm(o.amountSen),pill(o.status)]})))})}
  function show(j){
    L.res.textContent='';var a=j.account;var card=el('div','card');
    card.appendChild(el('div','',(a.name||'-')+' · '+a.email));
    card.appendChild(el('div','muted','Akaun dibuat '+when(a.createdAt)+(a.complimentary?' · akaun percuma (COMP_EMAILS)':'')));
    card.appendChild(el('h2','','Akses')).style.marginTop='10px';
    j.entitlements.forEach(function(e){
      var li=el('div','kv');li.appendChild(el('b','',e.product==='untunglab'?'UntungLab':'JualanLab'));li.appendChild(pill(e.revokedAt?'revoked':'active'));li.appendChild(el('span','muted',e.source==='purchase'?'beli':'lesen UL sedia ada'));
      if(e.ulCode)li.appendChild(el('span','mono',e.ulCode));card.appendChild(li);
      var b=e.revokedAt?el('button','alt','Pulihkan akses'):el('button','bad','Batalkan akses');
      b.onclick=function(){
        if(!e.revokedAt&&!window.confirm('Batalkan akses '+(e.product==='untunglab'?'UntungLab':'JualanLab')+' untuk '+a.email+'? Kod lesen UntungLab tak dibatalkan di sini; guna tab UL untuk itu.'))return;
        b.disabled=true;remote(p,e.revokedAt?'restore':'revoke',{entitlementId:e.id}).then(function(){say(L.msg,e.revokedAt?'Akses dipulihkan.':'Akses dibatalkan.',false);return find(true).then(load)}).catch(function(x){say(L.msg,x.message,true)}).then(function(){b.disabled=false})};
      card.appendChild(b)});
    if(!j.entitlements.length)card.appendChild(el('div','muted','Tiada akses.'));
    card.appendChild(el('h2','','Pesanan')).style.marginTop='10px';
    j.orders.forEach(function(o){
      var li=el('div','kv');li.appendChild(el('b','',items[o.item]+' RM'+rm(o.amountSen)));li.appendChild(pill(o.status));li.appendChild(el('span','muted',when(o.createdAt)));if(o.ulCode)li.appendChild(el('span','mono',o.ulCode));card.appendChild(li);
      if(o.status==='paid'){var b=el('button','alt','Hantar semula resit');b.onclick=function(){b.disabled=true;remote(p,'resend',{orderId:o.id}).then(function(){say(L.msg,'Resit dihantar.',false)}).catch(function(x){say(L.msg,x.message,true)}).then(function(){b.disabled=false})};card.appendChild(b)}});
    if(!j.orders.length)card.appendChild(el('div','muted','Tiada pesanan.'));
    L.res.appendChild(card)}
  function find(quiet){var v=L.q.value.trim();if(!v)return Promise.resolve();
    return remote(p,'lookup',v.indexOf('@')>=0?{email:v}:{orderId:v}).then(function(j){if(!quiet)say(L.msg,'',false);show(j)}).catch(function(x){L.res.textContent='';say(L.msg,x.status===404?'Tiada rekod.':x.message,true)})}
  L.btn.onclick=function(){find(false)};L.q.addEventListener('keydown',function(e){if(e.key==='Enter')find(false)});
  rf.onclick=function(){load().catch(function(x){say(L.msg,x.message,true)})};
  return {load:load}}
function buildJl(dash){
  var p=P.jl;
  var c1=el('div','card');c1.appendChild(el('h2','','Ringkasan JualanLab'));var st=el('div','stats');c1.appendChild(st);
  c1.appendChild(el('p','muted','Bilangan sahaja. Jumlah jualan dan pelanggan penjual tak dipaparkan. Pelan penuh ikut pembelian di smeLab; beri atau tarik akses di tab smeLab.'));
  var rr=el('div','row');var rf=el('button','alt','Muat semula data');rr.appendChild(rf);c1.appendChild(rr);dash.appendChild(c1);
  var L=lookupCard('Cari penjual (JualanLab)','Emel penjual','Emel penjual JualanLab');dash.appendChild(L.card);
  var c3=el('div','card');c3.appendChild(el('h2','','Kedai terkini'));var rec=el('div');c3.appendChild(rec);dash.appendChild(c3);
  function plan(plan,onTrial){return plan==='pos'?'dibeli':onTrial?'bulan percuma':'percuma'}
  function load(){return remote(p,'stats').then(function(s){
    tiles(st,[['Pengguna',s.users],['Kedai',s.shops],['POS penuh dibeli',s.bought],['Bulan percuma berjalan',s.onTrial],['Tamat dalam 7 hari',s.trialEndingSoon],['Pelan percuma (tamat)',s.free],['Jualan 7 hari',s.soldLast7],['Jualan 30 hari',s.soldLast30],['Kedai aktif 7 hari',s.activeShops7],['Senarai tunggu',s.waitlist]]);
    rec.textContent='';rec.appendChild(simpleTable(['Tarikh','Kedai','Pelan'],s.recent.map(function(r){var d=el('div');d.appendChild(pill(plan(r.plan,r.onTrial)));if(r.plan!=='pos'&&r.trialEndsAt)d.appendChild(el('div','muted','sampai '+r.trialEndsAt.slice(0,10)));return [when(r.createdAt),who(r.name,r.email),d]})))})}
  function show(j,email){
    L.res.textContent='';var card=el('div','card');
    card.appendChild(el('div','',(j.user.name||'-')+' · '+j.user.email));
    card.appendChild(el('div','muted','Akaun dibuat '+when(j.user.createdAt)+(j.user.smeLab?' · sudah ada akaun smeLab':'')));
    var s=j.shop;
    if(!s){card.appendChild(el('div','muted','Belum buka kedai.'));L.res.appendChild(card);return}
    card.appendChild(el('h2','',s.name)).style.marginTop='10px';
    var k=el('div','kv');k.appendChild(pill(plan(s.plan,s.onTrial)));if(s.plan!=='pos'&&s.trialEndsAt)k.appendChild(el('span','muted','bulan percuma sampai '+s.trialEndsAt.slice(0,10)));if(s.ulOwner)k.appendChild(el('span','muted','ada UntungLab'));card.appendChild(k);
    card.appendChild(el('div','muted','Item aktif '+s.activeItems+' · jualan '+s.sales+' · jualan terakhir '+when(s.lastSaleAt)));
    if(s.plan==='pos'){card.appendChild(el('div','muted','Sudah beli POS penuh; tiada bulan percuma untuk dipanjangkan.'))}
    else{var row=el('div','row');[7,14,30].forEach(function(n){var b=el('button','alt','+'+n+' hari percuma');b.onclick=function(){b.disabled=true;
      remote(p,'extend-trial',{email:email,days:n}).then(function(r){say(L.msg,'Bulan percuma sampai '+r.trialEndsAt.slice(0,10)+'.',false);return find(true).then(load)}).catch(function(x){say(L.msg,x.message,true)}).then(function(){b.disabled=false})};row.appendChild(b)});card.appendChild(row)}
    L.res.appendChild(card)}
  function find(quiet){var v=L.q.value.trim().toLowerCase();if(!v)return Promise.resolve();
    return remote(p,'lookup',{email:v}).then(function(j){if(!quiet)say(L.msg,'',false);show(j,v)}).catch(function(x){L.res.textContent='';say(L.msg,x.status===404?'Tiada rekod.':x.message,true)})}
  L.btn.onclick=function(){find(false)};L.q.addEventListener('keydown',function(e){if(e.key==='Enter')find(false)});
  rf.onclick=function(){load().catch(function(x){say(L.msg,x.message,true)})};
  return {load:load}}
/* KiraLab and PromoLab: not launched; the waiting list lives on smeLab */
var soon={};
function buildSoon(box,key,app,name,note){
  box.textContent='';var c=el('div','card');c.appendChild(el('h2','',name));c.appendChild(el('p','muted',note));
  var info=el('p','muted');c.appendChild(info);var ul=el('ul','plain');c.appendChild(ul);box.appendChild(c);
  soon[key]=function(){ul.textContent='';
    if(!P.sme.token){info.textContent='Sambung tab smeLab dahulu untuk lihat senarai tunggu.';return}
    info.textContent='Memuatkan...';
    remote(P.sme,'waitlist',{app:app}).then(function(j){info.textContent='Senarai tunggu: '+j.entries.length+(j.entries.length>=200?' (200 terkini)':'')+'.';
      j.entries.forEach(function(e){ul.appendChild(el('li','',e.email+' · '+e.createdAt.slice(0,10)))})}).catch(function(x){info.textContent=x.message})}}
function showTab(name){
  var bs=document.querySelectorAll('#tabs [data-tab]');for(var i=0;i<bs.length;i++){bs[i].setAttribute('aria-selected',bs[i].getAttribute('data-tab')===name?'true':'false')}
  ['ul','sme','jl','kl','pl'].forEach(function(k){$('p-'+k).className=k===name?'':'hide'});
  if(soon[name])soon[name]()}
$('tabs').addEventListener('click',function(e){var t=e.target.closest?e.target.closest('[data-tab]'):null;if(t)showTab(t.getAttribute('data-tab'))});
function resetOthers(){P.sme.token='';P.jl.token='';connectUi(P.sme,$('p-sme'),buildSme);connectUi(P.jl,$('p-jl'),buildJl);
  buildSoon($('p-kl'),'kl','kiralab','KiraLab (KL)','Belum dilancarkan. Orang mendaftar emel di halaman smeLab.');
  buildSoon($('p-pl'),'pl','promolab','PromoLab (PL)','Belum dilancarkan. Orang mendaftar emel di halaman smeLab.')}
resetOthers();
$('enter').onclick=function(){
  token=$('token').value.trim();$('token').value='';
  load().then(function(){$('login').className='card hide';$('app').className=''}).catch(function(e){token='';$('loginErr').textContent=e.message});
};
$('token').addEventListener('keydown',function(e){if(e.key==='Enter')$('enter').click()});
$('q').addEventListener('keydown',function(e){if(e.key==='Enter')$('find').click()});
$('find').onclick=function(){find(false)};
$('issue').onclick=function(){
  var n=$('iname').value.trim(),e=$('iemail').value.trim();$('issueCode').textContent='';
  if(!n||e.indexOf('@')<0){msg('issueMsg','Isi nama dan emel.',true);return}
  var b=$('issue');b.disabled=true;
  api('/api/admin/issue',{name:n,email:e}).then(function(j){
    $('issueCode').textContent=j.code;
    msg('issueMsg',j.emailed?'Kod dijana dan emel dihantar.':'Kod dijana tetapi emel GAGAL dihantar. Salin kod ini dan beri sendiri.',!j.emailed);
    $('iname').value='';$('iemail').value='';return load();
  }).catch(function(x){msg('issueMsg',x.message,true)}).then(function(){b.disabled=false});
};
$('export').onclick=function(){
  var b=$('export');b.disabled=true;
  fetch('/api/admin/export',{method:'POST',headers:{authorization:'Bearer '+token}}).then(function(r){if(!r.ok)throw new Error(r.status===401?'Token salah.':'Gagal ('+r.status+').');return r.blob()}).then(function(blob){
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='untunglab-pembeli-'+new Date().toISOString().slice(0,10)+'.csv';document.body.appendChild(a);a.click();a.remove();msg('expMsg','CSV dimuat turun. Ada emel dan no. telefon pembeli; jaga elok-elok.',false);return load()
  }).catch(function(e){msg('expMsg',e.message,true)}).then(function(){b.disabled=false});
};
$('refresh').onclick=function(){load().catch(function(e){msg('findMsg',e.message,true)})};
$('lock').onclick=function(){token='';resetOthers();showTab('ul');$('app').className='hide';$('login').className='card';$('results').textContent='';$('loginErr').textContent=''};
})();
</script></main></body></html>`;
}
