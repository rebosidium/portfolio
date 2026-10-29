(() => {
  'use strict';
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const warmQueue=[];let warming=0;
  function warm(task){
    warmQueue.push(task);
    const drain=()=>{while(warming<2&&warmQueue.length){warming++;Promise.resolve().then(warmQueue.shift()).catch(()=>{}).finally(()=>{warming--;drain();});}};
    drain();
  }
  function init(root){
    if(root.dataset.galleryReady)return;
    root.dataset.galleryReady='true';
    const slides=[...root.querySelectorAll('[data-gallery-slide]')],buttons=[...root.querySelectorAll('[data-gallery-select]')];
    const viewer=root.querySelector('[data-gallery-viewer]'),controls=root.querySelector('[data-gallery-controls]'),caption=root.querySelector('figcaption'),status=root.querySelector('[data-gallery-status]'),error=root.querySelector('[data-gallery-message]');
    let current=0,generation=0,animation;
    const pending=new WeakMap(),decoded=new WeakMap();
    const prepare=slide=>{
      if(pending.has(slide))return pending.get(slide);
      const job=Promise.all([...slide.querySelectorAll('img')].map(async img=>{
        img.loading='eager';
        if(img.dataset.src){img.sizes=img.dataset.sizes;img.srcset=img.dataset.srcset;img.src=img.dataset.src;delete img.dataset.src;}
        if(img.complete&&!img.naturalWidth){
          const src=img.src,srcset=img.srcset;
          img.removeAttribute('src');img.removeAttribute('srcset');
          await new Promise(resolve=>requestAnimationFrame(resolve));
          img.srcset=srcset;img.src=src;
        }
        if(!img.complete)await new Promise((resolve,reject)=>{
          const done=event=>{img.removeEventListener('load',done);img.removeEventListener('error',done);event.type==='load'?resolve():reject(Error('Image unavailable'));};
          img.addEventListener('load',done);img.addEventListener('error',done);
        });
        if(!img.naturalWidth)throw Error('Image unavailable');
        const source=img.currentSrc||img.src;
        if(decoded.get(img)!==source){if(img.decode)await img.decode();decoded.set(img,source);}
      })).finally(()=>pending.delete(slide));
      pending.set(slide,job);return job;
    };
    function scrollThumb(button){
      const left=button.offsetLeft,right=left+button.offsetWidth,visibleLeft=controls.scrollLeft,visibleRight=visibleLeft+controls.clientWidth;
      if(left<visibleLeft)controls.scrollTo({left:Math.max(0,left-4),behavior:reduce.matches?'auto':'smooth'});
      else if(right>visibleRight)controls.scrollTo({left:right-controls.clientWidth+4,behavior:reduce.matches?'auto':'smooth'});
    }
    async function select(index, interaction){
      index=(index+slides.length)%slides.length;
      if(index===current){
        generation++;animation?.cancel();
        slides.forEach((slide,i)=>{slide.hidden=i!==current;slide.style.zIndex='';});
        buttons.forEach(b=>delete b.dataset.galleryLoading);
        viewer.setAttribute('aria-busy','false');error.hidden=true;return;
      }
      const token=++generation,next=slides[index],button=buttons[index],previous=current;
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
        if(interaction?.trusted)root.dispatchEvent(new CustomEvent('portfolio:gallery-change',{bubbles:true,detail:{
          gallery:root.dataset.galleryName,slide_index:index+1,previous_slide_index:previous+1,
          slide_count:slides.length,input_method:interaction.input,control:interaction.control
        }}));
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
      button.addEventListener('click',event=>select(index,{trusted:event.isTrusted,input:event.detail===0?'keyboard':event.pointerType||'mouse',control:'thumbnail'}));
      button.addEventListener('keydown',event=>{
        let next;
        if(event.key==='ArrowRight')next=(index+1)%buttons.length;
        else if(event.key==='ArrowLeft')next=(index-1+buttons.length)%buttons.length;
        else if(event.key==='Home')next=0;
        else if(event.key==='End')next=buttons.length-1;
        else return;
        event.preventDefault();buttons[next].focus({preventScroll:true});select(next,{trusted:event.isTrusted,input:'keyboard',control:'keyboard'});
      });
    });
    root.dataset.galleryIndex='0';
    root.querySelectorAll('[data-gallery-select] img').forEach(img=>{img.loading='eager';});
    let remaining=slides.length,failed=false;
    slides.forEach(slide=>warm(async()=>{
      try{await prepare(slide);}catch{failed=true;}
      finally{if(--remaining===0)root.dataset.galleryPreloaded=failed?'partial':'true';}
    }));
  }
  document.querySelectorAll('[data-case-gallery]').forEach(init);
})();
