(() => {
  // The shared PDF prefetcher can proceed as soon as this static page is ready.
  document.documentElement.dataset.contentReadyAt=performance.now().toFixed(1);
})();
