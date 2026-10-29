(() => {
  'use strict';
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  function init(root){
    if(root.dataset.galleryReady)return;
    root.dataset.galleryReady='true';
    const slides=[...root.querySelectorAll('[data-gallery-slide]')],buttons=[...root.querySelectorAll('[data-gallery-select]')];
    const viewer=root.querySelector('[data-gallery-viewer]'),controls=root.querySelector('[data-gallery-controls]'),caption=root.querySelector('figcaption'),status=root.querySelector('[data-gallery-status]'),error=root.querySelector('[data-gallery-message]');
    let current=0,generation=0,animation;
    const prepare=async slide=>{
      await Promise.all([...slide.querySelectorAll('img')].map(async img=>{
        if(img.dataset.src){img.sizes=img.dataset.sizes;img.srcset=img.dataset.srcset;img.src=img.dataset.src;delete img.dataset.src;img.loading='eager';}
        if(img.complete&&!img.naturalWidth)img.src=img.currentSrc||img.src;
        if(!img.complete)await new Promise((resolve,reject)=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',reject,{once:true});});
        if(!img.naturalWidth)throw Error('Image unavailable');
        if(img.decode)await img.decode();
      }));
    };
    function scrollThumb(button){
      const left=button.offsetLeft,right=left+button.offsetWidth,visibleLeft=controls.scrollLeft,visibleRight=visibleLeft+controls.clientWidth;
      if(left<visibleLeft)controls.scrollTo({left:Math.max(0,left-4),behavior:reduce.matches?'auto':'smooth'});
      else if(right>visibleRight)controls.scrollTo({left:right-controls.clientWidth+4,behavior:reduce.matches?'auto':'smooth'});
    }
    async function select(index){
      index=(index+slides.length)%slides.length;
      if(index===current){
        generation++;animation?.cancel();
        slides.forEach((slide,i)=>{slide.hidden=i!==current;slide.style.zIndex='';});
        buttons.forEach(b=>delete b.dataset.galleryLoading);
        viewer.setAttribute('aria-busy','false');error.hidden=true;return;
      }
      const token=++generation,next=slides[index],button=buttons[index];
      viewer.setAttribute('aria-busy','true');error.hidden=true;button.dataset.galleryLoading='';
      try{
        await prepare(next);
        if(token!==generation)return;
        animation?.cancel();
        slides.forEach((slide,i)=>{slide.hidden=i!==index;slide.style.zIndex='';});
        current=index;root.dataset.galleryIndex=String(index);
        buttons.forEach((b,i)=>{b.setAttribute('aria-pressed',String(i===index));b.tabIndex=i===index?0:-1;});
        caption.textContent=next.dataset.galleryCaption;status.textContent=(index+1)+' / '+slides.length+': '+next.dataset.galleryCaption;
        scrollThumb(button);
        const settle=()=>{if(token===generation)slides.forEach((slide,i)=>{slide.hidden=i!==current;slide.style.zIndex='';});};
        if(!reduce.matches&&next.animate){animation=next.animate([{opacity:0},{opacity:1}],{duration:150,easing:'ease-out'});animation.finished.then(settle,settle);}else settle();
      }catch{
        if(token===generation){error.textContent=root.dataset.galleryError;error.hidden=false;}
      }finally{
        delete button.dataset.galleryLoading;
        if(token===generation)viewer.setAttribute('aria-busy','false');
      }
    }
    buttons.forEach((button,index)=>{
      button.disabled=false;
      button.addEventListener('click',()=>select(index));
      button.addEventListener('keydown',event=>{
        let next;
        if(event.key==='ArrowRight')next=(index+1)%buttons.length;
        else if(event.key==='ArrowLeft')next=(index-1+buttons.length)%buttons.length;
        else if(event.key==='Home')next=0;
        else if(event.key==='End')next=buttons.length-1;
        else return;
        event.preventDefault();buttons[next].focus({preventScroll:true});select(next);
      });
    });
    root.dataset.galleryIndex='0';
  }
  document.querySelectorAll('[data-case-gallery]').forEach(init);
})();
