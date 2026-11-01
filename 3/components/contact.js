// Contact footer. It is the last block of the page: while it scrolls in, its
// gradient field is revealed through a squircle clip that is as tall as the
// screen from the start and widens from the 1200px card to full width, with
// the corner radius going to 0. At the
// bottom of the page the field fills the viewport (stage is >=100lvh tall).
import {getSvgPath} from './card-squircle.js?v=e69287c61f97';
const section=document.getElementById('v3-contact');
if(section){
 const host=section.parentElement,cases=host.querySelector('.v3-cases');
 const card=section.querySelector('.v3-contact__card'),field=section.querySelector('.v3-contact__field');
 if(cases)cases.after(section);else host.append(section);
 host.classList.add('v3-page--contact-last');
 section.hidden=false;
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');
 // Small-viewport height: what is visible while Safari's toolbars are expanded.
 const probe=document.createElement('span');
 probe.style.cssText='position:absolute;visibility:hidden;pointer-events:none;width:0;height:100svh;left:0;top:0';
 probe.setAttribute('aria-hidden','true');section.append(probe);
 let cardW=0,cardH=0,stageW=0,stageH=0,smallH=0,radius=72,frame=0,lastKey='',bleed=false;
 const FIELD_EXTRA=120,FIELD_TOP=0; // keep in sync with `inset:-200px 0 -120px` of .v3-contact__field
 const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
 const measure=()=>{
  cardW=card.offsetWidth;cardH=card.offsetHeight;stageW=section.clientWidth;stageH=section.offsetHeight;smallH=probe.offsetHeight||innerHeight;
  radius=parseFloat(getComputedStyle(section).getPropertyValue('--v3-contact-radius'))||72;
  lastKey='';schedule();
 };
 // getSvgPath returns a path anchored at 0,0 whose only absolute commands are M and L.
 const shift=(path,dx,dy)=>path.replace(/([ML]) (-?[\d.]+) (-?[\d.]+)/g,(m,c,x,y)=>`${c} ${(Number(x)+dx).toFixed(3)} ${(Number(y)+dy).toFixed(3)}`);
 // The title stays put; lead, buttons and links start lower and are pulled up to it one
 // after another while the block scrolls in (offset and opacity converge to 0 / 1).
 const parts=[['.v3-contact__title',0,0],['.v3-contact__lead',0,80],['.v3-contact__actions',.25,170],['.v3-contact__links',.5,260]]
  .map(([selector,delay,distance])=>({el:section.querySelector(selector),delay,distance}));
 const ease=t=>1-(1-t)*(1-t)*(1-t);
 function render(){
  frame=0;
  if(!cardW||!stageW)return;
  const sectionTop=section.getBoundingClientRect().top,vh=innerHeight;
  if(sectionTop>vh*1.2){ // far above the footer (e.g. jumped to the top): drop the Safari bar tint
   if(bleed){bleed=false;lastKey='';const root=document.documentElement.style;root.backgroundColor='';root.backgroundImage='';root.backgroundAttachment='';}
   return;
  }
  // The widening starts once the block is half on screen (top edge at mid-height) and ends
  // when it reaches the top; the content keeps its own earlier timing.
  const smoothstep=t=>t*t*(3-2*t);
  const progress=reduced.matches?1:clamp(1-sectionTop/vh,0,1),ep=smoothstep(progress);
  const e=smoothstep(reduced.matches?1:clamp(1-2*sectionTop/vh,0,1));
  const key=[e.toFixed(4),ep.toFixed(4),stageW,stageH,smallH,cardW,cardH,radius].join('|');
  if(key===lastKey)return;
  lastKey=key;
  // The clip is as tall as the screen from the start and never grows upward:
  // only its width and corner radius change. The extra field above/below is
  // only revealed at the very end, when it is already outside the viewport.
  const inset=(stageW-cardW)/2*(1-e),width=stageW-inset*2,height=stageH+FIELD_EXTRA*e;
  const tail=clamp((e-.9)/.1,0,1),r=radius*(1-tail*tail*(3-2*tail));
  if(e>=.999)field.style.clipPath='none';
  else if(r<.5)field.style.clipPath=`path('M ${inset.toFixed(3)} ${FIELD_TOP} H ${(inset+width).toFixed(3)} V ${(FIELD_TOP+height).toFixed(3)} H ${inset.toFixed(3)} Z')`;
  else field.style.clipPath=`path('${shift(getSvgPath({width,height,cornerRadius:r,cornerSmoothing:1,preserveSmoothing:true}),inset,FIELD_TOP)}')`;
  // The content is centred in the screen-tall block and never moves relative to it;
  // it is only scaled down a little when the visible height is shorter than the content.
  const fit=clamp((smallH-32)/cardH,.7,1);
  card.style.transform=fit<1?`scale(${fit.toFixed(4)})`:'';
  for(const {el,delay,distance} of parts){
   const q=reduced.matches?1:ease(clamp((ep-delay)/.4,0,1));
   if(!distance){el.style.opacity='';el.style.transform='';continue;}
   el.style.opacity=Math.min(1,q*1.6).toFixed(3);
   el.style.transform=`translate3d(0,${((1-q)*distance).toFixed(1)}px,0)`;
  }
  // Safari tints its edge zones and the toolbar area with the page background; mirror the field top-to-bottom.
  const full=e>=.999;
  if(full!==bleed){bleed=full;const root=document.documentElement.style;root.backgroundColor=full?'#7a70f0':'';root.backgroundImage=full?'linear-gradient(180deg,#8f84f6 0%,#7a70f0 55%,#6f66e2 100%)':'';root.backgroundAttachment=full?'fixed':'';}
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(render);}
 new ResizeObserver(measure).observe(section);
 new ResizeObserver(measure).observe(card);
 // Scrolling up from the very bottom: drop the Safari bar tint in the same task as the scroll event
 // (without waiting for the next animation frame) so no violet shows behind the case cards.
 addEventListener('scroll',()=>{
  if(bleed&&section.getBoundingClientRect().top>2){bleed=false;lastKey='';const root=document.documentElement.style;root.backgroundColor='';root.backgroundImage='';root.backgroundAttachment='';}
  schedule();
 },{passive:true});
 addEventListener('resize',schedule,{passive:true});
 reduced.addEventListener('change',()=>{lastKey='';schedule();});
 document.fonts?.ready.then(measure);
 measure();
 if('IntersectionObserver'in window){
  new IntersectionObserver(entries=>{section.toggleAttribute('data-active',entries[0].isIntersecting);},{rootMargin:'120px'}).observe(section);
 }else section.setAttribute('data-active','');
}
