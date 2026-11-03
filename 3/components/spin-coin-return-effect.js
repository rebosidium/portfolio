// A short reward burst after the large upgrade coin returns to its counter.
// The wrapper owns only its ring and sparks; the PNG remains untouched.
const activeEffects = new WeakMap();

export function playCoinReturnEffect(host, tier, reducedMotion) {
  const noop = () => {};
  if (host) activeEffects.get(host)?.();
  if (!host?.isConnected || reducedMotion?.matches || typeof host.animate !== 'function') return noop;

  // Keep repeat calls safe even if a caller replaces an in-flight effect.
  host.querySelectorAll(':scope > .v3-coin-return-fx').forEach(node => node.remove());
  const wrapper = document.createElement('span');
  wrapper.className = 'v3-coin-return-fx';
  wrapper.dataset.tier = tier?.id || 'gold';
  wrapper.setAttribute('aria-hidden', 'true');
  const ring = document.createElement('i');
  ring.className = 'v3-coin-return-fx__ring';
  wrapper.append(ring);
  host.append(wrapper);

  const animations = [];
  let timer = 0, stopped = false;
  const cleanup = () => {
    if (stopped) return;
    stopped = true;
    clearTimeout(timer);
    reducedMotion?.removeEventListener('change', onPreferenceChange);
    for (const animation of animations) animation.cancel();
    wrapper.remove();
    if (activeEffects.get(host) === cleanup) activeEffects.delete(host);
  };
  const onPreferenceChange = () => { if (reducedMotion.matches) cleanup(); };
  const animate = (node, frames, options) => {
    const animation = node.animate(frames, options);
    // Consume cancellation rejection before exposing the cleanup handle.
    animation.finished.catch(noop);
    animations.push(animation);
  };

  animate(host, [
    {transform: 'scale(1)', offset: 0},
    {transform: 'scale(1.22)', offset: .25},
    {transform: 'scale(.97)', offset: .68},
    {transform: 'scale(1)', offset: 1}
  ], {duration: 520, easing: 'cubic-bezier(.22,.8,.3,1)'});
  animate(ring, [
    {transform: 'translate(-50%,-50%) scale(.7)', opacity: 0, offset: 0},
    {transform: 'translate(-50%,-50%) scale(1)', opacity: .95, offset: .12},
    {transform: 'translate(-50%,-50%) scale(2)', opacity: 0, offset: 1}
  ], {duration: 850, easing: 'cubic-bezier(.15,.65,.3,1)'});

  // Fan sparks upwards and sideways so they leave SHARE RESULT below clear.
  for (let index = 0; index < 8; index++) {
    const spark = document.createElement('i');
    spark.className = 'v3-coin-return-fx__spark';
    spark.style.width = `${index % 2 ? 6 : 9}px`;
    const angle = (-172 + index * 23) * Math.PI / 180;
    const distance = index % 2 ? 47 : 61;
    const dx = Math.cos(angle) * distance, dy = Math.sin(angle) * distance;
    wrapper.append(spark);
    animate(spark, [
      {transform: 'translate(-50%,-50%) scale(.25) rotate(0deg)', opacity: 0, offset: 0},
      {transform: `translate(calc(-50% + ${dx * .28}px),calc(-50% + ${dy * .28}px)) scale(1.15) rotate(35deg)`, opacity: 1, offset: .2},
      {transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.3) rotate(100deg)`, opacity: 0, offset: 1}
    ], {duration: 810, delay: index * 10, easing: 'cubic-bezier(.15,.7,.25,1)', fill: 'both'});
  }

  reducedMotion?.addEventListener('change', onPreferenceChange);
  activeEffects.set(host, cleanup);
  timer = setTimeout(cleanup, 940);
  return cleanup;
}
