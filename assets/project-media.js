(() => {
  'use strict';
  const pending = new WeakMap();
  function load(artwork) {
    if (pending.has(artwork)) return pending.get(artwork);
    const image = artwork.querySelector('.work-image');
    const error = artwork.querySelector('.work-image-error');
    if (!image) return Promise.resolve();
    artwork.dataset.imageState = 'loading';
    const loaded = new Promise((resolve,reject) => {
      const clear = () => {image.removeEventListener('load',onLoad);image.removeEventListener('error',onError);};
      const onLoad = () => {clear();resolve();};
      const onError = () => {clear();reject(new Error('Work preview unavailable'));};
      image.addEventListener('load',onLoad);image.addEventListener('error',onError);
      if (image.dataset.srcset) image.srcset = image.dataset.srcset;
      if (image.dataset.src) image.src = image.dataset.src;
      if (image.complete && image.naturalWidth > 0) onLoad();
      else if (image.complete && (image.currentSrc || image.getAttribute('src'))) onError();
    });
    // Decode after load: WebKit can reject an early decode of a lazy image.
    const ready = loaded.then(() => image.decode?.().catch(failure => {if (!image.naturalWidth) throw failure;}))
      .then(() => {
        artwork.dataset.imageState = 'ready';artwork.classList.remove('image-failed');
        if (error) error.hidden = true;
      },failure => {
        artwork.dataset.imageState = 'failed';artwork.classList.add('image-failed');
        if (error) error.hidden = false;
        throw failure;
      });
    pending.set(artwork,ready);return ready;
  }
  window.PortfolioProjectMedia = {load};
  // HOME chooses request timing itself; reading pages own only their cards.
  document.querySelectorAll('.article-work .work-artwork,[data-project-media-auto] .work-artwork').forEach(artwork => {load(artwork).catch(() => {});});
})();
