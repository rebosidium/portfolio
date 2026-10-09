import {mountSeedancePortrait} from './portrait-spin.js?v=54b6d1309754';

// This module starts independently of GSAP, LiquidGlass and the other page images.
const player=mountSeedancePortrait(document.querySelector('.portrait'),{manifestURL:'assets/seedance-manifest.json?v=19581afb45f9'});
window.portraitPlayer=player;
player.ready.then(ready=>window.resolvePortraitReady(ready),()=>window.resolvePortraitReady(false));
Promise.all([player.ready,window.portraitReveal]).then(([ready,revealed])=>{
  if(ready&&revealed)player.startIntro();
  else player.skipIntro();
},()=>player.skipIntro());
