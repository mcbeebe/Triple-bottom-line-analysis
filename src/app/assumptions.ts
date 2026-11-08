import { DEFAULT_CRITERIA, DEFAULT_GLOBALS, GLOBAL_META, type ParamMeta } from '../data';
import type { Vehicle } from '../engine';
import { SUB_OF, defaultOfIn, readFieldIn, type Field } from './fields';
import { decimalsOf } from './numberText';
import { clone, type State } from './state';

/** Top drivers edited at the top of Fine-tune; left out of "Key drivers" so one value never has two inputs. */
export const TOP_DRIVER_KEYS = ['milesPerYear', 'gasPrice', 'tradeInDiscount'] as const;

/** "Please confirm" values: eligibility and tax answers only the visitor knows. */
export const CONFIRM_KEYS = ['firstTimeZev', 'cc4a', 'loanInterestDeduction', 'jointFiling', 'magi', 'marginalTaxRate'] as const;
/** Emissions factors. */
export const EMISSION_KEYS = ['gridKgPerKwh', 'gasKgPerGal', 'gasUpstreamKgPerGal', 'evRealWorldPenalty', 'vehicleLifeYears'] as const;
/** Everything else: escalation, tax, charger and grant amounts. */
export const OTHER_KEYS = ['gasEscalation', 'elecEscalation', 'salesTax', 'chargerCost', 'chargerRebate', 'cc4aEvGrant', 'cc4aHybridGrant', 'cc4aCharger', 'deductionMonths'] as const;

/** Each car's numbers, grouped as on the old grid (meta keys; lease keys use the meta names). */
export const CAR_GROUPS: { id: string; title: string; keys: string[] }[] = [
  { id: 'price', title: 'Price and efficiency', keys: ['price', 'mpg', 'kwhPer100mi', 'realWorldAdj'] },
  { id: 'running', title: 'Running costs', keys: ['maintPerMile', 'insurancePerYear'] },
  { id: 'value', title: 'Value and footprint', keys: ['annualValueLoss', 'depreciation5yr', 'embodiedT'] },
  { id: 'incentives', title: 'Incentives', keys: ['usAssembled', 'zevRebate'] },
  { id: 'loan', title: 'Loan', keys: ['apr', 'termMonths', 'down'] },
  { id: 'lease', title: 'Lease', keys: ['monthly', 'dueAtSigning', 'leaseTerm'] }
];

/** One section of "All assumptions": the global values it holds. */
export interface AssumptionSection {
  id: 'confirm' | 'drivers' | 'emissions' | 'other';
  title: string;
  fields: Field[];
}

const globalField = (key: string): Field => ({ sec: 'g', scope: 'g', sub: '', key, meta: GLOBAL_META[key] });

/**
 * The global sections of "All assumptions" for state `s`. Clean Cars 4 All, the trade-in leakage and the
 * horizon rows follow the path; the top drivers are left out (they sit above, in Fine-tune).
 */
export function assumptionSections(s: State): AssumptionSection[] {
  const hasCar = s.g.disposal !== 'none';
  const drivers = ['horizonYears', 'elecPrice', 'discountRate', ...(hasCar ? ['lxLeakage'] : [])];
  return [
    { id: 'confirm', title: 'Please confirm', fields: CONFIRM_KEYS.filter((k) => hasCar || k !== 'cc4a').map(globalField) },
    { id: 'drivers', title: 'Key drivers', fields: drivers.map(globalField) },
    { id: 'emissions', title: 'Emissions', fields: EMISSION_KEYS.map(globalField) },
    { id: 'other', title: 'Other costs and grants', fields: OTHER_KEYS.map(globalField) }
  ];
}

/** Cars whose numbers can be edited: the car you have (unless "just buy") and the cars being compared, in that order. */
export function editableCars(s: State): Vehicle[] {
  const owned = s.g.disposal !== 'none' ? s.vehicles.filter((v) => v.owned) : [];
  return [...owned, ...s.selected.map((id) => s.vehicles.find((v) => v.id === id)).filter((v): v is Vehicle => !!v && !v.owned)];
}

/** One group of a car's numbers; `addLease` is true when the car could have a lease but has none yet. */
export interface CarFieldGroup {
  id: string;
  title: string;
  fields: Field[];
  addLease: boolean;
}

/**
 * A car's numbers in groups (decision D1: one car at a time). Fields the car does not have (mpg on an EV,
 * a loan on the car you own) are left out, and so are empty groups, except Lease, which offers "Add a lease"
 * on a car that is being compared.
 */
export function carFieldGroups(s: State, carId: string): CarFieldGroup[] {
  const v = s.vehicles.find((x) => x.id === carId);
  if (!v) return [];
  const meta = s.meta[carId] ?? {};
  const out: CarFieldGroup[] = [];
  for (const g of CAR_GROUPS) {
    const fields: Field[] = [];
    for (const mk of g.keys) {
      const m: ParamMeta | undefined = meta[mk];
      if (!m) continue;
      const map = SUB_OF[mk] ?? { sub: '' as const, key: mk };
      if (map.sub === 'lease' && !v.lease) continue;
      if (map.sub === 'loan' && !v.loan) continue;
      fields.push({ sec: 'cars', scope: carId, sub: map.sub, key: map.key, meta: m });
    }
    const addLease = g.id === 'lease' && !v.owned && !v.lease && !!meta.monthly;
    if (fields.length || addLease) out.push({ id: g.id, title: g.title, fields, addLease });
  }
  return out;
}

