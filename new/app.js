(() => {
  const promo = document.querySelector('.promo');
  const content = document.querySelector('.promo-content');
  const illustration = document.querySelector('.promo-illustration');
  const text = document.querySelector('.promo-text');
  const action = document.querySelector('.promo-action');
  const button = document.querySelector('.promo-button');
  const close = document.querySelector('.promo-close');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const variants = [
    {id:'audit',color:'#8e6dd0',image:'assets/audit.png',text:'Find opportunities to improve your product with a design audit',cta:'Book an audit',subject:'Design audit',gap:15},
    {id:'work',color:'#0b9bf7',image:'assets/open-to-work.png',text:'Open to new design roles and exciting projects',cta:'Let’s talk',subject:'Design role or project',gap:15},
    {id:'consulting',color:'#59bf61',image:'assets/consulting.png',text:'Design consulting & mentoring for individuals and teams',cta:'Book Consulting',subject:'Design consulting',gap:23}
  ];
  variants.forEach(v => {const img = new Image(); img.src = v.image;});
  let index = Math.max(0, variants.findIndex(v => v.id === new URLSearchParams(location.search).get('banner')));
  let timer, transition, layoutTransition, dismissed = false, hovered = false;
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
  const pause = () => clearTimeout(timer);
  const schedule = () => {
    pause();
    if (dismissed || reduced.matches || document.hidden || hovered || promo.contains(document.activeElement)) return;
    timer = setTimeout(() => {
      if (window.gsap) {
        const next = (index + 1) % variants.length;
        transition = gsap.timeline({onComplete:schedule});
        transition.to(promo,{backgroundColor:variants[next].color,duration:.58,ease:'power2.inOut'},0)
          .to(content,{y:-8,opacity:0,duration:.22,ease:'power2.in'},0).call(() => {
            index = next;
            apply(false);
          },null,.22).fromTo(content,{y:8,opacity:0},{y:0,opacity:1,duration:.36,ease:'power3.out'},.22);
      } else {index = (index + 1) % variants.length; apply(); schedule();}
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
  schedule();
  if (!window.gsap) return;
  if (window.SplitText) gsap.registerPlugin(SplitText);
  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)',() => {
    const intro = gsap.timeline({defaults:{ease:'power3.out'}});
    intro.from('.header > a, .header nav a',{y:8,opacity:0,duration:.5,stagger:.05},0)
      .from('.portrait',{y:18,opacity:0,scale:.97,duration:.85},.1)
      .from('.feature',{y:18,opacity:0,duration:.7,stagger:.11},.6);
    let split;
    if (window.SplitText) {
      split = SplitText.create('.title-line > span',{
        type:'words',wordsClass:'title-word',aria:'none',autoSplit:true,
        onSplit(self) {
          return gsap.from(self.words,{yPercent:90,opacity:0,duration:.6,stagger:.045,delay:.3,ease:'power3.out',clearProps:'transform,opacity'});
        }
      });
    } else intro.from('.title-line > span',{yPercent:110,duration:.85,stagger:.1},.3);
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
  mm.add('(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)',() => {
    const xTo = gsap.quickTo(button,'x',{duration:.16,ease:'power3.out'});
    const yTo = gsap.quickTo(button,'y',{duration:.16,ease:'power3.out'});
    const reset = () => {xTo(0);yTo(0);};
    const move = event => {
      if (event.pointerType !== 'mouse' || document.activeElement === action) return;
      const rect = action.getBoundingClientRect();
      xTo(gsap.utils.clamp(-4,4,(event.clientX - rect.left - rect.width / 2) / (rect.width / 2) * 4));
      yTo(gsap.utils.clamp(-3,3,(event.clientY - rect.top - rect.height / 2) / (rect.height / 2) * 3));
    };
    action.addEventListener('pointermove',move);
    action.addEventListener('pointerleave',reset);
    action.addEventListener('focus',reset);
    return () => {
      action.removeEventListener('pointermove',move);
      action.removeEventListener('pointerleave',reset);
      action.removeEventListener('focus',reset);
      xTo.tween.kill();yTo.tween.kill();
      gsap.set(button,{clearProps:'transform'});
    };
  });
  reduced.addEventListener('change',() => {
    transition?.kill();apply();gsap.set(content,{clearProps:'transform,opacity'});
    if (dismissed && reduced.matches) {layoutTransition?.kill();settleDismissal();}
    schedule();
  });
})();
