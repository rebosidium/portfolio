// One small decorative layer invites the first spin. It ends permanently for
// this visit after an accepted click or any earned coins, including Space.
export function mountSpinStartCue(button, game) {
  if (!button || !game || Number(game.dataset.coinTotal || 0) > 0) return;
  button.dataset.startCue = '';
  const cue = document.createElement('i'); cue.className = 'v3-spin-cue'; cue.setAttribute('aria-hidden','true');
  const sheen = document.createElement('i'); sheen.className = 'v3-spin-cue__sheen'; cue.append(sheen); button.append(cue);
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  let finished=false,settle=null;
  const stopSettle=()=>{settle?.cancel();settle=null;};
  const finish = () => {
    if(finished)return;finished=true;
    const angle=getComputedStyle(button).rotate;
    delete button.dataset.startCue;cue.remove();
    // Hand the visible tilt to a short settling animation instead of
    // snapping the button flat on the first click.
    if(!reduced.matches&&Math.abs(parseFloat(angle)||0)>.01){
      settle=button.animate([{rotate:angle},{rotate:'0deg'}],{duration:180,easing:'ease-out'});
      settle.finished.then(()=>{settle=null;},()=>{});
    }
  };
  game.addEventListener('v3-avatar-closing',stopSettle);
  reduced.addEventListener('change',()=>{if(reduced.matches)stopSettle();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopSettle();});
  button.addEventListener('click', () => {
    if (!button.disabled && !game.hasAttribute('data-load-error')) finish();
  }, {capture: true});
  game.addEventListener('v3-score-change', event => { if (event.detail.total > 0) finish(); });
}
