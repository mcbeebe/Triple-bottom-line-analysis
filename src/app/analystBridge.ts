import { breakEvenGasPrice, paybackYear, scoreOptions, type Vehicle } from '../engine';
import { buildPrompt, sensitivityRows, type CarInfo, type FieldInfo, type ResultRow } from '../analyst';
import { num } from './format';
import { defaultOf, fieldRegistry, readField } from './fields';
import { hasCar, incentiveTotal, keepOf, kindLabel, lx, optionName, scoring, tagFor, vehicle, visibleOptions } from './options';
import { state } from './state';
import { analyst } from './analystSession';

/** Example situations offered as chips above the analyst box. */
export const AN_EXAMPLES = [
  'I drive about 40 miles a day, mostly freeway, and I can charge at home on solar.',
  'I tow a small trailer and have two kids. I want something efficient but cannot risk running out of range.',
  'I am not sure an EV is worth it. What would make keeping my current car the right call?',
  'Money is tight. I want the lowest monthly cost, even if it is less green.',
  'I drive a 2014 Subaru Outback worth about $9,000 and might trade it in for a hybrid. Which is better, trading in or selling it myself?',
  'I do not own a car right now and need one. Compare a few for me.'
];

/** Stored value to the unit shown in inputs (fractions as percent). */
export const toShown = (f: FieldInfo, v: number): number => (f.kind === 'fraction' ? Math.round(v * 1e6) / 1e4 : Math.round(v * 1e4) / 1e4);

/** Shown value back to stored units. */
export const fromShown = (f: FieldInfo, v: number): number => (f.kind === 'fraction' ? v / 100 : v);

/** Display text for a field value with its unit. */
export const fmtField = (f: FieldInfo, v: number): string => (f.kind === 'yesno' ? (v ? 'Yes' : 'No') : f.kind === 'fraction' ? `${num(v * 100, 2)}%` : `${num(v, v % 1 === 0 ? 0 : 2)}${f.unit ? ' ' + f.unit : ''}`);

/** Snapshot of every input currently on screen, in stored units, for the analyst. */
export function analystFields(): Map<string, FieldInfo> {
  const out = new Map<string, FieldInfo>();
  fieldRegistry.forEach((f, id) => {
    const v = f.scope === 'g' ? undefined : state.vehicles.find((x) => x.id === f.scope);
    const where = f.sub === 'loan' ? ' (loan)' : f.sub === 'lease' ? ' (lease)' : '';
    out.set(id, {
      id,
      label: `${v ? v.short + ': ' : ''}${f.meta.label}${where}`,
      unit: f.meta.pct ? '%' : f.meta.unit,
      value: readField(f),
      defaultValue: defaultOf(f),
      min: f.meta.bool ? 0 : f.meta.min,
      max: f.meta.bool ? 1 : f.meta.max,
      kind: f.meta.bool ? 'yesno' : f.meta.pct ? 'fraction' : 'number',
      note: f.meta.note ? f.meta.note.slice(0, 140) : undefined
    });
  });
  return out;
}

/** Catalog cars the analyst may suggest adding (not owned, not custom, not already selected). */
export function addableCars(): Vehicle[] {
  return state.vehicles.filter((v) => !v.owned && state.groups[v.id] !== 'custom' && !state.selected.includes(v.id));
}

/** Build the full analyst prompt from the current state: inputs, results, what-ifs, cars and settings. */
export function analystPrompt(task: 'guide' | 'explain'): string {
  const opts = visibleOptions();
  const scored = scoreOptions(state.g, state.vehicles, opts, scoring());
  const keep = keepOf(scored);
  const results: ResultRow[] = [...scored]
    .sort((a, b) => a.rank - b.rank)
    .map((s) => {
      const none = s.spec.financing === 'none';
      const be = none || !hasCar() ? null : breakEvenGasPrice(state.g, s.vehicle, s.spec.financing, lx());
      const pb = none || !keep ? null : paybackYear(s.result, keep.result);
      return {
        rank: s.rank,
        option: optionName(s.spec),
        type: kindLabel(s.vehicle),
        financing: tagFor(s.spec),
        overall: Math.round(s.overall * 10) / 10,
        planet: Math.round(s.pillars.planet),
        people: Math.round(s.pillars.people),
        profit: Math.round(s.pillars.profit),
        netCostPV: Math.round(s.result.netCostNPV),
        co2eTonnes: Math.round(s.result.co2.total * 10) / 10,
        monthlyPayment: none ? null : Math.round(s.result.monthlyPayment),
        incentivesAndTaxSavings: none ? null : Math.round(incentiveTotal(s.result)),
        breakEvenGasPrice: none ? '-' : be === null ? 'none below $40/gal' : `$${num(be, 2)}/gal`,
        payback: none ? '-' : pb === null ? `not within ${state.g.horizonYears} yrs` : `year ${pb}`
      };
    });
  const cars: CarInfo[] = state.vehicles
    .filter((v) => !v.owned)
    .map((v) => ({ id: v.id, name: v.name, kind: v.kind, price: Math.round(v.price), selected: state.selected.includes(v.id), group: state.groups[v.id] }));
  const lead = task === 'explain' ? 'TASK: Explain these results in plain language and say what would change the outcome. Ask for more inputs only if essential.\n' : 'TASK: Work out which inputs matter for this person and suggest values; also say how the answer could change.\n';
  return buildPrompt({
    scenario: lead + analyst.text,
    history: analyst.history,
    fields: [...analystFields().values()],
    results,
    sensitivity: sensitivityRows(state.g, state.vehicles, opts, scoring(), optionName),
    cars,
    currentCar: hasCar() ? { name: lx().short, kind: lx().kind, saleValue: Math.round(lx().price) } : null,
    selectedCars: state.selected.map((id) => vehicle(id)?.short).filter(Boolean),
    settings: { path: state.g.disposal, mode: state.mode, scale: state.scale, aggregation: state.aggregation, preset: state.preset, view: state.view, horizonYears: state.g.horizonYears }
  });
}
