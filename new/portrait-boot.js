import {mountSeedancePortrait} from './portrait-spin.js?v=7ef58849bbba';

// This module starts independently of GSAP, LiquidGlass and the other page images.
const player=mountSeedancePortrait(document.querySelector('.portrait'),{manifestURL:'assets/seedance-manifest.json?v=19581afb45f9'});
window.portraitPlayer=player;
player.ready.then(ready=>window.resolvePortraitReady(ready),()=>window.resolvePortraitReady(false));
Promise.all([player.ready,window.portraitReveal]).then(([ready,revealed])=>{
  if(ready&&revealed)player.startIntro();
  else player.skipIntro();
},()=>player.skipIntro());

// Optional icon code never participates in the portrait/page reveal promise.
import('./campfire-player.js?v=cbd9421fb2bc').then(({mountCampfireFeature})=>{
  window.campfirePlayer=mountCampfireFeature(document.querySelector('.feature[data-node-id="85:47"]'),{
    portraitPlayer:player,manifestURL:'assets/campfire-v4-manifest.json?v=373bdf1a9cbc'
  });
}).catch(()=>{}); // The original icon remains visible if this optional module fails.
