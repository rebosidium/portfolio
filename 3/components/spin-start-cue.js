// One small decorative layer invites the first spin. It ends permanently for
// this visit after an accepted click or any earned coins, including Space.
export function mountSpinStartCue(button, game) {
  if (!button || !game || Number(game.dataset.coinTotal || 0) > 0) return;
  button.dataset.startCue = '';
  const cue = document.createElement('i'); cue.className = 'v3-spin-cue'; cue.setAttribute('aria-hidden','true');
  const sheen = document.createElement('i'); sheen.className = 'v3-spin-cue__sheen'; cue.append(sheen); button.append(cue);
  const finish = () => { delete button.dataset.startCue; cue.remove(); };
  button.addEventListener('click', () => {
    if (!button.disabled && !game.hasAttribute('data-load-error')) finish();
  }, {capture: true});
  game.addEventListener('v3-score-change', event => { if (event.detail.total > 0) finish(); });
}
