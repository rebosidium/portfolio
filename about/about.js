(() => {
  // The shared PDF prefetcher can proceed as soon as this static page is ready.
  document.documentElement.dataset.contentReadyAt=performance.now().toFixed(1);
  const page=document.querySelector('.about-page');
  const main=page?.querySelector('.about-main');
  const footer=page?.querySelector('.footer');
  if(!main)return;
  const root=document.documentElement;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const still=()=>reduced.matches||page.matches('.ds-preview[data-state="reduced-motion"]');
  // CSS handles the first paint. Only prepare blocks still below the viewport:
  // a late script must never hide text the visitor has already started reading.
  const revealTargets=[...main.querySelectorAll('.about-title-row,.about-intro > p,.about-photo-placeholder,.article-work,.about-sections > section > *')];
  if(still())revealTargets.forEach(target=>{target.dataset.readingReveal='shown';});
  if(!still()&&typeof IntersectionObserver==='function'){
    let observer;
    const show=target=>{
      target.dataset.readingReveal='shown';
      target.style.removeProperty('--reading-reveal-delay');
      observer?.unobserve(target);
    };
    const showAll=()=>{observer?.disconnect();revealTargets.forEach(show);};
    const showHash=()=>{
      let id;try{id=decodeURIComponent(location.hash.slice(1));}catch(_){return;}
      const anchor=document.getElementById(id);
      revealTargets.filter(target=>target===anchor||target.contains(anchor)).forEach(show);
    };
    try{
      observer=new IntersectionObserver(entries=>{
        const entering=entries.filter(entry=>entry.isIntersecting&&entry.target.dataset.readingReveal==='pending');
        entering.forEach(({target},index)=>{
          observer.unobserve(target);
          target.style.setProperty('--reading-reveal-delay',`calc(var(--delay-reading-step) * ${Math.min(index,2)})`);
          target.dataset.readingReveal='entering';
        });
      },{threshold:0,rootMargin:'0px 0px -24px 0px'});
      revealTargets.forEach(target=>{
        if(target.getBoundingClientRect().top>=window.innerHeight){
          target.dataset.readingReveal='pending';observer.observe(target);
        }else if(window.scrollY>0)show(target);
      });
      main.addEventListener('animationend',event=>{
        if(event.animationName==='reading-content-enter'&&revealTargets.includes(event.target))show(event.target);
      });
      main.addEventListener('focusin',event=>{
        revealTargets.filter(target=>target.contains(event.target)).forEach(show);
      });
      window.addEventListener('hashchange',showHash);
      window.addEventListener('pagehide',showAll);
      reduced.addEventListener('change',()=>{if(still())showAll();});
      showHash();
    }catch(_){showAll();} // Optional motion must never leave content hidden.
  }
  if(!footer||!CSS.supports('position','sticky'))return;
  // Match HOME's shared footer pose without reading computed styles per frame.
  const footerStyle=getComputedStyle(footer);
  const poseNumber=(name,fallback)=>{
    const value=parseFloat(footerStyle.getPropertyValue(name));
    return Number.isFinite(value)?value:fallback;
  };
  const footerRadius=poseNumber('--radius-panel',40);
  const overlapRecede=poseNumber('--overlap-recede',.025);
  const flattenStart=poseNumber('--overlap-flatten-start',.75);
  const probe=document.createElement('div');
  probe.className='reading-viewport-probe';probe.setAttribute('aria-hidden','true');
  page.append(probe);
  let viewport=0,footerStart=0,frame=0,measurePending=true;
  const clamp=value=>Math.max(0,Math.min(1,value));
  function paint(){
    frame=0;
    if(root.classList.contains('mobile-menu-open')||document.hidden)return;
    if(still()){
      page.classList.remove('reading-footer-overlap');
      main.style.removeProperty('opacity');main.style.removeProperty('transform');
      footer.style.removeProperty('--footer-radius');
      delete root.dataset.readingFooterCovered;delete page.dataset.readingFooterProgress;
      return;
    }
    if(measurePending){
      viewport=probe.offsetHeight||window.innerHeight;
      page.style.setProperty('--reading-viewport-height',`${viewport}px`);
      page.style.setProperty('--reading-sticky-top',`${Math.min(0,viewport-main.offsetHeight)}px`);
      page.classList.add('reading-footer-overlap');
      footerStart=footer.getBoundingClientRect().top+window.scrollY;
      measurePending=false;
    }
    // Sticky layout supplies the same native incoming motion as HOME. Only the
    // outgoing reading surface and the last quarter of the corners are painted.
    const cover=clamp((window.scrollY-footerStart+viewport)/viewport);
    const flatten=clamp((cover-flattenStart)/(1-flattenStart));
    main.style.opacity=String(1-cover);
    main.style.transform=cover>0?`scale(${1-overlapRecede*cover})`:'none';
    footer.style.setProperty('--footer-radius',`${footerRadius*(1-flatten*flatten*(3-2*flatten))}px`);
    page.dataset.readingFooterProgress=cover.toFixed(4);
    root.dataset.readingFooterCovered=String(cover>=.999);
  }
  function schedule(measure=false){
    measurePending=measurePending||measure;
    if(!frame)frame=requestAnimationFrame(paint);
  }
  window.addEventListener('scroll',()=>schedule(),{passive:true});
  window.addEventListener('resize',()=>schedule(true),{passive:true});
  window.addEventListener('pageshow',()=>schedule(true));
  main.addEventListener('focusin',event=>{
    if(still()||root.classList.contains('mobile-menu-open'))return;
    const cover=Number(page.dataset.readingFooterProgress)||0;
    if(!cover)return;
    const target=event.target.getBoundingClientRect();
    if(target.top>=0&&target.bottom<=Math.min(window.innerHeight,footer.getBoundingClientRect().top))return;
    const relativeTop=(target.top-main.getBoundingClientRect().top)/(1-overlapRecede*cover);
    const originalTop=footerStart-main.offsetHeight+relativeTop;
    // Native Tab/Shift+Tab can focus a link in the covered article. Reveal its
    // original reading position without changing focus or animating the scroll.
    window.scrollTo({top:Math.max(0,Math.min(originalTop-24,footerStart-viewport)),behavior:'instant'});
    schedule();
  });
  reduced.addEventListener('change',()=>schedule(true));
  document.addEventListener('visibilitychange',()=>schedule(true));
  new ResizeObserver(()=>schedule(true)).observe(main);
  new ResizeObserver(()=>schedule(true)).observe(probe);
  // Menu scroll-lock temporarily fixes the body; retain the reading pose until
  // its normal flow and original scroll position have been restored.
  new MutationObserver(()=>schedule(true)).observe(root,{attributes:true,attributeFilter:['class']});
  document.fonts.ready.then(()=>schedule(true));
  paint();
})();
