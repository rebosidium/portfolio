(() => {
  'use strict';
  const root=document.documentElement;
  const valid=value=>['system','light','dark'].includes(value);
  const system=matchMedia('(prefers-color-scheme: dark)');
  const storageKey='portfolio.ds.theme.v1';
  let preference='system',pending=false;
  try{const saved=sessionStorage.getItem(storageKey);if(valid(saved))preference=saved;}catch{}
  const requested=new URLSearchParams(location.search).get('theme');
  if(valid(requested))preference=requested;
  // A lazy frame may finish loading after the toolbar changed its theme.
  // Read the live parent choice before first paint, ahead of its old URL.
  if(parent!==window)try{const inherited=parent.document.documentElement.dataset.themePreference;if(valid(inherited))preference=inherited;}catch{}
  const resolved=()=>preference==='system'?(system.matches?'dark':'light'):preference;
  function updateTokens(){
    const front=document.body?.matches('.ds-preview[data-kind~="portrait"]')&&['front','reduced-motion'].includes(document.body.dataset.state);
    for(const source of document.querySelectorAll('source[data-portrait-motion="reduce"]:not([data-portrait-theme])')){
      const media=front?'all':'(prefers-reduced-motion: reduce)';if(source.media!==media)source.media=media;
    }
    for(const source of document.querySelectorAll('source[data-portrait-theme="dark"]')){
      const media=resolved()==='dark'?(source.dataset.portraitMotion==='reduce'&&!front?'(prefers-reduced-motion: reduce)':'all'):'not all';
      if(source.media!==media)source.media=media;
    }
    const style=getComputedStyle(root);
    for(const row of document.querySelectorAll('#token-reference tr')){
      const key=row.querySelector('td a')?.textContent;
      if(key&&/^--(?:color|border)-/.test(key)){
        const label=row.lastElementChild,value=style.getPropertyValue(key).trim();
        if(label.textContent!==value)label.textContent=value;
      }
    }
    for(const swatch of document.querySelectorAll('[data-color-token]')){
      const label=swatch.querySelector('.ds-color-value'),value=style.getPropertyValue('--'+swatch.dataset.colorToken).trim();
      if(label&&label.textContent!==value)label.textContent=value;
    }
  }
  function send(frame){try{frame.contentWindow.postMessage({type:'portfolio:ds-theme',theme:preference},location.origin);}catch{}}
  function apply(value,{save=false}={}){
    if(!valid(value))return;
    preference=value;
    if(value==='system')delete root.dataset.colorScheme;else root.dataset.colorScheme=value;
    root.dataset.themePreference=value;
    if(save)try{sessionStorage.setItem(storageKey,value);}catch{}
    for(const button of document.querySelectorAll('[data-theme-choice]'))button.setAttribute('aria-pressed',String(button.dataset.themeChoice===value));
    const status=document.querySelector('#ds-theme-status');if(status)status.textContent=(value==='system'?'System · ':'')+(resolved()==='dark'?'Dark':'Light');
    // Manual selection affects native browser surfaces only inside the DS.
    for(const meta of document.querySelectorAll('meta[name="theme-color"]')){meta.removeAttribute('media');meta.content=resolved()==='dark'?'#171819':'#FFFFFF';}
    updateTokens();
    document.querySelectorAll('.ds-preview-frame').forEach(send);
  }
  window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===parent&&event.data?.type==='portfolio:ds-theme')apply(event.data.theme);});
  system.addEventListener('change',()=>{if(preference==='system')apply(preference);});
  apply(preference);
  document.addEventListener('DOMContentLoaded',()=>{
    document.addEventListener('click',event=>{const button=event.target.closest('[data-theme-choice]');if(button)apply(button.dataset.themeChoice,{save:true});});
    document.addEventListener('load',event=>{if(event.target.matches?.('.ds-preview-frame'))send(event.target);},true);
    apply(preference);
    new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;updateTokens();});}).observe(document.body,{childList:true,subtree:true});
  });
})();
