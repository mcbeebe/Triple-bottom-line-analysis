import { scoreOptions, WEIGHT_PRESETS, type Aggregation, type Disposal, type PillarWeights, type ScaleMode, type ScoringMode } from '../engine';
import { DEFAULT_CRITERIA, DEFAULT_GLOBALS } from '../data';
import { MODES, clone, state, type Tab, type Theme, type View } from '../app/state';
import { defaultOf, fieldRegistry, writeField } from '../app/fields';
import { safeStore } from '../app/storage';
import { keepOf, scaleLabel, scoring, vehicle, visibleOptions } from '../app/options';
import { $ } from './dom';
import { onAnalystAction } from './analyst/sheet';
import { addCustomCar, applyCarPreset, removeCustomCar, setPath, togglePick, type CustomCarSpec } from '../app/mutations';
import { renderControls } from './controls';
import { renderPath } from './legacy/pathPanel';
import { renderPicker } from './legacy/pickerPanel';
import { renderResults } from './answer/answer';
import { refreshEdited, renderAssumptions } from './answer/fineTune';
import { tableAsTsv } from './answer/table';
import { refresh } from './refresh';

/** Apply the current theme to the document body. */
export function applyTheme(): void {
  document.body.setAttribute('data-theme', state.theme);
}

/** Re-render the decision panel, picker, assumptions and results. */
export function refreshAll(): void {
  renderPath();
  renderPicker();
  renderAssumptions();
  renderResults();
}

/** Analyst actions that change the scenario, so the screen behind the sheet must be re-rendered. */
const ANALYST_EDITS = new Set(['an-apply', 'an-applyall', 'an-qset', 'an-addcar', 'an-newcar', 'an-removecar', 'an-carname', 'an-settings']);

function onAction(act: string, val: string): void {
  if (act.startsWith('an-')) {
    if (onAnalystAction(act, val) && ANALYST_EDITS.has(act)) refresh.screen();
    return;
  }
  switch (act) {
    case 'theme':
      state.theme = val as Theme;
      safeStore('tbl-theme', val);
      applyTheme();
      renderControls();
      return;
    case 'mode':
      state.mode = val as ScoringMode;
      renderControls();
      break;
    case 'scale':
      state.scale = val as ScaleMode;
      renderControls();
      break;
    case 'agg':
      state.aggregation = val as Aggregation;
      renderControls();
      break;
    case 'preset':
      state.preset = val;
      state.weights = { ...WEIGHT_PRESETS[val] };
      renderControls();
      break;
    case 'view':
      state.view = val as View;
      renderControls();
      break;
    case 'path':
      setPath(state, val as Disposal);
      refreshAll();
      return;
    case 'carpreset':
      applyCarPreset(state, val);
      refreshAll();
      return;
    case 'askanalyst':
      document.getElementById('analyst')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      (document.getElementById('an-text') as HTMLTextAreaElement | null)?.focus();
      return;
    case 'tab':
      state.tab = val as Tab;
      break;
    case 'showall':
      state.showAll = !state.showAll;
      break;
    case 'collapseall':
    case 'expandall': {
      const open = act === 'expandall';
      for (const k of Object.keys(state.secOpen)) state.secOpen[k] = open;
      document.querySelectorAll('details.asec').forEach((d) => ((d as HTMLDetailsElement).open = open));
      return;
    }
    case 'resview':
      state.resultsView = val as 'cards' | 'table';
      break;
    case 'resviewgo':
      state.resultsView = val as 'cards' | 'table';
      renderResults();
      document.getElementById('res-main')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    case 'sort':
      if (state.sortKey === val) state.sortDir = state.sortDir === 1 ? -1 : 1;
      else {
        state.sortKey = val;
        state.sortDir = val === 'overall' || val === 'planet' || val === 'people' || val === 'profit' || val === 'inc' ? -1 : 1;
      }
      break;
    case 'copytable': {
      const scored = scoreOptions(state.g, state.vehicles, visibleOptions(), scoring());
      const keep = keepOf(scored);
      const tsv = tableAsTsv(scored, keep);
      const done = (msg: string) => {
        state.copyNote = msg;
        const el = document.getElementById('copynote');
        if (el) el.textContent = msg;
      };
      try {
        void navigator.clipboard.writeText(tsv).then(
          () => done('Copied. Paste into Sheets or Excel.'),
          () => done('Copy was blocked here; select the table and copy it instead.')
        );
      } catch {
        done('Copy was blocked here; select the table and copy it instead.');
      }
      return;
    }
    case 'jump':
      document.getElementById('assump')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    case 'pick':
      togglePick(state, val);
      refreshAll();
      return;
    case 'clearpicks':
      state.selected = [];
      state.notice = '';
      refreshAll();
      return;
    case 'addcustom':
      if (addCustomCar(state, { kind: val as CustomCarSpec['kind'] }) === null) renderPicker();
      else refreshAll();
      return;
    case 'rmcustom':
      removeCustomCar(state, val);
      refreshAll();
      return;
    case 'addlease': {
      const v = vehicle(val);
      const monthly = Math.round((v.price * 0.011) / 5) * 5;
      v.lease = { monthly, dueAtSigning: monthly + 2500, termMonths: 36 };
      const d = state.defaults.find((x) => x.id === val);
      if (d) d.lease = clone(v.lease);
      refreshAll();
      return;
    }
    case 'resetfield': {
      const f = fieldRegistry.get(val);
      if (!f) return;
      writeField(f, defaultOf(f));
      const input = document.getElementById(`in-${val}`) as HTMLInputElement | HTMLSelectElement | null;
      if (input) input.value = String(f.meta.bool ? defaultOf(f) : Math.round(defaultOf(f) * (f.meta.pct ? 100 : 1) * 10000) / 10000);
      refreshEdited();
      break;
    }
    case 'reset':
      state.g = clone(DEFAULT_GLOBALS);
      state.vehicles = clone(state.defaults);
      state.criteria = clone(DEFAULT_CRITERIA);
      refreshAll();
      return;
    default:
      return;
  }
  renderResults();
}

