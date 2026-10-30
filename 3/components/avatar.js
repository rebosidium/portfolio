import {mountSpinFeedback} from './avatar-spin-feedback.js?v=efff07e00737';
// The inline document shell owns immediate opening, focus and dismissal.
// This independent adapter adds playback without holding the modal behind imports.
const playerModule = /Android/i.test(navigator.userAgent) && matchMedia('(pointer:coarse)').matches
  ? '../portrait-player-android.js?v=605206950d5f' : '../portrait-player.js?v=c823f9def505';
const small=document.querySelector('[data-v3-avatar-small]');
const large=document.querySelector('[data-v3-avatar-large]');
const dialog=document.querySelector('.v3-avatar-dialog');
const shell=dialog.v3AvatarShell;
const spinButton=dialog.querySelector('.v3-avatar-spin');
mountSpinFeedback(spinButton);
const loader=dialog.querySelector('.v3-avatar-loader');
const loadingStatus=dialog.querySelector('.v3-avatar-loading-status');
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
const navigation=document.querySelector('.v3-mobile-menu');
const mobileNavigation=matchMedia('(max-width:767px), (max-width:1023px) and (pointer:coarse)');
const manifestURL=new URL('../assets/seedance-manifest.json?v=8196c33636fb',import.meta.url).href;
let mountPortrait,smallPlayer,largePlayer,largeState=null,moduleFailed=false;
let openGeneration=0,welcomeGeneration=-1,backgroundWelcomeGeneration=-1;
let preloadAllowed=false,preloadQueued=false;
let primaryPageReady=false,primaryIntroSettled=false,primaryState=null;

function syncLoading(){
 const ready=!!largeState?.ready,complete=ready&&!!largeState?.allReady;
 const loading=!reduced.matches&&!moduleFailed&&!largeState?.error&&!ready;
 loader.hidden=!loading;
 dialog.dataset.preloaded=String(complete);
 large.setAttribute('aria-busy',String(loading));
 spinButton.disabled=!complete||reduced.matches;
 const message=dialog.open?(loading?'Loading portrait…':complete?'Portrait ready.':''):'';
 if(loadingStatus.textContent!==message)loadingStatus.textContent=message;
}

function ensureLarge(){
 if(largePlayer||!mountPortrait||(!dialog.open&&!preloadAllowed))return largePlayer;
 // Retain one controller and frame set across closes. The width hint matches
 // CSS min() while the native dialog is display:none during preloading.
 largePlayer=mountPortrait(large,{
  interaction:'drag',manifestURL,paused:!dialog.open||shell.closing,retainQuality:true,
  displayWidth:()=>Math.max(1,Math.min(innerWidth*.86,innerHeight-140,860))
 });
 // Startup retains the original 90-frame buffer/70-frame welcome. Once a
 // hidden preload is usable, release decoded welcome frames and fetch the rest.
 largePlayer.subscribeLoading(state=>{
  largeState=state;syncLoading();
  if(state.ready&&!dialog.open&&backgroundWelcomeGeneration!==state.generation){
   backgroundWelcomeGeneration=state.generation;largePlayer.skipIntro();
  }
  welcomeIfReady();
 });
 return largePlayer;
}

const afterFirstPaint=shell.afterPaint;
function activateLarge(){
 if(!dialog.open||shell.closing)return;
 smallPlayer?.prepareMenuPose();
 const player=ensureLarge();if(!player)return;player.resume();
 welcomeIfReady();
}

function welcomeIfReady(){
 // Current-generation state recovers after reduced motion/quality changes;
 // the original one-shot ready promise may already have settled false.
 if(!largePlayer||!largeState?.ready||!dialog.open||dialog.hasAttribute('data-opening')||shell.closing||reduced.matches||welcomeGeneration===openGeneration)return;
 welcomeGeneration=openGeneration;largePlayer.startIntro({replay:true});
}

