(() => {
  const params=new URLSearchParams(location.search);
  const example=window.DS_CATALOG.examples.find(item=>item.id===params.get('component'));
  if(!example){document.querySelector('#preview-root').textContent='Component not found.';return;}
  const mobile=params.get('mode')==='mobile';
  const validStates=mobile&&example.mobileStates?example.mobileStates:example.states;
  const state=validStates.includes(params.get('state'))?params.get('state'):validStates[0];
  document.body.dataset.kind=example.kind;document.body.dataset.state=state;
  if(example.kind.includes('about-page')||(example.id==='footer'&&state==='about'))document.body.classList.add('about-page');
  document.querySelector('#preview-root').innerHTML=mobile&&example.htmlMobile?example.htmlMobile:example.html;
  // An isolated ready-menu link has no toggle to initialise the full menu runtime.
  if(example.id==='link')document.documentElement.dataset.mobileNavReady='true';
  window.mobileLayout=matchMedia('(max-width: 767px), (max-width: 1023px) and (pointer: coarse)');
  const control=document.querySelector('.agent-button,.ui-back,.header nav a,.footer-links a');
  if(control&&['hover','focus','pressed'].includes(state))control.dataset.uiState=state;
  if(state==='copied')document.querySelector('.agent-button')?.classList.add('is-copied');
  if(state==='manual-copy')document.querySelector('.agent-copy-fallback').hidden=false;
  if(['front','reduced-motion'].includes(state)&&example.id==='portrait'){
    const source=document.querySelector('.portrait source');
    const image=document.querySelector('.portrait img');
    image.src=source.srcset;source.remove();
  }
  if(state==='hover'&&example.group==='template')document.querySelector('.header nav a')?.setAttribute('data-ui-state','hover');
  function script(src,done){const node=document.createElement('script');node.src=src;node.onload=done;document.body.append(node);}
  script(window.DS_CATALOG.scripts.controls);
  if(document.querySelector('.menu-toggle'))script(window.DS_CATALOG.scripts.navigation,()=>{if(state==='open')document.querySelector('.menu-toggle').click();});
  document.documentElement.dataset.contentReadyAt=performance.now().toFixed(1);
  script(window.DS_CATALOG.scripts.resume);
})();
