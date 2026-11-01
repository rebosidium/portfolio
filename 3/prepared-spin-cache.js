// A fixed set of predecoded Spin views (Android large portrait). Full source
// pixels are kept (no downsampling); only the angular sampling is reduced.
// Dependency-free and DOM-free: the owner supplies decode/dispose and decides
// when to prepare or clear. A failed or over-budget set resolves false so the
// owner keeps using its existing on-demand decoder.
export const PREPARED_SPIN_MAX_VIEWS=36;

export function createPreparedSpinCache({decode,dispose,onChange,budgetBytes=96*1024*1024,workers=2}={}) {
  if(typeof decode!=='function')throw new TypeError('decode must be a function');
  if(!Number.isInteger(workers)||workers<1)throw new TypeError('workers must be a positive integer');
  if(!(budgetBytes>0)||!Number.isFinite(budgetBytes))throw new TypeError('budgetBytes must be a positive number');

  let token=0,task=null,ready=false,failed=false,memoryBytes=0;
  let held=[],published=Object.freeze([]);

  const release=resource=>{try{dispose?.(resource)}catch{}};
  const resourceBytes=resource=>{
    const width=resource?.width,height=resource?.height;
    return Number.isInteger(width)&&Number.isInteger(height)&&width>0&&height>0?width*height*4:0;
  };
  // Deliver after the current call stack so an owner notifying from inside
  // prepare/clear never re-enters itself; a cleared generation stays silent.
  function notify(owner){
    queueMicrotask(()=>{
      if(owner!==token||typeof onChange!=='function')return;
      try{onChange(snapshot())}catch{}
    });
  }
  function snapshot(){return Object.freeze({ready,busy:!!task,failed,memoryBytes,count:published.length})}
  function releaseHeld(){
    const resources=held.map(entry=>entry.resource);
    held=[];published=Object.freeze([]);memoryBytes=0;
    resources.forEach(release);
  }
  function fail(owner){
    if(owner!==token)return;
    // Invalidate the batch: running workers stop, late decodes are disposed.
    const current=task;
    token++;task=null;ready=false;failed=true;releaseHeld();
    notify(token);current?.settle(false);
  }
  function validIndices(indices){
    return Array.isArray(indices)&&indices.length>0&&indices.length<=PREPARED_SPIN_MAX_VIEWS&&
      indices.every(index=>Number.isInteger(index)&&index>=0)&&new Set(indices).size===indices.length;
  }

  function prepare(indices,estimatedBytesPerFrame){
    if(task)return task.promise;
    if(ready)return Promise.resolve(true);
    if(failed)return Promise.resolve(false);
    const estimate=Number(estimatedBytesPerFrame);
    if(!validIndices(indices)||!(estimate>0)||!Number.isFinite(estimate)||indices.length*estimate>budgetBytes){
      failed=true;notify(token);return Promise.resolve(false);
    }
    const owner=++token,list=indices.slice(),slots=new Array(list.length);
    let cursor=0,settle;
    const promise=new Promise(resolve=>{settle=resolve});
    task={owner,promise,settle};

    async function work(){
      while(owner===token&&cursor<list.length){
        const slot=cursor++,index=list[slot];
        let resource;
        try{resource=await decode(index)}
        catch{fail(owner);return}
        if(owner!==token){release(resource);return}
        const bytes=resourceBytes(resource);
        if(!bytes||memoryBytes+bytes>budgetBytes){release(resource);fail(owner);return}
        memoryBytes+=bytes;
        const entry={index,state:'ready',used:0,resource};
        slots[slot]=entry;held.push(entry);
      }
    }
    Promise.all(Array.from({length:Math.min(workers,list.length)},work)).then(()=>{
      // A cleared or failed batch was already settled by clear()/fail().
      if(owner===token&&task?.owner===owner){
        task=null;ready=true;published=Object.freeze(slots.slice());notify(owner);
        settle(true);
      }else settle(false);
    });
    return promise;
  }

  function clear(){
    // Detach the running batch: its promise resolves false, its workers stop
    // scheduling, and any decode still in flight is disposed when it lands.
    const previous=task;
    token++;task=null;ready=false;failed=false;releaseHeld();
    previous?.settle(false);
  }

  return {
    prepare,clear,
    get ready(){return ready},
    get busy(){return !!task},
    get failed(){return failed},
    // Ordered as requested; empty until the complete set is ready.
    get entries(){return published},
    get memoryBytes(){return memoryBytes}
  };
}
