import { computeOption, scoreOptions } from '../engine';
import { state } from '../app/state';
import { LEGACY_SCENARIO, PUBLIC_DEFAULTS, applyScenario, readQaScenario } from '../app/scenario';
import { safeStore } from '../app/storage';
import { lx, scoring, visibleOptions } from '../app/options';
import { initAnalyst } from './analyst/sheet';
import { registerRenderers } from './refresh';
import { renderControls } from './controls';
import { renderPath } from './legacy/pathPanel';
import { renderPicker } from './legacy/pickerPanel';
import { renderResults } from './answer/answer';
import { renderAssumptions } from './answer/fineTune';
import { renderSources } from './answer/why';
import { applyTheme, bindEvents, refreshAll } from './events';
import { bindStyleGuide } from './styleGuide';
import { bindStepActions } from './steps/actions';
import { bindAnswerActions } from './answer/screenActions';
import { startRouter } from './steps/router';
import { bindSheets } from './components/sheet';
import { bindNumberFields } from './components/field';
import { bindSliders } from './components/slider';

/** Boot the page: theme, panels, results, event handlers, analyst, and the read-only `window.__tbl` hook used by QA. */
export function init(): void {
  // Public defaults (decisions 7, 8, P1); QA runs may ask for the original Lexus test case instead.
  applyScenario(state, readQaScenario(window) === 'legacy' ? LEGACY_SCENARIO : PUBLIC_DEFAULTS);
  const saved = safeStore('tbl-theme');
  if (saved === 'ledger' || saved === 'night' || saved === 'field') state.theme = saved;
  applyTheme();
  renderControls();
  (document.getElementById('controls') as HTMLDetailsElement).open = window.innerWidth >= 760;
  renderPath();
  renderPicker();
  renderAssumptions();
  renderSources();
  renderResults();
  bindEvents();
  registerRenderers({ all: refreshAll, controls: renderControls, picker: renderPicker });
  void initAnalyst();
  bindSheets();
  bindNumberFields();
  bindSliders();
  bindStyleGuide();
  bindStepActions();
  bindAnswerActions();
  startRouter();
  // Expose a tiny read-only hook so automated QA can verify state without scraping.
  (window as unknown as { __tbl: unknown }).__tbl = {
    snapshot: () => {
      const keep = computeOption(state.g, lx(), 'none', lx());
      return {
        theme: state.theme,
        mode: state.mode,
        selected: [...state.selected],
        ranks: scoreOptions(state.g, state.vehicles, visibleOptions(), scoring()).map((s) => ({ id: s.spec.id, rank: s.rank, overall: s.overall, profit: s.pillars.profit, npv: s.result.netCostNPV })),
        keepNPV: keep.netCostNPV
      };
    }
  };
}
