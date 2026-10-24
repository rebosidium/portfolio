const originalPlayerURL = './portrait-spin.js?v=0e29002a6527';
try {
  const {mountSeedancePortrait} = await import(window.portraitModuleURL || originalPlayerURL)
    .catch(() => import(originalPlayerURL));
  const player = mountSeedancePortrait(document.querySelector('.portrait'),{
    interaction:'cursor',manifestURL:'/assets/seedance-manifest.json?v=64040251e805',
    mobileLayout:window.mobileLayout,mobileScrollStart:.28,
    mobileCoverTop:() => document.documentElement.classList.contains('mobile-overlap')
      ? document.querySelector('.works-screen')?.getBoundingClientRect().top ?? null : null
  });
  window.portraitPlayer = player;
  player.ready.then(window.resolvePortraitReady,() => window.resolvePortraitReady(false));
  Promise.all([player.ready,window.portraitReveal]).then(([ready,revealed]) => {
    if (ready && revealed) player.startIntro();
    else player.skipIntro();
  },() => player.skipIntro());
} catch {
  window.resolvePortraitReady(false);
}
