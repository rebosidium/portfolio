(async () => {
  // Mobile material is initialized before the app captures its state; desktop never waits.
  if (window.mobileLayout.matches) await window.mobileBootstrapReady;
  mountGlanceSection();
  window.promoControlsReady = true;
  window.releaseMobilePromoClose?.();
  const promo = document.querySelector('.promo');
  const content = document.querySelector('.promo-content');
  const illustration = document.querySelector('.promo-illustration');
  const text = document.querySelector('.promo-text');
  let action = document.querySelector('.promo-action');
  let button = document.querySelector('.promo-label');
  const close = document.querySelector('.promo-close');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const syncGlassBackground = () => {
    const surface = action.closest('lg-button')?.surface;
    if (!surface) return;
    // Give the existing material a local backdrop underneath the button, without
    // painting over its optical layer, tint, border or translucent base fill.
    const color = getComputedStyle(promo).backgroundColor;
    const host = action.closest('lg-button');
    if (host.style.getPropertyValue('--promo-glass-backdrop') !== color) host.style.setProperty('--promo-glass-backdrop',color);
  };
  const decodeImage = image => {
    if (image.decode) return image.decode().then(() => true,() => false);
    if (image.complete) return Promise.resolve(image.naturalWidth > 0);
    return new Promise(resolve => {
      image.addEventListener('load',() => resolve(true),{once:true});
      image.addEventListener('error',() => resolve(false),{once:true});
    });
  };
  const finishBoot = () => {
    clearTimeout(window.pageRevealFallback);
    root.classList.remove('motion-pending');
  };
  const variants = [
    {id:'audit',color:'#8e6dd0',image:'assets/audit.png?v=47213b1faa6f',text:'Find opportunities to improve your product with a design audit',cta:'Book an Audit',subject:'Design audit',gap:15},
    {id:'work',color:'#0b9bf7',image:'assets/open-to-work.png?v=379829166b85',text:'Open to new design roles and exciting projects',mobileLine:'and exciting projects',cta:'Let’s Talk',subject:'Design role or project',gap:15},
    {id:'consulting',color:'#59bf61',image:'assets/consulting.png?v=c955eb126e6c',text:'Design consulting & mentoring for individuals and teams',mobileLine:'for individuals and teams',cta:'Book a Consultation',subject:'Design consulting',gap:23}
  ];
  let mobilePromoResources;
  window.preloadMobilePromoResources = () => mobilePromoResources ||= Promise.allSettled(variants.map(async variant => {
    const image = new Image();image.decoding = 'async';image.fetchPriority = 'low';image.src = variant.image;
    await decodeImage(image);
  }));
  const variantAssets = new Map();
  const cacheVariant = (variant,image) => {
    const pending = Promise.race([decodeImage(image),new Promise(resolve => setTimeout(() => resolve(false),5000))]).then(ready => {
      if (!ready && variantAssets.get(variant.id) === pending) variantAssets.delete(variant.id);
      return ready;
    });
    variantAssets.set(variant.id,pending);
    return pending;
  };
  const preloadVariant = variant => {
    if (!variantAssets.has(variant.id)) {
      const image = new Image();
      image.decoding = 'async'; image.fetchPriority = 'low'; image.src = variant.image;
      cacheVariant(variant,image);
    }
    return variantAssets.get(variant.id);
  };
  let index = Math.max(0, variants.findIndex(v => v.id === new URLSearchParams(location.search).get('banner')));
  const rotationDelay = 6000;
  let timer, transition, layoutTransition, shellTimeline, rotationGeneration = 0, dismissed = promo.hidden, hovered = false, initialReady = false;
  let rotationCleanup = null;
  let bannerEntered = !root.classList.contains('shell-pending') && !root.classList.contains('mobile-shell-pending');
  const navigation = [...document.querySelectorAll('.header > a, .header nav a')];
  const releaseShell = window.releaseShellFallback;
  const settleShell = () => {
    shellTimeline?.kill();
    if (window.gsap) gsap.set([promo,...navigation],{clearProps:'transform,opacity'});
    bannerEntered = true;
    releaseShell();
    if (timer === undefined) schedule();
  };
  window.releaseShellFallback = settleShell;
  window.mobileHeaderReady.then(() => {if (window.mobileLayout.matches) {bannerEntered = true;releaseShell();schedule();}});
  window.mobileLayout.addEventListener('change',() => {if (window.mobileLayout.matches && root.classList.contains('nav-pending')) settleShell();});
  const enhanceGlassButton = async () => {
    const mobileMaterial = window.mobilePromoMaterialState;
    const fallbackChosen = () => mobileMaterial?.settled && !mobileMaterial.ready;
    let replacement, original, originalLabel;
    const restore = () => {
      if (!replacement?.isConnected) return;
      replacement.replaceWith(original);
      action = original;button = originalLabel;
    };
    if (dismissed || action.closest('lg-button')) return;
    try {
      // Prepare the material while the independent mobile shell enters.
      await import('./vendor/components.js?v=968d5372ad45');
      if (dismissed || action.closest('lg-button') || fallbackChosen()) return;
      if (transition?.isActive()) {setTimeout(enhanceGlassButton,100);return;}
      // Do not swap the fallback link underneath a pointer or keyboard focus.
      if (action.matches(':hover') || document.activeElement === action) {
        const original = action;
        const cleanup = () => {
          original.removeEventListener('pointerleave',retry);
          original.removeEventListener('blur',retry);
          close.removeEventListener('click',cleanup);
        };
        const retry = () => {
          if (original.matches(':hover') || document.activeElement === original) return;
          cleanup();
          enhanceGlassButton();
        };
        original.addEventListener('pointerleave',retry);
        original.addEventListener('blur',retry);
        close.addEventListener('click',cleanup,{once:true});
        return;
      }
      const glass = document.createElement('lg-button');
      glass.className = 'promo-glass';
      for (const [name,value] of Object.entries({href:action.href,radius:'capsule',refraction:'6',chroma:'0',specular:'0',bezel:'.6'})) glass.setAttribute(name,value);
      glass.textContent = button.textContent;
      original = action;originalLabel = button;
      replacement = glass;
      const focused = document.activeElement === action;
      action.replaceWith(glass);
      action = glass.button;
      button = glass.querySelector('.lg-button__label');
      action.classList.add('promo-action');
      syncGlassBackground();
      // The independent mobile entrance uses WAAPI; mirror it only until it settles.
      if (window.mobileLayout.matches) {
        let frame = 0, finished = false;
        const syncEntrance = () => {
          if (finished || dismissed || !glass.isConnected) return;
          syncGlassBackground();
          frame = requestAnimationFrame(syncEntrance);
        };
        syncEntrance();
        window.mobileHeaderReady.finally(() => {
          finished = true;cancelAnimationFrame(frame);syncGlassBackground();
        });
      }
      // Keep this pinned component's glass fixed instead of using its default press squish.
      glass.surface.setDelta = () => {};
      if (mobileMaterial) {
        mobileMaterial.restore = restore;
        const prepared = new Promise(resolve => {
          let painted = 0;
          const check = () => {
            if (fallbackChosen()) {resolve(false);return;}
            // Blink's refractive map is decoded asynchronously; WebKit has a CSS surface.
            const ready = glass.surface.mode === 'fallback' || !!glass.surface.glass?.filterId;
            if (ready && ++painted >= 2) {resolve(true);return;}
            requestAnimationFrame(check);
          };
          requestAnimationFrame(check);
        });
        if (!await Promise.race([prepared,window.mobilePromoMaterialReady])) {
          restore();
          return;
        }
        mobileMaterial.settle(true);
      }
      if (focused) action.focus({preventScroll:true});
    } catch {
      if (mobileMaterial) restore();
      // The original mail link and CSS glass remain usable if the optional module fails.
    }
  };
  const settleDismissal = () => {
    document.documentElement.style.setProperty('--promo-space','0px');
    promo.hidden = true;
    document.body.classList.remove('layout-changing');
  };
  const apply = (updateColor = true) => {
    const v = variants[index];
    if (updateColor) promo.style.backgroundColor = v.color;
    content.style.gap = `${v.gap}px`;
    illustration.src = v.image;
    text.textContent = v.text;
    if (v.mobileLine) {
      text.textContent = v.text.slice(0,v.text.indexOf(v.mobileLine));
      const continuation = document.createElement('span');
      continuation.className = 'promo-continuation';
      continuation.textContent = v.mobileLine;
      text.append(continuation);
    }
    button.textContent = v.cta;
    action.href = `mailto:rebosidium@gmail.com?subject=${encodeURIComponent(v.subject)}`;
    promo.dataset.variant = v.id;
    syncGlassBackground();
  };
  apply();
  window.mobileLayout.addEventListener('change',() => {
    if (!rotationCleanup) return;
    transition?.kill();rotationCleanup();rotationCleanup = null;transition = null;
    apply();schedule();
  });
  // Modulepreload starts the downloads in the head; mount the button before the intro.
  const glassReady = enhanceGlassButton().finally(() => {
    window.mobilePromoMaterialState?.settle(false);
    clearTimeout(window.glassRevealFallback);
    root.classList.remove('glass-pending');
  });
  const visibleReady = Promise.all([...document.querySelectorAll('img[data-reveal]')].map(async image => {
    const ready = await decodeImage(image);
    image.classList.add('image-ready');
    return ready;
  }));
  // A separate resource gate never changes the first screen's existing reveal deadlines.
  Promise.allSettled([glassReady,visibleReady,document.fonts?.ready]).then(async () => {
    if (window.mobileLayout.matches) {
      await window.preloadMobilePromoResources();
      await Promise.allSettled([...document.querySelectorAll('.intro-screen img')].map(decodeImage));
    }
    window.resolveFirstScreenResourcesReady(true);
  });
  const imageDeadline = new Promise(resolve => setTimeout(() => {
    root.classList.remove('image-fades');
    resolve();
  },4000));
  cacheVariant(variants[index],illustration);
  const mobileBannerOffscreen = () => window.mobileLayout.matches && promo.getBoundingClientRect().bottom < 0;
  const pause = () => {clearTimeout(timer); timer = undefined; rotationGeneration++;};
  const schedule = (delay = rotationDelay) => {
    pause();
    if (!initialReady || !bannerEntered || dismissed || reduced.matches || document.hidden || hovered || promo.contains(document.activeElement) || mobileBannerOffscreen()) return;
    const generation = rotationGeneration;
    timer = setTimeout(async () => {
      if (generation !== rotationGeneration) return;
      timer = undefined;
      const next = (index + 1) % variants.length;
      const ready = await preloadVariant(variants[next]);
      if (generation !== rotationGeneration) return;
      if (!ready) {schedule(); return;}
      if (dismissed || reduced.matches || document.hidden || hovered || promo.contains(document.activeElement) || mobileBannerOffscreen()) {schedule(); return;}
      if (window.gsap) {
        const started = performance.now();
        // Fading a backdrop-filter ancestor changes the sampled backdrop and flashes the rim.
        // Keep filter ancestors opaque; the mobile CTA moves and fades its own visual leaves.
        const mobileCta = window.mobileLayout.matches;
        const changingContent = mobileCta ? [illustration,text] : [illustration,text,button];
        transition = gsap.timeline({onComplete:() => {
          transition = null;rotationCleanup = null;
          if (timer === undefined) schedule(Math.max(0,rotationDelay - (performance.now() - started)));
        }});
        transition.to(promo,{backgroundColor:variants[next].color,duration:.58,ease:'power2.inOut',onUpdate:syncGlassBackground},0)
          .to(changingContent,{y:-8,opacity:0,duration:.22,ease:'power2.in'},0).call(() => {
            index = next;
            apply(false);
          },null,.22).fromTo(changingContent,{y:8,opacity:0},{y:0,opacity:1,duration:.36,ease:'power3.out',clearProps:'transform,opacity',...(mobileCta ? {immediateRender:false} : {})},.22);
        if (mobileCta) {
          const host = action.closest('lg-button') || action;
          const surface = host.surface;
          const leaves = surface ? [button,surface.layer,surface.shadow] : [action.querySelector('.promo-button')];
          const out = {duration:.22,ease:'power2.in'};
          const enter = {duration:.36,ease:'power3.out',immediateRender:false};
          rotationCleanup = () => {
            gsap.set([illustration,text],{clearProps:'transform,opacity'});
            gsap.set(host,{clearProps:'transform'});
            gsap.set(leaves,{clearProps:'opacity'});
            if (surface) {
              gsap.set(surface.tint,{clearProps:'opacity'});
              gsap.set(action,{clearProps:'borderColor,backgroundColor'});
            }
          };
          transition.to(host,{y:-8,...out},0)
            .fromTo(host,{y:8},{y:0,...enter,clearProps:'transform'},.22)
            .to(leaves,{opacity:0,...out},0)
            .fromTo(leaves,{opacity:0},{opacity:1,...enter,clearProps:'opacity'},.22);
          if (surface) {
            const material = getComputedStyle(action),tintOpacity = getComputedStyle(surface.tint).opacity;
            const borderColor = material.borderColor,backgroundColor = material.backgroundColor;
            transition.to(action,{borderColor:'#ffffff00',backgroundColor:'#ffffff00',...out},0)
              .fromTo(action,{borderColor:'#ffffff00',backgroundColor:'#ffffff00'},{borderColor,backgroundColor,...enter,clearProps:'borderColor,backgroundColor'},.22)
              .to(surface.tint,{opacity:0,...out},0)
              .fromTo(surface.tint,{opacity:0},{opacity:tintOpacity,...enter,clearProps:'opacity'},.22);
          }
        }
      } else {index = next; apply(); schedule();}
    }, delay);
  };
  // An offscreen mobile banner must not resize the page underneath a sticky card.
  let bannerOffscreen = false;
  const syncBannerVisibility = () => {
    const offscreen = mobileBannerOffscreen();
    if(offscreen === bannerOffscreen)return;
    bannerOffscreen = offscreen;
    if(offscreen){
      pause();
      if(transition){
        transition.kill();rotationCleanup?.();
        gsap.set([illustration,text,button],{clearProps:'transform,opacity'});
        rotationCleanup=null;transition=null;apply();
      }
    }else schedule();
  };
  if(typeof IntersectionObserver === 'function'){
    const bannerVisibility = new IntersectionObserver(syncBannerVisibility,{threshold:0});
    bannerVisibility.observe(promo);
  }else window.addEventListener('scroll',syncBannerVisibility,{passive:true});
  window.mobileLayout.addEventListener('change',syncBannerVisibility);
  promo.addEventListener('pointerenter',event => {if(event.pointerType === 'touch') return;hovered = true; pause();});
  promo.addEventListener('pointerleave',() => {hovered = false; schedule();});
  promo.addEventListener('focusin',pause);
  promo.addEventListener('focusout',() => setTimeout(() => schedule(),0));
  document.addEventListener('visibilitychange',() => document.hidden ? pause() : schedule());
  close.addEventListener('click',event => {
    if (dismissed) return;
    dismissed = true; pause(); transition?.kill();
    rotationCleanup?.();rotationCleanup = null;
    // Dismissal completes the one-off shell entrance before collapsing the banner.
    if (root.classList.contains('nav-pending') || shellTimeline?.isActive()) settleShell();
    if (event.detail === 0) document.querySelector('.identity').focus({preventScroll:true});
    else close.blur();
    if (window.gsap && !reduced.matches) {
      document.body.classList.add('layout-changing');
      layoutTransition = gsap.timeline({onComplete:settleDismissal});
      layoutTransition.to(promo,{height:0,opacity:0,duration:.6,ease:'power3.inOut',autoRound:false},0)
        .to(document.documentElement,{'--promo-space':'0px',duration:.6,ease:'power3.inOut'},0);
    } else settleDismissal();
  });
  Promise.race([visibleReady,imageDeadline]).then(() => {
    initialReady = true; schedule();
    const warmRemaining = async () => {
      await glassReady;
      for (const offset of [1,2]) {
        if (dismissed || reduced.matches) return;
        await preloadVariant(variants[(index + offset) % variants.length]);
      }
    };
    if (window.requestIdleCallback) requestIdleCallback(warmRemaining,{timeout:1500});
    else setTimeout(warmRemaining,200);
  });
  if (!window.gsap) {
    settleShell();
    Promise.all([window.mobileHeaderReady,window.portraitReady,Promise.race([decodeImage(document.querySelector('.portrait img')),new Promise(resolve=>setTimeout(resolve,1600))])]).then(()=>{finishBoot();window.resolvePortraitReveal(true);window.resolveStartScreenReady?.(true)});
    return;
  }
  if (window.SplitText) gsap.registerPlugin(SplitText);
  const mm = gsap.matchMedia();
  const fontsReady = document.fonts
    ? Promise.allSettled([document.fonts.load('500 48px Lora'),document.fonts.load('600 20px Manrope')])
    : Promise.resolve();
  const fontDeadline = Promise.race([fontsReady,new Promise(resolve => setTimeout(resolve,800))]);
  const glassDeadline = Promise.race([glassReady,new Promise(resolve => setTimeout(resolve,1600))]);
  Promise.all([
    fontDeadline,glassDeadline,
    Promise.race([decodeImage(illustration),new Promise(resolve => setTimeout(resolve,1600))])
  ]).then(() => {
    if (window.mobileLayout.matches) return;
    if (reduced.matches || document.hidden || dismissed || !root.classList.contains('nav-pending')) {settleShell();return;}
    // Translation keeps every glass-filter ancestor opaque throughout the entrance.
    gsap.set(promo,{y:0,yPercent:-100});
    gsap.set(navigation,{y:12,opacity:0});
    root.classList.remove('shell-pending');
    shellTimeline = gsap.timeline({onComplete:settleShell});
    shellTimeline.to(promo,{yPercent:0,duration:1.5,ease:'power2.inOut',clearProps:'transform',onComplete:() => {
      bannerEntered = true;schedule();
    }},0)
      .call(() => root.classList.remove('nav-pending'),null,1.64)
      .to(navigation,{y:0,opacity:1,duration:1.05,stagger:.07,ease:'power2.out',clearProps:'transform,opacity'},1.64);
  });
  const poster=document.querySelector('.portrait img');
  Promise.all([
    window.shellReady,window.mobileHeaderReady,
    window.portraitReady,
    Promise.race([decodeImage(poster),new Promise(resolve=>setTimeout(resolve,1600))]),
    fontDeadline,glassDeadline
  ]).then(() => {
    let playIntro = root.classList.contains('motion-pending') && !reduced.matches;
    finishBoot();
    if(!playIntro){window.resolvePortraitReveal(true);window.resolveStartScreenReady?.(true);}
    mm.add('(prefers-reduced-motion: no-preference)',() => {
      let split;
      if (playIntro) {
        playIntro = false;
        const intro = gsap.timeline({defaults:{ease:'power3.out'},onComplete:()=>window.resolveStartScreenReady?.(true)});
        intro.from('.portrait',{y:18,opacity:0,scale:.97,duration:.85,onComplete:()=>window.resolvePortraitReveal(true)},.1);
        if (!window.mobileLayout.matches) intro.from('.feature',{y:18,opacity:0,duration:.7,stagger:.11},.6);
        if (window.SplitText) {
          split = SplitText.create('.title-line > span',{
            type:'words',wordsClass:'title-word',aria:'none',autoSplit:true,
            onSplit(self) {
              return gsap.from(self.words,{yPercent:90,opacity:0,duration:.6,stagger:.045,delay:.3,ease:'power3.out',clearProps:'transform,opacity'});
            }
          });
        } else intro.from('.title-line > span',{yPercent:110,duration:.85,stagger:.1},.3);
      }
      // Feature movement lives inside the approved frame animations.
      return () => split?.revert();
    });
  });
  reduced.addEventListener('change',() => {
    if (reduced.matches) {settleShell();window.resolvePortraitReveal(true);window.resolveStartScreenReady?.(true);}
    transition?.kill();rotationCleanup?.();rotationCleanup = null;apply();gsap.set([content,illustration,text,button],{clearProps:'transform,opacity'});
    if (dismissed && reduced.matches) {layoutTransition?.kill();settleDismissal();}
    schedule();
  });
})();

