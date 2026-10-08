import { INSTALL_CSS, LANG_CSS, LANG_HEAD_SCRIPT, salesBody } from './sales';
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
  const body = salesBody({ priceSen, earlyLeft, normalSen, base, rm });
  return `<!doctype html>
<html lang="ms"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>UntungLab: tahu untung sebenar setiap menu</title>
<meta name="description" content="UntungLab mengira kos sebenar menu anda termasuk kos operasi, menunjukkan untung sebenar dan mencadangkan harga jualan. Bayar sekali, guna selamanya.">
<meta name="theme-color" content="#011416">
${LANG_HEAD_SCRIPT}
<style>${SALES_CSS}${LANG_CSS}${INSTALL_CSS}</style></head><body>${body}</body></html>`;
}

export function renderReturnPage(appUrl = ''): string {
  return shell(
    'Kod lesen UntungLab',
    `<h1 id="h">Terima kasih</h1>
<div class="card" id="c"><p id="s">Menunggu pengesahan bayaran…</p></div>
<script>
function T(ms,en){try{return localStorage.getItem('ul-lang')==='en'?en:ms;}catch(e){return ms;}}
const APP=${JSON.stringify(appUrl.replace(/\/?$/, '/'))};
const id=new URLSearchParams(location.search).get('order_id');
const c=document.getElementById('c');
document.getElementById('h').textContent=T('Terima kasih','Thank you');
document.getElementById('s').textContent=T('Menunggu pengesahan bayaran…','Waiting for payment confirmation…');
let tries=0;
async function poll(){
 if(!id||!/^[0-9a-f]{32}$/.test(id)){c.innerHTML='<p class="err">'+T('Pautan ini tidak lengkap. Semak emel anda untuk kod lesen.','This link is incomplete. Check your email for the licence code.')+'</p>';return;}
 try{
  const r=await fetch('/api/order/'+id);const j=await r.json();
  if(j.status==='paid'&&j.code){
   const link=APP+'#/lesen?kod='+encodeURIComponent(j.code);
   c.innerHTML='<p>'+T('Bayaran berjaya. Kod lesen anda:','Payment successful. Your licence code:')+'</p><div class="code" id="k"></div><p style="margin:18px 0 6px"><b>'+T('Langkah seterusnya (2 saat sahaja):','Next steps (takes 2 seconds):')+'</b></p><ol style="margin:0 0 18px 20px;padding:0;line-height:1.6"><li>'+T('Tekan butang di bawah. UntungLab akan terbuka dan kod terisi sendiri.','Tap the button below. UntungLab opens with the code filled in.')+'</li><li>'+T('Tekan <b>Aktifkan</b>. Siap.','Tap <b>Aktifkan</b> (Activate). Done.')+'</li></ol><p class="cta-row"><a class="btn" id="go" href="'+link+'">'+T('Buka UntungLab &amp; aktifkan','Open UntungLab &amp; activate')+'</a></p><p style="margin-top:14px;font-size:.92rem;opacity:.8">'+T('Kod ini juga dihantar ke emel anda (jika tiada di Inbox, semak <b>Spam</b>, <b>Promotions</b> atau <b>Important</b>). Kalau butang tidak berfungsi: buka UntungLab, pilih <b>Lesen</b> (di telefon: Lagi &gt; Lesen) dan tampal kod di atas.','This code is also emailed to you (if it is not in your Inbox, check <b>Spam</b>, <b>Promotions</b> or <b>Important</b>). If the button does not work: open UntungLab, choose <b>Lesen</b> (on a phone: Lagi &gt; Lesen) and paste the code above.')+'</p>';
   document.getElementById('k').textContent=j.code;return;
  }
 }catch(e){}
 tries++;
 if(tries>40){c.innerHTML='<p>'+T('Pengesahan bayaran mengambil masa lebih lama. Kod akan dihantar ke emel anda sebaik sahaja bayaran disahkan. Jika tiada dalam masa 30 minit, hubungi kami dengan emel pembelian anda.','Payment confirmation is taking longer. The code will be emailed to you once payment is confirmed. If you have nothing within 30 minutes, contact us with the email you purchased with.')+'</p>';return;}
 setTimeout(poll,3000);
}
poll();
</script>`,
  );
}
