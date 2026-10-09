// Adapted from the approved Seedance 2.0 demo player (spin-player-seedance-v1.js).
// Canvas only; the static front remains available throughout loading and failures.
export function mountSeedancePortrait(stage, {manifestURL} = {}) {
  const canvas=stage.querySelector('canvas'),posterElement=stage.querySelector('img');
  const ctx=canvas?.getContext('2d');
  if(!ctx||!posterElement||!manifestURL)return {destroy(){}};
  let selectionAngle=0,destroyed=false;
  const cleanup=[];
  const listen=(target,name,handler,options)=>{target.addEventListener(name,handler,options);cleanup.push(()=>target.removeEventListener(name,handler,options));};
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  const CACHE_LIMIT=12,DECODE_WORKERS=2,CHUNK_WORKERS=2,DAMPING_MS=60;
  const DRAG_TURNS=3,DRAG_DAMPING_MS=20,INERTIA_TAU_MS=400,INERTIA_MAX_SPEED=900,INERTIA_MIN_SPEED=8;
  const RELEASE_WINDOW_MS=110,RELEASE_IDLE_MS=120;
  let generation=0,bitmapEpoch=0,fetchController=null,manifest=null,urls=[],angles=[],blobs=[];
  let sourceSize=[1200,1200],renderSize=[1200,1200],ready=false;
  let raf=0,previousTick=0,mode='idle',drag=null;
  let inertiaVelocity=0,motionVelocity=0,lastMotionPhase=0,lastMotionDirection=0,motionSettling=false;
  let displayedIndex=-1,wantedIndex=0,currentAngle=0,targetAngle=0,clock=0;
  let loadedBytes=0,loadedCount=0,resizeTimer=0,runtimeFetches=0;
  const cache=new Map(),queue=[],inFlight=new Set(),failedFrames=new Set();
  let variant=null,chunkStates=[],frameChunk=[],chunkPumpQueued=false,lastPreemptAt=-1000,loadStartedAt=0;
  const activeChunks=new Set(),encodedWaiters=new Map();
  let stats={draws:0,gaps:[],drawTimes:[],decodeTimes:[],lastDraw:0,waits:0};

  const wrap=(value,length)=>((value%length)+length)%length;
  const angleDistance=(a,b)=>Math.abs(wrap(a-b+180,360)-180);
  const shortestDelta=(a,b)=>wrap(a-b+180,360)-180;
  const cancelled=()=>new DOMException('Cancelled','AbortError');
  function setStatus(text){canvas.dataset.status=text}
  function angleToIndex(angle){
    const target=wrap(angle,360);
    if(!angles.length)return wrap(Math.round(target/360*urls.length),urls.length);
    let lo=0,hi=angles.length;
    while(lo<hi){const mid=(lo+hi)>>1;if(angles[mid]<target)lo=mid+1;else hi=mid}
    const before=wrap(lo-1,angles.length),after=wrap(lo,angles.length);
    return angleDistance(angles[before],target)<angleDistance(angles[after],target)?before:after;
  }
  function indexToAngle(index){index=wrap(index,urls.length);return angles[index]??index/urls.length*360}
  function updateAngle(angle){
    const shown=wrap(angle,360);
    stage.setAttribute('aria-label','Dmitry Rybalka. Drag to rotate, or use Left and Right arrow keys. Current angle '+Math.round(shown)+' degrees.');
    canvas.dataset.angle=String(shown);
  }
  function percentile(values,p){if(!values.length)return 0;const sorted=values.slice().sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)]}
  function sample(values,value){values.push(value);if(values.length>4096)values.splice(0,256)}
  function trackedFetch(url,options){if(ready)runtimeFetches++;return fetch(url,options)}
  function diagnostics(){
    const resources=[...cache.values()].filter(e=>e.state==='ready');
    const pixels=resources.reduce((sum,e)=>sum+e.resource.width*e.resource.height,0);
    Object.assign(canvas.dataset,{
      mode,phase:currentAngle.toFixed(3),targetPhase:targetAngle.toFixed(3),velocity:inertiaVelocity.toFixed(2),dragTurns:String(DRAG_TURNS),drawCount:String(stats.draws),maxGapMs:Math.max(0,...stats.gaps).toFixed(1),p95GapMs:percentile(stats.gaps,.95).toFixed(1),
      p95DrawMs:percentile(stats.drawTimes,.95).toFixed(2),p95DecodeMs:percentile(stats.decodeTimes,.95).toFixed(1),decodeWaits:String(stats.waits),
      decodedCacheCount:String(resources.length),bitmapMemoryMiB:(pixels*4/1024/1024).toFixed(2),encodedBytes:String(loadedBytes),
      encodedReadyCount:String(loadedCount),renderSize:renderSize.join('x'),sourceSize:sourceSize.join('x'),networkDuringInteraction:String(runtimeFetches),activeDownloads:String(activeChunks.size)
    });
  }
  function beginStats(){stats={draws:0,gaps:[],drawTimes:[],decodeTimes:[],lastDraw:0,waits:0}}
  function closeResource(resource){try{resource?.dispose()}catch{}}
  function rejectWaiters(entry,error){for(const waiter of entry.waiters.splice(0))waiter.reject(error)}
  function clearDecoded(){
    bitmapEpoch++;
    for(const entry of cache.values()){if(entry.state==='ready')closeResource(entry.resource);rejectWaiters(entry,cancelled())}
    cache.clear();queue.length=0;failedFrames.clear();
  }
  function trimCache(){
    const decoded=[...cache.values()].filter(e=>e.state==='ready');
    const removable=decoded.filter(e=>e.index!==displayedIndex&&e.index!==wantedIndex).sort((a,b)=>a.used-b.used);
    let count=decoded.length;
    while(count>CACHE_LIMIT&&removable.length){const entry=removable.shift();if(cache.get(entry.index)!==entry)continue;cache.delete(entry.index);closeResource(entry.resource);count--}
  }
  function physicalSize(){
    const width=stage.clientWidth||sourceSize[0];
    const ratio=Math.max(1,window.devicePixelRatio||1);
    const w=Math.min(sourceSize[0],Math.max(1,Math.ceil(width*ratio)));
    return [w,Math.max(1,Math.round(w*sourceSize[1]/sourceSize[0]))];
  }
  async function decodeBlob(blob,size){
    if(typeof createImageBitmap==='function'){
      let bitmap;
      try{bitmap=await createImageBitmap(blob,{resizeWidth:size[0],resizeHeight:size[1],resizeQuality:'high'})}
      catch{bitmap=await createImageBitmap(blob)}
      return {drawable:bitmap,width:bitmap.width,height:bitmap.height,dispose:()=>bitmap.close()};
    }
    const objectURL=URL.createObjectURL(blob),img=new Image();img.decoding='async';
    try{
      if(typeof img.decode==='function'){img.src=objectURL;await img.decode()}
      else await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('Не удалось прочитать кадр.'));img.src=objectURL});
      return {drawable:img,width:img.naturalWidth,height:img.naturalHeight,dispose:()=>{img.onload=img.onerror=null;img.src='';URL.revokeObjectURL(objectURL)}};
    }catch(error){img.src='';URL.revokeObjectURL(objectURL);throw error}
  }
  function scheduleRender(){if(!raf)raf=requestAnimationFrame(render)}
  function pumpDecoder(){
    queue.sort((a,b)=>a.priority-b.priority||b.used-a.used);
    while(inFlight.size<DECODE_WORKERS&&queue.length){
      const entry=queue.shift();
      if(cache.get(entry.index)!==entry||entry.generation!==generation||entry.epoch!==bitmapEpoch)continue;
      entry.state='decoding';inFlight.add(entry);
      const started=performance.now(),size=renderSize.slice();
      decodeBlob(blobs[entry.index],size).then(resource=>{
        if(entry.generation!==generation||entry.epoch!==bitmapEpoch||cache.get(entry.index)!==entry){closeResource(resource);rejectWaiters(entry,cancelled());return}
        entry.state='ready';entry.resource=resource;entry.used=++clock;
        sample(stats.decodeTimes,performance.now()-started);
        for(const waiter of entry.waiters.splice(0))waiter.resolve(entry);
        trimCache();scheduleRender();
      }).catch(error=>{
        rejectWaiters(entry,error);
        if(entry.generation!==generation||entry.epoch!==bitmapEpoch)return;
        if(cache.get(entry.index)===entry)cache.delete(entry.index);
        failedFrames.add(entry.index);
        if(ready)fallback(error);
      }).finally(()=>{inFlight.delete(entry);pumpDecoder()});
    }
  }
  function requestDecode(index,priority=10){
    index=wrap(index,urls.length);
    if(!blobs[index]){ensureEncoded(index,priority);return null}
    if(failedFrames.has(index)){
      if(ready&&(index===wantedIndex||index===angleToIndex(targetAngle))){fallback(new Error('Frame decode failed'))}
      return null;
    }
    let entry=cache.get(index);
    if(entry){entry.used=++clock;if(entry.state==='queued'){entry.priority=Math.min(entry.priority,priority);pumpDecoder()}return entry}
    entry={index,state:'queued',priority,used:++clock,generation,epoch:bitmapEpoch,waiters:[],resource:null};
    cache.set(index,entry);queue.push(entry);pumpDecoder();return entry;
  }
  function decoded(index){const entry=cache.get(wrap(index,urls.length));if(entry?.state==='ready'){entry.used=++clock;return entry}return null}
  function availableStep(proposed,direction){
    const reach=Math.abs(proposed-currentAngle);
    let best=null,bestDistance=0;
    for(const entry of cache.values()){
      if(entry.state!=='ready'||entry.index===displayedIndex)continue;
      const angle=indexToAngle(entry.index);
      const distance=direction>0?wrap(angle-currentAngle,360):wrap(currentAngle-angle,360);
      if(distance>bestDistance&&distance<=reach+.001){bestDistance=distance;best={entry,angle:currentAngle+direction*distance}}
    }
    return best;
  }
  async function waitDecoded(index){
    await waitEncoded(index,0);
    const entry=requestDecode(index,0);
    if(!entry)return Promise.reject(new Error('Не удалось подготовить кадр.'));
    if(entry.state==='ready')return Promise.resolve(entry);
    return new Promise((resolve,reject)=>entry.waiters.push({resolve,reject}));
  }
  function warmWindow(index,direction=1){
    resetChunkPriorities();
    if(mode==='settle'&&!motionSettling)ensureEncoded(angleToIndex(targetAngle),0);
    const offsets=[0,...Array.from({length:8},(_,i)=>(i+1)*direction),-direction,-2*direction,-3*direction];
    const wanted=new Set(offsets.map(offset=>wrap(index+offset,urls.length)));
    if(displayedIndex>=0)wanted.add(displayedIndex);
    for(let i=queue.length-1;i>=0;i--){const entry=queue[i];if(!wanted.has(entry.index)){queue.splice(i,1);if(cache.get(entry.index)===entry)cache.delete(entry.index);rejectWaiters(entry,cancelled())}}
    offsets.forEach((offset,i)=>requestDecode(index+offset,i===0?0:2+i));
  }
  function warmMotion(angle,velocity){
    resetChunkPriorities();
    const lead=Math.min(160,Math.max(16,percentile(stats.decodeTimes,.75)||25));
    const index=angleToIndex(angle),direction=Math.sign(velocity)||lastMotionDirection||1;
    const reach=Math.max(0,(angle-lastMotionPhase)*direction);
    const bridge=angleToIndex(lastMotionPhase+direction*Math.min(90,reach));
    const prediction=angleToIndex(angle+velocity*lead/1000);
    const indices=reach>90?[bridge,angleToIndex(lastMotionPhase+direction*Math.min(45,reach)),prediction,index]:[prediction,index];
    indices.push(...[lead+20,lead+40].map(ms=>angleToIndex(angle+velocity*ms/1000)),wrap(index+direction,urls.length),wrap(index-direction,urls.length));
    const wanted=new Set(indices);if(displayedIndex>=0)wanted.add(displayedIndex);
    for(let i=queue.length-1;i>=0;i--){const entry=queue[i];if(!wanted.has(entry.index)){queue.splice(i,1);if(cache.get(entry.index)===entry)cache.delete(entry.index);rejectWaiters(entry,cancelled())}}
    [...new Set(indices)].forEach((candidate,i)=>requestDecode(candidate,i));
  }
  function paintMotion(angle,velocity){
    const index=angleToIndex(angle),direction=Math.sign(velocity)||lastMotionDirection||1;
    lastMotionDirection=direction;
    wantedIndex=index;warmMotion(angle,velocity);
    const destination=angle+shortestDelta(indexToAngle(index),angle);
    const reach=(destination-lastMotionPhase)*direction,limit=Math.min(120,Math.max(0,reach));
    let best=null,bestAdvance=-1,bestPhase=lastMotionPhase;
    for(const entry of cache.values()){
      if(entry.state!=='ready')continue;
      const advance=direction>0?wrap(indexToAngle(entry.index)-lastMotionPhase,360):wrap(lastMotionPhase-indexToAngle(entry.index),360);
      if(advance>limit+.001)continue;
      if(advance>bestAdvance){best=entry;bestAdvance=advance;bestPhase=lastMotionPhase+direction*advance}
    }
    if(best&&(best.index!==displayedIndex||Number(canvas.dataset.bitmapEpoch)!==bitmapEpoch)){draw(best,indexToAngle(best.index));lastMotionPhase=bestPhase}
    else if(!best)stats.waits++;
    canvas.dataset.mode=mode;canvas.dataset.phase=currentAngle.toFixed(3);canvas.dataset.targetPhase=targetAngle.toFixed(3);canvas.dataset.velocity=inertiaVelocity.toFixed(2);
  }
  function draw(entry,angle){
    if(!entry||entry.state!=='ready')return false;
    const started=performance.now();
    if(canvas.width!==renderSize[0]||canvas.height!==renderSize[1]){canvas.width=renderSize[0];canvas.height=renderSize[1]}
    const resource=entry.resource,scale=Math.min(canvas.width/resource.width,canvas.height/resource.height);
    const w=resource.width*scale,h=resource.height*scale;
    ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(resource.drawable,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
    stage.classList.add('portrait-rendered');canvas.dataset.posterDrawn='true';
    displayedIndex=entry.index;entry.used=++clock;selectionAngle=wrap(angle,360);
    canvas.dataset.frame=String(entry.index);canvas.dataset.bitmapEpoch=String(bitmapEpoch);updateAngle(angle);
    if(stats.lastDraw)sample(stats.gaps,started-stats.lastDraw);stats.lastDraw=started;stats.draws++;sample(stats.drawTimes,performance.now()-started);
    trimCache();return true;
  }
  function stop(){
    mode='idle';previousTick=0;inertiaVelocity=motionVelocity=0;motionSettling=false;
    if(displayedIndex>=0){currentAngle+=shortestDelta(indexToAngle(displayedIndex),currentAngle);targetAngle=currentAngle}
    lastMotionPhase=currentAngle;lastMotionDirection=0;
    canvas.dataset.mode=mode;diagnostics();
  }
  function releaseDrag(){
    if(!drag)return;const id=drag.id;drag=null;stage.classList.remove('dragging');
    if(stage.hasPointerCapture?.(id))stage.releasePointerCapture(id);
  }
  function setTarget(angle,{shortest=true,session=false}={}){
    if(!ready)return;releaseDrag();
    if(session){stop();beginStats()}
    inertiaVelocity=motionVelocity=0;motionSettling=false;mode='settle';
    canvas.dataset.mode=mode;
    targetAngle=shortest?currentAngle+shortestDelta(angle,currentAngle):angle;
    scheduleRender();
  }
  function render(now){
    raf=0;
    if(!ready)return;
    const elapsed=previousTick?Math.max(0,Math.min(80,now-previousTick)):1000/60;previousTick=now;
    if(mode==='drag'||mode==='coast'||(mode==='settle'&&motionSettling)){
      const coasting=mode==='coast',before=currentAngle;
      if(coasting){
        const decay=Math.exp(-elapsed/INERTIA_TAU_MS);
        targetAngle+=inertiaVelocity*INERTIA_TAU_MS/1000*(1-decay);inertiaVelocity*=decay;
      }
      currentAngle+=(targetAngle-currentAngle)*(1-Math.exp(-elapsed/DRAG_DAMPING_MS));
      if(Math.abs(targetAngle-currentAngle)<.15)currentAngle=targetAngle;
      motionVelocity=elapsed?(currentAngle-before)*1000/elapsed:0;
      paintMotion(currentAngle,motionVelocity);
      if(coasting&&Math.abs(inertiaVelocity)<INERTIA_MIN_SPEED){inertiaVelocity=motionVelocity=0;motionSettling=true;mode='settle';canvas.dataset.mode=mode;setStatus('Останавливаюсь…')}
      if(mode==='settle'&&Math.abs(targetAngle-currentAngle)<.15){
        const finalPhase=targetAngle+shortestDelta(indexToAngle(angleToIndex(targetAngle)),targetAngle);
        if(Math.abs(finalPhase-lastMotionPhase)<.001&&displayedIndex===angleToIndex(targetAngle)){currentAngle=targetAngle;motionSettling=false;mode='idle';updateAngle(indexToAngle(displayedIndex));setStatus('Готово · выбранный ракурс');diagnostics()}
      }
    }else if(mode==='settle'){
      const delta=targetAngle-currentAngle;
      const eased=delta*(1-Math.exp(-elapsed/DAMPING_MS));
      const limit=12*elapsed/(1000/60);
      let proposed=Math.abs(delta)<.15?targetAngle:currentAngle+Math.max(-limit,Math.min(limit,eased));
      if(Math.abs(targetAngle-proposed)<.15)proposed=targetAngle;
      const next=angleToIndex(proposed),direction=Math.sign(delta)||1;
      wantedIndex=next;warmWindow(next,direction);
      let entry=decoded(next),shownAngle=proposed;
      if(!entry){const available=availableStep(proposed,direction);if(available){entry=available.entry;shownAngle=available.angle}}
      if(entry){
        currentAngle=shownAngle;
        if(entry.index!==displayedIndex||Number(canvas.dataset.bitmapEpoch)!==bitmapEpoch)draw(entry,indexToAngle(entry.index));
        if(Math.abs(targetAngle-currentAngle)<.15){currentAngle=targetAngle;mode='idle';updateAngle(indexToAngle(displayedIndex));setStatus('Готово · выбранный ракурс');diagnostics()}
      }else stats.waits++;
    }else if(displayedIndex>=0&&Number(canvas.dataset.bitmapEpoch)!==bitmapEpoch){
      wantedIndex=displayedIndex;warmWindow(displayedIndex,1);const entry=decoded(displayedIndex);if(entry){draw(entry,indexToAngle(displayedIndex));diagnostics()}
    }
    if(mode==='settle'||mode==='drag'||mode==='coast'||(displayedIndex>=0&&Number(canvas.dataset.bitmapEpoch)!==bitmapEpoch))scheduleRender();
  }
  // Each shard is a stored ZIP. The manifest points directly to complete WebP
  // payloads, so a frame can become usable before the shard finishes loading.
  function loadProgress(){
    canvas.dataset.activeDownloads=String(activeChunks.size);
    Object.assign(canvas.dataset,{encodedReadyCount:String(loadedCount),encodedBytes:String(loadedBytes),totalBytes:String(variant?.encoded_bytes||0)});
    if(loadedCount===urls.length){canvas.dataset.allReady='true';if(!canvas.dataset.allLoadedMs)canvas.dataset.allLoadedMs=(performance.now()-loadStartedAt).toFixed(1)}
  }
  function queuePump(){
    if(chunkPumpQueued)return;chunkPumpQueued=true;
    Promise.resolve().then(()=>{chunkPumpQueued=false;pumpChunks()});
  }
  function resetChunkPriorities(){
    for(const chunk of chunkStates)if(chunk.state!=='done')chunk.priority=50;
  }
  function ensureEncoded(index,priority=10){
    index=wrap(index,urls.length);
    if(blobs[index])return;
    const chunk=chunkStates[frameChunk[index]];
    if(!chunk)return;
    if(chunk.state==='failed'){
      if(ready&&(index===wantedIndex||index===angleToIndex(targetAngle))){fallback(new Error('Frame download failed'))}
      return;
    }
    chunk.priority=Math.min(chunk.priority,priority);queuePump();
  }
  function waitEncoded(index,priority=0){
    index=wrap(index,urls.length);
    if(blobs[index])return Promise.resolve();
    const chunk=chunkStates[frameChunk[index]];
    if(!chunk||chunk.state==='failed')return Promise.reject(new Error('Не удалось загрузить нужный ракурс.'));
    ensureEncoded(index,priority);
    return new Promise((resolve,reject)=>{
      if(!encodedWaiters.has(index))encodedWaiters.set(index,[]);
      encodedWaiters.get(index).push({resolve,reject});
    });
  }
  function rejectEncoded(error,indices=null){
    for(const [index,waiters] of encodedWaiters){
      if(indices&&!indices.has(index))continue;
      for(const waiter of waiters)waiter.reject(error);encodedWaiters.delete(index);
    }
  }
  function acceptFrame(frame,bytes,token){
    if(token!==generation)return;
    const blob=new Blob([bytes],{type:'image/webp'});
    if(blob.size!==frame.length)throw new Error('Кадр загружен не полностью.');
    if(!blobs[frame.index]){
      blobs[frame.index]=blob;loadedCount++;
      for(const waiter of encodedWaiters.get(frame.index)||[])waiter.resolve();
      encodedWaiters.delete(frame.index);
      // Decode only the visible/predicted poses; retain encoded data for the rest.
      if(ready&&(frame.index===wantedIndex||frame.index===angleToIndex(targetAngle)))requestDecode(frame.index,0);
      loadProgress();scheduleRender();
    }
  }
  async function readChunk(chunk,token){
    const localController=new AbortController();chunk.controller=localController;
    const abort=()=>localController.abort();fetchController.signal.addEventListener('abort',abort,{once:true});
    if(fetchController.signal.aborted)abort();
    const started=performance.now();chunk.received=0;
    chunk.timedOut=false;
    let deadline;
    const armDeadline=()=>{clearTimeout(deadline);deadline=setTimeout(()=>{chunk.timedOut=true;localController.abort(new Error('Frame download timeout'))},15000)};
    armDeadline();
    try{
      const response=await trackedFetch(chunk.file,{signal:localController.signal,cache:'force-cache'});
      if(!response.ok)throw new Error('Не удалось загрузить часть поворота.');
      const bytes=new Uint8Array(chunk.bytes);let received=0,cursor=0;
      const expose=()=>{
        while(cursor<chunk.frames.length){
          const frame=chunk.frames[cursor];if(frame.offset+frame.length>received)break;
          acceptFrame(frame,bytes.slice(frame.offset,frame.offset+frame.length),token);cursor++;
        }
      };
      if(response.body?.getReader){
        const reader=response.body.getReader();chunk.reader=reader;
        try{
          for(;;){
            const {done,value}=await reader.read();if(token!==generation||localController.signal.aborted)throw cancelled();if(done)break;
            if(received+value.byteLength>chunk.bytes)throw new Error('Получен неверный набор кадров.');
            armDeadline();bytes.set(value,received);received+=value.byteLength;chunk.received=received;loadedBytes+=value.byteLength;
            expose();loadProgress();
          }
        }catch(error){try{await reader.cancel()}catch{}throw error}
        finally{try{reader.releaseLock()}catch{}chunk.reader=null}
      }else{
        const body=await response.arrayBuffer();if(token!==generation||localController.signal.aborted)throw cancelled();
        if(body.byteLength!==chunk.bytes)throw new Error('Часть поворота загружена не полностью.');
        bytes.set(new Uint8Array(body));received=body.byteLength;chunk.received=received;loadedBytes+=received;expose();loadProgress();
      }
      if(received!==chunk.bytes||cursor!==chunk.frames.length)throw new Error('Часть поворота загружена не полностью.');
      if(token!==generation)throw cancelled();
      chunk.state='done';chunk.finishedMs=performance.now()-started;
    }finally{clearTimeout(deadline);fetchController?.signal.removeEventListener('abort',abort);chunk.controller=null}
  }
  function pumpChunks(){
    if(!variant||document.hidden||media.matches||fetchController?.signal.aborted)return;
    const token=generation;
    const pending=chunkStates.filter(c=>c.state==='pending'&&(ready||c.priority<50)).sort((a,b)=>a.priority-b.priority||a.order-b.order);
    // An obsolete background request must not block a newly requested pose.
    // Limit pre-emption so fast gestures cannot endlessly restart the same file.
    if(activeChunks.size>=CHUNK_WORKERS&&pending[0]?.priority<5&&performance.now()-lastPreemptAt>400){
      const obsolete=[...activeChunks].filter(c=>c.priority>=50&&c.received<c.bytes*.5).sort((a,b)=>b.bytes-a.bytes)[0];
      if(obsolete){lastPreemptAt=performance.now();obsolete.preempted=true;obsolete.controller?.abort()}
    }
    while(activeChunks.size<CHUNK_WORKERS&&pending.length){
      const chunk=pending.shift();chunk.state='loading';chunk.preempted=false;activeChunks.add(chunk);
      readChunk(chunk,token).catch(error=>{
        if(token!==generation)return;
        if(error.name==='AbortError'&&chunk.preempted){chunk.state='pending';return}
        if(error.name==='AbortError'&&!chunk.timedOut)return;
        chunk.attempts++;
        if(chunk.attempts<3){chunk.state='backoff';setTimeout(()=>{if(token!==generation)return;chunk.state='pending';queuePump()},chunk.attempts*350)}
        else{
          chunk.state='failed';rejectEncoded(error,new Set(chunk.frames.map(f=>f.index)));
          fallback(error);
        }
      }).finally(()=>{activeChunks.delete(chunk);if(token===generation){loadProgress();queuePump()}});
    }
  }
  function chooseVariant(){
    const physical=(stage.clientWidth||311)*Math.max(1,window.devicePixelRatio||1);
    if(navigator.connection?.saveData)return '600';
    return physical<=600?'600':physical<=800?'800':'1200';
  }
  function prepareVariant(data,key){
    const value=data.variants?.[key],count=data.frames;
    if(!value||!Number.isInteger(count)||count<2||count>1000||!Array.isArray(value.size)||value.size.length!==2||!value.size.every(n=>Number.isInteger(n)&&n>0&&n<=4096)||!Array.isArray(value.chunks)||!value.chunks.length)throw new Error('Не удалось прочитать описание поворота.');
    if(!Array.isArray(data.frame_angles)||data.frame_angles.length!==count||!data.frame_angles.every((n,i)=>Number.isFinite(n)&&n>=0&&n<360&&(!i||n>data.frame_angles[i-1])))throw new Error('Не удалось прочитать ракурсы.');
    const seen=new Set();frameChunk=new Array(count);
    chunkStates=value.chunks.map((chunk,id)=>{
      if(typeof chunk.file!=='string'||!chunk.file.startsWith('https://dmitryrybalka.com/demo/apple-spin-assets/seedance-v1/'+key+'/chunk-')||!Number.isSafeInteger(chunk.bytes)||chunk.bytes<=0||chunk.bytes>10_000_000||!Array.isArray(chunk.frames)||!chunk.frames.length)throw new Error('Повреждено описание части поворота.');
      const frames=chunk.frames.slice().sort((a,b)=>a.offset-b.offset);let end=0;
      for(const frame of frames){
        if(!Number.isInteger(frame.index)||frame.index<0||frame.index>=count||seen.has(frame.index)||!Number.isSafeInteger(frame.offset)||!Number.isSafeInteger(frame.length)||frame.offset<end||frame.length<=0||frame.offset+frame.length>chunk.bytes)throw new Error('Повреждено описание кадра.');
        end=frame.offset+frame.length;seen.add(frame.index);frameChunk[frame.index]=id;
      }
      return {...chunk,frames,id,state:'pending',priority:50,order:id,attempts:0,received:0};
    });
    if(seen.size!==count||value.encoded_bytes!==chunkStates.reduce((sum,c)=>sum+c.bytes,0))throw new Error('Набор ракурсов неполный.');
    return value;
  }
  async function init(){
    if(destroyed||media.matches||document.hidden)return;
    const requestedAngle=selectionAngle;
    const token=++generation;fetchController?.abort();rejectEncoded(cancelled());fetchController=new AbortController();
    const controller=fetchController;loadStartedAt=performance.now();
    const startupDeadline=setTimeout(()=>{if(token===generation)fallback(new Error('Portrait startup timeout'))},20000);
    releaseDrag();stop();ready=false;stage.removeAttribute('data-spin-ready');stage.removeAttribute('tabindex');stage.setAttribute('aria-busy','true');
    clearDecoded();cancelAnimationFrame(raf);raf=0;displayedIndex=-1;loadedBytes=0;loadedCount=0;runtimeFetches=0;blobs=[];urls=[];angles=[];variant=null;chunkStates=[];activeChunks.clear();
    for(const name of ['ready','bitmapEpoch','frame','alpha','preloadMs','readyBytes','readyFrames','allReady','allLoadedMs'])delete canvas.dataset[name];
    canvas.dataset.version='seedance';canvas.dataset.mode='loading';
    // Retain the displayed pose while an automatic quality change loads.
    setStatus('Подготавливаю поворот…');beginStats();
    try{
      const response=await trackedFetch(manifestURL,{cache:'force-cache',signal:controller.signal});
      if(!response.ok)throw new Error('Не удалось загрузить описание аватарки.');
      const data=await response.json();if(token!==generation)return;
      const key=chooseVariant();variant=prepareVariant(data,key);manifest=data;
      urls=Array.from({length:data.frames},(_,i)=>String(i));angles=data.frame_angles.slice();blobs=new Array(urls.length);
      sourceSize=variant.size.slice();renderSize=physicalSize();
      currentAngle=targetAngle=requestedAngle;wantedIndex=angleToIndex(currentAngle);updateAngle(currentAngle);
      canvas.dataset.quality=key;
      const initial=wantedIndex;
      const near=Array.from({length:urls.length},(_,i)=>i).sort((a,b)=>angleDistance(indexToAngle(a),requestedAngle)-angleDistance(indexToAngle(b),requestedAngle));
      const order=[];for(const index of near){const id=frameChunk[index];if(!order.includes(id))order.push(id)}
      order.forEach((id,i)=>{chunkStates[id].order=i;chunkStates[id].priority=50+i});
      // Only the first pose and its two immediate neighbours gate interaction.
      const firstWindow=[initial,wrap(initial-1,urls.length),wrap(initial+1,urls.length)];
      firstWindow.forEach((index,i)=>ensureEncoded(index,i));
      await Promise.all(firstWindow.map(waitDecoded));
      if(token!==generation)return;
      const first=decoded(initial);if(!first)throw new Error('Не удалось подготовить первый ракурс.');
      draw(first,indexToAngle(initial));currentAngle=targetAngle=selectionAngle=indexToAngle(initial);lastMotionPhase=currentAngle;
      ready=true;stage.dataset.spinReady='true';stage.tabIndex=0;stage.setAttribute('aria-busy','false');canvas.dataset.ready='true';canvas.dataset.preloadMs=(performance.now()-loadStartedAt).toFixed(1);
      canvas.dataset.readyBytes=String(loadedBytes);canvas.dataset.readyFrames=String(loadedCount);
      try{canvas.dataset.alpha=ctx.getImageData(0,0,1,1).data[3]===0?'verified':'opaque'}catch{}
      setStatus('Можно вращать · остальные ракурсы загружаются в фоне');loadProgress();diagnostics();
      warmWindow(initial,1);queuePump();resizeObserver?.observe(stage);checkResize();
    }catch(error){
      if(token!==generation)return;fallback(error);
    }finally{clearTimeout(startupDeadline)}
  }
  function checkResize(){
    if(!ready)return;clearTimeout(resizeTimer);
    resizeTimer=setTimeout(()=>{
      if(!ready)return;
      if(manifest&&chooseVariant()!==canvas.dataset.quality){init();return}
      const next=physicalSize();
      if(Math.abs(next[0]-renderSize[0])<8&&Math.abs(next[1]-renderSize[1])<8)return;
      renderSize=next;clearDecoded();wantedIndex=Math.max(0,displayedIndex);warmWindow(wantedIndex,1);scheduleRender();
    },120);
  }
  const resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(checkResize):null;
  resizeObserver?.observe(stage);
  listen(window,'resize',checkResize);
  listen(stage,'pointerdown',event=>{
    if(!ready||media.matches||event.button!==0)return;
    if(drag){if(event.pointerId!==drag.id){releaseDrag();stop();setStatus('Готово · выбранный ракурс')}return}
    if(event.isPrimary===false)return;
    stop();beginStats();
    const now=performance.now();
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,angle:currentAngle,gain:360*DRAG_TURNS/Math.max(1,stage.getBoundingClientRect().width),horizontal:false,samples:[{time:now,x:event.clientX}],lastMoved:now,direction:0};
    if(event.pointerType!=='touch'){stage.setPointerCapture(event.pointerId);stage.classList.add('dragging')}
  });
  function moveDrag(event){
    if(!drag||event.pointerId!==drag.id)return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    if(!drag.horizontal){
      if(Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx)){releaseDrag();stop();return}
      if(Math.abs(dx)<4)return;drag.horizontal=true;stage.setPointerCapture(event.pointerId);stage.classList.add('dragging');
    }
    if(event.cancelable)event.preventDefault();
    const now=performance.now(),last=drag.samples.at(-1),movement=event.clientX-last.x,direction=Math.sign(movement);
    if(direction){
      if(drag.direction&&direction!==drag.direction){
        drag.samples=[last];
        // A reversal takes over from the visible pose instead of replaying a
        // decoder backlog in the previous direction.
        drag.angle+=lastMotionPhase-targetAngle;currentAngle=targetAngle=lastMotionPhase;
      }
      drag.direction=direction;drag.lastMoved=now;
    }
    if(now>last.time)drag.samples.push({time:now,x:event.clientX});
    else drag.samples[drag.samples.length-1]={time:now,x:event.clientX};
    while(drag.samples.length>2&&drag.samples[1].time<now-RELEASE_WINDOW_MS)drag.samples.shift();
    targetAngle=drag.angle+dx*drag.gain;inertiaVelocity=0;motionSettling=false;mode='drag';canvas.dataset.mode=mode;
    setStatus('Вращение · отпустите, чтобы продолжить по инерции');scheduleRender();
  }
  listen(stage,'pointermove',moveDrag);
  function finishDrag(event){
    if(!drag||event.pointerId!==drag.id)return;
    if(event.type!=='pointerup'){releaseDrag();stop();setStatus('Готово · выбранный ракурс');return}
    if(drag.horizontal&&Number.isFinite(event.clientX)&&Number.isFinite(event.clientY))moveDrag(event);
    if(!drag)return;
    const now=performance.now(),first=drag.samples[0],last=drag.samples.at(-1),duration=last.time-first.time;
    const velocity=drag.horizontal&&now-drag.lastMoved<=RELEASE_IDLE_MS&&duration>0?(last.x-first.x)*drag.gain*1000/duration:0;
    const moved=drag.horizontal;releaseDrag();
    if(moved&&!media.matches&&Math.abs(velocity)>=INERTIA_MIN_SPEED){
      inertiaVelocity=Math.max(-INERTIA_MAX_SPEED,Math.min(INERTIA_MAX_SPEED,velocity));motionSettling=false;mode='coast';canvas.dataset.mode=mode;
      setStatus('Вращение по инерции · коснитесь, чтобы остановить');scheduleRender();
    }else if(moved){inertiaVelocity=0;motionSettling=true;mode='settle';canvas.dataset.mode=mode;setStatus('Выбираю ракурс…');scheduleRender()}
    else{diagnostics();setStatus('Готово · выбранный ракурс')}
  }
  for(const eventName of ['pointerup','pointercancel','lostpointercapture'])listen(stage,eventName,finishDrag);
  listen(stage,'keydown',event=>{
    if(!ready)return;
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
      event.preventDefault();setTarget(indexToAngle(angleToIndex(targetAngle)+(event.key==='ArrowRight'?1:-1)),{session:mode!=='settle'});
    }else if(event.key==='Home'){event.preventDefault();setTarget(0,{session:true})}

  });
  function suspend(){
    generation++;ready=false;releaseDrag();stop();fetchController?.abort();rejectEncoded(cancelled());
    clearDecoded();cancelAnimationFrame(raf);raf=0;clearTimeout(resizeTimer);blobs=[];activeChunks.clear();
    stage.removeAttribute('data-spin-ready');stage.removeAttribute('tabindex');stage.setAttribute('aria-busy','false');
  }
  function fallback(error){
    suspend();stage.classList.remove('portrait-rendered');stage.setAttribute('aria-label','Dmitry Rybalka');
    canvas.dataset.mode=media.matches?'reduced':'static';canvas.dataset.error=error?.message||'';
    selectionAngle=0;ctx.clearRect(0,0,canvas.width,canvas.height);
    // Decoded front remains visible even if a later network/decode request fails.
    posterElement.classList.add('image-ready');
  }
  listen(media,'change',()=>{if(media.matches)fallback();else init()});
  listen(document,'visibilitychange',()=>{if(document.hidden){releaseDrag();stop();cancelAnimationFrame(raf);raf=0;}else if(!ready)init();else queuePump()});
  listen(window,'pagehide',()=>{suspend();resizeObserver?.disconnect()});
  listen(window,'pageshow',event=>{if(event.persisted&&!ready)init()});
  if(media.matches){canvas.dataset.mode='reduced';}
  else init();
  return {destroy(){destroyed=true;suspend();resizeObserver?.disconnect();cleanup.forEach(fn=>fn());stage.classList.remove('portrait-rendered');}};
}
