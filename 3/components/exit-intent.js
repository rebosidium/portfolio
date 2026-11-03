// The local Ouibounce fork owns exit detection. This adapter owns eligibility,
// native-dialog lifecycle and the two existing portfolio actions.
import './vendor/ouibounce.js?v=c6e4a5d869cb';
import {mountExitGradient} from './exit-gradient.js?v=89e29b2b867a';

const dialog=document.getElementById('v3-exit-dialog');
if(dialog){
  mountExitGradient(dialog.querySelector('.v3-exit__art'),dialog.querySelector('.v3-exit__art .v3-contact__field'),{dialog});
  const desktop=matchMedia('(min-width:1024px) and (hover:hover) and (pointer:fine)');
  const desktopInput=matchMedia('(hover:hover) and (pointer:fine)');
  const closeButton=dialog.querySelector('[data-v3-exit-close]');
  const resume=dialog.querySelector('[data-v3-exit-resume]');
  const game=dialog.querySelector('[data-v3-exit-game]');
  const MIN_VISIT_MS=2000;
  const EXIT_EDGE_PX=50,EXIT_DELAY_MS=40,EARLY_EDGE_PX=32;
  // Temporary public testing: restore7 here to remember successful shows.
  const REMEMBER_DAYS=0;
  const repeatPreview=['127.0.0.1','localhost','[::1]'].includes(location.hostname)
    &&document.documentElement.hasAttribute('data-v3-exit-repeat');
  const repeat=repeatPreview||REMEMBER_DAYS===0;
  let detector=null,armedTimer=0,intentTimer=0,lastPointerY=null,upwardTravel=0,shown=false,suspended=false,locked=null,previousFocus=null,imagesReady=false,imageWarmup=null;

  const setState=state=>{dialog.dataset.exitState=state;};
  const eligible=()=>desktop.matches&&!document.hidden&&!suspended;
  const canOpen=()=>eligible()&&performance.now()>=MIN_VISIT_MS&&imagesReady&&!shown&&!dialog.open
    &&!document.querySelector('dialog[open]')
    &&!document.querySelector('.v3-avatar-dialog')?.v3AvatarShell?.closing;

  function detach(){
    clearTimeout(armedTimer);armedTimer=0;
    resetIntent();
    detector?.destroy();detector=null;
  }
  function resetIntent(){
    clearTimeout(intentTimer);intentTimer=0;lastPointerY=null;upwardTravel=0;
  }
  const saveStyle=(element,name)=>({element,name,value:element.style.getPropertyValue(name),priority:element.style.getPropertyPriority(name)});
  function lock(){
    const root=document.documentElement,body=document.body;
    locked={x:scrollX,y:scrollY,styles:[saveStyle(root,'overflow'),saveStyle(body,'padding-right')]};
    const gutter=Math.max(0,innerWidth-root.clientWidth);
    if(gutter)body.style.paddingRight=(parseFloat(getComputedStyle(body).paddingRight)+gutter)+'px';
    root.style.overflow='hidden';
  }
  function unlock(){
    if(!locked)return;
    const saved=locked;locked=null;
    for(const {element,name,value,priority} of saved.styles){
      if(value)element.style.setProperty(name,value,priority);else element.style.removeProperty(name);
    }
    scrollTo(saved.x,saved.y);
  }
  function close({restoreFocus=true}={}){
    if(!dialog.open&&!locked)return;
    if(dialog.open)dialog.close();
    unlock();
    if(restoreFocus&&previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
    previousFocus=null;
    if(repeat)shown=false;
    setState(shown?'shown':eligible()?'waiting':'disabled');
    if(repeat&&eligible())setTimeout(sync,0);
  }
  function open(){
    // beforeFire has already checked this synchronously. No event/async boundary
    // separates the guard from opening, so suppression is only consumed on show.
    previousFocus=document.activeElement;
    lock();
    try{dialog.showModal();}catch(error){unlock();throw error;}
    shown=true;setState('open');dialog.focus({preventScroll:true});
  }
  function sync(){
    detach();
    // Resizing a desktop window must reflow an existing dialog, not dismiss it.
    // The width gate only controls new automatic openings.
    if(dialog.open&&desktopInput.matches&&!document.hidden&&!suspended){setState('open');return;}
    if(!eligible()){
      close();setState(shown?'shown':'disabled');return;
    }
    if(shown){setState(dialog.open?'open':'shown');return;}
    const remaining=Math.max(0,MIN_VISIT_MS-performance.now());
    detector=globalThis.ouibounce(false,{
      timer:remaining,delay:EXIT_DELAY_MS,sensitivity:EXIT_EDGE_PX,aggressive:repeat,
      cookieName:repeatPreview?'portfolioV3ExitPreviewSeen':'portfolioV3ExitSeen',
      cookieExpire:repeat?-1:REMEMBER_DAYS,sitewide:true,
      beforeFire:canOpen,callback:open
    });
    if(detector.isDisabled()){
      detach();setState('suppressed');return;
    }
    setState(remaining?'waiting':'armed');
    armedTimer=setTimeout(()=>{if(!shown&&eligible())setState('armed');},remaining);
    // Warm the popup artwork only on eligible desktop visits.
    imageWarmup??=Promise.all([...dialog.querySelectorAll('img[loading="lazy"]')].map(image=>{
      image.loading='eager';return image.decode?.().catch(()=>{});
    }));
    imageWarmup.then(()=>{imagesReady=true;});
  }

  // Recognize an upward exit before the cursor reaches the browser chrome.
  // Horizontal navigation, entry from the toolbar and held buttons do not count.
  document.documentElement.addEventListener('pointermove',event=>{
    if(event.pointerType!=='mouse'||event.buttons||!canOpen()){resetIntent();return;}
    const dy=lastPointerY===null?0:lastPointerY-event.clientY;
    lastPointerY=event.clientY;upwardTravel=dy>0?upwardTravel+dy:0;
    if(event.clientY>EARLY_EDGE_PX||dy<0){clearTimeout(intentTimer);intentTimer=0;}
    if(event.clientY<=EARLY_EDGE_PX&&upwardTravel>=24&&dy>0&&!intentTimer){
      intentTimer=setTimeout(()=>{intentTimer=0;detector?.fire();},EXIT_DELAY_MS);
    }
  },{passive:true});
  document.documentElement.addEventListener('mouseenter',resetIntent);
  document.documentElement.addEventListener('pointerdown',resetIntent,{passive:true});

  closeButton.addEventListener('click',()=>close());
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  // Safari's system keyboard-navigation preference can skip links/buttons in
  // a native dialog. Keep all three actions reachable in a predictable loop.
  dialog.addEventListener('keydown',event=>{
    if(event.key!=='Tab'||event.ctrlKey||event.metaKey||event.altKey)return;
    const controls=[resume,game,closeButton];
    const index=controls.indexOf(document.activeElement);
    event.preventDefault();
    controls[index<0?(event.shiftKey?controls.length-1:0):(index+(event.shiftKey?-1:1)+controls.length)%controls.length].focus({preventScroll:true});
  });
  dialog.addEventListener('close',()=>{if(locked)close();});
  dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;
    const r=dialog.getBoundingClientRect();
    if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();
  });
  resume.addEventListener('click',()=>{
    // Let the trusted native anchor action start the real local PDF download.
    setTimeout(()=>close(),0);
  });
  game.addEventListener('click',()=>{
    close({restoreFocus:false});
    // The existing portrait shell opens the current modified Spin game. Its
    // scoring, joke pool, loader and reduced-motion opt-in stay untouched.
    document.querySelector('[data-v3-avatar-small]')?.click();
  });
  desktop.addEventListener('change',sync);
  desktopInput.addEventListener('change',sync);
  document.addEventListener('visibilitychange',sync);
  addEventListener('pagehide',()=>{suspended=true;detach();close({restoreFocus:false});setState('disabled');});
  addEventListener('pageshow',()=>{suspended=false;sync();});
  sync();
}
