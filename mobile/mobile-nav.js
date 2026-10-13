// LIGHT content with the approved NEW mobile navigation behavior.
(() => {
  const root = document.documentElement;
  const header = document.querySelector('.header');
  const toggle = header?.querySelector('.menu-toggle');
  const nav = header?.querySelector('#main-navigation');
  const links = nav ? [...nav.querySelectorAll('a')] : [];
  if (!header || !toggle || !nav || !links.length) {
    root.classList.add('mobile-navigation-fallback');
    window.resolveMobileNavigationReady?.(false);
    return;
  }
  const mobile = window.mobileLayout || matchMedia('(max-width: 767px), (max-width: 1023px) and (pointer: coarse)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const background = [document.querySelector('.intro-content'),document.querySelector('.works-screen'),header.querySelector('.identity')].filter(Boolean);
  let scrollPosition = null;
  let inertBefore = [];
  let desiredOpen = false;
  let transition = null;
  let navigationFocus = null;
  let pendingAnchor = null;
  document.addEventListener('focusin',event => {navigationFocus = header.contains(event.target) ? event.target : null;});
  const clearAnimation = () => {
    for (const element of [nav,...links,toggle]) {
      element.style.removeProperty('opacity');
      element.style.removeProperty('transform');
    }
    header.classList.remove('menu-animating');
  };
  const setVisible = (open,returnFocus = false) => {
    const expanded = mobile.matches && open;
    const wasOpen = header.classList.contains('menu-open');
    if (expanded === wasOpen) return;
    if (expanded) {
      scrollPosition = {x:scrollX,y:scrollY};
      document.body.style.setProperty('--menu-scroll-y',`${-scrollPosition.y}px`);
      inertBefore = background.map(element => element.inert);
      background.forEach(element => {element.inert = true;});
      header.setAttribute('role','dialog');
      header.setAttribute('aria-modal','true');
      header.setAttribute('aria-label','Navigation menu');
    }
    header.classList.toggle('menu-open',expanded);
    root.classList.toggle('mobile-menu-open',expanded);
    document.body.classList.toggle('mobile-menu-open',expanded);
    toggle.setAttribute('aria-expanded',String(expanded));
    toggle.setAttribute('aria-label',expanded ? 'Close menu' : 'Open menu');
    if (!expanded) {
      background.forEach((element,index) => {element.inert = inertBefore[index];});
      header.setAttribute('role','banner');
      header.removeAttribute('aria-modal');
      header.removeAttribute('aria-label');
      document.body.style.removeProperty('--menu-scroll-y');
      if (scrollPosition) window.scrollTo(scrollPosition.x,scrollPosition.y);
      scrollPosition = null;
      if (returnFocus && mobile.matches) toggle.focus({preventScroll:true});
      window.portraitPlayer?.returnFromMenu?.();
      if (pendingAnchor) {
        const {target,hash} = pendingAnchor;
        pendingAnchor = null;
        if (location.hash !== hash) history.pushState(null,'',hash);
        target.scrollIntoView();
        (target.querySelector('#works-title') || target.querySelector('[tabindex="-1"]'))?.focus({preventScroll:true});
      }
      window.dispatchEvent(new Event('mobile:menu-closed'));
    }
  };
  const settleTransition = () => {
    transition?.kill();
    transition = null;
    nav.inert = false;
    clearAnimation();
    if (!desiredOpen) setVisible(false,true);
  };
  const setOpen = (open,returnFocus = false,instant = false) => {
    open = mobile.matches && open;
    if (desiredOpen === open) return;
    desiredOpen = open;
    transition?.kill();
    transition = null;
    const animate = window.gsap && !reduced.matches && mobile.matches && !instant;
    if (animate) header.classList.add('menu-animating');
    if (open) {
      const wasVisible = header.classList.contains('menu-open');
      nav.inert = false;
      if (animate && !wasVisible) gsap.set(toggle,{opacity:0});
      setVisible(true);
      if (returnFocus) toggle.focus({preventScroll:true});
      if (!animate) {clearAnimation();return;}
      gsap.killTweensOf(links);
      if (!wasVisible) {
        gsap.set(nav,{opacity:0});
        gsap.set(links,{opacity:0,y:12});
      }
      transition = gsap.timeline({onComplete:() => {transition = null;clearAnimation();}})
        .to(nav,{opacity:1,duration:.28,ease:'power2.out'},0)
        .to(toggle,{opacity:1,duration:.16,ease:'power2.out'},0)
        .to(links,{opacity:1,y:0,duration:.32,stagger:.055,ease:'power3.out'},.07);
    } else {
      if (returnFocus && mobile.matches) toggle.focus({preventScroll:true});
      const finish = () => {
        transition = null;
        nav.inert = false;
        clearAnimation();
        setVisible(false,returnFocus);
      };
      if (!animate) {finish();return;}
      nav.inert = true;
      window.portraitPlayer?.prepareMenuPose?.();
      // Let every link leave in reverse order before fading the full-screen panel.
      transition = gsap.timeline({onComplete:() => {transition = null;clearAnimation();}})
        .to(links,{opacity:0,y:12,duration:.24,stagger:{each:.055,from:'end'},ease:'power3.in'},0)
        .to([nav,toggle],{opacity:0,duration:.28,ease:'power2.inOut'})
        .call(() => {nav.inert = false;setVisible(false,returnFocus);})
        .to(toggle,{opacity:1,duration:.18,ease:'power2.out',clearProps:'opacity'});
    }
  };
  toggle.addEventListener('click',() => setOpen(!desiredOpen,true));
  nav.addEventListener('click',event => {
    const link = event.target.closest('a');
    if (!link || !nav.contains(link) || event.defaultPrevented) return;
    const plainClick = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
    const target = link.hash && link.origin === location.origin && link.pathname === location.pathname ? document.getElementById(link.hash.slice(1)) : null;
    if (target && desiredOpen && plainClick) {
      event.preventDefault();
      pendingAnchor = {target,hash:link.hash};
    }
    setOpen(false,true);
  });
  document.addEventListener('pointerdown',event => {if (!header.contains(event.target)) setOpen(false);});
  document.addEventListener('keydown',event => {
    if (toggle.getAttribute('aria-expanded') !== 'true') return;
    if (event.key === 'Escape') {event.preventDefault();setOpen(false,true);return;}
    if (event.key !== 'Tab') return;
    event.preventDefault();
    if (!desiredOpen) {toggle.focus({preventScroll:true});return;}
    // Safari can omit links from its native Tab order; keep this dialog's cycle explicit.
    const controls = [toggle,...links];
    const index = controls.indexOf(document.activeElement);
    const next = index < 0 ? (event.shiftKey ? controls.length - 1 : 0)
      : (index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
    controls[next].focus({preventScroll:true});
  });
  mobile.addEventListener('change',() => {
    // Hiding a mobile-only control can blur it before the media change fires.
    const focused = document.activeElement === document.body ? navigationFocus : document.activeElement;
    const focusedLink = nav.contains(focused);
    const focusedToggle = focused === toggle;
    pendingAnchor = null;
    desiredOpen = true; // Force immediate cleanup even during an unfinished close.
    setOpen(false,false,true);
    if (mobile.matches && focusedLink) toggle.focus({preventScroll:true});
    if (!mobile.matches && focusedToggle) links[0].focus({preventScroll:true});
  });
  reduced.addEventListener('change',() => {
    if (reduced.matches && transition) settleTransition();
  });
  window.addEventListener('resize',() => {
    if (transition) settleTransition();
  },{passive:true});
  const moveFocus = mobile.matches && root.classList.contains('mobile-navigation-fallback') && nav.contains(document.activeElement);
  clearTimeout(window.mobileNavigationDeadline);
  root.classList.remove('mobile-navigation-fallback');
  root.dataset.mobileNavReady = 'true';
  if (moveFocus) toggle.focus({preventScroll:true});
  window.resolveMobileNavigationReady?.(true);
})();
