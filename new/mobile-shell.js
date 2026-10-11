// Mobile controls must not wait for deferred animation libraries or portrait ZIPs.
(() => {
  const mobile = window.mobileLayout;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!mobile.matches) return;
  const root = document.documentElement;
  // This gate exists before deferred app.js, including its failure/slow-load path.
  const material = window.mobilePromoMaterialState = {settled:false,ready:false};
  window.mobilePromoMaterialReady = new Promise(resolve => {
    material.settle = ready => {
      if (material.settled) return;
      material.settled = true;
      material.ready = ready;
      // Restore a timed-out component before the entrance reads its visual nodes.
      if (!ready) material.restore?.();
      delete material.restore;
      clearTimeout(material.deadline);
      clearTimeout(window.glassRevealFallback);
      root.classList.remove('glass-pending');
      resolve(ready);
    };
    material.deadline = setTimeout(() => material.settle(false),1600);
  });
  clearTimeout(window.glassRevealFallback);
  const promo = document.querySelector('.promo');
  const close = promo.querySelector('.promo-close');
  const release = window.releaseMobileShell;
  let entrances = [], ctaTimer, settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    entrances.forEach(animation => animation.cancel());
    clearTimeout(ctaTimer);
    clearTimeout(window.mobileShellFallback);
    release?.();
    close.removeEventListener('click',finish);
    mobile.removeEventListener('change',change);
    reduced.removeEventListener('change',change);
  };
  const change = () => {if (!mobile.matches || reduced.matches) finish();};
  window.releaseMobileShell = finish;
  close.addEventListener('click',finish);
  mobile.addEventListener('change',change);
  reduced.addEventListener('change',change);
  if (!window.promoControlsReady) {
    const dismiss = event => {
      promo.hidden = true;
      root.style.setProperty('--promo-space','0px');
      if (event.detail === 0) window.mobileHeaderReady.then(() => document.querySelector('.identity').focus({preventScroll:true}));
      else close.blur();
    };
    close.addEventListener('click',dismiss);
    window.releaseMobilePromoClose = () => close.removeEventListener('click',dismiss);
  }
  const bounded = (promise,ms) => Promise.race([promise,new Promise(resolve => setTimeout(resolve,ms))]);
  const ease = 'cubic-bezier(.22,.61,.36,1)';
  const animate = (element,from,to,duration,delay = 0) => {
    const animation = element.animate([from,to],{duration,delay,easing:ease,fill:'backwards'});
    entrances.push(animation);
    return animation;
  };
  const waitAnimations = animations => Promise.all(animations.map(animation => animation.finished.catch(() => {})));
  const image = promo.querySelector('.promo-illustration');
  const illustrationReady = image.decode().catch(() => {}).then(() => image.classList.add('image-ready'));
  const fontReady = document.fonts?.load('600 20px Manrope').catch(() => {});
  if (reduced.matches) finish();
  Promise.all([bounded(illustrationReady,800),bounded(fontReady,800)]).then(async () => {
    if (settled) return;
    const tokens = getComputedStyle(root);
    const requested = new URLSearchParams(location.search).get('banner');
    const variant = ['audit','work','consulting'].includes(requested) ? requested : 'audit';
    const color = tokens.getPropertyValue(`--${variant}`).trim();
    promo.style.backgroundColor = color;
    const bannerAnimations = [
      animate(promo,{backgroundColor:tokens.getPropertyValue('--canvas').trim()},{backgroundColor:color},1050),
      animate(image,{opacity:0,transform:'translateY(8px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'},850,120),
      animate(promo.querySelector('.promo-text'),{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'},900,200),
      animate(close,{opacity:0},{opacity:.4},650,160)
    ];
    root.classList.remove('mobile-promo-pending');
    const ctaEntrance = new Promise(resolve => {
      ctaTimer = setTimeout(async () => {
        await window.mobilePromoMaterialReady;
        if (settled) {resolve();return;}
        const action = promo.querySelector('.promo-action');
        const label = promo.querySelector('.promo-label,.lg-button__label');
        const surface = label.closest('.promo-button') || action;
        // The material and filter stay opaque; fade the label and border separately.
        const animations = [
          animate(label,{opacity:0,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'},650),
          animate(surface,{borderColor:'rgba(255,255,255,0)'},{borderColor:'rgba(255,255,255,.4)'},650),
          animate(action,{transform:'translateY(6px)'},{transform:'translateY(0)'},650)
        ];
        root.classList.add('mobile-shell-ready');
        await waitAnimations(animations);
        resolve();
      },440);
    });
    await waitAnimations(bannerAnimations);
    if (settled) return;
    await window.mobileNavigationReady;
    const headerAnimations = [
      animate(document.querySelector('.identity'),{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'},500),
      animate(document.querySelector('.menu-toggle'),{opacity:0},{opacity:1},500,70),
      animate(document.querySelector('.menu-icon'),{transform:'translateY(6px)'},{transform:'translateY(0)'},500,70)
    ];
    root.classList.add('mobile-header-ready');
    root.classList.remove('mobile-shell-pending');
    await Promise.all([waitAnimations(headerAnimations),ctaEntrance]);
  }).then(() => {
    finish();
  }).catch(finish);
})();
