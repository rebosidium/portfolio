import {mountSeedancePortrait} from './portrait-spin.js?v=cdfbd408980b';

// This module starts independently of GSAP, LiquidGlass and the other page images.
const player=mountSeedancePortrait(document.querySelector('.portrait'),{interaction:'cursor',manifestURL:'assets/seedance-manifest.json?v=19581afb45f9'});
window.portraitPlayer=player;
player.ready.then(ready=>window.resolvePortraitReady(ready),()=>window.resolvePortraitReady(false));
Promise.all([player.ready,window.portraitReveal]).then(([ready,revealed])=>{
  if(ready&&revealed)player.startIntro();
  else player.skipIntro();
},()=>player.skipIntro());

// Optional icon code never participates in the portrait/page reveal promise.
import('./campfire-player.js?v=65c51ac1cd50').then(({mountFeatureIcons})=>{
  window.featureIconPlayers=mountFeatureIcons([
    {name:'medal',feature:document.querySelector('.feature[data-node-id="85:45"]'),id:'medal-bright-seedance-v2',prefix:'medal-bright-seedance-v2',manifestURL:'assets/medal-bright-seedance-v2-manifest.json?v=4c39630fe974',posters:{"120":"assets/medal-bright-seedance-v2-poster-120.webp?v=285110679fe1","240":"assets/medal-bright-seedance-v2-poster-240.webp?v=cf40cbc004d4","480":"assets/medal-bright-seedance-v2-poster-480.webp?v=cc2c7084ab00"},leave:'freeze'},
    {name:'disco',feature:document.querySelector('.feature[data-node-id="85:46"]'),id:'disco-party-seedance-v2',prefix:'disco-party-seedance-v2',manifestURL:'assets/disco-party-seedance-v2-manifest.json?v=27a38e39a579',posters:{"120":"assets/disco-party-seedance-v2-poster-120.webp?v=83b1cee6cb49","240":"assets/disco-party-seedance-v2-poster-240.webp?v=c8d4ab37205d","480":"assets/disco-party-seedance-v2-poster-480.webp?v=0984a22406ee"},leave:'freeze'},
    {name:'campfire',feature:document.querySelector('.feature[data-node-id="85:47"]'),id:'campfire-flame-only-seedance-v7',prefix:'campfire-flame-only-seedance-v7',manifestURL:'assets/campfire-flame-only-seedance-v7-manifest.json?v=6e4909efd963',posters:{"120":"assets/campfire-flame-only-seedance-v7-poster-120.webp?v=4ebe75c5ca6e","240":"assets/campfire-flame-only-seedance-v7-poster-240.webp?v=180eb9dc9c3b","480":"assets/campfire-flame-only-seedance-v7-poster-480.webp?v=3ce968b9e650"},leave:'freeze',renderedClass:'campfire-rendered'}
  ],{portraitPlayer:player,mobileLayout:window.mobileLayout});
  window.campfirePlayer=window.featureIconPlayers.players.campfire;
}).catch(()=>{}); // Static icons remain visible if this optional module fails.
