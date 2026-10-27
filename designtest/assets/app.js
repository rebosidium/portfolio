/* Isolated navigation only. No telemetry, storage, dependencies or image generation. */
(() => {
  'use strict';
  const menu = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#navigation');
  function closeMenu(restoreFocus = false) {
    if (!menu) return;
    menu.setAttribute('aria-expanded','false');
    menu.setAttribute('aria-label',menu.dataset.openLabel);
    navigation.classList.remove('open');
    document.body.classList.remove('menu-open');
    if(restoreFocus) menu.focus();
  }
  menu?.addEventListener('click',()=>{
    const open=menu.getAttribute('aria-expanded')!=='true';
    menu.setAttribute('aria-expanded',String(open));
    menu.setAttribute('aria-label',open?menu.dataset.closeLabel:menu.dataset.openLabel);
    navigation.classList.toggle('open',open);
    document.body.classList.toggle('menu-open',open);
  });
  document.addEventListener('keydown',event=>{
    if(menu?.getAttribute('aria-expanded')!=='true')return;
    if(event.key==='Escape'){closeMenu(true);return;}
    if(event.key==='Tab'){
      const controls=[menu,...navigation.querySelectorAll('a')],first=controls[0],last=controls.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  navigation?.addEventListener('click',event=>{if(event.target.closest('a'))closeMenu();});
  matchMedia('(min-width:768px)').addEventListener('change',()=>closeMenu());
  if(new URL(location.href).searchParams.get('analytics_test')==='1')for(const a of document.querySelectorAll('a[href]')){
    const u=new URL(a.getAttribute('href'),location.href);
    if(u.origin===location.origin&&/^(https?:)$/.test(u.protocol)){
      u.searchParams.set('analytics_test','1');a.href=u.pathname+u.search+u.hash;
    }
  }
  const sections=[...document.querySelectorAll('.case-section')];
  const links=[...document.querySelectorAll('.case-contents nav a')];
  if(sections.length&&'IntersectionObserver'in window){
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries)if(entry.isIntersecting)for(const a of links){
        const current=a.hash===`#${entry.target.id}`;
        a.classList.toggle('active',current);
        if(current)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');
      }
    },{rootMargin:'-15% 0px -60% 0px',threshold:0});
    sections.forEach(section=>observer.observe(section));
  }
})();
