const clamp=v=>Math.min(1,Math.max(0,v));
const easeOut=p=>1-Math.pow(1-p,3);
const easeIO=p=>p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
const easeBack=p=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(p-1,3)+c1*Math.pow(p-1,2)};
const SC=[
 {id:'hook',s:0,d:4},{id:'calc',s:4,d:4},{id:'real',s:8,d:4},{id:'reass',s:12,d:4},{id:'templ',s:16,d:5},
 {id:'menu',s:21,d:7},{id:'price',s:28,d:4},{id:'offl',s:32,d:4},{id:'dash',s:36,d:5},{id:'end',s:41,d:4}];
// mascot waypoints: scene id, local start, duration, x, y, label, side
const WP=[
 ['hook',.4,.9,240,300,'Mana pergi duit?','a'],
 ['calc',.6,.9,296,520,'Cukup ke?','a'],
 ['real',.6,.9,60,445,'Ini pun kos!','a'],['real',2.9,.8,284,445,'Nampak?','a'],
 ['reass',.5,.9,284,500,'Serah pada kami','a'],
 ['templ',.5,.9,284,300,'Isi je!','a'],['templ',3.2,.8,284,470,'Dah hampir siap','a'],
 ['menu',.5,.9,284,238,'Isi bahan je','a'],['menu',2.3,.9,300,122,'Untung ke rugi?','a'],
 ['price',.7,.9,284,330,'Dah kira semula','a'],
 ['offl',.5,.9,236,140,'Offline pun boleh','a'],
 ['dash',.4,.9,296,205,'Semua di sini','l'],['dash',1.9,.8,292,262,'Menu rugi','a'],['dash',3.2,.8,292,560,'Kedudukan menu','a'],
 ['end',.5,.9,270,420,'Jom mula!','a']];
const DELAYS={
 hook:[.2,.4,.4,0,2.3],
 calc:[.2,.35,.6,3.0,0,3.4],
 real:[.2,.35,.6,3.0],
 reass:[0,.2,.5,1.6,0],
 templ:[.2,.45,.8],
 price:[.2,.35,.9,2.2,0,2.4],
 offl:[0,.3,0,1.6,2.0],
 dash:[.2,.4,.8,1.2,1.4,1.9,2.1],
 end:[0,.3,1.2,2.0,0]};
