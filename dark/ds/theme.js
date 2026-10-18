(() => {
  'use strict';
  const root=document.documentElement;
  const valid=value=>['system','light','dark'].includes(value);
  const system=matchMedia('(prefers-color-scheme: dark)');
  let preference='system';
  try {const saved=sessionStorage.getItem('portfolio.ds.theme');if(valid(saved))preference=saved;}catch{}
  const requested=new URLSearchParams(location.search).get('theme');
  if(valid(requested))preference=requested;
  const resolved=()=>preference==='system'?(system.matches?'dark':'light'):preference;
  function apply(value,{save=false}={}){
    if(!valid(value))return;
    preference=value;
    if(value==='system')delete root.dataset.previewTheme;else root.dataset.previewTheme=value;
    root.dataset.themePreference=value;
    if(save)try{sessionStorage.setItem('portfolio.ds.theme',value);}catch{}
    for(const button of document.querySelectorAll('[data-theme-choice]'))button.setAttribute('aria-pressed',String(button.dataset.themeChoice===value));
    const status=document.querySelector('#ds-theme-status');if(status)status.textContent=`${value==='system'?'System · ':''}${resolved()==='dark'?'Dark':'Light'} · experimental palette`;
    for(const frame of document.querySelectorAll('.ds-preview-frame'))try {frame.contentWindow.postMessage({type:'portfolio:ds-theme',theme:value},location.origin);}catch{}
    for(const row of document.querySelectorAll('#token-reference tr')){const key=row.querySelector('td a')?.textContent;if(key&&/^--(?:color|border)-/.test(key)){const label=row.lastElementChild,value=getComputedStyle(root).getPropertyValue(key).trim();if(label.textContent!==value)label.textContent=value;}}
    for(const swatch of document.querySelectorAll('[data-color-token]')){
      const key=swatch.dataset.colorToken,label=swatch.querySelector('.ds-color-value');if(label)label.textContent=getComputedStyle(root).getPropertyValue('--'+key).trim();
    }
  }
  window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===parent&&event.data?.type==='portfolio:ds-theme')apply(event.data.theme);});
  system.addEventListener('change',()=>{if(preference==='system')apply(preference);});
  apply(preference);
  document.addEventListener('DOMContentLoaded',()=>{
    document.addEventListener('click',event=>{const button=event.target.closest('[data-theme-choice]');if(button)apply(button.dataset.themeChoice,{save:true});});
    document.addEventListener('load',event=>{if(event.target.matches?.('.ds-preview-frame'))event.target.contentWindow.postMessage({type:'portfolio:ds-theme',theme:preference},location.origin);},true);
    apply(preference);
    // Catalog rows/frames mount after DS scripts; synchronize without reloading
    // them, preserving selected states, scroll, autoplay and native controls.
    let pending=false;
    new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;for(const row of document.querySelectorAll('#token-reference tr')){const key=row.querySelector('td a')?.textContent;if(key&&/^--(?:color|border)-/.test(key)){const label=row.lastElementChild,value=getComputedStyle(root).getPropertyValue(key).trim();if(label.textContent!==value)label.textContent=value;}}for(const frame of document.querySelectorAll('.ds-preview-frame'))try{frame.contentWindow.postMessage({type:'portfolio:ds-theme',theme:preference},location.origin);}catch{};for(const swatch of document.querySelectorAll('[data-color-token]')){const label=swatch.querySelector('.ds-color-value'),value=getComputedStyle(root).getPropertyValue('--'+swatch.dataset.colorToken).trim();if(label&&label.textContent!==value)label.textContent=value;}});}).observe(document.body,{childList:true,subtree:true});
  });
})();
