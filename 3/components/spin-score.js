// Spin "hamster combat" (/4 test). Every Spin click scores points; clicking quickly builds a
// combo, so awards grow (+1, +2, +3, +5, +10, +20) and the "+N" bursts that fly sideways out of
// the button get bigger and travel further. The score survives closing the portrait.
const dialog = document.getElementById('v3-avatar-dialog');
const viewer = dialog?.querySelector('.v3-avatar-viewer');
const actions = dialog?.querySelector('.v3-avatar-actions');
if (dialog && viewer && actions) {
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  let total = 0;                                          // every visit starts from zero
  const format = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');   // 27 552, no commas
  const score = document.createElement('div');
  score.className = 'v3-avatar-score'; score.setAttribute('aria-hidden', 'true');
  const number = document.createElement('b');
  const coins = document.createElement('div');      // small caption right under the digits
  coins.className = 'v3-avatar-coins'; coins.textContent = 'COINS';
  score.append(number, coins);
  actions.append(score);
  const spinButton = actions.querySelector('.v3-avatar-spin'), hideButton = actions.querySelector('.v3-avatar-hide');
  hideButton?.setAttribute('aria-label', 'Hide');
  // Keep the score centred above Spin, with the same visual gap above the digits (down to the
  // bottom of the portrait art) as below them (down to Spin).
  const large = dialog.querySelector('[data-v3-avatar-large]');
  const ART_BOTTOM = .974;                                // the bust ends at 97.4% of the square portrait box
  const placeScore = () => {
    if (!spinButton || !spinButton.offsetWidth) return;
    score.style.left = (spinButton.offsetLeft + spinButton.offsetWidth / 2) + 'px';
    const fs = parseFloat(getComputedStyle(number).fontSize) || 40;
    const glyphTop = .16 * fs;                              // digits start this far inside the score box
    const glyphHeight = Math.max(10, score.offsetHeight - glyphTop - 2);   // digits + the COINS caption
    const spinTop = spinButton.getBoundingClientRect().top;
    const box = large?.getBoundingClientRect();
    const artBottom = box && box.height ? box.top + box.height * ART_BOTTOM : spinTop - glyphHeight - 28;
    const gap = Math.max(8, (spinTop - artBottom - glyphHeight) / 2);
    const top = artBottom + gap - glyphTop;                 // viewport y of the score box
    score.style.top = (top - actions.getBoundingClientRect().top) + 'px';
  };
  new ResizeObserver(placeScore).observe(actions);
  if (large) new ResizeObserver(placeScore).observe(large);
  addEventListener('resize', placeScore, {passive: true});
  if (spinButton) new ResizeObserver(placeScore).observe(spinButton);
  new MutationObserver(() => { placeScore(); setTimeout(placeScore, 350); setTimeout(placeScore, 1000); }).observe(dialog, {attributes: true, attributeFilter: ['open', 'data-opening']});
  const layer = document.createElement('div');
  layer.className = 'v3-avatar-fly'; layer.setAttribute('aria-hidden', 'true');
  viewer.append(layer);
  const show = () => {
    number.textContent = format(total);
    score.toggleAttribute('data-empty', total === 0);
    placeScore();
  };
  show();

  const MAX_FLYING = 30;
  let combo = 0, lastTap = 0, side = 1, flying = 0, coolTimer = 0, bumpTimer = 0;
  // Ready-made award sets (nothing is generated): the longer and faster you tap, the higher the
  // combo and the closer the numbers get to 1000.
  const POOLS = [
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15],                      // combo 0-2
    [14, 17, 21, 25, 29, 33, 38, 42, 47, 55],                      // 3-5
    [48, 62, 73, 86, 95, 110, 125, 140, 155, 170],                 // 6-9
    [150, 180, 210, 245, 280, 320, 360, 400, 440],                 // 10-14
    [380, 430, 480, 530, 580, 640, 700],                           // 15-21
    [650, 720, 780, 840, 890, 930],                                // 22-34
    [900, 930, 960, 980, 990, 999, 1000]                           // 35+
  ];
  const poolFor = c => c < 3 ? 0 : c < 6 ? 1 : c < 10 ? 2 : c < 15 ? 3 : c < 22 ? 4 : c < 35 ? 5 : 6;
  const tierFor = c => { const pool = POOLS[poolFor(c)]; return pool[Math.floor(Math.random() * pool.length)]; };
  const visualTier = value => value >= 300 ? 4 : value >= 50 ? 3 : value >= 10 ? 2 : 1;

  // The jokes live in a popover above the modal portrait; the bursts go in the same popover so
  // they stay on top of the falling jokes (viewport coordinates), else in a layer inside the dialog.
  const anchor = spin => {
    const r = spin.getBoundingClientRect(), host = document.querySelector('.v3-egg');
    if (host?.matches?.(':popover-open')) return {target: host, x: r.left + r.width / 2, y: r.top + r.height / 2};
    const box = viewer.getBoundingClientRect();
    return {target: layer, x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2};
  };

  const burst = (spin, value, strength) => {
    if (reduced.matches || flying >= MAX_FLYING) return;
    const {target, x, y} = anchor(spin);
    const el = document.createElement('span');
    el.className = 'v3-fly-num';
    el.textContent = '+' + value; el.dataset.tier = String(visualTier(value));
    el.style.left = x + 'px'; el.style.top = y + 'px';
    target.append(el); flying++;
    const wide = Math.min(innerWidth * .46, 560);
    const distance = Math.min(wide, 80 + strength * 10 + Math.random() * 60);
    const angle = (-.7 + Math.random() * 1.1) * (Math.PI / 4);        // mostly sideways, a little up
    const dx = Math.cos(angle) * distance * side, dy = Math.sin(angle) * distance - 12 - strength * 2.5;
    const grow = 1 + Math.min(1.7, Math.log10(value) * .55) + Math.min(.3, strength / 120);
    side = -side;
    const pop = grow * 1.25;
    el.animate([
      {transform: 'translate(-50%,-50%) scale(.35)', opacity: 1},
      {transform: `translate(calc(-50% + ${dx * .12}px),calc(-50% + ${dy * .12}px)) scale(${pop})`, opacity: 1, offset: .14},
      {transform: `translate(calc(-50% + ${dx * .6}px),calc(-50% + ${dy * .6}px)) scale(${grow})`, opacity: 1, offset: .72},
      {transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(${grow * .9})`, opacity: 0}
    ], {duration: 850 + strength * 12 + Math.random() * 160, easing: 'cubic-bezier(.2,.7,.3,1)'}).finished.then(() => { el.remove(); flying--; }, () => { el.remove(); flying--; });
    ring(target, x, y, value);
  };

  // A quick bright ring around the button on every click.
  const ring = (target, x, y, value) => {
    if (reduced.matches) return;
    const el = document.createElement('i');
    el.className = 'v3-fly-ring';
    el.dataset.tier = String(visualTier(value));
    el.style.left = x + 'px'; el.style.top = y + 'px';
    target.append(el);
    el.animate([{transform: 'translate(-50%,-50%) scale(.7)', opacity: .95}, {transform: 'translate(-50%,-50%) scale(1.9)', opacity: 0}], {duration: 420, easing: 'ease-out'}).finished.then(() => el.remove(), () => el.remove());
  };

  document.addEventListener('click', event => {
    const spin = event.target.closest?.('.v3-avatar-spin');
    if (!spin || spin.disabled) return;
    const now = performance.now();
    combo = now - lastTap < 650 ? Math.min(combo + 1, 60) : 0;
    lastTap = now;
    const value = tierFor(combo);
    total += value; show();
    clearTimeout(coolTimer); coolTimer = setTimeout(() => { combo = 0; }, 900);
    if (!reduced.matches) { score.dataset.bump = ''; clearTimeout(bumpTimer); bumpTimer = setTimeout(() => delete score.dataset.bump, 80); }
    burst(spin, value, combo);
    if (combo >= 6 && Math.random() < .5) {            // fast tapping throws a second number that counts too
      const extra = tierFor(Math.max(0, combo - 6));
      total += extra; show();
      burst(spin, extra, combo * .6);
    }
  }, {passive: true});
}
