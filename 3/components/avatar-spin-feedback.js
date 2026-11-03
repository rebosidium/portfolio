// Repeated Spin taps boost one continuous rotation; Hide keeps its single
// spring turn. The button press remains an independent WAAPI animation.
const reducedQuery = '(prefers-reduced-motion:reduce)';
const SPIN_SPEED = 600, SPIN_BOOST = 75, SPIN_MAX_SPEED = 1080;
const SPIN_ACCELERATION = 1800, SPIN_IDLE_MS = 280;

function currentMatrix(element) {
  const value = getComputedStyle(element).transform;
  if (!value || value === 'none') return null;
  try { return new DOMMatrixReadOnly(value); } catch { return null; }
}
function currentAngle(element) {
  const m = currentMatrix(element);
  if (!m) return 0;
  let angle = Math.atan2(m.b, m.a) * 180 / Math.PI;
  if (angle < 0) angle += 360;
  // A spring settling just short of the front reads as "almost done": continue
  // from slightly negative rather than replaying a near-complete turn.
  return angle > 300 ? angle - 360 : angle;
}
function currentScale(element) {
  const m = currentMatrix(element);
  return m ? Math.hypot(m.a, m.b) : 1;
}

export function mountSpinFeedback(button) {
  if (!button || typeof button.animate !== 'function') return () => {};
  const reduced = matchMedia(reducedQuery);
  const dialog = button.closest('dialog');
  const continuousSpin = button.classList.contains('v3-avatar-spin');
  let iconAnimation = null, pressAnimation = null;
  let spinState = null, spinFrame = 0;
  const cleanup = [];
  const listen = (target, name, handler, options) => {
    if (!target) return;
    target.addEventListener(name, handler, options);
    cleanup.push(() => target.removeEventListener(name, handler, options));
  };

  function cancel() {
    iconAnimation?.cancel(); pressAnimation?.cancel();
    iconAnimation = pressAnimation = null;
    stopSpin();
  }
  function track(animation, clear) {
    // Cancellation rejects `finished`; consume it so no rejection is unhandled.
    animation.finished.then(() => clear(animation), () => {});
    return animation;
  }

  function stopSpin() {
    cancelAnimationFrame(spinFrame); spinFrame = 0;
    if (!spinState) return;
    const {icon, originalTransform, originalPriority} = spinState;
    // A completed turn is visually identical to the original resting pose.
    // Removing our inline transform also lets the stylesheet own rest again.
    if (originalTransform) icon.style.setProperty('transform', originalTransform, originalPriority);
    else icon.style.removeProperty('transform');
    spinState = null;
  }

  function tickSpin(now) {
    spinFrame = 0;
    const state = spinState;
    if (!state) return;
    if (reduced.matches || document.hidden || !state.icon.isConnected) { stopSpin(); return; }
    // Do not fast-forward through missed frames. A slow frame delays the
    // finish instead of creating a sudden angular jump.
    const dt = Math.min(.05, Math.max(0, (now - state.frameAt) / 1000));
    state.frameAt = now;
    if (!state.coast && now - state.tappedAt >= SPIN_IDLE_MS) {
      const end = Math.ceil(Math.max(state.minimumEnd, state.angle + state.speed * .4) / 360) * 360;
      const distance = end - state.angle;
      // Constant deceleration: distance = v0 * duration / 2. This starts
      // with exactly the current velocity and reaches zero at a full turn.
      state.coast = {start: state.angle, end, speed: state.speed, duration: 2 * distance / state.speed, elapsed: 0};
    }
    if (state.coast) {
      const coast = state.coast;
      coast.elapsed = Math.min(coast.duration, coast.elapsed + dt);
      const progress = coast.elapsed / coast.duration;
      state.angle = coast.start + coast.speed * coast.elapsed * (1 - progress / 2);
      state.speed = coast.speed * (1 - progress);
      if (progress >= 1) {
        state.icon.style.transform = `rotate(${coast.end}deg)`;
        stopSpin(); return;
      }
    } else {
      const before = state.speed;
      const change = Math.max(-SPIN_ACCELERATION * dt, Math.min(SPIN_ACCELERATION * dt, state.targetSpeed - before));
      state.speed = Math.max(0, Math.min(SPIN_MAX_SPEED, before + change));
      state.angle += (before + state.speed) * dt / 2;
    }
    state.icon.style.transform = `rotate(${state.angle}deg)`;
    spinFrame = requestAnimationFrame(tickSpin);
  }

  function boostSpin(icon) {
    const now = performance.now();
    if (spinState?.icon !== icon) stopSpin();
    if (!spinState) {
      const angle = currentAngle(icon);
      spinState = {
        icon, angle, speed: 360, targetSpeed: SPIN_SPEED,
        tappedAt: now, frameAt: now, minimumEnd: angle + 360, coast: null,
        originalTransform: icon.style.getPropertyValue('transform'),
        originalPriority: icon.style.getPropertyPriority('transform')
      };
    } else {
      // Leave the visible angle and velocity intact, including if the tap
      // interrupts the coast. Only the target velocity and finish extend.
      spinState.coast = null;
      spinState.targetSpeed = Math.min(SPIN_MAX_SPEED, Math.max(SPIN_SPEED, spinState.targetSpeed, spinState.speed) + SPIN_BOOST);
      spinState.minimumEnd = spinState.angle + 360;
      spinState.tappedAt = now;
    }
    if (!spinFrame) spinFrame = requestAnimationFrame(tickSpin);
  }

  function play() {
    const icon = button.querySelector('img');
    // Sample the visible pose before cancelling so a repeat click continues
    // from the current angle/scale instead of jumping back to rest.
    const fromAngle = !continuousSpin && icon ? currentAngle(icon) : 0;
    const fromScale = currentScale(button);
    pressAnimation?.cancel();
    if (!continuousSpin) iconAnimation?.cancel();

    pressAnimation = track(button.animate([
      {transform: `scale(${fromScale})`, offset: 0, easing: 'cubic-bezier(.3,0,.5,1)'},
      {transform: 'scale(.96)', offset: .28, easing: 'cubic-bezier(.2,.7,.3,1)'},
      {transform: 'scale(1.025)', offset: .62, easing: 'ease-in-out'},
      {transform: 'scale(.997)', offset: .84, easing: 'ease-in-out'},
      {transform: 'scale(1)', offset: 1}
    ], {duration: 540, fill: 'none'}), animation => { if (pressAnimation === animation) pressAnimation = null; });

    if (icon) {
      if (continuousSpin) { boostSpin(icon); return; }
      // Land at a whole turn, with at least one complete rotation after a repeat.
      const end = Math.ceil(fromAngle / 360) * 360 + 360;
      iconAnimation = track(icon.animate([
        {transform: `rotate(${fromAngle}deg)`, offset: 0, easing: 'cubic-bezier(.45,0,.2,1)'},
        {transform: `rotate(${end + 14}deg)`, offset: .62, easing: 'ease-in-out'},
        {transform: `rotate(${end - 4}deg)`, offset: .82, easing: 'ease-in-out'},
        {transform: `rotate(${end + 1}deg)`, offset: .93, easing: 'ease-out'},
        {transform: `rotate(${end}deg)`, offset: 1}
      ], {duration: 820, fill: 'none'}), animation => { if (iconAnimation === animation) iconAnimation = null; });
    }
  }

  listen(button, 'click', event => {
    // Only real taps/clicks, plus the Space shortcut (it sets data-key-spin around its synthetic click).
    if ((!event.isTrusted && !button.hasAttribute('data-key-spin')) || button.disabled || button.getAttribute('aria-disabled') === 'true' || button.hasAttribute('data-feedback-pending')) return;
    if (reduced.matches || document.hidden) { cancel(); return; }
    play();
  }, {capture:true});
  listen(reduced, 'change', cancel);
  listen(dialog, 'v3-avatar-closing', cancel);
  listen(dialog, 'close', cancel);
  listen(window, 'pagehide', cancel);
  listen(document, 'visibilitychange', () => { if (document.hidden) cancel(); });

  return () => {
    cancel();
    cleanup.splice(0).forEach(remove => remove());
  };
}
