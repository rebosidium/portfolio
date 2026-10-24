(() => {
  'use strict';
  // All providers share the exact head decision; unknown routes fail closed.
  const policy = window.portfolioAnalytics;
  if (!policy?.enabled) return;
  const notFound = policy.pageType === 'not-found';
  const sitePath = policy.sitePath;
  const basePath = path => path.replace(/^\/ru(?=\/)/,'');
  const localePrefix = policy.language === 'ru' ? '/ru' : '';
  const project = policy.project;
  const posthogActive = typeof posthogTrackingEnabled !== 'undefined' && posthogTrackingEnabled
    && typeof window.posthog?.capture === 'function';
  const clarityActive = typeof clarityTrackingEnabled !== 'undefined' && clarityTrackingEnabled
    && typeof window.clarity === 'function';
  const ga4Active = typeof ga4TrackingEnabled !== 'undefined' && ga4TrackingEnabled
    && typeof window.gtag === 'function';
  const yandexActive = typeof yandexMetrikaTrackingEnabled !== 'undefined' && yandexMetrikaTrackingEnabled
    && typeof window.ym === 'function';
  if (!posthogActive && !clarityActive && !ga4Active && !yandexActive) return;
  // Keep Metrika goals focused on meaningful intent and engagement, using the
  // same trusted actions and definitions as the other providers.
  const yandexGoals = new Set(['contact_clicked', 'resume_opened', 'briefing_copied', 'project_opened',
    'portfolio_opened', 'about_opened', 'portrait_interacted', 'case_engaged', 'multiple_cases_engaged', 'qualified_contact']);
  const mobile = window.mobileLayout || matchMedia('(max-width: 767px), (max-width: 1023px) and (pointer: coarse)');
  const qa = window.portfolioAnalytics?.qa ?? new URLSearchParams(location.search).get('analytics_test') === '1';
  const context = () => ({layout: mobile.matches ? 'mobile' : 'desktop',
    viewport_width: Math.round(innerWidth), site_path: sitePath, page_group: policy.pageGroup,
    content_language: policy.language || document.documentElement.lang,
    site_build: document.documentElement.dataset.build, analytics_version: 5, analytics_test: qa, language: policy.language || document.documentElement.lang, page_type: policy.pageType, project});
  const callClarity = (...args) => {try {window.clarity(...args); return true;} catch {return false;}};
  const tags = new Set();
  const tag = (key, value) => {
    const text = String(value), pair = key + ':' + text;
    if (!tags.has(pair) && callClarity('set', key, text)) tags.add(pair);
  };
  const syncContext = properties => {
    if (!clarityActive) return;
    for (const key of ['layout', 'site_path', 'page_group', 'content_language', 'site_build', 'analytics_version', 'analytics_test', 'page_type']) tag(key, properties[key]);
    tag('clarity_events_version', 5);
    if (project) tag('project', project);
  };
  const workNames = ['larixon', 'raiffeisen_bank', 'raiffeisen_leasing', 'yandex_market', 'gdematerial', 'medesk'];
  const clarityName = (name, properties) => {
    if (name === 'contact_clicked') return name + '_' + properties.channel + '_' + properties.placement;
    if (name === 'menu_link_clicked') return name + '_' + properties.destination;
    if (name === 'project_opened') return name + '_' + properties.project.replaceAll('-', '_');
    if (['about_opened', 'portfolio_opened'].includes(name)) return name + '_' + properties.placement;
    if (name === 'work_viewed') return name + '_' + properties.work;
    if (name === 'section_viewed') return name + '_' + properties.section;
    if (['briefing_clicked', 'briefing_copied', 'briefing_copy_failed'].includes(name)) return name + '_' + properties.placement;
    return name;
  };
  let observeJourney = () => {};
  const capture = (name, properties = {}, immediate = false) => {
    if (!policy.enabled) return;
    observeJourney(name, properties);
    const common = context();
    if (posthogActive) try {
      window.posthog.capture(name, {...common, ...properties},
        immediate ? {transport: 'sendBeacon', send_instantly: true} : undefined);
    } catch { /* An unavailable provider cannot break native actions. */ }
    if (ga4Active) try {
      // GA's built-in language means browser language; content_language is the page locale.
      const values = Object.fromEntries(Object.entries({...common, ...properties}).filter(([key,value]) => key !== 'language' && value !== null && value !== undefined));
      window.gtag('event', name, {...values, send_to: ga4MeasurementId});
    } catch { /* Google failures cannot affect actions or the other providers. */ }
    if (yandexActive && yandexGoals.has(name)) try {
      const values = Object.fromEntries(Object.entries({...common, ...properties}).filter(([key,value]) => key !== 'language' && value !== null && value !== undefined));
      window.ym(yandexMetrikaCounterId, 'reachGoal', name, values);
    } catch { /* Metrika failures cannot affect native actions or the other providers. */ }
    if (clarityActive) {
      syncContext(common);
      if (name === 'first_screen_ready') {
        tag('first_screen_mode', properties.ready_mode);
        tag('first_screen_band', properties.ready_ms < 3000 ? 'under_3s'
          : properties.ready_ms <= 6000 ? '3_to_6s' : 'over_6s');
      }
      if (properties.input_method) tag('input_method', properties.input_method);
      if (['case_engaged','multiple_cases_engaged','qualified_contact'].includes(name)) tag(name, 'true');
      callClarity('event', clarityName(name, properties));
      if (name === 'project_opened' && properties.placement === 'related_cases') callClarity('event', 'project_opened_related_cases');
      // Aggregate API signals let native goals include all current/future
      // destinations and placements while retaining the detailed event names.
      if (['contact_clicked', 'menu_link_clicked', 'project_opened', 'about_opened', 'portfolio_opened'].includes(name)) callClarity('event', name);
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
    const catalogCase = policy.pageType === 'catalog' && target.closest('main .article-source-link[href]');
    if (catalogCase) {
      const url = new URL(catalogCase.href, location.href);
      const destinationProject = policy.projectRoutes?.[url.pathname];
      if (url.origin === location.origin && destinationProject)
        capture('project_opened', {...common, project: destinationProject, destination: url.pathname, placement: 'case_catalog'}, true);
      return;
    }
    const aboutTeaser = target.closest('.home-about-card .work-actions a[href]');
    if (aboutTeaser) {
      capture('about_opened', {...common, placement: 'home_teaser', destination: localePrefix + '/about/'}, true);
      return;
    }
    const relatedCase = target.closest('.related-case-card[href]');
    if (relatedCase) {
      const url = new URL(relatedCase.href, location.href);
      const destinationProject = policy.projectRoutes?.[url.pathname];
      if (url.origin === location.origin && destinationProject)
        capture('project_opened', {...common, project: destinationProject, source_project: project, destination: url.pathname, placement: 'related_cases'}, true);
      return;
    }
    const projectLink = target.closest('[data-analytics-work] .work-actions a[href], [data-analytics-work] .work-case-link[href]');
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
    const back = (basePath(sitePath) === '/about/' || policy.pageType === 'catalog' || !!project) && target.closest('.about-desktop-back, .about-mobile-back, .about-identity .name');
    if (back) {
      capture('homepage_opened', {...common, placement: back.matches('.name') ? 'identity' : mobile.matches ? 'mobile_back' : 'desktop_back'}, true);
      return;
    }
    const link = target.closest('.header nav a, .footer-links a');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    let isWork = false;
    try {const url = new URL(href, location.href); isWork = url.origin === location.origin
      && ['/', '/index.html'].includes(basePath(url.pathname)) && url.hash === '#selected-works';} catch {}
    const destination = link.hasAttribute('data-background-prefetch') && link.hasAttribute('download') ? 'resume'
      : basePath(href) === '/about/' || basePath(href).startsWith('/about/?') ? 'about'
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
    else if (destination === 'work') capture('portfolio_opened', {...properties, destination: localePrefix + '/#selected-works'}, true);
    else if (destination === 'linkedin') capture('linkedin_opened', properties, true);
  }, true);

  let portraitSent = false, drag = null, dragCount = 0, dragTotal = 0;
  const portrait = document.querySelector('.portrait');
  const sendPortrait = input => {if (!portraitSent) {portraitSent = true; capture('portrait_interacted', {input_method: input});}};
  portrait?.addEventListener('pointerdown', event => {
    if (event.isTrusted && event.isPrimary !== false && (event.button === 0 || event.pointerType === 'touch')
      && portrait.dataset.spinReady === 'true') drag = {id: event.pointerId, x: event.clientX, y: event.clientY, type: event.pointerType, started: performance.now(), moved: false, distance: 0};
  }, {passive: true});
  window.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId || !event.isTrusted) return;
    const x = Math.abs(event.clientX - drag.x), y = Math.abs(event.clientY - drag.y);
    if (x >= 8 && x >= y) {drag.moved = true; drag.distance = Math.max(drag.distance, x);}
  }, {passive: true});
  const clearDrag = () => {drag = null;};
  window.addEventListener('pointerup', event => {
    if (!drag || !event.isTrusted || drag.id !== event.pointerId) return;
    if (drag.moved && document.visibilityState === 'visible') {
      const duration = Math.max(0, Math.round(performance.now() - drag.started));
      dragCount++; dragTotal += duration;
      sendPortrait(drag.type || 'mouse');
      capture('portrait_drag_completed', {input_method: drag.type || 'mouse', duration_ms: duration,
        drag_count: dragCount, total_drag_ms: dragTotal, distance_px: Math.round(drag.distance)});
    }
    clearDrag();
  }, {passive: true});
  window.addEventListener('pointercancel', clearDrag, {passive: true});
  portrait?.addEventListener('keydown', event => {
    if (event.isTrusted && portrait.dataset.spinReady === 'true' && ['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key))
      sendPortrait('keyboard');
  });

  // Session progress is per tab, expires after 30 minutes without activity.
  // Storage failure keeps page-level measures but never invents cross-page progress.
  const journeyKey = 'portfolio.analytics.journey.v1';
  let journey = {at: Date.now(), cases: [], multiple: false, qualified: false};
  try {const saved = JSON.parse(sessionStorage.getItem(journeyKey));
    if (saved && Date.now() - saved.at < 1800000 && Array.isArray(saved.cases)) journey = saved;
  } catch {}
  const touchJourney = () => {
    if (Date.now() - journey.at >= 1800000) journey = {at: Date.now(), cases: [], multiple: false, qualified: false};
    journey.at = Date.now();
    try {sessionStorage.setItem(journeyKey, JSON.stringify(journey));} catch {}
  };
  const contentSections = new Set(), activeThresholds = new Set();
  let activeMs = 0, lastTick = performance.now(), lastActivity = lastTick, caseEngaged = false;
  let lastJourneyWrite = 0;
  const activity = event => {if (event.isTrusted) {lastActivity = performance.now();
    if (lastActivity - lastJourneyWrite >= 5000) {touchJourney(); lastJourneyWrite = lastActivity;}
  }};
  for (const name of ['pointerdown','pointermove','keydown','scroll']) document.addEventListener(name, activity, {passive:true});
  const engageCase = () => {
    if (!project || caseEngaged || activeMs < 20000 || contentSections.size < 2) return;
    caseEngaged = true; touchJourney();
    if (!journey.cases.includes(project)) journey.cases.push(project);
    capture('case_engaged', {active_seconds: Math.floor(activeMs / 1000), sections_count: contentSections.size});
    if (journey.cases.length >= 2 && !journey.multiple) {
      journey.multiple = true; capture('multiple_cases_engaged', {cases_count: journey.cases.length});
    }
    touchJourney();
  };
  observeJourney = (name, properties) => {
    if (name === 'section_viewed' && project && ['project_role','project_context','project_research','project_contribution','project_outcomes','project_behind_scenes'].includes(properties.section)) {
      contentSections.add(properties.section); engageCase();
    }
    if (['contact_clicked','linkedin_opened'].includes(name)) {
      touchJourney();
      if (journey.cases.length && !journey.qualified) {
        journey.qualified = true; touchJourney();
        capture('qualified_contact', {...properties, channel: properties.channel || 'linkedin', cases_count: journey.cases.length}, true);
      }
    }
  };
  // Dwell exposures are checked against current geometry, occlusion and visibility.
  const dwell = new Map(), dwellSeen = new Set();
  const exposureTargets = [...document.querySelectorAll('.recommendations-slide')];
  const outcomes = project && document.querySelector('#outcomes')?.parentElement;
  if (outcomes) exposureTargets.push(outcomes);
  const engagementTick = () => {
    const now = performance.now(), delta = Math.min(1000, Math.max(0, now - lastTick)); lastTick = now;
    if (document.visibilityState !== 'visible' || now - lastActivity > 30000) {dwell.clear(); return;}
    activeMs += delta;
    for (const seconds of [15,30,60,120]) if (activeMs >= seconds * 1000 && !activeThresholds.has(seconds)) {
      activeThresholds.add(seconds); capture('active_time_reached', {active_seconds: seconds});
    }
    engageCase();
    for (const element of exposureTargets) {
      const isOutcome = element === outcomes, key = isOutcome ? 'outcomes' : element.id;
      if (dwellSeen.has(key)) continue;
      const r = element.getBoundingClientRect();
      const area = Math.max(0,Math.min(r.right,innerWidth)-Math.max(0,r.left)) * Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(0,r.top));
      if (!r.width || !r.height || area / (Math.min(r.width,innerWidth)*Math.min(r.height,innerHeight)) < .5 || !visible(element)) {dwell.delete(key); continue;}
      if (!dwell.has(key)) dwell.set(key,now);
      const required = isOutcome ? 3000 : 5000;
      if (now-dwell.get(key) >= required) {
        dwellSeen.add(key);
        capture(isOutcome ? 'case_outcomes_viewed' : 'recommendation_viewed', {
          visible_ms: required, ...(isOutcome ? {} : {recommendation_index: [...element.parentElement.children].indexOf(element)+1})});
      }
    }
  };
  let engagementTimer = setInterval(engagementTick, 250);
  document.addEventListener('visibilitychange', () => {lastTick = performance.now(); dwell.clear();
    if (document.visibilityState === 'visible') lastActivity = lastTick;
  });
  window.addEventListener('pagehide', () => {clearInterval(engagementTimer); engagementTimer = null; dwell.clear();});
  window.addEventListener('pageshow', () => {lastTick = performance.now(); lastActivity = lastTick;
    if (engagementTimer === null) engagementTimer = setInterval(engagementTick,250);
  });
  // This reports only local SDK state, never claims server-side recording storage.
  setTimeout(() => {
    if (document.visibilityState !== 'visible') return;
    let replay = 'unknown';
    try {if (typeof window.posthog?.sessionRecordingStarted === 'function') replay = window.posthog.sessionRecordingStarted() ? 'active' : 'not_started';} catch {}
    capture('analytics_health', {posthog_replay_state: replay});
  },15000);
  document.addEventListener('portfolio:resume-result', event => {
    const result = event.detail;
    if (['prepared_download','native_download_requested'].includes(result?.status))
      capture('resume_delivery_requested', {delivery_method: result.status});
  });
  let resumeState;
  new MutationObserver(() => {
    const state = document.documentElement.dataset.resumePrefetch;
    if (state === resumeState || !['ready','error'].includes(state)) return;
    resumeState = state; capture(state === 'ready' ? 'resume_file_ready' : 'resume_prefetch_failed');
  }).observe(document.documentElement, {attributes:true,attributeFilter:['data-resume-prefetch']});

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
  const sections = {'works-title': 'selected_works', 'more-about-title': 'home_about', 'case-study-title': 'project_title', 'more-cases-title': 'related_cases', 'footer-title': 'contact',
    ...(policy.pageType === 'catalog' ? Object.fromEntries(workNames.map(work => ['catalog-' + work.replaceAll('_', '-'), 'catalog_' + work])) : {}),
    'design-title': 'about_design', 'people-title': 'about_people', 'away-title': 'about_away',
    'recommendations-title': project ? 'project_recommendations' : 'about_recommendations',
    ...(project ? {'project-role': 'project_role', context: 'project_context', research: 'project_research',
      contribution: 'project_contribution', outcomes: 'project_outcomes', 'behind-scenes': 'project_behind_scenes'} : {})};
  const identify = element => {
    const work = element.closest('[data-analytics-work]')?.dataset.analyticsWork
      || (policy.pageType === 'catalog' && element.id.startsWith('catalog-') ? element.id.slice(8).replaceAll('-', '_') : null);
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
