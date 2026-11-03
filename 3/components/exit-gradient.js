// Archived footer experiment #4, Stripe: the same local MIT wave-gradient
// library, seed, 30fps and pointer reaction, scoped to the exit dialog.
import {WaveGradient} from './vendor/wave-gradient.js?v=61c3e837881e';

export function mountExitGradient(section,field,{dialog}){
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const colors=['#7b70f2','#ffb15c','#f54752','#3dbf75','#5c98dd'];
  const pointer={x:0,y:0,tx:0,ty:0,energy:0};
  const scene=section.querySelector('.v3-exit__scene');
  let stop=null,gamePaused=false;

  function stopCurrent(){stop?.();stop=null;}
  function start(){
    if(stop)return;
    const canvas=document.createElement('canvas');
    canvas.className='v3-contact__gl v3-exit__stripe';
    canvas.setAttribute('aria-hidden','true');field.prepend(canvas);
    let gradient,raf=0,observer,last=0,disposed=false;
    const cleanup=()=>{
      disposed=true;cancelAnimationFrame(raf);observer?.disconnect();
      const gl=gradient?.gl;
      gradient?.destroy();gl?.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.remove();delete field.dataset.grad;
    };
    try{
      gradient=new WaveGradient(canvas,{colors,fps:30,speed:reduced.matches?0:1.1,seed:4});
      field.dataset.grad='stripe';
      // The archived library keeps its frame loop even at speed0. Paint a
      // single frame for reduced motion instead, including after a resize.
      const paintStatic=()=>{
        gradient.shouldRender=false;
        gradient.clipSpace.setUniform('realtime',6000);
        gradient.gl.drawElements(gradient.drawMode,gradient.drawCount,gradient.gl.UNSIGNED_INT,0);
      };
      observer=new ResizeObserver(()=>{gradient.resize();if(reduced.matches)paintStatic();});
      observer.observe(field);
      if(reduced.matches)paintStatic();
      else{
        const tick=now=>{
          if(disposed)return;
          raf=requestAnimationFrame(tick);
          if(now-last<1000/30-2)return;last=now;
          pointer.x+=(pointer.tx-pointer.x)*.055;
          pointer.y+=(pointer.ty-pointer.y)*.055;pointer.energy*=.955;
          scene?.style.setProperty('--cv-x',(pointer.x*20).toFixed(2)+'px');
          scene?.style.setProperty('--cv-y',(pointer.y*16).toFixed(2)+'px');
          scene?.style.setProperty('--cv-turn',(pointer.x*3).toFixed(2)+'deg');
          // Overscan exceeds parallax at every aspect ratio, so narrowing
          // the panel cannot uncover a band at its edges.
          const x=pointer.x*-Math.min(18,field.clientWidth*.04);
          const y=pointer.y*-Math.min(18,field.clientHeight*.04);
          canvas.style.transform=`translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(1.12)`;
          gradient.speed=1.1*(1+pointer.energy*4);
        };
        raf=requestAnimationFrame(tick);
      }
      stop=cleanup;
    }catch{
      // Preserve the popup's multicolor CSS field without a WebGL2 context.
      const gl=canvas.getContext('webgl2');
      gradient?.destroy();gl?.getExtension('WEBGL_lose_context')?.loseContext();
      observer?.disconnect();cancelAnimationFrame(raf);canvas.remove();
      field.dataset.grad='0';stop=()=>{delete field.dataset.grad;};
    }
  }
  function sync(){
    if(dialog.open&&!document.hidden&&!gamePaused)start();else stopCurrent();
  }
  addEventListener('pointermove',event=>{
    if(!dialog.open||reduced.matches)return;
    const x=Math.max(-1,Math.min(1,event.clientX/innerWidth*2-1));
    const y=Math.max(-1,Math.min(1,event.clientY/innerHeight*2-1));
    pointer.energy=Math.min(1,pointer.energy+Math.hypot(x-pointer.tx,y-pointer.ty)*2.4);
    pointer.tx=x;pointer.ty=y;
  },{passive:true});
  new MutationObserver(sync).observe(dialog,{attributes:true,attributeFilter:['open']});
  document.addEventListener('visibilitychange',sync);
  document.addEventListener('v3-game-pause',()=>{gamePaused=true;sync();});
  document.addEventListener('v3-game-resume',()=>{gamePaused=false;sync();});
  reduced.addEventListener('change',()=>{stopCurrent();sync();});
  sync();
}
