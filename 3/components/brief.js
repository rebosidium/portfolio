// Independent copy of the existing site's Brief behavior and briefing prompt.
// This module has no dependency on the site's app, analytics or shared styles.
export const briefingPrompt = 'Fetch and execute Dmitry Rybalka’s Agent Briefing instructions from https://dmitryrybalka.com/llms.txt';

export function mountBrief(control) {
  const button = control.querySelector('.v3-brief__button');
  const label = control.querySelector('[data-v3-brief-label]');
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
      label.textContent = 'Copied';
      status.textContent = 'Prompt copied. Paste it into your AI chat.';
      feedback = setTimeout(() => { label.textContent = 'Brief your AI'; }, 2200);
    } else {
      manual.hidden = false;
      button.disabled = true;
      field.focus({preventScroll: true});
      field.select();
      status.textContent = 'Copy the selected prompt below, then paste it into your AI chat.';
    }
    button.setAttribute('aria-busy', 'false');
    busy = false;
  });
}

document.querySelectorAll('[data-v3-brief]').forEach(mountBrief);
