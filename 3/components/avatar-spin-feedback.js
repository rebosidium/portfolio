// Tactile Spin feedback: the icon turns once with a soft spring overshoot and
// the button presses in, then rebounds. WAAPI transform only, fill:none, so the
// stylesheet owns the resting state and nothing is written inline.
const reducedQuery = '(prefers-reduced-motion:reduce)';

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
  let iconAnimation = null, pressAnimation = null;
  const cleanup = [];
  const listen = (target, name, handler, options) => {
    if (!target) return;
    target.addEventListener(name, handler, options);
    cleanup.push(() => target.removeEventListener(name, handler, options));
  };

  function cancel() {
    iconAnimation?.cancel(); pressAnimation?.cancel();
    iconAnimation = pressAnimation = null;
  }
  function track(animation, clear) {
    // Cancellation rejects `finished`; consume it so no rejection is unhandled.
    animation.finished.then(() => clear(animation), () => {});
    return animation;
  }

  function play() {
    const icon = button.querySelector('img');
    // Sample the visible pose before cancelling so a repeat click continues
    // from the current angle/scale instead of jumping back to rest.
    const fromAngle = icon ? currentAngle(icon) : 0;
    const fromScale = currentScale(button);
    cancel();

    pressAnimation = track(button.animate([
      {transform: `scale(${fromScale})`, offset: 0, easing: 'cubic-bezier(.3,0,.5,1)'},
      {transform: 'scale(.96)', offset: .28, easing: 'cubic-bezier(.2,.7,.3,1)'},
      {transform: 'scale(1.025)', offset: .62, easing: 'ease-in-out'},
      {transform: 'scale(.997)', offset: .84, easing: 'ease-in-out'},
      {transform: 'scale(1)', offset: 1}
    ], {duration: 540, fill: 'none'}), animation => { if (pressAnimation === animation) pressAnimation = null; });

    if (icon) {
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
    if (!event.isTrusted || button.disabled || button.getAttribute('aria-disabled') === 'true') return;
    if (reduced.matches || document.hidden) { cancel(); return; }
    play();
  });
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
