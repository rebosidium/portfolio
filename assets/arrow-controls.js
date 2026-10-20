(() => {
  'use strict';
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
