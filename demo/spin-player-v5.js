(() => {
  'use strict';
  const $=selector=>document.querySelector(selector);
  const stage=$('#stage'),canvas=$('#avatar'),ctx=canvas.getContext('2d');
  const slider=$('#angle'),angleLabel=$('#angle-value'),status=$('#status');
  const playButton=$('#play'),stopButton=$('#stop'),resetButton=$('#reset'),retryButton=$('#retry');
  const versionSelector=$('#version');
  const VERSIONS={v1:'spin-manifest.json',v2:'spin-manifest-v2-r4.json','v2-lite':'spin-manifest-v2-r4-lite.json'};
  const versionFromURL=new URL(window.location.href).searchParams.get('version');
  let selectedVersion=Object.hasOwn(VERSIONS,versionFromURL)?versionFromURL:'v2-lite',selectionAngle=180;
  versionSelector.value=selectedVersion;
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  const CACHE_LIMIT=12,DECODE_WORKERS=2,FETCH_WORKERS=6,DAMPING_MS=60;
  const DRAG_TURNS=3,DRAG_DAMPING_MS=20,INERTIA_TAU_MS=400,INERTIA_MAX_SPEED=900,INERTIA_MIN_SPEED=8;
  const RELEASE_WINDOW_MS=110,RELEASE_IDLE_MS=120;
  let generation=0,bitmapEpoch=0,fetchController=null,manifest=null,urls=[],angles=[],blobs=[];
  let sourceSize=[1200,1200],renderSize=[1200,1200],fps=24,ready=false;
  let raf=0,previousTick=0,mode='idle',playing=false,drag=null;
  let inertiaVelocity=0,motionVelocity=0,lastMotionPhase=0,lastMotionDirection=0,motionSettling=false;
  let displayedIndex=-1,wantedIndex=0,currentAngle=0,targetAngle=0,playIndex=0,dueMs=0,clock=0,playWaiting=false;
  let loadedBytes=0,loadedCount=0,resizeTimer=0,runtimeFetches=0;
  const cache=new Map(),queue=[],inFlight=new Set(),failedFrames=new Set();
  let stats={draws:0,gaps:[],drawTimes:[],decodeTimes:[],lastDraw:0,waits:0};

  const wrap=(value,length)=>((value%length)+length)%length;
  const angleDistance=(a,b)=>Math.abs(wrap(a-b+180,360)-180);
  const shortestDelta=(a,b)=>wrap(a-b+180,360)-180;
  const cancelled=()=>new DOMException('Cancelled','AbortError');
  function setStatus(text){if(status.textContent!==text)status.textContent=text}
  function controls(enabled){for(const el of [playButton,stopButton,resetButton,slider])el.disabled=!enabled}
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
    const shown=wrap(angle,360),rounded=Math.round(shown);
    if(Number(slider.value)!==rounded)slider.value=String(rounded);
    if(angleLabel.textContent!==rounded+'°')angleLabel.textContent=rounded+'°';
    canvas.setAttribute('aria-label','Аватарка · поворот '+rounded+' градусов');
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
      encodedReadyCount:String(loadedCount),renderSize:renderSize.join('x'),sourceSize:sourceSize.join('x'),networkDuringInteraction:String(runtimeFetches)
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
    const width=stage.getBoundingClientRect().width||sourceSize[0];
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
        if(ready){stop();setStatus('Не удалось подготовить ракурс. Попробуйте загрузить ещё раз.');retryButton.hidden=false}
      }).finally(()=>{inFlight.delete(entry);pumpDecoder()});
    }
  }
  function requestDecode(index,priority=10){
    index=wrap(index,urls.length);
    if(!blobs[index]||failedFrames.has(index))return null;
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
  function waitDecoded(index){
    const entry=requestDecode(index,0);
    if(!entry)return Promise.reject(new Error('Не удалось подготовить кадр.'));
    if(entry.state==='ready')return Promise.resolve(entry);
    return new Promise((resolve,reject)=>entry.waiters.push({resolve,reject}));
  }
  function warmWindow(index,direction=1){
    const offsets=[0,...Array.from({length:8},(_,i)=>(i+1)*direction),-direction,-2*direction,-3*direction];
    const wanted=new Set(offsets.map(offset=>wrap(index+offset,urls.length)));
    if(displayedIndex>=0)wanted.add(displayedIndex);
    for(let i=queue.length-1;i>=0;i--){const entry=queue[i];if(!wanted.has(entry.index)){queue.splice(i,1);if(cache.get(entry.index)===entry)cache.delete(entry.index);rejectWaiters(entry,cancelled())}}
    offsets.forEach((offset,i)=>requestDecode(index+offset,i===0?0:2+i));
  }
  function warmMotion(angle,velocity){
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
    displayedIndex=entry.index;entry.used=++clock;selectionAngle=wrap(angle,360);
    canvas.dataset.frame=String(entry.index);canvas.dataset.bitmapEpoch=String(bitmapEpoch);updateAngle(angle);
    if(stats.lastDraw)sample(stats.gaps,started-stats.lastDraw);stats.lastDraw=started;stats.draws++;sample(stats.drawTimes,performance.now()-started);
    trimCache();return true;
  }
  function stop(){
    playing=false;mode='idle';dueMs=0;previousTick=0;playWaiting=false;inertiaVelocity=motionVelocity=0;motionSettling=false;
    if(displayedIndex>=0){currentAngle+=shortestDelta(indexToAngle(displayedIndex),currentAngle);targetAngle=currentAngle}
    lastMotionPhase=currentAngle;lastMotionDirection=0;
    playButton.setAttribute('aria-pressed','false');diagnostics();
  }
  function releaseDrag(){
    if(!drag)return;const id=drag.id;drag=null;stage.classList.remove('dragging');
    if(stage.hasPointerCapture?.(id))stage.releasePointerCapture(id);
  }
  function setTarget(angle,{shortest=true,session=false}={}){
    if(!ready)return;releaseDrag();
    if(session){stop();beginStats()}
    playing=false;inertiaVelocity=motionVelocity=0;motionSettling=false;playButton.setAttribute('aria-pressed','false');mode='settle';
    canvas.dataset.mode=mode;
    targetAngle=shortest?currentAngle+shortestDelta(angle,currentAngle):angle;
    scheduleRender();
  }
  function render(now){
    raf=0;
    if(!ready)return;
    const elapsed=previousTick?Math.max(0,Math.min(80,now-previousTick)):1000/60;previousTick=now;
    if(playing){
      dueMs+=elapsed;
      const next=wrap(playIndex+1,urls.length);wantedIndex=next;warmWindow(next,1);
      if(dueMs>=1000/fps){
        const entry=decoded(next);
        if(entry){playIndex=next;currentAngle=targetAngle=indexToAngle(next);draw(entry,currentAngle);dueMs=playWaiting?0:Math.min(1000/fps,dueMs-1000/fps);playWaiting=false}
        else{dueMs=1000/fps;playWaiting=true;stats.waits++}
      }
    }else if(mode==='drag'||mode==='coast'||(mode==='settle'&&motionSettling)){
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
    if(playing||mode==='settle'||mode==='drag'||mode==='coast'||(displayedIndex>=0&&Number(canvas.dataset.bitmapEpoch)!==bitmapEpoch))scheduleRender();
  }
  function play(){
    if(!ready)return;releaseDrag();stop();beginStats();
    playing=true;mode='play';playIndex=Math.max(0,displayedIndex);dueMs=0;previousTick=0;
    canvas.dataset.mode=mode;
    playButton.setAttribute('aria-pressed','true');setStatus('Вращение · можно остановить или потянуть фигурку');
    warmWindow(playIndex,1);scheduleRender();
  }
  function makeLink(id,value){const el=$('#'+id);if(!el)return;el.hidden=!value;if(value)el.href=value;else el.removeAttribute('href')}
  async function showPoster(url,token){
    if(!url)return;const img=new Image();img.decoding='async';
    try{
      img.src=url;if(img.decode)await img.decode();else await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject});
      if(token!==generation||displayedIndex>=0)return;
      canvas.width=renderSize[0];canvas.height=renderSize[1];ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
    }catch{}finally{img.src=''}
  }
  async function preload(token,frameURLs,frameBlobs,controller){
    let cursor=0;
    const worker=async()=>{
      while(token===generation){
        const index=cursor++;if(index>=frameURLs.length)return;
        const response=await trackedFetch(frameURLs[index],{signal:controller.signal,cache:'force-cache'});
        if(!response.ok)throw new Error('Не удалось загрузить поворот.');
        const blob=await response.blob();if(token!==generation)throw cancelled();
        if(!blob.size)throw new Error('Получен пустой кадр.');
        frameBlobs[index]=blob;loadedCount++;loadedBytes+=blob.size;
        setStatus('Подготавливаю поворот · '+Math.round(loadedCount/frameURLs.length*100)+'%');
      }
    };
    await Promise.all(Array.from({length:Math.min(FETCH_WORKERS,frameURLs.length)},worker));
  }
  async function preloadBundle(token,bundle,frameCount,frameBlobs,controller){
    if(!bundle||typeof bundle.file!=='string'||!Number.isSafeInteger(bundle.bytes)||bundle.bytes<=0||!Array.isArray(bundle.frames)||bundle.frames.length!==frameCount)throw new Error('Не удалось прочитать набор кадров.');
    for(const frame of bundle.frames){
      if(!Number.isSafeInteger(frame.offset)||!Number.isSafeInteger(frame.length)||frame.offset<0||frame.length<=0||frame.offset+frame.length>bundle.bytes)throw new Error('Повреждено описание набора кадров.');
    }
    const response=await trackedFetch(bundle.file,{signal:controller.signal,cache:'force-cache'});
    if(!response.ok)throw new Error('Не удалось загрузить поворот.');
    let archive;
    if(response.body&&typeof response.body.getReader==='function'){
      const reader=response.body.getReader(),chunks=[];let received=0;
      try{
        for(;;){
          const {done,value}=await reader.read();if(token!==generation)throw cancelled();if(done)break;
          received+=value.byteLength;if(received>bundle.bytes)throw new Error('Получен неверный набор кадров.');chunks.push(value);
          setStatus('Подготавливаю поворот · '+Math.round(received/bundle.bytes*100)+'%');
        }
        archive=new Blob(chunks,{type:'application/zip'});
      }catch(error){try{await reader.cancel()}catch{}throw error}
      finally{try{reader.releaseLock()}catch{}}
    }else{archive=await response.blob()}
    if(token!==generation)throw cancelled();
    if(archive.size!==bundle.bytes)throw new Error('Набор кадров загружен не полностью.');
    bundle.frames.forEach((frame,index)=>{frameBlobs[index]=archive.slice(frame.offset,frame.offset+frame.length,'image/webp')});
    loadedCount=frameCount;loadedBytes=archive.size;
  }
  async function init(){
    const version=selectedVersion,requestedAngle=selectionAngle,loadStarted=performance.now();
    const token=++generation;fetchController?.abort();fetchController=new AbortController();
    const controller=fetchController;
    releaseDrag();stop();ready=false;controls(false);retryButton.hidden=true;stage.setAttribute('aria-busy','true');
    clearDecoded();cancelAnimationFrame(raf);raf=0;displayedIndex=-1;loadedBytes=0;loadedCount=0;runtimeFetches=0;blobs=[];urls=[];angles=[];
    delete canvas.dataset.ready;delete canvas.dataset.bitmapEpoch;delete canvas.dataset.frame;delete canvas.dataset.alpha;delete canvas.dataset.preloadMs;
    canvas.dataset.version=version;canvas.dataset.mode='loading';
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for(const type of ['mp4','native_mp4','webm','hevc','poster'])makeLink(type,null);
    $('#metadata').textContent='';
    setStatus('Подготавливаю выбранный ролик…');beginStats();
    try{
      const response=await trackedFetch(VERSIONS[version],{cache:'no-cache',signal:controller.signal});
      if(!response.ok)throw new Error('Не удалось загрузить описание аватарки.');
      const data=await response.json();if(token!==generation)return;
      if(!Array.isArray(data.frame_files)||!data.frame_files.length||data.frame_files.some(url=>typeof url!=='string'))throw new Error('В описании аватарки нет кадров.');
      manifest=data;urls=data.frame_files.slice();if(urls.length>1&&urls[0]===urls.at(-1))urls.pop();
      angles=Array.isArray(data.frame_angles)&&data.frame_angles.length===urls.length&&data.frame_angles.every((value,i)=>Number.isFinite(value)&&value>=0&&value<360&&(i===0||value>data.frame_angles[i-1]))?data.frame_angles.slice():[];
      sourceSize=Array.isArray(data.size)?data.size.map(Number):[Number(data.size),Number(data.size)];
      if(!sourceSize.every(value=>Number.isFinite(value)&&value>0))throw new Error('Не указан размер кадров.');
      renderSize=physicalSize();fps=Number(data.fps)||24;
      currentAngle=targetAngle=requestedAngle;
      wantedIndex=angleToIndex(currentAngle);updateAngle(currentAngle);
      $('#metadata').textContent=sourceSize.join('×')+' · '+urls.length+' кадров · '+(Number(data.duration)||urls.length/fps).toFixed(1)+' секунды'+(data.frame_bundle?' · '+(data.frame_bundle.bytes/1000000).toFixed(1)+' МБ':'');
      for(const type of ['mp4','native_mp4','webm','hevc','poster'])makeLink(type,data[type]);
      showPoster(urls[wantedIndex],token);
      if(data.frame_bundle)await preloadBundle(token,data.frame_bundle,urls.length,blobs,controller);
      else await preload(token,urls,blobs,controller);
      if(token!==generation)return;
      setStatus('Подготавливаю плавное вращение…');
      const warm=Array.from({length:Math.min(CACHE_LIMIT,urls.length)},(_,i)=>wrap(wantedIndex+i-3,urls.length));
      await Promise.all(warm.map(waitDecoded));if(token!==generation)return;
      const first=decoded(wantedIndex);if(!first)throw new Error('Не удалось подготовить первый ракурс.');
      draw(first,indexToAngle(wantedIndex));currentAngle=targetAngle=selectionAngle=indexToAngle(wantedIndex);
      ready=true;controls(true);stage.setAttribute('aria-busy','false');canvas.dataset.ready='true';canvas.dataset.preloadMs=(performance.now()-loadStarted).toFixed(1);diagnostics();
      try{canvas.dataset.alpha=ctx.getImageData(0,0,1,1).data[3]===0?'verified':'opaque'}catch{}
      setStatus('Готово · потяните фигурку, чтобы повернуть');resizeObserver?.observe(stage);checkResize();
    }catch(error){
      if(token!==generation)return;fetchController.abort();stop();stage.setAttribute('aria-busy','false');
      setStatus(error.name==='AbortError'?'Загрузка прервана. Попробуйте ещё раз.':error.message);retryButton.hidden=false;diagnostics();
    }
  }
  function checkResize(){
    if(!ready)return;clearTimeout(resizeTimer);
    resizeTimer=setTimeout(()=>{
      if(!ready)return;const next=physicalSize();
      if(Math.abs(next[0]-renderSize[0])<8&&Math.abs(next[1]-renderSize[1])<8)return;
      renderSize=next;clearDecoded();wantedIndex=Math.max(0,displayedIndex);warmWindow(wantedIndex,1);scheduleRender();
    },120);
  }
  const resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(checkResize):null;
  window.addEventListener('resize',checkResize);
  slider.addEventListener('input',()=>{setTarget(Number(slider.value),{session:mode!=='settle'});setStatus('Выбираю ракурс…')});
  playButton.addEventListener('click',play);
  stopButton.addEventListener('click',()=>{releaseDrag();stop();setStatus('Остановлено · ракурс сохранён')});
  resetButton.addEventListener('click',()=>{releaseDrag();setTarget(0,{session:true});setStatus('Возвращаю к анфасу…')});
  $('#background').addEventListener('change',event=>{stage.classList.toggle('dark',event.target.value==='dark')});
  versionSelector.addEventListener('change',()=>{
    if(!Object.hasOwn(VERSIONS,versionSelector.value))return;
    if(versionSelector.value===selectedVersion)return;
    selectedVersion=versionSelector.value;
    const url=new URL(window.location.href);url.searchParams.set('version',selectedVersion);
    window.history.replaceState(null,'',url);
    init();
  });
  retryButton.addEventListener('click',init);
  stage.addEventListener('pointerdown',event=>{
    if(!ready||event.button!==0)return;
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
  stage.addEventListener('pointermove',moveDrag);
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
  for(const eventName of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(eventName,finishDrag);
  canvas.addEventListener('keydown',event=>{
    if(!ready)return;
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
      event.preventDefault();setTarget(indexToAngle(angleToIndex(targetAngle)+(event.key==='ArrowRight'?1:-1)),{session:mode!=='settle'});
    }else if(event.key==='Home'){event.preventDefault();setTarget(0,{session:true})}
    else if(event.key===' '){event.preventDefault();if(playing){stop();setStatus('Остановлено · ракурс сохранён')}else play()}
  });
  const preferenceChanged=event=>{if(event.matches&&(playing||mode==='coast')){releaseDrag();stop();setStatus('Вращение остановлено · можно выбрать ракурс вручную')}};
  if(media.addEventListener)media.addEventListener('change',preferenceChanged);else media.addListener(preferenceChanged);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){releaseDrag();stop();setStatus('Остановлено · ракурс сохранён')}});
  window.addEventListener('pagehide',()=>{generation++;ready=false;fetchController?.abort();resizeObserver?.disconnect();clearTimeout(resizeTimer);releaseDrag();stop();clearDecoded();cancelAnimationFrame(raf);raf=0;blobs=[]});
  window.addEventListener('pageshow',event=>{if(event.persisted&&!ready)init()});
  init();
})();
