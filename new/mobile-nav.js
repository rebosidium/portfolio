// Shared navigation with one mobile-only link; disclosure exists below 1024px.
(() => {
  const header = document.querySelector('.header');
  const toggle = header.querySelector('.menu-toggle');
  const nav = header.querySelector('nav');
  const links = [...nav.querySelectorAll('a')];
  const mobile = window.mobileLayout;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const background = [document.querySelector('.promo'),document.querySelector('main'),header.querySelector('.identity')];
  let scrollPosition = null;
  let inertBefore = [];
  let desiredOpen = false;
  let transition = null;
  let navigationFocus = null;
  document.addEventListener('focusin',event => {navigationFocus = header.contains(event.target) ? event.target : null;});
  const clearAnimation = () => {
    for (const element of [nav,...links]) {
      element.style.removeProperty('opacity');
      element.style.removeProperty('transform');
    }
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
    document.documentElement.classList.toggle('mobile-menu-open',expanded);
    document.body.classList.toggle('mobile-menu-open',expanded);
    toggle.setAttribute('aria-expanded',String(expanded));
    toggle.setAttribute('aria-label',expanded ? 'Close menu' : 'Open menu');
    if (!expanded) {
      background.forEach((element,index) => {element.inert = inertBefore[index];});
      header.removeAttribute('role');
      header.removeAttribute('aria-modal');
      header.removeAttribute('aria-label');
      document.body.style.removeProperty('--menu-scroll-y');
      if (scrollPosition) window.scrollTo(scrollPosition.x,scrollPosition.y);
      scrollPosition = null;
      if (returnFocus && mobile.matches) toggle.focus({preventScroll:true});
    }
  };
  const setOpen = (open,returnFocus = false,instant = false) => {
    open = mobile.matches && open;
    if (desiredOpen === open) return;
    desiredOpen = open;
    transition?.kill();
    transition = null;
    const animate = window.gsap && !reduced.matches && mobile.matches && !instant;
    if (open) {
      const wasVisible = header.classList.contains('menu-open');
      nav.inert = false;
      setVisible(true);
      if (!animate) {clearAnimation();return;}
      gsap.killTweensOf(links);
      if (!wasVisible) {
        gsap.set(nav,{opacity:0});
        gsap.set(links,{opacity:0,y:12});
      }
      transition = gsap.timeline({onComplete:() => {transition = null;clearAnimation();}})
        .to(nav,{opacity:1,duration:.28,ease:'power2.out'},0)
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
      transition = gsap.timeline({onComplete:finish})
        .to(links,{opacity:0,y:8,duration:.16,stagger:{each:.025,from:'end'},ease:'power2.in'},0)
        .to(nav,{opacity:0,duration:.24,ease:'power2.inOut'},.04);
    }
  };
  toggle.addEventListener('click',() => setOpen(!desiredOpen,true));
  nav.addEventListener('click',event => {if (event.target.closest('a')) setOpen(false,true);});
  document.addEventListener('pointerdown',event => {if (!header.contains(event.target)) setOpen(false);});
  document.addEventListener('keydown',event => {
    if (toggle.getAttribute('aria-expanded') !== 'true') return;
    if (event.key === 'Escape') {event.preventDefault();setOpen(false,true);return;}
    if (event.key !== 'Tab') return;
    if (!desiredOpen) {event.preventDefault();toggle.focus({preventScroll:true});return;}
    const first = toggle;
    const last = nav.querySelector('a:last-child');
    if (event.shiftKey && document.activeElement === first) {event.preventDefault();last.focus();}
    else if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first.focus();}
  });
  mobile.addEventListener('change',() => {
    // Hiding a mobile-only control can blur it before the media change fires.
    const focused = document.activeElement === document.body ? navigationFocus : document.activeElement;
    const focusedLink = nav.contains(focused);
    const focusedToggle = focused === toggle;
    desiredOpen = true; // Force immediate cleanup even during an unfinished close.
    setOpen(false,false,true);
    if (mobile.matches && focusedLink) toggle.focus({preventScroll:true});
    if (!mobile.matches && (focusedToggle || (focusedLink && focused.classList.contains('mobile-only')))) nav.querySelector('a').focus({preventScroll:true});
  });
  reduced.addEventListener('change',() => {
    if (!reduced.matches || !transition) return;
    transition.kill();
    transition = null;
    nav.inert = false;
    clearAnimation();
    if (!desiredOpen) setVisible(false,true);
  });
  window.resolveMobileNavigationReady?.();
})();
