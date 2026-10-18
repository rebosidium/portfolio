(() => {
  'use strict';
  document.querySelectorAll('[data-recommendations]').forEach(root=>{
    if(root.dataset.recommendationsReady)return;
    const slides=[...root.querySelectorAll('.recommendations-slide')];
    const dots=[...root.querySelectorAll('.recommendations-dot')];
    const controls=root.querySelector('.recommendations-controls');
    const play=root.querySelector('.recommendations-play');
    const status=root.querySelector('.recommendations-status');
    if(slides.length<2||dots.length!==slides.length)return;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const duration=Math.max(4000,Number(root.dataset.duration)||12000);
    let index=0,elapsed=0,last=0,frame=0,visible=false,hovered=false,focused=false,gesture=null;
    let paused=reduced.matches||root.closest('.ds-preview')?.dataset.state==='reduced-motion'||root.closest('.ds-preview')?.dataset.state==='paused';
    const blocked=()=>paused||!visible||document.hidden||hovered||focused||gesture||document.documentElement.classList.contains('mobile-menu-open');
    const paint=()=>root.style.setProperty('--recommendation-progress',String(elapsed/duration));
    function select(next,announce=false){
      index=(next+slides.length)%slides.length;elapsed=0;last=0;paint();
      slides.forEach((slide,i)=>{slide.classList.toggle('is-current',i===index);slide.inert=i!==index;slide.setAttribute('aria-hidden',String(i!==index));});
      dots.forEach((dot,i)=>{if(i===index)dot.setAttribute('aria-current','true');else dot.removeAttribute('aria-current');});
      root.dataset.activeSlide=String(index+1);
      if(announce)status.textContent=`Recommendation ${index+1} of ${slides.length}`;
      schedule();
    }
    function tick(now){
      frame=0;if(blocked()){last=0;return;}
      if(last)elapsed+=now-last;
      last=now;
      if(elapsed>=duration)select(index+1);
      else paint();
      schedule();
    }
    function schedule(){
      if(blocked()){if(frame)cancelAnimationFrame(frame);frame=0;last=0;}
      else if(!frame)frame=requestAnimationFrame(tick);
      root.dataset.autoplay=blocked()?'paused':'playing';
    }
    function setPaused(value){
      paused=value;play.textContent=paused?'Play':'Pause';
      play.setAttribute('aria-label',paused?'Start automatic recommendations':'Pause automatic recommendations');schedule();
    }
    root.classList.add('is-enhanced');controls.hidden=false;
    select(0);setPaused(paused);root.dataset.recommendationsReady='true';
    dots.forEach((dot,i)=>dot.addEventListener('click',()=>select(i,true)));
    play.addEventListener('click',()=>setPaused(!paused));
    root.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();
      select(event.key==='Home'?0:event.key==='End'?slides.length-1:index+(event.key==='ArrowRight'?1:-1),true);
      if(event.target.classList.contains('recommendations-dot'))dots[index].focus();
    });
    root.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){hovered=true;schedule();}});
    root.addEventListener('pointerleave',()=>{hovered=false;schedule();});
    const keyboardFocused=()=>root.contains(document.activeElement)&&document.activeElement.matches(':focus-visible');
    root.addEventListener('focusin',()=>{focused=keyboardFocused();schedule();});
    root.addEventListener('focusout',()=>{queueMicrotask(()=>{focused=keyboardFocused();schedule();});});
    root.addEventListener('pointerdown',event=>{
      if(event.pointerType==='mouse'||!event.isPrimary||event.target.closest('button,a'))return;
      gesture={id:event.pointerId,x:event.clientX,y:event.clientY};schedule();
    },{passive:true});
    root.addEventListener('pointerup',event=>{
      if(!gesture||gesture.id!==event.pointerId)return;
      const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;gesture=null;
      if(Math.abs(dx)>=40&&Math.abs(dx)>Math.abs(dy)*1.3)select(index+(dx<0?1:-1),true);
      schedule();
    },{passive:true});
    root.addEventListener('pointercancel',()=>{gesture=null;schedule();},{passive:true});
    // Leaving the section must release a touch that finishes outside it.
    window.addEventListener('pointerup',()=>{if(gesture){gesture=null;schedule();}},{passive:true});
    if(typeof IntersectionObserver==='function')new IntersectionObserver(entries=>{
      visible=entries[0].isIntersecting;schedule();
    },{threshold:0}).observe(root);
    else {visible=true;schedule();}
    new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
    document.addEventListener('visibilitychange',schedule);
    window.addEventListener('pagehide',()=>{visible=false;schedule();});
    window.addEventListener('pageshow',()=>{const box=root.getBoundingClientRect();visible=box.bottom>0&&box.top<innerHeight;schedule();});
    reduced.addEventListener('change',()=>setPaused(reduced.matches));
  });
})();
