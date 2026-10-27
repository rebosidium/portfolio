/* Independent interaction layer. No external scripts, telemetry, cookies or storage. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const menu = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#navigation');
  function closeMenu() {
    if (!menu) return;
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', menu.dataset.openLabel);
    navigation.classList.remove('open');
    document.body.classList.remove('menu-open');
  }
  menu?.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? menu.dataset.closeLabel : menu.dataset.openLabel);
    navigation.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') {
      closeMenu(); menu.focus();
    }
    if (event.key === 'Tab' && menu?.getAttribute('aria-expanded') === 'true') {
      const controls = [menu, ...navigation.querySelectorAll('a')];
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  navigation?.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  matchMedia('(min-width: 768px)').addEventListener('change', closeMenu);

  // The QA flag is only propagated when explicitly present. Owner preferences remain untouched.
  if (new URL(location.href).searchParams.get('analytics_test') === '1') {
    for (const a of document.querySelectorAll('a[href]')) {
      const u = new URL(a.getAttribute('href'), location.href);
      if (u.origin === location.origin && /^(https?:)$/.test(u.protocol)) {
        u.searchParams.set('analytics_test', '1');
        a.href = u.pathname + u.search + u.hash;
      }
    }
  }

  const projects = [...document.querySelectorAll('.projects .project')];
  const filters = [...document.querySelectorAll('[data-filter]')];
  const filterStatus = document.querySelector('#filter-status');
  for (const button of filters) button.addEventListener('click', () => {
    for (const b of filters) { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); }
    for (const card of projects) card.hidden = button.dataset.filter !== 'all' && card.dataset.category !== button.dataset.filter;
    if (filterStatus) filterStatus.textContent = `${filterStatus.dataset.prefix} ${projects.filter(p => !p.hidden).length}`;
  });

  const sections = [...document.querySelectorAll('.case-section')];
  const toc = [...document.querySelectorAll('.case-contents nav a')];
  if (sections.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) for (const a of toc) {
        const current = a.hash === `#${entry.target.id}`;
        a.classList.toggle('active', current);
        if (current) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
      }
    }, { rootMargin: '-15% 0px -60% 0px', threshold: 0 });
    sections.forEach(section => observer.observe(section));
  }

  const canvas = document.querySelector('#sculpture');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;
  const host = canvas.parentElement;
  const range = document.querySelector('#morph');
  let width = 0, height = 0, phase = .4, frame = 0, last = 0;
  let active = true, targetMorph = .25, morph = .25, targetX = 0, targetY = 0, mx = 0, my = 0;
  const mobile = matchMedia('(max-width: 767px)');
  const lowPower = navigator.connection?.saveData;
  const rows = lowPower ? 32 : mobile.matches ? 42 : 64;
  const segments = mobile.matches ? 140 : 180;
  const points = new Float32Array((segments + 1) * 3);
  function resize() {
    const rect = host.getBoundingClientRect(); width = rect.width; height = rect.height;
    const dpr = Math.min(devicePixelRatio || 1, 1.7);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }
  function draw() {
    ctx.clearRect(0, 0, width, height);
    const size = Math.min(width * .31, height * .38);
    const yaw = .25 + phase * .2 + mx * .08;
    const tilt = -.57 + Math.sin(phase * .2) * .10 + my * .07;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(tilt), sx = Math.sin(tilt);
    const knot = 1 - morph;
    const centerX = width * .53, centerY = height * .50;
    for (let j = 0; j < rows; j++) {
      const v = j / rows * Math.PI * 2;
      const cv = Math.cos(v), sv = Math.sin(v);
      let depth = 0;
      for (let i = 0; i <= segments; i++) {
        const u = i / segments * Math.PI * 2;
        const angle = u + .13 * Math.sin(phase);
        const radius = 1 + .27 * cv + knot * .25 * Math.cos(3 * u + phase * .16);
        let x = radius * Math.cos(angle);
        let y = radius * Math.sin(angle);
        let z = .27 * sv + knot * .53 * Math.sin(3 * u + phase * .16);
        const rx = x * cy + z * sy, rz = -x * sy + z * cy;
        const ry = y * cx - rz * sx, zz = y * sx + rz * cx;
        const perspective = 4.8 / (4.8 + zz);
        points[i * 3] = centerX + rx * size * perspective;
        points[i * 3 + 1] = centerY + ry * size * perspective;
        points[i * 3 + 2] = zz;
        depth += zz;
      }
      // Fine material contours carry the form; no bloom, particles or ornamental HUD.
      const light = .5 + .5 * Math.sin(v + 1.3);
      const alpha = .12 + light * .46;
      ctx.strokeStyle = `rgba(${Math.round(150+light*72)},${Math.round(187+light*52)},${Math.round(174+light*46)},${alpha})`;
      ctx.lineWidth = .62 + light * .42;
      ctx.beginPath();
      for (let i = 0; i <= segments; i++) {
        const x = points[i * 3], y = points[i * 3 + 1];
        if (!i) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.stroke();
    }
    // A second set of sparse meridians reveals the spatial surface on larger screens.
    if (!mobile.matches) {
      ctx.strokeStyle = 'rgba(173,218,198,.075)'; ctx.lineWidth = .65;
      for (let i = 0; i < 72; i++) {
        const u = i / 72 * Math.PI * 2; ctx.beginPath();
        for (let j = 0; j <= 40; j++) {
          const v = j / 40 * Math.PI * 2, angle = u + .13 * Math.sin(phase);
          const radius = 1 + .27 * Math.cos(v) + knot * .25 * Math.cos(3 * u + phase * .16);
          const x = radius*Math.cos(angle), y=radius*Math.sin(angle), z=.27*Math.sin(v)+knot*.53*Math.sin(3*u+phase*.16);
          const rx=x*cy+z*sy,rz=-x*sy+z*cy,ry=y*cx-rz*sx,zz=y*sx+rz*cx,p=4.8/(4.8+zz);
          if (!j) ctx.moveTo(centerX+rx*size*p,centerY+ry*size*p);else ctx.lineTo(centerX+rx*size*p,centerY+ry*size*p);
        }
        ctx.stroke();
      }
    }
    host.classList.add('ready');
  }
  function tick(time) {
    frame = 0;
    if (!active || document.hidden || reduced.matches || lowPower) return;
    if (time - last >= 1000 / 30) {
      const dt = last ? Math.min((time-last)/1000,.1) : .033;
      phase += dt * .12; last = time;
      morph += (targetMorph - morph) * .055;
      mx += (targetX-mx)*.045; my += (targetY-my)*.045;
      draw();
    }
    frame = requestAnimationFrame(tick);
  }
  function restart() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; last = 0;
    if (active && !document.hidden && !reduced.matches && !lowPower) frame=requestAnimationFrame(tick);
    else draw();
  }
  range?.addEventListener('input', () => {
    targetMorph = Number(range.value) / 100;
    if (reduced.matches || lowPower) { morph = targetMorph; draw(); }
  });
  host.addEventListener('pointermove', event => {
    const r=host.getBoundingClientRect();targetX=(event.clientX-r.left)/r.width-.5;targetY=(event.clientY-r.top)/r.height-.5;
  }, {passive:true});
  host.addEventListener('pointerleave',()=>{targetX=0;targetY=0;});
  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(entries=>{active=entries[0].isIntersecting;restart();},{threshold:.01}).observe(host);
  document.addEventListener('visibilitychange',restart);
  reduced.addEventListener('change',restart);
  resize();restart();
})();
