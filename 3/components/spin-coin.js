import {playCoinReturnEffect} from './spin-coin-return-effect.js?v=5eea94eeefc6';
import {coinImageURL,setCoinImageSource} from './spin-coin-assets.js?v=e0cf7ecde03d';
export {coinImageURL,setCoinImageSource};

// Regular playtest steps retain the owner's special 1000/67000 unlocks.
const TEST_COIN_STEP = 20000;

export const COIN_TIERS = Object.freeze([
  {id: 'wood', label: 'Wood', minimum: 1000},
  {id: 'cracker', label: 'Salt cracker', minimum: 10000},
  {id: 'stone', label: 'Stone', minimum: 40000},
  {id: 'amber', label: 'Amber mosquito', minimum: 50000},
  {id: 'six-seven', label: 'Six seven', minimum: 67000},
  {id: 'lava', label: 'Lava', minimum: 80000},
  {id: 'bronze', label: 'Bronze', minimum: 130000},
  {id: 'silver', label: 'Silver', minimum: 180000},
  {id: 'gold', label: 'Gold', minimum: 230000},
  {id: 'platinum', label: 'Platinum', minimum: 280000},
  {id: 'diamond', label: 'Diamond', minimum: 330000},
  {id: 'ruby', label: 'Ruby', minimum: 380000},
  {id: 'black-diamond', label: 'Black diamond', minimum: 430000},
  {id: 'emerald', label: 'Emerald', minimum: 480000},
  {id: 'holographic', label: 'Holographic', minimum: 530000},
  {id: 'button', label: 'Button', minimum: 580000},
  {id: 'soda', label: 'Riba Dima', minimum: 630000},
  {id: 'donut', label: 'Donut', minimum: 680000},
  {id: 'surstromming', label: 'Surströmming', minimum: 730000},
  {id: 'spam', label: 'SPAM', minimum: 780000},
  {id: 'trash', label: 'Trash lid', minimum: 830000},
  {id: 'ufo', label: 'UFO', minimum: 880000},
  {id: 'chest', label: 'Treasure chest', minimum: 980000}
].map((tier,index) => TEST_COIN_STEP && index && tier.id !== 'six-seven' ? {...tier,minimum:index * TEST_COIN_STEP} : tier));
export const coinTierFor = score => COIN_TIERS.findLast(tier => score >= tier.minimum) || COIN_TIERS[0];