/** True when a field differs from its default in state `s`. */
export const isEditedIn = (s: State, f: Field): boolean => Math.abs(readFieldIn(s, f) - defaultOfIn(s, f)) > 1e-9;

/** How many of `fields` differ from their defaults. */
export const editedCount = (s: State, fields: Field[]): number => fields.filter((f) => isEditedIn(s, f)).length;

/** Find an editable field by its id (`scope.sub.key`) among every value in state `s`. */
export function findField(s: State, id: string): Field | undefined {
  const [scope, sub, ...rest] = id.split('.');
  const key = rest.join('.');
  if (scope === 'g') return GLOBAL_META[key] ? globalField(key) : undefined;
  const v = s.vehicles.find((x) => x.id === scope);
  if (!v || (sub !== '' && sub !== 'loan' && sub !== 'lease')) return undefined;
  const metaKey = sub === 'lease' && key === 'termMonths' ? 'leaseTerm' : key;
  const meta = s.meta[scope]?.[metaKey];
  if (!meta) return undefined;
  const map = SUB_OF[metaKey] ?? { sub: '' as const, key: metaKey };
  if (map.sub !== sub || (sub === 'lease' && !v.lease) || (sub === 'loan' && !v.loan)) return undefined;
  return { sec: scope === 'g' ? 'g' : 'cars', scope, sub, key, meta };
}

/** How a field is shown in a text input: percent values as percentages, money with a "$" and unit words. */
export interface FieldDisplay {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  money: boolean;
  unit?: string;
}

const UNIT_WORDS: Record<string, string> = {
  '$/gal': 'a gallon',
  '$/kWh': 'per kWh',
  '$/mi': 'per mile',
  '$/mo': 'a month',
  '$/yr': 'a year',
  '%': '%',
  yrs: 'years',
  mi: 'miles',
  mo: 'months',
  t: 'tonnes',
  'kg/kWh': 'kg per kWh',
  'kg/gal': 'kg per gallon',
  mpg: 'mpg',
  'kWh/100mi': 'kWh per 100 miles',
  x: 'x'
};

/** Plain label for a field: the loan and lease terms are named, "Price incl. destination" is shortened. */
export function fieldLabel(f: Field): string {
  if (f.key === 'termMonths') return f.sub === 'lease' ? 'Lease term' : 'Loan term';
  if (f.scope !== 'g' && f.key === 'price') return f.meta.label.replace('Sale value today', 'What it would sell for').replace('Price incl. destination', 'Price');
  return f.meta.label;
}

/** Display values for a numeric field in state `s` (percent fields scaled by 100). */
export function fieldDisplay(s: State, f: Field): FieldDisplay {
  const k = f.meta.pct ? 100 : 1;
  const money = f.meta.unit.startsWith('$');
  const unit = f.meta.unit === '$' || f.meta.unit === '' ? undefined : UNIT_WORDS[f.meta.unit] ?? f.meta.unit;
  const r = (x: number) => Math.round(x * k * 1e6) / 1e6;
  // Money with cents shows two decimals (gas $5.50, not $5.5); finer steps such as $0.001 a mile stay finer.
  const step = money && f.meta.step < 1 ? Math.min(r(f.meta.step), 0.01) : r(f.meta.step);
  return { label: fieldLabel(f), value: r(readFieldIn(s, f)), min: r(f.meta.min), max: r(f.meta.max), step, money, unit };
}

/** The value as shown for the default: "Yes"/"No", a percentage, or a plain number, for "Reset to …". */
export function defaultText(s: State, f: Field): string {
  const d = defaultOfIn(s, f);
  if (f.meta.bool) return d ? 'Yes' : 'No';
  const v = f.meta.pct ? d * 100 : d;
  const dec = decimalsOf(fieldDisplay(s, f).step);
  const t = v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  return f.meta.pct ? `${t}%` : f.meta.unit.startsWith('$') ? `$${t}` : t;
}

/** Give a compared car a lease priced from its sticker (about 1.1% a month), in its values and its defaults. */
export function addLease(s: State, carId: string): boolean {
  const v = s.vehicles.find((x) => x.id === carId);
  if (!v || v.owned || v.lease) return false;
  const monthly = Math.round((v.price * 0.011) / 5) * 5;
  v.lease = { monthly, dueAtSigning: monthly + 2500, termMonths: 36 };
  const d = s.defaults.find((x) => x.id === carId);
  if (d) d.lease = clone(v.lease);
  return true;
}

/** Put every value back to its default: globals, every car's numbers and the People criteria. Cars stay chosen. */
export function resetAll(s: State): void {
  const disposal = s.g.disposal;
  s.g = clone(DEFAULT_GLOBALS);
  s.g.disposal = disposal;
  s.vehicles = clone(s.defaults);
  s.criteria = clone(DEFAULT_CRITERIA);
}

/**
 * Every value the analyst may read and suggest, in the order of Fine-tune: the top drivers (the trade-in
 * discount only on the trade path), the All assumptions sections, then each editable car's numbers. Cars that
 * are not being compared are left out, as the old page's registry did.
 */
export function analystFieldList(s: State): Field[] {
  const top = TOP_DRIVER_KEYS.filter((k) => k !== 'tradeInDiscount' || s.g.disposal === 'trade').map(globalField);
  const sections = assumptionSections(s).flatMap((x) => x.fields);
  const cars = editableCars(s).flatMap((v) => carFieldGroups(s, v.id).flatMap((g) => g.fields));
  return [...top, ...sections, ...cars];
}
