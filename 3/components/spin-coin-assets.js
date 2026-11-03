// Immutable WebP94 exports; the original PNGs remain archived separately.
export const COIN_IMAGE_WIDTHS = Object.freeze([32,48,64,96,144,320,440,640,800,1024,1254]);
const root = '/3/assets/coins/webp94-v1';
export function coinImageWidth(cssSize = 48, dpr = globalThis.devicePixelRatio || 1) {
  const required = Math.max(1, Number(cssSize) || 48) * Math.max(1, Number(dpr) || 1);
  return COIN_IMAGE_WIDTHS.find(width => width >= required) || COIN_IMAGE_WIDTHS.at(-1);
}
export const coinImageURL = (tier, cssSize = 48, dpr = globalThis.devicePixelRatio || 1) => `${root}/${coinImageWidth(cssSize,dpr)}/${tier.id}.webp`;
export function setCoinImageSource(image, tier, cssSize = 48) {
  // Set source selection before src to avoid a redundant fallback request.
  // Native sizes/srcset also track fractional DPR, zoom and display changes.
  image.sizes = `${cssSize}px`;
  image.srcset = COIN_IMAGE_WIDTHS.map(width => `${root}/${width}/${tier.id}.webp ${width}w`).join(', ');
  image.src = coinImageURL(tier,cssSize);
  return image;
}
