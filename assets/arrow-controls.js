(() => {
  'use strict';
  // Use the real history entry so Back restores the preceding case and scroll.
  // A direct/external visit or new tab retains the template's Home fallback.
  let previous;
  try{if(document.referrer&&history.length>1){
    const url=new URL(document.referrer);
    if(url.origin===location.origin&&url.href!==location.href)previous=url;
  }}catch{}
  if(previous){
    document.querySelectorAll('a[data-history-back]').forEach(link=>{link.href=previous.href;});
    document.addEventListener('click',event=>{
      const link=event.target.closest?.('a[data-history-back]');
      if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.target||link.hasAttribute('download'))return;
      event.preventDefault();history.back();
    });
  }
  // Touch feedback starts on contact; native link navigation never waits for it.
  const arrowReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const arrowAnimations = new Map();
  document.addEventListener('pointerdown',event => {
    if (event.pointerType !== 'touch' || !event.isPrimary || arrowReducedMotion.matches) return;
    const button = event.target.closest?.('.ui-back,.ui-project-link');
    if (!button || button.matches(':disabled,[aria-disabled="true"]') || button.closest('.ds-preview[data-state="reduced-motion"]')) return;
    const icon = button.querySelector(':scope > img');
    if (!icon?.animate) return;
    arrowAnimations.get(icon)?.cancel();
    const offset = getComputedStyle(button).getPropertyValue('--arrow-offset').trim();
    const animation = icon.animate([
      {translate:'0px 0px'},
      {translate:`${offset} 0px`,offset:.45},
      {translate:'0px 0px'}
    ],{duration:400,easing:'cubic-bezier(.37,0,.63,1)'});
    arrowAnimations.set(icon,animation);
    animation.finished.catch(() => {}).finally(() => {
      if (arrowAnimations.get(icon) === animation) arrowAnimations.delete(icon);
    });
  },{passive:true});
  const cancelArrowAnimations = () => {
    for (const animation of arrowAnimations.values()) animation.cancel();
    arrowAnimations.clear();
  };
  arrowReducedMotion.addEventListener('change',cancelArrowAnimations);
  document.addEventListener('visibilitychange',() => {if (document.hidden) cancelArrowAnimations();});

})();
