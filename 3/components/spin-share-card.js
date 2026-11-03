import {coinTierFor, coinImageURL} from './spin-coin.js?v=592abb30f938';

export const SHARE_CARD_WIDTH = 1200;
export const SHARE_CARD_HEIGHT = 627;

export async function createShareCard({score}) {
  if (!Number.isSafeInteger(score) || score < 0) throw new TypeError('Invalid score');
  const canvas = document.createElement('canvas');
  canvas.width = SHARE_CARD_WIDTH; canvas.height = SHARE_CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  // Use a nonbreaking separator: the existing Montserrat subset includes it.
  const digits = String(score).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
  const tier = coinTierFor(score);
  await Promise.all([
    document.fonts.load(`900 130px "Montserrat"`, digits).catch(() => {}),
    document.fonts.load('700 25px "DM Sans"', tier.label).catch(() => {}),
    document.fonts.load('500 30px "DM Sans"').catch(() => {})
  ]);
  const background = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  background.addColorStop(0, '#18151e'); background.addColorStop(1, '#30223e');
  ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#b3a0c5'; ctx.font = '700 18px "DM Sans", sans-serif';
  ctx.fillText('S P I N   D E S I G N E R', 66, 82);
  ctx.fillStyle = '#d6bbf3'; ctx.font = '700 25px "DM Sans", sans-serif';
  ctx.fillText(tier.label, 66, 179);
  let size = 130;
  do {
    ctx.font = `900 ${size}px "Montserrat", sans-serif`;
    if (ctx.measureText(digits).width <= 650) break;
    size -= 2;
  } while (size > 24);
  ctx.font = `900 ${size}px "Montserrat", sans-serif`;
  // Keep even Number.MAX_SAFE_INTEGER inside the left text column.
  const width = ctx.measureText(digits).width;
  if (width > 650) ctx.font = `900 ${size * 650 / width}px "Montserrat", sans-serif`;
  ctx.fillStyle = '#fbf7ff'; ctx.fillText(digits, 60, 316);
  ctx.font = '700 22px "DM Sans", sans-serif'; ctx.fillStyle = '#b3a0c5';
  ctx.fillText('C O I N S', 66, 364);
  try {
    const coin = new Image(); coin.src = coinImageURL(tier); await coin.decode();
    ctx.drawImage(coin, 730, 83, 440, 440);
  } catch { /* The numeric score remains usable without its optional icon. */ }
  ctx.font = '500 30px "DM Sans", sans-serif'; ctx.fillStyle = '#e2d6ee';
  ctx.fillText('Can you beat my score?', 66, 445);
  ctx.fillStyle = '#b3a0c5'; ctx.font = '500 21px "DM Sans", sans-serif';
  ctx.fillText('dmitryrybalka.com/3', 66, 554);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG export failed')), 'image/png'));
}