/** Attach the delegated click, toggle, input and change handlers to the document (once, at init). */
export function bindEvents(): void {
  document.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
    if (el) onAction(el.dataset.act as string, el.dataset.val ?? '');
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

  document.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.dataset.field && t.tagName === 'INPUT') {
      const f = fieldRegistry.get(t.dataset.field);
      const n = parseFloat(t.value);
      if (f && Number.isFinite(n)) {
        writeField(f, f.meta.pct ? n / 100 : n);
        refreshEdited();
        renderResults();
      }
    } else if (t.dataset.wslider) {
      const k = t.dataset.wslider as keyof PillarWeights;
      state.weights = { ...state.weights, [k]: parseFloat(t.value) / 100 };
      state.preset = 'custom';
      const sum = state.weights.planet + state.weights.people + state.weights.profit || 1;
      (['planet', 'people', 'profit'] as const).forEach((p) => {
        const o = document.getElementById(`wo-${p}`);
        if (o) o.textContent = `${Math.round((state.weights[p] / sum) * 100)}%`;
      });
      document.querySelectorAll('[data-act="preset"]').forEach((b) => {
        b.classList.remove('on');
        b.setAttribute('aria-pressed', 'false');
      });
      const mode = MODES.find((m) => m.id === state.mode) as (typeof MODES)[number];
      $('ctl-summary').textContent = `${mode.label} · ${scaleLabel()} · Custom weights · ${state.aggregation === 'average' ? 'average' : 'weakest link'}`;
      renderResults();
    } else if (t.dataset.weight) {
      const c = state.criteria.find((x) => x.id === t.dataset.weight);
      const n = parseFloat(t.value);
      if (c && Number.isFinite(n)) {
        c.weight = Math.max(0, Math.min(100, n));
        renderResults();
      }
    } else if (t.dataset.vname) {
      const v = vehicle(t.dataset.vname);
      const name = t.value.trim() || 'My car';
      v.short = name;
      v.name = name;
      renderPicker();
      renderResults();
    }
  });

  document.addEventListener('change', (e) => {
    const t = e.target as HTMLSelectElement;
    if (t.dataset.rate) {
      vehicle(t.dataset.rate).ratings[t.dataset.crit as string] = parseInt(t.value, 10);
      renderResults();
    } else if (t.dataset.embodied !== undefined) {
      state.g.embodiedMode = t.value as 'allocated' | 'full';
      renderResults();
    } else if (t.dataset.field && t.tagName === 'SELECT') {
      const f = fieldRegistry.get(t.dataset.field);
      if (f) {
        writeField(f, parseFloat(t.value));
        refreshEdited();
        renderResults();
      }
    } else if (t.dataset.vname) {
      renderPicker();
    }
  });
}
