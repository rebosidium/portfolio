(() => {
  const promo = document.querySelector('.promo');
  const content = document.querySelector('.promo-content');
  const illustration = document.querySelector('.promo-illustration');
  const text = document.querySelector('.promo-text');
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
  let timer, transition, dismissed = false, hovered = false;
  const apply = () => {
    const v = variants[index];
    promo.style.backgroundColor = v.color;
    content.style.gap = `${v.gap}px`;
    illustration.src = v.image;
    text.textContent = v.text;
    button.textContent = v.cta;
    button.href = `mailto:rebosidium@gmail.com?subject=${encodeURIComponent(v.subject)}`;
    promo.dataset.variant = v.id;
  };
  apply();
  const pause = () => clearTimeout(timer);
  const schedule = () => {
    pause();
    if (dismissed || reduced.matches || document.hidden || hovered || promo.contains(document.activeElement)) return;
    timer = setTimeout(() => {
      if (window.gsap) {
        transition = gsap.timeline({onComplete:schedule});
        transition.to(content,{y:-8,opacity:0,duration:.22,ease:'power2.in'}).call(() => {
          index = (index + 1) % variants.length;
          apply();
        }).fromTo(content,{y:8,opacity:0},{y:0,opacity:1,duration:.36,ease:'power3.out'});
      } else {index = (index + 1) % variants.length; apply(); schedule();}
    }, 10000);
  };
  promo.addEventListener('pointerenter',() => {hovered = true; pause();});
  promo.addEventListener('pointerleave',() => {hovered = false; schedule();});
  promo.addEventListener('focusin',pause);
  promo.addEventListener('focusout',() => setTimeout(schedule,0));
  document.addEventListener('visibilitychange',() => document.hidden ? pause() : schedule());
  close.addEventListener('click',event => {
    dismissed = true; pause(); transition?.kill();
    if (event.detail === 0) document.querySelector('.identity').focus({preventScroll:true});
    else close.blur();
    if (window.gsap && !reduced.matches) gsap.to(promo,{height:0,opacity:0,duration:.36,ease:'power3.inOut',onComplete:() => {promo.hidden = true;}});
    else promo.hidden = true;
  });
  schedule();
  if (!window.gsap) return;
  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)',() => {
    const intro = gsap.timeline({defaults:{ease:'power3.out'}});
    intro.from('.header > a, .header nav a',{y:8,opacity:0,duration:.5,stagger:.05},0)
      .from('.portrait',{y:18,opacity:0,scale:.97,duration:.85},.1)
      .from('.title-line > span',{yPercent:110,duration:.85,stagger:.1},.3)
      .from('.feature',{y:18,opacity:0,duration:.7,stagger:.11},.6);
    const cleanups = [];
    document.querySelectorAll('.feature').forEach(feature => {
      const art = feature.querySelector('.feature-art');
      const enter = () => gsap.to(art,{y:-6,rotation:-4,scale:1.045,duration:.4,ease:'power3.out',overwrite:true});
      const leave = () => gsap.to(art,{y:0,rotation:0,scale:1,duration:.55,ease:'elastic.out(1,.5)',overwrite:true});
      feature.addEventListener('pointerenter',enter); feature.addEventListener('pointerleave',leave);
      cleanups.push(() => {feature.removeEventListener('pointerenter',enter); feature.removeEventListener('pointerleave',leave);});
    });
    return () => cleanups.forEach(fn => fn());
  });
  reduced.addEventListener('change',() => {transition?.kill();gsap.set(content,{clearProps:'transform,opacity'});schedule();});
})();
