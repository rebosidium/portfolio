import {COIN_TIERS, coinTierFor, coinImageURL} from './spin-coin.js?v=245f55d91e23';

const mountedCollections = new WeakMap();
const MAX_ROW_COLUMNS = 10, FUTURE_SLOTS = 2;

export function mountCoinCollection({game, actions, shareButton, sheet}) {
  if (!game || !actions || !shareButton || !sheet) return () => {};
  mountedCollections.get(game)?.();
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  const portrait = game.querySelector('[data-v3-avatar-large]');
  let total = Number(game.dataset.coinTotal) || 0;
  let idleTimer = 0, clearFlight = () => {}, destroyed = false;
  const listeners = [];
  const listen = (target, type, listener, options) => {
    target?.addEventListener(type, listener, options);
    listeners.push(() => target?.removeEventListener(type, listener, options));
  };

  const collection = document.createElement('div');
  collection.className = 'v3-coin-collection'; collection.hidden = true;
  collection.setAttribute('role', 'group'); collection.setAttribute('aria-label', 'Coin collection');
  const rowColumns = Math.min(MAX_ROW_COLUMNS, COIN_TIERS.length + FUTURE_SLOTS);
  const rows = Array.from({length:Math.ceil((COIN_TIERS.length + FUTURE_SLOTS) / rowColumns)}, () => {
    const row = document.createElement('div'); row.className = 'v3-coin-collection__row'; return row;
  });
  collection.style.setProperty('--v3-collection-slot-size', `calc((100% - ${(rowColumns - 1) * 5}px) / ${rowColumns})`);
  const slots = COIN_TIERS.map((tier, index) => {
    const slot = document.createElement('button');
    slot.type = 'button'; slot.disabled = true;
    slot.className = 'v3-coin-collection__slot'; slot.dataset.tier = tier.id;
    slot.setAttribute('aria-label', `${tier.label}: not collected`);
    slot.title = `${tier.label}: not collected`;
    listen(slot, 'click', () => { if (!slot.disabled) { stopIdle(); shareButton.click(); } });
    rows[Math.floor(index / rowColumns)].append(slot);
    return slot;
  });
  // Future spaces belong only to the display, never to the earned tiers or
  // render loop. Even a completed collection leaves them empty and disabled.
  for (let index = 0; index < FUTURE_SLOTS; index++) {
    const slot = document.createElement('button'); slot.type = 'button'; slot.disabled = true;
    slot.className = 'v3-coin-collection__slot'; slot.dataset.future = '';
    slot.setAttribute('aria-label', `Future coin ${index + 1}: coming soon`);
    slot.title = 'Coming soon';
    rows[Math.floor((COIN_TIERS.length + index) / rowColumns)].append(slot);
  }
  collection.append(...rows); actions.append(collection);

  const place = () => {
    if (destroyed || collection.hidden || !game.open || !portrait) return;
    if (matchMedia('(orientation:landscape) and (max-height:520px)').matches) {
      collection.style.left = '50%'; collection.style.top = '0px'; return;
    }
    const art = portrait.getBoundingClientRect(), box = actions.getBoundingClientRect();
    collection.style.left = `${art.left + art.width / 2 - box.left}px`;
    collection.style.top = `${art.top + art.height * .974 + 42 - box.top}px`;
  };

  const stopIdle = () => {
    clearTimeout(idleTimer); idleTimer = 0; delete game.dataset.shareIdle;
  };
  const canPulse = () => !destroyed && game.open && !game.v3AvatarShell?.closing && coinTierFor(total).minimum > 0 && !sheet.open && !reduced.matches && !document.hidden;
  const resetIdle = () => {
    stopIdle();
    if (!canPulse()) return;
    idleTimer = setTimeout(() => {
      idleTimer = 0;
      if (canPulse()) game.dataset.shareIdle = '';
    }, 4000);
  };

  const render = () => {
    const currentIndex = COIN_TIERS.indexOf(coinTierFor(total));
    const visible = currentIndex > 0;
    collection.hidden = !visible;
    game.toggleAttribute('data-coin-collection', visible);
    slots.forEach((slot, index) => {
      const tier = COIN_TIERS[index];
      const filled = index < currentIndex || currentIndex === COIN_TIERS.length - 1;
      slot.toggleAttribute('data-filled', filled);
      slot.disabled = !filled;
      slot.setAttribute('aria-label', filled ? `${tier.label} collected coin, share result` : `${tier.label}: not collected`);
      slot.title = `${tier.label}: ${filled ? 'collected' : 'not collected'}`;
      if (filled && !slot.querySelector('img')) {
        const image = new Image(); image.alt = ''; image.draggable = false;
        image.src = coinImageURL(tier); slot.append(image);
      } else if (!filled) slot.replaceChildren();
    });
    place();
  };

  const flyPrevious = async ({previous, fromRect} = {}) => {
    clearFlight();
    const index = COIN_TIERS.findIndex(tier => tier.id === previous?.id);
    const slot = slots[index];
    if (!slot?.hasAttribute('data-filled') || reduced.matches || !game.open || sheet.open || !fromRect || ![fromRect.left, fromRect.top, fromRect.width, fromRect.height].every(Number.isFinite) || fromRect.width <= 0 || fromRect.height <= 0) return;
    const flight = document.createElement('img');
    flight.className = 'v3-coin-collection-flight'; flight.alt = ''; flight.draggable = false;
    flight.setAttribute('aria-hidden', 'true'); flight.src = coinImageURL(COIN_TIERS[index]);
    Object.assign(flight.style, {left:`${fromRect.left}px`, top:`${fromRect.top}px`, width:`${fromRect.width}px`, height:`${fromRect.height}px`});
    slot.dataset.flying = ''; game.append(flight);
    let cancelled = false, animation = null;
    const finish = () => {
      if (cancelled) return;
      cancelled = true; animation?.cancel(); flight.remove(); delete slot.dataset.flying;
      if (clearFlight === finish) clearFlight = () => {};
    };
    clearFlight = finish;
    try { await flight.decode(); } catch { finish(); return; }
    if (cancelled || destroyed || reduced.matches || !game.open || sheet.open) { finish(); return; }
    place();
    const target = (slot.querySelector('img') || slot).getBoundingClientRect();
    const dx = target.left + target.width / 2 - fromRect.left - fromRect.width / 2;
    const dy = target.top + target.height / 2 - fromRect.top - fromRect.height / 2;
    const sx = target.width / fromRect.width, sy = target.height / fromRect.height;
    animation = flight.animate([
      {transform:'translate(0,0) scale(1)', opacity:1, offset:0},
      {transform:`translate(${dx * .42}px,${dy * .2 - 25}px) scale(.86)`, opacity:1, offset:.35},
      {transform:`translate(${dx}px,${dy}px) scale(${sx},${sy})`, opacity:1, offset:.92},
      {transform:`translate(${dx}px,${dy}px) scale(${sx},${sy})`, opacity:0, offset:1}
    ], {duration:650, easing:'cubic-bezier(.22,.75,.3,1)', fill:'both'});
    animation.finished.then(finish, finish);
  };

  listen(game, 'v3-score-change', event => {
    total = Number(event.detail?.total) || 0; render(); resetIdle();
  });
  listen(game, 'v3-coin-promotion', event => {
    render(); resetIdle(); flyPrevious(event.detail);
  });
  listen(actions.querySelector('.v3-avatar-spin'), 'click', resetIdle, {capture:true});
  listen(shareButton, 'click', resetIdle, {capture:true});
  listen(game, 'v3-avatar-opening', () => { total = Number(game.dataset.coinTotal) || 0; render(); resetIdle(); });
  listen(game, 'v3-avatar-opened', () => { place(); resetIdle(); });
  listen(game, 'v3-avatar-closing', () => { stopIdle(); clearFlight(); });
  listen(game, 'close', () => { stopIdle(); clearFlight(); });
  listen(sheet, 'close', resetIdle);
  listen(reduced, 'change', () => { clearFlight(); resetIdle(); });
  listen(document, 'visibilitychange', () => { if (document.hidden) clearFlight(); resetIdle(); });
  listen(window, 'resize', () => { clearFlight(); place(); });
  const resize = new ResizeObserver(place); resize.observe(actions); if (portrait) resize.observe(portrait);
  const sheetObserver = new MutationObserver(() => { if (sheet.open) { stopIdle(); clearFlight(); } else resetIdle(); });
  sheetObserver.observe(sheet, {attributes:true, attributeFilter:['open']});
  render(); resetIdle();

  const cleanup = () => {
    if (destroyed) return;
    destroyed = true; stopIdle(); clearFlight(); resize.disconnect(); sheetObserver.disconnect();
    listeners.splice(0).forEach(remove => remove());
    collection.remove(); delete game.dataset.coinCollection;
    if (mountedCollections.get(game) === cleanup) mountedCollections.delete(game);
  };
  mountedCollections.set(game, cleanup);
  return cleanup;
}
