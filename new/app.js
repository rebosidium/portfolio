(() => {
  const promo = document.querySelector('.promo');
  const content = document.querySelector('.promo-content');
  const illustration = document.querySelector('.promo-illustration');
  const text = document.querySelector('.promo-text');
  let action = document.querySelector('.promo-action');
  let button = document.querySelector('.promo-button');
  const close = document.querySelector('.promo-close');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const decodeImage = image => {
    if (image.decode) return image.decode().then(() => true,() => false);
    if (image.complete) return Promise.resolve(image.naturalWidth > 0);
    return new Promise(resolve => {
      image.addEventListener('load',() => resolve(true),{once:true});
      image.addEventListener('error',() => resolve(false),{once:true});
    });
  };
  const finishBoot = () => {
    clearTimeout(window.pageRevealFallback);
    root.classList.remove('motion-pending');
  };
  const variants = [
    {id:'audit',color:'#8e6dd0',image:'assets/audit.png?v=20261009-assets1',text:'Find opportunities to improve your product with a design audit',cta:'Book an audit',subject:'Design audit',gap:15},
    {id:'work',color:'#0b9bf7',image:'assets/open-to-work.png?v=20261009-assets1',text:'Open to new design roles and exciting projects',cta:'Let’s talk',subject:'Design role or project',gap:15},
    {id:'consulting',color:'#59bf61',image:'assets/consulting.png?v=20261009-assets1',text:'Design consulting & mentoring for individuals and teams',cta:'Book Consulting',subject:'Design consulting',gap:23}
  ];
  const variantAssets = new Map();
  const cacheVariant = (variant,image) => {
    const pending = Promise.race([decodeImage(image),new Promise(resolve => setTimeout(() => resolve(false),5000))]).then(ready => {
      if (!ready && variantAssets.get(variant.id) === pending) variantAssets.delete(variant.id);
      return ready;
    });
    variantAssets.set(variant.id,pending);
    return pending;
  };
  const preloadVariant = variant => {
    if (!variantAssets.has(variant.id)) {
      const image = new Image();
      image.decoding = 'async'; image.fetchPriority = 'low'; image.src = variant.image;
      cacheVariant(variant,image);
    }
    return variantAssets.get(variant.id);
  };
  let index = Math.max(0, variants.findIndex(v => v.id === new URLSearchParams(location.search).get('banner')));
  let timer, transition, layoutTransition, rotationGeneration = 0, dismissed = false, hovered = false, initialReady = false;
  const enhanceGlassButton = async () => {
    if (dismissed) return;
    try {
      await import('./vendor/components.js');
      if (dismissed) return;
      const glass = document.createElement('lg-button');
      glass.className = 'promo-glass';
      for (const [name,value] of Object.entries({href:action.href,radius:'capsule',refraction:'6',chroma:'0',specular:'.25',bezel:'.6'})) glass.setAttribute(name,value);
      glass.textContent = button.textContent;
      const focused = document.activeElement === action;
      action.replaceWith(glass);
      action = glass.button;
      button = glass.querySelector('.lg-button__label');
      action.classList.add('promo-action');
      // Keep this pinned component's glass fixed instead of using its default press squish.
      glass.surface.setDelta = () => {};
      if (focused) action.focus({preventScroll:true});
    } catch {
      // The original mail link and CSS glass remain usable if the optional module fails.
    }
  };
  const settleDismissal = () => {
    document.documentElement.style.setProperty('--promo-space','0px');
    promo.hidden = true;
    document.body.classList.remove('layout-changing');
  };
  const apply = (updateColor = true) => {
    const v = variants[index];
    if (updateColor) promo.style.backgroundColor = v.color;
    content.style.gap = `${v.gap}px`;
    illustration.src = v.image;
    text.textContent = v.text;
    button.textContent = v.cta;
    action.href = `mailto:rebosidium@gmail.com?subject=${encodeURIComponent(v.subject)}`;
    promo.dataset.variant = v.id;
  };
  apply();
  const visibleReady = Promise.all([...document.querySelectorAll('img[data-reveal]')].map(async image => {
    const ready = await decodeImage(image);
    image.classList.add('image-ready');
    return ready;
  }));
  const imageDeadline = new Promise(resolve => setTimeout(() => {
    root.classList.remove('image-fades');
    resolve();
  },4000));
  cacheVariant(variants[index],illustration);
  const pause = () => {clearTimeout(timer); rotationGeneration++;};
  const schedule = () => {
    pause();
    if (!initialReady || dismissed || reduced.matches || document.hidden || hovered || promo.contains(document.activeElement)) return;
    const generation = rotationGeneration;
    timer = setTimeout(async () => {
      const next = (index + 1) % variants.length;
      const ready = await preloadVariant(variants[next]);
      if (generation !== rotationGeneration) return;
      if (!ready) {schedule(); return;}
      if (dismissed || reduced.matches || document.hidden || hovered || promo.contains(document.activeElement)) {schedule(); return;}
      if (window.gsap) {
        transition = gsap.timeline({onComplete:schedule});
        transition.to(promo,{backgroundColor:variants[next].color,duration:.58,ease:'power2.inOut'},0)
          .to(content,{y:-8,opacity:0,duration:.22,ease:'power2.in'},0).call(() => {
            index = next;
            apply(false);
          },null,.22).fromTo(content,{y:8,opacity:0},{y:0,opacity:1,duration:.36,ease:'power3.out'},.22);
      } else {index = next; apply(); schedule();}
    }, 10000);
  };
  promo.addEventListener('pointerenter',() => {hovered = true; pause();});
  promo.addEventListener('pointerleave',() => {hovered = false; schedule();});
  promo.addEventListener('focusin',pause);
  promo.addEventListener('focusout',() => setTimeout(schedule,0));
  document.addEventListener('visibilitychange',() => document.hidden ? pause() : schedule());
  close.addEventListener('click',event => {
    if (dismissed) return;
    dismissed = true; pause(); transition?.kill();
    if (event.detail === 0) document.querySelector('.identity').focus({preventScroll:true});
    else close.blur();
    if (window.gsap && !reduced.matches) {
      document.body.classList.add('layout-changing');
      layoutTransition = gsap.timeline({onComplete:settleDismissal});
      layoutTransition.to(promo,{height:0,opacity:0,duration:.6,ease:'power3.inOut',autoRound:false},0)
        .to(document.documentElement,{'--promo-space':'0px',duration:.6,ease:'power3.inOut'},0);
    } else settleDismissal();
  });
  Promise.race([visibleReady,imageDeadline]).then(() => {
    initialReady = true; schedule();
    const warmRemaining = async () => {
      await enhanceGlassButton();
      for (const offset of [1,2]) {
        if (dismissed || reduced.matches) return;
        await preloadVariant(variants[(index + offset) % variants.length]);
      }
    };
    if (window.requestIdleCallback) requestIdleCallback(warmRemaining,{timeout:1500});
    else setTimeout(warmRemaining,200);
  });
  if (!window.gsap) {finishBoot(); return;}
  if (window.SplitText) gsap.registerPlugin(SplitText);
  const mm = gsap.matchMedia();
  const fontsReady = document.fonts
    ? Promise.allSettled([document.fonts.load('500 48px Lora'),document.fonts.load('600 20px Manrope')])
    : Promise.resolve();
  Promise.race([fontsReady,new Promise(resolve => setTimeout(resolve,800))]).then(() => {
    let playIntro = root.classList.contains('motion-pending');
    finishBoot();
    mm.add('(prefers-reduced-motion: no-preference)',() => {
      let split;
      if (playIntro) {
        playIntro = false;
        const intro = gsap.timeline({defaults:{ease:'power3.out'}});
        intro.from('.header > a, .header nav a',{y:8,opacity:0,duration:.5,stagger:.05},0)
          .from('.portrait',{y:18,opacity:0,scale:.97,duration:.85},.1)
          .from('.feature',{y:18,opacity:0,duration:.7,stagger:.11},.6);
        if (window.SplitText) {
          split = SplitText.create('.title-line > span',{
            type:'words',wordsClass:'title-word',aria:'none',autoSplit:true,
            onSplit(self) {
              return gsap.from(self.words,{yPercent:90,opacity:0,duration:.6,stagger:.045,delay:.3,ease:'power3.out',clearProps:'transform,opacity'});
            }
          });
        } else intro.from('.title-line > span',{yPercent:110,duration:.85,stagger:.1},.3);
      }
      const cleanups = [];
      document.querySelectorAll('.feature').forEach(feature => {
        const art = feature.querySelector('.feature-art');
        const enter = () => gsap.to(art,{y:-6,rotation:-4,scale:1.045,duration:.4,ease:'power3.out',overwrite:true});
        const leave = () => gsap.to(art,{y:0,rotation:0,scale:1,duration:.55,ease:'elastic.out(1,.5)',overwrite:true});
        feature.addEventListener('pointerenter',enter); feature.addEventListener('pointerleave',leave);
        cleanups.push(() => {feature.removeEventListener('pointerenter',enter); feature.removeEventListener('pointerleave',leave);});
      });
      return () => {cleanups.forEach(fn => fn());split?.revert();};
    });
  });
  reduced.addEventListener('change',() => {
    transition?.kill();apply();gsap.set(content,{clearProps:'transform,opacity'});
    if (dismissed && reduced.matches) {layoutTransition?.kill();settleDismissal();}
    schedule();
  });
})();
