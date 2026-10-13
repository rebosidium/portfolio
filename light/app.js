(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const navigation = [...document.querySelectorAll('.header > a,.header nav a')];
  const portrait = document.querySelector('.portrait');
  const copy = [...document.querySelector('.introduction').children];
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
})();
