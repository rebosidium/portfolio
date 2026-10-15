(() => {
  'use strict';
  /* shared:controls:start */
  const agentPrompt = 'Fetch and execute Dmitry Rybalka’s Agent Briefing instructions from https://dmitryrybalka.com/llms.txt';
  const agentButtons = [...document.querySelectorAll('.agent-button')];
  const agentIconReadiness = new WeakMap();
  function prepareAgentIcons(button) {
    if (agentIconReadiness.has(button)) return agentIconReadiness.get(button);
    // Decode the actual mounted SVGs, including the hidden Copied check. The
    // same fingerprinted URLs also warm the browser's ordinary image cache.
    const images = [...button.querySelectorAll('img')];
    const ready = Promise.allSettled(images.map(image => {
      image.loading = 'eager';
      return image.decode();
    })).then(() => {
      button.dataset.agentIconsReady = String(images.every(image => image.complete && image.naturalWidth > 0));
    });
    agentIconReadiness.set(button,ready);
    return ready;
  }
  for (const button of agentButtons) {
    if (button.dataset.agentTheme === 'dark' && window.portraitReveal) {
      // HOME keeps the approved portrait's first-screen priority. Warm the
      // footer well before it scrolls into view, without awaiting it in hero.
      Promise.resolve(window.portraitReveal).then(() => prepareAgentIcons(button));
    } else prepareAgentIcons(button);
  }
  agentButtons.forEach(mountAgentCopy);
  function mountAgentCopy(agentButton) {
    const control = agentButton.closest('[data-agent-control]');
    const agentStatus = control.querySelector('[role="status"]');
    const manualCopy = control.querySelector('.agent-copy-fallback');
    const promptField = manualCopy.querySelector('textarea');
    promptField.value = agentPrompt;
    let promptWidth = 0;
    function fitManualPrompt() {
      if (manualCopy.hidden) return;
      promptWidth = promptField.clientWidth;
      promptField.style.removeProperty('height');
      const style = getComputedStyle(promptField);
      const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
      promptField.style.height = Math.max(parseFloat(style.minHeight),promptField.scrollHeight + border) + 'px';
    }
    function syncManualCopy() {
      control.classList.toggle('is-manual-copy',!manualCopy.hidden);
      if (manualCopy.hidden) promptField.style.removeProperty('height');
      else fitManualPrompt();
    }
    new MutationObserver(syncManualCopy).observe(manualCopy,{attributes:true,attributeFilter:['hidden']});
    if (typeof ResizeObserver === 'function') new ResizeObserver(() => {
      if (!manualCopy.hidden && promptField.clientWidth !== promptWidth) fitManualPrompt();
    }).observe(promptField);
    else window.addEventListener('resize',fitManualPrompt);
    document.fonts?.ready.then(fitManualPrompt);
    syncManualCopy();
    let copying = false,copyFeedback,copyGeneration = 0;
    // The component showcase changes state on the mounted control. Invalidate
    // older real copy work without remounting its production event handlers.
    agentButton.addEventListener('portfolio:agent-preview-reset',() => {
      copyGeneration++;
      clearTimeout(copyFeedback);
      copying = false;
      agentButton.setAttribute('aria-busy','false');
      agentButton.classList.remove('is-copied');
      manualCopy.hidden = true;
      agentStatus.textContent = 'Copies a prompt to paste into your AI chat.';
    });
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
      const generation = ++copyGeneration;
      copying = true;
      agentButton.setAttribute('aria-busy','true');
      clearTimeout(copyFeedback);
      prepareAgentIcons(agentButton);
      let copied = false;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(agentPrompt);
          copied = true;
        }
      } catch (_) {
        copied = false;
      }
      if (generation !== copyGeneration) return;
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
        if(control.closest('.footer'))promptField.scrollIntoView({block:'nearest',inline:'nearest'});
      }
      agentButton.setAttribute('aria-busy','false');
      copying = false;
    });
  }
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.mobileLayout;
  agentButtons.forEach(mountAgentIconMotion);
  function mountAgentIconMotion(agentButton) {
    // Move direct children so Copilot travels with its clipping wrapper.
    const icons = [...agentButton.querySelector('.agent-button-logos').children];
    if (!icons.length || icons.some(icon => typeof icon.animate !== 'function')) return;
    const hoverPointer = matchMedia('(hover: hover) and (pointer: fine)');
    const ease = 'cubic-bezier(.37,0,.63,1)';
    let animations = [],hovering = false,waving = false;
    const canHover = () => hovering && hoverPointer.matches && !mobile.matches && !reduced.matches && !document.hidden;
    const poses = () => icons.map(icon => {
      const transform = getComputedStyle(icon).transform;
      return transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m42;
    });
    // Ease each half of the motion to turn smoothly at the peak and baseline.
    const frame = y => ({transform:`translateY(${y}px)`,easing:ease});
    function cancelMotion() {
      animations.forEach(animation => animation.cancel());
      animations = [];
    }
    function whenFinished(current,callback) {
      Promise.all(current.map(animation => animation.finished)).then(() => {
        if (animations !== current) return;
        cancelMotion();callback();
      }).catch(() => {}); // Cancellation on preference/visibility changes is expected.
    }
    function startHover() {
      if (!canHover() || waving || animations.length) return;
      animations = icons.map((icon,index) => icon.animate([frame(0),frame(-2),frame(0)],{
        duration:2400,delay:index * 140,iterations:Infinity
      }));
    }
    function settleHover() {
      if (waving || !animations.length) return;
      const from = poses();
      cancelMotion();
      animations = icons.map((icon,index) => icon.animate([frame(from[index]),frame(0)],{
        duration:240
      }));
      whenFinished(animations,startHover);
    }
    function playWave() {
      if (waving || reduced.matches || document.hidden) return;
      const from = poses();
      cancelMotion();waving = true;
      // Preserve each current hover pose through its delay; repeated clicks keep
      // the same wave alive while the independent copy handler runs normally.
      animations = icons.map((icon,index) => icon.animate([frame(from[index]),frame(-9),frame(0)],{
        duration:500,delay:index * 70,fill:'both'
      }));
      whenFinished(animations,() => {waving = false;startHover();});
    }
    agentButton.addEventListener('portfolio:agent-preview-reset',() => {
      cancelMotion();waving = false;hovering = false;
    });
    agentButton.addEventListener('pointerenter',event => {
      if (event.pointerType === 'touch') return;
      hovering = true;startHover();
    });
    agentButton.addEventListener('pointerleave',() => {hovering = false;settleHover();});
    agentButton.addEventListener('pointerdown',event => {
      if (event.pointerType === 'touch') {hovering = false;settleHover();}
    });
    agentButton.addEventListener('click',playWave);
    const syncHover = () => {if (canHover()) startHover();else settleHover();};
    hoverPointer.addEventListener('change',syncHover);
    mobile.addEventListener('change',syncHover);
    reduced.addEventListener('change',() => {
      if (reduced.matches) {cancelMotion();waving = false;}
      else startHover();
    });
    document.addEventListener('visibilitychange',() => {
      if (document.hidden) {cancelMotion();waving = false;}
      else {hovering = hovering && agentButton.matches(':hover');startHover();}
    });
  }
  /* shared:controls:end */
  const agentButton = document.querySelector('.introduction .agent-button');
  const navigation = mobile.matches
    ? [...document.querySelectorAll('.header > .identity,.menu-toggle')]
    : [...document.querySelectorAll('.header > a,.header nav a:not(.mobile-only)')];
  const portrait = document.querySelector('.portrait');
  const copy = [...document.querySelectorAll('.introduction > h1,.introduction > p,.introduction .agent-button')];
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
  document.addEventListener('mobile:navigation-fallback',settleMenu);
  document.addEventListener('mobile:page-fallback',() => settleHero());
  const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
  const fontDeadline = Promise.race([fonts,new Promise(resolve => setTimeout(resolve,800))]);
  const posterReady = Promise.race([
    document.querySelector('.portrait img').decode().catch(() => {}),
    new Promise(resolve => setTimeout(resolve,1600))
  ]);
  Promise.all([fontDeadline,mobile.matches ? window.mobileNavigationReady : Promise.resolve()]).then(() => {
    if (!window.gsap || reduced.matches || document.hidden || !root.classList.contains('nav-pending')) {
      settleMenu();return;
    }
    gsap.set(navigation,{y:12,opacity:0});
    root.classList.remove('nav-pending');
    stamp('menuStartedAt');
    menuTimeline = gsap.timeline({onComplete:settleMenu});
    menuTimeline.to(navigation,{y:0,opacity:1,duration:1.05,stagger:.07,delay:.14,ease:'power2.out',clearProps:'transform,opacity'});
  });
  // Desktop reveals the small first-frame image and copy before the turn buffer.
  // The boot module still waits for both the reveal and prepared welcome frames.
  const heroPortraitReady = mobile.matches ? window.portraitReady : Promise.resolve(true);
  Promise.all([menuReady,heroPortraitReady,posterReady,fontDeadline]).then(async ([_,portraitReady]) => {
    // A window resized into mobile before its entrance keeps the mobile gate.
    if (mobile.matches) portraitReady = await window.portraitReady;
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
    const footer = document.querySelector('.footer');
    // Read the shared pose values once after styles are available. Scroll paint
    // only uses numbers; changing the token source takes effect on the next load.
    const footerStyle = getComputedStyle(footer);
    const poseNumber = (name,fallback) => {
      const value = parseFloat(footerStyle.getPropertyValue(name));
      return Number.isFinite(value) ? value : fallback;
    };
    const footerRadius = poseNumber('--radius-panel',40);
    const overlapRecede = poseNumber('--overlap-recede',.025);
    const flattenStart = poseNumber('--overlap-flatten-start',.75);
    const footerTitle = footer.querySelector('h2');
    const stage = document.querySelector('.scene-stage');
    const flow = document.querySelector('.scene-flow');
    const hero = document.querySelector('.hero');
    const workLink = document.querySelector('.header nav a[href="#selected-works"]');
    const heading = document.querySelector('#works-title');
    const workCard = document.querySelector('.work-card');
    const panels = [...document.querySelectorAll('.works-screen')].map(element => ({
      element,card:element.querySelector('.work-card'),
      parts:[...element.querySelectorAll('h2,.work-heading > h3,.work-meta,.work-description,.work-details,.work-actions')].filter(part=>!part.matches('.work-details') || !part.closest('.work-actions')),
      actions:element.querySelector('.work-actions'),focusTarget:element.querySelector('h2,h3'),
      artwork:element.querySelector('.work-artwork'),image:element.querySelector('.work-image'),
      imageError:element.querySelector('.work-image-error'),imageReady:false,imageFailed:false,imagePending:null,imageTween:null,artworkStartedAt:0,descriptionStartedAt:0,start:0,height:0
    }));
    // Keep the final surface above every work layer as the portfolio grows.
    footer.style.setProperty('--footer-layer',String(panels.length+2));
    const parts = panels.flatMap(panel => panel.parts);
    let resolveFirstPreview;
    const firstPreviewReady = new Promise(resolve => {resolveFirstPreview = resolve;});
    if (!mobile.matches) window.deferSiteUpdates(firstPreviewReady);
    // Touch browser toolbars and rubberbanding change visualViewport during a
    // gesture, including wide tablets using the desktop layout. Keep their scene
    // geometry stable; actual window/orientation changes still update the probe.
    const touchViewport = matchMedia('(pointer: coarse)');
    const stableViewport = () => mobile.matches || touchViewport.matches;
    const viewportProbe = document.createElement('div');
    viewportProbe.className = 'scene-viewport-probe';
    viewportProbe.setAttribute('aria-hidden','true');
    viewportProbe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100svh;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom);visibility:hidden;pointer-events:none;contain:strict';
    document.body.append(viewportProbe);
    const workViewportProbe = document.createElement('div');
    workViewportProbe.className = 'work-viewport-probe';
    workViewportProbe.setAttribute('aria-hidden','true');
    workViewportProbe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:var(--work-screen-height,100lvh);visibility:hidden;pointer-events:none;contain:strict';
    document.body.append(workViewportProbe);
    const sceneHeight = () => stableViewport() ? viewportProbe.getBoundingClientRect().height || window.innerHeight : window.visualViewport?.height || window.innerHeight;
    const sceneOffset = () => stableViewport() ? 0 : window.visualViewport?.offsetTop || 0;
    const revealed = new Set(),partTweens = new Set();
    let height = 0,workHeight = 0,travel = 1,footerStart = 0,progress = location.hash === '#selected-works' ? 1 : 0;
    let enhanced = false,mobileOverlap = false,mobileStart = 0,mobileTravel = 1,mobileRecedeStart = 0,resizeFrame = 0,scrollFrame = 0,scrollTween;
    let viewportOffset = 0,viewportWidth = window.innerWidth,mobilePaintedY = window.scrollY,desktopPaintedY = window.scrollY,initialLocationHandled = false,nativePaintedPose = null,pendingMobileWorkStep = null;
    let focusAtEnd = false,parked = false,resizeWheelUntil = 0,portraitIntroFinished = false,portraitPrepared = false;
    const set = (elements,values) => {
      if (window.gsap) gsap.set(elements,values);
      else for (const element of Array.isArray(elements) ? elements : [elements]) {
        if ('autoAlpha' in values) {element.style.opacity = values.autoAlpha;element.style.visibility = values.autoAlpha ? 'visible' : 'hidden';}
        if ('opacity' in values) element.style.opacity = values.opacity;
        if ('y' in values || 'scale' in values) element.style.transform = `translateY(${values.y || 0}px) scale(${values.scale ?? 1})`;
      }
    };
    function focusWhenReady() {
      if (!focusAtEnd || scrollTween?.isActive()) return;
      const target=focusAtEnd===true ? heading : focusAtEnd;
      if (getComputedStyle(target).visibility==='hidden' || +getComputedStyle(target).opacity<.99 || target.closest('.works-screen,.footer')?.inert) return;
      focusAtEnd=false;target.focus({preventScroll:true});
    }
    function syncAvailability() {
      const viewport=window.visualViewport,top=viewport?.offsetTop||0,bottom=top+(viewport?.height||height);
      panels.forEach(panel=>{
        if (!panel.actions) return;
        const rect=panel.actions.getBoundingClientRect();
        panel.element.dataset.pulseVisible=String(!document.hidden && !panel.element.inert && rect.bottom>top && rect.top<bottom);
      });
    }
    if (typeof IntersectionObserver==='function') {
      const observer=new IntersectionObserver(syncAvailability);
      panels.forEach(panel=>{if(panel.actions)observer.observe(panel.actions);});
    }
    function reveal(elements,delay = 0) {
      const pending = elements.filter(element => !revealed.has(element));
      if (!pending.length) return;
      pending.forEach(element => revealed.add(element));
      if (!window.gsap || document.hidden) {set(pending,{autoAlpha:1,y:0});return;}
      const tween = gsap.to(pending,{autoAlpha:1,y:0,duration:.7,stagger:.07,delay,ease:'power2.out',onComplete:() => {partTweens.delete(tween);focusWhenReady();if(mobileOverlap)scheduleScroll();}});
      partTweens.add(tween);
    }
    function revealArtwork(panel = panels[0]) {
      const {artwork,imageReady,imageFailed} = panel;
      if ((!enhanced && !mobileOverlap) || panel.element.inert || (!imageReady && !imageFailed) || revealed.has(artwork)) return;
      const bounds = artwork.getBoundingClientRect();
      if (mobileOverlap) {
        if (document.hidden || root.classList.contains('mobile-menu-open')) return;
        const viewport = window.visualViewport;
        const top = viewport?.offsetTop || 0,bottom = top + (viewport?.height || height);
        // A direct link/fast gesture may leave only the trailing edge above the
        // copy. Restore that passed image so its visibility gate cannot stall text.
        const threshold = Math.min(bounds.height * .12,48);
        if (bounds.top<top && bounds.bottom<=top+threshold) {revealed.add(artwork);panel.artworkStartedAt=performance.now()-1150;set(artwork,{autoAlpha:1,y:0});return;}
        const visible = Math.min(bounds.bottom,bottom) - Math.max(bounds.top,top);
        if (visible < threshold) return;
      } else if (bounds.top >= height * .94) return;
      revealed.add(artwork);
      panel.artworkStartedAt = performance.now();
      if (!window.gsap || document.hidden) {set(artwork,{autoAlpha:1,y:0});return;}
      panel.imageTween = gsap.to(artwork,{autoAlpha:1,y:0,duration:mobileOverlap ? 1.15 : .8,ease:mobileOverlap ? 'sine.inOut' : 'power2.out'});
    }
    function loadImage(eager = false,panel = panels[0],priority = eager ? 'high' : 'low') {
      const {artwork,image,imageError} = panel;
      if (!image) {
        panel.imageReady = true;artwork.dataset.imageState = 'placeholder';revealArtwork(panel);
        return panel.imagePending ||= Promise.resolve();
      }
      if (eager) image.loading = 'eager';
      // Warm desktop previews independently of the portrait. When their card
      // enters view, promote even an already pending request before returning.
      if (!mobile.matches && (eager || !panel.imagePending)) image.fetchPriority = priority;
      if (panel.imagePending) return panel.imagePending;
      artwork.dataset.imageState = 'loading';
      const loaded = new Promise((resolve,reject) => {
        const clear = () => {image.removeEventListener('load',onLoad);image.removeEventListener('error',onError);};
        const onLoad = () => {clear();resolve();};
        const onError = () => {clear();reject(new Error('Work preview unavailable'));};
        image.addEventListener('load',onLoad);image.addEventListener('error',onError);
        if (image.dataset.srcset) image.srcset=image.dataset.srcset;
        image.src=image.dataset.src;
        if (image.complete && image.naturalWidth>0) onLoad();
      });
      // WebKit may reject decode() before a lazy image starts its request. Decode
      // after the real load event; keep a successfully loaded preview on decode-only errors.
      const ready = loaded.then(()=>image.decode?.().catch(error=>{if (!image.naturalWidth) throw error;}));
      panel.imagePending = ready.then(() => {
        panel.imageReady = true;artwork.dataset.imageState = 'ready';revealArtwork(panel);scheduleScroll();
      }).catch(() => {
        panel.imageFailed = true;artwork.dataset.imageState = 'failed';artwork.classList.add('image-failed');imageError.hidden = false;revealArtwork(panel);scheduleScroll();
      });
      if (panel === panels[0]) panel.imagePending.then(resolveFirstPreview);
      return panel.imagePending;
    }
    function warmDesktopPreviews() {
      if (mobile.matches || !portraitPrepared || document.hidden) return;
      // Background screenshots yield to the complete welcome-frame buffer.
      // A visible card or an explicit Work action still loads immediately.
      if (!enhanced && !mobileOverlap) panels.forEach((panel,index)=>loadImage(index===0,panel,'low'));
      else if (!panels[0].imagePending) loadImage(true,panels[0],'low');
    }
    function resetReveals() {
      partTweens.forEach(tween => tween.kill());partTweens.clear();panels.forEach(panel => panel.imageTween?.kill());revealed.clear();
      set(parts,{autoAlpha:0,y:14});
      set(panels.map(panel => panel.artwork),{autoAlpha:0,y:mobile.matches ? 0 : 14});
      panels.forEach(panel=>{panel.artworkStartedAt=0;panel.descriptionStartedAt=0;});
    }
    function cardMiddleInPanel(panel) {
      let middle = panel.card.offsetHeight / 2;
      for (let element=panel.card;element && element!==panel.element;element=element.offsetParent) middle += element.offsetTop;
      return middle;
    }
    function measureWorkPanels(base) {
      workHeight = workViewportProbe.getBoundingClientRect().height || height;
      root.dataset.workViewportHeight = workHeight.toFixed(1);
      let start = base + intro.offsetHeight;
      panels.forEach((panel,index) => {
        // Keep a full screen of content and the requested space above its title.
        // Longer copy can still scroll naturally until its actions are readable.
        let titleTop = 0;
        for (let element=panel.element.querySelector('h3');element && element!==panel.element;element=element.offsetParent) titleTop += element.offsetTop;
        const titleRest = parseFloat(getComputedStyle(panel.element).getPropertyValue('--work-title-rest')) || 40;
        panel.element.style.setProperty('--work-read-travel',`${Math.max(0,titleTop-titleRest)}px`);
        const style = getComputedStyle(panel.element);
        panel.start = start;panel.height = parseFloat(style.height) || panel.element.offsetHeight;start += panel.height;
        panel.element.style.setProperty('--work-sticky-top',`${Math.min(0,workHeight-panel.height)}px`);
        panel.element.style.setProperty('--work-layer',String(index+2));
      });
      footerStart = start;
    }
    const readingPanel = index => index===panels.length ? {element:footer,start:footerStart,height} : panels[index];
    function readingPose(y,previousHeight) {
      for (let index=1;index<=panels.length;index++) {
        const start = readingPanel(index).start;
        if (y>=start-previousHeight && y<start) return {index,cover:(y-start+previousHeight)/previousHeight};
      }
      for (let index=panels.length;index>=0;index--) {
        if (y>=readingPanel(index).start) return {index,offset:y-readingPanel(index).start};
      }
      return null;
    }
    function paintFooterCorners(cover) {
      const flatten = Math.max(0,Math.min(1,(cover-flattenStart)/(1-flattenStart)));
      footer.style.setProperty('--footer-radius',`${footerRadius*(1-flatten*flatten*(3-2*flatten))}px`);
    }
    function paintFooter(cover,desktop = false) {
      paintFooterCorners(cover);
      if (desktop) set(footer,{autoAlpha:cover<=0 ? 0 : 1,y:height*(1-cover)});
      footer.inert = cover<=.001;
      footer.setAttribute('aria-hidden',String(footer.inert));
      footer.style.pointerEvents = footer.inert ? 'none' : 'auto';
      root.dataset.footerProgress = cover.toFixed(4);
      root.dataset.footerStart = footerStart.toFixed(1);
      if (cover>0 && cover<1) root.dataset.sceneState='overlap';
      if (cover>=.999) root.dataset.sceneView='footer';
    }
    function paintWorkPanels() {
      let visibleIndex = 0,backgroundIndex = 0;
      const viewport = window.visualViewport,visibleTop = viewport?.offsetTop || 0,visibleHeight = viewport?.height || height,visibleBottom = visibleTop+visibleHeight;
      const footerCover = Math.max(0,Math.min(1,(mobilePaintedY-footerStart+workHeight)/workHeight));
      panels.forEach((panel,index) => {
        const next = panels[index+1];
        const covering = next ? Math.max(0,Math.min(1,(mobilePaintedY-next.start+workHeight)/workHeight)) : footerCover;
        // Sticky layout supplies the movement; scroll only controls the outgoing layer.
        set(panel.element,{autoAlpha:1-covering,scale:1-overlapRecede*covering,y:0});
        panel.element.inert = covering>=.999;
        panel.element.setAttribute('aria-hidden',String(covering>=.999));
        panel.element.style.pointerEvents = covering>=.999 ? 'none' : 'auto';
        panel.element.dataset.coverProgress = covering.toFixed(4);
        if (mobilePaintedY>=panel.start-workHeight/2) visibleIndex=index;
        if (mobilePaintedY>=panel.start) backgroundIndex=index;
        const bounds = panel.element.getBoundingClientRect();
        if (bounds.top<visibleBottom && bounds.bottom>visibleTop && covering<.999) {
          loadImage(true,panel);
          const sectionTitle=panel.element.querySelector('h2'),cardTitle=panel.element.querySelector('h3'),meta=panel.element.querySelector('.work-meta');
          if (sectionTitle && sectionTitle.getBoundingClientRect().top<visibleTop+visibleHeight*.9) reveal([sectionTitle]);
          if (cardTitle.getBoundingClientRect().top<visibleTop+visibleHeight*.9) reveal([cardTitle,meta]);
          revealArtwork(panel);
          const description=panel.element.querySelector('.work-description'),button=panel.actions || panel.element.querySelector('.work-details');
          if (revealed.has(panel.artwork) && description.getBoundingClientRect().top<visibleTop+visibleHeight*.94 && !revealed.has(description)) {
            const delay=Math.max(0,(panel.artworkStartedAt+420-performance.now())/1000);
            panel.descriptionStartedAt=performance.now()+delay*1000;reveal([description],delay);
          }
          if (revealed.has(description) && button.getBoundingClientRect().top<visibleBottom) reveal([button],Math.max(0,(panel.descriptionStartedAt+140-performance.now())/1000));
        }
      });
      root.dataset.workSceneIndex = String(visibleIndex);
      document.body.style.backgroundColor = panels[backgroundIndex].element.dataset.workSurface==='white' ? 'var(--color-canvas)' : 'var(--color-surface)';
      paintFooter(footerCover);
    }
    function paintDesktopPanels() {
      let visibleIndex=0,backgroundIndex=0,overlapping=false;
      const footerCover = Math.max(0,Math.min(1,(desktopPaintedY-footerStart+height)/height));
      panels.forEach((panel,index)=>{
        const entering=index===0 ? progress : Math.max(0,Math.min(1,(desktopPaintedY-travel-(index-1)*height)/height));
        const covering=index<panels.length-1 ? Math.max(0,Math.min(1,(desktopPaintedY-travel-index*height)/height)) : footerCover;
        const visible=entering>0 && covering<.999;
        set(panel.element,{autoAlpha:entering>0 ? 1-covering : 0,y:height*(1-entering),scale:1-overlapRecede*covering});
        panel.element.inert=!visible;panel.element.setAttribute('aria-hidden',String(!visible));panel.element.style.pointerEvents=visible ? 'auto' : 'none';
        panel.element.dataset.coverProgress=covering.toFixed(4);
        if (entering>=.5) visibleIndex=index;
        if (entering>=.999) backgroundIndex=index;
        if (index>0 && entering>0 && entering<1) overlapping=true;
        if (!visible) return;
        loadImage(true,panel);
        const title=panel.element.querySelector('h2');
        if (title && title.getBoundingClientRect().top<height*.9) reveal([title]);
        if (panel.card.getBoundingClientRect().top<height*.88) reveal(panel.parts.filter(part=>part!==title));
        revealArtwork(panel);
      });
      root.dataset.workSceneIndex=String(visibleIndex);
      if (overlapping) root.dataset.sceneState='overlap';
      if (progress>0) document.body.style.backgroundColor=panels[backgroundIndex].element.dataset.workSurface==='white' ? 'var(--color-canvas)' : 'var(--color-surface)';
      else document.body.style.removeProperty('background-color');
      paintFooter(footerCover,true);
    }
    function nativeWorkPose(y) {
      const starts=[...panels.map(panel=>y+panel.element.getBoundingClientRect().top),y+footer.getBoundingClientRect().top];
      if(root.classList.contains('footer-native-overlap') && y>=starts[panels.length]-height)return {step:panels.length-1+Math.max(0,Math.min(1,(y-starts[panels.length]+height)/height))};
      for(let index=panels.length;index>=0;index--) {
        if(y>=starts[index])return {step:index+(y-starts[index])/(parseFloat(getComputedStyle(readingPanel(index).element).height)||height)};
      }
      return {intro:Math.max(0,Math.min(1,1-(starts[0]-y)/Math.max(1,height)))};
    }
    function nativeDestination(step) {
      if(root.classList.contains('footer-native-overlap') && step>=panels.length-1)return footer.getBoundingClientRect().top+window.scrollY-height+(step-panels.length+1)*height;
      const index=Math.min(panels.length,Math.floor(step)),panel=readingPanel(index);
      return panel.element.getBoundingClientRect().top+window.scrollY+(step-index)*parseFloat(getComputedStyle(panel.element).height);
    }
    function handleInitialLocation() {
      if (initialLocationHandled || mobile.matches && root.dataset.mobileNavReady!=='true') return;
      const index=location.hash==='#contact' ? panels.length : panels.findIndex(panel=>`#${panel.element.id}`===location.hash);
      initialLocationHandled=true;
      if(index>=0){if(enhanced||mobileOverlap)goToWorks(false,index);else if(index<panels.length)loadImage(false,panels[index]);}
    }
    function parkPortrait() {
      if (!parked && enhanced && progress >= .999) parked = !!window.portraitPlayer?.setDesktopCoverPose?.(0);
    }
    function releasePortrait() {
      if (!parked) return;parked = false;window.portraitPlayer?.clearDesktopCoverPose?.();
    }
    function paintScene() {
      if (!enhanced && !mobileOverlap) {
        footerStart=window.scrollY+footer.getBoundingClientRect().top;
        const cover=Math.max(0,Math.min(1,(window.scrollY-footerStart+height)/height));
        paintFooterCorners(cover);
        if(root.classList.contains('footer-native-overlap')) {
          const last=panels[panels.length-1].element;
          set(last,{autoAlpha:1-cover,scale:1-overlapRecede*cover});last.inert=cover>=.999;last.setAttribute('aria-hidden',String(last.inert));
          root.dataset.footerProgress=cover.toFixed(4);root.dataset.footerStart=footerStart.toFixed(1);
        }
        if (!mobile.matches) panels.forEach(panel=>{
          const bounds=panel.element.getBoundingClientRect();
          if (bounds.top<height && bounds.bottom>0) loadImage(true,panel);
        });
        nativePaintedPose=nativeWorkPose(window.scrollY);syncAvailability();return;
      }
      if (root.classList.contains('mobile-menu-open')) {syncAvailability();return;}
      if (mobileOverlap) {mobilePaintedY = window.scrollY;progress = Math.max(0,Math.min(1,(mobilePaintedY - mobileStart) / Math.max(1,mobileTravel)));}
      else {
        desktopPaintedY=window.scrollY;
        const maximum = Math.max(1,Math.min(travel,document.documentElement.scrollHeight - document.documentElement.clientHeight));
        progress = Math.max(0,Math.min(1,window.scrollY / maximum));
      }
      const started = progress > .001,complete = progress >= .999;
      const recede = mobileOverlap ? mobileRecedeStart >= 1 ? 0 : Math.max(0,Math.min(1,(progress - mobileRecedeStart) / (1 - mobileRecedeStart))) : progress;
      set(intro,{autoAlpha:complete ? 0 : 1 - .62 * recede,scale:1 - .045 * recede,y:-18 * recede});
      if (mobileOverlap) root.dataset.sceneRecedeProgress = recede.toFixed(4);
      // The foreground panel intercepts covered areas; exposed controls stay usable.
      intro.inert = complete;works.inert = !mobileOverlap && !started;
      intro.setAttribute('aria-hidden',String(complete));works.setAttribute('aria-hidden',String(!mobileOverlap && !started));
      intro.style.pointerEvents = complete ? 'none' : 'auto';works.style.pointerEvents = mobileOverlap || started ? 'auto' : 'none';
      root.dataset.sceneView = started ? 'works' : 'intro';
      root.dataset.sceneProgress = progress.toFixed(4);
      root.dataset.sceneState = !started || complete ? 'settled' : 'overlap';
      const worksVisible = mobileOverlap ? works.getBoundingClientRect().top < (window.visualViewport?.offsetTop || 0) + (window.visualViewport?.height || height) : started;
      if (!started) releasePortrait();
      if (mobileOverlap) {
        paintWorkPanels();
        if (!worksVisible && revealed.size) resetReveals();
        if (!started) document.body.style.removeProperty('background-color');
        if (complete) focusWhenReady();
      } else if (!worksVisible) {if (revealed.size) resetReveals();}
      else {
        paintDesktopPanels();
        if (complete) {
          if (!mobileOverlap) parkPortrait();
          focusWhenReady();
        } else releasePortrait();
      }
      if (!mobileOverlap && !worksVisible) paintDesktopPanels();
      syncAvailability();
      if (mobileOverlap) window.dispatchEvent(new Event('mobile:scene-painted'));
    }
    function nativeLayout() {
      scrollTween?.kill();partTweens.forEach(tween => tween.kill());partTweens.clear();panels.forEach(panel=>panel.imageTween?.kill());revealed.clear();releasePortrait();
      root.classList.remove('scene-enhanced','mobile-overlap','footer-native-overlap');enhanced = false;mobileOverlap = false;
      for (const element of [intro,footer,...panels.map(panel=>panel.element),...parts,...panels.map(panel=>panel.artwork)]) {
        if (window.gsap) gsap.set(element,{clearProps:'transform,opacity,visibility'});
        else {element.style.removeProperty('transform');element.style.removeProperty('opacity');element.style.removeProperty('visibility');}
      }
      for (const element of [intro,footer,...panels.map(panel=>panel.element)]) {
        element.inert=false;element.removeAttribute('aria-hidden');element.style.removeProperty('pointer-events');
      }
      document.body.style.removeProperty('background-color');
      root.dataset.sceneState = 'native';
      if ((!mobile.matches && portraitPrepared) || portraitIntroFinished) panels.forEach(panel=>loadImage(false,panel));
      syncAvailability();
    }
    function measureViewport() {
      resizeFrame = 0;
      if (root.classList.contains('mobile-menu-open')) return;
      warmDesktopPreviews();
      const nextHeight = sceneHeight();
      const offset = sceneOffset();
      // iOS also animates safe-area insets with its toolbars. Cache them with
      // the stable scene size so card heights cannot move during a swipe.
      if (stableViewport() && (Math.abs(nextHeight-height)>.5 || viewportWidth!==window.innerWidth)) {
        const insets = getComputedStyle(viewportProbe);
        root.style.setProperty('--scene-safe-top',insets.paddingTop);
        root.style.setProperty('--scene-safe-bottom',insets.paddingBottom);
      }
      const oldHeight = height,wasEnhanced = enhanced,wasMobile = mobileOverlap,oldStart = mobileStart,oldTravel = mobileTravel,oldDesktopTravel=travel,currentY = window.scrollY;
      // Browsers can clamp scrollY before resize fires; preserve the last painted reading pose.
      const viewportChanged = wasMobile && (Math.abs(oldHeight - nextHeight) > .5 || Math.abs(viewportOffset - offset) > .5 || viewportWidth !== window.innerWidth);
      const previousY = viewportChanged ? mobilePaintedY : currentY;
      const previousPose = wasMobile && oldHeight>0 ? readingPose(previousY,workHeight || oldHeight) : null;
      const previousPanels = panels.map(panel=>({start:panel.start,height:panel.height}));
      const desktopViewportChanged=wasEnhanced && (Math.abs(oldHeight-nextHeight)>.5 || Math.abs(viewportOffset-offset)>.5 || viewportWidth!==window.innerWidth);
      const oldDesktopY=desktopViewportChanged ? desktopPaintedY : currentY;
      const oldDesktopStep=wasEnhanced && oldHeight>0 && oldDesktopY>=oldDesktopTravel ? Math.max(0,(oldDesktopY-oldDesktopTravel)/oldHeight) : null;
      const nativeViewportChanged=Math.abs(oldHeight-nextHeight)>.5 || viewportWidth!==window.innerWidth || Math.abs(viewportOffset-offset)>.5;
      const nativePose=!wasEnhanced && !wasMobile && oldHeight>0 ? nativeViewportChanged && nativePaintedPose ? nativePaintedPose : nativeWorkPose(currentY) : null;
      // Mobile navigation initializes asynchronously at the breakpoint. Retain
      // the work position across its temporary native header/layout phase.
      if(mobile.matches && root.dataset.mobileNavReady!=='true') {
        const step=oldDesktopStep ?? nativePose?.step;
        if(step!==undefined && step!==null)pendingMobileWorkStep=step;
      } else if(!mobile.matches)pendingMobileWorkStep=null;
      const oldProgress = wasMobile ? Math.max(0,Math.min(1,(previousY - oldStart) / Math.max(1,oldTravel)))
        : wasEnhanced ? Math.max(0,Math.min(1,oldDesktopY/oldDesktopTravel)) : !wasEnhanced && oldHeight > 0 ? Number(works.getBoundingClientRect().top <= oldHeight * .5) : progress;
      progress = oldProgress;
      const contentHeight = hero.offsetHeight,headerTop = nextHeight < 480 ? 16 : 43;
      height = nextHeight;travel = Math.max(1,Math.round(height * .85));
      viewportOffset = offset;viewportWidth = window.innerWidth;
      root.style.setProperty('--scene-height',`${height}px`);root.style.setProperty('--scene-offset',`${offset}px`);
      root.style.setProperty('--scroll-travel',`${travel}px`);root.style.setProperty('--intro-content-height',`${contentHeight}px`);
      root.style.setProperty('--work-stack-travel',`${(panels.length-1)*height}px`);
      root.style.setProperty('--footer-travel',`${height}px`);
      root.style.setProperty('--header-top',`${headerTop}px`);
      root.style.setProperty('--intro-shift',`${Math.max(0,headerTop + 41 - (height - contentHeight)/2)}px`);
      root.dataset.sceneHeight = height.toFixed(1);root.dataset.sceneOffset = offset.toFixed(1);stage.dataset.viewportHeight = height.toFixed(1);
      if (mobile.matches && !reduced.matches && window.gsap && root.dataset.mobileNavReady === 'true') {
        root.classList.remove('footer-native-overlap');
        if (!wasMobile) {nativeLayout();mobileOverlap = true;root.classList.add('mobile-overlap');resetReveals();}
        const introHeight = intro.offsetHeight;
        // Read naturally until the CTA reaches mid-window, with Works already visible below.
        // Offset geometry ignores the intro/entrance transforms and includes copy fallback content.
        let buttonCenter = agentButton.offsetHeight / 2;
        for (let element = agentButton;element && element !== intro;element = element.offsetParent) buttonCenter += element.offsetTop;
        mobileTravel = Math.max(1,Math.min(height,height / 2 + introHeight - buttonCenter));
        const read = Math.max(0,introHeight - mobileTravel);
        mobileStart = currentY + flow.getBoundingClientRect().top + read - offset;
        measureWorkPanels(currentY+flow.getBoundingClientRect().top);
        const panelsChanged = panels.some((panel,index)=>Math.abs(panel.start-previousPanels[index].start)>.5 || Math.abs(panel.height-previousPanels[index].height)>.5);
        const cardMiddle = cardMiddleInPanel(panels[0]);
        mobileRecedeStart = Math.min(1,Math.max(0,(mobileTravel + cardMiddle - height) / mobileTravel));
        root.style.setProperty('--mobile-intro-top',`${offset - read}px`);
        root.dataset.sceneRead = read.toFixed(1);root.dataset.sceneStart = mobileStart.toFixed(1);root.dataset.sceneTravel = mobileTravel.toFixed(1);
        root.dataset.sceneRest = '0';root.dataset.sceneRecedeStart = mobileRecedeStart.toFixed(4);
        const previousWorkStep=pendingMobileWorkStep ?? oldDesktopStep ?? nativePose?.step;
        if (previousWorkStep!==undefined && previousWorkStep!==null && !wasMobile) {
          const index=Math.min(panels.length,Math.floor(previousWorkStep)),fraction=previousWorkStep-index;
          window.scrollTo(0,fraction>0 && index<panels.length ? readingPanel(index+1).start-workHeight+workHeight*fraction : readingPanel(index).start);
          pendingMobileWorkStep=null;
        } else if (!wasMobile && oldProgress>0 && (wasEnhanced || location.hash==='#selected-works' && currentY<mobileStart)) {
          window.scrollTo(0,mobileStart + mobileTravel * (location.hash === '#selected-works' ? 1 : oldProgress));
        } else if (wasMobile && (viewportChanged || panelsChanged || Math.abs(oldStart - mobileStart) > .5 || Math.abs(oldTravel - mobileTravel) > .5)) {
          // Keep the panel progress or the already-read Works offset across browser chrome changes.
          if (oldProgress > 0 && oldProgress < 1) window.scrollTo(0,mobileStart + mobileTravel * oldProgress);
          else if (oldProgress >= 1) {
            const destination = previousPose ? 'cover' in previousPose
              ? readingPanel(previousPose.index).start-workHeight+workHeight*previousPose.cover
              : readingPanel(previousPose.index).start+previousPose.offset
              : mobileStart+mobileTravel+Math.max(0,previousY-oldStart-oldTravel);
            window.scrollTo(0,destination);
          }
        }
        paintScene();handleInitialLocation();return;
      }
      const titleHeight=Math.min(140,Math.max(76,height*.2));
      const worksFit=panels.every((panel,index)=>panel.card.offsetHeight+(index===0 ? titleHeight+40 : 0)<=height);
      const fits = height >= contentHeight + headerTop + 53 && worksFit && !reduced.matches && !mobile.matches && !!window.gsap;
      if (!fits) {
        const showWorks = oldProgress >= .5 || location.hash === '#selected-works';
        if (enhanced || mobileOverlap) {
          const keepMobileReading = mobileOverlap && mobile.matches;
          nativeLayout();
          root.classList.toggle('footer-native-overlap',!mobile.matches && !reduced.matches);
          root.style.setProperty('--footer-last-top',`${Math.min(0,height-panels[panels.length-1].element.offsetHeight)}px`);
          if(wasEnhanced && !mobile.matches) {
            const step=oldDesktopStep,index=step===null ? 0 : Math.min(panels.length,Math.floor(step)),panel=readingPanel(index);
            const destination=step===null ? intro.offsetHeight-Math.max(0,height*(1-oldProgress)) : step>=panels.length-1 && root.classList.contains('footer-native-overlap') ? nativeDestination(step) : panel.element.getBoundingClientRect().top+window.scrollY+(step-index)*parseFloat(getComputedStyle(panel.element).height);
            window.scrollTo(0,oldProgress>0 ? destination : 0);
          } else if(wasEnhanced && mobile.matches && oldDesktopStep!==null) {
            window.scrollTo(0,nativeDestination(oldDesktopStep));
          } else if(wasMobile && !mobile.matches && previousPose) {
            const panel=readingPanel(previousPose.index),start=panel.element.getBoundingClientRect().top+window.scrollY;
            window.scrollTo(0,'cover' in previousPose ? start-height+height*previousPose.cover : start+Math.min(previousPose.offset,Math.max(0,parseFloat(getComputedStyle(panel.element).height)-height)));
          } else window.scrollTo(0,keepMobileReading ? currentY : showWorks ? works.offsetTop : wasMobile ? Math.min(currentY,Math.max(0,intro.offsetHeight - height)) : 0);
        }
        else if (!root.dataset.sceneState) nativeLayout();
        root.classList.toggle('footer-native-overlap',!mobile.matches && !reduced.matches);
        root.style.setProperty('--footer-last-top',`${Math.min(0,height-panels[panels.length-1].element.offsetHeight)}px`);
        if(!wasEnhanced && !wasMobile && nativeViewportChanged && nativePose?.step!==undefined)window.scrollTo(0,nativeDestination(nativePose.step));
        root.dataset.sceneView = showWorks ? 'works' : 'intro';
        nativePaintedPose=nativeWorkPose(window.scrollY);
        paintScene();
      } else {
        root.classList.remove('footer-native-overlap');
        if (mobileOverlap) nativeLayout();
        if (!enhanced) {enhanced = true;root.classList.add('scene-enhanced');resetReveals();}
        panels.forEach((panel,index)=>{panel.start=travel+index*height;panel.height=height;panel.element.style.setProperty('--work-layer',String(index+2));});
        footerStart = travel+panels.length*height;
        if (!wasEnhanced || desktopViewportChanged) {
          scrollTween?.kill();
          const workStep=oldDesktopStep!==null ? oldDesktopStep : previousPose ? 'cover' in previousPose ? previousPose.index-1+previousPose.cover : previousPose.index+previousPose.offset/Math.max(1,oldHeight) : nativePose?.step;
          window.scrollTo(0,workStep!==undefined && workStep!==null ? travel+Math.min(panels.length,workStep)*height : travel*(nativePose?.intro ?? oldProgress));
          if (wasEnhanced) resizeWheelUntil = performance.now() + 80;
        }
        paintScene();
      }
      handleInitialLocation();
    }
    function scheduleMeasure() {if (!resizeFrame) resizeFrame = requestAnimationFrame(measureViewport);}
    function onViewportResize() {
      // Browser toolbars resize the visual viewport while the touch scene stays
      // at 100svh. Leave its layout alone until the scene dimensions change.
      if (stableViewport() && viewportWidth === window.innerWidth && Math.abs(sceneHeight()-height)<=.5 && Math.abs(sceneOffset()-viewportOffset)<=.5) {
        scheduleScroll();return;
      }
      scheduleMeasure();
    }
    function readScroll() {
      scrollFrame = 0;
      const currentHeight = sceneHeight();
      if (Math.abs(currentHeight - height) > .5 || Math.abs(sceneOffset() - viewportOffset) > .5) {if (resizeFrame) cancelAnimationFrame(resizeFrame);measureViewport();}
      else paintScene();
    }
    function scheduleScroll() {if (!scrollFrame) scrollFrame = requestAnimationFrame(readScroll);}
    function goToWorks(focus = false,index = 0) {
      if(index<panels.length)loadImage(true,panels[index]);
      focusAtEnd = focus ? index===panels.length ? footerTitle : panels[index].focusTarget : false;
      if (!enhanced && !mobileOverlap) {
        window.scrollTo(0,nativeDestination(index));paintScene();focusWhenReady();return;
      }
      scrollTween?.kill();
      const destination = mobileOverlap ? index===0 ? mobileStart+mobileTravel : readingPanel(index).start : travel+index*height;
      if (!window.gsap) {window.scrollTo(0,destination);paintScene();return;}
      const proxy = {y:window.scrollY};
      scrollTween = gsap.to(proxy,{y:destination,duration:1.05,ease:'power2.inOut',onUpdate:() => {window.scrollTo(0,proxy.y);paintScene();},onComplete:() => {scrollTween=null;paintScene();focusWhenReady();}});
    }
    function stopAutoScroll() {
      scrollTween?.kill();focusAtEnd = false;
      if (Math.abs(sceneHeight() - height) > .5) {if (resizeFrame) cancelAnimationFrame(resizeFrame);measureViewport();}
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
      if ((!enhanced && !mobileOverlap) || root.classList.contains('mobile-menu-open') || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      event.preventDefault();if (location.hash !== '#selected-works') history.pushState(null,'','#selected-works');goToWorks(true);
    });
    panels.forEach(panel=>panel.element.addEventListener('focusin',event => {
      if ((enhanced || mobileOverlap) && progress<.999 && event.target!==heading && panel===panels[0]) goToWorks();
      else if (mobileOverlap || enhanced) scheduleScroll();
    }));
    // Continue keyboard reading into the final screen even while it is parked
    // below the sticky stage. Reverse Tab restores the last work's link.
    const lastWorkLink=panels[panels.length-1].element.querySelector('.work-details');
    const firstFooterLink=footer.querySelector('.footer-links a');
    lastWorkLink.addEventListener('keydown',event=>{
      if(event.key!=='Tab' || event.shiftKey || (!enhanced && !mobileOverlap && !root.classList.contains('footer-native-overlap')))return;
      event.preventDefault();goToWorks(true,panels.length);
    });
    firstFooterLink.addEventListener('keydown',event=>{
      if(event.key!=='Tab' || !event.shiftKey || (!enhanced && !mobileOverlap && !root.classList.contains('footer-native-overlap')))return;
      event.preventDefault();goToWorks(false,panels.length-1);focusAtEnd=lastWorkLink;focusWhenReady();
    });
    const syncLocation = () => {
      if ((!enhanced && !mobileOverlap) || root.classList.contains('mobile-menu-open')) return;
      const index=location.hash==='#contact' ? panels.length : panels.findIndex(panel=>`#${panel.element.id}`===location.hash);
      if (index>=0) goToWorks(true,index);
      else {scrollTween?.kill();window.scrollTo(0,0);paintScene();document.querySelector('.header > .name').focus({preventScroll:true});}
    };
    window.addEventListener('wheel',onWheel,{passive:false});window.addEventListener('touchstart',stopAutoScroll,{passive:true});
    window.addEventListener('keydown',event => {if (['PageUp','PageDown','ArrowUp','ArrowDown','Home','End',' '].includes(event.key)) stopAutoScroll();});
    window.addEventListener('scroll',scheduleScroll,{passive:true});window.addEventListener('resize',onViewportResize,{passive:true});
    window.addEventListener('mobile:menu-closed',scheduleMeasure);
    window.addEventListener('mobile:work-navigation',event => {
      if (!mobileOverlap || event.detail?.target !== works) return;
      event.preventDefault();measureViewport();goToWorks(true);
    });
    window.visualViewport?.addEventListener('resize',onViewportResize,{passive:true});window.visualViewport?.addEventListener('scroll',onViewportResize,{passive:true});
    window.addEventListener('popstate',syncLocation);window.addEventListener('hashchange',syncLocation);window.addEventListener('pageshow',scheduleMeasure);
    reduced.addEventListener('change',measureViewport);
    mobile.addEventListener('change',measureViewport);
    touchViewport.addEventListener('change',measureViewport);
    document.addEventListener('visibilitychange',() => {
      if (document.hidden) {
        scrollTween?.kill();partTweens.forEach(tween => tween.kill());partTweens.clear();panels.forEach(panel=>panel.imageTween?.kill());
        set([...revealed],{autoAlpha:1,y:0});
        syncAvailability();
      } else scheduleMeasure();
    });
    if (typeof ResizeObserver === 'function') {const observer = new ResizeObserver(scheduleMeasure);observer.observe(hero);panels.forEach(panel=>observer.observe(panel.element));}
    document.fonts?.ready.then(scheduleMeasure);
    Promise.resolve(window.mobileNavigationReady).then(scheduleMeasure);
    Promise.resolve(window.portraitReady).then(() => {
      portraitPrepared = true;warmDesktopPreviews();
      return window.portraitPlayer?.introFinished;
    }).then(() => {
      portraitIntroFinished = true;
      parkPortrait();
      if (!enhanced && !mobileOverlap) panels.forEach(panel=>loadImage(false,panel));else loadImage();
    });
    measureViewport();
  }

})();
