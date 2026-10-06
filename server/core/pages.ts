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

export function renderBuyPage(priceSen: number, earlyLeft: number | null = null, normalSen: number = priceSen): string {
  return shell(
    'Beli UntungLab',
    `<h1>UntungLab</h1>
<p>Tahu kos sebenar menu anda. Bayaran sekali ${rm(priceSen)}, akses seumur hidup, boleh digunakan pada 2 peranti.</p>
${earlyLeft !== null ? `<p><strong>Harga early bird</strong>: ${rm(priceSen)} untuk ${earlyLeft} pembeli pertama yang tinggal. Selepas itu ${rm(normalSen)}.</p>` : ''}
<div class="card">
<form id="f">
<label for="n">Nama</label><input id="n" autocomplete="name" required maxlength="100">
<label for="e">Emel (kod lesen dihantar ke sini)</label><input id="e" type="email" autocomplete="email" required maxlength="120">
<label for="p">Nombor telefon</label><input id="p" type="tel" autocomplete="tel" required maxlength="20">
<button id="b" type="submit">Bayar ${rm(priceSen)}</button>
<p id="m" class="err" role="alert"></p>
</form>
<p>Pembayaran melalui ToyyibPay (FPX). Bayaran balik dalam 7 hari selepas pembelian: balas emel kod lesen anda.</p>
<p>Nama, emel dan telefon anda hanya digunakan untuk menghantar kod lesen dan sokongan pembelian ini.</p>
</div>
<script>
document.getElementById('f').addEventListener('submit',async(ev)=>{
 ev.preventDefault();const b=document.getElementById('b'),m=document.getElementById('m');
 b.disabled=true;m.textContent='';
 try{
  const r=await fetch('/api/order',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:document.getElementById('n').value,email:document.getElementById('e').value,phone:document.getElementById('p').value})});
  const j=await r.json();
  if(r.ok&&j.payUrl){location.href=j.payUrl;return;}
  m.textContent=r.status===400?'Semak semula nama, emel dan nombor telefon anda.':'Pembayaran tidak dapat dimulakan sekarang. Cuba sebentar lagi.';
 }catch(e){m.textContent='Tiada sambungan internet. Cuba lagi.';}
 b.disabled=false;
});
</script>`,
  );
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
