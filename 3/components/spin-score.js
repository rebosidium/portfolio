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
  const numberBox = document.createElement('div');  // reserves the room the digits grow into
  numberBox.className = 'v3-avatar-score__num';
  numberBox.append(number);
  score.append(numberBox, coins);
  actions.append(score);
  const spinButton = actions.querySelector('.v3-avatar-spin'), hideButton = actions.querySelector('.v3-avatar-hide');
  hideButton?.setAttribute('aria-label', 'Hide');
  if (hideButton) {
    // The viewer is scaled while the portrait opens and closes, and a transformed ancestor turns
    // `position: fixed` into "relative to the viewer" (the X would slide toward the avatar), so the
    // button lives directly in the dialog and fades with the viewer instead.
    dialog.append(hideButton);
    dialog.addEventListener('v3-avatar-closing', () => { hideButton.style.opacity = '0'; });
    // On phones the X sits exactly over the hamburger (same centre), so the close control is where the
    // menu control was; elsewhere it keeps its corner position.
    const placeHide = () => {
      const r = document.querySelector('.v3-menu-toggle')?.getBoundingClientRect();
      if (r && r.width && r.bottom > 0 && r.top < innerHeight) {
        hideButton.style.top = (r.top + r.height / 2 - 24) + 'px';
        hideButton.style.right = (document.documentElement.clientWidth - (r.left + r.width / 2) - 24) + 'px';
      } else { hideButton.style.top = ''; hideButton.style.right = ''; }
    };
    dialog.addEventListener('v3-avatar-opening', () => { hideButton.style.opacity = ''; placeHide(); });
    dialog.addEventListener('v3-avatar-opened', placeHide);
    addEventListener('resize', placeHide, {passive: true});
  }
  // Keep the score centred above Spin, with the same visual gap above the digits (down to the
  // bottom of the portrait art) as below them (down to Spin).
  const large = dialog.querySelector('[data-v3-avatar-large]');
  const ART_BOTTOM = .974;                                // the bust ends at 97.4% of the square portrait box
  const placeScore = () => {
    if (!spinButton || !spinButton.offsetWidth) return;
    score.style.left = (spinButton.offsetLeft + spinButton.offsetWidth / 2) + 'px';
    const fs = parseFloat(getComputedStyle(number).fontSize) || 40;
    const glyphTop = 0;                                     // the reserved box is the visual block (digits grow into it)
    const glyphHeight = Math.max(10, score.offsetHeight - 2);   // reserved digits + the COINS caption
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
    // The digits grow up to +40% (log scale, full size around 50 000 coins) inside their reserved box.
    const grow = Math.min(1, Math.log10(1 + total) / Math.log10(1 + 50000));
    number.style.setProperty('--k', (1 + .4 * grow).toFixed(3));
    score.toggleAttribute('data-empty', total === 0);
    placeScore();
  };
  show();

  // While the game is open the rest of the site is switched off: update polling stops and the
  // page's animations behind the portrait are paused (see spin-score.css); both resume on close.
  const root = document.documentElement;
  let gameOn = false;
  const gameState = on => {
    if (on === gameOn) return;
    gameOn = on;
    root.toggleAttribute('data-v3-game', on);
    document.dispatchEvent(new Event(on ? 'v3-game-pause' : 'v3-game-resume'));
  };
  dialog.addEventListener('v3-avatar-opening', () => gameState(true));
  dialog.addEventListener('v3-avatar-closed', () => gameState(false));
  if (dialog.open) gameState(true);

  // iOS Safari draws the glow around the numbers far denser than Chrome does, so it gets fewer and lighter ones.
  const IOS = !!(window.CSS && CSS.supports && CSS.supports('-webkit-touch-callout', 'none'));
  const MAX_FLYING = IOS ? 8 : 16;
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
    // A fan over the whole upper half: sideways left/right as before, diagonally and straight up too.
    const angle = -(Math.PI / 18 + Math.random() * Math.PI * 8 / 9);
    const reach = Math.abs(Math.sin(angle)) > .7 ? .8 : 1;            // steep shots travel a little less
    const dx = Math.cos(angle) * distance * reach, dy = Math.sin(angle) * distance * reach - 6;
    const grow = 1 + Math.min(.6, Math.log10(value) * .24) + Math.min(.1, strength / 400);   // 1 … ~1.7: big awards stay readable, not a wall
    const pop = grow * 1.12;
    el.animate([
      {transform: 'translate(-50%,-50%) scale(.35)', opacity: 1},
      {transform: `translate(calc(-50% + ${dx * .12}px),calc(-50% + ${dy * .12}px)) scale(${pop})`, opacity: 1, offset: .14},
      {transform: `translate(calc(-50% + ${dx * .6}px),calc(-50% + ${dy * .6}px)) scale(${grow})`, opacity: 1, offset: .72},
      {transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(${grow * .9})`, opacity: 0}
    ], {duration: 850 + strength * 12 + Math.random() * 160, easing: 'cubic-bezier(.2,.7,.3,1)'}).finished.then(() => { el.remove(); flying--; }, () => { el.remove(); flying--; });
    ring(target, x, y, value);
  };

  // A quick bright ring around the button on every click.
  let lastRing = 0;
  const ring = (target, x, y, value) => {
    const now = performance.now();
    if (reduced.matches) return;
    lastRing = now;
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
    if (combo >= 6 && Math.random() < .3) {            // fast tapping throws a second number that counts too
      const extra = tierFor(Math.max(0, combo - 6));
      total += extra; show();
      burst(spin, extra, combo * .6);
    }
  }, {passive: true});

  // ---- Spin preloader: a 3px ring around the button fills as the whole head finishes loading ----
  const canvas = dialog.querySelector('[data-v3-avatar-large] canvas');
  if (spinButton && canvas) {
    const NS = 'http://www.w3.org/2000/svg', GAP = 5, STROKE = 3;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'v3-avatar-spin__ring'); svg.setAttribute('aria-hidden', 'true');
    const track = document.createElementNS(NS, 'path'), fill = document.createElementNS(NS, 'path');
    track.setAttribute('class', 'v3-avatar-spin__track'); fill.setAttribute('class', 'v3-avatar-spin__fill');
    for (const p of [track, fill]) { p.setAttribute('pathLength', '1'); p.setAttribute('fill', 'none'); p.setAttribute('stroke-width', String(STROKE)); }
    const defs = document.createElementNS(NS, 'defs'), grad = document.createElementNS(NS, 'linearGradient');
    const gradId = 'v3-spin-ring-' + Math.random().toString(36).slice(2, 7);
    grad.setAttribute('id', gradId); grad.setAttribute('gradientUnits', 'userSpaceOnUse');
    for (const [offset, color] of [['0', '#9a5cff'], ['1', '#3d7bff']]) { const stop = document.createElementNS(NS, 'stop'); stop.setAttribute('offset', offset); stop.setAttribute('stop-color', color); grad.append(stop); }
    defs.append(grad); fill.setAttribute('stroke', `url(#${gradId})`);
    svg.append(defs, track, fill); spinButton.append(svg);
    // While the head loads, the button shows its percentage instead of the icon and "Spin".
    const pct = document.createElement('i');
    pct.className = 'v3-avatar-spin__pct'; pct.setAttribute('aria-hidden', 'true'); pct.textContent = '0%';
    spinButton.append(pct);
    let shown = 0, pctRaf = 0;
    const tickPct = () => {
      pctRaf = 0;
      shown += (progress * 100 - shown) * .16;
      if (Math.abs(progress * 100 - shown) < .5) shown = progress * 100;
      pct.textContent = Math.round(shown) + '%';
      if (shown !== progress * 100) pctRaf = requestAnimationFrame(tickPct);
    };
    let progress = 0, hideTimer = 0;
    const shape = () => {                       // a pill starting at top centre, clockwise
      const w = spinButton.offsetWidth + GAP * 2, h = spinButton.offsetHeight + GAP * 2, r = h / 2, o = STROKE / 2;
      svg.setAttribute('viewBox', `0 0 ${w + STROKE} ${h + STROKE}`);
      const d = `M ${w / 2 + o} ${o} H ${w - r + o} A ${r} ${r} 0 0 1 ${w - r + o} ${h + o} H ${r + o} A ${r} ${r} 0 0 1 ${r + o} ${o} Z`;
      track.setAttribute('d', d); fill.setAttribute('d', d);
      svg.style.inset = `${-(GAP + o)}px`;
      grad.setAttribute('x1', '0'); grad.setAttribute('x2', String(w + STROKE)); grad.setAttribute('y1', '0'); grad.setAttribute('y2', '0');
    };
    const paint = () => {
      fill.style.strokeDasharray = `${progress.toFixed(4)} 1`;
      fill.style.opacity = progress > .004 ? '1' : '0';           // no dot at the very start
      clearTimeout(hideTimer);
      if (progress >= 1) {
        svg.dataset.done = '';
        hideTimer = setTimeout(() => { delete spinButton.dataset.loading; svg.hidden = true; }, 600);   // 100% shows briefly, then icon + Spin fade in
      }
      else { delete svg.dataset.done; svg.hidden = false; spinButton.dataset.loading = ''; }
      if (!pctRaf) pctRaf = requestAnimationFrame(tickPct);
      dialog.toggleAttribute('data-head-loading', progress < 1);
    };
    const read = () => {
      const d = canvas.dataset, total = Number(d.totalBytes) || 0, got = Number(d.encodedBytes) || 0;
      const next = d.allReady === 'true' || dialog.dataset.preloaded === 'true' ? 1 : total ? Math.min(.98, got / total) : 0;
      if (next !== progress) { progress = Math.max(next, next === 1 ? 1 : 0); paint(); }   // restarts after a quality change
    };
    new ResizeObserver(shape).observe(spinButton); shape();
    new MutationObserver(read).observe(canvas, {attributes: true, attributeFilter: ['data-encoded-bytes', 'data-total-bytes', 'data-all-ready']});
    new MutationObserver(read).observe(dialog, {attributes: true, attributeFilter: ['data-preloaded', 'open']});
    read(); paint();
  }

  // ---- Desktop: Space spins too, with a short hint under the button -------------------------
  if (spinButton && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const hint = document.createElement('div');
    hint.className = 'v3-avatar-keyhint'; hint.setAttribute('aria-hidden', 'true');
    hint.innerHTML = 'Push the button or press <kbd>Space</kbd>';
    actions.append(hint);
    const placeHint = () => {
      hint.style.left = (spinButton.offsetLeft + spinButton.offsetWidth / 2) + 'px';
      hint.style.top = (spinButton.offsetTop + spinButton.offsetHeight + 14) + 'px';
    };
    new ResizeObserver(placeHint).observe(spinButton); placeHint();
    document.addEventListener('keydown', event => {
      if (event.code !== 'Space' || event.repeat || !dialog.open || dialog.hasAttribute('data-opening') || spinButton.disabled) return;
      if (document.activeElement === spinButton) return;      // a focused button already reacts to Space itself
      event.preventDefault();
      spinButton.click();
    });
  }
}
