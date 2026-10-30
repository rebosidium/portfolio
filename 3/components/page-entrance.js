// Independent equivalent of the main site's power2/power3 entrance curves.
// The pre-paint shell keeps content visible if this optional file fails to load.
(()=>{
 const root=document.documentElement,gate=window.v3Entrance;
 if(!gate||root.dataset.v3Entrance!=='pending')return;
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');
 const targets=[document.querySelector('.v3-header'),document.querySelector('.v3-headline'),document.querySelector('.v3-hero > .v3-brief')];
 let animations=[],cancelled=false,fontTimer;
 function finish(){
  cancelled=true;clearTimeout(fontTimer);
  animations.forEach(animation=>animation.cancel());animations=[];
  gate.finish();
 }
 // Sample the original polynomial easing rather than approximating its timing
 // with a different bezier. Each target keeps its normal layout throughout.
 function frames(distance,power){
  return Array.from({length:61},(_,i)=>{
   const t=i/60,eased=1-(1-t)**power;
   return{offset:t,opacity:eased,transform:`translate3d(0,${distance*(1-eased)}px,0)`};
  });
 }
 async function start(){
  await Promise.race([document.fonts?.ready||Promise.resolve(),new Promise(resolve=>{fontTimer=setTimeout(resolve,800)})]);clearTimeout(fontTimer);
  if(cancelled||root.dataset.v3Entrance!=='pending')return;
  if(reduced.matches||document.hidden||!targets.every(el=>el&&typeof el.animate==='function')||scrollY>32){finish();return;}
  const timings=[{duration:1050,delay:140},{duration:850,delay:1490},{duration:850,delay:1690}];
  try{
   animations=targets.map((el,index)=>el.animate(frames(index?18:12,index?4:3),{...timings[index],fill:'both',easing:'linear'}));
   root.dataset.v3Entrance='playing';
   animations[0].finished.then(()=>gate.headerDone(),()=>{});
   await Promise.all(animations.map(animation=>animation.finished));
   if(!cancelled)finish();
  }catch{finish();}
 }
 // Never replay on scroll, BFCache restoration or preference changes.
 document.addEventListener('visibilitychange',()=>{if(document.hidden)finish()});
 reduced.addEventListener('change',()=>{if(reduced.matches)finish()});
 addEventListener('v3-entrance-timeout',finish,{once:true});
 addEventListener('pagehide',finish,{once:true});
 // Keyboard interaction should not land on a control that is still transparent.
 document.addEventListener('keydown',event=>{if(event.key==='Tab')finish()},{capture:true});
 // Deliberate scrolling past the threshold settles the whole sequence, so
 // content brought into view is never left waiting for its delayed fade.
 function onScroll(){if(scrollY>32){removeEventListener('scroll',onScroll);if(!cancelled)finish();}}
 addEventListener('scroll',onScroll,{passive:true});
 start();
})();
