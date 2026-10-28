(() => {
  // The shared PDF prefetcher can proceed as soon as this static page is ready.
  document.documentElement.dataset.contentReadyAt=performance.now().toFixed(1);
  const page=document.querySelector('.about-page');
  const main=page?.querySelector('.about-main');
  const footer=page?.querySelector('.footer');
  const footerTitle=footer?.querySelector('h2');
  if(!main)return;
  const root=document.documentElement;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const still=()=>reduced.matches||page.matches('.ds-preview[data-state="reduced-motion"]');
  main.querySelector('.resume-back-to-top')?.addEventListener('click',event=>{
    if(still())return;
    event.preventDefault();
    main.focus({preventScroll:true});
    history.replaceState(history.state,'','#resume-top');
    window.scrollTo({top:0,behavior:'smooth'});
  });
  // CSS handles the first paint. Only prepare blocks still below the viewport:
  // a late script must never hide text the visitor has already started reading.
  const revealTargets=[...main.querySelectorAll('.about-title-row,.resume-formats,.resume-back-to-top,.reading-about-teaser,.case-study-title,.related-cases,.not-found-actions,.about-intro > p,.about-photo-placeholder,.article-work,.about-sections > section > :not(.resume-section-content),.resume-section-content > *,.about-main > .recommendations,.about-gallery-main > .photo-gallery-footer')];
  if(still())revealTargets.forEach(target=>{target.dataset.readingReveal='shown';});
  if(!still()&&typeof IntersectionObserver==='function'){
    let observer,queueFrame=0;
    const outstanding=new Set(revealTargets);
    const stepValue=getComputedStyle(main).getPropertyValue('--delay-reading-step').trim();
    const stepMs=parseFloat(stepValue)*(stepValue.endsWith('ms')?1:1000)||240;
    let nextRevealAt=0;
    const show=target=>{
      outstanding.delete(target);
      target.dataset.readingReveal='shown';
      target.style.removeProperty('--reading-reveal-delay');
      observer?.unobserve(target);
    };
    const showAll=()=>{observer?.disconnect();cancelAnimationFrame(queueFrame);queueFrame=0;revealTargets.forEach(show);};
    const viewport=()=>({top:window.visualViewport?.offsetTop||0,bottom:(window.visualViewport?.offsetTop||0)+(window.visualViewport?.height||window.innerHeight)});
    function refreshQueue(compact=false){
      const now=performance.now(),view=viewport();
      let next=now;
      for(const target of outstanding){
        const rect=target.getBoundingClientRect();
        if(rect.bottom<=view.top||rect.top>=view.bottom)continue;
        const animation=target.getAnimations().find(item=>item.animationName==='reading-content-enter');
        if(!animation?.effect)continue;
        const delay=Number(animation.effect.getTiming().delay)||0,elapsed=Number(animation.currentTime)||0;
        let remaining=delay-elapsed;
        // Remove empty slots left by passed blocks. Shorten only waiting time;
        // a fade already in progress retains its playhead, duration and easing.
        if(compact&&remaining>0){
          remaining=Math.min(remaining,Math.max(0,next-now));
          animation.effect.updateTiming({delay:elapsed+remaining});
        }
        next=Math.max(next,now+remaining+stepMs);
      }
      nextRevealAt=next;
    }
    function finishPassed(){
      const {top}=viewport();
      const passed=[...outstanding].filter(target=>target.getBoundingClientRect().bottom<=top);
      passed.forEach(show);
      if(passed.length)refreshQueue(true);
    }
    const onScroll=()=>{
      if(!queueFrame&&outstanding.size)queueFrame=requestAnimationFrame(()=>{queueFrame=0;finishPassed();});
    };
    const showHash=()=>{
      let id;try{id=decodeURIComponent(location.hash.slice(1));}catch(_){return;}
      const anchor=document.getElementById(id);
      revealTargets.filter(target=>target===anchor||target.contains(anchor)).forEach(show);
    };
    try{
      observer=new IntersectionObserver(entries=>{
        finishPassed();
        refreshQueue();
        const view=viewport();
        const entering=entries.filter(entry=>{
          if(!entry.isIntersecting||entry.target.dataset.readingReveal!=='pending')return false;
          const rect=entry.target.getBoundingClientRect();
          return rect.bottom>view.top&&rect.top<view.bottom;
        })
          .sort((a,b)=>revealTargets.indexOf(a.target)-revealTargets.indexOf(b.target));
        const now=performance.now();
        nextRevealAt=Math.max(now,nextRevealAt);
        entering.forEach(({target})=>{
          observer.unobserve(target);
          target.style.setProperty('--reading-reveal-delay',`${Math.max(0,nextRevealAt-now)}ms`);
          nextRevealAt+=stepMs;
          target.dataset.readingReveal='entering';
        });
      },{threshold:0,rootMargin:'0px 0px -24px 0px'});
      revealTargets.forEach(target=>{
        if(target.getBoundingClientRect().top>=window.innerHeight){
          target.dataset.readingReveal='pending';observer.observe(target);
        }else if(window.scrollY>0)show(target);
      });
      // Keep new scroll batches behind first-paint blocks still waiting to start.
      refreshQueue();
      window.addEventListener('scroll',onScroll,{passive:true});
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
  // Resume alone reuses the covering pose between its About teaser and works.
  const resumeTeaser=main.matches('.resume-page')?main.querySelector('.reading-about-teaser'):null;
  const resumeWorks=resumeTeaser?.nextElementSibling?.matches('.related-cases')?resumeTeaser.nextElementSibling:null;
  let worksStart=0,worksTravel=1;
  function resetResumeOverlap(){
    main.classList.remove('resume-works-overlap');
    main.style.removeProperty('--resume-teaser-sticky-top');
    if(!resumeWorks)return;
    resumeTeaser.style.removeProperty('opacity');resumeTeaser.style.removeProperty('transform');
    resumeTeaser.inert=false;
    delete resumeTeaser.dataset.resumeCovered;delete main.dataset.resumeWorksProgress;
  }
  const probe=document.createElement('div');
  probe.className='reading-viewport-probe';probe.setAttribute('aria-hidden','true');
  page.append(probe);
  let viewport=0,footerStart=0,overlapTravel=1,frame=0,measurePending=true;
  const clamp=value=>Math.max(0,Math.min(1,value));
  function paint(){
    frame=0;
    if(root.classList.contains('mobile-menu-open')||document.hidden)return;
    if(still()){
      resetResumeOverlap();
      page.classList.remove('reading-footer-overlap','reading-footer-ready');
      main.style.removeProperty('opacity');main.style.removeProperty('transform');
      footer.style.removeProperty('--footer-radius');
      delete root.dataset.readingFooterCovered;delete page.dataset.readingFooterProgress;
      return;
    }
    if(measurePending){
      viewport=probe.offsetHeight||window.innerHeight;
      page.style.setProperty('--reading-viewport-height',`${viewport}px`);
      // Let the footer scroll in normally until its entire heading is visible.
      // Only then pin and recede the preceding reading surface.
      const footerInner=footer.querySelector('.footer-inner');
      const topPadding=element=>element ? parseFloat(getComputedStyle(element).paddingTop)||0 : 0;
      // Padding stays stable even while the mobile inner wrapper is sticky.
      const headingDepth=footerTitle ? topPadding(footer)+topPadding(footerInner)+footerTitle.offsetHeight : 0;
      overlapTravel=Math.max(1,viewport-Math.min(headingDepth,viewport-1));
      page.style.setProperty('--reading-sticky-top',`${Math.min(0,overlapTravel-main.offsetHeight)}px`);
      page.classList.add('reading-footer-ready');
      footerStart=footer.getBoundingClientRect().top+window.scrollY;
      if(resumeWorks){
        worksTravel=Math.max(1,Math.min(resumeTeaser.offsetHeight,viewport-Math.min(resumeWorks.querySelector('h2')?.offsetHeight||0,viewport-1)));
        // Main is the offset parent; its end remains anchored at the footer even
        // while the existing footer transition pins and scales the whole page.
        worksStart=footerStart-main.offsetHeight+resumeWorks.offsetTop;
        main.style.setProperty('--resume-teaser-sticky-top',`${worksTravel-resumeTeaser.offsetHeight}px`);
      }
      measurePending=false;
    }
    if(resumeWorks){
      const progress=clamp((window.scrollY-worksStart+worksTravel)/worksTravel);
      main.classList.toggle('resume-works-overlap',progress>0&&progress<1);
      resumeTeaser.style.opacity=String(1-progress);
      resumeTeaser.style.transform=progress>0?`scale(${1-overlapRecede*progress})`:'none';
      resumeTeaser.inert=progress>=.999;
      resumeTeaser.dataset.resumeCovered=String(progress>=.999);
      main.dataset.resumeWorksProgress=progress.toFixed(4);
      // An incoming opaque surface must not wait behind a reading fade queue.
      if(progress>0){resumeWorks.dataset.readingReveal='shown';resumeWorks.style.removeProperty('--reading-reveal-delay');}
    }
    // Sticky layout supplies the same native incoming motion as HOME. Only the
    // outgoing reading surface and the last quarter of the corners are painted.
    const cover=clamp((window.scrollY-footerStart+overlapTravel)/overlapTravel);
    // Safari samples even inactive sticky containers for its browser fill.
    // Keep ordinary reading in normal flow; pin only during footer overlap.
    page.classList.toggle('reading-footer-overlap',cover>0&&cover<1);
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
    // Back to top manages the scroll when focusing the main landmark.
    if(event.target===main||still()||root.classList.contains('mobile-menu-open'))return;
    if(resumeWorks&&resumeTeaser.contains(event.target)&&Number(main.dataset.resumeWorksProgress)>0){
      window.scrollTo({top:Math.max(0,worksStart-viewport),behavior:'instant'});
      schedule();return;
    }
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
  if(footerTitle)new ResizeObserver(()=>schedule(true)).observe(footerTitle);
  // Menu scroll-lock temporarily fixes the body; retain the reading pose until
  // its normal flow and original scroll position have been restored.
  new MutationObserver(()=>schedule(true)).observe(root,{attributes:true,attributeFilter:['class']});
  document.fonts.ready.then(()=>schedule(true));
  paint();
})();
