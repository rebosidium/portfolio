import {mountSeedancePortrait} from './portrait-spin.js?v=3ef86608411a';

// This module starts independently of GSAP, LiquidGlass and the other page images.
const player=mountSeedancePortrait(document.querySelector('.portrait'),{interaction:'cursor',manifestURL:'/new/assets/seedance-manifest.json?v=c6815470ab3d',mobileLayout:window.mobileLayout});
window.portraitPlayer=player;
player.ready.then(ready=>window.resolvePortraitReady(ready),()=>window.resolvePortraitReady(false));
Promise.all([player.ready,window.portraitReveal]).then(([ready,revealed])=>{
  if(ready&&revealed)player.startIntro();
  else player.skipIntro();
},()=>player.skipIntro());

// Optional icon code never participates in the portrait/page reveal promise.
import('/new/campfire-player.js?v=89b8bc1a7c6c').then(({mountFeatureIcons})=>{
  window.featureIconPlayers=mountFeatureIcons([
    {name:'medal',feature:document.querySelector('.feature[data-node-id="85:45"]'),id:'medal-bright-seedance-v3-q90-77f',prefix:'medal-bright-seedance-v3-q90-77f',manifestURL:'/new/assets/medal-bright-seedance-v3-q90-77f-manifest.json?v=2d03e9b92461',posters:{"120":"/new/assets/medal-bright-seedance-v3-q90-77f-poster-120.webp?v=dd1b95b67670","240":"/new/assets/medal-bright-seedance-v3-q90-77f-poster-240.webp?v=222b476bc0aa","480":"/new/assets/medal-bright-seedance-v3-q90-77f-poster-480.webp?v=65f52ea5de49"},leave:'freeze'},
    {name:'disco',feature:document.querySelector('.feature[data-node-id="85:46"]'),id:'disco-party-seedance-v3-q90-77f',prefix:'disco-party-seedance-v3-q90-77f',manifestURL:'/new/assets/disco-party-seedance-v3-q90-77f-manifest.json?v=eaf67077f089',posters:{"120":"/new/assets/disco-party-seedance-v3-q90-77f-poster-120.webp?v=b28c1b2fbe4b","240":"/new/assets/disco-party-seedance-v3-q90-77f-poster-240.webp?v=f417bd4ab646","480":"/new/assets/disco-party-seedance-v3-q90-77f-poster-480.webp?v=1853cdb6fb78"},leave:'freeze'},
    {name:'campfire',feature:document.querySelector('.feature[data-node-id="85:47"]'),id:'campfire-flame-only-seedance-v8-q90-77f',prefix:'campfire-flame-only-seedance-v8-q90-77f',manifestURL:'/new/assets/campfire-flame-only-seedance-v8-q90-77f-manifest.json?v=7156286b5ae6',posters:{"120":"/new/assets/campfire-flame-only-seedance-v8-q90-77f-poster-120.webp?v=4ab8e2bfb9ba","240":"/new/assets/campfire-flame-only-seedance-v8-q90-77f-poster-240.webp?v=daaa6997bec1","480":"/new/assets/campfire-flame-only-seedance-v8-q90-77f-poster-480.webp?v=8e104e301840"},leave:'freeze',renderedClass:'campfire-rendered'}
  ],{portraitPlayer:player,mobileLayout:window.mobileLayout});
  window.campfirePlayer=window.featureIconPlayers.players.campfire;
  window.resolveFeatureIconsReady(window.featureIconPlayers);
}).catch(()=>window.resolveFeatureIconsReady(null)); // Static icons remain visible if this optional module fails.
