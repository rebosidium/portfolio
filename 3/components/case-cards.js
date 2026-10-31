import {getSvgPath} from './card-squircle.js?v=e69287c61f97';
import {mountCardGradients} from './card-gradient.js?v=05712b4738ae';
import {mountCardStack,cardStackFrame} from './card-stack-motion.js?v=acba1784ea1a';
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
  article.innerHTML=`<div class="v3-case-cover-pin"><div class="v3-case-cover-reveal"><div class="v3-case-cover-visual"><div class="v3-case-cover" aria-hidden="true"></div></div></div></div><div class="v3-case-copy"><h3>${project.prefix} <span class="v3-case-brand-lead"><span class="v3-case-logo${project.id==='larixon'?' v3-case-logo--larixon':''}"><img src="/3/assets/case-logos/${project.logo}" alt="" decoding="async"></span><span class="v3-case-company">${firstWord}</span></span>${remainingWords.length?' <span class="v3-case-company">'+remainingWords.join(' ')+'</span>':''} ${project.tail}</h3></div>`;
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
  let gap;
  if(!desktop.matches){
   // Share the available space equally above and below the complete hero.
   // Remove its current margin before solving; stable svh avoids toolbar jumps.
   const hero=document.querySelector('.v3-hero');
   const heroGap=parseFloat(getComputedStyle(hero).marginTop)||0;
   gap=Math.max(24,(height-peek-normalCoverTop+heroGap)/2);
   const heroNext=`${Math.round(gap)}px`;
   if(host.style.getPropertyValue('--v3-mobile-hero-gap')!==heroNext)host.style.setProperty('--v3-mobile-hero-gap',heroNext);
  }else gap=Math.max(height<=800?24:64,height-peek-normalCoverTop);
  const next=`${Math.round(gap)}px`;
  if(section.style.getPropertyValue('--v3-case-teaser-gap')!==next){section.style.setProperty('--v3-case-teaser-gap',next);requestAnimationFrame(measure);}
 }
 const queueTeaser=()=>{if(!teaserFrame)teaserFrame=requestAnimationFrame(fitTeaser);};
 const teaserResize=typeof ResizeObserver==='function'?new ResizeObserver(queueTeaser):null;
 for(const el of [document.querySelector('.v3-header'),document.querySelector('.v3-hero'),section.querySelector('.v3-cases__title'),teaserViewport])if(el)teaserResize?.observe(el);
 document.fonts?.ready.then(queueTeaser);

 let raf=0,visible=true;
 const covers=[...section.querySelectorAll('.v3-case-cover')];
 const cards=[...section.querySelectorAll('.v3-case-card')].map(article=>({article,pin:article.querySelector('.v3-case-cover-pin'),copy:article.querySelector('.v3-case-copy'),height:0,copyOffset:0,flowTop:0,articleHeight:0,column:article.parentElement}));
 mountCardStack(section);
 mountCardGradients(section);
 const clipSizes=new WeakMap();
 const setStyle=(element,name,value)=>{if(element.style.getPropertyValue(name)!==value)element.style.setProperty(name,value);};
 // Cover clipping must follow CSS box resizing without a JS resize loop.
 // Normalize the authored path once against the unchanging sticky slot.
 const svgNS='http://www.w3.org/2000/svg',clipSVG=document.createElementNS(svgNS,'svg'),clipDefs=document.createElementNS(svgNS,'defs');
 clipSVG.setAttribute('width','0');clipSVG.setAttribute('height','0');clipSVG.setAttribute('aria-hidden','true');clipSVG.setAttribute('focusable','false');
 clipSVG.style.cssText='position:absolute;pointer-events:none';clipSVG.append(clipDefs);section.append(clipSVG);
 const responsiveClips=new WeakMap();
 function resizeCoverClip(element,width,height){
  let record=responsiveClips.get(element);
  if(!record){
   const clip=document.createElementNS(svgNS,'clipPath'),path=document.createElementNS(svgNS,'path'),id=`v3-case-clip-${element.closest('.v3-case-card').dataset.project}`;
   clip.setAttribute('id',id);clip.setAttribute('clipPathUnits','objectBoundingBox');clip.append(path);clipDefs.append(clip);
   record={id,path};responsiveClips.set(element,record);
  }
  record.path.setAttribute('d',getSvgPath({width,height,cornerRadius:32,cornerSmoothing:1,preserveSmoothing:true}));
  record.path.setAttribute('transform',`scale(${1/width} ${1/height})`);
  setStyle(element,'clip-path',`url("#${record.id}")`);
 }
 let measuredWidth=0,measuredSmallHeight=0;
 // Reveal once, with a small upward drift. No hidden content without JS.
 const revealItems=[section.querySelector('.v3-cases__title'),...section.querySelectorAll('.v3-case-card')];
 // DOM order groups whole columns; its second article is not the first
 // article in the right column. Release the actual first visual row.
 const secondTeaser=columns[1].firstElementChild;
 const initialGroup=new Set([revealItems[0],cards[0].article,secondTeaser]);
 const waitForHero=!!window.v3Entrance?.contentReady&&!reduced.matches&&!document.hidden;
 let initialReleased=!waitForHero,initialTimer=0;
 const revealObserver=new IntersectionObserver(changes=>{
  for(const {target,isIntersecting} of changes)if(isIntersecting){target.dataset.reveal='visible';revealObserver.unobserve(target);}
 },{rootMargin:'0px 0px -32px 0px',threshold:.04});
 for(const element of revealItems){
  const gated=waitForHero&&initialGroup.has(element),teaser=element===cards[0].article||desktop.matches&&element===secondTeaser;
  element.dataset.reveal=reduced.matches||teaser&&!gated?'visible':'pending';
  if(!reduced.matches&&!gated&&!teaser)revealObserver.observe(element);
 }
 function settleInitial(){
  clearTimeout(initialTimer);initialReleased=true;
  removeEventListener('scroll',releaseOnScroll);
  for(const element of initialGroup)element.dataset.reveal='visible';
 }
 if(waitForHero)window.v3Entrance.contentReady.then(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
  if(initialReleased)return;
  if(reduced.matches||document.hidden){settleInitial();return;}
  // Continue the hero sequence with the heading, then the first visual row.
  // Existing reveal layers keep the sticky article geometry untransformed.
  revealItems[0].dataset.reveal='visible';
  initialTimer=setTimeout(()=>{
   initialReleased=true;removeEventListener('scroll',releaseOnScroll);cards[0].article.dataset.reveal='visible';
   if(desktop.matches)secondTeaser.dataset.reveal='visible';
   else revealObserver.observe(secondTeaser);
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
  if(desktop.matches)secondTeaser.dataset.reveal='visible';
  else revealObserver.observe(secondTeaser);
 }
 if(waitForHero)addEventListener('scroll',releaseOnScroll,{passive:true});
 desktop.addEventListener('change',()=>{if(desktop.matches&&initialReleased){secondTeaser.dataset.reveal='visible';revealObserver.unobserve(secondTeaser);}});
 const fine=matchMedia('(min-width:801px) and (hover:hover) and (pointer:fine)');
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
  measuredWidth=section.clientWidth;measuredSmallHeight=teaserViewport.offsetHeight;
  for(const element of section.querySelectorAll('.v3-case-cover,.v3-case-copy')){
   const relative=!desktop.matches&&element.classList.contains('v3-case-cover');
   const box=relative?element.closest('.v3-case-cover-pin'):element;
   const style=getComputedStyle(box),width=parseFloat(style.width),height=parseFloat(style.height);if(!width||!height)continue;
   const previous=clipSizes.get(element);if(previous?.width===width&&previous.height===height&&previous.relative===relative)continue;
   if(relative)resizeCoverClip(element,width,height);
   else element.style.clipPath=`path('${getSvgPath({width,height,cornerRadius:32,cornerSmoothing:1,preserveSmoothing:true})}')`;
   clipSizes.set(element,{width,height,relative});
  }
  if(!desktop.matches||reduced.matches){
   for(const column of columns){setStyle(column,'transform','none');setStyle(column,'--v3-column-offset','0px');}
   for(const {article}of cards)for(const name of ['--v3-stack-scale','--v3-stack-opacity','--v3-stack-lift','--v3-cover-shift','--v3-cover-scale'])if(article.style.getPropertyValue(name))article.style.removeProperty(name);
   return;
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
  raf=0;if(!desktop.matches||reduced.matches||!visible||document.hidden||document.querySelector('dialog[open]'))return;
  const active=desktop.matches&&!reduced.matches;
  const pageY=scrollY,progress=Math.max(0,Math.min(2200,pageY));
  const offsets=columns.map(column=>active?progress*Number(column.dataset.speed):0);
  // All geometry was measured before this write pass. No forced layout reads
  // between scaling covers, translating copy and updating the column offsets.
  columns.forEach((column,index)=>{
   const offset=offsets[index];setStyle(column,'transform',active?`translateY(${offset}px)`:'none');
   setStyle(column,'--v3-column-offset',`${offset}px`);
  });
  const stackTop=desktop.matches?24:16;
  for(const {article,height,copyOffset,pin,flowTop,articleHeight,column} of cards){
   const articleTop=flowTop-pageY+offsets[columns.indexOf(column)];
   const overlap=reduced.matches?0:Math.max(0,Math.min(1,(stackTop+height-articleTop-copyOffset)/Math.max(1,height)));
   const frame=cardStackFrame(overlap),stackScale=frame.scale;
   setStyle(article,'--v3-stack-scale',String(frame.scale));
   setStyle(article,'--v3-stack-opacity',String(frame.opacity));
   setStyle(article,'--v3-stack-lift',`${frame.lift}px`);
   article.dataset.stackProgress=overlap.toFixed(3);
   pin.toggleAttribute('data-stack-covered',overlap>=1&&!reduced.matches);
   const factor=Math.min(1,Math.max(0,pageY/180)),scale=active?1+.22*factor:1;
   const pinTop=Math.min(Math.max(articleTop,stackTop),articleTop+articleHeight-height);
   const desired=active?Math.max(-36,Math.min(36,(innerHeight/2-(pinTop+height*stackScale/2))*.06))*factor:0;
   const margin=Math.max(0,height*(scale-1)/2-.5);
   setStyle(article,'--v3-cover-shift',`${Math.max(-margin,Math.min(margin,desired))}px`);
   setStyle(article,'--v3-cover-scale',String(scale));
  }
 }
 function schedule(){if(desktop.matches&&!reduced.matches&&!raf)raf=requestAnimationFrame(draw);}
 function resize(){
  // Safari's address bar changes the visual viewport during a finger scroll.
  // Keep ranges and clipping stable while the layout width and 100svh stay put.
  if(!desktop.matches&&section.clientWidth===measuredWidth&&teaserViewport.offsetHeight===measuredSmallHeight)return;
  queueTeaser();
  measure();
 }
 function syncDesktopScroll(){
  removeEventListener('scroll',schedule);
  if(desktop.matches&&!reduced.matches)addEventListener('scroll',schedule,{passive:true});
  measure();
 }
 const size=new ResizeObserver(measure);size.observe(section);section.querySelectorAll('.v3-case-copy').forEach(el=>size.observe(el));
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)schedule()},{rootMargin:'200px'});observer.observe(section);
 addEventListener('resize',resize,{passive:true});reduced.addEventListener('change',syncDesktopScroll);desktop.addEventListener('change',syncDesktopScroll);document.addEventListener('visibilitychange',schedule);
 new MutationObserver(()=>{if(!document.querySelector('dialog[open]'))measure();}).observe(document.documentElement,{attributes:true,attributeFilter:['open'],subtree:true});
 fitTeaser();syncDesktopScroll();document.fonts?.ready.then(measure);
 return section;
}
mountCaseCards();
