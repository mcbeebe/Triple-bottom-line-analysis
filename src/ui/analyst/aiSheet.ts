import { analyst } from '../../app/analystSession';
import { dsButton } from '../components/button';
import { dsSheet, hideSheet, openSheetId, showSheet } from '../components/sheet';
import { currentRoute, navigate } from '../steps/router';
import { renderAnalyst } from './sheet';

/** Id of the "Ask the analyst" sheet. */
export const AI_SHEET = 'ai';

/** Sheet body: the host the analyst renders into, then a way out to the answer ("Back to my answer" when opened there). */
export function aiSheetBody(fromAnswer: boolean): string {
  return `<div id="ai-host" class="ds-ai"></div>
<div class="ds-ai-foot">${dsButton({ label: fromAnswer ? 'Back to my answer' : 'See my answer', act: 'ai-answer', full: true, id: 'ai-answer' })}</div>`;
}

/** Render the sheet into the sheet host, move the analyst into it and open it. */
export function openAiSheet(opener: HTMLElement | null): void {
  const host = document.getElementById('ds-sheets');
  if (!host) return;
  host.innerHTML = dsSheet({ id: AI_SHEET, title: 'Ask the analyst', bodyHtml: aiSheetBody(currentRoute() === 'answer') });
  renderAnalyst();
  showSheet(AI_SHEET, opener);
  document.getElementById('an-text')?.focus();
}

let bound = false;

/** Install the listeners for ai-* actions and keep typed text when the sheet closes, once. */
export function bindAiActions(): void {
  if (bound) return;
  bound = true;
  document.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act^="ai-"]');
    if (!el) return;
    if (el.dataset.act === 'ai-open') openAiSheet(el);
    else if (el.dataset.act === 'ai-answer') {
      hideSheet();
      if (currentRoute() !== 'answer') navigate('answer');
    }
  });
  document.addEventListener('input', (e) => {
    const t = e.target as HTMLElement;
    if (t.id === 'an-text' && openSheetId() === AI_SHEET) analyst.text = (t as HTMLTextAreaElement).value.slice(0, 1500);
  });
}
