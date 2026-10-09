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
import('./campfire-player.js?v=2eefbf485273').then(({mountFeatureIcons})=>{
  window.featureIconPlayers=mountFeatureIcons([
    {name:'medal',feature:document.querySelector('.feature[data-node-id="85:45"]'),id:'medal-shimmer-approved-v1',prefix:'medal-shimmer-v1',manifestURL:'assets/medal-shimmer-v1-manifest.json?v=0ee3512d854a'},
    {name:'disco',feature:document.querySelector('.feature[data-node-id="85:46"]'),id:'disco-brighter-approved-v1',prefix:'disco-brighter-v1',manifestURL:'assets/disco-brighter-v1-manifest.json?v=68bd46b892b1'},
    {name:'campfire',feature:document.querySelector('.feature[data-node-id="85:47"]'),id:'campfire-approved-v4',prefix:'campfire-v4',manifestURL:'assets/campfire-v4-manifest.json?v=373bdf1a9cbc',leave:'freeze',renderedClass:'campfire-rendered'}
  ],{portraitPlayer:player});
  window.campfirePlayer=window.featureIconPlayers.players.campfire;
}).catch(()=>{}); // Static icons remain visible if this optional module fails.
