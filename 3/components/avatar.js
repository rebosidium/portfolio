// Independent v3 adapter. Register interaction before importing the frame
// player so a cold module request cannot swallow the user's first tap.
const playerModule = /Android/i.test(navigator.userAgent) && matchMedia('(pointer:coarse)').matches
  ? '../portrait-player-android.js?v=35b745c0aced' : '../portrait-player.js?v=8a4d8472576d';
const small=document.querySelector('[data-v3-avatar-small]');
const large=document.querySelector('[data-v3-avatar-large]');
const dialog=document.querySelector('.v3-avatar-dialog');
const viewer=dialog.querySelector('.v3-avatar-viewer');
const hide=dialog.querySelector('.v3-avatar-hide');
const spinButton=dialog.querySelector('.v3-avatar-spin');
const loader=dialog.querySelector('.v3-avatar-loader');
const loadingStatus=dialog.querySelector('.v3-avatar-loading-status');
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
const manifestURL=new URL('../assets/seedance-manifest.json?v=8196c33636fb',import.meta.url).href;
let mountPortrait,smallPlayer,largePlayer,largeState=null,moduleFailed=false;
let locked=null,closing=false,animation=null,gesture=null,openGeneration=0;
let preloadAllowed=false,preloadQueued=false;
let primaryPageReady=false,primaryIntroSettled=false,primaryState=null;

function syncLoading(){
 const complete=!!largeState?.ready&&!!largeState?.allReady;
 const loading=!reduced.matches&&!moduleFailed&&!largeState?.error&&!complete;
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
  interaction:'drag',manifestURL,initialAngle:0,paused:!dialog.open||closing,retainQuality:true,
  displayWidth:()=>Math.max(1,Math.min(innerWidth*.86,innerHeight-140,860))
 });
 largePlayer.skipIntro();
 largePlayer.subscribeLoading(state=>{largeState=state;syncLoading();});
 return largePlayer;
}

function afterFirstPaint(callback){
 requestAnimationFrame(()=>requestAnimationFrame(callback));
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

function lock(){
 const properties=['position','top','left','right','width'];
 locked={x:scrollX,y:scrollY,overflow:document.documentElement.style.overflow,styles:properties.map(p=>[p,document.body.style.getPropertyValue(p)])};
 // Preserve content width before removing classic (non-overlay) scrollbars.
 const layoutWidth=document.body.getBoundingClientRect().width;
 document.documentElement.style.overflow='hidden';Object.assign(document.body.style,{position:'fixed',top:-locked.y+'px',left:'0',right:'0',width:layoutWidth+'px'});
}
function unlock(){
 if(!locked)return;const saved=locked;locked=null;document.documentElement.style.overflow=saved.overflow;
 for(const [p,v]of saved.styles){if(v)document.body.style.setProperty(p,v);else document.body.style.removeProperty(p);}
 scrollTo(saved.x,saved.y);
}
function open(){
 if(dialog.open||closing)return;
 const generation=++openGeneration;
 lock();dialog.showModal();closing=false;syncLoading();
 // Paint glass, poster and loader first; decoder setup follows one painted frame.
 // The native modal also makes the thumbnail inert during repeated mobile taps.
 if(!reduced.matches)animation=viewer.animate([{opacity:.4,transform:'scale(.98)'},{opacity:1,transform:'scale(1)'}],{duration:240,easing:'cubic-bezier(.22,1,.36,1)'});
 dialog.focus({preventScroll:true});
 afterFirstPaint(()=>{
  if(!dialog.open||closing||generation!==openGeneration)return;
  smallPlayer?.prepareMenuPose();
  ensureLarge()?.resume();
 });
}
async function close(){
 if(!dialog.open||closing)return;
 closing=true;++openGeneration;animation?.cancel();largePlayer?.pause();
 if(!reduced.matches){
  animation=viewer.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.96)'}],{duration:220,easing:'ease-in'});
  try{await animation.finished;}catch{}
 }
 dialog.close();animation?.cancel();animation=null;
 unlock();smallPlayer?.returnFromMenu();small.dataset.returnFocus='true';small.focus({preventScroll:true});closing=false;
 syncLoading();
}

small.addEventListener('pointerdown',e=>{gesture={x:e.clientX,y:e.clientY,moved:false};},{capture:true});
small.addEventListener('pointermove',e=>{if(gesture&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>6)gesture.moved=true;},{capture:true});
small.addEventListener('click',e=>{if(e.detail!==0&&gesture?.moved){e.preventDefault();return;}open();});
hide.addEventListener('click',close);
spinButton.addEventListener('click',()=>largePlayer?.spin?.(4));
dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
// No backdrop-click dismissal: Hide and Escape are the only close actions,
// so a second impatient tap cannot undo the initial mobile opening.
dialog.addEventListener('keydown',e=>{
 if(e.key!=='Tab')return;
 const controls=[...(large.hasAttribute('tabindex')?[large]:[]),...(!spinButton.disabled?[spinButton]:[]),hide];
 const i=controls.indexOf(document.activeElement);e.preventDefault();controls[i<0?(e.shiftKey?controls.length-1:0):(i+(e.shiftKey?-1:1)+controls.length)%controls.length].focus({preventScroll:true});
});
small.addEventListener('blur',()=>{delete small.dataset.returnFocus;});
document.addEventListener('keydown',event=>{if(['Tab','ArrowLeft','ArrowRight'].includes(event.key))delete small.dataset.returnFocus;});
reduced.addEventListener('change',()=>{syncLoading();if(!reduced.matches){if(dialog.open)afterFirstPaint(()=>{if(dialog.open&&!closing)ensureLarge()?.resume();});else queuePreload();}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)queuePreload();});
document.querySelector('.v3-mobile-menu').addEventListener('close',queuePreload);

const loaded=document.readyState==='complete'?Promise.resolve():new Promise(resolve=>addEventListener('load',resolve,{once:true}));
import(playerModule).then(({mountSeedancePortrait})=>{
 mountPortrait=mountSeedancePortrait;
 smallPlayer=mountPortrait(small,{interaction:'cursor',manifestURL});
 smallPlayer.ready.then(ready=>{if(ready)smallPlayer.startIntro();else smallPlayer.skipIntro();});
 // The reused player supplies angle instructions; this button opens the modal.
 const updateLabel=()=>{if(small.getAttribute('aria-label')!=='Open full-screen portrait')small.setAttribute('aria-label','Open full-screen portrait');};
 new MutationObserver(updateLabel).observe(small,{attributes:true,attributeFilter:['aria-label']});updateLabel();
 if(dialog.open)afterFirstPaint(()=>{if(dialog.open&&!closing){smallPlayer.prepareMenuPose();ensureLarge()?.resume();}});
 // Re-arm eligibility on each loading generation, including a preference or
 // density change. Settled false promises must never bypass the primary load.
 smallPlayer.subscribeLoading(state=>{primaryState=state;queuePreload();});
 smallPlayer.introFinished.then(()=>{primaryIntroSettled=true;queuePreload();});
 Promise.all([loaded,document.fonts?.ready]).then(()=>{primaryPageReady=true;queuePreload();});
}).catch(()=>{moduleFailed=true;syncLoading();});