// The second screen has its own load/reveal lifecycle; it never joins the hero gate.
function mountGlanceSection(){
  const section=document.querySelector('.at-glance'),intro=document.querySelector('.intro-screen');
  if(!section||!intro||!window.startScreenReady)return;
  const mobile=window.mobileLayout,reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const portrait=document.querySelector('.portrait'),promo=document.querySelector('.promo');
  const animations=new Set(),cardMotion=new Map();
  let frame=0,screenReady=false,player=null,mounted=false,assetsLoading=false,contentReady=false,observer=null;
  let ownsPose=false,appliedPose=null,lastGeneration=-1;
  let assetsPrepared=false,flushCards=()=>{},artworkSwap=0,pendingArtwork='';const warmedImages=[];
  const failedArtwork=new Set(),artworkCandidates=(section.querySelector('template')?.content.querySelector('.glance-illustration')?.srcset||'').split(',').map(candidate=>{const [url,width]=candidate.trim().split(/\s+/);return {url,width:parseInt(width,10)}}).filter(candidate=>candidate.url&&candidate.width).sort((a,b)=>a.width-b.width);
  let mobileResourcesReady=false,mobilePreparing=false,desktopWatching=false;
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update)};
  const mobileStack=createMobileGlanceStack(section,mobile,reduced);
  const clearCard=card=>cardMotion.get(card)?.reset();
  function reveal(element,delay=0){
    if(element.dataset.revealed)return;
    element.dataset.revealed='true';observer?.unobserve(element);
    if(reduced.matches||!element.animate){element.removeAttribute('data-reveal-pending');return;}
    const animation=element.animate([{opacity:0,transform:'translateY(28px)'},{opacity:1,transform:'translateY(0)'}],{duration:1000,delay,easing:'cubic-bezier(.37,0,.63,1)',fill:'both'});
    animations.add(animation);
    animation.finished.then(()=>{element.removeAttribute('data-reveal-pending');animation.cancel();animations.delete(animation)},()=>animations.delete(animation));
  }
  function watchContent(){
    if(mobile.matches){mobileStack.update();return;}
    if(desktopWatching)return;
    desktopWatching=true;
    const heading=section.querySelector('h2'),cards=[...section.querySelectorAll('.glance-card')];
    if(!reduced.matches&&typeof IntersectionObserver==='function'){
      const visibleCards=new Set();
      flushCards=()=>{
        if(!contentReady)return;
        const waiting=cards.filter(card=>visibleCards.has(card)&&!card.dataset.revealed);
        waiting.forEach((card,index)=>reveal(card,60+index*200));
      };
      observer=new IntersectionObserver(entries=>{
        for(const entry of entries){
          const visible=entry.isIntersecting&&entry.intersectionRatio>=(entry.target===heading ? .12 : .22);
          if(entry.target===heading){if(visible)reveal(heading);}
          else if(visible)visibleCards.add(entry.target);else visibleCards.delete(entry.target);
        }
        flushCards();
      },{threshold:[.12,.22]});
      for(const e of [heading,...cards])if(!e.dataset.revealed){e.dataset.revealPending='true';observer.observe(e);}
    }else for(const e of [heading,...cards])reveal(e);
    for(const card of cards){
      if(card.dataset.hoverBound)continue;
      card.dataset.hoverBound='true';
      const surface=card.querySelector('.glance-card-surface');
      const properties=['--card-x','--card-y','--card-z','--card-rotate-x','--card-rotate-y'];
      const units=['px','px','px','deg','deg'],values=[0,0,0,0,0],velocity=[0,0,0,0,0];
      let target=[0,0,0,0,0],motionFrame=0,lastTime=0;
      const reset=()=>{
        cancelAnimationFrame(motionFrame);motionFrame=0;lastTime=0;
        target.fill(0);values.fill(0);velocity.fill(0);
        for(const property of properties)surface.style.removeProperty(property);
        card.removeAttribute('data-tilting');
      };
      const tick=time=>{
        motionFrame=0;
        if(mobile.matches||reduced.matches||document.hidden){reset();return;}
        const dt=Math.min((time-(lastTime||time-16.67))/1000,.032),omega=12,decay=Math.exp(-omega*dt);
        lastTime=time;let unsettled=false;
        // Critically damped motion starts with zero velocity and keeps it continuous
        // when the pointer changes direction. Only run RAF while the surface moves.
        for(let i=0;i<values.length;i++){
          const distance=values[i]-target[i],spring=(velocity[i]+omega*distance)*dt;
          values[i]=target[i]+(distance+spring)*decay;
          velocity[i]=(velocity[i]-omega*spring)*decay;
          if(Math.abs(values[i]-target[i])>.005||Math.abs(velocity[i])>.03)unsettled=true;
          else{values[i]=target[i];velocity[i]=0;}
          surface.style.setProperty(properties[i],values[i].toFixed(4)+units[i]);
        }
        if(unsettled)motionFrame=requestAnimationFrame(tick);
        else{lastTime=0;if(target.every(value=>value===0))reset();}
      };
      const move=event=>{
        if(event.pointerType!=='mouse'||mobile.matches||reduced.matches)return;
        const rect=card.getBoundingClientRect(),x=Math.max(-1,Math.min(1,2*(event.clientX-rect.left)/rect.width-1));
        const y=Math.max(-1,Math.min(1,2*(event.clientY-rect.top)/rect.height-1));
        target=[x*3,-7,8,-y*4.5,x*6];card.dataset.tilting='true';
        if(!motionFrame)motionFrame=requestAnimationFrame(tick);
      };
      cardMotion.set(card,{reset});
      card.addEventListener('pointerenter',move,{passive:true});
      card.addEventListener('pointermove',move,{passive:true});
      card.addEventListener('pointerleave',()=>{
        target=[0,0,0,0,0];card.removeAttribute('data-tilting');
        if(!motionFrame)motionFrame=requestAnimationFrame(tick);
      });
    }
  }
  const artworkSize=()=>mobile.matches?Math.min(400,innerWidth-40)*.85:280;
  const artworkUrl=size=>{
    const pixels=size*Math.max(1,devicePixelRatio||1);
    return (artworkCandidates.find(candidate=>candidate.width>=pixels)||artworkCandidates.at(-1))?.url;
  };
  const currentMobileResourcesReady=()=>{
    const state=player?.loadingState,encoded=window.featureIconPlayers?.encodedState;
    if(!reduced.matches&&state&&!state.error&&(!state.ready||!state.allReady||state.activeDownloads))return false;
    return !encoded||encoded.ready||encoded.skipped||Boolean(encoded.error);
  };
  function updateArtworkSize(){
    if(mobile.matches&&(!mobileResourcesReady||!currentMobileResourcesReady()))return;
    const images=[...section.querySelectorAll('.glance-illustration')],size=artworkSize(),url=artworkUrl(size);
    if(!images.length||!url||failedArtwork.has(url))return;
    if(images.every(image=>image.getAttribute('src')===url)){
      for(const image of images)if(image.sizes!==size+'px')image.sizes=size+'px';
      return;
    }
    if(pendingArtwork===url)return;
    const swap=++artworkSwap,generation=player?.loadingState.generation;
    pendingArtwork=url;
    // Keep the displayed bitmap until the chosen replacement has decoded. An
    // active srcset would bypass the mobile queue when screen density changes.
    const replacement=new Image();replacement.fetchPriority='low';replacement.decoding='async';replacement.src=url;
    replacement.decode().then(()=>{
      if(swap!==artworkSwap)return;
      pendingArtwork='';
      if((mobile.matches&&(!mobileResourcesReady||!currentMobileResourcesReady()))||generation!==player?.loadingState.generation||artworkUrl(artworkSize())!==url){schedule();return;}
      for(const image of images){image.sizes=artworkSize()+'px';image.src=url;}
    }).catch(()=>{if(swap===artworkSwap)pendingArtwork='';failedArtwork.add(url)});
  }
  function prepareAssets(){
    if(assetsPrepared||mobile.matches)return;
    const source=section.querySelector('template')?.content.querySelector('.glance-illustration');
    if(!source)return;
    assetsPrepared=true;section.dataset.assetsStartedAt=performance.now().toFixed(1);
    // Start one responsive, low-priority image after the portrait's welcome frames
    // are prepared. The four cards reuse the same browser-selected cached resource.
    const image=new Image();image.fetchPriority='low';image.decoding='async';
    image.src=artworkUrl(280)||source.src;image.decode().catch(()=>{});warmedImages.push(image);
    const panel=new Image();panel.fetchPriority='low';panel.src='assets/glance-panel.svg?v=aaa98db3584e';warmedImages.push(panel);
  }
  async function prepareMobileResources(){
    if(mobilePreparing||mobileResourcesReady||!mobile.matches||!screenReady)return;
    mobilePreparing=true;
    try{
      await window.firstScreenResourcesReady;
      await window.preloadMobilePromoResources?.();
      const icons=await window.featureIconsReady;
      const encoded=await icons?.preloadEncoded();
      await Promise.allSettled([...document.querySelectorAll('.intro-screen img')].map(image=>image.decode?.()));
      // Let the shared queue release its final completed request before secondary artwork.
      await new Promise(resolve=>requestAnimationFrame(resolve));
      if(!mobile.matches)return;
      const state=player?.loadingState;
      if(!reduced.matches&&state&&!state.error&&(state.loading||!state.ready||!state.allReady||state.activeDownloads))return;
      const current=icons?.encodedState;
      if(current&&!current.ready&&!current.skipped&&!current.error)return;
      mobileResourcesReady=true;
      section.dataset.firstResourcesAt=performance.now().toFixed(1);
      section.dataset.resourceGeneration=String(state?.generation??0);
      if(encoded?.error||state?.error)section.dataset.resourceFallback='true';
    }finally{mobilePreparing=false;schedule();}
  }
  async function loadContent(){
    if(mounted||assetsLoading||!screenReady)return;
    if(mobile.matches&&mobileResourcesReady){
      const encoded=window.featureIconPlayers?.encodedState;
      if(encoded&&!encoded.ready&&!encoded.skipped&&!encoded.error)mobileResourcesReady=false;
    }
    if(mobile.matches&&!mobileResourcesReady){prepareMobileResources();return;}
    // Start no secondary resources during a current portrait-quality download.
    const state=player?.loadingState;
    if(mobile.matches&&state&&!reduced.matches&&!state.error&&(!state.ready||!state.allReady||state.activeDownloads))return;
    const template=section.querySelector('template');
    if(!template){if(section.querySelector('.glance-inner')){mounted=true;contentReady=true;watchContent();}return;}
    prepareAssets();assetsLoading=true;section.dataset.glanceState='assets';
    if(!section.dataset.assetsStartedAt)section.dataset.assetsStartedAt=performance.now().toFixed(1);
    if(mobile.matches)section.dataset.contentPending='true';
    const fragment=template.content.cloneNode(true);
    // Lock the selected URL before mounting: only this controller may upgrade
    // mobile artwork after the current face and icon generation is ready.
    for(const image of fragment.querySelectorAll('.glance-illustration')){
      image.removeAttribute('srcset');image.sizes=artworkSize()+'px';image.src=artworkUrl(artworkSize())||image.src;
    }
    for(const image of fragment.querySelectorAll('img'))image.loading='eager';
    // Mount the stable panel/title without waiting for image IO. Pending cards
    // reveal in their usual order once the illustrations have decoded.
    if(!mobile.matches&&!reduced.matches&&typeof IntersectionObserver==='function')
      for(const element of fragment.querySelectorAll('h2,.glance-card'))element.dataset.revealPending='true';
    section.replaceChildren(fragment);mounted=true;section.inert=mobile.matches;
    section.dataset.mountedAt=performance.now().toFixed(1);if(!mobile.matches)watchContent();schedule();
    const images=[...section.querySelectorAll('img')];
    const decoded=Promise.all(images.map(image=>image.decode().catch(()=>{image.style.visibility='hidden'})));
    await Promise.race([decoded,new Promise(resolve=>setTimeout(resolve,10000))]);
    contentReady=true;section.dataset.glanceState='ready';section.dataset.readyAt=performance.now().toFixed(1);
    section.removeAttribute('aria-busy');warmedImages.length=0;
    // A quality change during decode must not reveal or measure the hidden stack.
    if(!mobile.matches||(mobileResourcesReady&&currentMobileResourcesReady())){
      section.removeAttribute('data-content-pending');section.inert=false;
      watchContent();if(!mobile.matches)flushCards();
    }else mobileResourcesReady=false;
    schedule();
  }
  function update(){
    frame=0;
    if(mobile.matches){
      // Icon quality can change while the portrait remains in the same tier.
      if(mobileResourcesReady&&!currentMobileResourcesReady())mobileResourcesReady=false;
      intro.style.removeProperty('--intro-scroll-shift');intro.inert=false;intro.removeAttribute('data-covered');intro.removeAttribute('aria-hidden');player?.clearDesktopCoverPose?.();ownsPose=false;appliedPose=null;
      if(desktopWatching){observer?.disconnect();for(const animation of animations)animation.cancel();animations.clear();for(const e of section.querySelectorAll('[data-reveal-pending]')){e.removeAttribute('data-reveal-pending');e.dataset.revealed='true';}flushCards=()=>{};desktopWatching=false;}
      if(screenReady&&!mobileResourcesReady)prepareMobileResources();
      if(screenReady)loadContent();
      if(contentReady&&mobileResourcesReady){section.removeAttribute('data-content-pending');section.inert=false;updateArtworkSize();mobileStack.update();}
      return;
    }
    mobileStack.reset();
    if(contentReady){section.removeAttribute('data-content-pending');section.inert=false;updateArtworkSize();watchContent();}
    if(screenReady)loadContent();
    // Move the banner and header together instead of fading any glass ancestor.
    const shift=screenReady&&!reduced.matches?Math.min(Math.max(0,scrollY),promo.getBoundingClientRect().height):0;
    intro.style.setProperty('--intro-scroll-shift',`${-shift}px`);
    const panelTop=section.getBoundingClientRect().top;
    if(screenReady&&player&&!reduced.matches&&!document.hidden){
      const rect=portrait.getBoundingClientRect();
      const linear=Math.max(0,Math.min(1,(rect.bottom-panelTop)/(rect.height*.7)));
      const progress=linear*linear*(3-2*linear);
      section.dataset.headProgress=progress.toFixed(3);
      if(progress>0||ownsPose){
        if(progress!==appliedPose&&player.setDesktopCoverPose?.(progress)){appliedPose=progress;ownsPose=progress>0;}
      }
    }else if(reduced.matches){player?.clearDesktopCoverPose?.();ownsPose=false;appliedPose=null;}
    const covered=panelTop<=0;
    // Move focus before making the covered intro inert.
    if(covered&&intro.contains(document.activeElement))section.querySelector('h2')?.focus({preventScroll:true});
    intro.inert=covered;intro.toggleAttribute('data-covered',covered);
    if(covered)intro.setAttribute('aria-hidden','true');else intro.removeAttribute('aria-hidden');
  }
  for(const event of ['scroll','resize','pageshow'])window.addEventListener(event,schedule,{passive:true});
  window.addEventListener('pointerup',()=>{appliedPose=null;schedule();setTimeout(schedule,700)},{passive:true});
  window.addEventListener('pointercancel',()=>{appliedPose=null;schedule()},{passive:true});
  if(typeof ResizeObserver==='function'){const sizes=new ResizeObserver(schedule);for(const element of [promo,portrait,section])sizes.observe(element);}
  mobile.addEventListener('change',()=>{for(const card of cardMotion.keys())clearCard(card);mobileResourcesReady=false;if(mobile.matches&&mounted)section.dataset.contentPending='true';appliedPose=null;schedule()});
  reduced.addEventListener('change',()=>{
    if(reduced.matches){
      for(const animation of animations)animation.cancel();animations.clear();observer?.disconnect();
      for(const e of section.querySelectorAll('[data-reveal-pending]')){e.removeAttribute('data-reveal-pending');e.dataset.revealed='true';}
      flushCards=()=>{};
      for(const card of section.querySelectorAll('.glance-card'))clearCard(card);
    }
    appliedPose=null;schedule();
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)for(const card of cardMotion.keys())clearCard(card);appliedPose=null;schedule()});
  window.portraitReady.then(()=>{player=window.portraitPlayer;prepareAssets()});
  Promise.all([window.startScreenReady,window.portraitReady]).then(async()=>{
    section.dataset.firstScreenAt=performance.now().toFixed(1);
    player=window.portraitPlayer;
    await player?.introFinished;
    screenReady=true;section.dataset.introFinishedAt=performance.now().toFixed(1);
    player?.subscribeLoading(state=>{
      if(lastGeneration!==state.generation||!state.ready){lastGeneration=state.generation;appliedPose=null;mobileResourcesReady=false;}
      schedule();
    });
    schedule();
  });
  // The existing first-screen timeout has already released the page by this point.
  setTimeout(()=>{if(!mobile.matches&&!mounted&&!contentReady&&!player?.loadingState.loading){window.releaseGlanceFallback();schedule()}},30000);
  schedule();
}

