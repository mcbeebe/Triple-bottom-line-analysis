import { computeOption, scoreOptions } from '../engine';
import { state, themeFrom } from '../app/state';
import { LEGACY_SCENARIO, PUBLIC_DEFAULTS, applyScenario, readQaScenario } from '../app/scenario';
import { safeStore } from '../app/storage';
import { lx, scoring, visibleOptions } from '../app/options';
import { initAnalyst } from './analyst/sheet';
import { registerRenderers } from './refresh';
import { applyTheme, bindEvents } from './events';
import { bindStyleGuide } from './styleGuide';
import { bindStepActions } from './steps/actions';
import { bindAnswerActions } from './answer/screenActions';
import { bindFineTuneActions } from './answer/fineTuneActions';
import { rerenderScreen, startRouter } from './steps/router';
import { bindAiActions } from './analyst/aiSheet';
import { bindSheets } from './components/sheet';
import { bindNumberFields } from './components/field';
import { bindSliders } from './components/slider';

/** Boot the page: scenario, theme, event handlers, analyst, router, and the read-only `window.__tbl` hook used by QA. */
export function init(): void {
  // Public defaults (decisions 7, 8, P1); QA runs may ask for the original Lexus test case instead.
  applyScenario(state, readQaScenario(window) === 'legacy' ? LEGACY_SCENARIO : PUBLIC_DEFAULTS);
  state.theme = themeFrom(safeStore('tbl-theme'));
  applyTheme();
  bindEvents();
  registerRenderers({ screen: rerenderScreen });
  void initAnalyst();
  bindSheets();
  bindNumberFields();
  bindSliders();
  bindStyleGuide();
  bindStepActions();
  bindAnswerActions();
  bindFineTuneActions();
  bindAiActions();
  startRouter();
  // Expose a tiny read-only hook so automated QA can verify state without scraping.
  (window as unknown as { __tbl: unknown }).__tbl = {
    snapshot: () => {
      const keep = computeOption(state.g, lx(), 'none', lx());
      return {
        theme: state.theme,
        mode: state.mode,
        preset: state.preset,
        path: state.g.disposal,
        cars: state.vehicles.filter((v) => v.owned || state.selected.includes(v.id)).map((v) => ({ id: v.id, short: v.short, owned: !!v.owned, price: v.price, mpg: v.mpg, kwhPer100mi: v.kwhPer100mi })),
        g: { gasPrice: state.g.gasPrice, milesPerYear: state.g.milesPerYear, elecPrice: state.g.elecPrice },
        selected: [...state.selected],
        ranks: scoreOptions(state.g, state.vehicles, visibleOptions(), scoring()).map((s) => ({ id: s.spec.id, rank: s.rank, overall: s.overall, planet: s.pillars.planet, profit: s.pillars.profit, npv: s.result.netCostNPV })),
        keepNPV: keep.netCostNPV
      };
    }
  };
}
