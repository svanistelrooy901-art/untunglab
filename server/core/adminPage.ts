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
*{box-sizing:border-box}body{margin:0;background:#F7F8FA;color:#111827;font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main{max-width:46rem;margin:0 auto;padding:20px 16px 60px}h1{font-size:1.4rem;margin:0 0 12px}h2{font-size:1.05rem;margin:0 0 8px}
.card{background:#fff;border:1px solid #E5E7EB;border-radius:16px;padding:16px;margin-top:14px}
input{width:100%;min-height:44px;border:1px solid #9CA3AF;border-radius:12px;padding:0 12px;font-size:1rem}
button{min-height:44px;border:0;border-radius:12px;background:#0F766E;color:#fff;font-weight:600;font-size:.95rem;padding:0 14px;cursor:pointer}
button.alt{background:#fff;color:#0F766E;border:1px solid #0F766E}button.bad{background:#B91C1C}button[disabled]{opacity:.5}
.row{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.row>*{flex:1 1 9rem}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(8.5rem,1fr));gap:8px}
.stat{background:#F0FDFA;border:1px solid #99F6E4;border-radius:12px;padding:10px}.stat b{display:block;font-size:1.4rem}.stat span{font-size:.8rem;color:#475569}
.msg{margin-top:8px;font-weight:600}.err{color:#B91C1C}.ok{color:#0F766E}
.mono{font:600 1rem ui-monospace,Menlo,monospace;word-break:break-all}.muted{color:#64748B;font-size:.85rem}.muted .mono{font-size:.8rem;font-weight:600}
table{width:100%;border-collapse:collapse;font-size:.85rem}td,th{text-align:left;padding:6px 4px;border-bottom:1px solid #E5E7EB;vertical-align:top;word-break:break-word}
.pill{white-space:nowrap;display:inline-block;border-radius:999px;padding:1px 8px;font-size:.75rem;font-weight:700;background:#E5E7EB}.pill.active,.pill.paid{background:#CCFBF1;color:#115E59}.pill.revoked{background:#FEE2E2;color:#991B1B}
.hide{display:none}
.bars{display:flex;align-items:flex-end;gap:2px;height:90px;margin-top:8px}.bar{flex:1 1 0;min-height:2px;background:#0F766E;border-radius:2px 2px 0 0}.bar.zero{background:#CBD5E1}
.axis{display:flex;justify-content:space-between;font-size:.75rem;color:#64748B;margin-top:2px}
ul.plain{list-style:none;margin:0;padding:0}ul.plain li{padding:8px 0;border-bottom:1px solid #E5E7EB;font-size:.9rem;word-break:break-word}
textarea{width:100%;min-height:60px;border:1px solid #9CA3AF;border-radius:12px;padding:8px 12px;font:inherit;margin-top:8px}
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
  <div class="card"><h2>Jualan 30 hari</h2><div class="bars" id="bars" role="img" aria-label="Pesanan berbayar setiap hari, 30 hari terakhir"></div><div class="axis"><span id="axFrom"></span><span id="axMax"></span><span id="axTo"></span></div><p class="muted" id="conv"></p><p class="muted">Hari dikira ikut waktu Malaysia. Pesanan RM0 tak dikira.</p></div>
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
function renderLog(l){var u=$('log');u.textContent='';
  l.entries.forEach(function(e){u.appendChild(el('li','',e.at.slice(0,16).replace('T',' ')+' UTC · '+e.action+' · '+e.target))});
  if(!l.entries.length)u.appendChild(el('li','muted','Belum ada.'))}
function load(){return api('/api/admin/stats').then(function(s){renderStats(s);return Promise.all([api('/api/admin/insights'),api('/api/admin/log')]).then(function(r){renderInsights(r[0],s);renderLog(r[1])})})}
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