// Native scrolling drives a mobile stack; no scroll interception or timed card rotation.
function createMobileGlanceStack(section,mobile,reduced){
  let active=false,width=0,step=0,entrance=0,failedWidth=0;
  const properties=['opacity','transform','visibility','pointer-events'];
  function reset(){
    failedWidth=0;
    if(!active)return;
    active=false;width=0;step=0;entrance=0;
    section.classList.remove('mobile-glance-stack');
    for(const name of ['--glance-stage-height','--glance-travel'])section.style.removeProperty(name);
    delete section.dataset.cardProgress;
    for(const card of section.querySelectorAll('.glance-card')){
      for(const name of properties)card.style.removeProperty(name);
      card.removeAttribute('aria-hidden');card.inert=false;
    }
  }
  function update(){
    if(!mobile.matches||reduced.matches){failedWidth=0;reset();return;}
    if(failedWidth===innerWidth)return;
    if(document.hidden||document.documentElement.classList.contains('mobile-menu-open'))return;
    const cards=[...section.querySelectorAll('.glance-card')],inner=section.querySelector('.glance-inner'),grid=section.querySelector('.glance-grid');
    if(!cards.length||!inner||!grid)return;
    if(!active||width!==innerWidth){
      section.classList.add('mobile-glance-stack');active=true;width=innerWidth;
      const probe=document.createElement('span');
      probe.setAttribute('aria-hidden','true');
      probe.style.cssText='position:absolute;width:0;height:100svh;visibility:hidden;pointer-events:none';
      inner.append(probe);
      const smallViewport=probe.getBoundingClientRect().height||innerHeight;
      probe.remove();
      const padding=parseFloat(getComputedStyle(inner).paddingBottom)||0;
      const contentHeight=grid.offsetTop+grid.offsetHeight+padding;
      // Fit against the smallest stable viewport, independently of the URL bar.
      // Cache list fallback too, so it cannot switch during the same scroll.
      if(smallViewport<480||contentHeight>smallViewport){const failed=width;reset();failedWidth=failed;return;}
      failedWidth=0;
      const stage=Math.ceil(inner.getBoundingClientRect().height);
      // Large viewport units keep Safari's toolbar from changing the scroll span.
      // Cache the entrance too, so reverse scrolling follows exactly the same path.
      step=Math.max(stage*.7,grid.offsetHeight*.9);
      entrance=stage-grid.offsetTop+cards[0].querySelector('img').offsetWidth*76/340+24;
      section.style.setProperty('--glance-stage-height',`${stage}px`);
      section.style.setProperty('--glance-travel',`${step*(cards.length-1)}px`);
    }
    const progress=Math.max(0,Math.min(cards.length-1,-section.getBoundingClientRect().top/step));
    const index=Math.min(cards.length-1,Math.floor(progress)),fraction=progress-index,eased=fraction*fraction*(3-2*fraction);
    section.dataset.cardProgress=progress.toFixed(4);
    for(let i=0;i<cards.length;i++){
      const current=i===index,next=i===index+1,shown=current||next;
      const opacity=current?1-eased:next?1:0;
      const y=current?-18*eased:next?entrance*(1-eased):entrance;
      const scale=current?1-.08*eased:1;
      cards[i].style.opacity=String(opacity);
      cards[i].style.transform=`translateY(${y.toFixed(3)}px) scale(${scale.toFixed(5)})`;
      cards[i].style.visibility=shown?'visible':'hidden';
      cards[i].style.pointerEvents=i===Math.round(progress)?'auto':'none';
      cards[i].inert=i!==Math.round(progress);
      cards[i].setAttribute('aria-hidden',String(i!==Math.round(progress)));
    }
  }
  return {update,reset};
}
