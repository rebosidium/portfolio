// Reviewed adaptation of the old mobile-nav.js. All v3 DOM and styles are local.
// Native modal dialog supplies inert background, focus containment and top layer.
const toggle = document.querySelector('.v3-menu-toggle');
const dialog = document.querySelector('.v3-mobile-menu');
const closeButton = dialog.querySelector('.v3-menu-close');
const panel = dialog.querySelector('.v3-menu-panel');
const scrim = dialog.querySelector('.v3-menu-scrim');
const links = [...dialog.querySelectorAll('nav a')];
const mobile = matchMedia('(max-width:767px), (max-width:1023px) and (pointer:coarse)');
const reduced = matchMedia('(prefers-reduced-motion:reduce)');
let desiredOpen = false;
let generation = 0;
let animations = [];
let locked = null;
function cancel() { animations.forEach(a => a.cancel()); animations = []; }
function lockScroll() {
  if (locked) return;
  const body = document.body;
  const properties = ['position','top','left','right','width'];
  locked = {x:scrollX,y:scrollY,overflow:document.documentElement.style.overflow,styles:properties.map(p=>[p,body.style.getPropertyValue(p)])};
  // Capture before overflow:hidden so classic scrollbars cannot shift the page.
  const layoutWidth=body.getBoundingClientRect().width;
  document.documentElement.style.overflow = 'hidden';
  Object.assign(body.style,{position:'fixed',top:`${-locked.y}px`,left:'0',right:'0',width:`${layoutWidth}px`});
}
function unlockScroll() {
  if (!locked) return;
  const saved = locked; locked = null;
  document.documentElement.style.overflow = saved.overflow;
  for (const [property,value] of saved.styles) {
    if (value) document.body.style.setProperty(property,value);
    else document.body.style.removeProperty(property);
  }
  window.scrollTo(saved.x,saved.y);
}
function finishClose(returnFocus) {
  cancel();
  dialog.close();
  dialog.removeAttribute('data-closing');
  unlockScroll();
  toggle.dataset.menuIcon = 'menu';
  closeButton.dataset.menuIcon = 'menu';
  if (returnFocus && mobile.matches) toggle.focus({preventScroll:true});
}
async function setOpen(open,{instant=false,returnFocus=true}={}) {
  open = open && mobile.matches;
  if (open === desiredOpen && !instant) return;
  const firstOpen = !dialog.open;
  const fromPanelOpacity = getComputedStyle(panel).opacity;
  const fromScrim = getComputedStyle(scrim).opacity;
  const fromLinks = links.map(link=>({opacity:getComputedStyle(link).opacity,transform:getComputedStyle(link).transform}));
  const run = ++generation;
  desiredOpen = open;
  cancel();
  toggle.setAttribute('aria-expanded',String(open));
  toggle.setAttribute('aria-label',open?'Close menu':'Open menu');
  closeButton.setAttribute('aria-label',open?'Close menu':'Open menu');
  toggle.dataset.menuIcon = open?'close':'menu';
  if (open) {
    dialog.removeAttribute('data-closing');
    if (firstOpen) {
      const rect=toggle.getBoundingClientRect();
      dialog.style.setProperty('--v3-toggle-top',`${Math.max(16,Math.min(innerHeight-60,rect.top))}px`);
      dialog.style.setProperty('--v3-toggle-right',`${innerWidth-rect.right}px`);
      lockScroll();
      closeButton.dataset.menuIcon='menu';
      dialog.showModal();
      // Commit the two Lucide lines before changing their 200ms transform target.
      closeButton.querySelectorAll('use').forEach(stroke=>void getComputedStyle(stroke).transform);
    }
    closeButton.dataset.menuIcon='close';
    closeButton.focus({preventScroll:true});
  } else {
    dialog.setAttribute('data-closing','');
    closeButton.dataset.menuIcon='menu';
  }
  if (instant || matchMedia('(prefers-reduced-motion:reduce)').matches) {
    if (!open) finishClose(returnFocus);
    return;
  }
  if (open) {
    animations = [
      panel.animate([{opacity:firstOpen?0:fromPanelOpacity},{opacity:1}],{duration:280,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'}),
      scrim.animate([{opacity:firstOpen?0:fromScrim},{opacity:1}],{duration:280,easing:'ease-out',fill:'both'}),
      ...links.map((link,index)=>link.animate([{opacity:firstOpen?0:fromLinks[index].opacity,transform:firstOpen?'translateY(12px)':fromLinks[index].transform},{opacity:1,transform:'translateY(0)'}],{duration:320,delay:70+index*55,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'}))
    ];
  } else {
    const lastLink=240+(links.length-1)*55;
    animations = [
      ...links.map((link,index)=>link.animate([fromLinks[index],{opacity:0,transform:'translateY(12px)'}],{duration:240,delay:(links.length-1-index)*55,easing:'cubic-bezier(.64,0,.78,0)',fill:'both'})),
      panel.animate([{opacity:fromPanelOpacity},{opacity:0}],{duration:280,delay:lastLink,easing:'ease-in-out',fill:'both'}),
      scrim.animate([{opacity:fromScrim},{opacity:0}],{duration:280,delay:lastLink,easing:'ease-in-out',fill:'both'})
    ];
  }
  try {
    await Promise.all(animations.map(a=>a.finished));
    if (run !== generation) return;
    if (desiredOpen) cancel();
    else finishClose(returnFocus);
  } catch { /* Reversal, viewport changes and reduced motion cancel old transitions. */ }
}
toggle.addEventListener('click',()=>setOpen(!desiredOpen));
closeButton.addEventListener('click',()=>setOpen(!desiredOpen));
scrim.addEventListener('click',()=>setOpen(false));
dialog.addEventListener('cancel',event=>{event.preventDefault();setOpen(false);});
dialog.addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;
  // All four draft links are deliberately disabled. Keep Safari's focus cycle
  // on the available close control until navigation destinations are supplied.
  event.preventDefault();closeButton.focus({preventScroll:true});
});
dialog.addEventListener('click',event=>{if(event.target.closest('a[aria-disabled="true"]'))event.preventDefault();});
mobile.addEventListener('change',()=>{if(!mobile.matches)setOpen(false,{instant:true,returnFocus:false});});
reduced.addEventListener('change',()=>{
  if (!reduced.matches) return;
  generation++;cancel();
  if (!desiredOpen && dialog.open) finishClose(true);
});
window.addEventListener('resize',()=>{
  if(!matchMedia('(max-width:767px), (max-width:1023px) and (pointer:coarse)').matches){
    if(dialog.open)setOpen(false,{instant:true,returnFocus:false});
    return;
  }
  if(!dialog.open)return;
  dialog.style.setProperty('--v3-toggle-right',getComputedStyle(document.querySelector('.v3-grid')).marginRight);
},{passive:true});
// Progressive enhancement: failed JS leaves the original visible four-item menu.
if (typeof dialog.showModal === 'function') document.documentElement.classList.add('v3-menu-ready');
