// Approved Campfire v4: encoded frame packs, one hover target, a small decoder LRU.
export function mountCampfireFeature(feature,{portraitPlayer,manifestURL}={}) {
  const art=feature?.querySelector('.feature-art'),originalPoster=art?.querySelector('img'),canvas=art?.querySelector('canvas');
  const context=canvas?.getContext('2d');
  if(!context||!originalPoster||!portraitPlayer?.subscribeLoading)return {destroy(){}};
  const media=matchMedia('(prefers-reduced-motion: reduce)'),sets=new Map(),cache=new Map(),queue=[],cleanup=[];
  const CACHE_LIMIT=12,DECODE_WORKERS=2,LOOKAHEAD=7;
  let poster=originalPoster,manifest=null,active=null,job=null,controller=null,jobGeneration=0,decodeEpoch=0,inFlight=0;
  let avatarState=portraitPlayer.loadingState,gateOpen=false,hovered=false,inView=false,destroyed=false,playing=false;
  let raf=0,startedAt=0,pausedElapsed=null,displayedFrame=0,displayedKey=null,clock=0,draws=0,starts=0,resizeTimer=0;
  const cancelled=()=>new DOMException('Cancelled','AbortError');
  const wrap=index=>((index%96)+96)%96;
  const listen=(target,name,fn,options)=>{target.addEventListener(name,fn,options);cleanup.push(()=>target.removeEventListener(name,fn,options));};
  const eligible=()=>!destroyed&&!media.matches&&!document.hidden&&inView;
  const gated=()=>{const current=portraitPlayer.loadingState;return eligible()&&gateOpen&&current.generation===avatarState.generation&&current.ready&&current.allReady&&current.activeDownloads===0};
  function chooseQuality(){
    if(navigator.connection?.saveData)return '120';
    const pixels=(art.getBoundingClientRect().width||120)*Math.max(1,devicePixelRatio||1);
    return pixels<=120?'120':pixels<=240?'240':'480';
  }
  function diagnostics(mode){
    if(mode)canvas.dataset.mode=mode;
    Object.assign(canvas.dataset,{quality:active?.key||'',requestedQuality:chooseQuality(),ready:String(!!active),frame:String(displayedFrame),
      decodedCacheCount:String([...cache.values()].filter(e=>e.resource).length),decodeWorkers:String(inFlight),drawCount:String(draws),startCount:String(starts),
      hovered:String(hovered),avatarGeneration:String(avatarState.generation),loadingGeneration:String(jobGeneration),encodedReadyCount:String(active?.blobs.filter(Boolean).length||0)});
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
    while(gated()&&inFlight<DECODE_WORKERS&&queue.length){
      const entry=queue.shift();if(cache.get(entry.id)!==entry)continue;
      entry.state='decoding';inFlight++;
      decode(entry.set.blobs[entry.index]).then(resource=>{
        if(destroyed||entry.epoch!==decodeEpoch||cache.get(entry.id)!==entry){closeResource(resource);entry.reject(cancelled());return}
        entry.resource=resource;entry.state='ready';entry.used=++clock;entry.resolve(resource);trimCache();
      }).catch(error=>{if(cache.get(entry.id)===entry)cache.delete(entry.id);entry.reject(error)})
        .finally(()=>{inFlight--;pumpDecoder();diagnostics()});
    }
  }
  function requestDecode(set,index,priority=10){
    index=wrap(index);const id=`${set.key}:${index}`;
    let entry=cache.get(id);
    if(entry){entry.used=++clock;entry.priority=Math.min(entry.priority,priority);return entry.promise}
    if(!set.blobs[index])return Promise.reject(new Error('Campfire frame unavailable'));
    entry={id,set,index,priority,used:++clock,epoch:decodeEpoch,state:'queued',resource:null};
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
    playing=false;cancelAnimationFrame(raf);raf=0;
    if(showPoster){pausedElapsed=null;art.classList.remove('campfire-rendered')}
    else if(displayedKey)pausedElapsed=displayedFrame*1000/24;
    diagnostics(mode);
  }
  function pauseForAvatar(){
    if(playing)pausedElapsed=displayedFrame*1000/24;
    playing=false;cancelAnimationFrame(raf);raf=0;
    // Retain the visible pose during an avatar/quality upgrade, without decoder work.
    for(const entry of queue.splice(0)){cache.delete(entry.id);entry.reject(cancelled())}
    diagnostics('waiting-avatar');
  }
  function fail(error){
    cancelJob();stop('static',true);canvas.dataset.error=error?.message||'Campfire unavailable';
    if(active)active.failed=true;
  }
  function tick(now){
    raf=0;if(!playing||!eligible()||!hovered){stop(!eligible()?'paused':'idle');return}
    if(!gated()){pauseForAvatar();return}
    const elapsed=Math.max(0,now-startedAt),index=Math.floor(elapsed*manifest.fps/1000)%manifest.frames;
    if(displayedKey!==`${active.key}:${index}`)draw(active,index);
    warmWindow(active,index);canvas.dataset.cycle=String(Math.floor(elapsed/4000));diagnostics('playing');
    raf=requestAnimationFrame(tick);
  }
  function start(){
    if(playing||!hovered||!gated()||!active||active.key!==chooseQuality()||active.failed||avatarState.error)return;
    const resumed=pausedElapsed!==null,index=resumed?Math.round(pausedElapsed*manifest.fps/1000)%96:0;
    if(!draw(active,index)){
      requestDecode(active,index,0).then(()=>{if(hovered&&gated())start()},error=>{if(error.name!=='AbortError')fail(error)});return;
    }
    startedAt=performance.now()-(pausedElapsed||0);pausedElapsed=null;playing=true;if(!resumed)starts++;
    canvas.dataset.cycle=String(Math.floor((performance.now()-startedAt)/4000));art.classList.add('campfire-rendered');
    warmWindow(active,index);diagnostics('playing');raf=requestAnimationFrame(tick);
  }
  function cancelJob(){
    jobGeneration++;controller?.abort();controller=null;job=null;
  }
  function validate(data,key){
    const value=data.variants?.[key];
    if(data.id!=='campfire-approved-v4'||data.frames!==96||data.fps!==24||data.duration_seconds!==4||data.background!=='transparent'||!value||value.size?.[0]!==Number(key)||value.size?.[1]!==Number(key)||!Array.isArray(value.chunks))throw new Error('Invalid Campfire v4 manifest');
    const seen=new Set();
    for(const chunk of value.chunks){
      if(!new RegExp('^assets/campfire-v4-'+key+'-[0-9]{2}\\.zip\\?v=[a-f0-9]{12}$').test(chunk.file)||!Number.isSafeInteger(chunk.bytes)||chunk.bytes<=0||chunk.bytes>1_000_000||!Array.isArray(chunk.frames))throw new Error('Invalid Campfire pack');
      let end=0;
      for(const frame of chunk.frames){
        if(!Number.isInteger(frame.index)||frame.index<0||frame.index>=96||seen.has(frame.index)||!Number.isSafeInteger(frame.offset)||!Number.isSafeInteger(frame.length)||frame.offset<end||frame.length<=0||frame.offset+frame.length>chunk.bytes)throw new Error('Invalid Campfire frame');
        seen.add(frame.index);end=frame.offset+frame.length;
      }
    }
    if(seen.size!==96||value.encoded_bytes!==value.chunks.reduce((sum,c)=>sum+c.bytes,0))throw new Error('Incomplete Campfire pack');
    return value;
  }
  async function loadSelected(){
    if(!gated())return;
    const key=chooseQuality();diagnostics();
    if(active?.key===key){start();return}
    if(job?.key===key)return;
    if(playing)pauseForAvatar();
    cancelJob();const token=jobGeneration,avatarGeneration=avatarState.generation;
    const work=job={key,token,preparing:null,protectedKey:null};controller=new AbortController();const requestController=controller,signal=controller.signal;
    const check=()=>{if(token!==jobGeneration||avatarGeneration!==avatarState.generation||signal.aborted||!gated())throw cancelled()};
    const get=async (url,json=false)=>{
      check();const deadline=setTimeout(()=>requestController.abort(new Error('Campfire download timeout')),15000);
      try{const response=await fetch(new URL(url,document.baseURI),{signal,cache:'force-cache',priority:'low'});if(!response.ok)throw new Error('Campfire download failed');
        const result=json?await response.json():await response.arrayBuffer();check();return result;
      }finally{clearTimeout(deadline)}
    };
    try{
      // The public promise is generation-specific; current loadingState also gates every request.
      const all=await portraitPlayer.allFramesReady;check();if(!all.ready||all.generation!==avatarGeneration)throw cancelled();
      if(!manifest)manifest=await get(manifestURL,true);
      let set=sets.get(key);
      if(!set){const value=validate(manifest,key);set={...value,key,blobs:new Array(96),completeChunks:new Set(),image:null,posterURL:null,failed:false};sets.set(key,set)}
      if(set.failed)throw new Error('Campfire unavailable');
      for(let i=0;i<set.chunks.length;i++){
        if(set.completeChunks.has(i))continue;
        const chunk=set.chunks[i],bytes=await get(chunk.file);check();
        if(bytes.byteLength!==chunk.bytes)throw new Error('Incomplete Campfire download');
        for(const frame of chunk.frames)set.blobs[frame.index]=new Blob([bytes.slice(frame.offset,frame.offset+frame.length)],{type:'image/webp'});
        set.completeChunks.add(i);
      }
      check();
      if(!set.image){
        // Frame 0 is byte-identical to the supplied quality poster: no second poster request.
        if(set.posterURL)URL.revokeObjectURL(set.posterURL);
        set.posterURL=URL.createObjectURL(set.blobs[0]);const image=new Image();image.decoding='async';image.src=set.posterURL;
        await image.decode();check();set.image=image;
      }
      const index=playing?Math.floor((performance.now()-startedAt)*manifest.fps/1000)%96:pausedElapsed!==null?Math.round(pausedElapsed*manifest.fps/1000)%96:0;
      work.protectedKey=`${key}:${index}`;work.preparing=new Set(Array.from({length:LOOKAHEAD+1},(_,i)=>`${key}:${wrap(index+i)}`));
      await Promise.all(Array.from({length:LOOKAHEAD+1},(_,i)=>requestDecode(set,index+i,i)));check();
      const replacementIndex=pausedElapsed!==null?Math.round(pausedElapsed*manifest.fps/1000)%96:0;
      work.protectedKey=`${key}:${replacementIndex}`;
      await requestDecode(set,replacementIndex,0);check();
      const image=set.image;image.className=originalPoster.className;image.classList.add('image-ready');image.width=120;image.height=120;image.alt='';image.setAttribute('data-reveal','');
      poster.replaceWith(image);poster=image;active=set;job=null;controller=null;delete canvas.dataset.error;
      // Keep the existing loop phase on a quality replacement; first hover always starts at 0.
      if(playing){const current=Math.floor((performance.now()-startedAt)*manifest.fps/1000)%96;draw(set,current);warmWindow(set,current)}
      else{if(pausedElapsed!==null&&art.classList.contains('campfire-rendered'))draw(set,replacementIndex);start()}
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
    gateOpen=state.ready&&state.allReady&&state.activeDownloads===0;
    if(!gateOpen||state.generation!==previous.generation){cancelJob();pauseForAvatar()}
    if(state.error||(!state.loading&&!state.ready)){stop(media.matches?'reduced':'static',true);return}
    if(gateOpen)loadSelected();diagnostics();
  }
  function environmentChanged(){
    if(!eligible()){
      cancelJob();stop(media.matches?'reduced':document.hidden?'hidden':'offscreen',media.matches);
      if(media.matches){decodeEpoch++;for(const e of cache.values()){if(e.resource)closeResource(e.resource);else e.reject(cancelled())}cache.clear();queue.length=0}
      return;
    }
    hovered=feature.matches(':hover');loadSelected();if(hovered)start();
  }
  listen(feature,'pointerenter',event=>{if(event.pointerType==='touch')return;hovered=true;diagnostics();start();loadSelected()});
  listen(feature,'pointerleave',()=>{hovered=false;stop();});
  listen(media,'change',environmentChanged);listen(document,'visibilitychange',environmentChanged);
  listen(window,'resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{loadSelected();diagnostics()},140)});
  if(navigator.connection?.addEventListener)listen(navigator.connection,'change',()=>loadSelected());
  const resizeObserver=new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{loadSelected();diagnostics()},140)});resizeObserver.observe(art);
  const intersectionObserver=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;environmentChanged()});intersectionObserver.observe(feature);
  let densityQuery,densityChanged;
  function watchDensity(){
    densityQuery?.removeEventListener('change',densityChanged);
    densityQuery=matchMedia(`(resolution: ${devicePixelRatio||1}dppx)`);
    densityChanged=()=>{watchDensity();loadSelected();diagnostics()};densityQuery.addEventListener('change',densityChanged);
  }
  watchDensity();cleanup.push(()=>densityQuery.removeEventListener('change',densityChanged));
  cleanup.push(portraitPlayer.subscribeLoading(avatarChanged));
  diagnostics(media.matches?'reduced':'waiting-avatar');
  return {get state(){return {quality:active?.key||null,hovered,playing,frame:displayedFrame,gateOpen,avatarGeneration:avatarState.generation}},destroy(){
    destroyed=true;cancelJob();stop('static',true);decodeEpoch++;clearTimeout(resizeTimer);resizeObserver.disconnect();intersectionObserver.disconnect();cleanup.forEach(fn=>fn());
    for(const entry of cache.values()){if(entry.resource)closeResource(entry.resource);else entry.reject(cancelled())}cache.clear();queue.length=0;
    for(const set of sets.values())if(set.posterURL)URL.revokeObjectURL(set.posterURL);
    if(poster!==originalPoster)poster.replaceWith(originalPoster);
  }};
}
