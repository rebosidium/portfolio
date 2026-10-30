// Own v3 adapter around the approved source player and unchanged frame archives.
const playerModule = /Android/i.test(navigator.userAgent) && matchMedia('(pointer:coarse)').matches
  ? '../portrait-player-android.js?v=a7166b22430d' : '../portrait-player.js?v=cdc1ffc2a0c6';
const {mountSeedancePortrait} = await import(playerModule);
const small=document.querySelector('[data-v3-avatar-small]');
const large=document.querySelector('[data-v3-avatar-large]');
const dialog=document.querySelector('.v3-avatar-dialog');
const viewer=dialog.querySelector('.v3-avatar-viewer');
const hide=dialog.querySelector('.v3-avatar-hide');
const spinButton=dialog.querySelector('.v3-avatar-spin');
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
const manifestURL=new URL('../assets/seedance-manifest.json?v=8196c33636fb',import.meta.url).href;
const smallPlayer=mountSeedancePortrait(small,{interaction:'cursor',manifestURL});
smallPlayer.ready.then(ready=>{if(ready)smallPlayer.startIntro();else smallPlayer.skipIntro();});
// The reused player supplies angle instructions; the small stage opens a dialog.
new MutationObserver(()=>{if(small.getAttribute('aria-label')!=='Open full-screen portrait')small.setAttribute('aria-label','Open full-screen portrait');}).observe(small,{attributes:true,attributeFilter:['aria-label']});
small.setAttribute('aria-label','Open full-screen portrait');
let largePlayer=null,locked=null,closing=false,animation=null,gesture=null;
function lock(){
 const properties=['position','top','left','right','width'];
 locked={x:scrollX,y:scrollY,overflow:document.documentElement.style.overflow,styles:properties.map(p=>[p,document.body.style.getPropertyValue(p)])};
 // Preserve content width before removing classic (non-overlay) scrollbars.
 const layoutWidth=document.body.getBoundingClientRect().width;
 document.documentElement.style.overflow='hidden';Object.assign(document.body.style,{position:'fixed',top:`${-locked.y}px`,left:'0',right:'0',width:`${layoutWidth}px`});
}
function unlock(){
 if(!locked)return;const saved=locked;locked=null;document.documentElement.style.overflow=saved.overflow;
 for(const [p,v]of saved.styles){if(v)document.body.style.setProperty(p,v);else document.body.style.removeProperty(p);}
 scrollTo(saved.x,saved.y);
}
function open(){
 if(dialog.open)return;
 lock();dialog.showModal();smallPlayer.prepareMenuPose();
 closing=false;spinButton.disabled=true;
 largePlayer=mountSeedancePortrait(large,{interaction:'drag',manifestURL,initialAngle:0});
 // A user-requested large view starts at the front, without predecoding an intro.
 largePlayer.skipIntro();
 const current=largePlayer;
 current.subscribeLoading(state=>{if(largePlayer===current)spinButton.disabled=!state.allReady||reduced.matches;});
 if(!reduced.matches)animation=viewer.animate([{opacity:0,transform:'scale(.94)'},{opacity:1,transform:'scale(1)'}],{duration:320,easing:'cubic-bezier(.22,1,.36,1)'});
 dialog.focus({preventScroll:true});
}
async function close(){
 if(!dialog.open||closing)return;closing=true;animation?.cancel();
 if(!matchMedia('(prefers-reduced-motion:reduce)').matches){
  animation=viewer.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.96)'}],{duration:220,easing:'ease-in'});
  try{await animation.finished;}catch{}
 }
 largePlayer?.destroy();largePlayer=null;dialog.close();animation?.cancel();animation=null;
 unlock();smallPlayer.returnFromMenu();small.dataset.returnFocus='true';small.focus({preventScroll:true});closing=false;
}
small.addEventListener('pointerdown',e=>{gesture={x:e.clientX,y:e.clientY,moved:false};},{capture:true});
small.addEventListener('pointermove',e=>{if(gesture&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>6)gesture.moved=true;},{capture:true});
small.addEventListener('click',e=>{if(e.detail!==0&&gesture?.moved){e.preventDefault();return;}open();});
hide.addEventListener('click',close);
spinButton.addEventListener('click',()=>largePlayer?.spin?.(4));
dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
dialog.addEventListener('click',e=>{if(e.target===dialog)close();});
dialog.addEventListener('keydown',e=>{
 if(e.key!=='Tab')return;
 const controls=[...(large.hasAttribute('tabindex')?[large]:[]),...(!spinButton.disabled?[spinButton]:[]),hide];
 const i=controls.indexOf(document.activeElement);e.preventDefault();controls[i<0?(e.shiftKey?controls.length-1:0):(i+(e.shiftKey?-1:1)+controls.length)%controls.length].focus({preventScroll:true});
});
// Both original players own pagehide/pageshow and bfcache restoration.
// Destroy the large instance only when its dialog closes.

small.addEventListener('blur',()=>{delete small.dataset.returnFocus;});
document.addEventListener('keydown',event=>{if(['Tab','ArrowLeft','ArrowRight'].includes(event.key))delete small.dataset.returnFocus;});