const ROWS={calc:[1.0,1.4,2.0,2.4],real:[.9,1.4,1.9,2.5,2.8]};
const S={};
function init(){
 SC.forEach((c,i)=>{
  const el=document.getElementById('sc-'+c.id);c.el=el;c.i=i;
  if(c.id!=='menu'){c.root=el.firstElementChild;c.kids=Array.from(c.root.children);}
  c.bars=Array.from(el.querySelectorAll('[style*="linear-gradient(90deg"]')).filter(b=>b.style.width.endsWith('%')).map(b=>({b,w:parseFloat(b.style.width)}));
  c.bars.forEach(o=>o.b.style.width='0%');
  c.rows=Array.from(el.querySelectorAll('div[style*="padding:12px 14px"]'));
  c.steps=Array.from(el.querySelectorAll('div[style*="padding:14px 4px"]'));
  c.rank=Array.from(el.querySelectorAll('div[style*="padding:7px 0"]'));
 });
 SC.find(c=>c.id==='dash').num=Array.from(document.querySelectorAll('#sc-dash span')).find(s=>s.textContent==='38.3%');
 SC.find(c=>c.id==='menu').A=document.getElementById('mA');
 SC.find(c=>c.id==='menu').B=document.getElementById('mB');
 const hook=SC[0];hook.pk=Array.from(hook.kids[1].children);hook.q=hook.kids[2];
 const off=SC.find(c=>c.id==='offl');off.plane=off.kids[1].querySelector('svg');
 S.ready=true;
}
function reveal(c,lt){
 const D=DELAYS[c.id]||[];
 c.kids.forEach((k,i)=>{
  const d=D[i]!==undefined?D[i]:.3+.14*i;
  const p=easeOut(clamp((lt-d)/.5));
  k.style.opacity=p;k.style.transform=`translateY(${(1-p)*18}px)`;
 });
}
function seek(t){
 SC.forEach(c=>{
  const lt=t-c.s;
  if(lt<-0.001||lt>c.d+0.35){c.el.style.display='none';return;}
  c.el.style.display='block';c.el.style.zIndex=c.i;
  c.el.style.opacity=c.i===0?1:clamp(lt/.3);
  if(c.id==='menu')return menuScene(c,lt);
  reveal(c,lt);
  if(c.id==='hook'){
   c.kids[1].style.opacity=clamp((lt-.3)/.2);c.kids[1].style.transform='none';
   c.pk.forEach((p,k)=>{const q=clamp((lt-.5-k*.12)/.4);p.style.opacity=clamp(q*2);p.style.transform=`scale(${.5+.5*easeBack(q)})`;});
   const pulse=lt>1.6?1+.07*Math.sin((lt-1.6)*7):1;c.q.style.transform=`translateY(${(1-easeOut(clamp((lt-.4)/.5)))*18}px) scale(${pulse})`;
  }
  const R=ROWS[c.id];
  if(R)c.rows.forEach((r,k)=>{const p=easeOut(clamp((lt-R[k])/.4));r.style.opacity=p;r.style.transform=`translateX(${(1-p)*-16}px)`;});
  if(c.id==='real'){
   [1,2].forEach(k=>{const r=c.rows[k];const q=clamp((lt-R[k])/.4);const flash=Math.sin(clamp((lt-R[k]-.2)/.6)*Math.PI);r.style.transform+=` scale(${1+.04*flash})`;});
   const last=c.kids[3];if(lt>3.3){const a=Math.exp(-(lt-3.3)*5);last.style.transform+=` translateX(${Math.sin(lt*45)*7*a}px)`;}
  }
  if(c.id==='templ'){
   c.steps.forEach((s,k)=>{const p=easeOut(clamp((lt-(1.0+k*.35))/.4));s.style.opacity=p;s.style.transform=`translateX(${(1-p)*14}px)`;});
  }
  if(c.id==='dash'){
   if(c.num)c.num.textContent=(38.3*easeOut(clamp((lt-.9)/1.4))).toFixed(1)+'%';
   c.rank.forEach((s,k)=>{const p=easeOut(clamp((lt-(2.1+k*.15))/.4));s.style.opacity=p;});
  }
  if(c.id==='offl'){
   const p=easeOut(clamp((lt-.9)/.9));c.plane.style.opacity=p;c.plane.style.transform=`translate(${(1-p)*-80}px,${(1-p)*50}px) rotate(${(1-p)*-25}deg)`;
  }
  if(c.id==='end'){const b=c.kids[3];if(lt>2.7)b.style.transform+=` scale(${1+.04*Math.sin((lt-2.7)*6)})`;}
  c.bars.forEach((o,k)=>{const st=c.id==='templ'?1.0:c.id==='dash'?2.1+k*.15:.8;o.b.style.width=(o.w*easeOut(clamp((lt-st)/.7)))+'%';});
 });
 mascot(t);
}
function menuScene(c,lt){
 const A=c.A,B=c.B;
 const s=easeIO(clamp((lt-2.5)/.9));
 A.style.transform=`translateY(${-s*640}px)`;B.style.transform=`translateY(${(1-s)*640}px)`;
 // intro of A content
 const ka=Array.from(A.firstElementChild.children);
 ka.forEach(k=>{if(k.style.position==='absolute'&&k.style.left==='20px'||true){}});
 const cont=A.querySelector('div[style*="top:56px"]');
 if(cont){Array.from(cont.children).forEach((k,i)=>{const p=easeOut(clamp((lt-(.2+i*.22))/.45));k.style.opacity=p;k.style.transform=`translateY(${(1-p)*14}px)`;});}
 const hint=A.querySelector('div[style*="Scroll"]')||A.querySelector('div[style*="height:120px"]');
 if(hint){const hp=clamp((lt-1.6)/.4);hint.style.opacity=hp*(1-clamp((lt-2.6)/.3));}
 // result emphasis in B
 const badges=Array.from(B.querySelectorAll('div')).filter(d=>d.textContent.trim()==='✕ Menu Ini Rugi'&&d.children.length===0);
 badges.forEach(b=>{const q=lt>3.6?clamp((lt-3.6)/.5):0;const sh=lt>3.9?Math.exp(-(lt-3.9)*4)*Math.sin(lt*40)*5:0;b.style.transform=`scale(${1+.15*Math.sin(q*Math.PI)}) translateX(${sh}px)`;});
 mascot(c.s+lt);
}
function mascot(t){
 const m=document.getElementById('mascot'),b=document.getElementById('bubble');
 const W=WP.map(w=>{const sc=SC.find(c=>c.id===w[0]);return {t:sc.s+w[1],d:w[2],x:w[3],y:w[4],l:w[5],side:w[6]};});
 let pos={x:-70,y:540},prev={x:-70,y:540},k=-1;
 for(let i=0;i<W.length;i++)if(t>=W[i].t)k=i;
 if(k<0){m.style.opacity=0;b.style.opacity=0;return;}
 prev=k>0?W[k-1]:{x:-70,y:540};const w=W[k];
 const p=easeIO(clamp((t-w.t)/w.d));
 const moving=p>0&&p<1;
 let x=prev.x+(w.x-prev.x)*p,y=prev.y+(w.y-prev.y)*p;
 const idle=t-w.t-w.d;
 if(idle>0){y+=Math.sin(idle*4)*2.5;}
 if(moving){y-=Math.sin(p*Math.PI)*22;}
 const rot=moving?(w.x-prev.x)*.03*Math.sin(p*Math.PI):Math.sin(Math.max(0,idle)*3)*3;
 m.style.opacity=1;m.style.transform=`translate(${x}px,${y}px) rotate(${rot}deg) scale(${moving?1.08:1})`;
 const next=W[k+1];const endShow=next?next.t-.05:1e9;
 const sc=SC.find(c=>t>=c.s&&t<c.s+c.d)||SC[SC.length-1];
 const wsc=SC.find(c=>c.id===WP[k][0]);
 const hideAt=Math.min(endShow,wsc.s+wsc.d-.25);
 const bp=easeBack(clamp((t-(w.t+w.d+.05))/.28));
 const on=t>=w.t+w.d+.05&&t<Math.min(hideAt,w.t+w.d+1.7);
 b.textContent=w.l;
 const bw=b.offsetWidth||90;
 if(on){
  const bx=w.side==='a'?x+56-bw:x-8-bw,by=w.side==='a'?y-36:y+11;
  b.style.opacity=clamp(bp)*(1-clamp((t-(Math.min(hideAt,w.t+w.d+1.7)-.2))/.2));
  b.style.transform=`translate(${Math.max(4,bx)}px,${by}px) scale(${.6+.4*clamp(bp)})`;
 }else b.style.opacity=0;
}
document.fonts.ready.then(()=>{init();window.seek=seek;window.READY=true;});
