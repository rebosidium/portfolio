const originalPlayerURL = './portrait-spin.js?v=65ea00150436';
try {
  const {mountSeedancePortrait} = await import(window.portraitModuleURL || originalPlayerURL)
    .catch(() => import(originalPlayerURL));
  const player = mountSeedancePortrait(document.querySelector('.portrait'),{
    interaction:'cursor',manifestURL:'assets/seedance-manifest.json?v=c6815470ab3d',
    mobileLayout:window.mobileLayout,mobileScrollStart:.28
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