export function createCoinProgression(host, reducedMotion) {
  let shown = null, requested = null, generation = 0, animation = null, overlay = null;
  let lastScore = 0, closing = false;
  const game = host.closest('dialog');
  let clearReturnEffect = () => {};
  const cache = new Map();
  const stopAnimations = () => {
    clearReturnEffect();
    clearReturnEffect = () => {};
    animation?.cancel();
    overlay?.getAnimations({subtree: true}).forEach(item => item.cancel());
    overlay?.remove(); overlay = null; animation = null; host.style.visibility = '';
    delete host.dataset.upgrading;
  };
  const load = (tier, cssSize = 48) => {
    const key = `${tier.id}:${cssSize}`;
    if (!cache.has(key)) cache.set(key, (async () => {
      const image = new Image(); image.alt = '';
      setCoinImageSource(image,tier,cssSize);
      image.draggable = false; await image.decode(); return image;
    })().catch(error => { cache.delete(key); throw error; }));
    const pending = cache.get(key);
    if (cache.size > 64) cache.delete(cache.keys().next().value);
    return pending;
  };
  const preloadNext = tier => {
    const next = COIN_TIERS[COIN_TIERS.indexOf(tier) + 1];
    if (next) load(next).catch(() => {});
  };
  const update = async (score, {celebrate = true} = {}) => {
    lastScore = score;
    if (score < COIN_TIERS[0].minimum) {
      ++generation; requested = null; shown = null;
      stopAnimations(); host.hidden = true; host.replaceChildren();
      delete host.dataset.tier; host.removeAttribute('title');
      return;
    }
    host.hidden = false;
    const tier = coinTierFor(score);
    if (requested === tier) return;
    requested = tier;
    const token = ++generation;
    const allowCelebration = celebrate && game?.open && !closing && !game.v3AvatarShell?.closing;
    let image;
    try { image = (await load(tier)).cloneNode(); }
    catch { if (token === generation) requested = null; return; }
    if (token !== generation) return;
    stopAnimations();
    const previousTier = shown;
    const upgrade = !shown || tier.minimum > shown.minimum;
    host.replaceChildren(image);
    host.dataset.tier = tier.id; host.title = `${tier.label} coin`;
    shown = tier; preloadNext(tier);
    if (upgrade && allowCelebration && game?.open && !closing && !game.v3AvatarShell?.closing) {
      const from = host.getBoundingClientRect();
      game.dispatchEvent(new CustomEvent('v3-coin-promotion', {detail:{previous:previousTier,tier,fromRect:{left:from.left,top:from.top,width:from.width,height:from.height}}}));
    }
    if (!upgrade || !allowCelebration || !game?.open || closing || game.v3AvatarShell?.closing || reducedMotion.matches) {
      host.replaceChildren(image); delete host.dataset.upgrading;
      if (upgrade && allowCelebration && game?.open && !closing && !game.v3AvatarShell?.closing) document.dispatchEvent(new CustomEvent('v3-coin-level', {detail: {tier}}));
      return;
    }
    const promotionSize = () => Math.min(innerWidth * .9, innerHeight * .68, 700);
    let size;
    // Celebrate only the newly earned material, including the first wood
    // coin. Never enlarge or crossfade the previous tier.
    let newImage;
    try {
      do {
        size = promotionSize();
        const large = await load(tier,Math.ceil(size * 1.07));
        if (token !== generation || !game?.open || closing || game.v3AvatarShell?.closing || reducedMotion.matches) break;
        newImage = large.cloneNode();
      } while (size !== promotionSize());
    } catch {
      if (token === generation && game?.open && !closing && !game.v3AvatarShell?.closing) document.dispatchEvent(new CustomEvent('v3-coin-level', {detail:{tier}}));
      return;
    }
    if (token !== generation) return;
    if (!game?.open || closing || game.v3AvatarShell?.closing || reducedMotion.matches) {
      if (game?.open && !closing && !game.v3AvatarShell?.closing) document.dispatchEvent(new CustomEvent('v3-coin-level', {detail:{tier}}));
      return;
    }
    host.dataset.upgrading = '';
    const rect = host.getBoundingClientRect();
    const portrait = host.closest('dialog')?.querySelector('[data-v3-avatar-large]')?.getBoundingClientRect();
    const x = portrait ? portrait.left + portrait.width / 2 : innerWidth / 2;
    const y = portrait ? portrait.top + portrait.height * .43 : innerHeight * .43;
    const dx = rect.left + rect.width / 2 - x, dy = rect.top + rect.height / 2 - y;
    const rest = `translate(${dx}px,${dy}px) scale(${rect.width / size})`;
    const stage = document.createElement('div');
    stage.className = 'v3-coin-upgrade'; stage.setAttribute('aria-hidden', 'true');
    stage.dataset.tier = tier.id;
    if ('popover' in stage) stage.popover = 'manual';
    const art = document.createElement('div'); art.className = 'v3-coin-upgrade__art';
    Object.assign(art.style, {width:`${size}px`,height:`${size}px`,left:`${x-size/2}px`,top:`${y-size/2}px`});
    const rays = document.createElement('div'); rays.className = 'v3-coin-upgrade__rays'; art.append(rays);
    const aura = document.createElement('div'); aura.className = 'v3-coin-upgrade__aura'; art.append(aura);
    art.append(newImage);
    for (let i = 0; i < 8; i++) {
      const spark = document.createElement('i'); spark.className = 'v3-coin-upgrade__spark';
      const angle = i * Math.PI / 4;
      spark.style.left = `${50 + Math.cos(angle) * 45}%`; spark.style.top = `${50 + Math.sin(angle) * 45}%`;
      spark.style.width = `${i % 2 ? 20 : 32}px`; spark.style.animationDelay = `${i * 45 + 380}ms`;
      art.append(spark);
    }
    stage.append(art); document.body.append(stage);
    try { if (stage.popover === 'manual') stage.showPopover(); } catch { /* Native dialog descendant fallback below. */ }
    if (!stage.matches(':popover-open')) host.closest('dialog')?.append(stage);
    overlay = stage; host.style.visibility = 'hidden';
    // The new material celebrates over the portrait, then returns to its counter.
    const flight = art.animate([
      {transform:rest, offset:0, easing:'cubic-bezier(.18,.8,.24,1)'},
      {transform:'translate(0,0) scale(1.03) rotate(-6deg)', offset:.28, easing:'ease-in-out'},
      {transform:'translate(0,0) scale(1.07) rotate(5deg)', offset:.55, easing:'ease-in-out'},
      {transform:'translate(0,0) scale(1) rotate(0deg)', offset:.74, easing:'cubic-bezier(.6,0,.8,.3)'},
      {transform:rest, offset:1}
    ], {duration:2200, easing:'linear'});
    animation = flight;
    try { await flight.finished; } catch { /* Closing or a newer upgrade took over. */ }
    // Always remove this call's stage, even if a newer image is still loading
    // or failed. Only the owner of the active stage may restore shared state.
    const ownsStage = overlay === stage;
    stage.getAnimations({subtree:true}).forEach(item => item.cancel());
    stage.remove();
    if (ownsStage) {
      overlay = null; animation = null; host.style.visibility = '';
      host.replaceChildren(image); delete host.dataset.upgrading;
    }
    if (token !== generation) return;
    if (game?.open && !closing && !game.v3AvatarShell?.closing) {
      clearReturnEffect = playCoinReturnEffect(host,tier,reducedMotion);
      document.dispatchEvent(new CustomEvent('v3-coin-level', {detail:{tier}}));
    }
  };
  reducedMotion.addEventListener('change', () => {
    if (!reducedMotion.matches || !animation) return;
    overlay?.getAnimations({subtree:true}).forEach(item => item.finish());
    animation.finish();
  });
  // Settle a promotion before a rotated/resized viewport can clip its old
  // geometry. Native srcset updates the counter and subsequent promotions.
  window.addEventListener('resize', () => {
    if (!animation) return;
    overlay?.getAnimations({subtree:true}).forEach(item => item.finish());
    animation.finish();
  });
  game?.addEventListener('v3-avatar-closing', () => {
    closing = true; ++generation; requested = null;
    stopAnimations();
    const currentImage = host.querySelector('img:last-child');
    if (currentImage) host.replaceChildren(currentImage);
  });
  game?.addEventListener('v3-avatar-opening', () => {
    closing = false; requested = null;
    // Reopening restores the latest earned material without replaying a
    // celebration that was interrupted or waiting for an image at close.
    update(lastScore, {celebrate:false});
  });
  return {update};
}
