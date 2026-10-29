(async () => {
  if(window.DSFreshness && !await window.DSFreshness.ready)return;
  const params=new URLSearchParams(location.search);
  const example=window.DS_CATALOG.examples.find(item=>item.id===params.get('component'));
  if(!example){document.querySelector('#preview-root').textContent='Component not found.';return;}
  const mobile=params.get('mode')==='mobile';
  const validStates=mobile&&example.mobileStates?example.mobileStates:example.states;
  let state=validStates.includes(params.get('state'))?params.get('state'):validStates[0];
  const instance=params.get('instance')||'';
  const mode=mobile?'mobile':'desktop';
  let controlsReady=false;
  document.body.dataset.kind=example.kind;document.body.dataset.state=state;
  if(example.kind.includes('about-page'))document.body.classList.add('about-page');
  if(example.id==='not-found-page')document.body.classList.add('not-found-page');
  const previewRoot=document.querySelector('#preview-root');
  const markup=example.htmlByState?.[state]||(mobile&&example.htmlMobile?example.htmlMobile:example.html);
  if(window.DSAssets){previewRoot.append(window.DSAssets.stage(markup,'.agent-button img'));window.DSAssets.prepare(previewRoot);}
  else previewRoot.innerHTML=markup;
  // An isolated ready-menu link has no toggle to initialise the full menu runtime.
  if(example.id==='link')document.documentElement.dataset.mobileNavReady='true';
  window.mobileLayout=matchMedia('(max-width: 767px), (max-width: 1023px) and (pointer: coarse)');
  const control=document.querySelector(example.kind.includes('header')?(mobile?'.menu-toggle':'.header nav a[href]:not(.mobile-only)'):'.agent-button,.ui-back,.header nav a,.footer-links a');
  function notify(type,detail={}){
    if(parent!==window)parent.postMessage({type,component:example.id,mode,instance,...detail},location.origin);
  }
  function applyBriefState(next){
    if(!validStates.includes(next))return;
    const button=document.querySelector('.agent-button');
    const wrapper=button.closest('[data-agent-control]');
    const labels=[...button.querySelectorAll('.agent-button-label>span')];
    const transitions=labels.map(label=>label.style.transition);
    labels.forEach(label=>{label.style.transition='none';});
    if(wrapper.contains(document.activeElement))document.activeElement.blur();
    button.dispatchEvent(new Event('portfolio:agent-preview-reset'));
    button.removeAttribute('data-ui-state');
    state=next;document.body.dataset.state=state;
    if(['hover','focus','pressed'].includes(state))button.dataset.uiState=state;
    button.classList.toggle('is-copied',state==='copied');
    wrapper.querySelector('.agent-copy-fallback').hidden=state!=='manual-copy';
    if(state==='copied')wrapper.querySelector('[role="status"]').textContent='Prompt copied. Paste it into your AI chat.';
    if(state==='manual-copy')wrapper.querySelector('[role="status"]').textContent='Copy the selected prompt below, then paste it into your AI chat.';
    // Commit the chosen static label before restoring normal native click fades.
    labels.forEach(label=>{void getComputedStyle(label).opacity;});
    labels.forEach((label,index)=>{if(transitions[index])label.style.transition=transitions[index];else label.style.removeProperty('transition');});
    if(controlsReady)notify('portfolio:ds-layout',{state,manualVisible:!wrapper.querySelector('.agent-copy-fallback').hidden});
  }
  if(example.inPlaceStates){
    applyBriefState(state);
    window.addEventListener('message',event=>{
      if(event.origin!==location.origin||event.source!==parent||!event.data||typeof event.data!=='object')return;
      const data=event.data;
      if(data.type!=='portfolio:ds-state'||data.component!==example.id||data.mode!==mode||data.instance!==instance)return;
      applyBriefState(data.state);
    });
    const fallback=document.querySelector('.agent-copy-fallback');
    new MutationObserver(()=>{if(controlsReady)notify('portfolio:ds-layout',{state,manualVisible:!fallback.hidden});}).observe(fallback,{attributes:true,attributeFilter:['hidden']});
  }else{
    if(control&&['hover','focus','pressed'].includes(state))control.dataset.uiState=state;
    if(state==='copied')document.querySelector('.agent-button')?.classList.add('is-copied');
    if(state==='manual-copy')document.querySelector('.agent-copy-fallback').hidden=false;
  }
  if(state==='image-error'){
    const artwork=document.querySelector('.work-artwork');artwork.classList.add('image-failed');artwork.dataset.imageState='failed';artwork.querySelector('.work-image-error').hidden=false;
  }
  if(state==='paused')document.querySelector('[data-pulse-visible]')?.setAttribute('data-pulse-visible','false');
  // One cleaned portrait set serves both palettes; native sources select motion state.

  if(state==='hover'&&example.group==='template')document.querySelector('.header nav a[href]:not(.mobile-only)')?.setAttribute('data-ui-state','hover');
  function script(src,done){const node=document.createElement('script');node.src=src;node.onload=done;document.body.append(node);}
  if(example.id==='not-found-page')script(window.DS_CATALOG.scripts.arrows);
  if(example.id!=='not-found-page')script(window.DS_CATALOG.scripts.controls,()=>{
    if(example.inPlaceStates){controlsReady=true;applyBriefState(state);notify('portfolio:ds-ready');}
  });
  if(document.querySelector('.work-artwork')&&state!=='image-error'){previewRoot.dataset.projectMediaAuto='';script(window.DS_CATALOG.scripts.projectMedia);}
  if(document.querySelector('[data-case-gallery]')){const css=document.createElement('link');css.rel='stylesheet';css.href=window.DS_CATALOG.scripts.caseGalleryStyle;document.head.append(css);script(window.DS_CATALOG.scripts.caseGallery);}
  if(document.querySelector('.photo-gallery'))script(window.DS_CATALOG.scripts.photoGallery);
  if(document.querySelector('[data-recommendations]')){
    const css=document.createElement('link');css.rel='stylesheet';css.href=window.DS_CATALOG.scripts.recommendationsStyle;document.head.append(css);
    script(window.DS_CATALOG.scripts.recommendations);
  }
  if(example.kind.split(' ').includes('reading'))script(window.DS_CATALOG.scripts.reading);
  if(document.querySelector('.menu-toggle'))script(window.DS_CATALOG.scripts.navigation,()=>{if(state==='open')document.querySelector('.menu-toggle').click();});
  document.documentElement.dataset.contentReadyAt=performance.now().toFixed(1);
  if(example.id!=='not-found-page')script(window.DS_CATALOG.scripts.resume);
})();
