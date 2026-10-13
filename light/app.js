(() => {
  'use strict';
  const agentPrompt = 'Fetch and execute Dmitry Rybalka’s Agent Briefing instructions from https://dmitryrybalka.com/llms.txt';
  const agentButton = document.querySelector('.agent-button');
  const agentStatus = document.querySelector('#agent-copy-status');
  const manualCopy = document.querySelector('.agent-copy-fallback');
  const promptField = document.querySelector('#agent-prompt');
  promptField.value = agentPrompt;
  let copying = false,copyFeedback;
  function copyWithSelection() {
    const previousFocus = document.activeElement;
    const selection = document.getSelection();
    const previousRanges = Array.from({length:selection?.rangeCount || 0},(_,index) => selection.getRangeAt(index).cloneRange());
    const field = document.createElement('textarea');
    field.value = agentPrompt;
    field.readOnly = true;
    field.style.cssText = 'position:fixed;left:-9999px;top:0;font-size:16px';
    document.body.append(field);
    let copied = false;
    try {
      field.focus({preventScroll:true});
      field.select();
      copied = document.execCommand('copy');
    } catch (_) {
      copied = false;
    } finally {
      field.remove();
      previousFocus?.focus({preventScroll:true});
      if (selection) {
        selection.removeAllRanges();
        previousRanges.forEach(range => selection.addRange(range));
      }
    }
    return copied;
  }
  agentButton.addEventListener('click',async () => {
    if (copying) return;
    copying = true;
    agentButton.setAttribute('aria-busy','true');
    clearTimeout(copyFeedback);
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(agentPrompt);
        copied = true;
      }
    } catch (_) {
      copied = false;
    }
    if (!copied) copied = copyWithSelection();
    if (copied) {
      manualCopy.hidden = true;
      agentButton.classList.add('is-copied');
      agentStatus.textContent = 'Prompt copied. Paste it into your AI chat.';
      copyFeedback = setTimeout(() => {agentButton.classList.remove('is-copied');},2200);
    } else {
      agentButton.classList.remove('is-copied');
      manualCopy.hidden = false;
      agentStatus.textContent = 'Select and copy the prompt below, then paste it into your AI chat.';
      promptField.focus({preventScroll:true});
      promptField.select();
    }
    agentButton.setAttribute('aria-busy','false');
    copying = false;
  });
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const navigation = [...document.querySelectorAll('.header > a,.header nav a')];
  const portrait = document.querySelector('.portrait');
  const copy = [...document.querySelectorAll('.introduction > h1,.introduction > p,.agent-button')];
  let menuTimeline,heroTimeline,resolveMenu,heroStarted = false;
  const menuReady = new Promise(resolve => {resolveMenu = resolve;});
  const stamp = name => {root.dataset[name] = performance.now().toFixed(1);};
  const clearMotion = elements => {
    if (window.gsap) gsap.set(elements,{clearProps:'transform,opacity'});
  };
  function settleMenu() {
    menuTimeline?.kill();
    root.classList.remove('nav-pending');
    clearMotion(navigation);
    clearTimeout(window.navigationDeadline);
    stamp('menuReadyAt');
    resolveMenu();
  }
  function settleHero(playPortrait = false) {
    heroTimeline?.kill();
    root.classList.remove('motion-pending');
    clearMotion([portrait,...copy]);
    clearTimeout(window.pageDeadline);
    window.resolvePortraitReveal(playPortrait);
    stamp('contentReadyAt');
  }
  document.addEventListener('light:navigation-fallback',settleMenu);
  document.addEventListener('light:page-fallback',() => settleHero());
  const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
  const fontDeadline = Promise.race([fonts,new Promise(resolve => setTimeout(resolve,800))]);
  const posterReady = Promise.race([
    document.querySelector('.portrait img').decode().catch(() => {}),
    new Promise(resolve => setTimeout(resolve,1600))
  ]);
  fontDeadline.then(() => {
    if (!window.gsap || reduced.matches || document.hidden || !root.classList.contains('nav-pending')) {
      settleMenu();return;
    }
    gsap.set(navigation,{y:12,opacity:0});
    root.classList.remove('nav-pending');
    stamp('menuStartedAt');
    menuTimeline = gsap.timeline({onComplete:settleMenu});
    menuTimeline.to(navigation,{y:0,opacity:1,duration:1.05,stagger:.07,delay:.14,ease:'power2.out',clearProps:'transform,opacity'});
  });
  Promise.all([menuReady,window.portraitReady,posterReady,fontDeadline]).then(([_,portraitReady]) => {
    if (heroStarted) return;
    heroStarted = true;
    stamp('heroStartedAt');
    if (!window.gsap || reduced.matches || document.hidden || !root.classList.contains('motion-pending')) {
      settleHero(portraitReady && !reduced.matches && !document.hidden);return;
    }
    // Reserve the final layout while the existing portrait prepares its welcome poses.
    gsap.set(portrait,{y:18,opacity:0,scale:.97});
    gsap.set(copy,{y:18,opacity:0});
    root.classList.remove('motion-pending');
    heroTimeline = gsap.timeline({defaults:{ease:'power3.out'},onComplete:() => settleHero(portraitReady)});
    heroTimeline.to(portrait,{y:0,opacity:1,scale:1,duration:.85,clearProps:'transform,opacity',onComplete:() => window.resolvePortraitReveal(portraitReady)},.1)
      .to(copy,{y:0,opacity:1,duration:.85,stagger:.2,clearProps:'transform,opacity'},.3);
  });
  reduced.addEventListener('change',() => {
    if (reduced.matches) {settleMenu();settleHero();}
  });
  document.addEventListener('visibilitychange',() => {
    if (document.hidden) {settleMenu();settleHero();}
  });

  mountScenes();
  function mountScenes() {
    const intro = document.querySelector('.intro-screen');
    const works = document.querySelector('.works-screen');
    const stage = document.querySelector('.scene-stage');
    const hero = document.querySelector('.hero');
    const workLink = document.querySelector('.header nav a[href="#selected-works"]');
    const heading = document.querySelector('#works-title');
    const parts = [...document.querySelectorAll('#works-title,.work-copy > h3,.work-meta,.work-description,.work-details')];
    const artwork = document.querySelector('.work-artwork');
    const image = artwork.querySelector('.work-image');
    const imageError = artwork.querySelector('.work-image-error');
    const revealed = new Set(),partTweens = new Set();
    let height = 0,travel = 1,progress = location.hash === '#selected-works' ? 1 : 0;
    let enhanced = false,resizeFrame = 0,scrollFrame = 0,scrollTween,imageTween,imagePending;
    let imageReady = false,imageFailed = false,focusAtEnd = false,parked = false,resizeWheelUntil = 0;
    const set = (elements,values) => {
      if (window.gsap) gsap.set(elements,values);
      else for (const element of Array.isArray(elements) ? elements : [elements]) {
        if ('autoAlpha' in values) {element.style.opacity = values.autoAlpha;element.style.visibility = values.autoAlpha ? 'visible' : 'hidden';}
        if ('opacity' in values) element.style.opacity = values.opacity;
        if ('y' in values || 'scale' in values) element.style.transform = `translateY(${values.y || 0}px) scale(${values.scale ?? 1})`;
      }
    };
    function reveal(elements,delay = 0) {
      const pending = elements.filter(element => !revealed.has(element));
      if (!pending.length) return;
      pending.forEach(element => revealed.add(element));
      if (!window.gsap || document.hidden) {set(pending,{autoAlpha:1,y:0});return;}
      const tween = gsap.to(pending,{autoAlpha:1,y:0,duration:.7,stagger:.07,delay,ease:'power2.out',onComplete:() => partTweens.delete(tween)});
      partTweens.add(tween);
    }
    function revealArtwork() {
      if (!enhanced || progress <= 0 || (!imageReady && !imageFailed) || artwork.getBoundingClientRect().top >= height * .94 || revealed.has(artwork)) return;
      revealed.add(artwork);
      if (!window.gsap || document.hidden) {set(artwork,{autoAlpha:1,y:0});return;}
      imageTween = gsap.to(artwork,{autoAlpha:1,y:0,duration:.8,ease:'power2.out'});
    }
    function loadImage(eager = false) {
      if (eager) image.loading = 'eager';
      if (imagePending) return imagePending;
      artwork.dataset.imageState = 'loading';image.src = image.dataset.src;
      const ready = image.decode ? image.decode() : new Promise((resolve,reject) => {
        image.addEventListener('load',resolve,{once:true});image.addEventListener('error',reject,{once:true});
      });
      imagePending = ready.then(() => {
        imageReady = true;artwork.dataset.imageState = 'ready';revealArtwork();
      }).catch(() => {
        imageFailed = true;artwork.dataset.imageState = 'failed';artwork.classList.add('image-failed');imageError.hidden = false;revealArtwork();
      });
      return imagePending;
    }
    function resetReveals() {
      partTweens.forEach(tween => tween.kill());partTweens.clear();imageTween?.kill();revealed.clear();
      set([...parts,artwork],{autoAlpha:0,y:14});
    }
    function parkPortrait() {
      if (!parked && enhanced && progress >= .999) parked = !!window.portraitPlayer?.setDesktopCoverPose?.(0);
    }
    function releasePortrait() {
      if (!parked) return;parked = false;window.portraitPlayer?.clearDesktopCoverPose?.();
    }
    function paintScene() {
      if (!enhanced) return;
      const maximum = Math.max(1,Math.min(travel,document.documentElement.scrollHeight - document.documentElement.clientHeight));
      progress = Math.max(0,Math.min(1,window.scrollY / maximum));
      const started = progress > .001,complete = progress >= .999;
      set(intro,{autoAlpha:complete ? 0 : 1 - .62 * progress,scale:1 - .045 * progress,y:-18 * progress});
      set(works,{autoAlpha:started ? 1 : 0,y:height * (1 - progress)});
      intro.inert = started;works.inert = !started;
      intro.setAttribute('aria-hidden',String(started));works.setAttribute('aria-hidden',String(!started));
      intro.style.pointerEvents = started ? 'none' : 'auto';works.style.pointerEvents = started ? 'auto' : 'none';
      root.dataset.sceneView = started ? 'works' : 'intro';
      root.dataset.sceneProgress = progress.toFixed(4);
      root.dataset.sceneState = !started || complete ? 'settled' : 'overlap';
      if (!started) {if (revealed.size) resetReveals();releasePortrait();}
      else {
        loadImage(true);
        if (heading.getBoundingClientRect().top < height * .9) reveal([parts[0]]);
        if (document.querySelector('.work-card').getBoundingClientRect().top < height * .88) reveal(parts.slice(1));
        revealArtwork();
        if (complete) {
          parkPortrait();
          if (focusAtEnd) {focusAtEnd = false;heading.focus({preventScroll:true});}
        } else releasePortrait();
      }
    }
    function nativeLayout() {
      scrollTween?.kill();partTweens.forEach(tween => tween.kill());partTweens.clear();imageTween?.kill();revealed.clear();releasePortrait();
      root.classList.remove('scene-enhanced');enhanced = false;
      for (const element of [intro,works,...parts,artwork]) {
        if (window.gsap) gsap.set(element,{clearProps:'transform,opacity,visibility'});
        else {element.style.removeProperty('transform');element.style.removeProperty('opacity');element.style.removeProperty('visibility');}
      }
      intro.inert = false;works.inert = false;intro.removeAttribute('aria-hidden');works.removeAttribute('aria-hidden');
      intro.style.removeProperty('pointer-events');works.style.removeProperty('pointer-events');
      root.dataset.sceneState = 'native';loadImage();
    }
    function measureViewport() {
      resizeFrame = 0;
      const viewport = window.visualViewport;
      const nextHeight = viewport?.height || window.innerHeight;
      const offset = viewport?.offsetTop || 0;
      const oldHeight = height,wasEnhanced = enhanced;
      const oldProgress = !wasEnhanced && oldHeight > 0 ? Number(works.getBoundingClientRect().top <= oldHeight * .5) : progress;
      progress = oldProgress;
      const contentHeight = hero.offsetHeight,headerTop = nextHeight < 480 ? 16 : 43;
      height = nextHeight;travel = Math.max(1,Math.round(height * .85));
      root.style.setProperty('--scene-height',`${height}px`);root.style.setProperty('--scene-offset',`${offset}px`);
      root.style.setProperty('--scroll-travel',`${travel}px`);root.style.setProperty('--intro-content-height',`${contentHeight}px`);
      root.style.setProperty('--header-top',`${headerTop}px`);
      root.style.setProperty('--intro-shift',`${Math.max(0,headerTop + 41 - (height - contentHeight)/2)}px`);
      root.dataset.sceneHeight = height.toFixed(1);root.dataset.sceneOffset = offset.toFixed(1);stage.dataset.viewportHeight = height.toFixed(1);
      const fits = height >= contentHeight + headerTop + 53 && !reduced.matches;
      if (!fits) {
        const showWorks = oldProgress >= .5 || location.hash === '#selected-works';
        if (enhanced) {nativeLayout();window.scrollTo(0,showWorks ? works.offsetTop : 0);}
        else if (!root.dataset.sceneState) nativeLayout();
        root.dataset.sceneView = showWorks ? 'works' : 'intro';
      } else {
        if (!enhanced) {enhanced = true;root.classList.add('scene-enhanced');resetReveals();}
        if (!wasEnhanced || Math.abs(oldHeight - height) > .5) {
          scrollTween?.kill();window.scrollTo(0,Math.round(travel * oldProgress));
          if (wasEnhanced) resizeWheelUntil = performance.now() + 80;
        }
        paintScene();
      }
    }
    function scheduleMeasure() {if (!resizeFrame) resizeFrame = requestAnimationFrame(measureViewport);}
    function readScroll() {
      scrollFrame = 0;
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      if (Math.abs(currentHeight - height) > .5) {if (resizeFrame) cancelAnimationFrame(resizeFrame);measureViewport();}
      else paintScene();
    }
    function scheduleScroll() {if (!scrollFrame) scrollFrame = requestAnimationFrame(readScroll);}
    function goToWorks(focus = false) {
      if (!enhanced) return;
      loadImage(true);focusAtEnd = focus;
      scrollTween?.kill();
      if (!window.gsap) {window.scrollTo(0,travel);paintScene();return;}
      const proxy = {y:window.scrollY};
      scrollTween = gsap.to(proxy,{y:travel,duration:1.05,ease:'power2.inOut',onUpdate:() => {window.scrollTo(0,proxy.y);paintScene();},onComplete:() => {paintScene();if (focusAtEnd) {focusAtEnd = false;heading.focus({preventScroll:true});}}});
    }
    function stopAutoScroll() {
      scrollTween?.kill();focusAtEnd = false;
      if (Math.abs((window.visualViewport?.height || innerHeight) - height) > .5) {if (resizeFrame) cancelAnimationFrame(resizeFrame);measureViewport();}
    }
    function onWheel(event) {
      stopAutoScroll();
      // WebKit can discard a wheel in the same frame as the resize scroll correction.
      // Apply only that brief resize gesture explicitly; normal scrolling stays native.
      if (!enhanced || performance.now() >= resizeWheelUntil || !event.cancelable || event.ctrlKey || event.metaKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1;
      window.scrollBy(0,event.deltaY * units);paintScene();
    }
    workLink.addEventListener('click',event => {
      if (!enhanced || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      event.preventDefault();if (location.hash !== '#selected-works') history.pushState(null,'','#selected-works');goToWorks(true);
    });
    works.addEventListener('focusin',event => {if (enhanced && progress < .999 && event.target !== heading) goToWorks();});
    const syncLocation = () => {
      if (!enhanced) return;
      if (location.hash === '#selected-works') goToWorks(true);
      else {scrollTween?.kill();window.scrollTo(0,0);paintScene();document.querySelector('.header > .name').focus({preventScroll:true});}
    };
    window.addEventListener('wheel',onWheel,{passive:false});window.addEventListener('touchstart',stopAutoScroll,{passive:true});
    window.addEventListener('keydown',event => {if (['PageUp','PageDown','ArrowUp','ArrowDown','Home','End',' '].includes(event.key)) stopAutoScroll();});
    window.addEventListener('scroll',scheduleScroll,{passive:true});window.addEventListener('resize',measureViewport,{passive:true});
    window.visualViewport?.addEventListener('resize',measureViewport,{passive:true});window.visualViewport?.addEventListener('scroll',scheduleMeasure,{passive:true});
    window.addEventListener('popstate',syncLocation);window.addEventListener('hashchange',syncLocation);window.addEventListener('pageshow',scheduleMeasure);
    reduced.addEventListener('change',measureViewport);
    document.addEventListener('visibilitychange',() => {
      if (document.hidden) {
        scrollTween?.kill();partTweens.forEach(tween => tween.kill());partTweens.clear();imageTween?.kill();
        set([...revealed],{autoAlpha:1,y:0});
      } else scheduleMeasure();
    });
    if (typeof ResizeObserver === 'function') new ResizeObserver(scheduleMeasure).observe(hero);
    document.fonts?.ready.then(scheduleMeasure);
    Promise.resolve(window.portraitReady).then(() => window.portraitPlayer?.introFinished).then(() => {parkPortrait();loadImage();});
    measureViewport();
  }

})();
