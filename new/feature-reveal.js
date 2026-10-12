// The /new/ mobile entrance, independent of animated icon players and downloads.
(() => {
  const mobile=window.mobileLayout,reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const features=[...document.querySelectorAll('.features .feature')];
  const revealed=new Set(),animations=new Map();
  const supported=typeof IntersectionObserver==='function'&&features.every(f=>typeof f.animate==='function');
  let raf=0,pageReady=!window.portraitReveal;
  function finish(feature){
    const animation=animations.get(feature);
    if(animation){animation.onfinish=null;animation.cancel();animations.delete(feature)}
    feature.classList.remove('mobile-feature-pending','mobile-feature-revealing');revealed.add(feature);
  }
  function finishAll(){features.forEach(finish)}
  function prepare(){
    if(!mobile.matches||reduced.matches||!supported){finishAll();return}
    const pending=document.documentElement.classList.contains('motion-pending');
    for(const feature of features){
      if(revealed.has(feature))continue;
      const rect=feature.getBoundingClientRect();
      if(!pending&&rect.bottom>0&&rect.top<innerHeight){finish(feature);continue}
      feature.classList.add('mobile-feature-pending');
    }
  }
  function reveal(feature){
    if(revealed.has(feature))return;
    revealed.add(feature);feature.classList.remove('mobile-feature-pending');
    feature.classList.add('mobile-feature-revealing');
    try{
      const animation=feature.animate([{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'translateY(0)'}],{duration:900,easing:'cubic-bezier(.4,0,.2,1)',fill:'both'});
      animations.set(feature,animation);animation.onfinish=()=>{finish(feature);schedule()};
    }catch{finish(feature)}
  }
  function update(){
    raf=0;
    if(!mobile.matches||reduced.matches){finishAll();return}
    if(!pageReady||document.hidden||document.documentElement.classList.contains('mobile-menu-open')){for(const a of animations.values())a.pause();return}
    for(const a of animations.values())if(a.playState==='paused')a.play();
    const viewport=window.visualViewport,top=viewport?.offsetTop||0,height=viewport?.height||innerHeight;
    for(const feature of features){
      const rect=feature.getBoundingClientRect(),style=getComputedStyle(feature);
      if(rect.width<=0||rect.height<=0||style.display==='none'||style.visibility==='hidden')continue;
      const visible=Math.max(0,Math.min(rect.bottom,top+height)-Math.max(rect.top,top));
      if(visible>=Math.min(rect.height,height)*.4)reveal(feature);
    }
  }
  function schedule(){if(!raf)raf=requestAnimationFrame(update)}
  for(const target of [window,window.visualViewport])for(const event of ['scroll','resize'])target?.addEventListener(event,schedule,{passive:true});
  document.addEventListener('visibilitychange',schedule);
  for(const media of [mobile,reduced])media.addEventListener('change',()=>{prepare();schedule()});
  const observer=supported?new IntersectionObserver(schedule,{threshold:[0,.4,.5,1]}):null;
  const resize=typeof ResizeObserver==='function'?new ResizeObserver(schedule):null;
  for(const feature of features){observer?.observe(feature);resize?.observe(feature);feature.addEventListener('focusin',()=>{finish(feature);schedule()})}
  const rootChanges=typeof MutationObserver==='function'?new MutationObserver(schedule):null;
  rootChanges?.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  const release=()=>{finishAll();pageReady=true;schedule()};
  window.releaseMobileFeatureReveal=release;
  prepare();window.portraitReveal?.then(()=>{pageReady=true;schedule()},release);schedule();
})();
