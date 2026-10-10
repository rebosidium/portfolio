// Approved icon packs share an avatar-gated low-priority queue.
const cancelled=()=>new DOMException('Cancelled','AbortError');
const avatarReady=s=>s.ready&&s.allReady&&!s.error&&s.activeDownloads===0;
function createIconQueue(portraitPlayer){
  const network=[],decoders=[];let downloads=0,decodes=0,destroyed=false,serial=0,scheduled=false;
  const ready=()=>!destroyed&&avatarReady(portraitPlayer.loadingState);
  function enqueue(kind,owner,execute,signal,valid=()=>true,priority=0){
    return new Promise((resolve,reject)=>{
      const queue=kind==='network'?network:decoders;
      const task={owner,execute,signal,valid,priority,serial:serial++,resolve,reject};
      const abort=()=>{const i=queue.indexOf(task);if(i>=0){queue.splice(i,1);task.cleanup();reject(cancelled())}};
      task.cleanup=()=>signal?.removeEventListener('abort',abort);
      if(signal?.aborted||!ready()||!valid()){reject(cancelled());return}
      signal?.addEventListener('abort',abort,{once:true});queue.push(task);schedulePump();
    });
  }
  // Collect jobs submitted in the same turn before choosing the hovered icon.
  function schedulePump(){if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;pump()})}
  function pump(){
    for(const [kind,queue,limit] of [['network',network,1],['decode',decoders,2]]){
      queue.sort((a,b)=>a.owner.priority()-b.owner.priority()||a.priority-b.priority||a.serial-b.serial);
      while(ready()&&(kind==='network'?downloads:decodes)<limit&&queue.length){
        const task=queue.shift();task.cleanup();
        if(task.signal?.aborted||!task.valid()){task.reject(cancelled());continue}
        if(kind==='network')downloads++;else decodes++;
        Promise.resolve().then(()=>{
          if(!ready()||task.signal?.aborted||!task.valid())throw cancelled();
          return task.execute();
        }).then(task.resolve,task.reject).finally(()=>{if(kind==='network')downloads--;else decodes--;pump()});
      }
    }
  }
  function flush(){for(const queue of [network,decoders])for(const t of queue.splice(0)){t.cleanup();t.reject(cancelled())}}
  const unsubscribe=portraitPlayer.subscribeLoading(()=>{if(!ready())flush();else pump()});
  return {enqueue,pump,get state(){return {activeDownloads:downloads,activeDecoders:decodes,queuedDownloads:network.length,queuedDecoders:decoders.length,gateOpen:ready()}},destroy(){destroyed=true;unsubscribe();flush()}};
}
export function mountFeatureIcons(configurations,{portraitPlayer}={}){
  if(!portraitPlayer?.subscribeLoading)return {players:{},destroy(){}};
  const shared=createIconQueue(portraitPlayer),players={};
  for(const c of configurations)players[c.name]=mountIcon(c.feature,{...c,portraitPlayer,shared});
  return {players,get state(){return shared.state},destroy(){Object.values(players).forEach(p=>p.destroy());shared.destroy()}};
}
export function mountCampfireFeature(feature,options={}){
  const mounted=mountFeatureIcons([{name:'campfire',feature,id:'campfire-approved-v4',prefix:'campfire-v4',leave:'freeze',renderedClass:'campfire-rendered',...options}],options);
  return {get state(){return mounted.players.campfire?.state},destroy:()=>mounted.destroy()};
}
function mountIcon(feature,{portraitPlayer,shared,manifestURL,id,prefix,posters,leave='poster',renderedClass='icon-rendered'}={}) {
  const art=feature?.querySelector('.feature-art'),originalPoster=art?.querySelector('img'),canvas=art?.querySelector('canvas');
  const context=canvas?.getContext('2d');
  if(!context||!originalPoster||!portraitPlayer?.subscribeLoading)return {destroy(){}};
  const media=matchMedia('(prefers-reduced-motion: reduce)'),hoverMedia=matchMedia('(hover: hover)'),sets=new Map(),cache=new Map(),queue=[],cleanup=[];
  const CACHE_LIMIT=12,DECODE_WORKERS=2,LOOKAHEAD=7;
  let poster=originalPoster,manifest=null,active=null,job=null,controller=null,jobGeneration=0,decodeEpoch=0,inFlight=0;
  let avatarState=portraitPlayer.loadingState,gateOpen=false,hovered=false,focused=false,touchFocus=false,inView=false,destroyed=false,playing=false,returning=false;
  let raf=0,startedAt=0,pausedElapsed=null,displayedFrame=0,displayedKey=null,clock=0,draws=0,starts=0,resizeTimer=0,cycles=0;
  let staticPosterToken=0;
  const activated=()=>hovered||focused;
  const owner={priority:()=>activated()?0:inView?1:2};
  const wrap=index=>((index%96)+96)%96;
  const listen=(target,name,fn,options)=>{target.addEventListener(name,fn,options);cleanup.push(()=>target.removeEventListener(name,fn,options));};
  // Keyboard focus remains available on a device whose primary pointer has no hover.
  const loadEligible=()=>!destroyed&&!media.matches&&(hoverMedia.matches||focused)&&!document.hidden;
  const eligible=()=>loadEligible()&&inView;
  const gated=()=>{const current=portraitPlayer.loadingState;return loadEligible()&&gateOpen&&current.generation===avatarState.generation&&avatarReady(current)};
  const decodeGated=()=>gated()&&inView;
  function chooseQuality(){
    if(navigator.connection?.saveData)return '120';
    const pixels=(art.getBoundingClientRect().width||120)*Math.max(1,devicePixelRatio||1);
    return pixels<=120?'120':pixels<=240?'240':'480';
  }
  function prepareImage(image){
    image.className=originalPoster.className;image.classList.add('image-ready');image.width=120;image.height=120;image.alt='';image.setAttribute('data-reveal','');
    image.removeAttribute('srcset');image.removeAttribute('sizes');
    return image;
  }
  function updateStaticPoster(){
    const url=posters?.[chooseQuality()];if(!url)return;
    originalPoster.removeAttribute('srcset');originalPoster.removeAttribute('sizes');
    if(active&&!media.matches)return;
    if(!active&&poster===originalPoster&&!originalPoster.complete){originalPoster.src=url;return}
    if(poster.src===new URL(url,document.baseURI).href)return;
    // This is a static poster, allowed before the animation gate and in reduced motion.
    // Keep the old image/canvas until the browser has the replacement; no explicit frame decode.
    const token=++staticPosterToken,image=prepareImage(new Image());image.decoding='async';
    image.onload=()=>{
      if(destroyed||token!==staticPosterToken||(!media.matches&&active))return;
      poster.replaceWith(image);poster=image;
      if(media.matches)art.classList.remove(renderedClass);
    };
    image.src=url;
  }
  function diagnostics(mode){
    if(mode)canvas.dataset.mode=mode;
    Object.assign(canvas.dataset,{quality:active?.key||'',requestedQuality:chooseQuality(),ready:String(!!active),frame:String(displayedFrame),
      decodedCacheCount:String([...cache.values()].filter(e=>e.resource).length),decodeWorkers:String(inFlight),drawCount:String(draws),startCount:String(starts),
      hovered:String(hovered),focused:String(focused),avatarGeneration:String(avatarState.generation),loadingGeneration:String(jobGeneration),encodedReadyCount:String(active?.blobs.filter(Boolean).length||0)});
  }
  function closeResource(resource){try{resource?.dispose()}catch{}}
  function trimCache(){
    const entries=[...cache.values()].filter(e=>e.resource).sort((a,b)=>a.used-b.used);
    let count=entries.length;
    for(const entry of entries){
      if(count<=CACHE_LIMIT)break;
      if(entry.id===displayedKey||entry.id===job?.protectedKey)continue;
      cache.delete(entry.id);closeResource(entry.resource);count--;
    }
  }
  async function decode(blob){
    if(typeof createImageBitmap==='function'){
      const bitmap=await createImageBitmap(blob);
      return {drawable:bitmap,width:bitmap.width,height:bitmap.height,dispose:()=>bitmap.close()};
    }
    const url=URL.createObjectURL(blob),image=new Image();image.decoding='async';image.src=url;
    try{await image.decode();return {drawable:image,width:image.naturalWidth,height:image.naturalHeight,dispose:()=>{image.src='';URL.revokeObjectURL(url)}}}
    catch(error){URL.revokeObjectURL(url);throw error}
  }
  function pumpDecoder(){
    queue.sort((a,b)=>a.priority-b.priority||b.used-a.used);
    while(decodeGated()&&inFlight<DECODE_WORKERS&&queue.length){
      const entry=queue.shift();if(cache.get(entry.id)!==entry)continue;
      entry.state='decoding';inFlight++;
      shared.enqueue('decode',owner,()=>decode(entry.set.blobs[entry.index]),null,()=>decodeGated()&&entry.avatarGeneration===portraitPlayer.loadingState.generation&&entry.epoch===decodeEpoch&&cache.get(entry.id)===entry,entry.priority).then(resource=>{
        if(!decodeGated()||entry.avatarGeneration!==portraitPlayer.loadingState.generation||entry.epoch!==decodeEpoch||cache.get(entry.id)!==entry){
          closeResource(resource);if(cache.get(entry.id)===entry)cache.delete(entry.id);entry.reject(cancelled());return;
        }
        entry.resource=resource;entry.state='ready';entry.used=++clock;entry.resolve(resource);trimCache();
      }).catch(error=>{if(cache.get(entry.id)===entry)cache.delete(entry.id);entry.reject(error)})
        .finally(()=>{inFlight--;pumpDecoder();diagnostics()});
    }
  }
  function requestDecode(set,index,priority=10){
    index=wrap(index);const id=`${set.key}:${index}`;
    let entry=cache.get(id);
    if(entry){entry.used=++clock;entry.priority=Math.min(entry.priority,priority);return entry.promise}
    if(!set.blobs[index])return Promise.reject(new Error('Icon frame unavailable'));
    entry={id,set,index,priority,used:++clock,epoch:decodeEpoch,avatarGeneration:portraitPlayer.loadingState.generation,state:'queued',resource:null};
    entry.promise=new Promise((resolve,reject)=>{entry.resolve=resolve;entry.reject=reject});
    cache.set(id,entry);queue.push(entry);pumpDecoder();return entry.promise;
  }
  function warmWindow(set,index){
    const wanted=new Set(Array.from({length:LOOKAHEAD+1},(_,i)=>`${set.key}:${wrap(index+i)}`));
    if(job?.preparing)for(const id of job.preparing)wanted.add(id);
    for(let i=queue.length-1;i>=0;i--){
      const entry=queue[i];if(wanted.has(entry.id))continue;
      queue.splice(i,1);cache.delete(entry.id);entry.reject(cancelled());
    }
    for(let i=0;i<=LOOKAHEAD;i++)requestDecode(set,index+i,i).catch(error=>{if(error.name!=='AbortError'&&active===set)fail(error)});
  }
  function draw(set,index){
    const entry=cache.get(`${set.key}:${index}`);if(!entry?.resource)return false;
    const resource=entry.resource;
    if(canvas.width!==set.size[0]||canvas.height!==set.size[1]){canvas.width=set.size[0];canvas.height=set.size[1]}
    context.clearRect(0,0,canvas.width,canvas.height);context.drawImage(resource.drawable,0,0,canvas.width,canvas.height);
    entry.used=++clock;displayedKey=entry.id;displayedFrame=index;draws++;trimCache();return true;
  }
  function stop(mode='idle',showPoster=false){
    playing=false;returning=false;cancelAnimationFrame(raf);raf=0;
    if(showPoster){pausedElapsed=null;art.classList.remove(renderedClass)}
    else if(leave==='freeze'&&displayedKey)pausedElapsed=displayedFrame*1000/24;
    diagnostics(mode);
  }
  function suspendDecoding(){
    // In-flight browser decodes cannot be aborted, so invalidate their result and close it.
    decodeEpoch++;
    for(const entry of [...cache.values()])if(!entry.resource){cache.delete(entry.id);entry.reject(cancelled())}
    queue.length=0;shared.pump();
  }
  function returnToPoster(){
    stop();pausedElapsed=null;
    if(!active||!eligible()||!art.classList.contains(renderedClass)){stop('idle',true);return}
    // Add weighted premultiplied pixels in one canvas: no double-alpha white flash.
    const snapshot=document.createElement('canvas');snapshot.width=canvas.width;snapshot.height=canvas.height;
    snapshot.getContext('2d').drawImage(canvas,0,0);
    const image=active.image,began=performance.now();returning=true;
    const finish=now=>{
      raf=0;if(activated()||!eligible()){stop('idle',!activated());return}
      const t=Math.min(1,(now-began)/180),p=t*t*(3-2*t);
      context.save();context.clearRect(0,0,canvas.width,canvas.height);
      context.globalAlpha=1-p;context.drawImage(snapshot,0,0,canvas.width,canvas.height);
      context.globalCompositeOperation='lighter';context.globalAlpha=p;context.drawImage(image,0,0,canvas.width,canvas.height);context.restore();draws++;
      diagnostics('returning');
      if(t<1)raf=requestAnimationFrame(finish);
      else{displayedFrame=0;displayedKey=null;stop('idle',true);snapshot.width=snapshot.height=0}
    };
    raf=requestAnimationFrame(finish);
  }
  function pauseForAvatar(){
    if(returning)stop('waiting-avatar',true);
    if(playing)pausedElapsed=displayedFrame*1000/24;
    playing=false;returning=false;cancelAnimationFrame(raf);raf=0;
    // Retain the visible pose during an avatar/quality upgrade, without decoder work.
    suspendDecoding();
    diagnostics('waiting-avatar');
  }
  function fail(error){
    cancelJob();stop('static',true);canvas.dataset.error=error?.message||'Icon unavailable';
    if(active)active.failed=true;
  }
  function tick(now){
    raf=0;if(!playing||!eligible()||!activated()){stop(!eligible()?'paused':'idle');return}
    if(!gated()){pauseForAvatar();return}
    const frameDuration=1000/manifest.fps,next=wrap(displayedFrame+1);
    if(now-startedAt>=frameDuration){
      // Advance in sequence only. A slow decoder holds this pose instead of skipping angles.
      if(draw(active,next)){
        if(next===0)cycles++;
        startedAt+=frameDuration;
        if(now-startedAt>=frameDuration)startedAt=now;
      }else startedAt=now-frameDuration;
    }
    warmWindow(active,displayedFrame);canvas.dataset.cycle=String(cycles);diagnostics('playing');
    raf=requestAnimationFrame(tick);
  }
  function start(){
    if(playing||!activated()||!eligible()||!gated()||!active||active.key!==chooseQuality()||active.failed||avatarState.error)return;
    const resumed=pausedElapsed!==null,index=resumed?Math.round(pausedElapsed*manifest.fps/1000)%96:0;
    if(!draw(active,index)){
      requestDecode(active,index,0).then(()=>{if(activated()&&decodeGated())start()},error=>{if(error.name!=='AbortError')fail(error)});return;
    }
    cancelAnimationFrame(raf);returning=false;startedAt=performance.now();pausedElapsed=null;playing=true;if(!resumed){starts++;cycles=0}
    canvas.dataset.cycle=String(cycles);art.classList.add(renderedClass);
    warmWindow(active,index);diagnostics('playing');raf=requestAnimationFrame(tick);
  }
  function cancelJob(){
    jobGeneration++;controller?.abort();controller=null;job=null;
  }
  function validate(data,key){
    const value=data.variants?.[key];
    if(data.id!==id||data.frames!==96||data.fps!==24||data.duration_seconds!==4||data.background!=='transparent'||!value||value.size?.[0]!==Number(key)||value.size?.[1]!==Number(key)||!Array.isArray(value.chunks))throw new Error('Invalid icon manifest');
    if(data.initial_index!==0||data.loop!==true||!new RegExp('^assets/'+prefix+'-poster-'+key+'\\.webp\\?v=[a-f0-9]{12}$').test(value.poster))throw new Error('Invalid icon poster');
    const seen=new Set(),files=new Set();
    for(const chunk of value.chunks){
      if(!new RegExp('^assets/'+prefix+'-'+key+'-[0-9]{2}\\.zip\\?v=[a-f0-9]{12}$').test(chunk.file)||files.has(chunk.file)||!Number.isSafeInteger(chunk.bytes)||chunk.bytes<=0||chunk.bytes>1_000_000||!Array.isArray(chunk.frames)||!chunk.frames.length)throw new Error('Invalid icon pack');
      files.add(chunk.file);
      let end=0;
      for(const frame of chunk.frames){
        if(!Number.isInteger(frame.index)||frame.index<0||frame.index>=96||seen.has(frame.index)||!Number.isSafeInteger(frame.offset)||!Number.isSafeInteger(frame.length)||frame.offset<end||frame.length<=0||frame.offset+frame.length>chunk.bytes)throw new Error('Invalid icon frame');
        seen.add(frame.index);end=frame.offset+frame.length;
      }
    }
    if(seen.size!==96||value.encoded_bytes!==value.chunks.reduce((sum,c)=>sum+c.bytes,0))throw new Error('Incomplete icon pack');
    return value;
  }
  function unpack(bytes,chunk,set){
    if(bytes.byteLength!==chunk.bytes)throw new Error('Incomplete icon download');
    const view=new DataView(bytes);let cursor=0;
    for(const frame of chunk.frames){
      if(cursor+30>bytes.byteLength||view.getUint32(cursor,true)!==0x04034b50||(view.getUint16(cursor+6,true)&~0x800)!==0||view.getUint16(cursor+8,true)!==0||view.getUint32(cursor+18,true)!==frame.length||view.getUint32(cursor+22,true)!==frame.length)throw new Error('Invalid ZIP_STORED frame');
      const offset=cursor+30+view.getUint16(cursor+26,true)+view.getUint16(cursor+28,true);
      if(offset!==frame.offset||frame.length<12||view.getUint32(offset,true)!==0x46464952||view.getUint32(offset+8,true)!==0x50424557||view.getUint32(offset+4,true)+8!==frame.length)throw new Error('Invalid WebP range');
      set.blobs[frame.index]=new Blob([bytes.slice(frame.offset,frame.offset+frame.length)],{type:'image/webp'});cursor=frame.offset+frame.length;
    }
  }
  async function loadSelected(){
    if(!gated())return;
    const key=chooseQuality();diagnostics();
    if(job&&job.key!==key){cancelJob();pauseForAvatar()}
    if(active?.key===key){pumpDecoder();start();return}
    if(job?.key===key)return;
    if(playing||returning)pauseForAvatar();
    cancelJob();const token=jobGeneration,avatarGeneration=avatarState.generation;
    const work=job={key,token,preparing:null,protectedKey:null};controller=new AbortController();const requestController=controller,signal=controller.signal;
    const check=()=>{if(token!==jobGeneration||avatarGeneration!==portraitPlayer.loadingState.generation||key!==chooseQuality()||signal.aborted||!gated())throw cancelled()};
    const get=(url,json=false)=>shared.enqueue('network',owner,async()=>{
      check();const deadline=setTimeout(()=>requestController.abort(new Error('Icon download timeout')),15000);
      try{const response=await fetch(new URL(url,document.baseURI),{signal,cache:'force-cache',priority:'low'});if(!response.ok)throw new Error('Icon download failed');
        const result=json?await response.json():await response.arrayBuffer();check();return result;
      }finally{clearTimeout(deadline)}
    },signal,()=>token===jobGeneration&&avatarGeneration===portraitPlayer.loadingState.generation&&key===chooseQuality()&&!signal.aborted&&gated());
    try{
      // The public promise is generation-specific; current loadingState also gates every request.
      const all=await portraitPlayer.allFramesReady;check();if(!all.ready||all.generation!==avatarGeneration)throw cancelled();
      if(!manifest)manifest=await get(manifestURL,true);
      let set=sets.get(key);
      if(!set){const value=validate(manifest,key);set={...value,key,blobs:new Array(96),completeChunks:new Set(),image:null,posterURL:null,failed:false};sets.set(key,set)}
      if(set.failed)throw new Error('Icon unavailable');
      for(let i=0;i<set.chunks.length;i++){
        if(set.completeChunks.has(i))continue;
        const chunk=set.chunks[i],bytes=await get(chunk.file);check();
        unpack(bytes,chunk,set);
        set.completeChunks.add(i);
      }
      check();
      // Offscreen packs may finish downloading, but raster work waits for visibility.
      if(!decodeGated()){job=null;controller=null;diagnostics('offscreen');return}
      if(!set.image){
        // Frame 0 is byte-identical to the supplied quality poster: no second poster request.
        if(set.posterURL)URL.revokeObjectURL(set.posterURL);
        set.posterURL=URL.createObjectURL(set.blobs[0]);const image=new Image();image.decoding='async';
        await shared.enqueue('decode',owner,()=>{image.src=set.posterURL;return image.decode()},signal,()=>token===jobGeneration&&avatarGeneration===portraitPlayer.loadingState.generation&&!signal.aborted&&decodeGated());check();
        if(!decodeGated()){image.removeAttribute('src');throw cancelled()}
        set.image=image;
      }
      const index=pausedElapsed!==null?Math.round(pausedElapsed*manifest.fps/1000)%96:0;
      // Idle icons decode only the quality poster, not a window of every icon's frames.
      if(activated()||art.classList.contains(renderedClass)){
        work.protectedKey=`${key}:${index}`;work.preparing=new Set(Array.from({length:LOOKAHEAD+1},(_,i)=>`${key}:${wrap(index+i)}`));
        await Promise.all(Array.from({length:LOOKAHEAD+1},(_,i)=>requestDecode(set,index+i,i)));check();
      }
      const replacementIndex=pausedElapsed!==null?Math.round(pausedElapsed*manifest.fps/1000)%96:0;
      work.protectedKey=`${key}:${replacementIndex}`;
      if(art.classList.contains(renderedClass)){await requestDecode(set,replacementIndex,0);check()}
      check();if(!decodeGated())throw cancelled();
      // Draw the matching pose and replace its hidden poster in the same JavaScript task.
      if(art.classList.contains(renderedClass)&&!draw(set,replacementIndex))throw new Error('Icon replacement frame unavailable');
      const image=prepareImage(set.image);
      poster.replaceWith(image);poster=image;active=set;job=null;controller=null;staticPosterToken++;delete canvas.dataset.error;
      // Resume the exact displayed phase; the next frame follows after a full frame interval.
      if(!activated()&&leave==='poster')stop('idle',true);
      start();
      diagnostics(playing?'playing':'idle');
    }catch(error){
      if(token!==jobGeneration)return;
      job=null;controller=null;
      if(error.name==='AbortError')return;
      const set=sets.get(key);if(set)set.failed=true;
      fail(error);
    }
  }
  function avatarChanged(state){
    const previous=avatarState;avatarState=state;
    gateOpen=avatarReady(state);
    if(!gateOpen||state.generation!==previous.generation){cancelJob();pauseForAvatar()}
    if(state.error||(!state.loading&&!state.ready)){stop(media.matches?'reduced':'static',true);return}
    if(gateOpen)loadSelected();diagnostics();
  }
  function environmentChanged(){
    updateStaticPoster();
    focused=!touchFocus&&feature.contains(document.activeElement);
    if(!loadEligible()){
      cancelJob();stop(media.matches?'reduced':document.hidden?'hidden':'no-hover',media.matches||leave==='poster');suspendDecoding();
      if(media.matches){for(const e of cache.values())closeResource(e.resource);cache.clear()}
      diagnostics();
      return;
    }
    hovered=hoverMedia.matches&&feature.matches(':hover');
    if(!inView){stop('offscreen',leave==='poster');suspendDecoding()}
    loadSelected();if(activated())start();shared.pump();
  }
  listen(feature,'pointerenter',event=>{if(event.pointerType==='touch'||!hoverMedia.matches)return;hovered=true;diagnostics();shared.pump();start();loadSelected()});
  listen(feature,'pointerleave',()=>{hovered=false;if(!activated()){if(leave==='freeze')stop();else returnToPoster()}shared.pump()});
  listen(feature,'pointerdown',event=>{touchFocus=event.pointerType==='touch';if(touchFocus){focused=false;hovered=false;environmentChanged()}},{capture:true});
  listen(window,'keydown',()=>{if(touchFocus){touchFocus=false;focused=feature.contains(document.activeElement);if(focused)environmentChanged()}},{capture:true});
  listen(feature,'focusin',()=>{focused=!touchFocus;diagnostics();shared.pump();loadSelected();start()});
  listen(feature,'focusout',event=>{
    if(event.relatedTarget&&feature.contains(event.relatedTarget))return;
    focused=false;
    if(!activated()){if(leave==='freeze')stop();else returnToPoster()}
    if(!loadEligible()){cancelJob();suspendDecoding()}
    diagnostics();shared.pump();
  });
  listen(media,'change',environmentChanged);listen(hoverMedia,'change',environmentChanged);listen(document,'visibilitychange',environmentChanged);
  listen(window,'resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{updateStaticPoster();loadSelected();diagnostics()},140)});
  if(navigator.connection?.addEventListener)listen(navigator.connection,'change',()=>{updateStaticPoster();loadSelected()});
  const resizeObserver=new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{updateStaticPoster();loadSelected();diagnostics()},140)});resizeObserver.observe(art);
  const intersectionObserver=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;environmentChanged()});intersectionObserver.observe(feature);
  let densityQuery,densityChanged;
  function watchDensity(){
    densityQuery?.removeEventListener('change',densityChanged);
    densityQuery=matchMedia(`(resolution: ${devicePixelRatio||1}dppx)`);
    densityChanged=()=>{watchDensity();updateStaticPoster();loadSelected();diagnostics()};densityQuery.addEventListener('change',densityChanged);
  }
  updateStaticPoster();watchDensity();cleanup.push(()=>densityQuery.removeEventListener('change',densityChanged));
  cleanup.push(portraitPlayer.subscribeLoading(avatarChanged));
  diagnostics(media.matches?'reduced':!hoverMedia.matches?'no-hover':'waiting-avatar');
  return {get state(){return {quality:active?.key||null,hovered,focused,playing,returning,frame:displayedFrame,gateOpen,avatarGeneration:avatarState.generation}},destroy(){
    destroyed=true;staticPosterToken++;cancelJob();stop('static',true);decodeEpoch++;clearTimeout(resizeTimer);resizeObserver.disconnect();intersectionObserver.disconnect();cleanup.forEach(fn=>fn());
    for(const entry of cache.values()){if(entry.resource)closeResource(entry.resource);else entry.reject(cancelled())}cache.clear();queue.length=0;
    for(const set of sets.values())if(set.posterURL)URL.revokeObjectURL(set.posterURL);
    if(poster!==originalPoster)poster.replaceWith(originalPoster);
  }};
}
