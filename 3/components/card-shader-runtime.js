// Vanilla adapter for the exact Figma shader setup/render contract.
// The hosted React runtime resource is unavailable through this MCP client.
import {setup,render} from './card-mesh-shader.js?v=2143ad00fc5f';
let devicePromise,activeDevice;
function getDevice(){
  return devicePromise ||= (async()=>{
    if(!navigator.gpu)return null;
    const adapter=await navigator.gpu.requestAdapter();
    if(!adapter)return null;
    const device=await adapter.requestDevice();activeDevice=device;
    // Device loss is asynchronous; render() need not throw. Stop every canvas
    // sharing the device and allow a future mount to request a fresh one.
    device.lost.then(info=>{
      if(activeDevice===device){activeDevice=null;devicePromise=null;}
      for(const entry of entries.values())if(entry.device===device)failEntry(entry,info.message||'Graphics device lost');
      sync();
    });
    return device;
  })();
}
export function meshParams(index=0){
  const rows=[
    [[1,.42,.42],[1,.64,.42],[1,.82,.42],[1,.82,.4]],
    [[.7,.3,.6],[.8,.55,.5],[.9,.7,.45],[.5,.7,.35]],
    [[.4,.5,.7],[.35,.65,.65],[.2,.65,.55],[.1,.55,.7]],
    [[.02,.84,.63],[.1,.7,.65],[.1,.6,.7],[.07,.54,.7]]
  ];
  const p={tessellation:index===0?128:164};
  for(let y=0;y<4;y++)for(let x=0;x<4;x++){
    const c=rows[y][x];p[`p${x}${y}`]={x:[0,33,67,100][x],y:[0,33,67,100][y],color:{r:c[0],g:c[1],b:c[2],a:1}};
  }
  if(index===0){p.p12.x=9.504705429077148;p.p12.y=58.13211441040039;p.p21.x=20.326913833618164;p.p21.y=75.93923950195312;}
  if(index>1){
    // Additional templates keep the same mesh topology with gentle point shifts.
    p.p11.x=26+(index%3)*5;p.p11.y=26+(index%2)*8;p.p22.x=62+(index%3)*4;
  }
  return p;
}
// One scheduler for every card. No offscreen or background-tab redraws.
const entries=new Map();
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
let animationFrame=0,lastFrame=0,gpuBusy=false,pageActive=true;
const modalOpen=()=>!!document.querySelector('dialog[open]');
const canRun=()=>pageActive&&!document.hidden&&!modalOpen();
function needsWork(){return canRun()&&[...entries.values()].some(entry=>entry.visible&&!entry.dead&&(entry.dirty||!reduced.matches));}
function wake(){if(!animationFrame&&needsWork())animationFrame=requestAnimationFrame(tick);}
function pause(){cancelAnimationFrame(animationFrame);animationFrame=0;lastFrame=0;for(const entry of entries.values())entry.lastTime=0;}
function drift(entry,time){
  const phase=time/18000;
  for(const [name,base] of Object.entries(entry.base)){
    if(name==='tessellation')continue;
    const point=entry.frame.params[name],x=Number(name[1]),y=Number(name[2]),seed=entry.index*.71+x*.93+y*.64;
    point.x=base.x;point.y=base.y;
    if(x>0&&x<3&&y>0&&y<3){
      point.x+=5*(Math.sin(phase+seed)-Math.sin(seed));
      point.y+=4*(Math.cos(phase*.82+seed)-Math.cos(seed));
    }
    point.color.r=base.color.r+.018*(Math.sin(phase*.57+seed)-Math.sin(seed));
    point.color.g=base.color.g+.018*(Math.sin(phase*.61+seed+1)-Math.sin(seed+1));
    point.color.b=base.color.b+.018*(Math.sin(phase*.53+seed+2)-Math.sin(seed+2));
  }
}
function failEntry(entry,error){
  entry.dead=true;entry.canvas.dataset.shader='error';
  entry.canvas.dataset.shaderError=error?.message||String(error);
  entry.canvas.parentElement.setAttribute('data-shader-unavailable','');
  try{entry.context.unconfigure();}catch{}
}
function drawEntry(entry){
  if(!entry.initialized){setup(entry.device,entry.frame);entry.initialized=true;}
  const dpr=Math.min(devicePixelRatio||1,1.25);
  const width=Math.max(1,Math.round(entry.width*dpr)),height=Math.max(1,Math.round(entry.height*dpr));
  if(entry.canvas.width!==width)entry.canvas.width=width;
  if(entry.canvas.height!==height)entry.canvas.height=height;
  drift(entry,entry.time);
  entry.frame.output={format:entry.format,width:entry.width,height:entry.height,physicalWidth:width,physicalHeight:height,createView:()=>entry.context.getCurrentTexture().createView()};
  render(entry.device,entry.frame);entry.dirty=false;entry.renders++;
  entry.canvas.dataset.shader='rendered';entry.canvas.dataset.meshRenders=String(entry.renders);entry.canvas.dataset.meshTime=entry.time.toFixed(0);
}
function tick(now){
  animationFrame=0;
  if(!canRun()){pause();return;}
  const due=!lastFrame||now-lastFrame>=50;
  if(due&&!gpuBusy){
    let device=null;
    for(const entry of entries.values()){
      if(entry.dead||!entry.visible||(!entry.dirty&&reduced.matches))continue;
      if(!reduced.matches&&entry.lastTime)entry.time+=Math.min(100,now-entry.lastTime);
      entry.lastTime=now;
      try{drawEntry(entry);device=entry.device;}
      catch(error){failEntry(entry,error);}
    }
    lastFrame=now;
    if(device){gpuBusy=true;device.queue.onSubmittedWorkDone().catch(()=>{}).finally(()=>{gpuBusy=false;wake();});}
  }
  if(needsWork())animationFrame=requestAnimationFrame(tick);
}
const visibility=new IntersectionObserver(changes=>{
  for(const change of changes){const entry=entries.get(change.target);if(!entry)continue;entry.visible=change.isIntersecting;entry.lastTime=0;if(entry.visible)entry.dirty=true;}
  if(needsWork())wake();else pause();
},{threshold:0});
function sync(){if(needsWork())wake();else pause();}
document.addEventListener('visibilitychange',sync);
addEventListener('pagehide',()=>{pageActive=false;pause();});
addEventListener('pageshow',()=>{pageActive=true;sync();});
new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['open'],subtree:true});
reduced.addEventListener('change',()=>{pause();for(const entry of entries.values())if(entry.visible)entry.dirty=true;wake();});
export async function mountMesh(canvas,index=0){
  const device=await getDevice();
  if(!device){canvas.dataset.shader='unsupported';return null;}
  const context=canvas.getContext('webgpu');
  if(!context){canvas.dataset.shader='unsupported';return null;}
  const format=navigator.gpu.getPreferredCanvasFormat();
  context.configure({device,format,alphaMode:'premultiplied'});
  const base=meshParams(index),frame={state:{},params:structuredClone(base),output:null};
  const entry={canvas,index,device,context,format,base,frame,visible:false,dead:false,initialized:false,dirty:true,time:0,lastTime:0,renders:0,width:canvas.clientWidth,height:canvas.clientHeight};
  entries.set(canvas,entry);canvas.dataset.shader='pending';
  const resize=new ResizeObserver(changes=>{const rect=changes[0].contentRect;entry.width=rect.width;entry.height=rect.height;entry.dirty=true;wake();});resize.observe(canvas);visibility.observe(canvas);
  return {draw(){entry.dirty=true;wake();},frame,device,destroy(){entry.dead=true;entries.delete(canvas);resize.disconnect();visibility.unobserve(canvas);for(const value of Object.values(frame.state)){if(value&&typeof value.destroy==='function')value.destroy();}sync();}};
}
