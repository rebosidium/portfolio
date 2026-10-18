(() => {
  'use strict';
// Pure sizing policy shared by the live gallery and the background warmer.
// Crop factors mirror photo-gallery.css; browser checks compare actual boxes.
function galleryUnit(width,height,worldWidth,worldHeight,finePointer){
  const base=width<768 ? .49 : finePointer ? .75 : .68;
  return Math.max(base,width/(worldWidth*1.7),height/(worldHeight*1.7));
}
function photoCSSWidth(photo,unit){
  let width=photo.width*unit,height=photo.height*unit;
  if(photo.crop==='balloons')width*=2.2658;
  if(photo.crop==='coast'){width*=1.0017;height*=1.2093;}
  if(photo.crop==='coffee'){width*=1.3843*1.6866;height*=1.1857*1.0006;}
  if(photo.crop==='paddle'){width*=1.6237;height*=1.4756;}
  return Math.ceil(Math.max(width,height*photo.aspect));
}
function photoVariant(photo,unit,dpr){
  const required=Math.ceil(photoCSSWidth(photo,unit)*Math.max(1,dpr));
  return photo.variants.find(item=>item.width>=required)||photo.variants.at(-1);
}
function portraitQuality(cssWidth,dpr,saveData=false,androidTouch=false){
  const physical=cssWidth*Math.max(1,Math.min(dpr,androidTouch?2:Infinity));
  return saveData||physical<=600?'600':physical<=800?'800':'1200';
}

  const controllers=[];
  for(const gallery of document.querySelectorAll('.photo-gallery')){
    const field=gallery.querySelector('.photo-gallery-field');
    if(!field||field.dataset.ready)continue;
    field.dataset.ready='true';
    const footerFade=gallery.classList.contains('photo-gallery-footer');
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const previewReduced=!!document.querySelector('.ds-preview[data-state="reduced-motion"]');
    const selfPrepares=!/^\/about(?:\/|$)/.test(location.pathname);
    const still=()=>reduced.matches||previewReduced;
    const originals=[...field.children];
    const worldWidth=+field.dataset.worldWidth,worldHeight=+field.dataset.worldHeight;
    const records=originals.map(node=>({node,x:+node.dataset.photoX,y:+node.dataset.photoY,w:+node.dataset.photoWidth,h:+node.dataset.photoHeight}));
    // A fixed 3 × 3 pool recycles in both directions, including mosaic seams.
    const cards=[],photoImages=new Map(),photoVariants=new Map(),photoSizes=new Map();
    for(let row=-1;row<=1;row++)for(let col=-1;col<=1;col++)for(const record of records){
      const node=row===0&&col===0?record.node:record.node.cloneNode(true);
      if(node!==record.node){node.setAttribute('aria-hidden','true');node.querySelector('img').alt='';field.append(node);}
      const image=node.querySelector('img'),key=image.dataset.photoKey;
      if(!photoImages.has(key)){
        photoImages.set(key,[]);
        photoVariants.set(key,image.dataset.photoSrcset.split(', ').map(source=>{
          const parts=source.split(' ');return {url:parts[0],width:parseInt(parts[1],10)};
        }));
      }
      photoImages.get(key).push(image);
      cards.push({...record,node,image,key,row,col});
    }
    gallery.classList.add('photo-gallery-enhanced');
    const wrap=(n,size)=>((n+size/2)%size+size)%size-size/2;
    let width=0,height=0,unit=1,tileW=1,tileH=1,x=0,y=0,vx=0,vy=0,frame=0,previous=0,visible=false,drag=null,desktopLens=false;
    let focused=false,departed=false,manualUntil=0,resumeTimer=0,near=false;
    let pixelRatio=window.devicePixelRatio||1;
    let sourceSignature='',sourceEpoch=0,settledEpoch=-1,preparation=null,failedPhotos=0;
    const allowed=()=>visible&&!departed&&!document.hidden&&!document.documentElement.classList.contains('mobile-menu-open');
    const drifting=now=>!still()&&!(focused&&field.matches(':focus-visible'))&&!drag&&now>=manualUntil;
    function sourceFor(card){
      const image=card.image;
      // Match the untransformed image box, including the original Figma crops.
      // Object-fit: cover may need more source width to fill a tall box.
      const crop=[...card.node.classList].find(name=>name.startsWith('photo-crop-'))?.slice('photo-crop-'.length)||'cover';
      const cssWidth=photoCSSWidth({width:card.w,height:card.h,crop,aspect:+image.dataset.sourceRatio},unit);
      if(!Number.isFinite(cssWidth)||cssWidth<=0||!image.dataset.photoSrcset)return null;
      const requiredWidth=Math.ceil(cssWidth*pixelRatio);
      const variants=photoVariants.get(card.key);
      const selected=variants.find(variant=>variant.width>=requiredWidth)||variants[variants.length-1];
      return {cssWidth,requiredWidth,selected};
    }
    function sizePhoto(card){
      if(photoSizes.has(card.key))return;
      const source=sourceFor(card);if(!source)return;
      const {cssWidth,requiredWidth,selected}=source;
      photoSizes.set(card.key,cssWidth);
      for(const peer of photoImages.get(card.key)){
        peer.dataset.photoCssWidth=cssWidth;
        peer.dataset.photoPixelWidth=requiredWidth;
        peer.dataset.photoSourceWidth=selected.width;
        // Pick one URL explicitly: cached oversized srcset candidates should
        // not keep a large decoded bitmap alive in the moving photo field.
        if(peer.getAttribute('src')!==selected.url)peer.src=selected.url;
      }
    }
    function loadAndDecode(image){
      return new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>finish(Error('Photo preparation timed out')),10000);
        const finish=error=>{clearTimeout(timer);image.removeEventListener('load',loaded);image.removeEventListener('error',failed);error?reject(error):resolve();};
        const failed=()=>finish(Error('Photo unavailable'));
        const loaded=()=>{
          image.removeEventListener('load',loaded);image.removeEventListener('error',failed);
          Promise.resolve().then(()=>image.decode?.()).then(()=>finish(),finish);
        };
        image.addEventListener('load',loaded);image.addEventListener('error',failed);
        image.fetchPriority='low';image.loading='eager';
        if(image.complete){if(image.naturalWidth)loaded();else failed();}
      });
    }
    function snapshot(){return {generation:sourceEpoch,signature:sourceSignature,settled:settledEpoch===sourceEpoch,failed:failedPhotos,
      photos:photoImages.size,images:cards.length,complete:cards.filter(card=>card.image.complete&&card.image.naturalWidth>0).length};}
    function prepare({unavailable=[]}={}){
      const signature=sourceSignature;
      const epoch=sourceEpoch;
      if(settledEpoch===epoch)return Promise.resolve(snapshot());
      if(preparation?.epoch===epoch)return preparation.promise;
      const preceding=preparation?.promise;
      const job={signature,epoch,promise:null};
      job.promise=Promise.resolve(preceding).catch(()=>{}).then(async()=>{
        if(epoch!==sourceEpoch||departed||document.hidden)return snapshot();
        const skip=new Set(unavailable.map(url=>new URL(url,location.href).href));
        let next=0,failed=0;
        gallery.dataset.mediaReady='preparing';
        async function worker(){
          while(next<records.length&&epoch===sourceEpoch&&!departed&&!document.hidden){
            const record=records[next++],card=cards.find(card=>card.node===record.node),source=sourceFor(card);
            if(!source||skip.has(new URL(source.selected.url,location.href).href)){failed++;continue;}
            sizePhoto(card);
            // Prepare the real repeated image elements, not just a detached
            // bitmap. Lazy hidden clones otherwise begin loading on first pan
            // even when their encoded source is already in the HTTP cache.
            const results=await Promise.allSettled(photoImages.get(card.key).map(loadAndDecode));
            if(results.some(result=>result.status==='rejected'))failed++;
          }
        }
        await Promise.all([worker(),worker()]);
        if(epoch===sourceEpoch&&!departed&&!document.hidden&&next>=records.length){
          failedPhotos=failed;settledEpoch=epoch;
          gallery.dataset.mediaReady=failed?'ready-with-errors':'true';
        }else if(epoch===sourceEpoch)gallery.dataset.mediaReady='paused';
        return snapshot();
      }).finally(()=>{if(preparation===job)preparation=null;});
      preparation=job;return job.promise;
    }
    controllers.push({prepare,snapshot});
    function paint(){
      const currentRatio=window.devicePixelRatio||1;
      if(currentRatio!==pixelRatio){pixelRatio=currentRatio;photoSizes.clear();}
      for(const card of cards){
        const px=(card.x+card.w/2-worldWidth/2)*unit+card.col*tileW+x;
        const py=(card.y+card.h/2-worldHeight/2)*unit+card.row*tileH+y;
        const w=card.cssW,h=card.cssH;
        const outside=Math.abs(px)>width/2+w/2||Math.abs(py)>height/2+h/2;
        if(card.node.hidden!==outside)card.node.hidden=outside;
        if(outside)continue;
        sizePhoto(card);
        const distance=Math.hypot(px/(width*.64),py/(height*.72));
        const lens=1-(desktopLens ? .08 : .04)*Math.min(1,distance*distance);
        if(footerFade){
          const top=height/2+py-h*lens/2;
          // Resolve blur in the white-dominant half; the opacity tail stays purely linear.
          const blurred=top<90&&top+h*lens>0;
          card.node.toggleAttribute('data-top-blur',blurred);
          if(blurred){
            card.node.style.setProperty('--photo-fade-start',`${-top/lens}px`);
            card.node.style.setProperty('--photo-fade-end',`${(90-top)/lens}px`);
          }
        }
        card.node.style.transform=`translate3d(${width/2+px-w/2}px,${height/2+py-h/2}px,0) scale(${lens})`;
      }
    }
    function stop(){if(frame)cancelAnimationFrame(frame);frame=0;vx=vy=0;previous=0;}
    function request(){if(allowed()&&!frame)frame=requestAnimationFrame(tick);}
    function resume(){
      clearTimeout(resumeTimer);resumeTimer=0;
      if(!allowed())return;
      if(manualUntil>performance.now())resumeTimer=setTimeout(resume,manualUntil-performance.now()+1);
      request();
    }
    function deferDrift(){manualUntil=performance.now()+500;resume();}
    function tick(now){
      frame=0;
      if(!allowed()){stop();return;}
      const dt=Math.min(32,previous?now-previous:16);previous=now;
      if(still()){vx=vy=0;}
      const auto=drifting(now);
      if(!drag){
        // Slow ambient motion: 8 CSS px/s right and 4 CSS px/s up.
        x=wrap(x+(vx+(auto ? .008 : 0))*dt,tileW);
        y=wrap(y+(vy+(auto ? -.004 : 0))*dt,tileH);
        vx*=Math.exp(-dt/240);vy*=Math.exp(-dt/240);
      }
      paint();
      if(auto||(!drag&&Math.hypot(vx,vy)>.015))frame=requestAnimationFrame(tick);else previous=0;
    }
    function measure(){
      gallery.style.setProperty('--photo-viewport-width',document.documentElement.clientWidth+'px');
      width=field.clientWidth;height=field.clientHeight;
      desktopLens=width>=768&&matchMedia('(hover: hover) and (pointer: fine)').matches;
      // Reserve full-size slots, so the stronger desktop lens cannot overlap photos.
      unit=galleryUnit(width,height,worldWidth,worldHeight,desktopLens);
      tileW=worldWidth*unit;tileH=worldHeight*unit;
      for(const card of cards){
        card.cssW=card.w*unit;card.cssH=card.h*unit;
        card.node.style.width=card.cssW+'px';card.node.style.height=card.cssH+'px';
      }
      photoSizes.clear();
      const signature=records.map(record=>sourceFor(cards.find(card=>card.node===record.node))?.selected.url||'').join('|');
      if(signature!==sourceSignature){sourceSignature=signature;sourceEpoch++;settledEpoch=-1;failedPhotos=0;gallery.dataset.mediaReady='false';}
      x=wrap(x,tileW);y=wrap(y,tileH);paint();resume();
      if(selfPrepares&&near&&!navigator.connection?.saveData)prepare();
    }
    field.addEventListener('focusin',()=>{focused=!drag&&field.matches(':focus-visible');if(focused)stop();});
    field.addEventListener('focusout',event=>{if(!field.contains(event.relatedTarget)){focused=false;resume();}});
    field.addEventListener('pointerdown',event=>{
      if(!event.isPrimary||event.button!==0)return;
      stop();focused=false;deferDrift();
      drag={id:event.pointerId,lastX:event.clientX,lastY:event.clientY,time:event.timeStamp};
      field.setPointerCapture(event.pointerId);gallery.dataset.dragging='';
    });
    field.addEventListener('pointermove',event=>{
      if(!drag||event.pointerId!==drag.id)return;
      const dx=event.clientX-drag.lastX,dy=event.clientY-drag.lastY,dt=Math.max(8,event.timeStamp-drag.time);
      x=wrap(x+dx,tileW);y=wrap(y+dy,tileH);
      vx=Math.max(-3,Math.min(3,dx/dt));vy=Math.max(-3,Math.min(3,dy/dt));
      Object.assign(drag,{lastX:event.clientX,lastY:event.clientY,time:event.timeStamp});paint();
    });
    function release(event){
      if(!drag||event.pointerId!==drag.id)return;
      const stale=event.timeStamp-drag.time>90;drag=null;focused=false;delete gallery.dataset.dragging;
      if(event.type==='pointercancel'||still()||stale)stop();
      deferDrift();request();
    }
    field.addEventListener('pointerup',release);field.addEventListener('pointercancel',release);field.addEventListener('lostpointercapture',release);
    // Wheel/trackpad always retain native document scrolling, even over photos.
    field.addEventListener('wheel',event=>{if(!event.ctrlKey){stop();deferDrift();}},{passive:true});
    field.addEventListener('keydown',event=>{
      const moves={ArrowLeft:[100,0],ArrowRight:[-100,0],ArrowUp:[0,100],ArrowDown:[0,-100]};
      if(!moves[event.key]&&event.key!=='Home')return;
      event.preventDefault();focused=true;stop();deferDrift();
      if(event.key==='Home'){x=y=0;}else{x=wrap(x+moves[event.key][0],tileW);y=wrap(y+moves[event.key][1],tileH);}paint();
    });
    function suspend(){stop();clearTimeout(resumeTimer);resumeTimer=0;drag=null;delete gallery.dataset.dragging;}
    new ResizeObserver(measure).observe(field);
    window.addEventListener('resize',measure,{passive:true});
    let densityQuery;
    function watchDensity(){
      if(densityQuery)densityQuery.removeEventListener('change',densityChanged);
      densityQuery=matchMedia(`(resolution: ${window.devicePixelRatio||1}dppx)`);
      densityQuery.addEventListener('change',densityChanged);
    }
    function densityChanged(){watchDensity();measure();}
    watchDensity();
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)resume();else suspend();}).observe(field);
    // The standalone photo page and DS have no neighbor queue to hand off
    // encoded-photo readiness; prepare their real image pool near the viewport.
    if(selfPrepares)new IntersectionObserver(entries=>{
      near=entries.some(entry=>entry.isIntersecting);
      if(near&&!navigator.connection?.saveData)prepare();
    },{rootMargin:'500px'}).observe(field);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();else {resume();if(selfPrepares&&near&&!navigator.connection?.saveData)prepare();}});
    new MutationObserver(()=>{if(document.documentElement.classList.contains('mobile-menu-open'))suspend();else resume();}).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
    reduced.addEventListener('change',()=>{suspend();resume();});
    window.addEventListener('pagehide',()=>{departed=true;suspend();});
    window.addEventListener('pageshow',()=>{departed=false;measure();});
    measure();
  }
  window.PortfolioPhotoGallery={prepare:options=>Promise.all(controllers.map(controller=>controller.prepare(options))),
    snapshot:()=>controllers.map(controller=>controller.snapshot()),get settled(){return controllers.every(controller=>controller.snapshot().settled);}};
})();
