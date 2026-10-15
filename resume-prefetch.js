(() => {
  'use strict';
  const root = document.documentElement;
  const connection = navigator.connection;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const urls = [...new Set([...document.querySelectorAll('a[data-background-prefetch]')]
    .map(link => link.href).filter(href => {
      const url = new URL(href);
      return url.origin === location.origin && url.pathname.endsWith('.pdf');
    }))];
  if (!urls.length) return;
  let fontsReady = false,idle = null,controller = null,retryTimer = null,attempts = 0;
  const done = new Set();
  const prepared = new Map();
  const maxBytes = 1024 * 1024;
  const status = value => {root.dataset.resumePrefetch = value;};
  status('waiting');

  function permitted() {
    return !document.hidden && navigator.onLine !== false && !connection?.saveData &&
      !['slow-2g','2g'].includes(connection?.effectiveType);
  }
  function portraitSafe() {
    if (reduced.matches) return true;
    const state = window.portraitPlayer?.loadingState;
    if (!state || state.error) return true;
    return (state.ready && state.allReady && state.quality === state.desiredQuality && state.activeDownloads === 0) ||
      (!state.loading && !state.ready && state.activeDownloads === 0);
  }
  function ready() {
    return permitted() && fontsReady && !!root.dataset.contentReadyAt && portraitSafe();
  }
  function cancelIdle() {
    if (idle === null) return;
    if (window.cancelIdleCallback) cancelIdleCallback(idle);
    else clearTimeout(idle);
    idle = null;
  }
  async function run() {
    idle = null;
    if (controller || !ready() || done.size === urls.length || attempts >= 2) return;
    const url = urls.find(url => !done.has(url));
    const active = new AbortController();
    controller = active;
    status('loading');
    root.dataset.resumePrefetchStartedAt = performance.now().toFixed(1);
    try {
      // Native browser downloads may bypass the HTTP cache. Keep this small
      // prepared PDF so a user click can save it without another HTTP request.
      const response = await fetch(url,{priority:'low',cache:'default',credentials:'same-origin',signal:active.signal});
      if (!response.ok || !response.headers.get('content-type')?.includes('application/pdf')) throw new Error('PDF unavailable');
      if (Number(response.headers.get('content-length')) > maxBytes) {attempts=2;throw new Error('PDF exceeds background budget');}
      const blob = await response.blob();
      if (blob.size > maxBytes) {attempts=2;throw new Error('PDF exceeds background budget');}
      // iOS Safari can preview an application/pdf Blob despite a[download].
      // Offer the same bytes as a file; the anchor still supplies the .pdf name.
      const file = new Blob([blob],{type:'application/octet-stream'});
      prepared.set(url,URL.createObjectURL(file));
      done.add(url);attempts = 0;
      root.dataset.resumePrefetchReadyAt = performance.now().toFixed(1);
      status(done.size === urls.length ? 'ready' : 'waiting');
    } catch (error) {
      if (error.name === 'AbortError') status('waiting');
      else {
        attempts++;
        status('error');
        if (attempts < 2) retryTimer = setTimeout(() => {retryTimer = null;check();},5000);
      }
    } finally {
      controller = null;
      if (done.size < urls.length && attempts === 0 && ready()) check();
    }
  }
  function check() {
    if (done.size === urls.length || attempts >= 2 || retryTimer) return;
    if (!ready()) {
      cancelIdle();controller?.abort();
      if (!controller) status(permitted() ? 'waiting' : 'paused');
      return;
    }
    if (controller || idle !== null) return;
    status('scheduled');
    idle = window.requestIdleCallback ? requestIdleCallback(run,{timeout:2000}) : setTimeout(run,500);
  }
  const observer = new MutationObserver(check);
  observer.observe(root,{attributes:true,attributeFilter:['data-content-ready-at']});
  window.portraitPlayer?.subscribeLoading(() => queueMicrotask(check));
  document.addEventListener('visibilitychange',check);
  window.addEventListener('online',check);
  window.addEventListener('offline',check);
  window.addEventListener('pageshow',check);
  window.addEventListener('pagehide',event => {
    cancelIdle();controller?.abort();
    if (!event.persisted) {prepared.forEach(url=>URL.revokeObjectURL(url));prepared.clear();}
  });
  connection?.addEventListener('change',check);
  reduced.addEventListener('change',check);
  document.addEventListener('pointerover',event => {
    if (!event.target.closest?.('a[data-background-prefetch]') || !ready()) return;
    cancelIdle();run();
  });
  document.addEventListener('focusin',event => {
    if (!event.target.closest?.('a[data-background-prefetch]') || !ready()) return;
    cancelIdle();run();
  });
  document.addEventListener('click',event => {
    const link = event.target.closest?.('a[data-background-prefetch]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = prepared.get(link.href);
    if (!url) return; // The ordinary HTTP download remains available immediately.
    event.preventDefault();
    const download = document.createElement('a');
    download.href = url;
    download.download = link.download || 'Dmitry-Rybalka-Resume-EN.pdf';
    download.hidden = true;
    document.body.append(download);download.click();download.remove();
  });
  Promise.resolve(document.fonts?.ready).then(() => {fontsReady = true;check();});
})();
