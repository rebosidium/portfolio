// Loading state for the large portrait: the already-loaded start poster is
// split into square tiles that surface in a soft centre-out order. It mirrors
// loader.hidden only; it never reports progress or delays the player.
const GRID = 6;

export function mountPortraitLoader(stage, loader) {
  const img = stage?.querySelector('img');
  // Without WAAPI the existing static poster remains unchanged.
  if (!img || !loader || typeof stage.animate !== 'function') return () => {};
  const dialog = stage.closest('dialog');
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  let mosaic = null, tiles = [], animations = [], fade = null, showing = false;
  const cleanup = [];
  const listen = (target, name, handler) => {
    target.addEventListener(name, handler);
    cleanup.push(() => target.removeEventListener(name, handler));
  };

  function build() {
    if (mosaic) return;
    mosaic = document.createElement('div');
    mosaic.className = 'v3-avatar-mosaic';mosaic.hidden = true;mosaic.setAttribute('aria-hidden', 'true');
    mosaic.style.setProperty('--v3-mosaic-grid', String(GRID));
    const centre = (GRID - 1) / 2, reach = Math.hypot(centre, centre);
    for (let row = 0; row < GRID; row++) for (let column = 0; column < GRID; column++) {
      const tile = document.createElement('span');
      tile.className = 'v3-avatar-mosaic__tile';
      tile.style.backgroundPosition = `${column * 100 / (GRID - 1)}% ${row * 100 / (GRID - 1)}%`;
      // Centre-out with a stable pseudo-random jitter, so the face forms first.
      const jitter = ((row * 7 + column * 13) % 11) / 10;
      tiles.push({tile, order: Math.hypot(row - centre, column - centre) / reach * .75 + jitter * .25});
      mosaic.append(tile);
    }
    stage.insertBefore(mosaic, loader);
  }
  // Quality upgrades retain a drawn pose; never replace it with the first poster.
  const wanted = () => !stage.classList.contains('portrait-rendered') && !loader.hidden && (!dialog || dialog.open && !dialog.v3AvatarShell?.closing) && !document.hidden && !reduced.matches;
  const posterReady = () => img.complete && img.naturalWidth > 0;

  function stopAnimations() {
    animations.forEach(animation => animation.cancel());animations = [];
    fade?.cancel();fade = null;
  }
  function clear() {
    stopAnimations();showing = false;
    delete stage.dataset.v3Mosaic;
    if (mosaic) mosaic.hidden = true;
  }
  function show() {
    // Wait for the poster's own request; never start a second image download.
    if (showing || !posterReady()) return;
    build();stopAnimations();showing = true;
    mosaic.style.setProperty('--v3-mosaic-image', `url(${JSON.stringify(img.currentSrc || img.src)})`);
    mosaic.hidden = false;stage.dataset.v3Mosaic = '';
    const batch = animations;
    for (const {tile, order} of tiles) {
      const reveal = tile.animate([
        {opacity: 0, transform: 'scale(.8)'},
        {opacity: 1, transform: 'scale(.965)'}
      ], {duration: 560, delay: order * 900, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both'});
      batch.push(reveal);
      // Independent random blink rhythms: fade away, then snap back. This is
      // activity, not simulated progress. Keep a single live effect per tile.
      reveal.finished.then(() => {
        if (!showing || animations !== batch) return;
        tile.style.opacity = '1';tile.style.transform = 'scale(.965)';
        const frames = [{opacity: 1, offset: 0}];
        for (let pulse = 0; pulse < 3; pulse++) {
          const at = .04 + pulse * .31 + Math.random() * .13;
          frames.push({opacity: 1, offset: at},
            {opacity: 0, offset: at + .035},
            {opacity: 0, offset: at + .075, easing: 'steps(1,end)'},
            {opacity: 1, offset: at + .08});
        }
        frames.push({opacity: 1, offset: 1});
        const blink = tile.animate(frames, {
          duration: 2800 + Math.random() * 1800, delay: Math.random() * 700,
          iterations: Infinity, easing: 'linear', fill: 'both'
        });
        batch[batch.indexOf(reveal)] = blink;reveal.cancel();
      }, () => {});
    }
  }
  function dismiss() {
    // Reveal the real portrait underneath first, then dissolve the copy above it.
    showing = false;delete stage.dataset.v3Mosaic;
    const animation = mosaic.animate([{opacity: 1}, {opacity: 0}], {duration: 220, easing: 'ease-out', fill: 'forwards'});
    fade = animation;
    animation.finished.then(() => {
      if (fade !== animation) return;
      fade = null;clear();animation.cancel();
    }, () => {});
  }
  function sync() {
    if (wanted()) show();
    else if (showing && loader.hidden && (!dialog || dialog.open) && !document.hidden && !reduced.matches) dismiss();
    else if (showing || fade) clear();
  }

  const observer = new MutationObserver(sync);
  observer.observe(loader, {attributes: true, attributeFilter: ['hidden']});
  cleanup.push(() => observer.disconnect());
  listen(img, 'load', sync);
  if (dialog) {
    listen(dialog, 'v3-avatar-opening', sync);
    listen(dialog, 'v3-avatar-closing', clear);
    listen(dialog, 'close', clear);
  }
  listen(document, 'visibilitychange', sync);
  listen(reduced, 'change', sync);
  listen(window, 'pagehide', clear);
  sync();

  return () => {
    clear();
    cleanup.splice(0).forEach(remove => remove());
    mosaic?.remove();mosaic = null;tiles = [];
  };
}
