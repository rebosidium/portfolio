// Homepage navigation: one SVG stroke morphs from menu to close.
(() => {
  const root = document.documentElement;
  const header = document.querySelector('.header');
  const toggle = header?.querySelector('.menu-toggle');
  const nav = header?.querySelector('#main-navigation');
  const links = nav ? [...nav.querySelectorAll('a')] : [];
  const menuLinks = links.filter(link=>!link.classList.contains('desktop-only'));
  if (!header || !toggle || !nav || !links.length) {
    root.classList.add('mobile-navigation-fallback');
    window.resolveMobileNavigationReady?.(false);
    return;
  }
  const mobile = window.mobileLayout || matchMedia('(max-width: 767px), (max-width: 1023px) and (pointer: coarse)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  // innerWidth rounds fractional CSS pixels on some Android screens.
  const widthProbe = document.createElement('div');
  widthProbe.setAttribute('aria-hidden','true');
  widthProbe.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:0;visibility:hidden;pointer-events:none;contain:strict';
  document.body.append(widthProbe);
  const layoutWidth = () => widthProbe.getBoundingClientRect().width || innerWidth;
  const background = [document.querySelector('.intro-content'),...document.querySelectorAll('.works-screen,[data-navigation-background]'),document.querySelector('.footer'),header.querySelector('.identity')].filter(Boolean);
  let scrollPosition = null;
  let inertBefore = [];
  let desiredOpen = false;
  let transition = null;
  let navigationFocus = null;
  let pendingAnchor = null;
  let headerMarker = null;
  let scrollbarWidth = 0;
  let iconTarget = 'menu';
  let iconInstantFrame = 0;
  const strokes = [...toggle.querySelectorAll('.menu-stroke')];
  const commitIcon = () => {
    for (const stroke of strokes) void getComputedStyle(stroke).transform;
  };
  const settleIcon = () => {
    cancelAnimationFrame(iconInstantFrame);
    toggle.dataset.iconInstant = 'true';
    toggle.dataset.menuIcon = iconTarget;
    commitIcon();
    iconInstantFrame = requestAnimationFrame(() => {
      delete toggle.dataset.iconInstant;
      iconInstantFrame = 0;
    });
  };
  const setIcon = (open,instant = false) => {
    iconTarget = open ? 'close' : 'menu';
    if (instant || reduced.matches || !mobile.matches || document.hidden) {settleIcon();return;}
    cancelAnimationFrame(iconInstantFrame);
    iconInstantFrame = 0;
    delete toggle.dataset.iconInstant;
    // The header has just been portalled. Commit its existing pose before
    // changing the target so native transitions survive that DOM move.
    commitIcon();
    toggle.dataset.menuIcon = iconTarget;
  };
  const headerGeometry = ['--menu-header-top','--menu-header-left','--menu-header-right','--menu-header-height','--menu-identity-left','--menu-identity-top','--menu-identity-scale','--menu-identity-opacity','--menu-toggle-top','--menu-toggle-right','--menu-toggle-width','--menu-toggle-height','--menu-icon-scale'];
  const mountMenuHeader = () => {
    const rect = header.getBoundingClientRect();
    const button = toggle.getBoundingClientRect();
    const identity = header.querySelector('.identity');
    const name = identity?.getBoundingClientRect();
    let nameOpacity = 1;
    for (let element=identity;element;element=element.parentElement) nameOpacity *= Number(getComputedStyle(element).opacity);
    const values = {
      '--menu-header-top':`${rect.top}px`,
      '--menu-header-left':`${rect.left}px`,
      '--menu-header-right':`${layoutWidth()-rect.right}px`,
      '--menu-header-height':`${rect.height}px`,
      '--menu-identity-left':`${name ? name.left-rect.left : 0}px`,
      '--menu-identity-top':`${name ? name.top-rect.top : 8}px`,
      '--menu-identity-scale':String(name && identity.offsetHeight ? name.height/identity.offsetHeight : 1),
      '--menu-identity-opacity':String(nameOpacity),
      '--menu-toggle-top':`${button.top-rect.top}px`,
      '--menu-toggle-right':`${rect.right-button.right}px`,
      '--menu-toggle-width':`${button.width}px`,
      '--menu-toggle-height':`${button.height}px`,
      '--menu-icon-scale':String(button.width/(parseFloat(getComputedStyle(toggle).getPropertyValue('--size-target'))||44))
    };
    for (const [property,value] of Object.entries(values)) header.style.setProperty(property,value);
    // A scene transform would otherwise make the fixed panel use the scene as its viewport.
    headerMarker = document.createComment('Mobile menu header position');
    header.before(headerMarker);
    document.body.append(header);
  };
  const restoreMenuHeader = () => {
    headerMarker?.replaceWith(header);
    headerMarker = null;
    headerGeometry.forEach(property => header.style.removeProperty(property));
  };
  const updateLockedWidth = () => {
    if (scrollPosition) document.body.style.setProperty('--menu-page-width',`${Math.max(0,layoutWidth()-scrollbarWidth)}px`);
  };
  document.addEventListener('focusin',event => {navigationFocus = header.contains(event.target) ? event.target : null;});
  const clearAnimation = () => {
    for (const element of [nav,...links,toggle]) {
      element.style.removeProperty('opacity');
      element.style.removeProperty('transform');
    }
    header.classList.remove('menu-animating','menu-closing');
  };
  const setVisible = (open,returnFocus = false) => {
    const expanded = mobile.matches && open;
    const wasOpen = header.classList.contains('menu-open');
    if (expanded === wasOpen) return;
    if (expanded) {
      scrollPosition = {x:scrollX,y:scrollY};
      scrollbarWidth = Math.max(0,layoutWidth()-document.body.getBoundingClientRect().width);
      document.body.style.setProperty('--menu-scroll-y',`${-scrollPosition.y}px`);
      updateLockedWidth();
      mountMenuHeader();
      inertBefore = background.map(element => element.inert);
      background.forEach(element => {element.inert = true;});
      header.setAttribute('role','dialog');
      header.setAttribute('aria-modal','true');
      header.setAttribute('aria-label',document.documentElement.lang==='ru'?'Меню навигации':'Navigation menu');
    }
    header.classList.toggle('menu-open',expanded);
    root.classList.toggle('mobile-menu-open',expanded);
    document.body.classList.toggle('mobile-menu-open',expanded);
    toggle.setAttribute('aria-expanded',String(expanded));
    toggle.setAttribute('aria-label',document.documentElement.lang==='ru' ? (expanded ? 'Закрыть меню' : 'Открыть меню') : (expanded ? 'Close menu' : 'Open menu'));
    if (!expanded) {
      restoreMenuHeader();
      background.forEach((element,index) => {element.inert = inertBefore[index];});
      header.setAttribute('role','banner');
      header.removeAttribute('aria-modal');
      header.removeAttribute('aria-label');
      document.body.style.removeProperty('--menu-scroll-y');
      document.body.style.removeProperty('--menu-page-width');
      if (scrollPosition) window.scrollTo(scrollPosition.x,scrollPosition.y);
      scrollPosition = null;
      if (returnFocus && mobile.matches) toggle.focus({preventScroll:true});
      window.portraitPlayer?.returnFromMenu?.();
      if (pendingAnchor) {
        const {target,hash} = pendingAnchor;
        pendingAnchor = null;
        if (location.hash !== hash) history.pushState(null,'',hash);
        const navigation = new CustomEvent('mobile:work-navigation',{detail:{target,hash},cancelable:true});
        window.dispatchEvent(navigation);
        if (!navigation.defaultPrevented) {
          target.scrollIntoView();
          (target.querySelector('#works-title') || target.querySelector('[tabindex="-1"]'))?.focus({preventScroll:true});
        }
      }
      window.dispatchEvent(new Event('mobile:menu-closed'));
    }
  };
  const settleTransition = () => {
    transition?.kill();
    transition = null;
    nav.inert = false;
    settleIcon();
    clearAnimation();
    if (!desiredOpen) setVisible(false,true);
  };
  const setOpen = (open,returnFocus = false,instant = false) => {
    open = mobile.matches && open;
    if (desiredOpen === open) return;
    // Reopening cancels the Work navigation attached to an abandoned close.
    if (open) pendingAnchor = null;
    desiredOpen = open;
    transition?.kill();
    transition = null;
    const animate = window.gsap && !reduced.matches && mobile.matches && !instant;
    header.classList.toggle('menu-closing',!open && !!animate);
    if (animate) header.classList.add('menu-animating');
    if (open) {
      const wasVisible = header.classList.contains('menu-open');
      nav.inert = false;
      setVisible(true);
      setIcon(true,instant);
      if (returnFocus) toggle.focus({preventScroll:true});
      if (!animate) {clearAnimation();return;}
      gsap.killTweensOf(menuLinks);
      if (!wasVisible) {
        gsap.set(nav,{opacity:0});
        gsap.set(menuLinks,{opacity:0,y:12});
      }
      transition = gsap.timeline({onComplete:() => {transition = null;clearAnimation();}})
        .to(nav,{opacity:1,duration:.28,ease:'power2.out'},0)
        .to(menuLinks,{opacity:1,y:0,duration:.32,stagger:.055,ease:'power3.out'},.07);
    } else {
      if (returnFocus && mobile.matches) toggle.focus({preventScroll:true});
      const finish = () => {
        transition = null;
        nav.inert = false;
        clearAnimation();
        setVisible(false,returnFocus);
      };
      if (!animate) {finish();setIcon(false,instant);return;}
      setIcon(false,instant);
      nav.inert = true;
      window.portraitPlayer?.prepareMenuPose?.();
      // Let every link leave in reverse order before fading the full-screen panel.
      transition = gsap.timeline({onComplete:() => {transition = null;clearAnimation();}})
        .to(menuLinks,{opacity:0,y:12,duration:.24,stagger:{each:.055,from:'end'},ease:'power3.in'},0)
        .to(nav,{opacity:0,duration:.28,ease:'power2.inOut'})
        .call(() => {nav.inert = false;setVisible(false,returnFocus);});
    }
  };
  toggle.addEventListener('click',() => setOpen(!desiredOpen,true));
  nav.addEventListener('click',event => {
    const link = event.target.closest('a');
    if (!link || !nav.contains(link) || event.defaultPrevented) return;
    if(link.getAttribute('aria-disabled')==='true'){event.preventDefault();return;}
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
    const controls = [toggle,...menuLinks.filter(link=>link.getAttribute('aria-disabled')!=='true')];
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
    if (!mobile.matches && (focusedToggle || (focusedLink && focused.classList.contains('mobile-only')))) links.find(link=>!link.classList.contains('mobile-only')&&link.getAttribute('aria-disabled')!=='true')?.focus({preventScroll:true});
  });
  reduced.addEventListener('change',() => {
    if (reduced.matches) {
      settleIcon();
      if (transition) settleTransition();
    }
  });
  window.addEventListener('resize',() => {
    updateLockedWidth();
    settleIcon();
    if (transition) settleTransition();
  },{passive:true});
  document.addEventListener('visibilitychange',() => {if (document.hidden) settleIcon();});
  const moveFocus = mobile.matches && root.classList.contains('mobile-navigation-fallback') && nav.contains(document.activeElement);
  clearTimeout(window.mobileNavigationDeadline);
  root.classList.remove('mobile-navigation-fallback');
  root.dataset.mobileNavReady = 'true';
  setIcon(false,true);
  if (moveFocus) toggle.focus({preventScroll:true});
  window.resolveMobileNavigationReady?.(true);
})();
