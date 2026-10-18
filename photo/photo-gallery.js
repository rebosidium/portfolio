(() => {
  'use strict';
  for(const gallery of document.querySelectorAll('.photo-gallery')){
    const field=gallery.querySelector('.photo-gallery-field');
    if(!field||field.dataset.ready)continue;
    field.dataset.ready='true';
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const originals=[...field.children];
    const worldWidth=+field.dataset.worldWidth,worldHeight=+field.dataset.worldHeight;
    const records=originals.map(node=>({node,x:+node.dataset.photoX,y:+node.dataset.photoY,w:+node.dataset.photoWidth,h:+node.dataset.photoHeight}));
    // A fixed 3 × 3 pool is recycled in both directions; DOM and memory never grow.
    const cards=[];
    for(let row=-1;row<=1;row++)for(let col=-1;col<=1;col++)for(const record of records){
      const node=row===0&&col===0?record.node:record.node.cloneNode(true);
      if(node!==record.node){node.setAttribute('aria-hidden','true');node.querySelector('img').alt='';field.append(node);}
      cards.push({...record,node,row,col});
    }
    gallery.classList.add('photo-gallery-enhanced');
    const wrap=(n,size)=>((n+size/2)%size+size)%size-size/2;
    let width=0,height=0,unit=1,tileW=1,tileH=1,x=0,y=0,vx=0,vy=0,frame=0,previous=0,visible=true,drag=null;
    function paint(){
      for(const card of cards){
        const px=(card.x+card.w/2-worldWidth/2)*unit+card.col*tileW+x;
        const py=(card.y+card.h/2-worldHeight/2)*unit+card.row*tileH+y;
        const w=card.w*unit,h=card.h*unit;
        const outside=Math.abs(px)>width/2+w/2||Math.abs(py)>height/2+h/2;
        card.node.hidden=outside;
        if(outside)continue;
        const distance=Math.hypot(px/(width*.64),py/(height*.72));
        const lens=1-.18*Math.min(1,distance*distance);
        card.node.style.width=w+'px';card.node.style.height=h+'px';
        card.node.style.transform=`translate3d(${width/2+px-w/2}px,${height/2+py-h/2}px,0) scale(${lens})`;
      }
    }
    function stop(){if(frame)cancelAnimationFrame(frame);frame=0;vx=vy=0;previous=0;}
    function tick(now){
      frame=0;
      if(!visible||document.hidden||document.documentElement.classList.contains('mobile-menu-open')){stop();return;}
      const dt=Math.min(32,previous?now-previous:16);previous=now;
      if(!drag){x=wrap(x+vx*dt,tileW);y=wrap(y+vy*dt,tileH);vx*=Math.exp(-dt/240);vy*=Math.exp(-dt/240);}
      paint();
      if(!drag&&Math.hypot(vx,vy)>.015)frame=requestAnimationFrame(tick);else previous=0;
    }
    function request(){if(!frame)frame=requestAnimationFrame(tick);}
    function measure(){
      width=field.clientWidth;height=field.clientHeight;unit=width<768?.49:.68;
      tileW=worldWidth*unit;tileH=worldHeight*unit;
      // Ensure three pooled tiles cover even an unusually wide specimen.
      unit=Math.max(unit,width/(worldWidth*1.7),height/(worldHeight*1.7));tileW=worldWidth*unit;tileH=worldHeight*unit;
      x=wrap(x,tileW);y=wrap(y,tileH);paint();
    }
    field.addEventListener('pointerdown',event=>{
      if(!event.isPrimary||event.button!==0)return;
      stop();drag={id:event.pointerId,startX:event.clientX,startY:event.clientY,lastX:event.clientX,lastY:event.clientY,time:event.timeStamp,active:true};
      // A gesture begun inside the field explores in both axes, including touch.
      if(drag.active){field.setPointerCapture(event.pointerId);gallery.dataset.dragging='';}
    });
    field.addEventListener('pointermove',event=>{
      if(!drag||event.pointerId!==drag.id)return;
      const dx=event.clientX-drag.lastX,dy=event.clientY-drag.lastY,dt=Math.max(8,event.timeStamp-drag.time);
      x=wrap(x+dx,tileW);y=wrap(y+dy,tileH);
      vx=Math.max(-3,Math.min(3,dx/dt));vy=Math.max(-3,Math.min(3,dy/dt));
      Object.assign(drag,{lastX:event.clientX,lastY:event.clientY,time:event.timeStamp});
      paint();
    });
    function release(event){
      if(!drag||event.pointerId!==drag.id)return;
      const active=drag.active,stale=event.timeStamp-drag.time>90;
      drag=null;delete gallery.dataset.dragging;
      if(event.type==='pointercancel'||reduced.matches||stale||!active)stop();else request();
    }
    field.addEventListener('pointerup',release);field.addEventListener('pointercancel',release);field.addEventListener('lostpointercapture',release);
    field.addEventListener('wheel',event=>{
      // Wheel and trackpad gestures over the field explore both axes; Ctrl keeps native zoom.
      if(event.ctrlKey)return;
      event.preventDefault();stop();const amount=event.deltaMode===1?16:event.deltaMode===2?height:1;
      x=wrap(x-(event.shiftKey?(event.deltaX||event.deltaY):event.deltaX)*amount,tileW);y=wrap(y-(event.shiftKey?0:event.deltaY)*amount,tileH);paint();
    },{passive:false});
    field.addEventListener('keydown',event=>{
      const moves={ArrowLeft:[100,0],ArrowRight:[-100,0],ArrowUp:[0,100],ArrowDown:[0,-100]};
      if(!moves[event.key]&&event.key!=='Home')return;
      event.preventDefault();stop();if(event.key==='Home'){x=y=0;}else{x=wrap(x+moves[event.key][0],tileW);y=wrap(y+moves[event.key][1],tileH);}paint();
    });
    new ResizeObserver(measure).observe(field);
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible)stop();},{rootMargin:'100px'}).observe(field);
    const pause=()=>{stop();drag=null;delete gallery.dataset.dragging;};
    document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
    new MutationObserver(()=>{if(document.documentElement.classList.contains('mobile-menu-open'))pause();}).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
    reduced.addEventListener('change',pause);window.addEventListener('pagehide',pause);
    measure();
  }
})();
