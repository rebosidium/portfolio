(() => {
  'use strict';
(() => {
  'use strict';
  // Use the real history entry so Back restores the preceding case and scroll.
  // A direct/external visit or new tab retains the template's Home fallback.
  let previous;
  try{if(document.referrer&&history.length>1){
    const url=new URL(document.referrer);
    if(url.origin===location.origin&&url.href!==location.href)previous=url;
  }}catch{}
  if(previous){
    document.querySelectorAll('a[data-history-back]').forEach(link=>{link.href=previous.href;});
    document.addEventListener('click',event=>{
      const link=event.target.closest?.('a[data-history-back]');
      if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.target||link.hasAttribute('download'))return;
      event.preventDefault();history.back();
    });
  }
  // Touch feedback starts on contact; native link navigation never waits for it.
  const arrowReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const arrowAnimations = new Map();
  document.addEventListener('pointerdown',event => {
    if (event.pointerType !== 'touch' || !event.isPrimary || arrowReducedMotion.matches) return;
    const button = event.target.closest?.('.ui-back,.ui-project-link');
    if (!button || button.matches(':disabled,[aria-disabled="true"]') || button.closest('.ds-preview[data-state="reduced-motion"]')) return;
    const icon = button.querySelector(':scope > img');
    if (!icon?.animate) return;
    arrowAnimations.get(icon)?.cancel();
    const offset = getComputedStyle(button).getPropertyValue('--arrow-offset').trim();
    const animation = icon.animate([
      {translate:'0px 0px'},
      {translate:`${offset} 0px`,offset:.45},
      {translate:'0px 0px'}
    ],{duration:400,easing:'cubic-bezier(.37,0,.63,1)'});
    arrowAnimations.set(icon,animation);
    animation.finished.catch(() => {}).finally(() => {
      if (arrowAnimations.get(icon) === animation) arrowAnimations.delete(icon);
    });
  },{passive:true});
  const cancelArrowAnimations = () => {
    for (const animation of arrowAnimations.values()) animation.cancel();
    arrowAnimations.clear();
  };
  arrowReducedMotion.addEventListener('change',cancelArrowAnimations);
  document.addEventListener('visibilitychange',() => {if (document.hidden) cancelArrowAnimations();});

})();

  const uiRU=document.documentElement.lang==='ru';
  const uiText=(en,ru)=>uiRU?ru:en;
  const agentPrompt = 'Fetch and execute Dmitry Rybalka’s Agent Briefing instructions from https://dmitryrybalka.com/llms.txt';
  const agentButtons = [...document.querySelectorAll('.agent-button')];
  const agentIconReadiness = new WeakMap();
  function prepareAgentIcons(button) {
    if (agentIconReadiness.has(button)) return agentIconReadiness.get(button);
    // Decode the actual mounted SVGs, including the hidden Copied check. The
    // same fingerprinted URLs also warm the browser's ordinary image cache.
    const images = [...button.querySelectorAll('img')];
    const ready = Promise.allSettled(images.map(image => {
      image.loading = 'eager';
      return window.DSAssets?.whenReady(image) || image.decode();
    })).then(() => {
      button.dataset.agentIconsReady = String(images.every(image => image.complete && image.naturalWidth > 0));
    });
    agentIconReadiness.set(button,ready);
    return ready;
  }
  for (const button of agentButtons) {
    if (button.dataset.agentTheme === 'dark' && window.portraitReveal) {
      // HOME keeps the approved portrait's first-screen priority. Warm the
      // footer well before it scrolls into view, without awaiting it in hero.
      Promise.resolve(window.portraitReveal).then(() => prepareAgentIcons(button));
    } else prepareAgentIcons(button);
  }
  agentButtons.forEach(mountAgentCopy);
  function mountAgentCopy(agentButton) {
    const control = agentButton.closest('[data-agent-control]');
    const agentStatus = control.querySelector('[role="status"]');
    const manualCopy = control.querySelector('.agent-copy-fallback');
    const promptField = manualCopy.querySelector('textarea');
    const copyLabel = agentButton.getAttribute('aria-label');
    promptField.value = agentPrompt;
    let promptWidth = 0,manualWasVisible = false;
    function fitManualPrompt() {
      if (manualCopy.hidden) return;
      promptWidth = promptField.clientWidth;
      promptField.style.removeProperty('height');
      const style = getComputedStyle(promptField);
      const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
      promptField.style.height = Math.max(parseFloat(style.minHeight),promptField.scrollHeight + border) + 'px';
    }
    function syncManualCopy() {
      const manualVisible = !manualCopy.hidden;
      const manualOpened = manualVisible && !manualWasVisible;
      manualWasVisible = manualVisible;
      control.classList.toggle('is-manual-copy',manualVisible);
      // Keep the prepared logo nodes mounted, but make this compact header
      // genuinely non-interactive while the user selects the prompt below.
      if (agentButton.disabled !== manualVisible) agentButton.disabled = manualVisible;
      agentButton.setAttribute('aria-label',manualVisible ? uiText('Brief your AI','Бриф для ИИ') : copyLabel);
      if (manualCopy.hidden) promptField.style.removeProperty('height');
      else fitManualPrompt();
      // Select once when Manual copy opens, including the DS state picker.
      // Resizing and later focus changes must preserve the user's selection.
      if (manualOpened) {
        promptField.focus({preventScroll:true});
        promptField.select();
      }
    }
    new MutationObserver(syncManualCopy).observe(manualCopy,{attributes:true,attributeFilter:['hidden']});
    if (typeof ResizeObserver === 'function') new ResizeObserver(() => {
      if (!manualCopy.hidden && promptField.clientWidth !== promptWidth) fitManualPrompt();
    }).observe(promptField);
    else window.addEventListener('resize',fitManualPrompt);
    document.fonts?.ready.then(fitManualPrompt);
    syncManualCopy();
    let copying = false,copyFeedback,copyGeneration = 0;
    // The component showcase changes state on the mounted control. Invalidate
    // older real copy work without remounting its production event handlers.
    agentButton.addEventListener('portfolio:agent-preview-reset',() => {
      copyGeneration++;
      clearTimeout(copyFeedback);
      copying = false;
      agentButton.setAttribute('aria-busy','false');
      agentButton.classList.remove('is-copied');
      manualCopy.hidden = true;
      syncManualCopy();
      agentStatus.textContent = uiText('Copies a prompt to paste into your AI chat.','Копирует запрос, который можно вставить в чат с ИИ.');
    });
    function copyWithSelection() {
      const previousFocus = document.activeElement;
      const selection = document.getSelection();
      const previousRanges = Array.from({length:selection?.rangeCount || 0},(_,index) => selection.getRangeAt(index).cloneRange());
      const field = document.createElement('textarea');
      field.value = agentPrompt;
      field.readOnly = true;
      field.style.cssText = 'position:fixed;left:-9999px;top:0;font-size:16px';
      document.body.append(field);
      let copied = false;
      try {
        field.focus({preventScroll:true});
        field.select();
        copied = document.execCommand('copy');
      } catch (_) {
        copied = false;
      } finally {
        field.remove();
        previousFocus?.focus({preventScroll:true});
        if (selection) {
          selection.removeAllRanges();
          previousRanges.forEach(range => selection.addRange(range));
        }
      }
      return copied;
    }
    agentButton.addEventListener('click',async () => {
      if (copying || agentButton.disabled || !manualCopy.hidden) return;
      const generation = ++copyGeneration;
      copying = true;
      agentButton.setAttribute('aria-busy','true');
      clearTimeout(copyFeedback);
      prepareAgentIcons(agentButton);
      let copied = false;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(agentPrompt);
          copied = true;
        }
      } catch (_) {
        copied = false;
      }
      if (generation !== copyGeneration) return;
      if (!copied) copied = copyWithSelection();
      if (copied) {
        manualCopy.hidden = true;
        syncManualCopy();
        agentButton.classList.add('is-copied');
        agentStatus.textContent = uiText('Prompt copied. Paste it into your AI chat.','Запрос скопирован. Вставьте его в чат с ИИ.');
        copyFeedback = setTimeout(() => {agentButton.classList.remove('is-copied');},2200);
      } else {
        agentButton.classList.remove('is-copied');
        manualCopy.hidden = false;
        syncManualCopy();
        agentStatus.textContent = uiText('Copy the selected prompt below, then paste it into your AI chat.','Скопируйте выделенный запрос и вставьте его в чат с ИИ.');
        if(control.closest('.footer'))promptField.scrollIntoView({block:'nearest',inline:'nearest'});
      }
      agentButton.setAttribute('aria-busy','false');
      copying = false;
    });
  }
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.mobileLayout;
  agentButtons.forEach(mountAgentIconMotion);
  function mountAgentIconMotion(agentButton) {
    // Move direct children so Copilot travels with its clipping wrapper.
    const icons = [...agentButton.querySelector('.agent-button-logos').children];
    if (!icons.length || icons.some(icon => typeof icon.animate !== 'function')) return;
    const hoverPointer = matchMedia('(hover: hover) and (pointer: fine)');
    const ease = 'cubic-bezier(.37,0,.63,1)';
    let animations = [],hovering = false,waving = false;
    const canHover = () => !agentButton.disabled && hovering && hoverPointer.matches && !mobile.matches && !reduced.matches && !document.hidden;
    const poses = () => icons.map(icon => {
      const transform = getComputedStyle(icon).transform;
      return transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m42;
    });
    // Ease each half of the motion to turn smoothly at the peak and baseline.
    const frame = y => ({transform:`translateY(${y}px)`,easing:ease});
    function cancelMotion() {
      animations.forEach(animation => animation.cancel());
      animations = [];
    }
    function whenFinished(current,callback) {
      Promise.all(current.map(animation => animation.finished)).then(() => {
        if (animations !== current) return;
        cancelMotion();callback();
      }).catch(() => {}); // Cancellation on preference/visibility changes is expected.
    }
    function startHover() {
      if (!canHover() || waving || animations.length) return;
      animations = icons.map((icon,index) => icon.animate([frame(0),frame(-2),frame(0)],{
        duration:2400,delay:index * 140,iterations:Infinity
      }));
    }
    function settleHover() {
      if (waving || !animations.length) return;
      const from = poses();
      cancelMotion();
      animations = icons.map((icon,index) => icon.animate([frame(from[index]),frame(0)],{
        duration:240
      }));
      whenFinished(animations,startHover);
    }
    function playWave() {
      if (agentButton.disabled || waving || reduced.matches || document.hidden) return;
      const from = poses();
      cancelMotion();waving = true;
      // Preserve each current hover pose through its delay; repeated clicks keep
      // the same wave alive while the independent copy handler runs normally.
      animations = icons.map((icon,index) => icon.animate([frame(from[index]),frame(-9),frame(0)],{
        duration:500,delay:index * 70,fill:'both'
      }));
      whenFinished(animations,() => {waving = false;startHover();});
    }
    agentButton.addEventListener('portfolio:agent-preview-reset',() => {
      cancelMotion();waving = false;hovering = false;
    });
    new MutationObserver(() => {
      if (agentButton.disabled) {cancelMotion();waving = false;hovering = false;}
    }).observe(agentButton,{attributes:true,attributeFilter:['disabled']});
    agentButton.addEventListener('pointerenter',event => {
      if (event.pointerType === 'touch') return;
      hovering = true;startHover();
    });
    agentButton.addEventListener('pointerleave',() => {hovering = false;settleHover();});
    agentButton.addEventListener('pointerdown',event => {
      if (event.pointerType === 'touch') {hovering = false;settleHover();}
    });
    agentButton.addEventListener('click',playWave);
    const syncHover = () => {if (canHover()) startHover();else settleHover();};
    hoverPointer.addEventListener('change',syncHover);
    mobile.addEventListener('change',syncHover);
    reduced.addEventListener('change',() => {
      if (reduced.matches) {cancelMotion();waving = false;}
      else startHover();
    });
    document.addEventListener('visibilitychange',() => {
      if (document.hidden) {cancelMotion();waving = false;}
      else {hovering = hovering && agentButton.matches(':hover');startHover();}
    });
  }
})();
