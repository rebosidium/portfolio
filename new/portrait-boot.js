const originalPlayerURL = '/new/portrait-spin.js?v=65ea00150436';
// Preload and execution share the same decision. A failed Android module falls
// back to the original player without leaving the page's readiness gate pending.
const {mountSeedancePortrait} = await import(window.portraitModuleURL || originalPlayerURL)
  .catch(() => import(originalPlayerURL));

// This module starts independently of GSAP, LiquidGlass and the other page images.
const player=mountSeedancePortrait(document.querySelector('.portrait'),{interaction:'cursor',manifestURL:'/new/assets/seedance-manifest.json?v=c6815470ab3d',mobileLayout:window.mobileLayout,mobileScrollStart:.28});
window.portraitPlayer=player;
player.ready.then(ready=>window.resolvePortraitReady(ready),()=>window.resolvePortraitReady(false));
Promise.all([player.ready,window.portraitReveal]).then(([ready,revealed])=>{
  if(ready&&revealed)player.startIntro();
  else player.skipIntro();
},()=>player.skipIntro());

// These three illustrations are static; no feature animation module or frames are loaded.
window.resolveFeatureIconsReady(null);
