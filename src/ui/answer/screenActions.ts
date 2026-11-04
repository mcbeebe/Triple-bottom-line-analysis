import { state } from '../../app/state';
import { renderResults } from './answer';
import { navigate } from '../steps/router';

/** Show "All the details" (the old page) and bring one of its parts into view. Phase 3b replaces these with panels. */
function toDetails(targetId: string, before?: () => void): void {
  before?.();
  navigate('details');
  if (before) renderResults();
  document.getElementById(targetId)?.scrollIntoView({ block: 'start' });
}

let bound = false;

/** Install the listener for the answer screen's buttons (ans-* actions) once. */
export function bindAnswerActions(): void {
  if (bound) return;
  bound = true;
  document.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act^="ans-"]');
    if (!el) return;
    switch (el.dataset.act) {
      case 'ans-edit':
        navigate(state.pathChosen ? 'step-2' : 'step-1');
        return;
      case 'ans-why':
        toDetails('res-main', () => (state.resultsView = 'cards'));
        return;
      case 'ans-table':
        toDetails('res-main', () => (state.resultsView = 'table'));
        return;
      case 'ans-finetune':
        toDetails('assump');
        return;
      case 'ans-sources':
        toDetails('sources');
        return;
    }
  });
}
