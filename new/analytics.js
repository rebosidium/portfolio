(() => {
  'use strict';
  // Optional observer: never participates in the page's startup promises.
  if (!['dmitryrybalka.com', 'www.dmitryrybalka.com'].includes(location.hostname)
    || !/^\/new(?:\/|$)/.test(location.pathname)) return;
  const posthogActive = typeof posthogTrackingEnabled !== 'undefined' && posthogTrackingEnabled
    && typeof window.posthog?.capture === 'function';
  const clarityActive = typeof clarityTrackingEnabled !== 'undefined' && clarityTrackingEnabled
    && typeof window.clarity === 'function';
  if (!posthogActive && !clarityActive) return;

  const mobile = window.mobileLayout || matchMedia('(max-width: 1023px) and (pointer: coarse)');
  const qa = new URLSearchParams(location.search).get('analytics_test') === '1';
  const context = () => ({layout: mobile.matches ? 'mobile' : 'desktop',
    viewport_width: Math.round(innerWidth), site_path: '/new/',
    site_build: document.documentElement.dataset.build, analytics_version: 1, analytics_test: qa});
  const clarityCall = (...args) => {
    try {window.clarity(...args); return true;}
    catch {return false; /* Each provider stays independent of the page and the other SDK. */}
  };
  const clarityTags = new Set();
  const clarityTag = (key, value) => {
    const text = String(value), pair = key + ':' + text;
    if (!clarityTags.has(pair) && clarityCall('set', key, text)) clarityTags.add(pair);
  };
  const syncClarityContext = properties => {
    if (!clarityActive) return;
    for (const key of ['layout', 'site_path', 'site_build', 'analytics_version', 'analytics_test'])
      clarityTag(key, properties[key]);
    clarityTag('clarity_events_version', 1);
  };
  // Clarity tags belong to a session, not to an individual event. Encode the
  // bounded action dimensions in event names so rotating variants cannot mix.
  const clarityEvent = (name, properties) => {
    if (['promo_viewed', 'promo_clicked', 'promo_dismissed'].includes(name)
      && ['audit', 'work', 'consulting'].includes(properties.variant)) return name + '_' + properties.variant;
    if (name === 'contact_clicked' && ['email', 'telegram'].includes(properties.channel)
      && ['promo', 'desktop_navigation', 'mobile_menu'].includes(properties.placement)) {
      const suffix = properties.placement === 'promo' && ['audit', 'work', 'consulting'].includes(properties.variant)
        ? '_' + properties.variant : '';
      return name + '_' + properties.channel + '_' + properties.placement + suffix;
    }
    if (name === 'menu_link_clicked' && ['work', 'email', 'linkedin', 'resume', 'telegram'].includes(properties.destination))
      return name + '_' + properties.destination;
    if (name === 'card_viewed' && ['companies', 'ai_tools', 'industries', 'geography'].includes(properties.card))
      return name + '_' + properties.card;
    if (name === 'section_viewed' && properties.section === 'at_glance') return name + '_at_glance';
    return name;
  };
  const capture = (name, properties = {}, immediate = false) => {
    const common = context();
    if (posthogActive) try {
      window.posthog.capture(name, {...common, ...properties},
        immediate ? {transport: 'sendBeacon', send_instantly: true} : undefined);
    } catch { /* Tracking cannot interrupt navigation or animation. */ }
    if (clarityActive) {
      syncClarityContext(common);
      if (name === 'first_screen_ready') {
        clarityTag('first_screen_mode', properties.ready_mode);
        clarityTag('first_screen_band', properties.ready_ms < 3000 ? 'under_3s'
          : properties.ready_ms <= 6000 ? '3_to_6s' : 'over_6s');
      }
      clarityCall('event', clarityEvent(name, properties));
    }
  };
  syncClarityContext(context());
  mobile.addEventListener?.('change', () => syncClarityContext(context()));
  const promo = document.querySelector('.promo');
  const variant = element => element?.closest('.ready-promo')?.dataset.variant
    || promo?.dataset.variant || (['audit', 'work', 'consulting'].includes(new URLSearchParams(location.search).get('banner'))
      ? new URLSearchParams(location.search).get('banner') : 'audit');
  const method = event => event.detail === 0 ? 'keyboard' : event.pointerType || 'pointer';
  // Capture before the mobile menu closes and before the banner collapses.
  document.addEventListener('click', event => {
    if (!event.isTrusted) return;
    const target = event.composedPath().find(node => node instanceof Element);
    if (!target) return;
    const common = {input_method: method(event)};
    if (target.closest('.menu-toggle')) {
      if (mobile.matches && target.closest('.menu-toggle').getAttribute('aria-expanded') !== 'true')
        capture('menu_opened', common);
      return;
    }
    if (target.closest('.promo-close')) {
      capture('promo_dismissed', {...common, variant: variant(target)});
      return;
    }
    if (target.closest('.promo-action')) {
      const properties = {...common, variant: variant(target), placement: 'promo'};
      capture('promo_clicked', properties, true);
      capture('contact_clicked', {...properties, channel: 'email'}, true);
      return;
    }
    const link = target.closest('[data-analytics-link]');
    if (!link) return;
    const destination = link.dataset.analyticsLink;
    const properties = {...common, placement: mobile.matches ? 'mobile_menu' : 'desktop_navigation'};
    if (mobile.matches && document.querySelector('.menu-toggle')?.getAttribute('aria-expanded') === 'true')
      capture('menu_link_clicked', {...properties, destination}, true);
    if (['email', 'telegram'].includes(destination)) capture('contact_clicked', {...properties, channel: destination}, true);
    else if (destination === 'resume') capture('resume_opened', properties, true);
    else if (destination === 'work') capture('portfolio_opened', properties, true);
    else if (destination === 'linkedin') capture('linkedin_opened', properties, true);
  }, true);

  let portraitSent = false, drag = null;
  const portrait = document.querySelector('.portrait');
  const portraitEvent = input => {
    if (portraitSent) return;
    portraitSent = true;
    capture('portrait_interacted', {input_method: input});
  };
  portrait?.addEventListener('pointerdown', event => {
    if (event.isTrusted && event.isPrimary !== false && (event.button === 0 || event.pointerType === 'touch')
      && portrait.dataset.spinReady === 'true') drag = {id: event.pointerId, x: event.clientX, y: event.clientY, type: event.pointerType};
  }, {passive: true});
  window.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId || !event.isTrusted) return;
    const x = Math.abs(event.clientX - drag.x), y = Math.abs(event.clientY - drag.y);
    if (x >= 8 && x >= y) {portraitEvent(drag.type || 'pointer'); drag = null;}
  }, {passive: true});
  const clearDrag = () => {drag = null;};
  window.addEventListener('pointerup', clearDrag, {passive: true});
  window.addEventListener('pointercancel', clearDrag, {passive: true});
  portrait?.addEventListener('keydown', event => {
    if (event.isTrusted && portrait.dataset.spinReady === 'true' && ['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) portraitEvent('keyboard');
  });

  let readyAt = null, readySent = false;
  const sendReady = () => {
    if (readySent || readyAt === null || document.visibilityState !== 'visible') return;
    readySent = true;
    capture('first_screen_ready', {ready_ms: Math.round(readyAt),
      ready_mode: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduced'
        : portrait?.dataset.spinReady === 'true' ? 'animated' : 'fallback'});
  };
  window.startScreenReady?.then(() => {readyAt = performance.now(); sendReady();}).catch(() => {});

  // A view means >=50% intersection, unoccluded centre, foreground, for 1s.
  // Prepared hidden banners and cards below the viewport never count as views.
  if (!window.IntersectionObserver) return;
  const observed = new WeakSet(), candidates = new Map(), seen = new Set();
  let timer = null;
  const visible = element => {
    if (!element.isConnected || element.getBoundingClientRect().width === 0) return false;
    for (let node = element; node && node instanceof Element; node = node.parentElement) {
      if (node.hidden || node.inert || node.getAttribute('aria-hidden') === 'true') return false;
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) < .5) return false;
    }
    const rect = element.getBoundingClientRect();
    const x = (Math.max(0, rect.left) + Math.min(innerWidth, rect.right)) / 2;
    const y = (Math.max(0, rect.top) + Math.min(innerHeight, rect.bottom)) / 2;
    const hit = document.elementFromPoint(x, y);
    return hit === element || element.contains(hit);
  };
  const identify = element => element === promo ? ['promo_viewed', {variant: variant(element)}]
    : element.dataset.analyticsCard ? ['card_viewed', {card: element.dataset.analyticsCard}]
      : ['section_viewed', {section: 'at_glance'}];
  const tick = () => {
    timer = null;
    if (document.visibilityState !== 'visible') {for (const state of candidates.values()) state.since = null; return;}
    const now = performance.now();
    for (const [element, state] of candidates) {
      const [name, properties] = identify(element), key = name + ':' + Object.values(properties).join(':');
      if (seen.has(key) || !visible(element)) {state.since = null; state.key = key; continue;}
      if (state.key !== key || state.since === null) {state.key = key; state.since = now;}
      if (now - state.since >= 1000) {
        seen.add(key); capture(name, {...properties, visible_ms: 1000});
        if (element !== promo || ['audit', 'work', 'consulting'].every(value => seen.has('promo_viewed:' + value))) {
          observer.unobserve(element); candidates.delete(element);
        }
      }
    }
    if (candidates.size) timer = setTimeout(tick, 250);
  };
  const schedule = () => {if (timer === null && candidates.size) timer = setTimeout(tick, 250);};
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting && entry.intersectionRatio >= .5) {
        if (!candidates.has(entry.target)) candidates.set(entry.target, {since: null, key: null});
      } else candidates.delete(entry.target);
    }
    schedule();
  }, {threshold: [.5]});
  const discover = () => {
    document.querySelectorAll('.promo, #glance-title, [data-analytics-card]').forEach(element => {
      if (!observed.has(element)) {observed.add(element); observer.observe(element);}
    });
  };
  discover();
  const section = document.querySelector('.at-glance');
  if (section) new MutationObserver(discover).observe(section, {childList: true, subtree: true});
  document.addEventListener('visibilitychange', () => {
    clearDrag();
    for (const state of candidates.values()) state.since = null;
    if (document.visibilityState === 'visible') {sendReady(); schedule();}
    else {clearTimeout(timer); timer = null;}
  });
  window.addEventListener('pagehide', () => {
    clearTimeout(timer); timer = null; clearDrag();
    for (const state of candidates.values()) state.since = null;
  });
  window.addEventListener('pageshow', schedule);
})();
