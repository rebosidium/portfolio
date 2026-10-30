// Original local glass interaction. Only the surface refracts; text stays clear.
export function mountBriefGlass(button) {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const displacement = button.querySelector('feDisplacementMap');
  const glass = button.querySelector('.v3-brief__glass');
  const waves = [...button.querySelectorAll('.v3-brief__wave')];
  let stage = document.querySelector('.v3-page-waves');
  if (!stage) {
    stage = document.createElement('div');
    stage.className = 'v3-page-waves';
    stage.setAttribute('aria-hidden', 'true');
    stage.innerHTML = '<span class="v3-page-wave"></span><span class="v3-page-wave"></span>';
    document.body.append(stage);
  }
  const pageWaves = [...stage.children];
  const filter = button.querySelector('filter');
  filter.id = `v3-brief-liquid-${crypto.randomUUID()}`;
  let frame = 0;
  let animations = [];
  function stop() {
    cancelAnimationFrame(frame);
    animations.forEach(animation => animation.cancel());
    animations = [];
    displacement.setAttribute('scale', '0');
    glass.style.removeProperty('filter');
    button.classList.remove('is-liquid');
  }
  reduceMotion.addEventListener('change', stop);
  document.addEventListener('visibilitychange', () => {if (document.hidden) stop();});
  function ripple(event) {
    stop();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || button.disabled) return;
    button.classList.add('is-liquid');
    glass.style.filter = `url("#${filter.id}")`;
    const start = performance.now();
    const duration = 1800;
    function draw(now) {
      const t = Math.min(1, (now - start) / 1280);
      const envelope = Math.sin(Math.PI * t) * Math.exp(-2.7 * t);
      displacement.setAttribute('scale', String(Math.sin(t * Math.PI * 2.5) * envelope * 6));
      if (now - start < duration) frame = requestAnimationFrame(draw);
      else stop();
    }
    frame = requestAnimationFrame(draw);
    // Gentle rings emerge from behind the pill, below the glass and the content.
    animations = waves.map((wave,index) => wave.animate([
      {transform: 'scale(.985, .94)', opacity: 0},
      {offset: .16, opacity: index ? .22 : .34},
      {transform: 'scale(1.12, 2.6)', opacity: 0}
    ], {duration: 1100, delay: index * 120, easing: 'cubic-bezier(.2,.55,.3,1)', fill: 'none'}));
    const rect = button.getBoundingClientRect();
    const pointer = event && event.detail !== 0 && Number.isFinite(event.clientX);
    const x = pointer ? event.clientX : rect.x + rect.width / 2;
    const y = pointer ? event.clientY : rect.y + rect.height / 2;
    const radius = Math.max(...[[0,0],[innerWidth,0],[0,innerHeight],[innerWidth,innerHeight]].map(([cx,cy]) => Math.hypot(cx-x,cy-y)));
    for (const wave of pageWaves) {
      wave.style.left = `${x}px`;
      wave.style.top = `${y}px`;
    }
    animations.push(...pageWaves.map((wave,index) => wave.animate([
      {transform: 'translate(-50%, -50%) scale(.15)', opacity: 0},
      {offset: .12, opacity: index ? .25 : .4},
      {offset: .55, opacity: index ? .14 : .22},
      {transform: `translate(-50%, -50%) scale(${radius / 80 * 1.18})`, opacity: 0}
    ], {duration: 1620, delay: index * 160, easing: 'cubic-bezier(.14,.48,.28,1)', fill: 'none'})));

  }
  button.addEventListener('click', ripple);
  return {stop};
}
