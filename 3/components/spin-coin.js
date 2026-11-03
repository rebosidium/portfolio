import {playCoinReturnEffect} from './spin-coin-return-effect.js';

export const COIN_TIERS = Object.freeze([
  {id: 'wood', label: 'Wood', minimum: 0},
  {id: 'cracker', label: 'Salt cracker', minimum: 50},
  {id: 'stone', label: 'Stone', minimum: 100},
  {id: 'lava', label: 'Lava', minimum: 500},
  {id: 'bronze', label: 'Bronze', minimum: 1000},
  {id: 'silver', label: 'Silver', minimum: 5000},
  {id: 'gold', label: 'Gold', minimum: 15000},
  {id: 'platinum', label: 'Platinum', minimum: 50000},
  {id: 'diamond', label: 'Diamond', minimum: 100000},
  {id: 'ruby', label: 'Ruby', minimum: 150000},
  {id: 'black-diamond', label: 'Black diamond', minimum: 175000},
  {id: 'emerald', label: 'Emerald', minimum: 187500},
  {id: 'holographic', label: 'Holographic', minimum: 200000},
  {id: 'button', label: 'Button', minimum: 250000},
  {id: 'soda', label: 'Riba Dima', minimum: 300000},
  {id: 'donut', label: 'Donut', minimum: 350000},
  {id: 'surstromming', label: 'Surströmming', minimum: 400000},
  {id: 'spam', label: 'SPAM', minimum: 425000},
  {id: 'trash', label: 'Trash lid', minimum: 450000},
  {id: 'ufo', label: 'UFO', minimum: 500000}
]);
export const coinTierFor = score => COIN_TIERS.findLast(tier => score >= tier.minimum) || COIN_TIERS[0];
export const coinImageURL = tier => `/3/assets/coins/${tier.id}.png`;

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
  const load = tier => {
    if (!cache.has(tier.id)) cache.set(tier.id, (async () => {
      const image = new Image(); image.src = coinImageURL(tier); image.alt = '';
      image.draggable = false; await image.decode(); return image;
    })().catch(error => { cache.delete(tier.id); throw error; }));
    return cache.get(tier.id);
  };
  const preloadNext = tier => {
    const next = COIN_TIERS[COIN_TIERS.indexOf(tier) + 1];
    if (next) load(next).catch(() => {});
  };
  const update = async (score, {celebrate = true} = {}) => {
    lastScore = score;
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
    const previous = host.querySelector('img:last-child');
    const previousTier = shown;
    const upgrade = shown && tier.minimum > shown.minimum;
    host.querySelectorAll('img').forEach(node => { if (node !== previous) node.remove(); });
    host.querySelector('svg')?.remove();
    host.append(image);
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
    host.dataset.upgrading = '';
    const rect = host.getBoundingClientRect();
    const portrait = host.closest('dialog')?.querySelector('[data-v3-avatar-large]')?.getBoundingClientRect();
    const x = portrait ? portrait.left + portrait.width / 2 : innerWidth / 2;
    const y = portrait ? portrait.top + portrait.height * .43 : innerHeight * .43;
    const size = Math.min(innerWidth * .9, innerHeight * .68, 700);
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
    const oldImage = (previous || image).cloneNode(), newImage = image.cloneNode();
    art.append(oldImage, newImage);
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
    // The material transforms at full size over the portrait's face, with
    // room for an unhurried sparkle before returning to the counter.
    const flight = art.animate([
      {transform:rest, offset:0, easing:'cubic-bezier(.18,.8,.24,1)'},
      {transform:'translate(0,0) scale(1.03) rotate(-6deg)', offset:.28, easing:'ease-in-out'},
      {transform:'translate(0,0) scale(1.07) rotate(5deg)', offset:.55, easing:'ease-in-out'},
      {transform:'translate(0,0) scale(1) rotate(0deg)', offset:.74, easing:'cubic-bezier(.6,0,.8,.3)'},
      {transform:rest, offset:1}
    ], {duration:2200, easing:'linear'});
    animation = flight;
    oldImage.animate([{opacity:1,offset:0},{opacity:1,offset:.4},{opacity:0,offset:.55},{opacity:0,offset:1}],{duration:2200,fill:'forwards'});
    newImage.animate([{opacity:0,offset:0},{opacity:0,offset:.4},{opacity:1,offset:.55},{opacity:1,offset:1}],{duration:2200});
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
