import {mountSeedancePortrait} from '/new/portrait-spin.js?v=c02d38248226';

// This module starts independently of GSAP, LiquidGlass and the other page images.
const player=mountSeedancePortrait(document.querySelector('.portrait'),{interaction:'cursor',manifestURL:'/new/assets/seedance-manifest.json?v=c6815470ab3d',mobileLayout:window.mobileLayout});
window.portraitPlayer=player;
player.ready.then(ready=>window.resolvePortraitReady(ready),()=>window.resolvePortraitReady(false));
Promise.all([player.ready,window.portraitReveal]).then(([ready,revealed])=>{
  if(ready&&revealed)player.startIntro();
  else player.skipIntro();
},()=>player.skipIntro());

// These three illustrations are static; no feature animation module or frames are loaded.
window.resolveFeatureIconsReady(null);
