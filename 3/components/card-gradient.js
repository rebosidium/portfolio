// Moving light field for the case covers: four soft colour blobs per cover,
// animated by CSS transform keyframes only (no canvas, WebGPU, RAF or scroll
// listeners). This module only builds the layers once and toggles pause
// attributes; the compositor runs and holds every animation phase.
const KEY = Symbol.for('v3.cardGradients');
const BLOBS = ['coral', 'yellow', 'purple', 'teal'];

export function mountCardGradients(section) {
  if (!section) return () => {};
  // Idempotent across module instances (e.g. different ?v= cache keys).
  if (section[KEY]) return section[KEY].destroy;

  const covers = [...section.querySelectorAll('.v3-case-cover')];
  const built = [];
  covers.forEach((cover, index) => {
    if (cover.querySelector(':scope > .v3-case-gradient')) return;
    const field = document.createElement('div');
    field.className = 'v3-case-gradient';
    field.setAttribute('aria-hidden', 'true');
    for (const name of BLOBS) {
      const blob = document.createElement('span');
      blob.className = `v3-case-gradient__blob v3-case-gradient__blob--${name}`;
      field.append(blob);
    }
    // Small per-card variation, written once: tempo and starting phase.
    cover.style.setProperty('--v3-gradient-speed', String(1 + (index % 3) * .09));
    cover.style.setProperty('--v3-gradient-phase', String(index * 2.3));
    cover.prepend(field);
    built.push({cover, field});
  });

  // Animations stay paused by default; only covers near the viewport run.
  const visibility = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver(entries => {
      for (const entry of entries) entry.target.toggleAttribute('data-gradient-visible', entry.isIntersecting);
    }, {rootMargin: '120px 0px'})
    : null;
  for (const {cover} of built) visibility?.observe(cover);

  // Global pause: hidden document, page in BFCache/unload, or any open dialog.
  let pageActive = true;
  const sync = () => {
    const paused = !pageActive || document.hidden || !!document.querySelector('dialog[open]');
    if (section.hasAttribute('data-gradient-paused') !== paused) section.toggleAttribute('data-gradient-paused', paused);
  };
  const onPageHide = () => { pageActive = false; sync(); };
  const onPageShow = () => { pageActive = true; sync(); };
  document.addEventListener('visibilitychange', sync);
  addEventListener('pagehide', onPageHide);
  addEventListener('pageshow', onPageShow);
  const dialogs = new MutationObserver(sync);
  dialogs.observe(document.documentElement, {attributes: true, attributeFilter: ['open'], subtree: true});
  sync();

  function destroy() {
    if (section[KEY]?.destroy !== destroy) return;
    visibility?.disconnect();
    dialogs.disconnect();
    document.removeEventListener('visibilitychange', sync);
    removeEventListener('pagehide', onPageHide);
    removeEventListener('pageshow', onPageShow);
    for (const {cover, field} of built) {
      field.remove();
      cover.removeAttribute('data-gradient-visible');
      cover.style.removeProperty('--v3-gradient-speed');
      cover.style.removeProperty('--v3-gradient-phase');
    }
    section.removeAttribute('data-gradient-paused');
    delete section[KEY];
  }
  section[KEY] = {destroy};
  return destroy;
}
