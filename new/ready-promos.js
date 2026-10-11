// Each desktop state owns its fixed background, decoded illustration and glass.
// During rotation only compositing opacity and the original text leaves change.
window.createReadyPromos = async ({promo,content,variants,index,decodeImage,activate}) => {
  const preparedAt = performance.now();
  const images = await Promise.all(variants.map(async variant => {
    const image = new Image(58,58);
    image.className = 'promo-illustration';image.alt = '';
    image.decoding = 'async';image.fetchPriority = 'low';image.src = variant.image;
    if (!await Promise.race([decodeImage(image),new Promise(resolve=>setTimeout(()=>resolve(false),5000))])) throw new Error('Promo image unavailable: '+variant.id);
    return image;
  }));
  if (promo.hidden || window.mobileLayout.matches) return null;
  const originalContent = content;
  const originalGlass = content.querySelector('lg-button');
  if (!originalGlass) return null;
  const slides = variants.map((variant,n) => {
    const panel = document.createElement('div');
    panel.className = 'ready-promo';panel.dataset.variant = variant.id;
    panel.style.backgroundColor = variant.color;
    let inner;
    if(n===index) inner = originalContent;
    else {
      inner = document.createElement('div');inner.className = 'promo-content';
      const text = document.createElement('p');text.className = 'promo-text';text.textContent = variant.text;
      const glass = document.createElement('lg-button');glass.className = 'promo-glass';
      for(const name of ['radius','refraction','chroma','specular','bezel'])glass.setAttribute(name,originalGlass.getAttribute(name));
      glass.setAttribute('href','mailto:rebosidium@gmail.com?subject='+encodeURIComponent(variant.subject));
      glass.textContent = variant.cta;inner.append(images[n],text,glass);
    }
    inner.style.gap = variant.gap+'px';panel.append(inner);promo.append(panel);
    const glass = inner.querySelector('lg-button');
    glass.style.removeProperty('--promo-glass-backdrop');
    glass.button.classList.add('promo-action');glass.surface.setDelta = () => {};
    const image = inner.querySelector('.promo-illustration'),text = inner.querySelector('.promo-text'),label = glass.querySelector('.lg-button__label');
    const action=glass.button,material=[glass.surface.layer,glass.surface.shadow];
    const style=getComputedStyle(action);
    return {panel,content:inner,image,text,glass,action,label,leaves:[image,text,label],material,borderColor:style.borderColor,backgroundColor:style.backgroundColor};
  });
  promo.classList.add('ready-promos');
  let active = index,timeline = null;
  const starts = [];
  const show = n => {
    active = n;
    slides.forEach((slide,i) => {
      // Positive opacity keeps the two prepared states eligible for painting.
      // They remain inert and behind the fully opaque active state.
      slide.panel.style.opacity = i===n?'1':'0.001';
      slide.panel.style.zIndex = i===n?'1':'0';
      slide.panel.inert = i!==n;slide.panel.setAttribute('aria-hidden',String(i!==n));
      gsap.set(slide.leaves,{clearProps:'transform,opacity'});
      gsap.set(slide.material,{clearProps:'opacity'});
      gsap.set(slide.action,{clearProps:'borderColor,backgroundColor'});
    });
    promo.dataset.variant = variants[n].id;
    activate(slides[n],n);
  };
  show(index);
  // Give mounted surfaces their layout and two paint opportunities in advance.
  await new Promise(resolve => requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const api = {
    slides,starts,preparedAt,readyAt:performance.now(),ready:true,
    get active(){return active},get timeline(){return timeline},show,
    rotate(n,onComplete){
      const outgoing = slides[active],incoming = slides[n];
      incoming.panel.style.zIndex = '2';
      gsap.set(incoming.panel,{opacity:.001});gsap.set(incoming.leaves,{y:8,opacity:0});
      gsap.set(incoming.material,{opacity:0});
      gsap.set(incoming.action,{borderColor:'#ffffff00',backgroundColor:'#ffffff00'});
      starts.push({time:performance.now(),from:variants[active].id,to:variants[n].id});
      timeline = gsap.timeline({onComplete:()=>{timeline=null;show(n);onComplete();}});
      timeline.to(incoming.panel,{opacity:1,duration:.58,ease:'power2.inOut'},0)
        .to(outgoing.leaves,{y:-8,opacity:0,duration:.22,ease:'power2.in'},0)
        .to(outgoing.material,{opacity:0,duration:.22,ease:'power2.in'},0)
        .to(outgoing.action,{borderColor:'#ffffff00',backgroundColor:'#ffffff00',duration:.22,ease:'power2.in'},0)
        .call(()=>{
          const focused = outgoing.panel.contains(document.activeElement);
          outgoing.panel.inert = true;outgoing.panel.setAttribute('aria-hidden','true');
          incoming.panel.inert = false;incoming.panel.setAttribute('aria-hidden','false');
          active = n;promo.dataset.variant = variants[n].id;activate(incoming,n);
          if(focused)incoming.action.focus({preventScroll:true});
        },null,.22)
        .fromTo(incoming.leaves,{y:8,opacity:0},{y:0,opacity:1,duration:.36,ease:'power3.out',immediateRender:false,clearProps:'transform,opacity'},.22)
        .fromTo(incoming.material,{opacity:0},{opacity:1,duration:.36,ease:'power3.out',immediateRender:false,clearProps:'opacity'},.22)
        .fromTo(incoming.action,{borderColor:'#ffffff00',backgroundColor:'#ffffff00'},{borderColor:incoming.borderColor,backgroundColor:incoming.backgroundColor,duration:.36,ease:'power3.out',immediateRender:false,clearProps:'borderColor,backgroundColor'},.22);
      return timeline;
    },
    destroy(){
      timeline?.kill();timeline=null;
      promo.insertBefore(originalContent,promo.firstChild);
      slides.forEach(slide=>slide.panel.remove());
      promo.classList.remove('ready-promos');
      delete window.readyPromos;
      return {content:originalContent,image:originalContent.querySelector('.promo-illustration'),text:originalContent.querySelector('.promo-text'),action:originalGlass.button,label:originalGlass.querySelector('.lg-button__label')};
    }
  };
  window.readyPromos = api;
  return api;
};
