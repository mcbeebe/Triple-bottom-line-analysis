import { breakEvenGasPrice, optionsFor, paybackYear, scoreOptions, WEIGHT_PRESETS, type OptionSpec, type ScoredOption, type Scoring, type ScoringMode, type Vehicle } from '../engine';
import { MODES, state } from './state';
import { num } from './format';

/** The car you have now (the owned vehicle). */
export const lx = (): Vehicle => state.vehicles.find((v) => v.owned) as Vehicle;
/** Vehicle by id; callers pass ids that exist in state. */
export const vehicle = (id: string): Vehicle => state.vehicles.find((v) => v.id === id) as Vehicle;
/** True unless the path is "just buy" (no car to keep, sell or trade). */
export const hasCar = (): boolean => state.g.disposal !== 'none';
/** Vehicles that take part in the comparison: the owned car (when there is one) plus the selected cars. */
export const activeVehicles = (): Vehicle[] => state.vehicles.filter((v) => (v.owned && hasCar()) || (!v.owned && state.selected.includes(v.id)));
/** The keep-your-car option among scored options, or null on the "just buy" path. */
export const keepOf = (scored: ScoredOption[]): ScoredOption | null => scored.find((s) => s.spec.financing === 'none') ?? null;
/** Short name of the car you have now, for sentences. */
export const carNow = (): string => lx().short;

/** Every option (loan and lease per selected car, plus keep when there is a car), before the financing filter. */
export function allOptions(): OptionSpec[] {
  return optionsFor(state.vehicles, state.selected, hasCar());
}

/** Options after the "financing shown" filter. */
export function visibleOptions(): OptionSpec[] {
  return allOptions().filter((o) => o.financing === 'none' || state.view === 'both' || o.financing === state.view);
}

/** Current scoring settings, optionally overridden (used by the sensitivity grid). */
export function scoring(over: Partial<Scoring> = {}): Scoring {
  return {
    mode: state.mode,
    aggregation: state.aggregation,
    scale: state.scale,
    pillarWeights: state.weights,
    criteria: state.criteria,
    ...over
  };
}

/** Display name for an option, e.g. "Keep Lexus LX 470" or "Tesla Model Y (loan)". */
export function optionName(o: OptionSpec): string {
  const v = vehicle(o.vehicleId);
  return o.financing === 'none' ? `Keep ${v.short}` : `${v.short} (${o.financing})`;
}

/** Short financing tag for an option. */
export function tagFor(o: OptionSpec): string {
  return o.financing === 'none' ? 'Status quo' : o.financing === 'loan' ? 'Loan' : 'Lease';
}

/** Short label for the current scale, for summaries. */
export const scaleLabel = (): string => (state.scale === 'benchmark' ? 'vs. a typical new car' : state.scale === 'anchored' ? (hasCar() ? 'vs. keeping your car' : 'vs. a typical new car') : 'vs. the field');
/** One-line explanation (HTML) of what a score of 50 means on the current scale. */
export const scaleBlurb = (): string =>
  state.scale === 'benchmark'
    ? '<b>50 = costs and emits the same as a typical new car</b> (AAA and EPA averages at your mileage); higher is better. Every car, including the one you own, moves when its own inputs change.'
    : state.scale === 'anchored'
      ? (hasCar() ? '<b>50 = same as keeping your current car</b>, so it always scores exactly 50 on Planet and Profit; higher is better than keeping it.' : '<b>50 = a typical new car</b> (there is no current car to anchor on, so this uses the typical-new-car scale); higher is better.')
      : 'best option in the field = 100, worst = 10 (scores shift when options are added or removed).';

/** EV, Hybrid or Gas. */
export const kindLabel = (v: Vehicle): string => (v.kind === 'ev' ? 'EV' : v.kind === 'hybrid' ? 'Hybrid' : 'Gas');

/** Gas price at which this option costs the same as keeping your car, as display text. */
export function gasBreakEven(o: ScoredOption): string {
  if (o.spec.financing === 'none' || !hasCar()) return '-';
  const p = breakEvenGasPrice(state.g, o.vehicle, o.spec.financing, lx());
  if (p === null) return 'Not below $40/gal';
  if (p === 0) return 'Wins even at $0';
  return `$${num(p, 2)}/gal`;
}

/** Year in which this option has paid back versus keeping, as display text. */
export function paybackText(o: ScoredOption, keep: ScoredOption | null): string {
  if (o.spec.financing === 'none' || !keep) return '-';
  const y = paybackYear(o.result, keep.result);
  return y === null ? `Not within ${state.g.horizonYears} yrs` : `Year ${y}`;
}

/** Sum of every incentive and tax saving counted for a result. */
export const incentiveTotal = (r: ScoredOption['result']): number =>
  r.incentives.zevRebate + r.incentives.cc4aGrant + r.incentives.chargerSavings + r.incentives.loanDeduction;

/** Winner under every pillar weighting and scoring mode, using the current scale and aggregation. */
export function sensitivityGrid(): { preset: string; cells: { mode: ScoringMode; winner: string }[] }[] {
  const opts = visibleOptions();
  return Object.entries(WEIGHT_PRESETS).map(([preset, w]) => ({
    preset,
    cells: MODES.map((m) => {
      const s = scoreOptions(state.g, state.vehicles, opts, scoring({ mode: m.id, pillarWeights: w }));
      const top = s.find((x) => x.rank === 1) as ScoredOption;
      return { mode: m.id, winner: optionName(top.spec) };
    })
  }));
}

/** Stable color slot per vehicle: the original four keep their colors; others rotate. */
export function colorKey(id: string): string {
  const fixed: Record<string, string> = { lx: 'lx', tesla: 'tesla', rivian: 'rivian', bolt: 'bolt' };
  if (fixed[id]) return fixed[id];
  const i = state.vehicles.findIndex((v) => v.id === id);
  return `x${i % 6}`;
}
