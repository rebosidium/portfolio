// Independent copy of the existing site's Brief behavior and briefing prompt.
// This module has no dependency on the site's app, analytics or shared styles.
import {mountBriefIcons} from './brief-icons.js?v=77335a25004d';
export const briefingPrompt = "Read https://dmitryrybalka.com/llms.txt — it's Dmitry Rybalka's resume and portfolio. Give me a short overview of his experience and key projects, and help me assess his fit for the role I'm hiring for. If you can't open the link, tell me instead of guessing.";

export function mountBrief(control) {
  const button = control.querySelector('.v3-brief__button');
  mountBriefIcons(button);
  const status = control.querySelector('[role="status"]');
  const manual = control.querySelector('.v3-brief__manual');
  const field = manual.querySelector('textarea');
  field.value = briefingPrompt;
  let busy = false;
  let feedback;

  function copyWithSelection() {
    const previousFocus = document.activeElement;
    const selection = document.getSelection();
    const ranges = Array.from({length: selection?.rangeCount || 0}, (_, i) => selection.getRangeAt(i).cloneRange());
    const temporary = document.createElement('textarea');
    temporary.value = briefingPrompt;
    temporary.readOnly = true;
    temporary.style.cssText = 'position:fixed;left:-9999px;top:0;font-size:16px';
    document.body.append(temporary);
    try {
      temporary.focus({preventScroll: true});
      temporary.select();
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      temporary.remove();
      previousFocus?.focus({preventScroll: true});
      if (selection) {
        selection.removeAllRanges();
        ranges.forEach(range => selection.addRange(range));
      }
    }
  }

  button.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    clearTimeout(feedback);
    button.setAttribute('aria-busy', 'true');
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(briefingPrompt);
        copied = true;
      }
    } catch { /* Selection fallback also supports denied clipboard permission. */ }
    if (!copied) copied = copyWithSelection();
    if (copied) {
      button.classList.add('is-copied');
      status.textContent = 'Prompt copied. Paste it into your AI chat.';
      feedback = setTimeout(() => { button.classList.remove('is-copied'); }, 2200);
    } else {
      button.classList.remove('is-copied');
      manual.hidden = false;
      button.disabled = true;
      field.focus({preventScroll: true});
      field.select();
      // preventScroll avoids a focus jump; reveal the fallback if it is below
      // the fold on short mobile viewports before asking the user to copy it.
      field.scrollIntoView({block:'nearest',inline:'nearest'});
      status.textContent = 'Copy the selected prompt below, then paste it into your AI chat.';
    }
    button.setAttribute('aria-busy', 'false');
    busy = false;
  });
}

document.querySelectorAll('[data-v3-brief]').forEach(mountBrief);
