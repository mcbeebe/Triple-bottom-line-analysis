import { state } from '../../app/state';
import { clearShareHash, navigate, renderAnswer, setShareHash } from '../steps/router';
import { SHARE_SHEET, renderShareSheet, shareLink } from './shareSheet';
import { openSheetId, showSheet } from '../components/sheet';
import type { DsNumberDetail } from '../components/field';
import { FT_SHEET, applyFineTune, renderFineTuneSheet } from './fineTuneSheet';
import { afterFineTuneEdit, fineTuneCar } from './fineTuneActions';
import { TABLE_SHEET, renderTableSheet, tableHtml } from './tableSheet';
import { nextSort, tableTsv } from '../../app/table';
import { keepOf, scoring, visibleOptions } from '../../app/options';
import { scoreOptions } from '../../engine';
import { WHY_SHEET, WHY_TABS, raters, refreshWhy, renderWhySheet, whyPanel } from './whySheet';
import type { Tab } from '../../app/state';

/** The car whose People ratings are being edited in Why (screen-local; the first rated car when empty). */
let rateCar = '';

/** Announce the new verdict in the open sheet's live region. */
function announce(liveId: string): void {
  const live = document.getElementById(liveId);
  const verdict = document.getElementById('ans-title')?.textContent ?? '';
  if (live) live.textContent = `Answer updated. ${verdict}`;
}

/** After an edit in Why (ratings or weights): refresh its tables and the answer behind, then announce. */
function afterWhyEdit(): void {
  clearShareHash();
  renderAnswer();
  refreshWhy(state);
  announce('why-live');
}

/** Select a Why tab: update the tab list and panel, and keep focus on the chosen tab. */
function selectTab(t: Tab, focus: boolean): void {
  state.tab = t;
  for (const x of WHY_TABS) {
    const b = document.getElementById(`why-tab-${x}`);
    if (!b) continue;
    const on = x === t;
    b.classList.toggle('ds-tab-on', on);
    b.setAttribute('aria-selected', String(on));
    if (on) b.removeAttribute('tabindex');
    else b.setAttribute('tabindex', '-1');
  }
  const panel = document.getElementById('why-panel');
  if (panel) {
    panel.setAttribute('aria-labelledby', `why-tab-${t}`);
    panel.innerHTML = whyPanel(state, t, rateCar);
  }
  if (focus) document.getElementById(`why-tab-${t}`)?.focus();
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
        renderWhySheet(state, rateCar);
        showSheet(WHY_SHEET, el);
        return;
      case 'ans-table':
        renderTableSheet(state);
        showSheet(TABLE_SHEET, el);
        return;
      case 'ans-finetune':
        renderFineTuneSheet(state, fineTuneCar());
        showSheet(FT_SHEET, el);
        return;
      case 'ans-sources': {
        renderWhySheet(state, rateCar, true);
        showSheet(WHY_SHEET, el);
        const h = document.getElementById('why-src-h');
        h?.scrollIntoView({ block: 'start' });
        h?.focus({ preventScroll: true });
        return;
      }
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
    const d = (e as CustomEvent<DsNumberDetail>).detail;
    if (openSheetId() === FT_SHEET && applyFineTune(state, d)) afterFineTuneEdit();
    else if (openSheetId() === WHY_SHEET && d.name.startsWith('cw.')) {
      const c = state.criteria.find((x) => x.id === d.name.slice(3));
      if (!c) return;
      c.weight = Math.max(0, Math.min(100, d.value));
      afterWhyEdit();
    }
  });
  document.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act="tb-sort"],[data-act="tb-copy"]');
    if (!el || openSheetId() !== TABLE_SHEET) return;
    if (el.dataset.act === 'tb-sort') {
      const n = nextSort(state.sortKey, state.sortDir, el.dataset.val ?? 'rank');
      state.sortKey = n.key;
      state.sortDir = n.dir;
      const wrap = document.getElementById('tb-wrap');
      if (wrap) wrap.innerHTML = tableHtml(state);
      document.getElementById(`tb-sort-${n.key}`)?.focus();
      return;
    }
    const status = document.getElementById('tb-status');
    const say = (msg: string) => {
      if (status) status.textContent = msg;
    };
    const scored = scoreOptions(state.g, state.vehicles, visibleOptions(), scoring());
    const tsv = tableTsv(scored, keepOf(scored), state.sortKey, state.sortDir);
    try {
      void navigator.clipboard.writeText(tsv).then(
        () => say('Copied. Paste it into Sheets or Excel.'),
        () => say('Copying was blocked here. Select the table and copy it yourself.')
      );
    } catch {
      say('Copying was blocked here. Select the table and copy it yourself.');
    }
  });
  document.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act="why-tab"]');
    if (el && WHY_TABS.includes(el.dataset.val as Tab)) selectTab(el.dataset.val as Tab, true);
  });
  document.addEventListener('keydown', (e) => {
    const el = (e.target as HTMLElement).closest?.<HTMLElement>('[data-act="why-tab"]');
    if (!el) return;
    const i = WHY_TABS.indexOf(el.dataset.val as Tab);
    const next = e.key === 'ArrowRight' ? (i + 1) % WHY_TABS.length : e.key === 'ArrowLeft' ? (i + WHY_TABS.length - 1) % WHY_TABS.length : e.key === 'Home' ? 0 : e.key === 'End' ? WHY_TABS.length - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    selectTab(WHY_TABS[next], true);
  });
  document.addEventListener('change', (e) => {
    const el = e.target as HTMLElement;
    if (el instanceof HTMLInputElement && el.dataset.act === 'why-rcar') {
      rateCar = el.value;
      const car = state.vehicles.find((v) => v.id === rateCar);
      const host = document.getElementById('why-raters');
      if (car && host) host.innerHTML = raters(state, car);
    } else if (el instanceof HTMLSelectElement && el.dataset.act === 'why-rate') {
      const car = state.vehicles.find((v) => v.id === el.dataset.car);
      const n = Number(el.value);
      if (!car || !el.dataset.crit || !(n >= 1 && n <= 5)) return;
      car.ratings[el.dataset.crit] = n;
      afterWhyEdit();
    }
  });
  document.addEventListener('change', (e) => {
    const el = e.target as HTMLInputElement;
    if (!(el instanceof HTMLInputElement) || el.dataset.act !== 'ft-zev') return;
    state.g.firstTimeZev = el.value === '1';
    afterFineTuneEdit();
  });
}
