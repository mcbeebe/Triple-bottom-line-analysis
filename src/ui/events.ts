import { state } from '../app/state';
import { onAnalystAction } from './analyst/sheet';
import { refresh } from './refresh';

/** Apply the current theme to the document body. */
export function applyTheme(): void {
  document.body.setAttribute('data-theme', state.theme);
}

/** Analyst actions that change the scenario, so the screen behind the sheet must be re-rendered. */
const ANALYST_EDITS = new Set(['an-apply', 'an-applyall', 'an-qset', 'an-addcar', 'an-newcar', 'an-removecar', 'an-carname', 'an-settings']);

let bound = false;

/**
 * Attach the document listeners that no single screen owns, once: the analyst's `an-*` actions (the screen
 * behind is re-rendered after any edit) and remembering which Fine-tune sections are open.
 */
export function bindEvents(): void {
  if (bound) return;
  bound = true;
  document.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act^="an-"]');
    if (!el) return;
    const act = el.dataset.act as string;
    if (onAnalystAction(act, el.dataset.val ?? '') && ANALYST_EDITS.has(act)) refresh.screen();
  });
  // <details> toggle events do not bubble, so listen in the capture phase to remember open/closed sections.
  document.addEventListener(
    'toggle',
    (e) => {
      const d = e.target as HTMLDetailsElement;
      if (d.dataset?.sec) state.secOpen[d.dataset.sec] = d.open;
    },
    true
  );
}
