// Easter egg: clicking Spin shows a top notification, and carrying on quickly
// piles up short jokes that stack, wobble loose and fall away.
// Three kinds of jokes, shown in rotation: office/manager, designer, technical.
const JOKES = {
  office: [
    '📞 Let’s take this to another call',
    'Per my last email… 📧',
    'Reply-all storm detected. Evacuate.',
    'This could have been an email',
    'Quick sync? (45 minutes)',
    'We’ll add it to the backlog',
    'Let’s align offline',
    'I’ll loop in the stakeholders',
    'Can you do it by yesterday?',
    '📅 Deadline moved. Again.',
    'We’re agile (we have no plan)',
    'Action items: more meetings',
    'Mute yourself, please 🔇',
    'Can everyone see my 🖥️ screen?',
    'Let’s not boil the ocean',
    'That’s out of scope. Do it anyway.',
    'Synergy detected',
    'Coffee level: critical ☕',
    'That’s convenient. You just don’t know it yet.',
    'Let’s sync on the sync',
    'A meeting about the meeting, at 3',
    'Friendly reminder of my last friendly reminder',
    'Reply-all is a lifestyle',
    'KPIs are up 📈. Nobody knows why.',
    'Priority 1: everything',
    'ASAP means “whenever”, with feelings',
    'Planned for Q1. Which year?',
    'New process: approve the approval',
    'Please find the doc attached 📎. It isn’t.',
    'Let’s workshop it. Bring snacks.',
    'Out of office until the deadline passes',
    'Can we circle back after the circle back?',
    'Junior role: 10 years of experience required',
    'Standup ran 47 minutes. Please sit down.',
    'Free 🍕 pizza: the team’s only KPI',
    'Wait, let me connect my 🎧 headphones',
    'Colleagues, I need to meet a courier 📦',
    'The 🐶 dog ate my homework',
    '🎤 Can anyone hear me?',
    'Your voice turned into little squares',
    'That’s what she said',
    'I declare bankruptcy! 💸',
    'Why waste time say lot word when few word do trick?',
    'Identity theft is not a joke, Jim!',
    'Dundie 🏆 goes to… everyone',
    'OKR-R-R-RR-RRRR 🐯',
    'I don’t tip. I leave Figma comments. 💸',
    'This is Sparta! Three designers. One button. ⚔️',
    '🎨 Dobby is free! First draft approved.',
    '🤝 Privet Tovarisch',
    '🧢 MAKE SCRUM GREAT AGAIN'
  ],
  design: [
    'That 🩷 pink is a bold choice',
    'Can we try it in 🔵 blue?',
    'Make the logo bigger 🔍',
    'Can you make it pop? 💥',
    'Contrast ratio: trust me',
    '🎨 Gradients: never too many',
    '#FF0000 is not a mood',
    'Orange 🟠 is the new teal',
    'Two greys 🩶. I can’t tell either.',
    'Purple gradient detected 🟣. AI did this.',
    'Dark mode 🌙 unlocked. Obviously.',
    'Round the corners. More.',
    'Padding. More padding.',
    '8px grid or nothing',
    'Kerning: a cry for help',
    'Comic Sans detected 🚨. Evacuate.',
    'Lorem ipsum dolor sit amet',
    'It’s not a 🐛 bug, it’s a design decision',
    'Final_final_v7_REAL.fig',
    'design_final_final_2',
    'frame_407_copy_copy_12',
    '🙈 I’m not opening Figma!',
    'Auto layout is life',
    'Figma is thinking… 🤔',
    'Pixel-perfect (zoom 400%)',
    'Make it look like Apple (budget: Paint)',
    'Can you make the logo bigger? Bigger.',
    'More pop. Less pop. Just pop.',
    '“Clean and minimal.” Add three more banners.',
    'Feedback: “I’ll know it when I see it”',
    'That’s not white. That’s “warm cloud”.',
    'Add a gradient. Remove it. Add it back.',
    'Fonts: 2. Opinions: 140 🗣️.',
    'The icon is right. The meaning is not.',
    'It’s not 2px off. It’s 2px of character.',
    'Moodboard approved ✅. Reality rejected.',
    'Make it look expensive 💎 (budget: $3)',
    'User research: n = my colleague',
    'Mobile first, desktop last, designer never',
    'Logo in 5 minutes (it’s our whole brand)',
    'Wireframe approved. Colour: surprise me.',
    'Dribbble 🏀 says yes. Users say: where’s the button?',
    'It’s Triple 💎💎💎 Diamond!',
    'DESIGN_SYSTEM.md: 60 Shades of Grey.',
    'Banned purple 🟣 in DESIGN_SYSTEM.md.',
    '🐢 Run, Figma, run! It’s only 60,000 layers.',
    'Shut the fuck up, Donny! Just fix the 🔘 button.',
    'Red pill or blue pill? The AI made a 🟣 gradient.',
    'It’s interesting to me, so it must be interesting to you. 😏'
  ],
  tech: [
    'Compiling confidence…',
    'It works on my 💻 machine',
    'git push --force (to my heart ❤️)',
    'Have you tried turning it off and on again? 🔌',
    '404: Sleep not found 😴',
    'Semicolon found. Peace restored. 🕊️',
    'Stack Overflow is typing… ⌨️',
    'npm install motivation',
    'Merge conflict with reality',
    'Ctrl+C, Ctrl+V — senior engineer',
    'Deploying on a Friday. Brave. 🦁',
    'Fixed one bug, found three',
    'The 🦆 rubber duck approves',
    'TODO: touch grass 🌱',
    'sudo make me a 🥪 sandwich',
    'while (true) { spin(); }',
    'undefined is not a function',
    'Please stop. The head is dizzy. 😵‍💫',
    'Vibes passed. Tests didn’t.',
    '🤖 The AI wrote it. Nobody read it.',
    'Prompt engineering: saying “please” with extra steps',
    'The model is 100% sure. It’s also wrong.',
    'Hallucinating, but with great confidence',
    'Ten agents running 🏃. Nothing happening.',
    'Security? It interferes with the vibes.',
    'git blame: the AI',
    'You: fix one bug. AI: fixed three, added five',
    'Context window full. So am I. 🍽️',
    'Tokens spent. Wisdom not found.',
    'The AI apologises politely and breaks it again',
    'Works in the demo. The demo is the product.',
    'We replaced the bug with a better bug',
    'The AI deleted the tests. Tests now pass.',
    'console.log in production. Evacuate. 🚨',
    'Estimate: 2 days. Reality: 2 sprints.',
    'Compacting conversation… 🗜️',
    '🛎️ DETACH INSTANCE!!!',
    'Finally, someone listens to me. For $20 a month. 🥹',
    'Bought more tokens. Only $19,000. 💸',
    'AGENTS.md / 60,000 lines.',
    'Banned bugs in AGENTS.md.',
    'Not reading code, Karpathy-style. 😎',
    '🚀 Houston, we have a problem. Token limit reached.',
    'No, I am your father. Source: 🤖 ChatGPT.',
    'D’ya like dags? The AI gave mine eight legs. 🕷️',
    'I’m not a meat proxy. I’m a muscle-powered MCP. 💪'
  ]
};
const ORDER = ['office', 'design', 'tech'];
// Show the entire pool before repeating: rotate kinds, skipping any exhausted ones.
// Unequal kind sizes must not restart the shortest deck while others still have unseen jokes.
// Keep history and the rotation cursor across reloads when localStorage is available.
const SEEN_KEY = 'v3-egg-seen-v2';
let seen = {office: [], design: [], tech: []}, turn = 0, last = '';
try {
  const stored = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}');
  for (const kind of ORDER) if (Array.isArray(stored[kind])) seen[kind] = [...new Set(stored[kind].filter(text => JOKES[kind].includes(text)))];
  if (Number.isSafeInteger(stored.turn) && stored.turn >= 0) turn = stored.turn % ORDER.length;
  if (ORDER.some(kind => JOKES[kind].includes(stored.last))) last = stored.last;
} catch { /* Keep empty memory. */ }
const nextPhrase = () => {
  if (ORDER.every(kind => JOKES[kind].every(text => seen[kind].includes(text)))) {
    for (const kind of ORDER) seen[kind] = [];
  }
  for (let i = 0; i < ORDER.length; i++) {
    const kind = ORDER[turn];
    turn = (turn + 1) % ORDER.length;
    const fresh = JOKES[kind].filter(text => !seen[kind].includes(text));
    if (!fresh.length) continue;
    const choices = fresh.filter(text => text !== last);
    const pool = choices.length ? choices : fresh;
    const text = pool[Math.floor(Math.random() * pool.length)];
    seen[kind].push(text);
    last = text;
    try { localStorage.setItem(SEEN_KEY, JSON.stringify({...seen, turn, last})); } catch { /* Private mode: session-only memory. */ }
    return text;
  }
};
const MAX_VISIBLE = 5, NEAT = 3, IDLE_RELEASE = 3200, GRAVITY = 2300;
const COIN_LEVELS = {
  wood:['🪵','WOOD LEVEL'],cracker:['🧂','CRACKER LEVEL'],stone:['🪨','STONE LEVEL'],amber:['🦟','AMBER LEVEL'],'six-seven':['🫨','SIX SEVEN LEVEL'],lava:['🔥','LAVA LEVEL'],bronze:['🥉','BRONZE LEVEL'],silver:['🥈','SILVER LEVEL'],
  gold:['🥇','GOLD LEVEL'],platinum:['🤍','PLATINUM LEVEL'],diamond:['💎','DIAMOND LEVEL'],
  ruby:['💎','RUBY LEVEL'],'black-diamond':['🖤','BLACK GEM'],emerald:['💚','EMERALD LEVEL'],holographic:['✨','HOLO LEVEL'],button:['🧵','BUTTON LEVEL'],soda:['🥤','RIBA DIMA'],
  donut:['🍩','DONUT LEVEL'],surstromming:['🐟','FISH CAN LEVEL'],spam:['🥫','SPAM LEVEL'],trash:['🗑️','TRASH LEGEND'],ufo:['🛸','UFO LEVEL'],chest:['🏴‍☠️','TREASURE LEVEL']
};
const validCoinTier = id => typeof id === 'string' && Object.hasOwn(COIN_LEVELS, id);
const reduced = matchMedia('(prefers-reduced-motion:reduce)');
const sideways = matchMedia('(orientation: landscape) and (max-height: 520px)');   // portrait on the left half, jokes over it
const live = [], falling = new Set();
let host = null, shown = 0, raf = 0, idle = 0, lastFrame = 0;
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
function spawn(text, strong, shareInvite = false) {
  const el = document.createElement('div');
  el.className = 'v3-egg__toast' + (strong ? ' v3-egg__toast--strong' : '');
  el.textContent = text;
  if (shareInvite) {
    el.classList.add('v3-egg__toast--share');
  }
  // The first three notifications stack neatly; later ones land on top crooked.
  const neat = shown++ < NEAT || shareInvite;
  const item = neat
    ? {el, x: rand(-8, 8), y: rand(0, 6), rot: rand(-2, 2), vx: 0, vy: 0, spin: 0, wobble: 0, scale: 1}
    : {el, x: rand(-38, 38), y: rand(6, 30), rot: rand(-10, 10), vx: 0, vy: 0, spin: 0, wobble: 0, scale: 1};
  if (shareInvite) {
    item.x = rand(-10, 10); item.y = rand(0, 6);
    item.rot = rand(2.5, 5.5) * (Math.random() < .5 ? -1 : 1);
  }
  ensureHost().append(el);
  // The pile grows with every notification (up to +45% on phones, +85% on desktop),
  // never wider than the screen.
  const desktop = innerWidth > 800;
  const growth = 1 + Math.min(desktop ? .85 : .45, Math.max(0, shown - 1) * (desktop ? .08 : .045));
  if (shareInvite) {
    // Fit the projected, rotated capsule, including its sideways offset.
    // Keep the large type without letting the crooked corners leave the lane.
    const angle = Math.abs(item.rot) * Math.PI / 180;
    const projectedWidth = el.offsetWidth * Math.cos(angle) + el.offsetHeight * Math.sin(angle);
    const available = innerWidth * (sideways.matches ? .44 : 1) - 40 - 2 * Math.abs(item.x);
    const celebrationGrowth = 1.12 + Math.min(.18, Math.max(0, shown - 1) * .02);
    item.scale = Math.min(celebrationGrowth, Math.max(1, available) / Math.max(1, projectedWidth));
  } else {
    item.scale = Math.max(1, Math.min(growth, innerWidth * (sideways.matches ? .44 : .94) / Math.max(1, el.offsetWidth)));
  }
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
  return el;
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
    if (!live.length && !host?.querySelector('.v3-fly-num,.v3-fly-ring') && host?.matches?.(':popover-open')) { try { host.hidePopover(); } catch { /* Already hidden. */ } }
  }
}
// The first five clicks (even with pauses between them) show a fixed opening, like Android's
// developer-mode countdown; every later click adds the next joke in the rotation.
const INTRO = [
  ['Click 2 more times to become a developer', false],
  ['Click 1 more time to become a developer', false],
  ['You are now a developer!', true],
  ['You are now a vibe coder!', true],
  ['I’M A VIBECODEEER, MOM!', true]
];
let introIndex = 0, lastJoke = 0;
document.addEventListener('v3-game-share-invite', event => {
  const game = document.querySelector('.v3-avatar-dialog[open]');
  if (!game || document.querySelector('.v3-share-dialog[open],.v3-leaderboard[open]') || typeof event.detail?.text !== 'string') return;
  const currentTier = game.querySelector('.v3-avatar-score')?.dataset.coinTier;
  const tierId = validCoinTier(event.detail.tierId) ? event.detail.tierId : validCoinTier(currentTier) ? currentTier : 'wood';
  const message = spawn(event.detail.text, true, true);
  message.dataset.coinTier = tierId;
});
document.addEventListener('v3-coin-level', event => {
  if (!document.querySelector('.v3-avatar-dialog[open]') || document.querySelector('.v3-share-dialog[open],.v3-leaderboard[open]')) return;
  const tier = event.detail?.tier;
  if (!tier || !validCoinTier(tier.id)) return;
  const [emoji, label] = COIN_LEVELS[tier.id];
  const message = spawn(`${emoji} ${label}`, true, true);
  message.dataset.coinTier = tier.id;
});
document.addEventListener('click', event => {
  const spin = event.target.closest?.('.v3-avatar-spin');
  if (!spin || spin.disabled) return;
  if (introIndex < INTRO.length) { const [text, strong] = INTRO[introIndex++]; spawn(text, strong); }
  else {
    // Fast tapping adds at most ~4 jokes a second, so the pile and the falling ones stay small.
    const now = performance.now();
    if (now - lastJoke < 260) return;
    lastJoke = now;
    spawn(nextPhrase(), false);
  }
}, {passive: true});
