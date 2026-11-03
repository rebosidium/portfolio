// Archived footer experiment #4, Stripe, scoped to the exit dialog.
// Desktop preparation compiles and paints one hidden frame; standby has no loop.
import {WaveGradient} from './vendor/wave-gradient.js?v=61c3e837881e';

export function mountExitGradient(section,field,{dialog}){
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const desktop=matchMedia('(min-width:1024px) and (hover:hover) and (pointer:fine)');
  const colors=['#7b70f2','#ffb15c','#f54752','#3dbf75','#5c98dd'];
  const pointer={x:0,y:0,tx:0,ty:0,energy:0};
  const scene=section.querySelector('.v3-exit__scene');
  let gradient=null,canvas=null,observer=null,raf=0,last=0,running=false,ready=false,gamePaused=false,suspended=false;
  const usable=()=>!document.hidden&&!gamePaused&&!suspended&&(desktop.matches||dialog.open);

  function pause(){
    running=false;cancelAnimationFrame(raf);raf=0;
    if(gradient)gradient.shouldRender=false;
  }
  function release(){
    pause();observer?.disconnect();observer=null;
    const gl=gradient?.gl;
    gradient?.destroy();gradient=null;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    canvas?.remove();canvas=null;ready=false;delete field.dataset.grad;
  }
  function paint(){
    if(!gradient)return;
    gradient.resize();
    gradient.clipSpace.setUniform('realtime',reduced.matches?6000:gradient.time);
    gradient.gl.drawElements(gradient.drawMode,gradient.drawCount,gradient.gl.UNSIGNED_INT,0);
    gradient.gl.flush();
  }
  function create(){
    if(ready)return;
    canvas=document.createElement('canvas');canvas.className='v3-contact__gl v3-exit__stripe';
    canvas.setAttribute('aria-hidden','true');field.prepend(canvas);
    try{
      gradient=new WaveGradient(canvas,{colors,fps:30,speed:1.1,seed:4});
      // Its constructor queues a RAF. Stop it before it can start an idle loop.
      gradient.shouldRender=false;
      paint();gradient.gl.finish();
      field.dataset.grad='stripe';
      observer=new ResizeObserver(()=>{if(dialog.open&&gradient)paint();});observer.observe(field);
      ready=true;
    }catch{
      const gl=gradient?.gl||canvas.getContext('webgl2');
      gradient?.destroy();gradient=null;gl?.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.remove();canvas=null;observer?.disconnect();observer=null;
      field.dataset.grad='0';ready=true;
    }
  }
  function prepare(){
    if(!usable())return false;
    const hidden=!dialog.open;
    // Measure the real responsive layout without opening, focusing or painting it.
    if(hidden)dialog.setAttribute('data-v3-exit-preparing','');
    try{create();paint();return ready;}
    finally{if(hidden)dialog.removeAttribute('data-v3-exit-preparing');}
  }
  function tick(now){
    if(!running)return;raf=requestAnimationFrame(tick);
    if(now-last<1000/30-2)return;last=now;
    pointer.x+=(pointer.tx-pointer.x)*.055;
    pointer.y+=(pointer.ty-pointer.y)*.055;pointer.energy*=.955;
    scene?.style.setProperty('--cv-x',(pointer.x*20).toFixed(2)+'px');
    scene?.style.setProperty('--cv-y',(pointer.y*16).toFixed(2)+'px');
    scene?.style.setProperty('--cv-turn',(pointer.x*3).toFixed(2)+'deg');
    const x=pointer.x*-Math.min(18,field.clientWidth*.04),y=pointer.y*-Math.min(18,field.clientHeight*.04);
    canvas.style.transform=`translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(1.12)`;
    gradient.speed=1.1*(1+pointer.energy*4);
    gradient.time+=(1000/30)*gradient.speed;
    paint();
  }
  function sync(){
    if(!usable()){release();return;}
    if(!dialog.open){pause();if(!ready)prepare();return;}
    prepare();
    if(!gradient||reduced.matches){pause();return;}
    if(!running){
      // Own one cancellable loop. The vendor's constructor RAF stays stopped.
      running=true;last=0;
      raf=requestAnimationFrame(tick);
    }
  }
  addEventListener('pointermove',event=>{
    if(!dialog.open||reduced.matches)return;
    const x=Math.max(-1,Math.min(1,event.clientX/innerWidth*2-1)),y=Math.max(-1,Math.min(1,event.clientY/innerHeight*2-1));
    pointer.energy=Math.min(1,pointer.energy+Math.hypot(x-pointer.tx,y-pointer.ty)*2.4);
    pointer.tx=x;pointer.ty=y;
  },{passive:true});
  new MutationObserver(sync).observe(dialog,{attributes:true,attributeFilter:['open']});
  desktop.addEventListener('change',sync);
  document.addEventListener('visibilitychange',sync);
  document.addEventListener('v3-game-pause',()=>{gamePaused=true;release();});
  document.addEventListener('v3-game-resume',()=>{gamePaused=false;sync();});
  reduced.addEventListener('change',()=>{pause();sync();});
  addEventListener('pagehide',()=>{suspended=true;release();});
  addEventListener('pageshow',()=>{suspended=false;sync();});
  return{prepare,get ready(){return ready;}};
}
