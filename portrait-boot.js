const originalPlayerURL = './portrait-spin.js?v=1372a4d2bc18';
try {
  const {mountSeedancePortrait} = await import(window.portraitModuleURL || originalPlayerURL)
    .catch(() => import(originalPlayerURL));
  const player = mountSeedancePortrait(document.querySelector('.portrait'),{
    interaction:'cursor',manifestURL:'assets/seedance-manifest.json?v=a7b4800252fb',
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
