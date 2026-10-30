// Independent adaptation of mountAgentIconMotion/playWave from the existing site.
export function mountBriefIcons(button) {
  const icons = [...button.querySelector('.v3-brief__logos').children];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const ease = 'cubic-bezier(.37,0,.63,1)';
  const pose = y => ({transform: `translate3d(0,${y}px,0)`, easing: ease});
  let animations = [];
  function stop() {
    animations.forEach(animation => animation.cancel());
    animations = [];
  }
  button.addEventListener('click', () => {
    if (button.disabled || animations.length || document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Same jump, half-wave easing and stagger as the old Brief: 9px / 500ms / 70ms.
    const current = icons.map((icon,index) => icon.animate([pose(0),pose(-9),pose(0)], {
      duration: 500, delay: index * 70, fill: 'both'
    }));
    animations = current;
    Promise.all(current.map(animation => animation.finished)).then(() => {
      if (animations === current) stop();
    }).catch(() => {});
  });
  reduced.addEventListener('change', stop);
  document.addEventListener('visibilitychange', () => {if (document.hidden) stop();});
  new MutationObserver(() => {if (button.disabled) stop();}).observe(button,{attributes:true,attributeFilter:['disabled']});
}
