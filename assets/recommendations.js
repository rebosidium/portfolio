(() => {
  'use strict';
  document.querySelectorAll('[data-recommendations]').forEach(root=>{
    if(root.dataset.recommendationsReady)return;
    const slides=[...root.querySelectorAll('.recommendations-slide')];
    const dots=[...root.querySelectorAll('.recommendations-dot')];
    const fills=dots.map(dot=>dot.querySelector('.recommendations-dot-fill'));
    const controls=root.querySelector('.recommendations-controls');
    const status=root.querySelector('.recommendations-status');
    if(slides.length<2||dots.length!==slides.length||fills.some(fill=>!fill))return;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const hoverPointer=matchMedia('(hover: hover) and (pointer: fine)');
    const previewPaused=['paused','reduced-motion'].includes(root.closest('.ds-preview')?.dataset.state);
    const duration=Math.max(4000,Number(root.dataset.duration)||12000);
    let index=0,visible=false,hovered=false,focused=false,keyboardMode=false,gesture=null;
    let animation=null,generation=0,deadline=0,visibilityFrame=0,canAnimate=typeof fills[0].animate==='function';
    const pauseReason=()=>{
      if(!canAnimate)return 'unsupported';
      if(previewPaused)return 'preview';
      if(reduced.matches)return 'reduced-motion';
      if(document.hidden)return 'hidden';
      if(!visible)return 'offscreen';
      if(document.documentElement.classList.contains('mobile-menu-open'))return 'menu';
      if(hovered&&hoverPointer.matches)return 'hover';
      if(focused)return 'keyboard-focus';
      if(gesture?.dragging)return 'swipe';
      return '';
    };
    const clearDeadline=()=>{clearTimeout(deadline);deadline=0;};
    function select(next,announce=false){
      clearDeadline();generation++;
      animation?.cancel();animation=null;
      index=(next+slides.length)%slides.length;
      slides.forEach((slide,i)=>{slide.classList.toggle('is-current',i===index);slide.inert=i!==index;slide.setAttribute('aria-hidden',String(i!==index));});
      dots.forEach((dot,i)=>{if(i===index)dot.setAttribute('aria-current','true');else dot.removeAttribute('aria-current');});
      root.dataset.activeSlide=String(index+1);
      if(announce)status.textContent=`Recommendation ${index+1} of ${slides.length}`;
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
    // Touch focus must not be confused with keyboard focus by Safari's heuristics.
    document.addEventListener('keydown',event=>{
      if(event.metaKey||event.ctrlKey||event.altKey)return;
      keyboardMode=true;updateFocus();
    },true);
    document.addEventListener('pointerdown',event=>{
      gesture=null;
      keyboardMode=false;hovered=event.pointerType==='mouse'&&hoverPointer.matches&&root.contains(event.target);
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
    root.addEventListener('pointerenter',event=>{
      if(event.pointerType==='mouse'&&hoverPointer.matches){hovered=true;schedule();}
    });
    root.addEventListener('pointerleave',()=>{hovered=false;schedule();});
    root.addEventListener('pointerdown',event=>{
      if(event.pointerType==='mouse'||!event.isPrimary||event.target.closest('button,a'))return;
      gesture={id:event.pointerId,x:event.clientX,y:event.clientY,dragging:false};
      // A resting finger or native vertical scroll does not pause the timer.
    },{passive:true});
    root.addEventListener('pointermove',event=>{
      if(event.pointerType==='mouse'&&hoverPointer.matches&&!hovered){hovered=true;schedule();}
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
      updateVisibility();schedule();
    },{threshold:0}).observe(root);
    // First entry and Safari's changing browser chrome must not depend on a
    // second IntersectionObserver notification. Only scroll/resize schedules this.
    window.addEventListener('scroll',syncVisibility,{capture:true,passive:true});
    window.addEventListener('resize',syncVisibility,{passive:true});
    window.visualViewport?.addEventListener('resize',syncVisibility,{passive:true});
    new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
    document.addEventListener('visibilitychange',()=>{
      gesture=null;hovered=false;updateVisibility();schedule();
    });
    window.addEventListener('pagehide',()=>{visible=false;gesture=null;hovered=false;schedule();});
    window.addEventListener('pageshow',()=>{gesture=null;hovered=false;updateVisibility();schedule();});
    window.addEventListener('blur',()=>{gesture=null;hovered=false;schedule();});
    hoverPointer.addEventListener('change',()=>{if(!hoverPointer.matches)hovered=false;schedule();});
    reduced.addEventListener('change',schedule);
  });
})();
