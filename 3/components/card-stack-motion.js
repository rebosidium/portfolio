// One curve supplies desktop JS motion and the mobile CSS keyframes.
export const DESKTOP_CARD_MOTION=Object.freeze({shrink:.03,opacityPower:2,lift:10});
export const MOBILE_CARD_MOTION=Object.freeze({shrink:.07,opacityPower:1.25,lift:20});
export function cardStackFrame(progress,motion=DESKTOP_CARD_MOTION){
 const t=Math.max(0,Math.min(1,progress)),e=t*t*(3-2*t);
 return{scale:1-motion.shrink*e,opacity:1-e**motion.opacityPower,lift:-motion.lift*e};
}
function installStyles(){
 if(document.getElementById('v3-card-stack-motion'))return;
 const style=document.createElement('style');style.id='v3-card-stack-motion';
 const n=value=>Number(value.toFixed(5));
 const frames=Array.from({length:31},(_,i)=>({at:n(i/30*100),...cardStackFrame(i/30,MOBILE_CARD_MOTION)}));
 style.textContent=`
 @keyframes v3-card-cover-stack{${frames.map(f=>`${f.at}%{width:${n(f.scale*100)}%;height:${n(f.scale*100)}%;border-radius:${n(32*f.scale)}px;opacity:${n(f.opacity)}}`).join('')}}
 @keyframes v3-card-copy-stack{${frames.map(f=>`${f.at}%{transform:translateY(${n(f.lift)}px)}`).join('')}}
 @media(max-width:800px){
  .v3-cases{container-type:inline-size}
  .v3-card-stack-boundary{position:absolute;left:0;top:calc(100cqi * 400 / 588 + var(--v3-case-gap) - 1px);width:1px;height:1px;visibility:hidden;pointer-events:none}
 }
 @media(max-width:800px) and (prefers-reduced-motion:no-preference){
  @supports (animation-timeline:--v3-card-stack) and (view-timeline-name:--v3-card-stack) and (animation-range:exit-crossing 0px exit-crossing 1px) and (width:1cqi){
   /* The article stays in normal flow. Its sticky pin and moving copy are
      descendants, so neither can feed motion back into the timeline. */
   .v3-case-card{view-timeline-name:--v3-card-stack;view-timeline-axis:block;view-timeline-inset:16px 0px}
   .v3-case-cover-visual{animation:v3-card-cover-stack linear both;animation-duration:auto;animation-timeline:--v3-card-stack;animation-range:exit-crossing var(--v3-case-gap) exit-crossing calc(var(--v3-case-gap) + 100cqi * 400 / 588)}
   .v3-case-copy{animation:v3-card-copy-stack linear both;animation-duration:auto;animation-timeline:--v3-card-stack;animation-range:exit-crossing var(--v3-case-gap) exit-crossing calc(var(--v3-case-gap) + 100cqi * 400 / 588)}
  }
 }`;
 document.head.append(style);
}
export function mountCardStack(section){
 installStyles();
 const mobile=matchMedia('(max-width:800px)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
 const markers=new Map();let observer;
 function disable(){
  observer?.disconnect();observer=null;
  for(const [marker,pin]of markers){marker.remove();pin.removeAttribute('data-stack-covered');}
  markers.clear();
 }
 function sync(){
  if(!mobile.matches||reduced.matches||!CSS.supports('width','1cqi')){disable();return;}
  if(observer)return;
  observer=new IntersectionObserver(changes=>{
   for(const entry of changes){const pin=markers.get(entry.target);if(!pin)continue;
    const covered=!entry.isIntersecting&&entry.boundingClientRect.bottom<=(entry.rootBounds?.top??16);
    if(pin.hasAttribute('data-stack-covered')!==covered)pin.toggleAttribute('data-stack-covered',covered);
   }
  },{rootMargin:'-16px 0px 0px 0px',threshold:0});
  for(const article of section.querySelectorAll('.v3-case-card')){
   const marker=document.createElement('span');marker.className='v3-card-stack-boundary';marker.setAttribute('aria-hidden','true');
   const pin=article.querySelector('.v3-case-cover-pin');article.append(marker);markers.set(marker,pin);observer.observe(marker);
  }
 }
 mobile.addEventListener('change',sync);reduced.addEventListener('change',sync);sync();
 return{destroy(){disable();mobile.removeEventListener('change',sync);reduced.removeEventListener('change',sync);}};
}
