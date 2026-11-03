import {COIN_TIERS, coinTierFor, coinImageURL} from './spin-coin.js?v=da6b4412d4e6';

export const SHARE_CARD_WIDTH = 1200;
export const SHARE_CARD_HEIGHT = 627;

export async function createShareCard({score}) {
  if (!Number.isSafeInteger(score) || score < 0) throw new TypeError('Invalid score');
  const canvas = document.createElement('canvas');
  canvas.width = SHARE_CARD_WIDTH; canvas.height = SHARE_CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  // Keep the site typeface and a nonbreaking thousands separator in the PNG.
  const digits = String(score).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
  const tier = score >= COIN_TIERS[0].minimum ? coinTierFor(score) : null;
  await Promise.all([
    document.fonts.load(`800 130px "DM Sans"`, digits).catch(() => {}),
    document.fonts.load('700 25px "DM Sans"', tier?.label || '').catch(() => {}),
    document.fonts.load('500 30px "DM Sans"').catch(() => {})
  ]);
  const background = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  background.addColorStop(0, '#242424'); background.addColorStop(1, '#141414');
  ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#d6d6d6'; ctx.font = '700 25px "DM Sans", sans-serif';
  if (tier) ctx.fillText(tier.label, 66, 155);
  let size = 130;
  do {
    ctx.font = `800 ${size}px "DM Sans", sans-serif`;
    if (ctx.measureText(digits).width <= 650) break;
    size -= 2;
  } while (size > 24);
  ctx.font = `800 ${size}px "DM Sans", sans-serif`;
  // Keep even Number.MAX_SAFE_INTEGER inside the left text column.
  const width = ctx.measureText(digits).width;
  if (width > 650) ctx.font = `800 ${size * 650 / width}px "DM Sans", sans-serif`;
  ctx.fillStyle = '#f3f3f3'; ctx.fillText(digits, 60, 316);
  ctx.font = '700 22px "DM Sans", sans-serif'; ctx.fillStyle = '#aaa';
  ctx.fillText('coins', 66, 364);
  try { if (tier) {
    // Fixed canvas output pixels are independent of the viewer's screen DPR.
    const coin = new Image(); coin.src = coinImageURL(tier,440,1); await coin.decode();
    ctx.drawImage(coin, 730, 83, 440, 440);
  } } catch { /* The numeric score remains usable without its optional icon. */ }
  ctx.font = '500 30px "DM Sans", sans-serif'; ctx.fillStyle = '#ddd';
  ctx.fillText('Can you beat my score?', 66, 445);
  ctx.fillStyle = '#aaa'; ctx.font = '500 21px "DM Sans", sans-serif';
  ctx.fillText('dmitryrybalka.com/3', 66, 554);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG export failed')), 'image/png'));
}
