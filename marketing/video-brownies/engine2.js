const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const oc=p=>1-Math.pow(1-clamp(p),3);
const ob=p=>{p=clamp(p);const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(p-1,3)+c1*Math.pow(p-1,2)};
const $=id=>document.getElementById(id);
const SC=CFG.scenes;
function init(){
 SC.forEach((c,i)=>{c.i=i;c.el=$('sc-'+c.id);c.sts=[...c.el.querySelectorAll('.st')];c.kus=[...c.el.querySelectorAll('.ku')];
  c.bub=c.el.querySelector('.bubble');c.chipEls=(c.chips||[]).map((_,k)=>$('c-'+c.id+'-'+k));c.kw=c.el.querySelector('.kuwrap');});
 window.READY=true;
}
function reveal(el,lt,t0,d=.4,dy=16){if(!el)return;const p=oc((lt-t0)/d);el.style.opacity=p;el.style.transform=`translateY(${(1-p)*dy}px)`;}
function seek(t){
 SC.forEach(c=>{
  const lt=t-c.start;
  if(lt<-1e-4||lt>=c.dur+0.3){c.el.style.display='none';return;}
  c.el.style.display='block';c.el.style.zIndex=c.i+1;
  c.el.style.opacity=c.i===0?1:clamp(lt/.28);
  c.el.style.transform=c.i===0?'none':`translateY(${(1-oc(lt/.28))*14}px)`;
  // phone states
  if(c.kind==='phone'){
   const ph=c.el.querySelector('.phone');
   const pi=oc(lt/.5);ph.style.opacity=pi;ph.style.transform=`translateY(${(1-pi)*26}px)`;
   let cur=0;c.states.forEach((s,k)=>{if(lt>=s[0])cur=k;});
   c.sts.forEach((im,k)=>{im.style.opacity=k<cur?1:(k===cur?clamp((lt-c.states[k][0])/.1):0);});
   if(c.id==='rev2'){const q=lt-1.5;const sh=q>0&&q<.6?Math.sin(q*60)*3*Math.exp(-q*6):0;ph.style.transform+=` translateX(${sh}px)`;}
   reveal(c.el.querySelector('.cap'),lt,.1,.4,10);
   c.chips.forEach((ch,k)=>{const e=c.chipEls[k];const a=ch[0],b=ch[1];
     if(lt<a||lt>b){e.style.opacity=0;return;}
     const p=ob((lt-a)/.32),fo=1-clamp((lt-(b-.2))/.2);e.style.opacity=clamp(p*2)*fo;e.style.transform=`scale(${.6+.4*p})`;});
   if(c.id==='rev2'){
    const pop=$('pop7');const p=ob((lt-1.5)/.4);
    pop.style.opacity=lt<1.5?0:clamp(p*2);pop.style.transform=`scale(${.55+.45*p})`;
    const q=clamp((lt-2.6)/.2);pop.style.setProperty('--strike',(q*100)+'%');
    const hh=oc((lt-2.6)/.35);$('pr7').style.maxHeight=(hh*100)+'px';['p3','p5'].forEach(cl=>{const e=pop.querySelector('.'+cl);e.style.opacity=clamp((lt-2.75)/.2);});
    const e4=pop.querySelector('.p4');const p4=ob((lt-2.75)/.4);e4.style.opacity=lt<2.75?0:clamp(p4*2);e4.style.transform=`scale(${.5+.5*p4})`;
   }
  }
  if(c.id==='hook'){
   reveal(c.el.querySelector('.hk0'),lt,.1);
   [['hk1',.3],['hk2',1.0]].forEach(([id,t0])=>{const e=$(id);const p=ob((lt-t0)/.4);e.style.opacity=clamp(p*2);e.style.transform=`scale(${1.25-.25*p})`;e.style.transformOrigin='left center';});
   const b=$('hkbig'),p=ob((lt-1.8)/.45);const pulse=lt>2.8?1+.05*Math.sin((lt-2.8)*6):1;b.style.opacity=clamp(p*2);b.style.transform=`scale(${(.6+.4*p)*pulse})`;
   reveal($('hk3'),lt,3.4);
  }
  if(c.id==='harga'){
   reveal(c.el.querySelector('.cap'),lt,.1,.4,10);
   for(let k=0;k<4;k++){const e=$('tr'+k);const p=oc((lt-(0.7+k*.55))/.4);e.style.opacity=p;e.style.transform=`translateX(${(1-p)*-18}px)`;}
   reveal($('mk'),lt,5.2,.5);
  }
  if(c.id==='volum'){
   reveal(c.el.querySelector('.cap'),lt,.1,.4,10);
   const vc=c.el.querySelector('.vcard');reveal(vc,lt,.3,.5,20);
   c.el.querySelectorAll('.vb').forEach((b,k)=>{b.style.width=(parseFloat(b.dataset.w)*oc((lt-(.9+k*.4))/.8))+'%';});
  }
  if(c.id==='end'){
   const e=$('en1'),p=ob((lt-.15)/.5);e.style.opacity=clamp(p*2);e.style.transform=`scale(${.8+.2*p})`;
   const l=$('enl'),pl=ob((lt-1.0)/.5);l.style.opacity=clamp(pl*2);l.style.transform=`scale(${.7+.3*pl})`;
   const b=$('enc'),pb=ob((lt-2.2)/.4);const pu=lt>3?1+.05*Math.sin((lt-3)*6):1;b.style.opacity=clamp(pb*2);b.style.transform=`scale(${(.6+.4*pb)*pu})`;
  }
  // bubble
  if(c.bub){let on=null;(c.bubbles||[]).forEach(bb=>{if(lt>=bb[0]&&lt<bb[1])on=bb;});
   if(on){const p=ob((lt-on[0])/.3),fo=1-clamp((lt-(on[1]-.18))/.18);c.bub.textContent=on[2];c.bub.style.opacity=clamp(p*2)*fo;c.bub.style.transform=`scale(${.6+.4*p})`;}
   else c.bub.style.opacity=0;}
  // Kak Untung
  let key=c.ku[0][1],ts=c.ku[0][0];c.ku.forEach(k=>{if(lt>=k[0]){key=k[1];ts=k[0];}});
  const blink=(((lt+c.i*.7)%3.2)<.13)?1:0;
  c.kus.forEach(k=>{k.style.display=(k.dataset.k===key&&(+k.dataset.b)===blink)?'block':'none';});
  const ent=oc((lt-.1)/.55);const dt=lt-ts;const hop=(dt>0.001&&dt<.25&&ts>0)?Math.sin(Math.PI*dt/.25)*9:0;
  const br=Math.sin(t*2.3)*2.2;
  c.kw.style.opacity=ent;c.kw.style.transform=`translateY(${(1-ent)*90-hop+br}px)`;
 });
}
document.fonts.ready.then(()=>{init();window.seek=seek;});
