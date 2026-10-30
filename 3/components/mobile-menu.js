// Reviewed adaptation of the old mobile-nav.js. All v3 DOM and styles are local.
// Native modal dialog supplies inert background, focus containment and top layer.
// These pure curves match GSAP power2/power3 exactly without a runtime dependency.
const menuEases = {
  power2Out: t => 1 - Math.pow(1 - t, 3),
  power3Out: t => 1 - Math.pow(1 - t, 4),
  power3In: t => Math.pow(t, 4),
  power2InOut: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
};
function motionFrames(from, to, ease) {
  // Linear interpolation across 240 segments is within 0.00003 of these curves.
  return Array.from({length: 241}, (_, index) => {
    const offset = index / 240;
    const progress = ease(offset);
    const frame = {offset};
    if ('opacity' in to) frame.opacity = Number(from.opacity) + (to.opacity - Number(from.opacity)) * progress;
    if ('y' in to) frame.transform = `translateY(${from.y + (to.y - from.y) * progress}px)`;
    return frame;
  });
}
// End of pure menu motion helpers.
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
const focusControls = [toggle, closeButton];
function setFocusMode(mode) {
  focusControls.forEach(control => {control.dataset.menuFocus = mode;});
}
// Suppress pointer outlines on both ends of native dialog focus restoration.
setFocusMode('pointer');
document.addEventListener('pointerdown', () => setFocusMode('pointer'), {capture:true, passive:true});
document.addEventListener('keydown', event => {
  if (['Tab','Enter',' ','Escape','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) setFocusMode('keyboard');
}, {capture:true});
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
  const fromLinks = links.map(link => {
    const style = getComputedStyle(link);
    return {opacity: Number(style.opacity), y: style.transform === 'none' ? 0 : new DOMMatrixReadOnly(style.transform).m42};
  });
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
      panel.animate(motionFrames({opacity:firstOpen?0:fromPanelOpacity},{opacity:1},menuEases.power2Out),{duration:280,easing:'linear',fill:'both'}),
      scrim.animate(motionFrames({opacity:firstOpen?0:fromScrim},{opacity:1},menuEases.power2Out),{duration:280,easing:'linear',fill:'both'}),
      ...links.map((link,index)=>link.animate(motionFrames(firstOpen?{opacity:0,y:12}:fromLinks[index],{opacity:1,y:0},menuEases.power3Out),{duration:320,delay:70+index*55,easing:'linear',fill:'both'}))
    ];
  } else {
    const lastLink=240+(links.length-1)*55;
    animations = [
      ...links.map((link,index)=>link.animate(motionFrames(fromLinks[index],{opacity:0,y:12},menuEases.power3In),{duration:240,delay:(links.length-1-index)*55,easing:'linear',fill:'both'})),
      panel.animate(motionFrames({opacity:fromPanelOpacity},{opacity:0},menuEases.power2InOut),{duration:280,delay:lastLink,easing:'linear',fill:'both'}),
      scrim.animate(motionFrames({opacity:fromScrim},{opacity:0},menuEases.power2InOut),{duration:280,delay:lastLink,easing:'linear',fill:'both'})
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
