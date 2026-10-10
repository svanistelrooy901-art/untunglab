/**
 * Admin dashboard (D-90). One static page: it contains no secret. Mamu types ADMIN_TOKEN into it; the token lives in a
 * JavaScript variable only (never localStorage, cookies or the URL), so closing or reloading the tab forgets it.
 * All text from the database is written with textContent, never innerHTML.
 */
export const ADMIN_CSP =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'; object-src 'none'";

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
  <div class="card"><h2>Ringkasan</h2><div class="stats" id="stats"></div><div class="row"><button class="alt" id="refresh">Muat semula data</button><button class="alt" id="lock">Kunci (log keluar)</button></div></div>
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
  <div class="card"><h2>Pengguna percuma</h2><div class="stats" id="ustats"></div>
    <div class="bars" id="ubars" role="img" aria-label="Pemasangan baharu setiap hari, 30 hari terakhir"></div><div class="axis"><span id="uFrom"></span><span id="uMax"></span><span id="uTo"></span></div>
    <p class="muted" id="uconv"></p>
    <p class="muted" id="ulang"></p>
    <p class="muted">Lawatan dan klik dikira di server tanpa cookie. Pemasangan dikira daripada satu ID rawak dalam app; tiada emel, IP atau data perniagaan disimpan. Robot dan pratonton pautan tak dikira.</p></div>
  <div class="card"><h2>Jualan 30 hari</h2><div class="bars" id="bars" role="img" aria-label="Pesanan berbayar setiap hari, 30 hari terakhir"></div><div class="axis"><span id="axFrom"></span><span id="axMax"></span><span id="axTo"></span></div><p class="muted" id="conv"></p><p class="muted">Hari dikira ikut waktu Malaysia. Pesanan RM0 tak dikira.</p></div>
  <div class="card"><h2>Pelawat (Cloudflare)</h2>
    <p class="muted hide" id="trOff">Belum disambung. Bila secret CF_ANALYTICS_TOKEN diisi di Worker, bahagian ini akan tunjuk berapa orang lawat halaman jualan dan buka app.</p>
    <div class="msg err" id="trErr"></div>
    <div class="hide" id="trOn">
      <div class="stats" id="trStats"></div>
      <div class="bars" id="trBars" role="img" aria-label="Lawatan setiap hari, 30 hari terakhir"></div><div class="axis"><span id="trFrom"></span><span id="trMax"></span><span id="trTo"></span></div>
      <p class="muted" id="trFunnel"></p>
      <h2 style="margin-top:14px">Dari mana pelawat datang</h2><table><thead><tr><th>Sumber</th><th>Lawatan</th></tr></thead><tbody id="trRef"></tbody></table>
      <h2 style="margin-top:14px">Halaman</h2><table><thead><tr><th>Halaman</th><th>Lawatan</th><th>Dibuka</th></tr></thead><tbody id="trPages"></tbody></table>
      <div class="row" style="margin-top:14px"><div><h2>Peranti</h2><table><tbody id="trDev"></tbody></table></div><div><h2>Negara</h2><table><tbody id="trCty"></tbody></table></div></div>
      <p class="muted">30 hari, waktu Malaysia. Pelayar dengan ad-blocker dan app yang dibuka tanpa internet tak dikira, jadi nombor sebenar lebih tinggi sedikit. App hanya dikira bila dibuka; skrin dan data dalam app tak dihantar.</p>
    </div></div>
  <div class="card"><h2>Dari mana pembeli datang</h2><p class="muted">Letak <span class="mono">?src=fb</span> pada pautan beli, contohnya <span class="mono">https://beli.untunglab.space/beli?src=fb</span>. Guna huruf kecil, nombor, - atau _ (maks 20).</p><table><thead><tr><th>Sumber</th><th>Klik beli</th><th>Bayar</th></tr></thead><tbody id="sources"></tbody></table></div>
  <div class="card"><h2>Dibeli tapi belum diaktifkan</h2><p class="muted">Mungkin tersekat. Hantar semula emel atau tanya mereka.</p><ul class="plain" id="unact"></ul></div>
  <div class="card"><h2>Emel kod belum direkod hantar</h2><p class="muted">Tekan Hantar semula; kalau masih gagal, salin kod dan beri sendiri.</p><ul class="plain" id="mailp"></ul></div>
  <div class="card"><h2>Pesanan terkini</h2><div style="overflow-x:auto"><table><thead><tr><th>Tarikh</th><th>Pembeli</th><th style="white-space:nowrap">RM</th><th>Status</th></tr></thead><tbody id="recent"></tbody></table></div></div>
  <div class="card"><h2>Eksport dan log</h2><div class="row"><button class="alt" id="export">Muat turun CSV (semua pembeli)</button></div><div class="msg" id="expMsg"></div>
    <h2 style="margin-top:14px">Tindakan admin terkini</h2><ul class="plain" id="log"></ul></div>
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
  var items=[['Pesanan',s.orders],['Dah bayar (pengguna)',s.paid],['Kod percuma',s.complimentary],['Belum bayar',s.pending],['Jumlah RM',rm(s.revenueSen)],['Lesen aktif',s.activeLicenses],['Dibatalkan',s.revokedLicenses],['Peranti aktif',s.devices]];
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
  if(t.start)parts.push('pemasangan baharu ialah '+Math.round(t.installs30/t.start*100)+'% daripada tekanan (kasar; ada yang buka app terus, tanpa halaman ini)');
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
$('lock').onclick=function(){token='';$('app').className='hide';$('login').className='card';$('results').textContent='';$('loginErr').textContent=''};
})();
</script></main></body></html>`;
}
