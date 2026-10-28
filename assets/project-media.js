(() => {
  'use strict';
  const pending = new WeakMap();
  function prepare(image) {
    // Once this scene is requested, prepare every repeated element before reveal.
    if (image.closest('[data-photo-mosaic]')) image.loading='eager';
    const loaded = new Promise((resolve,reject) => {
      const clear = () => {image.removeEventListener('load',onLoad);image.removeEventListener('error',onError);};
      const onLoad = () => {clear();resolve();};
      const onError = () => {clear();reject(new Error('Work preview unavailable'));};
      image.addEventListener('load',onLoad);image.addEventListener('error',onError);
      if (image.dataset.srcset) image.srcset = image.dataset.srcset;
      if (image.dataset.src) image.src = image.dataset.src;
      if (image.complete && image.naturalWidth > 0) onLoad();
      else if (image.complete && (image.currentSrc || image.getAttribute('src'))) onError();
    });
    // Decode after load: WebKit can reject an early decode of a lazy image.
    return loaded.then(() => image.decode?.().catch(failure => {if (!image.naturalWidth) throw failure;}));
  }
  function load(artwork) {
    if (pending.has(artwork)) return pending.get(artwork);
    const period=artwork.querySelector('.home-about-photo-page');
    if(period&&!artwork.hasAttribute('data-photo-pool-ready')){
      for(const row of [0,1])for(const col of [-1,0,1]){
        if(!row&&!col)continue;
        const copy=period.cloneNode(true);
        copy.setAttribute('data-photo-repeat','');copy.setAttribute('aria-hidden','true');
        if(row)copy.setAttribute('data-photo-row-repeat','');
        copy.style.translate=`${col*100}% ${row*100}%`;
        copy.querySelectorAll('img').forEach(image=>{image.alt='';});
        period.parentElement.append(copy);
      }
      artwork.setAttribute('data-photo-pool-ready','');
    }
    const images = [...artwork.querySelectorAll('.work-image')];
    const error = artwork.querySelector('.work-image-error');
    if (!images.length) return Promise.resolve();
    artwork.dataset.imageState = 'loading';
    const ready = Promise.allSettled(images.map(prepare)).then(results => {
      const successful=results.filter(result=>result.status==='fulfilled').length;
      if (!successful) {
        artwork.dataset.imageState='failed';artwork.classList.add('image-failed');
        if (error) error.hidden=false;
        throw Error('Work preview unavailable');
      }
      results.forEach((result,index)=>{if(result.status==='rejected')images[index].closest('[data-mosaic-photo]')?.setAttribute('hidden','');});
      artwork.dataset.imageState='ready';artwork.classList.remove('image-failed');
      if (error) error.hidden=true;
    });
    pending.set(artwork,ready);return ready;
  }
  window.PortfolioProjectMedia = {load};
  // Pause photo transforms outside the visible scene, hidden tab and open menu.
  document.querySelectorAll('[data-photo-mosaic]').forEach(artwork=>{
    const scene=artwork.closest('.home-about-screen[data-scroll-entry="flow"]');
    const flowScene=scene&&document.querySelector('.footer') ? scene : null;
    let visible=false,sceneVisible=false,visibleTop=0;
    const sync=()=>{
      // Safari can still paint passed photos through its translucent toolbar.
      // Keep only this flow gallery moving until its section leaves or is covered.
      const passed=sceneVisible&&artwork.getBoundingClientRect().bottom<=visibleTop;
      artwork.dataset.photosVisible=String((visible||passed)&&!document.hidden);
    };
    if (window.IntersectionObserver) {
      const observer=new IntersectionObserver(entries=>{
        for(const entry of entries){
          visibleTop=entry.rootBounds?.top||0;
          if(entry.target===artwork)visible=entry.isIntersecting;
          else sceneVisible=entry.isIntersecting;
        }
        sync();
      });
      observer.observe(artwork);
      if(flowScene)observer.observe(flowScene);
    } else {visible=true;sync();}
    document.addEventListener('visibilitychange',sync);
  });
  // HOME chooses request timing itself; reading pages own only their cards.
  document.querySelectorAll('.article-work .work-artwork,[data-project-media-auto] .work-artwork').forEach(artwork => {
    if(artwork.closest('.reading-about-teaser')&&window.IntersectionObserver){
      const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();load(artwork).catch(()=>{});}},{rootMargin:'600px'});observer.observe(artwork);
    }else load(artwork).catch(() => {});
  });
})();