function canPreload(){
 // Readiness promises may settle false after cancellation or reduced motion.
 // Only the current successful thumbnail generation grants background work.
 return primaryPageReady&&primaryIntroSettled&&primaryState?.ready&&primaryState?.allReady&&!reduced.matches;
}
function queuePreload(){
 if(preloadQueued||!canPreload()||document.hidden||document.querySelector('.v3-mobile-menu[open]'))return;
 preloadQueued=true;
 const run=()=>{
  preloadQueued=false;
  if(document.hidden||!canPreload()||document.querySelector('.v3-mobile-menu[open]'))return;
  preloadAllowed=true;ensureLarge();
 };
 if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:2000});
 else setTimeout(run,600);
}

// The shell also works when this entire adapter is delayed by the network.
dialog.addEventListener('v3-avatar-opening',()=>{++openGeneration;syncLoading();});
dialog.addEventListener('v3-avatar-opened',activateLarge);
dialog.addEventListener('v3-avatar-closing',()=>{++openGeneration;largePlayer?.skipIntro();largePlayer?.pause();});
dialog.addEventListener('v3-avatar-closed',()=>{smallPlayer?.returnFromMenu();syncLoading();});
spinButton.addEventListener('click',()=>largePlayer?.spin?.(4));
reduced.addEventListener('change',()=>{syncLoading();if(!reduced.matches){if(dialog.open)afterFirstPaint(()=>{if(dialog.open&&!shell.closing){welcomeGeneration=-1;activateLarge();}});else queuePreload();}});
function syncBackgroundMotion(){dialog.toggleAttribute('data-background-paused',document.hidden);}
syncBackgroundMotion();
document.addEventListener('visibilitychange',()=>{syncBackgroundMotion();if(!document.hidden)queuePreload();});
function syncNavigationPortrait(){
 if(!navigation.open)return;
 // Reopening cancels the celebration immediately. Settle intro readiness before
 // pausing so an interrupted welcome turn cannot block background preloading.
 smallPlayer?.skipIntro();smallPlayer?.pause();
}
new MutationObserver(syncNavigationPortrait).observe(navigation,{attributes:true,attributeFilter:['open']});
navigation.addEventListener('close',()=>{
 // Native close events are queued; ignore one belonging to an already reopened menu.
 if(navigation.open)return;
 smallPlayer?.resume();
 const rect=small.getBoundingClientRect();
 if(mobileNavigation.matches&&!dialog.open&&!reduced.matches&&!document.hidden&&primaryState?.ready&&primaryState?.allReady&&rect.bottom>0&&rect.top<innerHeight){
  // Two quick turns plus a small overshoot, followed by a front-facing spring.
  // A cold/incomplete frame set is skipped rather than showing a page loader.
  if(smallPlayer?.spin(2.12,{duration:1200,returnToFront:true})){
   const canvas=small.querySelector('canvas');
   canvas.dataset.menuCloseSpinCount=String(Number(canvas.dataset.menuCloseSpinCount||0)+1);
  }
 }
 queuePreload();
});

const loaded=document.readyState==='complete'?Promise.resolve():new Promise(resolve=>addEventListener('load',resolve,{once:true}));
import(playerModule).then(({mountSeedancePortrait})=>{
 mountPortrait=mountSeedancePortrait;
 smallPlayer=mountPortrait(small,{interaction:'cursor',manifestURL});
 smallPlayer.ready.then(ready=>{if(ready)smallPlayer.startIntro();else smallPlayer.skipIntro();});
 syncNavigationPortrait();
 // The reused player supplies angle instructions; this button opens the modal.
 const updateLabel=()=>{if(small.getAttribute('aria-label')!=='Open full-screen portrait')small.setAttribute('aria-label','Open full-screen portrait');};
 new MutationObserver(updateLabel).observe(small,{attributes:true,attributeFilter:['aria-label']});updateLabel();
 if(dialog.open)afterFirstPaint(activateLarge);
 // Re-arm eligibility on each loading generation, including a preference or
 // density change. Settled false promises must never bypass the primary load.
 smallPlayer.subscribeLoading(state=>{primaryState=state;queuePreload();});
 smallPlayer.introFinished.then(()=>{primaryIntroSettled=true;queuePreload();});
 Promise.all([loaded,document.fonts?.ready]).then(()=>{primaryPageReady=true;queuePreload();});
}).catch(()=>{moduleFailed=true;syncLoading();});
