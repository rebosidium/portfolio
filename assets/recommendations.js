(() => {
  'use strict';
  document.querySelectorAll('[data-recommendations]').forEach(root=>{
    if(root.dataset.recommendationsReady)return;
    const slides=[...root.querySelectorAll('.recommendations-slide')];
    const dots=[...root.querySelectorAll('.recommendations-dot')];
    const fills=dots.map(dot=>dot.querySelector('.recommendations-dot-fill'));
    const controls=root.querySelector('.recommendations-controls');
    const dotStrip=root.querySelector('.recommendations-dots');
    const status=root.querySelector('.recommendations-status');
    if(slides.length<2||dots.length!==slides.length||fills.some(fill=>!fill))return;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const previewPaused=['paused','reduced-motion'].includes(root.closest('.ds-preview')?.dataset.state);
    const duration=Math.max(4000,Number(root.dataset.duration)||12000);
    let index=0,visible=false,focused=false,keyboardMode=false,gesture=null;
    let animation=null,generation=0,deadline=0,visibilityFrame=0,canAnimate=typeof fills[0].animate==='function';
    let ink=null;
    const inkPace=1.25;
    const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter('en',{granularity:'grapheme'}):null;
    const noise=n=>{const value=Math.sin(n*12.9898)*43758.5453;return value-Math.floor(value);};
    function stopInk(){
      const current=ink;ink=null;
      current?.animations.forEach(item=>item.cancel());current?.layer.remove();
      root.classList.remove('is-ink-changing');root.dataset.inkTransition='idle';
    }
    function measureLetters(slide){
      const paragraph=slide.querySelector('blockquote p'),style=getComputedStyle(paragraph);
      const walker=document.createTreeWalker(paragraph,NodeFilter.SHOW_TEXT),range=document.createRange(),letters=[];
      let node;
      while((node=walker.nextNode())){
        let offset=0;
        const parts=segmenter?[...segmenter.segment(node.data)].map(part=>part.segment):Array.from(node.data);
        for(const text of parts){
          const start=offset;offset+=text.length;if(!text.trim())continue;
          range.setStart(node,start);range.setEnd(node,offset);
          const box=range.getBoundingClientRect();
          if(box.width&&box.height)letters.push({text,x:box.left,y:box.top});
        }
      }
      return {letters,style};
    }
    function canPlayInk(){
      return root.dataset.letterMotion==='newspaper'&&canAnimate&&!reduced.matches&&
        root.closest('.ds-preview')?.dataset.state!=='reduced-motion'&&visible&&!document.hidden&&
        !document.documentElement.classList.contains('mobile-menu-open')&&
        (!document.fonts||document.fonts.check('italic 400 18px Lora'));
    }
    function playInk(from,to){
      const layer=document.createElement('div');layer.className='recommendations-ink';
      layer.setAttribute('aria-hidden','true');layer.inert=true;
      for(const property of ['fontFamily','fontSize','fontStyle','fontWeight','lineHeight','letterSpacing','fontFeatureSettings','fontVariationSettings','fontKerning','fontSynthesis'])layer.style[property]=to.style[property];
      root.querySelector('.recommendations-slides').append(layer);
      const current={layer,animations:[]};ink=current;
      const origin=layer.getBoundingClientRect(),fragment=document.createDocumentFragment(),jobs=[];
      const available=new Map();
      from.letters.forEach(letter=>{if(!available.has(letter.text))available.set(letter.text,[]);available.get(letter.text).push(letter);});
      const travel=parseFloat(to.style.fontSize)*6;
      to.letters.forEach((target,i)=>{
        const candidates=available.get(target.text)||[];let match=-1,best=travel*travel;
        candidates.forEach((letter,n)=>{const distance=(target.x-letter.x)**2+((target.y-letter.y)*1.3)**2;if(distance<best){best=distance;match=n;}});
        const source=match<0?null:candidates.splice(match,1)[0];
        jobs.push({source,target,seed:i+index*373+1});
      });
      for(const letters of available.values())letters.forEach((source,i)=>jobs.push({source,target:null,seed:i+source.x+source.y}));
      for(const job of jobs){
        const span=document.createElement('span');span.className='recommendations-ink-letter';span.textContent=(job.source||job.target).text;
        job.element=span;fragment.append(span);
      }
      layer.append(fragment);
      // Align the copied glyph baseline with the browser's actual text range.
      const probe=jobs[0]?.element;if(!probe){stopInk();return;}
      const range=document.createRange();range.selectNodeContents(probe);
      const textBox=range.getBoundingClientRect(),probeBox=probe.getBoundingClientRect();
      const insetX=textBox.left-probeBox.left,insetY=textBox.top-probeBox.top;
      root.classList.add('is-ink-changing');root.dataset.inkTransition='running';
      const pose=(x,y,angle=0,scale=1)=>`translate3d(${x}px,${y}px,0) rotate(${angle}deg) scale(${scale})`;
      for(const {source,target,seed,element} of jobs){
        const start=source||target,sway=(noise(seed)-.5)*24,lift=(noise(seed+11)-.5)*26,angle=(noise(seed+29)-.5)*16;
        element.style.left=(start.x-origin.left-insetX)+'px';element.style.top=(start.y-origin.top-insetY)+'px';
        let frames,timing;
        if(source&&target){
          const dx=target.x-source.x,dy=target.y-source.y;
          frames=[{opacity:1,transform:pose(0,0)},{offset:.38,opacity:.55,transform:pose(dx*.4+sway,dy*.4+lift,angle,.96)},{offset:.82,opacity:1,transform:pose(dx*.96,dy*.96,-angle*.08)},{opacity:1,transform:pose(dx,dy)}];
          timing={duration:850,delay:noise(seed+5)*130};
        }else if(source){
          frames=[{opacity:1,transform:pose(0,0)},{opacity:0,transform:pose(sway,lift-8,angle,.9)}];
          timing={duration:380,delay:noise(seed+5)*100};
        }else{
          frames=[{opacity:0,transform:pose(sway,lift+6,angle,.94)},{offset:.7,opacity:1,transform:pose(-sway*.08,-lift*.08,-angle*.1)},{opacity:1,transform:pose(0,0)}];
          timing={duration:650,delay:220+noise(seed+5)*130};
        }
        const movement=element.animate(frames,{duration:timing.duration*inkPace,delay:timing.delay*inkPace,easing:'cubic-bezier(.45,0,.25,1)',fill:'both'});
        movement.id='recommendation-ink-letter';current.animations.push(movement);
      }
      // Soften the temporary copies; the original quote stays sharp at rest.
      const softness=layer.animate([{filter:'blur(0px)'},{offset:.38,filter:'blur(.65px)'},{offset:.72,filter:'blur(.35px)'},{filter:'blur(0px)'}],{duration:1000*inkPace,easing:'ease-in-out',fill:'both'});
      softness.id='recommendation-ink-softness';current.animations.push(softness);
      // Isolated glyphs differ from a shaped text run (kerning and rasterization).
      // Hand back to that exact original while the last copies are still settling,
      // so removing the temporary layer never replaces visible glyphs in one frame.
      for(const [element,frames] of [[layer,[{opacity:1},{opacity:0}]],[slides[index].querySelector('blockquote'),[{opacity:0},{opacity:1}]]]){
        const settle=element.animate(frames,{duration:250,delay:1000,easing:'ease-in-out',fill:'both'});
        settle.id='recommendation-ink-settle';current.animations.push(settle);
      }
      const caption=slides[index].querySelector('figcaption').animate([{opacity:0},{opacity:1}],{duration:320*inkPace,delay:300*inkPace,easing:'ease-out',fill:'both'});
      caption.id='recommendation-ink-caption';
      current.animations.push(caption);
      // Cancellation is expected during rapid selection and lifecycle changes.
      Promise.allSettled(current.animations.map(item=>item.finished)).then(()=>{if(ink===current)stopInk();});
    }
    const pauseReason=()=>{
      if(!canAnimate)return 'unsupported';
      if(previewPaused)return 'preview';
      if(reduced.matches)return 'reduced-motion';
      if(document.hidden)return 'hidden';
      if(!visible)return 'offscreen';
      if(document.documentElement.classList.contains('mobile-menu-open'))return 'menu';
      if(focused)return 'keyboard-focus';
      if(gesture?.dragging)return 'swipe';
      return '';
    };
    const clearDeadline=()=>{clearTimeout(deadline);deadline=0;};
    function keepIndicatorVisible(){
      if(!dotStrip||dotStrip.scrollWidth<=dotStrip.clientWidth)return;
      const dot=dots[index],left=dot.offsetLeft,right=left+dot.offsetWidth;
      if(left<dotStrip.scrollLeft)dotStrip.scrollLeft=left;
      else if(right>dotStrip.scrollLeft+dotStrip.clientWidth)dotStrip.scrollLeft=right-dotStrip.clientWidth;
    }
    function select(next,announce=false){
      const previous=index,target=(next+slides.length)%slides.length;
      stopInk();
      const outgoing=target!==previous&&canPlayInk()?measureLetters(slides[previous]):null;
      clearDeadline();generation++;
      animation?.cancel();animation=null;
      index=target;
      slides.forEach((slide,i)=>{slide.classList.toggle('is-current',i===index);slide.inert=i!==index;slide.setAttribute('aria-hidden',String(i!==index));});
      dots.forEach((dot,i)=>{if(i===index)dot.setAttribute('aria-current','true');else dot.removeAttribute('aria-current');});
      root.dataset.activeSlide=String(index+1);
      keepIndicatorVisible();
      if(announce)status.textContent=`Recommendation ${index+1} of ${slides.length}`;
      if(outgoing)try{playInk(outgoing,measureLetters(slides[index]));}catch(_){stopInk();}
      if(canAnimate){
        try{
          // One native timeline paints the fill and owns the slide deadline.
          // Its flat rectangle is clipped by the track's rounded corners.
          animation=fills[index].animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration,easing:'linear',fill:'both'});
          animation.id='recommendation-progress';
          animation.pause();animation.currentTime=0;
          const ownGeneration=generation;
          animation.onfinish=()=>{if(ownGeneration===generation&&!pauseReason())select(index+1);};
        }catch(_){canAnimate=false;} // Manual navigation stays available.
      }
      schedule();
    }
    function schedule(){
      clearDeadline();
      const reason=pauseReason();
      root.dataset.autoplay=reason?'paused':'playing';
      root.dataset.autoplayReason=reason||'none';
      if(!animation)return;
      if(reason){animation.pause();return;}
      const elapsed=Number(animation.currentTime)||0;
      if(elapsed>=duration){select(index+1);return;}
      if(animation.playState!=='running')animation.play();
      // Recover a delayed finish event without updating DOM styles per frame.
      const ownGeneration=generation;
      deadline=setTimeout(()=>{
        deadline=0;
        if(ownGeneration!==generation)return;
        if(!pauseReason()&&(Number(animation.currentTime)||0)>=duration)select(index+1);
        else schedule();
      },duration-elapsed+80);
    }
    function updateVisibility(){
      const box=root.getBoundingClientRect();
      visible=box.width>0&&box.bottom>0&&box.top<innerHeight;
    }
    function syncVisibility(){
      if(visibilityFrame)return;
      visibilityFrame=requestAnimationFrame(()=>{
        visibilityFrame=0;
        const wasVisible=visible;updateVisibility();
        if(!visible)stopInk();
        if(visible!==wasVisible)schedule();
      });
    }
    function updateFocus(){
      focused=keyboardMode&&root.contains(document.activeElement);schedule();
    }
    function finishGesture(event,cancelled=false){
      if(!gesture)return;
      if(event.pointerId!==undefined&&event.pointerId!==gesture.id)return;
      const start=gesture;gesture=null;
      const point=event.changedTouches?.[0]||event;
      const dx=point.clientX-start.x,dy=point.clientY-start.y;
      if(!cancelled&&Math.abs(dx)>=40&&Math.abs(dx)>Math.abs(dy)*1.3)select(index+(dx<0?1:-1),true);
      else schedule();
    }
    root.classList.add('is-enhanced');controls.hidden=false;
    updateVisibility();select(0);root.dataset.recommendationsReady='true';
    dots.forEach((dot,i)=>dot.addEventListener('click',()=>select(i,true)));
    dotStrip?.addEventListener('transitionend',event=>{if(event.propertyName==='min-width')keepIndicatorVisible();});
    // Touch focus must not be confused with keyboard focus by Safari's heuristics.
    document.addEventListener('keydown',event=>{
      if(event.metaKey||event.ctrlKey||event.altKey)return;
      keyboardMode=true;updateFocus();
    },true);
    document.addEventListener('pointerdown',event=>{
      gesture=null;
      keyboardMode=false;
      updateFocus();
    },true);
    root.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();
      select(event.key==='Home'?0:event.key==='End'?slides.length-1:index+(event.key==='ArrowRight'?1:-1),true);
      if(event.target.classList.contains('recommendations-dot'))dots[index].focus();
    });
    root.addEventListener('focusin',updateFocus);
    root.addEventListener('focusout',()=>queueMicrotask(updateFocus));
    root.addEventListener('pointerdown',event=>{
      if(event.pointerType==='mouse'||!event.isPrimary||event.target.closest('button,a'))return;
      gesture={id:event.pointerId,x:event.clientX,y:event.clientY,dragging:false};
      // A resting finger or native vertical scroll does not pause the timer.
    },{passive:true});
    root.addEventListener('pointermove',event=>{
      if(!gesture||gesture.id!==event.pointerId||gesture.dragging)return;
      const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
      if(Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)*1.3){gesture.dragging=true;schedule();}
    },{passive:true});
    // Capture end/cancel events even when native scrolling retargets them.
    window.addEventListener('pointerup',event=>finishGesture(event),true);
    window.addEventListener('pointercancel',event=>finishGesture(event,true),true);
    window.addEventListener('lostpointercapture',event=>finishGesture(event,true),true);
    window.addEventListener('touchend',event=>finishGesture(event),{capture:true,passive:true});
    window.addEventListener('touchcancel',event=>finishGesture(event,true),{capture:true,passive:true});
    window.addEventListener('touchstart',event=>{if(event.touches.length>1){gesture=null;schedule();}},{capture:true,passive:true});
    if(typeof IntersectionObserver==='function')new IntersectionObserver(()=>{
      updateVisibility();if(!visible)stopInk();schedule();
    },{threshold:0}).observe(root);
    // First entry and Safari's changing browser chrome must not depend on a
    // second IntersectionObserver notification. Only scroll/resize schedules this.
    window.addEventListener('scroll',syncVisibility,{capture:true,passive:true});
    window.addEventListener('resize',()=>{stopInk();keepIndicatorVisible();syncVisibility();},{passive:true});
    window.visualViewport?.addEventListener('resize',syncVisibility,{passive:true});
    new MutationObserver(()=>{if(document.documentElement.classList.contains('mobile-menu-open'))stopInk();schedule();}).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
    document.addEventListener('visibilitychange',()=>{
      stopInk();gesture=null;updateVisibility();schedule();
    });
    window.addEventListener('pagehide',()=>{stopInk();visible=false;gesture=null;schedule();});
    window.addEventListener('pageshow',()=>{gesture=null;updateVisibility();schedule();});
    window.addEventListener('blur',()=>{gesture=null;schedule();});
    reduced.addEventListener('change',()=>{stopInk();schedule();});
    document.fonts?.addEventListener('loadingdone',stopInk);
  });
})();
