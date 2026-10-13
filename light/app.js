(() => {
  'use strict';
  const agentPrompt = 'Fetch and execute Dmitry Rybalka’s Agent Briefing instructions from https://dmitryrybalka.com/llms.txt';
  const agentButton = document.querySelector('.agent-button');
  const agentStatus = document.querySelector('#agent-copy-status');
  const manualCopy = document.querySelector('.agent-copy-fallback');
  const promptField = document.querySelector('#agent-prompt');
  promptField.value = agentPrompt;
  let copying = false,copyFeedback;
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
    if (copying) return;
    copying = true;
    agentButton.setAttribute('aria-busy','true');
    clearTimeout(copyFeedback);
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(agentPrompt);
        copied = true;
      }
    } catch (_) {
      copied = false;
    }
    if (!copied) copied = copyWithSelection();
    if (copied) {
      manualCopy.hidden = true;
      agentButton.classList.add('is-copied');
      agentStatus.textContent = 'Prompt copied. Paste it into your AI chat.';
      copyFeedback = setTimeout(() => {agentButton.classList.remove('is-copied');},2200);
    } else {
      agentButton.classList.remove('is-copied');
      manualCopy.hidden = false;
      agentStatus.textContent = 'Select and copy the prompt below, then paste it into your AI chat.';
      promptField.focus({preventScroll:true});
      promptField.select();
    }
    agentButton.setAttribute('aria-busy','false');
    copying = false;
  });
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const navigation = [...document.querySelectorAll('.header > a,.header nav a')];
  const portrait = document.querySelector('.portrait');
  const copy = [...document.querySelectorAll('.introduction > h1,.introduction > p,.agent-button')];
  let menuTimeline,heroTimeline,resolveMenu,heroStarted = false;
  const menuReady = new Promise(resolve => {resolveMenu = resolve;});
  const stamp = name => {root.dataset[name] = performance.now().toFixed(1);};
  const clearMotion = elements => {
    if (window.gsap) gsap.set(elements,{clearProps:'transform,opacity'});
  };
  function settleMenu() {
    menuTimeline?.kill();
    root.classList.remove('nav-pending');
    clearMotion(navigation);
    clearTimeout(window.navigationDeadline);
    stamp('menuReadyAt');
    resolveMenu();
  }
  function settleHero(playPortrait = false) {
    heroTimeline?.kill();
    root.classList.remove('motion-pending');
    clearMotion([portrait,...copy]);
    clearTimeout(window.pageDeadline);
    window.resolvePortraitReveal(playPortrait);
    stamp('contentReadyAt');
  }
  document.addEventListener('light:navigation-fallback',settleMenu);
  document.addEventListener('light:page-fallback',() => settleHero());
  const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
  const fontDeadline = Promise.race([fonts,new Promise(resolve => setTimeout(resolve,800))]);
  const posterReady = Promise.race([
    document.querySelector('.portrait img').decode().catch(() => {}),
    new Promise(resolve => setTimeout(resolve,1600))
  ]);
  fontDeadline.then(() => {
    if (!window.gsap || reduced.matches || document.hidden || !root.classList.contains('nav-pending')) {
      settleMenu();return;
    }
    gsap.set(navigation,{y:12,opacity:0});
    root.classList.remove('nav-pending');
    stamp('menuStartedAt');
    menuTimeline = gsap.timeline({onComplete:settleMenu});
    menuTimeline.to(navigation,{y:0,opacity:1,duration:1.05,stagger:.07,delay:.14,ease:'power2.out',clearProps:'transform,opacity'});
  });
  Promise.all([menuReady,window.portraitReady,posterReady,fontDeadline]).then(([_,portraitReady]) => {
    if (heroStarted) return;
    heroStarted = true;
    stamp('heroStartedAt');
    if (!window.gsap || reduced.matches || document.hidden || !root.classList.contains('motion-pending')) {
      settleHero(portraitReady && !reduced.matches && !document.hidden);return;
    }
    // Reserve the final layout while the existing portrait prepares its welcome poses.
    gsap.set(portrait,{y:18,opacity:0,scale:.97});
    gsap.set(copy,{y:18,opacity:0});
    root.classList.remove('motion-pending');
    heroTimeline = gsap.timeline({defaults:{ease:'power3.out'},onComplete:() => settleHero(portraitReady)});
    heroTimeline.to(portrait,{y:0,opacity:1,scale:1,duration:.85,clearProps:'transform,opacity',onComplete:() => window.resolvePortraitReveal(portraitReady)},.1)
      .to(copy,{y:0,opacity:1,duration:.85,stagger:.2,clearProps:'transform,opacity'},.3);
  });
  reduced.addEventListener('change',() => {
    if (reduced.matches) {settleMenu();settleHero();}
  });
  document.addEventListener('visibilitychange',() => {
    if (document.hidden) {settleMenu();settleHero();}
  });
})();
