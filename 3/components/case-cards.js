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
 section.innerHTML='<h2 class="v3-cases__title" id="v3-cases-title">Case Study</h2><div class="v3-case-columns"><div class="v3-case-column" data-speed="0.085"></div><div class="v3-case-column" data-speed="-0.085"></div></div>';
 const columns=[...section.querySelectorAll('.v3-case-column')];
 for(const [index,project]of projects.entries()){
  const article=document.createElement('article');article.className='v3-case-card';article.dataset.project=project.id;article.style.setProperty('--v3-card-order',String(index));
  const [firstWord,...remainingWords]=project.company.split(' ');
  article.innerHTML=`<div class="v3-case-cover-pin"><div class="v3-case-cover" aria-hidden="true"><canvas data-card-index="${index}"></canvas></div></div><div class="v3-case-copy"><h3>${project.prefix} <span class="v3-case-brand-lead"><span class="v3-case-logo${project.id==='larixon'?' v3-case-logo--larixon':''}"><img src="/3/assets/case-logos/${project.logo}" alt="" decoding="async"></span><span class="v3-case-company">${firstWord}</span></span>${remainingWords.length?' <span class="v3-case-company">'+remainingWords.join(' ')+'</span>':''} ${project.tail}</h3></div>`;
  columns[index%2].append(article);
 }
 host.append(section);
 const reduced=matchMedia('(prefers-reduced-motion:reduce)'),desktop=matchMedia('(min-width:801px)');
 let raf=0,visible=true;
 const covers=[...section.querySelectorAll('.v3-case-cover')];
 const cards=[...section.querySelectorAll('.v3-case-card')].map(article=>({article,pin:article.querySelector('.v3-case-cover-pin'),copy:article.querySelector('.v3-case-copy'),height:0,copyOffset:0}));
 // Reveal once, with a small upward drift. No hidden content without JS.
 const revealItems=[section.querySelector('.v3-cases__title'),...section.querySelectorAll('.v3-case-card')];
 const revealObserver=new IntersectionObserver(changes=>{
  for(const {target,isIntersecting} of changes)if(isIntersecting){target.dataset.reveal='visible';revealObserver.unobserve(target);}
 },{rootMargin:'0px 0px -32px 0px',threshold:.04});
 for(const element of revealItems){element.dataset.reveal=reduced.matches?'visible':'pending';if(!reduced.matches)revealObserver.observe(element);}
 reduced.addEventListener('change',()=>{if(reduced.matches){revealObserver.disconnect();for(const element of revealItems)element.dataset.reveal='visible';}});
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
  for(const card of cards){card.height=card.pin.offsetHeight;card.copyOffset=card.copy.offsetTop;}
  schedule();
 }
 function draw(){
  raf=0;if(!visible||document.hidden)return;
  const active=desktop.matches&&!reduced.matches;
  const progress=Math.max(0,Math.min(2200,scrollY));
  columns.forEach(column=>{
   const offset=active?progress*Number(column.dataset.speed):0;
   column.style.transform=active?`translateY(${offset}px)`:'none';
   // Counter the transformed column so its sticky cover stays at the viewport edge.
   column.style.setProperty('--v3-column-offset',`${offset}px`);
  });
  const stackTop=desktop.matches?24:16;
  for(const {article,pin,height,copyOffset} of cards){
   // Read normal-flow positions, never the already lifted text or scaled cover.
   const overlap=reduced.matches?0:Math.max(0,Math.min(1,(stackTop+height-(article.getBoundingClientRect().top+copyOffset))/Math.max(1,height)));
   const eased=overlap*overlap*(3-2*overlap);
   article.style.setProperty('--v3-stack-scale',String(1-eased*(desktop.matches ? .03 : .07)));
   article.style.setProperty('--v3-stack-opacity',String(1-Math.pow(eased,desktop.matches?2:1.25)));
   article.style.setProperty('--v3-stack-lift',`${-eased*(desktop.matches?10:20)}px`);
   article.dataset.stackProgress=overlap.toFixed(3);
   // A fully covered canvas has no visible work; its observer pauses the shader.
   pin.toggleAttribute('data-stack-covered',overlap>=1&&!reduced.matches);
  }
  for(const cover of covers){
   const rect=cover.getBoundingClientRect(),factor=Math.min(1,Math.max(0,scrollY/180));
   const scale=active?1+.22*factor:1;
   const desired=active?Math.max(-36,Math.min(36,(innerHeight/2-(rect.top+rect.height/2))*.06))*factor:0;
   // A fixed pixel shift can exceed the overscan on narrow, tall desktops.
   // Clamp to the actual scaled image margin, retaining a subpixel safety inset.
   const margin=Math.max(0,rect.height*(scale-1)/2-.5);
   cover.style.setProperty('--v3-cover-shift',`${Math.max(-margin,Math.min(margin,desired))}px`);
   cover.style.setProperty('--v3-cover-scale',String(scale));
  }
 }
 function schedule(){if(!raf)raf=requestAnimationFrame(draw);}
 const size=new ResizeObserver(measure);size.observe(section);section.querySelectorAll('.v3-case-copy').forEach(el=>size.observe(el));
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)schedule()},{rootMargin:'200px'});observer.observe(section);
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',measure,{passive:true});reduced.addEventListener('change',measure);desktop.addEventListener('change',measure);document.addEventListener('visibilitychange',schedule);
 measure();document.fonts?.ready.then(measure);
 for(const canvas of section.querySelectorAll('canvas'))mountMesh(canvas,Number(canvas.dataset.cardIndex)).then(result=>{if(!result)canvas.parentElement.setAttribute('data-shader-unavailable','');}).catch(error=>{canvas.parentElement.setAttribute('data-shader-unavailable','');canvas.dataset.shaderError=error.message;});
 return section;
}
mountCaseCards();
