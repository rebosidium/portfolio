import {mountAvatarAmbience} from './avatar-ambience.js?v=c236389323c7';
import {mountPortraitLoader} from './avatar-loading.js?v=7f155db9dbbf';
import {mountSpinFeedback} from './avatar-spin-feedback.js?v=d4db6ae56b10';
// The inline document shell owns immediate opening, focus and dismissal.
// This independent adapter adds playback without holding the modal behind imports.
// The head flag uses the same Android + coarse pointer test as the player choice.
const androidTouch=document.documentElement.hasAttribute('data-v3-android')||/Android/i.test(navigator.userAgent)&&matchMedia('(pointer:coarse)').matches;
const playerModule = androidTouch
  ? '../portrait-player-android.js?v=ba394c8423ee' : '../portrait-player.js?v=c9cdb5233e30';
const small=document.querySelector('[data-v3-avatar-small]');
const large=document.querySelector('[data-v3-avatar-large]');
const dialog=document.querySelector('.v3-avatar-dialog');
const shell=dialog.v3AvatarShell;
const spinButton=dialog.querySelector('.v3-avatar-spin');
mountSpinFeedback(spinButton);
const hideButton=dialog.querySelector('.v3-avatar-hide');
mountSpinFeedback(hideButton);hideButton.dataset.feedbackReady='true';
const loader=dialog.querySelector('.v3-avatar-loader');
mountPortraitLoader(large,loader);
const loadingStatus=dialog.querySelector('.v3-avatar-loading-status');
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
const navigation=document.querySelector('.v3-mobile-menu');
const mobileNavigation=matchMedia('(max-width:767px), (max-width:1023px) and (pointer:coarse)');
const manifestURL=new URL('../assets/seedance-manifest.json?v=c45a38e5741a',import.meta.url).href;
let mountPortrait,smallPlayer,largePlayer,largeState=null,moduleFailed=false;
let openGeneration=0,welcomeGeneration=-1,backgroundWelcomeGeneration=-1;
let preloadAllowed=false,preloadQueued=false,pageReady=false;
// The thumbnail state is only needed for the mobile menu-close spin.
let primaryState=null;

function syncLoading(){
 const ready=!!largeState?.ready,complete=ready&&!!largeState?.allReady;
 const loading=!reduced.matches&&!moduleFailed&&!largeState?.error&&!ready;
 loader.hidden=!loading;if(moduleFailed||largeState?.error||reduced.matches)delete large.dataset.welcomePending;
 dialog.dataset.preloaded=String(complete);
 large.setAttribute('aria-busy',String(loading));
 spinButton.disabled=!complete||reduced.matches;
 spinButton.title=ready&&!complete?'Downloading the remaining rotation views…':'';
 const message=dialog.open?(loading?'Loading portrait…':complete?'Portrait ready.':''):'';
 if(loadingStatus.textContent!==message)loadingStatus.textContent=message;
}

function ensureLarge(){
 if(largePlayer||!mountPortrait||(!dialog.open&&!preloadAllowed))return largePlayer;
 // Retain one controller and frame set across closes. The width hint matches
 // CSS min() while the native dialog is display:none during preloading.
 largePlayer=mountPortrait(large,{
  interaction:'drag',manifestURL,paused:!dialog.open||shell.closing,retainQuality:true,sequentialDownloads:true,
  displayWidth:()=>Math.max(1,Math.min(innerWidth*.86,innerHeight-140,860))
 });
 // Android fallback: no dynamic ambience layer, RAF loop or motion trails.
 if(!androidTouch)mountAvatarAmbience(dialog,large,spinButton);
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

function connectionAllowsPreload(){
 const connection=navigator.connection;
 return !connection?.saveData&&!['slow-2g','2g','3g'].includes(connection?.effectiveType);
}
function canPreload(){
 // Last in line: after window load, fonts and the main entrance content. It
 // never waits for (or depends on) the thumbnail. Opening the dialog mounts
 // the player on its own; hover, focus and pointerdown never warm it.
 return !reduced.matches&&connectionAllowsPreload()&&pageReady;
}
function beginPreload(){
 // The player module may still be loading; its import requeues this.
 if(!mountPortrait||!canPreload()||document.hidden||navigation.open)return;
 preloadAllowed=true;ensureLarge();
}
function queuePreload(){
 if(preloadQueued||preloadAllowed||!mountPortrait||!canPreload()||document.hidden||navigation.open)return;
 preloadQueued=true;
 const run=()=>{preloadQueued=false;beginPreload();};
 if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:2000});
 else setTimeout(run,600);
}
navigator.connection?.addEventListener?.('change',queuePreload);

// The shell also works when this entire adapter is delayed by the network.
dialog.addEventListener('v3-avatar-opening',()=>{++openGeneration;if(!reduced.matches)large.dataset.welcomePending='';syncLoading();});
dialog.addEventListener('v3-avatar-opened',activateLarge);
dialog.addEventListener('v3-avatar-closing',()=>{++openGeneration;largePlayer?.skipIntro();largePlayer?.pause();});
dialog.addEventListener('v3-avatar-closed',()=>{delete large.dataset.welcomePending;smallPlayer?.returnFromMenu();syncLoading();});
// A deliberate action wins over the deferred welcome, including the two
// painted-frame opening gap. Never let autoplay replace a just-started spin.
function claimLargeInteraction(){if(dialog.open&&largeState?.ready)welcomeGeneration=openGeneration;}
large.addEventListener('pointerdown',claimLargeInteraction,{capture:true,passive:true});
large.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home'].includes(event.key))claimLargeInteraction();},{capture:true});
spinButton.addEventListener('click',()=>{claimLargeInteraction();largePlayer?.spin?.(4);});
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
// Independent of the player import order: whichever finishes last queues it.
Promise.all([loaded,document.fonts?.ready,window.v3Entrance?.contentReady]).then(()=>{pageReady=true;queuePreload();});
import(playerModule).then(({mountSeedancePortrait})=>{
 mountPortrait=mountSeedancePortrait;
 smallPlayer=mountPortrait(small,{interaction:'cursor',manifestURL,fixedVariant:'240-dark'});
 smallPlayer.ready.then(async ready=>{await window.v3Entrance?.headerReady;if(ready)smallPlayer.startIntro();else smallPlayer.skipIntro();});
 syncNavigationPortrait();
 // The reused player supplies angle instructions; this button opens the modal.
 const updateLabel=()=>{if(small.getAttribute('aria-label')!=='Open full-screen portrait')small.setAttribute('aria-label','Open full-screen portrait');};
 new MutationObserver(updateLabel).observe(small,{attributes:true,attributeFilter:['aria-label']});updateLabel();
 if(dialog.open)afterFirstPaint(activateLarge);
 // The thumbnail state only gates the menu-close spin. The large preload is
 // queued here too in case the page became ready before this import.
 smallPlayer.subscribeLoading(state=>{primaryState=state;});
 queuePreload();
}).catch(()=>{moduleFailed=true;syncLoading();});
