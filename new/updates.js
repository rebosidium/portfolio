(() => {
  'use strict';

  const root = document.documentElement;
  const validVersion = value => typeof value === 'string' && /^[a-f0-9]{12}$/i.test(value);
  const build = root.dataset.build;
  if (!validVersion(build)) return;
  const currentVersion = build.toLowerCase();
  const cooldown = 120000;
  const initialCheckAt = Date.now() + 3000;
  const entryURL = new URL(window.location.href);
  const entryVersion = entryURL.searchParams.get('v');
  const entryRefresh = Number(entryURL.searchParams.get('_refresh'));
  const attempts = new Map();
  let checking = false;
  let reloading = false;
  let interval;

  // A matching build confirms the refreshed HTML arrived. Keep v for this visit.
  if (entryURL.searchParams.has('_refresh') && entryVersion === currentVersion) {
    entryURL.searchParams.delete('_refresh');
    try {
      window.history.replaceState(window.history.state, '', entryURL.href);
    } catch (_) {
      // URL cleanup is optional when history access is restricted.
    }
  }

  if (typeof window.fetch !== 'function' || typeof window.AbortController !== 'function') return;

  const withinCooldown = (timestamp, now) => Number.isFinite(timestamp)
    && timestamp > 0 && Math.abs(now - timestamp) < cooldown;

  function recentlyAttempted(version, now) {
    if (withinCooldown(attempts.get(version), now)) return true;
    // The URL also protects a stale HTML reload when sessionStorage is unavailable.
    if (entryVersion === version && withinCooldown(entryRefresh, now)) return true;
    try {
      return withinCooldown(Number(window.sessionStorage.getItem(`portfolio:update-at:${version}`)), now);
    } catch (_) {
      return false;
    }
  }

  function rememberRefresh(version, now) {
    attempts.set(version, now);
    try {
      window.sessionStorage.setItem(`portfolio:update-at:${version}`, String(now));
    } catch (_) {
      // In-memory and URL guards still work without storage access.
    }
  }

  async function checkVersion() {
    if (checking || reloading || document.hidden || navigator.onLine === false
      || Date.now() < initialCheckAt) return;
    checking = true;
    const controller = new window.AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const url = new URL('/new/version.json', window.location.origin);
      url.searchParams.set('_check', String(Date.now()));
      const response = await window.fetch(url.href, {
        cache: 'no-store',
        credentials: 'omit',
        priority: 'low',
        signal: controller.signal,
      });
      if (!response.ok) return;
      const manifest = await response.json();
      if (!manifest || !validVersion(manifest.version)) return;
      const version = manifest.version.toLowerCase();
      const now = Date.now();
      if (version === currentVersion || recentlyAttempted(version, now)) return;
      // Recheck visibility after the request so a background tab never refreshes.
      if (document.hidden || navigator.onLine === false) return;
      const destination = new URL(window.location.href);
      destination.searchParams.set('v', version);
      destination.searchParams.set('_refresh', String(now));
      rememberRefresh(version, now);
      reloading = true;
      window.location.replace(destination.href);
    } catch (_) {
      // Offline, timeout, malformed JSON, and navigation failures are non-fatal.
      reloading = false;
    } finally {
      window.clearTimeout(timeout);
      checking = false;
    }
  }

  function syncVisibility() {
    window.clearInterval(interval);
    if (document.hidden) return;
    interval = window.setInterval(checkVersion, 60000);
    checkVersion();
  }

  window.setTimeout(checkVersion, 3000);
  document.addEventListener('visibilitychange', syncVisibility);
  window.addEventListener('online', checkVersion);
  window.addEventListener('pageshow', syncVisibility);
  syncVisibility();
})();
