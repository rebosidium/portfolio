// Easter egg: clicking Spin three times in a row shows a top notification, and
// carrying on quickly piles up short jokes that stack, wobble loose and fall away.
// Three kinds of jokes, shown in rotation: office/manager, designer, technical.
const JOKES = {
  office: [
    'Let’s take this to another call',
    'Per my last email…',
    'Reply-all storm detected. Evacuate.',
    'This could have been an email',
    'Quick sync? (45 minutes)',
    'We’ll add it to the backlog',
    'Let’s align offline',
    'I’ll loop in the stakeholders',
    'Can you do it by yesterday?',
    'Deadline moved. Again.',
    'We’re agile (we have no plan)',
    'Action items: more meetings',
    'Mute yourself, please',
    'Can everyone see my screen?',
    'Let’s not boil the ocean',
    'That’s out of scope. Do it anyway.',
    'Synergy detected',
    'Coffee level: critical',
    'Let’s sync on the sync',
    'A meeting about the meeting, at 3',
    'Friendly reminder of my last friendly reminder',
    'Reply-all is a lifestyle',
    'KPIs are up. Nobody knows why.',
    'Priority 1: everything',
    'ASAP means “whenever”, with feelings',
    'Planned for Q1. Which year?',
    'New process: approve the approval',
    'Please find the doc attached. It isn’t.',
    'Let’s workshop it. Bring snacks.',
    'Out of office until the deadline passes',
    'Can we circle back after the circle back?',
    'Junior role: 10 years of experience required',
    'Standup ran 47 minutes. Please sit down.',
    'Free pizza: the team’s only KPI'
  ],
  design: [
    'That pink is a bold choice',
    'Can we try it in blue?',
    'Make the logo bigger',
    'Can you make it pop?',
    'Contrast ratio: trust me',
    'Gradients: never too many',
    '#FF0000 is not a mood',
    'Orange is the new teal',
    'Two greys. I can’t tell either.',
    'Purple gradient detected. AI did this.',
    'Dark mode unlocked. Obviously.',
    'Round the corners. More.',
    'Padding. More padding.',
    '8px grid or nothing',
    'Kerning: a cry for help',
    'Comic Sans detected. Evacuate.',
    'Lorem ipsum dolor sit amet',
    'It’s not a bug, it’s a design decision',
    'Final_final_v7_REAL.fig',
    'design_final_final_2',
    'I’m not opening Figma!',
    'Auto layout is life',
    'Figma is thinking…',
    'Pixel-perfect (zoom 400%)',
    'Make it look like Apple (budget: Paint)',
    'Can you make the logo bigger? Bigger.',
    'More pop. Less pop. Just pop.',
    '“Clean and minimal.” Add three more banners.',
    'Feedback: “I’ll know it when I see it”',
    'That’s not white. That’s “warm cloud”.',
    'Add a gradient. Remove it. Add it back.',
    'Fonts: 2. Opinions: 140.',
    'The icon is right. The meaning is not.',
    'It’s not 2px off. It’s 2px of character.',
    'Moodboard approved. Reality rejected.',
    'Make it look expensive (budget: $3)',
    'User research: n = my colleague',
    'Mobile first, desktop last, designer never',
    'Logo in 5 minutes (it’s our whole brand)',
    'Wireframe approved. Colour: surprise me.',
    'Dribbble says yes. Users say: where’s the button?'
  ],
  tech: [
    'Compiling confidence…',
    'It works on my machine',
    'git push --force (to my heart)',
    'Have you tried turning it off and on again?',
    '404: Sleep not found',
    'Semicolon found. Peace restored.',
    'Stack Overflow is typing…',
    'npm install motivation',
    'Merge conflict with reality',
    'Ctrl+C, Ctrl+V — senior engineer',
    'Deploying on a Friday. Brave.',
    'Fixed one bug, found three',
    'The rubber duck approves',
    'TODO: touch grass',
    'sudo make me a sandwich',
    'while (true) { spin(); }',
    'undefined is not a function',
    'Please stop. The head is dizzy.',
    'Vibes passed. Tests didn’t.',
    'The AI wrote it. Nobody read it.',
    'Prompt engineering: saying “please” with extra steps',
    'The model is 100% sure. It’s also wrong.',
    'Hallucinating, but with great confidence',
    'Ten agents running. Nothing happening.',
    'Security? It interferes with the vibes.',
    'git blame: the AI',
    'You: fix one bug. AI: fixed three, added five',
    'Context window full. So am I.',
    'Tokens spent. Wisdom not found.',
    'The AI apologises politely and breaks it again',
    'Works in the demo. The demo is the product.',
    'We replaced the bug with a better bug',
    'The AI deleted the tests. Tests now pass.',
    'console.log in production. Evacuate.',
    'Estimate: 2 days. Reality: 2 sprints.'
  ]
};
const ORDER = ['office', 'design', 'tech'];
// Within each kind every joke is shown once before any repeats, also across page reloads
// (remembered in localStorage when available). A kind that runs out restarts, never opening
// with the joke it just showed.
const SEEN_KEY = 'v3-egg-seen-v2';
let seen = {office: [], design: [], tech: []}, turn = 0;
try {
  const stored = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}');
  for (const kind of ORDER) if (Array.isArray(stored[kind])) seen[kind] = stored[kind].filter(text => JOKES[kind].includes(text));
} catch { /* Keep empty memory. */ }
const nextPhrase = () => {
  const kind = ORDER[turn++ % ORDER.length];
  let fresh = JOKES[kind].filter(text => !seen[kind].includes(text));
  if (!fresh.length) {
    const last = seen[kind][seen[kind].length - 1];
    seen[kind] = last ? [last] : [];
    fresh = JOKES[kind].filter(text => !seen[kind].includes(text));
  }
  const text = fresh[Math.floor(Math.random() * fresh.length)];
  seen[kind].push(text);
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch { /* Private mode: session-only memory. */ }
  return text;
};
const STREAK_GAP = 900, MAX_VISIBLE = 9, NEAT = 3, IDLE_RELEASE = 3200, GRAVITY = 2300;
const reduced = matchMedia('(prefers-reduced-motion:reduce)');
const live = [], falling = new Set();
let host = null, shown = 0, streak = 0, lastClick = 0, raf = 0, idle = 0, lastFrame = 0;
const rand = (min, max) => min + Math.random() * (max - min);

