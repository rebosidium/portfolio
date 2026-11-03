import {createShareCard} from './spin-share-card.js';
import {coinTierFor} from './spin-coin.js';
import {mountCoinCollection} from './spin-coin-collection.js';

const game = document.querySelector('.v3-avatar-dialog');
const actions = game?.querySelector('.v3-avatar-actions');
const format = n => n.toLocaleString('en-US').replaceAll(',', '\u00a0');
const entry = new URL(location.href);
const localResults = ['127.0.0.1', 'localhost', '[::1]'].includes(entry.hostname);
const challengeValue = entry.searchParams.get('challenge');
const challenge = challengeValue && /^\d{1,16}$/.test(challengeValue) && Number.isSafeInteger(Number(challengeValue)) ? Number(challengeValue) : 0;
const milestones = [100, 500, 1000, 5000];
const qaKeys = ['analytics_test', 'analytics_owner', 'utm_source', 'utm_medium', 'utm_content'];
const carryQA = url => {
  for (const key of qaKeys) if (entry.searchParams.has(key)) url.searchParams.set(key, entry.searchParams.get(key));
  return url;
};

if (game && actions) {
  let total = Number(game.dataset.coinTotal) || 0;
  let snapshot = null, generation = 0, idle = 0, highlightTimer = 0;
  let milestoneSeen = 0, prompted = false, challengeBeaten = false;
  let cardObjectURL = null;

  const shareButton = document.createElement('button');
  shareButton.type = 'button'; shareButton.className = 'v3-score-share';
  shareButton.hidden = true; shareButton.setAttribute('aria-label', 'Share score');
  shareButton.setAttribute('aria-haspopup', 'dialog'); shareButton.setAttribute('aria-controls', 'v3-share-dialog');
  shareButton.innerHTML = '<span>SHARE RESULT <span class="v3-share-arrow">↗</span></span>';
  actions.append(shareButton);

  const target = document.createElement('p');
  target.className = 'v3-share-target'; target.hidden = !challenge;
  if (challenge) target.textContent = `Score to beat: ${format(challenge)} coins`;
  game.append(target);

  const sheet = document.createElement('dialog');
  sheet.id = 'v3-share-dialog'; sheet.className = 'v3-share-dialog';
  sheet.setAttribute('aria-labelledby', 'v3-share-title');
  sheet.innerHTML = `
    <div class="v3-share-heading"><div><p class="v3-share-eyebrow">SPIN CHALLENGE</p><h2 id="v3-share-title">Make it a challenge.</h2></div><button type="button" class="v3-share-close" aria-label="Back to game">×</button></div>
    <div class="v3-share-preview" aria-busy="true"><div class="v3-share-preview-fallback"><strong></strong><span>COINS · CAN YOU BEAT IT?</span></div><img alt="Your score challenge card" hidden></div>
    <p class="v3-share-summary"></p>
    <div class="v3-share-destinations">
      <button type="button" class="v3-share-linkedin"><span class="v3-share-in" aria-hidden="true">in</span><span>LinkedIn</span><span aria-hidden="true">↗</span></button>
      <button type="button" class="v3-share-telegram">Telegram <span aria-hidden="true">↗</span></button>
      <button type="button" class="v3-share-native">More apps <span aria-hidden="true">↗</span></button>
    </div>
    <section class="v3-share-linkedin-panel" aria-label="LinkedIn post" hidden>
      <p>Give your network a little challenge.</p>
      <textarea aria-label="LinkedIn post text" rows="4"></textarea>
      <div class="v3-share-linkedin-actions"><button type="button" class="v3-share-copy-post">Copy post text</button><button type="button" class="v3-share-open-linkedin" disabled>Open LinkedIn ↗</button></div>
      <p class="v3-share-instructions">Copy the text, open LinkedIn, then paste it into your post.</p>
    </section>
    <div class="v3-share-tools"><button type="button" class="v3-share-copy-link">Copy challenge link</button><button type="button" class="v3-share-download" disabled>Save image</button></div>
    <p class="v3-share-status" role="status" aria-live="polite"></p>
    <p class="v3-share-local">Local preview · links are available on this computer and the connected phone.</p>
  `;
  document.body.append(sheet);
  const $ = selector => sheet.querySelector(selector);
  $('.v3-share-local').hidden = !localResults;
  const preview = $('.v3-share-preview img');
  const status = message => { $('.v3-share-status').textContent = message; };
  const nativeButton = $('.v3-share-native');
  nativeButton.hidden = typeof navigator.share !== 'function';
  mountCoinCollection({game,actions,shareButton,sheet});

  const placeButton = () => {
    if (shareButton.hidden || !game.open) return;
    if (game.hasAttribute('data-coin-collection') && matchMedia('(orientation:landscape) and (max-height:520px)').matches) {
      shareButton.style.left = '50%'; shareButton.style.top = `${(actions.querySelector('.v3-coin-collection')?.offsetHeight || 0) + 12}px`; return;
    }
    const portrait = game.querySelector('[data-v3-avatar-large]')?.getBoundingClientRect();
    if (!portrait) return;
    const box = actions.getBoundingClientRect();
    const x = portrait.left + portrait.width / 2;
    shareButton.style.left = `${x - box.left}px`;
    const collectionHeight = game.hasAttribute('data-coin-collection') ? (actions.querySelector('.v3-coin-collection')?.offsetHeight || 0) + 12 : 0;
    shareButton.style.top = `${portrait.top + portrait.height * .974 + 42 + collectionHeight - box.top}px`;
  };
  new ResizeObserver(placeButton).observe(actions);
  new ResizeObserver(placeButton).observe(game.querySelector('.v3-avatar-score__num'));
  addEventListener('resize', placeButton, {passive: true});
  game.addEventListener('v3-avatar-opened', placeButton);

  const showNotice = text => {
    clearTimeout(highlightTimer);
    document.dispatchEvent(new CustomEvent('v3-game-share-invite', {detail: {text, tierId: coinTierFor(total).id}}));
    shareButton.dataset.highlight = '';
    highlightTimer = setTimeout(() => { delete shareButton.dataset.highlight; }, 5000);
  };
  const onScore = value => {
    total = value;
    shareButton.hidden = coinTierFor(total).minimum === 0;
    requestAnimationFrame(placeButton);
    clearTimeout(idle);
    const crossed = milestones.filter(n => total >= n).at(-1) || 0;
    const justBeat = challenge > 0 && !challengeBeaten && total > challenge;
    if (justBeat) {
      challengeBeaten = true; target.textContent = `You beat ${format(challenge)} coins!`;
      target.dataset.beaten = '';
    }
    if (crossed > milestoneSeen || justBeat) {
      milestoneSeen = crossed;
      // Wait until tapping has stopped. A single invitation per visit avoids
      // successive combo awards queuing multiple prompts.
      if (!prompted && !sheet.open) idle = setTimeout(() => {
        if (!game.open || sheet.open) return;
        prompted = true;
        showNotice(challengeBeaten ? '🏆 CHALLENGE BEATEN' : `🤩 WOW ${format(total)} COINS`);
      }, 1500);
    } else if (!prompted && milestoneSeen && !sheet.open) {
      idle = setTimeout(() => {
        if (!game.open || sheet.open) return;
        prompted = true;
        showNotice(challengeBeaten ? '🏆 CHALLENGE BEATEN' : `🤩 WOW ${format(total)} COINS`);
      }, 1500);
    }
  };
  game.addEventListener('v3-score-change', event => onScore(event.detail.total));
  onScore(total);

  const close = () => { sheet.close(); shareButton.focus({preventScroll: true}); };
  $('.v3-share-close').addEventListener('click', close);
  sheet.addEventListener('cancel', event => { event.preventDefault(); close(); });
  sheet.addEventListener('close', () => { ++generation; });
  game.addEventListener('v3-avatar-closing', () => {
    clearTimeout(idle); clearTimeout(highlightTimer);
    if (sheet.open) sheet.close();
  });

  const postText = result => `I came to explore a designer’s portfolio and got distracted by a mini-game.\n\n${format(result.score)} coins from spinning Dmitry Rybalka’s avatar. Can you beat my score?\n\n${result.url.href}`;
  const ensureResult = async result => {
    if (!result.promise) result.promise = (async () => {
      const blob = await createShareCard({score: result.score});
      result.blob = blob;
      // Static production hosting shares the challenge URL and generated PNG.
      // The local result service additionally provides immutable preview pages.
      if (!localResults) return result;
      const image = await new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob);
      });
      const response = await fetch('/api/game-results', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({score: result.score, image})});
      if (!response.ok) throw new Error('Result could not be saved');
      const saved = await response.json();
      result.url = carryQA(new URL(saved.path, location.origin));
      return result;
    })().catch(error => { result.promise = null; throw error; });
    return result.promise;
  };

  shareButton.addEventListener('click', async () => {
    if (sheet.open) return;
    clearTimeout(idle); prompted = true;
    const token = ++generation;
    const result = {score: total, url: carryQA(new URL('/3/', location.origin))};
    result.url.searchParams.set('game', ''); result.url.searchParams.set('challenge', String(total));
    snapshot = result;
    if (cardObjectURL) URL.revokeObjectURL(cardObjectURL);
    cardObjectURL = null; preview.hidden = true; preview.removeAttribute('src');
    $('.v3-share-preview-fallback strong').textContent = format(result.score);
    $('.v3-share-preview').setAttribute('aria-busy', 'true');
    $('.v3-share-summary').textContent = `${format(result.score)} coins. Your friends’ next distraction.`;
    $('.v3-share-linkedin-panel').hidden = true;
    $('.v3-share-open-linkedin').disabled = true;
    $('.v3-share-download').disabled = true;
    status('Preparing your challenge…');
    sheet.showModal();
    try {
      await ensureResult(result);
      if (token !== generation || !sheet.open) return;
      cardObjectURL = URL.createObjectURL(result.blob); preview.src = cardObjectURL; preview.hidden = false;
      $('.v3-share-preview').setAttribute('aria-busy', 'false');
      $('.v3-share-download').disabled = false;
      $('.v3-share-open-linkedin').disabled = false;
      $('.v3-share-linkedin-panel textarea').value = postText(result);
      status('Your challenge is ready.');
    } catch {
      if (token !== generation || !sheet.open) return;
      $('.v3-share-preview').setAttribute('aria-busy', 'false');
      $('.v3-share-linkedin-panel textarea').value = postText(result);
      $('.v3-share-open-linkedin').disabled = false;
      if (result.blob) {
        cardObjectURL = URL.createObjectURL(result.blob); preview.src = cardObjectURL; preview.hidden = false;
        $('.v3-share-download').disabled = false;
      }
      status('Card preview could not be saved. You can still copy a direct challenge link.');
    }
  });

  async function copy(text, success) {
    try { await navigator.clipboard.writeText(text); status(success); }
    catch {
      let field = $('.v3-share-manual');
      if (!field) { field = document.createElement('textarea'); field.className = 'v3-share-manual'; field.setAttribute('aria-label', 'Copy this text manually'); sheet.append(field); }
      field.value = text; field.focus(); field.select(); status('Select and copy the text below.');
    }
  }
  $('.v3-share-copy-link').addEventListener('click', () => { if (snapshot) copy(snapshot.url.href, 'Challenge link copied.'); });
  $('.v3-share-linkedin').addEventListener('click', () => {
    $('.v3-share-linkedin-panel').hidden = !$('.v3-share-linkedin-panel').hidden;
    $('.v3-share-linkedin-panel textarea').value = postText(snapshot);
    if (!$('.v3-share-linkedin-panel').hidden) $('.v3-share-linkedin-panel').scrollIntoView({block: 'nearest', behavior: 'instant'});
  });
  $('.v3-share-copy-post').addEventListener('click', () => copy($('.v3-share-linkedin-panel textarea').value, 'Post text copied. Paste it into LinkedIn.'));
  $('.v3-share-open-linkedin').addEventListener('click', () => {
    const destination = new URL('https://www.linkedin.com/sharing/share-offsite/');
    destination.searchParams.set('url', snapshot.url.href);
    window.open(destination.href, '_blank', 'noopener,noreferrer');
  });
  $('.v3-share-telegram').addEventListener('click', () => {
    const destination = new URL('https://t.me/share/url');
    destination.searchParams.set('url', snapshot.url.href);
    destination.searchParams.set('text', `I collected ${format(snapshot.score)} coins. Can you beat my score?`);
    window.open(destination.href, '_blank', 'noopener,noreferrer');
  });
  nativeButton.addEventListener('click', async () => {
    const result = snapshot;
    const file = result.blob ? new File([result.blob], `spin-${result.score}.png`, {type: 'image/png'}) : null;
    const data = {title: 'Spin challenge', text: `I collected ${format(result.score)} coins. Can you beat my score?`, url: result.url.href};
    if (file && navigator.canShare?.({files: [file]})) data.files = [file];
    try { await navigator.share(data); status('Challenge handed to your chosen app.'); }
    catch (error) { if (error.name !== 'AbortError') status('Sharing is unavailable here. Copy the challenge link instead.'); }
  });
  $('.v3-share-download').addEventListener('click', () => {
    if (!snapshot?.blob) return;
    // A separate URL lets a slow download finish even if the preview closes
    // and a new score card revokes the old preview URL (notably in WebKit).
    const downloadURL = URL.createObjectURL(snapshot.blob);
    const link = document.createElement('a'); link.href = downloadURL; link.download = `spin-${snapshot.score}-coins.png`; link.click();
    setTimeout(() => URL.revokeObjectURL(downloadURL), 60000);
    status('Image download started. Add your challenge link when you post it.');
  });
}
