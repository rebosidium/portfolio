import {getSvgPath} from './card-squircle.js?v=e69287c61f97';
import {mountMesh} from './card-shader-runtime.js?v=1901744a2682';
const projects=[
 {id:'larixon',prefix:'Building for',company:'Larixon Classifieds',tail:'a design function across markets and product teams with 5M MAU.',logo:'larixon.svg?v=0165cbf89d57'},
 {id:'brokerage',prefix:'Designing for',company:'Raiffeisen Bank',tail:'a professional trading terminal for 500+ institutional clients.',logo:'logo-raiffeisen.svg?v=74f1746e3599'},
 {id:'leasing',prefix:'Connecting',company:'Raiffeisen Leasing',tail:'workflows, from the first calculation to a signed contract.',logo:'logo-raiffeisen.svg?v=74f1746e3599'},
 {id:'yandex',prefix:'Helping',company:'Yandex Market',tail:'sellers understand performance and build better product catalogues.',logo:'logo-yandex.svg?v=2f51118ffe47'},
 {id:'gdematerial',prefix:'Creating for',company:'GdeMaterial',tail:'a marketplace for discovery, checkout and delivery.',logo:'logo-gdematerial.svg?v=2bfcfc37a73b'},
 {id:'medesk',prefix:'Designing for',company:'Medesk',tail:'connected clinic and patient workflows across 35 countries.',logo:'logo-medesk.svg?v=f5badc4055d4'}
];
export function mountCaseCards(host=document.querySelector('.v3-page')){
 if(!host||host.querySelector('.v3-cases'))return;
 const section=document.createElement('section');section.className='v3-cases';section.id='v3-case-studies';section.setAttribute('aria-labelledby','v3-cases-title');
 section.innerHTML='<h2 class="v3-cases__title" id="v3-cases-title">Case Studies</h2><div class="v3-case-columns"><div class="v3-case-column" data-speed="0.13"></div><div class="v3-case-column" data-speed="-0.10"></div></div>';
 section.querySelector('.v3-cases__title').dataset.reveal='pending';
 const columns=[...section.querySelectorAll('.v3-case-column')];
 for(const [index,project]of projects.entries()){
  const article=document.createElement('article');article.className='v3-case-card';article.dataset.project=project.id;article.dataset.reveal='pending';article.style.setProperty('--v3-card-order',String(index));
  const [firstWord,...remainingWords]=project.company.split(' ');
  article.innerHTML=`<div class="v3-case-cover-pin"><div class="v3-case-cover-reveal"><div class="v3-case-cover-visual"><div class="v3-case-cover" aria-hidden="true"><canvas data-card-index="${index}"></canvas></div></div></div></div><div class="v3-case-copy"><h3>${project.prefix} <span class="v3-case-brand-lead"><span class="v3-case-logo${project.id==='larixon'?' v3-case-logo--larixon':''}"><img src="/3/assets/case-logos/${project.logo}" alt="" decoding="async"></span><span class="v3-case-company">${firstWord}</span></span>${remainingWords.length?' <span class="v3-case-company">'+remainingWords.join(' ')+'</span>':''} ${project.tail}</h3></div>`;
  columns[index%2].append(article);
 }
 host.append(section);
 const reduced=matchMedia('(prefers-reduced-motion:reduce)'),desktop=matchMedia('(min-width:801px)');
 // Size the initial teaser from stable flow boxes, not from the sticky
 // cover's transformed rectangle. Small viewport units ignore Safari toolbar
 // expansion; recompute only when layout, fonts or the viewport change.
 const teaserViewport=document.createElement('span');
 teaserViewport.style.cssText='position:absolute;visibility:hidden;pointer-events:none;width:0;height:100svh;inset:0 auto auto 0';
 teaserViewport.setAttribute('aria-hidden','true');section.append(teaserViewport);
 let teaserFrame=0;
 function fitTeaser(){
  teaserFrame=0;
  const flowY=element=>{let y=0;for(let node=element;node;node=node.offsetParent)y+=node.offsetTop;return y;};
  const height=teaserViewport.offsetHeight||innerHeight;
  const peek=Math.max(28,Math.min(52,Math.round(height*.055)));
  const leading=innerWidth>800?columns.map(column=>column.firstElementChild):[section.querySelector('.v3-case-card')];
  const current=parseFloat(getComputedStyle(section).marginTop)||0;
  const normalCoverTop=Math.min(...leading.map(flowY))-current;
  const gap=Math.max(innerWidth>800&&height<=800?24:innerWidth<=480?48:64,height-peek-normalCoverTop);
  const next=`${Math.round(gap)}px`;
  if(section.style.getPropertyValue('--v3-case-teaser-gap')!==next){section.style.setProperty('--v3-case-teaser-gap',next);requestAnimationFrame(measure);}
 }
 const queueTeaser=()=>{if(!teaserFrame)teaserFrame=requestAnimationFrame(fitTeaser);};
 const teaserResize=typeof ResizeObserver==='function'?new ResizeObserver(queueTeaser):null;
 for(const el of [document.querySelector('.v3-header'),document.querySelector('.v3-hero'),section.querySelector('.v3-cases__title'),teaserViewport])if(el)teaserResize?.observe(el);
 addEventListener('resize',queueTeaser,{passive:true});
 document.fonts?.ready.then(queueTeaser);

 let raf=0,visible=true;
 const covers=[...section.querySelectorAll('.v3-case-cover')];
 const cards=[...section.querySelectorAll('.v3-case-card')].map(article=>({article,pin:article.querySelector('.v3-case-cover-pin'),copy:article.querySelector('.v3-case-copy'),height:0,copyOffset:0,flowTop:0,articleHeight:0,column:article.parentElement}));
 // Reveal once, with a small upward drift. No hidden content without JS.
 const revealItems=[section.querySelector('.v3-cases__title'),...section.querySelectorAll('.v3-case-card')];
 const initialGroup=new Set([revealItems[0],cards[0].article,cards[1].article]);
 const waitForHero=!!window.v3Entrance?.contentReady&&!reduced.matches&&!document.hidden;
 let initialReleased=!waitForHero,initialTimer=0;
 const revealObserver=new IntersectionObserver(changes=>{
  for(const {target,isIntersecting} of changes)if(isIntersecting){target.dataset.reveal='visible';revealObserver.unobserve(target);}
 },{rootMargin:'0px 0px -32px 0px',threshold:.04});
 for(const element of revealItems){
  const gated=waitForHero&&initialGroup.has(element),teaser=element===cards[0].article;
  element.dataset.reveal=reduced.matches||teaser&&!gated?'visible':'pending';
  if(!reduced.matches&&!gated&&!teaser)revealObserver.observe(element);
 }
 function settleInitial(){
  clearTimeout(initialTimer);initialReleased=true;
  for(const element of initialGroup)element.dataset.reveal='visible';
 }
 if(waitForHero)window.v3Entrance.contentReady.then(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
  if(initialReleased)return;
  if(reduced.matches||document.hidden){settleInitial();return;}
  // Continue the hero sequence with the heading, then the first visual row.
  // Existing reveal layers keep the sticky article geometry untransformed.
  revealItems[0].dataset.reveal='visible';
  initialTimer=setTimeout(()=>{
   initialReleased=true;cards[0].article.dataset.reveal='visible';
   if(desktop.matches)cards[1].article.dataset.reveal='visible';
   else revealObserver.observe(cards[1].article);
  },200);
 })));
 reduced.addEventListener('change',()=>{if(reduced.matches){settleInitial();revealObserver.disconnect();for(const element of revealItems)element.dataset.reveal='visible';}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&!initialReleased)settleInitial();});
 addEventListener('pagehide',()=>{if(!initialReleased)settleInitial();},{once:true});
 // Scrolling past the entrance threshold skips the remaining sequence: the
 // heading and first row appear at once instead of staying empty in view.
 // On a single mobile column the second card still waits for intersection.
 function releaseOnScroll(){
  if(scrollY<=32)return;
  removeEventListener('scroll',releaseOnScroll);
  if(initialReleased)return;
  clearTimeout(initialTimer);initialReleased=true;
  revealItems[0].dataset.reveal=cards[0].article.dataset.reveal='visible';
  if(desktop.matches)cards[1].article.dataset.reveal='visible';
  else revealObserver.observe(cards[1].article);
 }
 if(waitForHero)addEventListener('scroll',releaseOnScroll,{passive:true});
 const fine=matchMedia('(hover:hover) and (pointer:fine)');
 let hoverFrame=0,hoverPoint=null;
 function resetHover(cover){cover.style.setProperty('--v3-card-rx','0deg');cover.style.setProperty('--v3-card-ry','0deg');delete cover.dataset.hovering;}
 function applyHover(){
  hoverFrame=0;if(!hoverPoint)return;
  const {cover,x,y}=hoverPoint;hoverPoint=null;
  if(!fine.matches||reduced.matches||document.hidden){resetHover(cover);return;}
  cover.style.setProperty('--v3-card-rx',`${(-y*1.2).toFixed(2)}deg`);
  cover.style.setProperty('--v3-card-ry',`${(x*1.2).toFixed(2)}deg`);
  cover.style.setProperty('--v3-card-pointer-x',`${((x+1)*50).toFixed(1)}%`);
  cover.style.setProperty('--v3-card-pointer-y',`${((y+1)*50).toFixed(1)}%`);
  cover.dataset.hovering='true';
 }
 for(const cover of covers){
  cover.addEventListener('pointermove',event=>{
   if(event.pointerType!=='mouse'||!fine.matches||reduced.matches)return;
   const rect=cover.getBoundingClientRect();
   hoverPoint={cover,x:Math.max(-1,Math.min(1,(event.clientX-rect.left)/rect.width*2-1)),y:Math.max(-1,Math.min(1,(event.clientY-rect.top)/rect.height*2-1))};
   if(!hoverFrame)hoverFrame=requestAnimationFrame(applyHover);
  },{passive:true});
  cover.addEventListener('pointerleave',()=>{if(hoverPoint?.cover===cover)hoverPoint=null;resetHover(cover);});
 }
 const clearHover=()=>{cancelAnimationFrame(hoverFrame);hoverFrame=0;hoverPoint=null;covers.forEach(resetHover);};
 fine.addEventListener('change',clearHover);reduced.addEventListener('change',clearHover);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearHover();});
 function measure(){
  for(const element of section.querySelectorAll('.v3-case-cover,.v3-case-copy')){
   const style=getComputedStyle(element),width=parseFloat(style.width),height=parseFloat(style.height);if(!width||!height)continue;
   element.style.clipPath=`path('${getSvgPath({width,height,cornerRadius:32,cornerSmoothing:1,preserveSmoothing:true})}')`;
  }
  for(const card of cards){
   card.height=parseFloat(getComputedStyle(card.pin).height);card.copyOffset=card.copy.offsetTop;card.articleHeight=card.article.offsetHeight;
   const columnTransform=getComputedStyle(card.column).transform,revealTransform=getComputedStyle(card.article).transform;
   const columnY=columnTransform==='none'?0:new DOMMatrix(columnTransform).m42;
   const revealY=revealTransform==='none'?0:new DOMMatrix(revealTransform).m42;
   // Cache normal flow once after layout changes. A pending entrance must not
   // feed its animated transform back into scroll progress on every frame.
   card.flowTop=card.article.getBoundingClientRect().top+scrollY-columnY-revealY;
  }
  schedule();
 }
 function draw(){
  raf=0;if(!visible||document.hidden||document.querySelector('dialog[open]'))return;
  const active=desktop.matches&&!reduced.matches;
  const pageY=scrollY,progress=Math.max(0,Math.min(2200,pageY));
  const offsets=columns.map(column=>active?progress*Number(column.dataset.speed):0);
  // All geometry was measured before this write pass. No forced layout reads
  // between scaling covers, translating copy and updating the column offsets.
  columns.forEach((column,index)=>{
   const offset=offsets[index];column.style.transform=active?`translateY(${offset}px)`:'none';
   column.style.setProperty('--v3-column-offset',`${offset}px`);
  });
  const stackTop=desktop.matches?24:16;
  for(const {article,height,copyOffset,pin,flowTop,articleHeight,column} of cards){
   const articleTop=flowTop-pageY+offsets[columns.indexOf(column)];
   const overlap=reduced.matches?0:Math.max(0,Math.min(1,(stackTop+height-articleTop-copyOffset)/Math.max(1,height)));
   const eased=overlap*overlap*(3-2*overlap),stackScale=1-eased*(desktop.matches ? .03 : .07);
   article.style.setProperty('--v3-stack-scale',String(stackScale));
   article.style.setProperty('--v3-stack-opacity',String(1-Math.pow(eased,desktop.matches?2:1.25)));
   article.style.setProperty('--v3-stack-lift',`${-eased*(desktop.matches?10:20)}px`);
   article.dataset.stackProgress=overlap.toFixed(3);
   pin.toggleAttribute('data-stack-covered',overlap>=1&&!reduced.matches);
   const factor=Math.min(1,Math.max(0,pageY/180)),scale=active?1+.22*factor:1;
   const pinTop=Math.min(Math.max(articleTop,stackTop),articleTop+articleHeight-height);
   const desired=active?Math.max(-36,Math.min(36,(innerHeight/2-(pinTop+height*stackScale/2))*.06))*factor:0;
   const margin=Math.max(0,height*(scale-1)/2-.5);
   article.style.setProperty('--v3-cover-shift',`${Math.max(-margin,Math.min(margin,desired))}px`);
   article.style.setProperty('--v3-cover-scale',String(scale));
  }
 }
 function schedule(){if(!raf)raf=requestAnimationFrame(draw);}
 const size=new ResizeObserver(measure);size.observe(section);section.querySelectorAll('.v3-case-copy').forEach(el=>size.observe(el));
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)schedule()},{rootMargin:'200px'});observer.observe(section);
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',measure,{passive:true});reduced.addEventListener('change',measure);desktop.addEventListener('change',measure);document.addEventListener('visibilitychange',schedule);
 new MutationObserver(()=>{if(!document.querySelector('dialog[open]'))measure();}).observe(document.documentElement,{attributes:true,attributeFilter:['open'],subtree:true});
 fitTeaser();measure();document.fonts?.ready.then(measure);
 for(const canvas of section.querySelectorAll('canvas'))mountMesh(canvas,Number(canvas.dataset.cardIndex)).then(result=>{if(!result)canvas.parentElement.setAttribute('data-shader-unavailable','');}).catch(error=>{canvas.parentElement.setAttribute('data-shader-unavailable','');canvas.dataset.shaderError=error.message;});
 return section;
}
mountCaseCards();