function ensureHost() {
  if (!host) {
    host = document.createElement('div');
    host.className = 'v3-egg';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    if ('popover' in host) host.popover = 'manual';
    document.body.append(host);
  }
  // The portrait is a modal dialog in the top layer; a popover shown later stays above it.
  if (host.popover === 'manual' && !host.matches(':popover-open')) { try { host.showPopover(); } catch { /* Unsupported: falls back to z-index. */ } }
  return host;
}
function place(item) {
  item.el.style.transform = `translate(-50%,0) translate(${item.x.toFixed(1)}px,${item.y.toFixed(1)}px) rotate(${item.rot.toFixed(2)}deg) scale(${item.scale.toFixed(3)})`;
}
function spawn(text, strong) {
  const el = document.createElement('div');
  el.className = 'v3-egg__toast' + (strong ? ' v3-egg__toast--strong' : '');
  el.textContent = text;
  // The first three notifications stack neatly; later ones land on top crooked.
  const neat = shown++ < NEAT;
  const item = neat
    ? {el, x: rand(-8, 8), y: rand(0, 6), rot: rand(-2, 2), vx: 0, vy: 0, spin: 0, wobble: 0, scale: 1}
    : {el, x: rand(-38, 38), y: rand(6, 30), rot: rand(-10, 10), vx: 0, vy: 0, spin: 0, wobble: 0, scale: 1};
  ensureHost().append(el);
  // The pile grows with every notification (up to +45%), never wider than the screen.
  const growth = 1 + Math.min(.45, Math.max(0, shown - 1) * .045);
  item.scale = Math.max(1, Math.min(growth, innerWidth * .94 / Math.max(1, el.offsetWidth)));
  place(item);
  live.push(item);
  if (!reduced.matches) {
    el.animate([
      {opacity: 0, transform: `translate(-50%,0) translate(${item.x}px,${item.y - 64}px) rotate(${item.rot * 2}deg) scale(${(item.scale * .86).toFixed(3)})`},
      {opacity: 1, transform: `translate(-50%,0) translate(${item.x}px,${item.y}px) rotate(${item.rot}deg) scale(${item.scale.toFixed(3)})`}
    ], {duration: 380, easing: 'cubic-bezier(.2,1.25,.4,1)'});
  }
  while (live.length > (reduced.matches ? 1 : MAX_VISIBLE)) release(live.shift());
  clearTimeout(idle);
  idle = setTimeout(releaseAll, IDLE_RELEASE);
}
function release(item) {
  if (reduced.matches) { item.el.remove(); return; }
  // A short shake as the notification comes loose, then gravity takes over.
  item.wobble = .26;
  item.vx = rand(-110, 110); item.vy = -rand(30, 150); item.spin = rand(-240, 240);
  falling.add(item);
  if (!raf) { lastFrame = performance.now(); raf = requestAnimationFrame(step); }
}
function releaseAll() {
  shown = 0;
  live.splice(0).forEach((item, i) => setTimeout(() => release(item), i * 140));
}
function step(now) {
  const dt = Math.min(.05, (now - lastFrame) / 1000); lastFrame = now;
  for (const item of falling) {
    if (item.wobble > 0) {
      item.wobble -= dt;
      item.el.style.transform = `translate(-50%,0) translate(${(item.x + rand(-2.5, 2.5)).toFixed(1)}px,${(item.y + rand(-1.5, 1.5)).toFixed(1)}px) rotate(${(item.rot + rand(-3, 3)).toFixed(2)}deg) scale(${item.scale.toFixed(3)})`;
      continue;
    }
    item.vy += GRAVITY * dt;
    item.x += item.vx * dt; item.y += item.vy * dt; item.rot += item.spin * dt;
    place(item);
    if (item.y > innerHeight + 160) { item.el.remove(); falling.delete(item); }
  }
  if (falling.size) raf = requestAnimationFrame(step);
  else {
    raf = 0;
    if (!live.length && host?.matches?.(':popover-open')) { try { host.hidePopover(); } catch { /* Already hidden. */ } }
  }
}
document.addEventListener('click', event => {
  const spin = event.target.closest?.('.v3-avatar-spin');
  if (!spin || spin.disabled) return;
  const now = performance.now();
  streak = now - lastClick <= STREAK_GAP ? streak + 1 : 1;
  lastClick = now;
  if (streak === 3) { turn = 0; spawn('You are now a developer!', true); }
  else if (streak > 3) spawn(nextPhrase(), false);
}, {passive: true});
