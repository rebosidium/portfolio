/* DS presentation only. Decode the mounted native SVGs in a bounded queue. */
(() => {
  const records=new WeakMap(),owned=new Set();
  function createQueue(){
    const waiting=[];let active=0,scheduled=false,sequence=0;
    function order(job){
      const frame=job.image.ownerDocument.defaultView?.frameElement;
      const anchor=frame||job.image.closest('.ds-icon-card,.agent-button')||job.image;
      const box=anchor.getBoundingClientRect();
      const visible=box.bottom>0&&box.top<innerHeight&&box.right>0&&box.left<innerWidth;
      const near=box.bottom>0&&box.top<innerHeight*2;
      const local=job.image.getBoundingClientRect();
      const row=job.image.closest('.agent-button-logos,.ds-icon-preview');
      // Cropped brand assets can sit a fraction lower inside the same row.
      // Use the row baseline, then the actual rendered left-to-right position.
      return [visible?0:near?1:2,box.top+scrollY,box.left,job.image.closest('.agent-button-copied')?1:0,row?row.getBoundingClientRect().top:local.top,local.left,job.sequence];
    }
    function pump(){
      scheduled=false;
      waiting.sort((a,b)=>{
        const x=order(a),y=order(b);for(let i=0;i<x.length;i++)if(x[i]!==y[i])return x[i]-y[i];return 0;
      });
      while(active<2&&waiting.length){
        const job=waiting.shift();if(!job.alive()){job.cancel();continue;}
        active++;job.start().finally(()=>{active--;schedule();});
      }
    }
    function schedule(){if(!scheduled){scheduled=true;queueMicrotask(pump);}}
    return {add(job){job.sequence=++sequence;waiting.push(job);schedule();}};
  }
  let queue;try{queue=parent!==window&&parent.DSAssets?.queue;}catch(_){}
  queue=queue||createQueue();
  function visible(element){
    const view=element.ownerDocument.defaultView,box=element.getBoundingClientRect();
    if(!view||box.bottom<=0||box.top>=view.innerHeight||box.right<=0||box.left>=view.innerWidth)return false;
    for(let node=element.parentElement;node;node=node.parentElement){
      const style=view.getComputedStyle(node);if(style.visibility==='hidden'||style.display==='none'||Number(style.opacity)===0)return false;
    }
    const frame=view.frameElement;
    return !frame||visible(frame);
  }
  function stage(html,selector='img'){
    const template=document.createElement('template');template.innerHTML=html;
    // A template parses noscript as DOM. This JS-only staging path must not
    // activate the live component's no-JS fallback styles when it is inserted.
    template.content.querySelectorAll('noscript').forEach(node=>node.remove());
    for(const image of template.content.querySelectorAll(selector)){
      if(!image.hasAttribute('src'))continue;
      image.dataset.dsSrc=image.getAttribute('src');image.removeAttribute('src');
    }
    return template.content;
  }
  function reveal(group,slow){
    const view=group.ownerDocument.defaultView;
    const animate=slow&&visible(group)&&!view.matchMedia('(prefers-reduced-motion: reduce)').matches;
    group.dataset.dsAssetState=animate?'revealing':'ready';
    if(!animate)return;
    const finish=event=>{
      if(event.target!==group||event.animationName!=='ds-asset-enter')return;
      group.dataset.dsAssetState='ready';
      group.removeEventListener('animationend',finish);group.removeEventListener('animationcancel',finish);
    };
    group.addEventListener('animationend',finish);group.addEventListener('animationcancel',finish);
  }
  function register(image){
    if(records.has(image))return records.get(image);
    const doc=image.ownerDocument,frame=doc.defaultView?.frameElement;
    let complete,done=false,settled=false,started=0,deadline,remove=()=>{};
    const record={image,slow:false,alive:()=>image.isConnected&&(!frame||frame.isConnected&&frame.contentDocument===doc)};
    record.ready=new Promise(resolve=>{complete=resolve;});
    const release=success=>{
      if(settled)return;settled=true;record.slow=started>0&&performance.now()-started>50;complete(success);
    };
    const finish=success=>{
      if(done)return;done=true;clearTimeout(deadline);remove();
      if(!success)image.dataset.dsImageError='true';
      else if(record.timedOut){
        delete image.dataset.dsImageError;
        reveal(image,true);
        const button=image.closest('.agent-button');
        if(button)button.dataset.agentIconsReady=String([...button.querySelectorAll('img')].every(node=>node.complete&&node.naturalWidth>0));
      }
      owned.delete(record);release(success);
    };
    record.cancel=()=>finish(false);
    record.start=()=>{
      if(done||!record.alive()){finish(false);return record.ready;}
      started=performance.now();image.loading='eager';image.fetchPriority='low';
      const load=async()=>{
        if(!image.naturalWidth){finish(false);return;}
        try{await image.decode();}catch(_){}
        finish(image.naturalWidth>0);
      };
      const error=()=>finish(false);
      image.addEventListener('load',load,{once:true});image.addEventListener('error',error,{once:true});
      remove=()=>{image.removeEventListener('load',load);image.removeEventListener('error',error);};
      image.src=image.dataset.dsSrc;delete image.dataset.dsSrc;
      // A stalled request must not hold the entire gallery. Leave its native
      // request alive so a late successful load can still reveal that same node.
      deadline=setTimeout(()=>{if(!done){record.timedOut=true;image.dataset.dsImageError='true';release(false);}},8000);
      if(image.complete)queueMicrotask(()=>image.naturalWidth?load():error());
      return record.ready;
    };
    records.set(image,record);owned.add(record);queue.add(record);return record;
  }
  function prepare(root){
    const groups=new Map();
    for(const image of root.querySelectorAll('img[data-ds-src]')){
      const group=image.closest('.agent-button-logos,.ds-icon-preview')||image;
      if(!groups.has(group))groups.set(group,[]);
      group.dataset.dsAssetState='pending';groups.get(group).push(register(image));
    }
    for(const [group,jobs] of groups){
      Promise.allSettled(jobs.map(job=>job.ready)).then(()=>{
        if(!group.isConnected)return;
        reveal(group,jobs.some(job=>job.slow));
      });
    }
  }
  window.addEventListener('pagehide',event=>{if(!event.persisted)for(const record of [...owned])record.cancel();});
  window.DSAssets={queue,stage,prepare,whenReady:image=>records.get(image)?.ready};
})();
