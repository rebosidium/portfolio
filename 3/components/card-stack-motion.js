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
 /* Android's asynchronous flings must not resize the sticky artwork on the
    main thread while its inner parallax advances on the compositor. Keep
    the authored box and clip fixed; scale the complete cover instead. */
 @keyframes v3-card-cover-composite{${frames.map(f=>`${f.at}%{transform:scale(${n(f.scale)});opacity:${n(f.opacity)}}`).join('')}}
 /* A fixed-size wrapper has an opacity-only end cap. Unlike the resizing
    effect, it is compositor-eligible during a fling. Keep it fully opaque
    until the fade ends, preserving the existing curve and reverse scroll. */
 @keyframes v3-card-cover-cull{from{opacity:1}to{opacity:0}}
 /* Keep flowing iOS covers out of Safari's viewport-constrained color
    sampling. Attach at the top edge, then detach only after the cover fades.
    Both positions retain the same flow slot; no scroll handler is needed. */
 @keyframes v3-card-pin-attachment{0%{position:relative;top:0px}.001%,99.999%{position:sticky;top:var(--v3-pin-top)}100%{position:relative;top:0px}}
 @keyframes v3-card-copy-stack{${frames.map(f=>`${f.at}%{transform:translateY(${n(f.lift)}px)}`).join('')}}
 /* Move the image, mesh and shared clip together. Independent image motion
    would reveal a mesh strip or cross the lower clip during reverse scroll. */
 @keyframes v3-card-art-stack{${frames.map(f=>`${f.at}%{translate:0 ${n(-f.lift*1.4)}px;scale:${n(1-(1-f.scale)*.7)}}`).join('')}}
 @media(max-width:800px){
  .v3-cases{container-type:inline-size}
  .v3-card-stack-boundary{position:absolute;left:0;top:calc(100cqi * var(--v3-cover-height) / 588 + var(--v3-case-gap) - 1px - (var(--v3-pin-top) - 16px));width:1px;height:1px;visibility:hidden;pointer-events:none}
 }
 @media(max-width:800px) and (prefers-reduced-motion:no-preference){
  @supports (animation-timeline:--v3-card-stack) and (view-timeline-name:--v3-card-stack) and (animation-range:exit-crossing 0px exit-crossing 1px) and (width:1cqi){
   /* The article stays in normal flow. Its sticky pin and moving copy are
      descendants, so neither can feed motion back into the timeline. */
   .v3-case-card{view-timeline-name:--v3-card-stack;view-timeline-axis:block;view-timeline-inset:var(--v3-pin-top) 0px}
   @supports (-webkit-touch-callout:none){
    .v3-case-cover-pin{animation:v3-card-pin-attachment linear both;animation-duration:auto;animation-timeline:--v3-card-stack;animation-range:exit-crossing 0px exit-crossing calc(var(--v3-case-gap) + 100cqi * var(--v3-cover-height) / 588 * .75)}
   }
   .v3-case-cover-reveal{animation:v3-card-cover-cull steps(1,end) both;animation-duration:auto;animation-timeline:--v3-card-stack;animation-range:exit-crossing var(--v3-case-gap) exit-crossing calc(var(--v3-case-gap) + 100cqi * var(--v3-cover-height) / 588 * .75)}
   .v3-case-cover-visual{animation:v3-card-cover-stack linear both;animation-duration:auto;animation-timeline:--v3-card-stack;animation-range:exit-crossing var(--v3-case-gap) exit-crossing calc(var(--v3-case-gap) + 100cqi * var(--v3-cover-height) / 588 * .75)}
   .v3-case-copy{transform:none}
   .v3-case-cover-art{animation:v3-card-art-stack linear both;animation-duration:auto;animation-timeline:--v3-card-stack;animation-range:exit-crossing var(--v3-case-gap) exit-crossing calc(var(--v3-case-gap) + 100cqi * var(--v3-cover-height) / 588 * .75)}
   .v3-cases[data-cover-compositor] .v3-case-cover-visual{animation-name:v3-card-cover-composite;will-change:transform,opacity}
  }
 }`;
 document.head.append(style);
}
export function mountCardStack(section){
 // Preserve the width/height path accepted on physical iOS Safari.
 section.toggleAttribute('data-cover-compositor',/Android/i.test(navigator.userAgent));
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
