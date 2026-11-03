import {coinTierFor,coinImageURL} from './spin-coin.js?v=1eba002e9c3b';
import {createDemoLeaderboard} from './spin-leaderboard-data.js?v=0e0f190e90ea';
const trophy='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3h8v6a4 4 0 0 1-8 0V3Z"/><path d="M8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 13v5m-4 3h8m-6-3h4v3"/></svg>';
const format=n=>n.toLocaleString('en-US').replaceAll(',','\u00a0');
export function mountLeaderboard(game,hide) {
  if(!game||!hide)return;
  const reduced=matchMedia('(prefers-reduced-motion:reduce)'),players=createDemoLeaderboard(),you=players.find(player=>player.isYou);
  const toggle=document.createElement('button');toggle.type='button';toggle.className='v3-leaderboard-toggle';
  toggle.setAttribute('aria-label','Tournament leaderboard');toggle.title='Tournament leaderboard';toggle.setAttribute('aria-haspopup','dialog');toggle.setAttribute('aria-controls','v3-leaderboard');toggle.innerHTML=trophy;game.append(toggle);
  const board=document.createElement('dialog');board.id='v3-leaderboard';board.className='v3-leaderboard';board.setAttribute('aria-labelledby','v3-leaderboard-title');
  board.innerHTML=`<header class="v3-leaderboard__header"><div class="v3-leaderboard__heading"><span class="v3-leaderboard__emblem">${trophy}</span><div><p class="v3-leaderboard__eyebrow">THE TOP 50</p><h2 id="v3-leaderboard-title">Spin League</h2></div></div><button class="v3-leaderboard__close" type="button" aria-label="Back to game">×</button></header><div class="v3-leaderboard__intro"><p>A little spin. A big reputation.</p><span>DEMO TOURNAMENT</span></div><div class="v3-leaderboard__scroll" tabindex="0" role="region" aria-label="Top 50 players"><table><thead><tr><th scope="col">#</th><th scope="col">PLAYER</th><th scope="col">COINS</th></tr></thead><tbody></tbody></table></div><footer class="v3-leaderboard__footer"><div><span class="v3-leaderboard__place">#${you.rank}</span><div><strong>Your place</strong><span>You’re in good company.</span></div></div><button type="button" class="v3-leaderboard__find">Find me ↗</button></footer>`;
  document.body.append(board);
  const closeButton=board.querySelector('.v3-leaderboard__close'),scroll=board.querySelector('.v3-leaderboard__scroll');
  let populated=false;
  function populate(){
    if(populated)return;populated=true;
    const fragment=document.createDocumentFragment();
    for(const player of players){
      const tier=coinTierFor(player.score),row=document.createElement('tr');
      if(player.isYou){row.dataset.you='';row.setAttribute('aria-current','true');}
      const rank=document.createElement('td');rank.className='v3-leaderboard__rank';rank.textContent=player.rank<=3?['🥇','🥈','🥉'][player.rank-1]:String(player.rank);rank.setAttribute('aria-label',`Rank ${player.rank}`);
      const person=document.createElement('td'),profile=document.createElement('div');profile.className='v3-leaderboard__profile';
      const avatar=document.createElement('span');avatar.className='v3-leaderboard__avatar';avatar.style.setProperty('--avatar-hue',String((player.rank*47+240)%360));avatar.textContent=player.initials;
      const text=document.createElement('div'),name=document.createElement('strong'),level=document.createElement('span');name.textContent=player.name;level.textContent=tier.label;level.className='v3-leaderboard__level';text.append(name,level);profile.append(avatar,text);person.append(profile);
      const coins=document.createElement('td'),score=document.createElement('div');score.className='v3-leaderboard__score';const image=new Image();image.src=coinImageURL(tier);image.alt='';image.width=28;image.height=28;image.loading='lazy';const number=document.createElement('span');number.textContent=format(player.score);score.append(number,image);coins.append(score);
      row.append(rank,person,coins);fragment.append(row);
    }
    board.querySelector('tbody').append(fragment);
  }
  function place(){if(!game.open)return;const rect=hide.getBoundingClientRect();toggle.style.top=`${rect.top}px`;toggle.style.left=`${rect.left-58}px`;}
  function close(){if(!board.open)return;board.close();delete game.dataset.leaderboardOpen;if(game.open&&!game.v3AvatarShell?.closing)toggle.focus({preventScroll:true});}
  toggle.addEventListener('click',()=>{if(!game.open||game.v3AvatarShell?.closing)return;populate();game.dataset.leaderboardOpen='';board.showModal();scroll.scrollTop=0;closeButton.focus({preventScroll:true});});
  closeButton.addEventListener('click',close);
  board.addEventListener('cancel',event=>{event.preventDefault();close();});
  board.addEventListener('close',()=>{delete game.dataset.leaderboardOpen;});
  board.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const controls=[closeButton,scroll,board.querySelector('.v3-leaderboard__find')],index=controls.indexOf(document.activeElement);event.preventDefault();controls[(index+(event.shiftKey?-1:1)+controls.length)%controls.length].focus({preventScroll:true});});
  board.querySelector('.v3-leaderboard__find').addEventListener('click',()=>{
    const row=board.querySelector('[data-you]');if(!row)return;
    const rect=row.getBoundingClientRect(),view=scroll.getBoundingClientRect();
    scroll.scrollTo({top:scroll.scrollTop+rect.top-view.top-(scroll.clientHeight-rect.height)/2,behavior:reduced.matches?'instant':'smooth'});
  });
  game.addEventListener('v3-avatar-opening',()=>{toggle.style.opacity='';place();});game.addEventListener('v3-avatar-opened',place);
  game.addEventListener('v3-avatar-closing',()=>{toggle.style.opacity='0';if(board.open)board.close();delete game.dataset.leaderboardOpen;});
  game.addEventListener('close',()=>{if(board.open)board.close();});
  addEventListener('resize',place,{passive:true});place();
}
