(() => {
  'use strict';
  // Both providers share the exact head decision; unknown routes fail closed.
  const policy = window.portfolioAnalytics;
  if (!policy?.enabled) return;
  const notFound = policy.pageType === 'not-found';
  const sitePath = policy.sitePath;
  const project = policy.project;
  const posthogActive = typeof posthogTrackingEnabled !== 'undefined' && posthogTrackingEnabled
    && typeof window.posthog?.capture === 'function';
  const clarityActive = typeof clarityTrackingEnabled !== 'undefined' && clarityTrackingEnabled
    && typeof window.clarity === 'function';
  if (!posthogActive && !clarityActive) return;
  const mobile = window.mobileLayout || matchMedia('(max-width: 767px), (max-width: 1023px) and (pointer: coarse)');
  const qa = window.portfolioAnalytics?.qa ?? new URLSearchParams(location.search).get('analytics_test') === '1';
  const context = () => ({layout: mobile.matches ? 'mobile' : 'desktop',
    viewport_width: Math.round(innerWidth), site_path: sitePath,
    site_build: document.documentElement.dataset.build, analytics_version: 3, analytics_test: qa, page_type: policy.pageType, project});
  const callClarity = (...args) => {try {window.clarity(...args); return true;} catch {return false;}};
  const tags = new Set();
  const tag = (key, value) => {
    const text = String(value), pair = key + ':' + text;
    if (!tags.has(pair) && callClarity('set', key, text)) tags.add(pair);
  };
  const syncContext = properties => {
    if (!clarityActive) return;
    for (const key of ['layout', 'site_path', 'site_build', 'analytics_version', 'analytics_test', 'page_type']) tag(key, properties[key]);
    tag('clarity_events_version', 3);
    if (project) tag('project', project);
  };
  const workNames = ['larixon', 'raiffeisen_bank', 'raiffeisen_leasing', 'yandex_market', 'gdematerial', 'medesk'];
  const clarityName = (name, properties) => {
    if (name === 'contact_clicked') return name + '_' + properties.channel + '_' + properties.placement;
    if (name === 'menu_link_clicked') return name + '_' + properties.destination;
    if (name === 'work_viewed') return name + '_' + properties.work;
    if (name === 'section_viewed') return name + '_' + properties.section;
    if (['briefing_clicked', 'briefing_copied', 'briefing_copy_failed'].includes(name)) return name + '_' + properties.placement;
    return name;
  };
  const capture = (name, properties = {}, immediate = false) => {
    const common = context();
    if (posthogActive) try {
      window.posthog.capture(name, {...common, ...properties},
        immediate ? {transport: 'sendBeacon', send_instantly: true} : undefined);
    } catch { /* An unavailable provider cannot break native actions. */ }
    if (clarityActive) {
      syncContext(common);
      if (name === 'first_screen_ready') {
        tag('first_screen_mode', properties.ready_mode);
        tag('first_screen_band', properties.ready_ms < 3000 ? 'under_3s'
          : properties.ready_ms <= 6000 ? '3_to_6s' : 'over_6s');
      }
      callClarity('event', clarityName(name, properties));
      // Aggregate API signals let native goals include all current/future
      // destinations and placements while retaining the detailed event names.
      if (['contact_clicked', 'menu_link_clicked'].includes(name)) callClarity('event', name);
    }
  };
  syncContext(context());
  mobile.addEventListener?.('change', () => syncContext(context()));
  const placement = target => target.closest('.footer') ? 'footer' : mobile.matches ? 'mobile_menu' : 'desktop_navigation';
  const inputMethod = event => event.detail === 0 ? 'keyboard' : event.pointerType || 'pointer';
  if (notFound) {
    const preview = ['/404', '/404/', '/404/index.html', '/404.html'].includes(location.pathname);
    const errorContext = {requested_path: location.pathname, error_preview: preview, ...(!preview ? {error_code: 404} : {})};
    if (clarityActive) {tag('error_preview', preview);tag('requested_path', location.pathname.slice(0, 255));}
    if (!preview) capture('page_not_found', errorContext, true);
    document.addEventListener('click', event => {
      if (event.isTrusted && event.target.closest?.('.not-found-actions .ui-back'))
        capture('homepage_opened', {...errorContext, placement: 'not_found', input_method: inputMethod(event)}, true);
    }, true);
    return;
  }
  const pendingCopies = new WeakMap();
  document.querySelectorAll('.agent-button').forEach(button => {
    new MutationObserver(() => {
      const properties = pendingCopies.get(button);
      if (!properties || button.getAttribute('aria-busy') !== 'false') return;
      pendingCopies.delete(button);
      capture(button.classList.contains('is-copied') ? 'briefing_copied' : 'briefing_copy_failed', properties);
    }).observe(button, {attributes: true, attributeFilter: ['aria-busy']});
  });
  // Observe the original trusted click before menu/PDF handlers run. Never
  // cancel navigation or count the temporary Blob download link as a new click.
  document.addEventListener('click', event => {
    if (!event.isTrusted) return;
    const target = event.composedPath().find(node => node instanceof Element);
    if (!target) return;
    const common = {input_method: inputMethod(event)};
    const projectLink = target.closest('[data-analytics-work] .work-actions a[href]');
    if (projectLink) {
      const url = new URL(projectLink.href, location.href);
      const destinationProject = policy.projectRoutes?.[url.pathname];
      if (url.origin === location.origin && destinationProject)
        capture('project_opened', {...common, project: destinationProject, destination: url.pathname, placement: 'selected_works'}, true);
      return;
    }
    const dot = target.closest('.recommendations-dot');
    if (dot) {
      const dots = [...dot.closest('[data-recommendations]').querySelectorAll('.recommendations-dot')];
      capture('recommendation_selected', {...common, recommendation_index: dots.indexOf(dot) + 1, placement: 'recommendations'});
      return;
    }
    const recommendationLink = target.closest('.recommendations-author-name, .recommendations-company');
    if (recommendationLink) {
      capture('recommendation_link_clicked', {...common, destination: recommendationLink.classList.contains('recommendations-author-name') ? 'author' : 'company'}, true);
      return;
    }
    const toggle = target.closest('.menu-toggle');
    if (toggle) {
      if (mobile.matches && toggle.getAttribute('aria-expanded') !== 'true') capture('menu_opened', common);
      return;
    }
    const briefing = target.closest('.agent-button');
    if (briefing) {
      if (briefing.getAttribute('aria-busy') === 'true') return;
      const properties = {...common, placement: briefing.closest('.footer') ? 'footer' : 'hero'};
      pendingCopies.set(briefing, properties);
      capture('briefing_clicked', properties);
      return;
    }
    const back = (sitePath === '/about/' || !!project) && target.closest('.about-desktop-back, .about-mobile-back, .about-identity .name');
    if (back) {
      capture('homepage_opened', {...common, placement: back.matches('.name') ? 'identity' : mobile.matches ? 'mobile_back' : 'desktop_back'}, true);
      return;
    }
    const link = target.closest('.header nav a, .footer-links a');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    let isWork = false;
    try {const url = new URL(href, location.href); isWork = url.origin === location.origin
      && ['/', '/index.html'].includes(url.pathname) && url.hash === '#selected-works';} catch {}
    const destination = link.hasAttribute('data-background-prefetch') && link.hasAttribute('download') ? 'resume'
      : href === '/about/' || href.startsWith('/about/?') ? 'about'
      : isWork ? 'work'
      : href.startsWith('mailto:') ? 'email'
      : href.startsWith('https://www.linkedin.com/in/ribadima/') ? 'linkedin'
      : href === 'https://t.me/ribadima' ? 'telegram' : null;
    if (!['about', 'work', 'email', 'linkedin', 'resume', 'telegram'].includes(destination)) return;
    const properties = {...common, placement: placement(link)};
    if (mobile.matches && !link.closest('.footer') && document.querySelector('.menu-toggle')?.getAttribute('aria-expanded') === 'true')
      capture('menu_link_clicked', {...properties, destination}, true);
    if (['email', 'telegram'].includes(destination)) capture('contact_clicked', {...properties, channel: destination}, true);
    else if (destination === 'resume') capture('resume_opened', properties, true);
    else if (destination === 'about') capture('about_opened', properties, true);
    else if (destination === 'work') capture('portfolio_opened', properties, true);
    else if (destination === 'linkedin') capture('linkedin_opened', properties, true);
  }, true);

  let portraitSent = false, drag = null;
  const portrait = document.querySelector('.portrait');
  const sendPortrait = input => {if (!portraitSent) {portraitSent = true; capture('portrait_interacted', {input_method: input});}};
  portrait?.addEventListener('pointerdown', event => {
    if (event.isTrusted && event.isPrimary !== false && (event.button === 0 || event.pointerType === 'touch')
      && portrait.dataset.spinReady === 'true') drag = {id: event.pointerId, x: event.clientX, y: event.clientY, type: event.pointerType};
  }, {passive: true});
  window.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId || !event.isTrusted) return;
    const x = Math.abs(event.clientX - drag.x), y = Math.abs(event.clientY - drag.y);
    if (x >= 8 && x >= y) {sendPortrait(drag.type || 'pointer'); drag = null;}
  }, {passive: true});
  const clearDrag = () => {drag = null;};
  window.addEventListener('pointerup', clearDrag, {passive: true});
  window.addEventListener('pointercancel', clearDrag, {passive: true});
  portrait?.addEventListener('keydown', event => {
    if (event.isTrusted && portrait.dataset.spinReady === 'true' && ['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key))
      sendPortrait('keyboard');
  });

  let readyAt = null, readySent = false, readyMode;
  const sendReady = () => {
    if (readySent || readyAt === null || document.visibilityState !== 'visible') return;
    readySent = true;
    capture('first_screen_ready', {ready_ms: Math.round(readyAt), ready_mode: readyMode});
  };
  const readReady = () => {
    const value = Number(document.documentElement.dataset.contentReadyAt);
    if (readyAt === null && value > 0) {
      readyAt = value;
      readyMode = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduced' : 'standard';
      sendReady();
    }
  };
  new MutationObserver(readReady).observe(document.documentElement, {attributes: true, attributeFilter: ['data-content-ready-at']});
  readReady();
  document.addEventListener('mobile:page-fallback', () => {
    if (readyAt === null) {readyAt = performance.now(); readyMode = 'fallback'; sendReady();}
  });

  // A title exposure requires >=50% intersection and an unoccluded centre for
  // one continuous foreground second. Overlapped sticky scenes do not count.
  const candidates = new Map(), seen = new Set();
  let timer = null, observer;
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
  const sections = {'works-title': 'selected_works', 'footer-title': 'contact',
    'design-title': 'about_design', 'people-title': 'about_people', 'away-title': 'about_away',
    'recommendations-title': project ? 'project_recommendations' : 'about_recommendations',
    ...(project ? {'project-role': 'project_role', context: 'project_context', research: 'project_research',
      contribution: 'project_contribution', outcomes: 'project_outcomes', 'behind-scenes': 'project_behind_scenes'} : {})};
  const identify = element => {
    const work = element.closest('[data-analytics-work]')?.dataset.analyticsWork;
    return workNames.includes(work) ? ['work_viewed', {work}]
      : ['section_viewed', {section: sections[element.id]}];
  };
  const tick = () => {
    timer = null;
    if (document.visibilityState !== 'visible') {for (const state of candidates.values()) state.since = null; return;}
    const now = performance.now();
    for (const [element, state] of candidates) {
      const [name, properties] = identify(element), key = name + ':' + Object.values(properties).join(':');
      if (seen.has(key) || !visible(element)) {state.since = null; continue;}
      if (state.since === null) state.since = now;
      if (now - state.since >= 1000) {seen.add(key); capture(name, {...properties, visible_ms: 1000}); observer.unobserve(element); candidates.delete(element);}
    }
    if (candidates.size) timer = setTimeout(tick, 250);
  };
  const schedule = () => {if (timer === null && candidates.size) timer = setTimeout(tick, 250);};
  if (window.IntersectionObserver) {
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= .5) {
          if (!candidates.has(entry.target)) candidates.set(entry.target, {since: null});
        } else candidates.delete(entry.target);
      }
      schedule();
    }, {threshold: [.5]});
    document.querySelectorAll('[data-analytics-work] .work-heading h3, ' + Object.keys(sections).map(id => '#' + id).join(', ')).forEach(element => observer.observe(element));
  }
  document.addEventListener('visibilitychange', () => {
    clearDrag();
    for (const state of candidates.values()) state.since = null;
    if (document.visibilityState === 'visible') {sendReady(); schedule();}
    else {clearTimeout(timer); timer = null;}
  });
  window.addEventListener('pagehide', () => {clearTimeout(timer); timer = null; clearDrag(); for (const state of candidates.values()) state.since = null;});
  window.addEventListener('pageshow', schedule);
})();
