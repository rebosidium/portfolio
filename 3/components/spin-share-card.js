import {coinTierFor, coinImageURL} from './spin-coin.js';

export const SHARE_CARD_WIDTH = 1200;
export const SHARE_CARD_HEIGHT = 627;

export async function createShareCard({score, portraitUrl = '/3/assets/portrait-front-dark.webp'}) {
  if (!Number.isSafeInteger(score) || score < 0) throw new TypeError('Invalid score');
  const canvas = document.createElement('canvas');
  canvas.width = SHARE_CARD_WIDTH; canvas.height = SHARE_CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  // Use a nonbreaking separator: the existing Montserrat subset includes it.
  const digits = String(score).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
  await Promise.all([
    document.fonts.load(`900 128px "Montserrat"`, digits).catch(() => {}),
    document.fonts.load('500 26px "DM Sans"').catch(() => {})
  ]);
  const background = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  background.addColorStop(0, '#eee3fb'); background.addColorStop(.5, '#faf9fc'); background.addColorStop(1, '#d9f6ef');
  ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#797182'; ctx.font = '700 18px "DM Sans", sans-serif';
  ctx.fillText('S P I N   C H A L L E N G E', 66, 82);
  let size = 130;
  do { ctx.font = `900 ${size}px "Montserrat", sans-serif`; if (ctx.measureText(digits).width <= 655) break; size -= 2; } while (size > 30);
  ctx.fillStyle = '#17141c'; ctx.fillText(digits, 60, 272);
  ctx.font = '700 22px "DM Sans", sans-serif'; ctx.fillStyle = '#72677e';
  ctx.fillText('C O I N S', 148, 338);
  try {
    const coin = new Image(); coin.src = coinImageURL(coinTierFor(score)); await coin.decode();
    ctx.drawImage(coin, 60, 287, 78, 78);
  } catch { /* The numeric score remains usable without its optional icon. */ }
  ctx.font = '500 35px "DM Sans", sans-serif'; ctx.fillStyle = '#292231';
  ctx.fillText('Can you beat my score?', 64, 418);
  ctx.fillStyle = '#6f647c'; ctx.font = '500 21px "DM Sans", sans-serif';
  ctx.fillText('Dmitry Rybalka · Designer portfolio', 66, 554);
  ctx.beginPath(); ctx.arc(952, 283, 169, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
  try {
    const image = new Image(); image.src = portraitUrl;
    await image.decode();
    ctx.save(); ctx.beginPath(); ctx.arc(952, 283, 169, 0, Math.PI * 2); ctx.clip();
    // The source is a square portrait on white. Cropping inside the aperture
    // retains the existing portrait treatment rather than drawing a square.
    ctx.drawImage(image, 747, 118, 410, 410); ctx.restore();
  } catch { /* The score card still works when the optional portrait fails. */ }
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG export failed')), 'image/png'));
}
