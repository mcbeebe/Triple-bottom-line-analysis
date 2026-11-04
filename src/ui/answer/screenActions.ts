import { state } from '../../app/state';
import { renderResults } from './answer';
import { clearShareHash, navigate, renderAnswer, setShareHash } from '../steps/router';
import { SHARE_SHEET, renderShareSheet, shareLink } from './shareSheet';
import { hideSheet, openSheetId, showSheet } from '../components/sheet';
import type { DsNumberDetail } from '../components/field';
import { FT_SHEET, applyFineTune, refreshFineTuneStatus, renderFineTuneSheet } from './fineTuneSheet';

/** Show "All the details" (the old page) and bring one of its parts into view. Phase 3b replaces these with panels. */
function toDetails(targetId: string, before?: () => void): void {
  hideSheet();
  before?.();
  navigate('details');
  if (before) renderResults();
  const el = document.getElementById(targetId);
  if (el instanceof HTMLDetailsElement) el.open = true;
  el?.scrollIntoView({ block: 'start' });
}

/** After a Fine-tune edit: refresh the labels, re-render the answer behind the sheet and announce the new verdict. */
function afterEdit(): void {
  clearShareHash();
  refreshFineTuneStatus(state);
  renderAnswer();
  const live = document.getElementById('ft-live');
  const verdict = document.getElementById('ans-title')?.textContent ?? '';
  if (live) live.textContent = `Answer updated. ${verdict}`;
}

let bound = false;

/** Install the listeners for the answer screen's buttons (ans-* actions) and the Fine-tune sheet, once. */
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
        renderFineTuneSheet(state);
        showSheet(FT_SHEET, el);
        return;
      case 'ans-assumptions':
        toDetails('assump');
        return;
      case 'ans-scoring':
        toDetails('controls');
        return;
      case 'ans-sources':
        toDetails('sources');
        return;
      case 'ans-share': {
        const link = shareLink(state);
        setShareHash(link.split('#')[1]);
        renderShareSheet(state, link);
        showSheet(SHARE_SHEET, el);
        return;
      }
      case 'ans-copylink': {
        const input = document.getElementById('share-link') as HTMLInputElement | null;
        const status = document.getElementById('share-status');
        const done = (msg: string) => {
          if (status) status.textContent = msg;
        };
        if (!input) return;
        try {
          void navigator.clipboard.writeText(input.value).then(
            () => done('Copied. Paste it into a message.'),
            () => {
              input.select();
              done('Copying was blocked here. The link is selected; copy it yourself.');
            }
          );
        } catch {
          input.select();
          done('Copying was blocked here. The link is selected; copy it yourself.');
        }
        return;
      }
    }
  });
  document.addEventListener('ds:number', (e) => {
    if (openSheetId() === FT_SHEET && applyFineTune(state, (e as CustomEvent<DsNumberDetail>).detail)) afterEdit();
  });
  document.addEventListener('change', (e) => {
    const el = e.target as HTMLInputElement;
    if (!(el instanceof HTMLInputElement) || el.dataset.act !== 'ft-zev') return;
    state.g.firstTimeZev = el.value === '1';
    afterEdit();
  });
}
