// Cooler, motion-reactive light field for the portrait dialog. Layers live in
// the existing mesh; JS only switches an energy state and recycles six trails.
// No idle RAF: a frame loop runs only while the head turns on its own.
const TRAIL_COUNT = 6;
const ENERGY = {'power-spin': 'spin', drag: 'drag', return: 'return', intro: 'intro'};
const LOOP_MODES = new Set(['power-spin', 'return', 'intro']);
const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));

export function mountAvatarAmbience(dialog, stage, spinButton) {
  const mesh = dialog?.querySelector('.v3-avatar-mesh'), canvas = stage?.querySelector('canvas');
  if (!mesh || !canvas) return () => {};
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  const canAnimate = typeof Element.prototype.animate === 'function';
  const layer = document.createElement('div');
  layer.className = 'v3-ambience';layer.setAttribute('aria-hidden', 'true');layer.dataset.energy = 'calm';
  layer.innerHTML = '<span class="v3-ambience__wave v3-ambience__wave--cyan"></span><span class="v3-ambience__wave v3-ambience__wave--blue"></span><span class="v3-ambience__wave v3-ambience__wave--ice"></span><span class="v3-ambience__glow"></span><span class="v3-ambience__surge"></span>';
  const trails = Array.from({length: TRAIL_COUNT}, (_, index) => {
    const element = document.createElement('span');
    element.className = `v3-ambience__trail v3-ambience__trail--${index % 3}`;
    layer.append(element);
    return {element, animation: null};
  });
  mesh.append(layer);

  let mode = '', raf = 0, rect = null, nextTrail = 0, lastEmit = 0, spinClickAt = -1e4;
  let lastPhase = null, lastTick = 0, travel = 0, pointer = null;
  const cleanup = [];
  const listen = (target, name, handler, options) => {
    target.addEventListener(name, handler, options);
    cleanup.push(() => target.removeEventListener(name, handler, options));
  };
  const live = () => dialog.open && !dialog.v3AvatarShell?.closing && !document.hidden && !reduced.matches;

  function measure() {
    const box = stage.getBoundingClientRect();
    rect = {x: box.left + box.width / 2, y: box.top + box.height / 2, w: box.width, h: box.height};
    // Positioned once per active period or resize, never per frame.
    layer.style.setProperty('--v3-ambience-x', `${rect.x.toFixed(1)}px`);
    layer.style.setProperty('--v3-ambience-y', `${rect.y.toFixed(1)}px`);
    return rect;
  }
  function emit(x, y, dx, dy, strength) {
    if (!canAnimate || !live()) return;
    const trail = trails[nextTrail];nextTrail = (nextTrail + 1) % TRAIL_COUNT;
    trail.animation?.cancel();
    const size = .75 + .45 * strength, peak = (.38 + .32 * strength).toFixed(3);
    const at = (k, scale) => `translate(${(x + dx * k).toFixed(1)}px,${(y + dy * k).toFixed(1)}px) translate(-50%,-50%) scale(${(scale * size).toFixed(3)})`;
    const animation = trail.element.animate([
      {transform: at(0, .5), opacity: 0},
      {transform: at(.3, .85), opacity: peak, offset: .2},
      {transform: at(1, 1.3), opacity: 0}
    ], {duration: 950, easing: 'cubic-bezier(.22,1,.36,1)'});
    trail.animation = animation;
    animation.finished.then(() => { if (trail.animation === animation) trail.animation = null; }, () => {});
  }
  function burst() {
    const c = rect || measure();
    [-1, 0, 1].forEach(side => emit(c.x + side * c.w * .38, c.y - c.h * .05, side * c.w * .28, -c.h * .06, .85));
  }
  function loop(now) {
    raf = 0;
    if (!live() || !LOOP_MODES.has(mode)) return;
    const phase = Number(canvas.dataset.phase);
    if (Number.isFinite(phase)) {
      if (lastPhase !== null && lastTick) {
        const delta = phase - lastPhase, speed = Math.abs(delta) * 1000 / Math.max(1, now - lastTick);
        travel += Math.abs(delta);
        // Emission follows real angular travel; a stalled decoder emits nothing.
        if (travel >= 50 && now - lastEmit >= 150) {
          travel = 0;lastEmit = now;
          const c = rect || measure(), theta = phase * Math.PI / 180, direction = Math.sign(delta) || 1;
          emit(c.x + Math.sin(theta) * c.w * .42, c.y + Math.cos(theta) * c.h * .06 - c.h * .04,
            Math.cos(theta) * direction * c.w * .3, -c.h * .03, Math.min(1, .35 + speed / 900));
        }
      }
      lastPhase = phase;lastTick = now;
    }
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    cancelAnimationFrame(raf);raf = 0;mode = '';pointer = null;lastPhase = null;
    layer.dataset.energy = 'calm';
    for (const trail of trails) { trail.animation?.cancel();trail.animation = null; }
  }
  function sync() {
    if (!live()) { if (mode || raf) stop(); return; }
    const next = canvas.dataset.mode || 'idle';
    // The player rewrites data-mode every motion frame; ignore unchanged values.
    if (next === mode) return;
    mode = next;
    const energy = ENERGY[mode] || 'calm';
    if (energy !== 'calm' && layer.dataset.energy === 'calm') measure();
    layer.dataset.energy = energy;
    if (mode === 'power-spin' && performance.now() - spinClickAt < 500) burst();
    if (LOOP_MODES.has(mode)) {
      if (!raf) { lastPhase = null;lastTick = 0;travel = 0;raf = requestAnimationFrame(loop); }
    } else { cancelAnimationFrame(raf);raf = 0; }
  }

  const modeObserver = new MutationObserver(sync);
  modeObserver.observe(canvas, {attributes: true, attributeFilter: ['data-mode']});
  cleanup.push(() => modeObserver.disconnect());
  listen(stage, 'pointerdown', event => { pointer = {id: event.pointerId, x: event.clientX, y: event.clientY}; }, {passive: true});
  listen(stage, 'pointermove', event => {
    // Read the live attribute: the player's own listener may have just entered drag.
    if (canvas.dataset.mode !== 'drag' || !live()) return;
    if (!pointer || pointer.id !== event.pointerId) { pointer = {id: event.pointerId, x: event.clientX, y: event.clientY}; return; }
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y, now = performance.now();
    if (now - lastEmit < 120 || Math.hypot(dx, dy) < 6) return;
    lastEmit = now;pointer = {id: event.pointerId, x: event.clientX, y: event.clientY};
    emit(event.clientX, event.clientY, clamp(dx * 5, 180), clamp(dy * 2, 60), Math.min(1, .4 + Math.abs(dx) / 40));
  }, {passive: true});
  listen(spinButton, 'click', event => { if (event.isTrusted && !spinButton.disabled) spinClickAt = performance.now(); });
  listen(dialog, 'v3-avatar-opened', sync);
  listen(dialog, 'v3-avatar-closing', stop);
  listen(dialog, 'close', stop);
  listen(document, 'visibilitychange', () => { if (document.hidden) stop(); else sync(); });
  listen(reduced, 'change', () => { if (reduced.matches) stop(); else sync(); });
  listen(window, 'pagehide', stop);
  listen(window, 'resize', () => { rect = null;if (layer.dataset.energy !== 'calm') measure(); }, {passive: true});
  sync();

  return () => {
    stop();
    cleanup.splice(0).forEach(remove => remove());
    layer.remove();
  };
}
