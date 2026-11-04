import { WEIGHT_PRESETS, type Aggregation, type Disposal, type PillarWeights, type ScaleMode, type ScoringMode } from '../engine';
import { CATALOG, DEFAULT_CRITERIA, DEFAULT_GLOBALS, GLOBAL_META, VEHICLE_META, currentCarFromPreset, makeCustomVehicle, type ParamMeta } from '../data';
import { SUB_OF, allFields, defaultOfIn, fieldId, readFieldIn, writeFieldIn } from './fields';
import { addCustomCar, selectCarPreset } from './mutations';
import { MAX_SELECTED, freshState, type State } from './state';

/** Starting points for the car you have now; 'custom' is "Something else" (sedan values, named "My car"). */
export type PresetId = 'sedan' | 'suv' | 'hybrid' | 'lexus' | 'custom';

/** The owned-car numbers the steps can change. */
export type OwnedKey = 'price' | 'mpg' | 'maintPerMile' | 'insurancePerYear';

/** A car the visitor added. Names are free text and stay out of a scenario (they must never reach a URL). */
export interface CustomCarScenario {
  kind: 'ev' | 'hybrid' | 'ice';
  price: number;
  /** mpg for gas and hybrid cars, kWh per 100 miles for EVs. */
  efficiency: number;
  selected: boolean;
}

/** Scoring and display settings a shared answer carries. */
export interface ScenarioSettings {
  mode: ScoringMode;
  scale: ScaleMode;
  aggregation: Aggregation;
  /** A key of WEIGHT_PRESETS, or 'custom' (then `weights` is used). */
  preset: string;
  weights: PillarWeights;
  view: 'both' | 'loan' | 'lease';
  embodied: 'allocated' | 'full';
}

/**
 * Everything an answer depends on. Edits are keyed like the field registry (`scope.sub.key`), plus
 * `rate.<vehicle>.<criterion>` for 1-5 ratings and `cw.<criterion>` for criterion weights; custom cars are
 * referred to by position (custom1, custom2, ...). Only values that differ from their defaults are kept.
 */
export interface Scenario {
  v: 1;
  path: Disposal;
  carPreset: PresetId;
  carOverrides: Partial<Record<OwnedKey, number>>;
  miles: number;
  /** Catalog car ids. */
  selected: string[];
  customCars: CustomCarScenario[];
  edits: Record<string, number>;
  settings: ScenarioSettings;
}

/** A scenario as it may arrive (older shapes, links): edits and settings default when missing. */
export type ScenarioInput = Omit<Scenario, 'edits' | 'settings'> & { edits?: Record<string, number>; settings?: Partial<ScenarioSettings> };

/** Settings of a fresh page. */
export const DEFAULT_SETTINGS: ScenarioSettings = {
  mode: 'hybrid',
  scale: 'benchmark',
  aggregation: 'average',
  preset: 'balanced',
  weights: { ...WEIGHT_PRESETS.balanced },
  view: 'both',
  embodied: DEFAULT_GLOBALS.embodiedMode
};

/** Public defaults (decisions 7, 8 and P1): the older gas sedan, with a Bolt, a Camry Hybrid and a Corolla. */
export const PUBLIC_DEFAULTS: Scenario = {
  v: 1,
  path: 'sell',
  carPreset: 'sedan',
  carOverrides: {},
  miles: 7500,
  selected: ['bolt', 'camryh', 'corolla'],
  customCars: [],
  edits: {},
  settings: DEFAULT_SETTINGS
};

/** Today's original test case (Lexus, Tesla, Rivian, Bolt). Used only by the QA hook to keep the old suites meaningful. */
export const LEGACY_SCENARIO: Scenario = { ...PUBLIC_DEFAULTS, carPreset: 'lexus', selected: ['tesla', 'rivian', 'bolt'] };

const PRESETS: PresetId[] = ['sedan', 'suv', 'hybrid', 'lexus', 'custom'];
const PATHS: Disposal[] = ['sell', 'trade', 'none'];
const OWNED_KEYS: OwnedKey[] = ['price', 'mpg', 'maintPerMile', 'insurancePerYear'];
const CATALOG_IDS = new Set(CATALOG.filter((c) => !c.vehicle.owned).map((c) => c.vehicle.id));
const OWNED_META = currentCarFromPreset('sedan').meta;
const CRITERIA = new Set(DEFAULT_CRITERIA.map((c) => c.id));

const clampTo = (m: Pick<ParamMeta, 'min' | 'max'>, v: number): number => Math.min(m.max, Math.max(m.min, v));
const customMeta = (kind: CustomCarScenario['kind']) => makeCustomVehicle(kind, 1).meta;
const oneOf = <T extends string>(v: unknown, list: readonly T[], dflt: T): T => (list.includes(v as T) ? (v as T) : dflt);

/** Meta key for a field's (sub, key): the lease term is stored as `termMonths` but its meta key is `leaseTerm`. */
const metaKeyOf = (sub: string, key: string): string => (sub === 'lease' && key === 'termMonths' ? 'leaseTerm' : key);

/** The range rules for an edit id, or null when the id is not something a scenario may set. */
function editRule(id: string, customs: CustomCarScenario[]): ParamMeta | 'rating' | 'weight' | null {
  const parts = id.split('.');
  if (parts[0] === 'cw') return parts.length === 2 && CRITERIA.has(parts[1]) ? 'weight' : null;
  if (parts[0] === 'rate') {
    if (parts.length !== 3 || !CRITERIA.has(parts[2])) return null;
    const v = parts[1];
    const n = /^custom(\d+)$/.exec(v);
    return v === 'lx' || CATALOG_IDS.has(v) || (n && Number(n[1]) >= 1 && Number(n[1]) <= customs.length) ? 'rating' : null;
  }
  if (parts.length !== 3) return null;
  const [scope, sub, key] = parts;
  if (!['', 'loan', 'lease'].includes(sub)) return null;
  if (sub !== '' && !(SUB_OF[metaKeyOf(sub, key)]?.sub === sub)) return null;
  const mk = metaKeyOf(sub, key);
  if (scope === 'g') return sub === '' && key !== 'milesPerYear' ? GLOBAL_META[key] ?? null : null;
  if (scope === 'lx') return sub === '' && OWNED_KEYS.includes(key as OwnedKey) ? null : OWNED_META[mk] ?? null;
  if (CATALOG_IDS.has(scope)) return VEHICLE_META[scope]?.[mk] ?? null;
  const n = /^custom(\d+)$/.exec(scope);
  if (n && Number(n[1]) >= 1 && Number(n[1]) <= customs.length) return customMeta(customs[Number(n[1]) - 1].kind)[mk] ?? null;
  return null;
}

function normalizeSettings(t: Partial<ScenarioSettings> | undefined, problems: string[]): ScenarioSettings {
  if (!t) return { ...DEFAULT_SETTINGS, weights: { ...DEFAULT_SETTINGS.weights } };
  const preset = t.preset === 'custom' || (t.preset !== undefined && WEIGHT_PRESETS[t.preset]) ? t.preset : 'balanced';
  if (t.preset !== undefined && preset !== t.preset) problems.push(`Unknown weighting "${String(t.preset)}"; used balanced.`);
  const w = t.weights;
  const okW = w && (['planet', 'people', 'profit'] as const).every((k) => Number.isFinite(w[k]) && w[k] >= 0 && w[k] <= 1);
  const weights = preset === 'custom' && okW ? { planet: w.planet, people: w.people, profit: w.profit } : { ...WEIGHT_PRESETS[preset === 'custom' ? 'balanced' : preset] };
  return {
    mode: oneOf(t.mode, ['hybrid', 'metrics', 'ratings'] as const, 'hybrid'),
    scale: oneOf(t.scale, ['benchmark', 'anchored', 'relative'] as const, 'benchmark'),
    aggregation: oneOf(t.aggregation, ['average', 'weakest'] as const, 'average'),
    preset: preset === 'custom' && !okW ? 'balanced' : preset,
    weights,
    view: oneOf(t.view, ['both', 'loan', 'lease'] as const, 'both'),
    embodied: oneOf(t.embodied, ['allocated', 'full'] as const, DEFAULT_GLOBALS.embodiedMode)
  };
}

/** Check a scenario: unknown values are replaced or dropped, numbers clamped, the selection capped. Lists what changed. */
export function normalizeScenario(sc: ScenarioInput): { scenario: Scenario; problems: string[] } {
  const problems: string[] = [];
  const path = PATHS.includes(sc.path) ? sc.path : (problems.push(`Unknown path "${String(sc.path)}"; used sell.`), 'sell' as Disposal);
  const carPreset = PRESETS.includes(sc.carPreset) ? sc.carPreset : (problems.push(`Unknown car preset "${String(sc.carPreset)}"; used sedan.`), 'sedan' as PresetId);
  const carOverrides: Partial<Record<OwnedKey, number>> = {};
  for (const [k, v] of Object.entries(sc.carOverrides ?? {})) {
    if (!OWNED_KEYS.includes(k as OwnedKey) || typeof v !== 'number' || !Number.isFinite(v)) {
      problems.push(`Ignored "${k}".`);
      continue;
    }
    const c = clampTo(OWNED_META[k], v);
    if (c !== v) problems.push(`Changed ${k} to ${c}.`);
    carOverrides[k as OwnedKey] = c;
  }
  const miles = clampTo(GLOBAL_META.milesPerYear, Number.isFinite(sc.miles) ? sc.miles : 7500);
  if (miles !== sc.miles) problems.push(`Changed miles to ${miles}.`);
  const customCars = (Array.isArray(sc.customCars) ? sc.customCars : [])
    .filter((c) => ['ev', 'hybrid', 'ice'].includes(c?.kind) || (problems.push('Dropped a custom car of unknown type.'), false))
    .map((c) => {
      const m = customMeta(c.kind);
      const effMeta = c.kind === 'ev' ? m.kwhPer100mi : m.mpg;
      return { kind: c.kind, price: clampTo(m.price, Number(c.price) || m.price.min), efficiency: clampTo(effMeta, Number(c.efficiency) || effMeta.min), selected: !!c.selected };
    });
  const seen = new Set<string>();
  let selected = (Array.isArray(sc.selected) ? sc.selected : []).filter((id) => {
    if (!CATALOG_IDS.has(id) || seen.has(id)) {
      problems.push(`Dropped car "${id}".`);
      return false;
    }
    seen.add(id);
    return true;
  });
  const room = MAX_SELECTED - customCars.filter((c) => c.selected).length;
  if (selected.length > room) {
    selected = selected.slice(0, Math.max(0, room));
    problems.push(`Kept ${MAX_SELECTED} cars; the limit is ${MAX_SELECTED}.`);
  }
  const edits: Record<string, number> = {};
  for (const [id, raw] of Object.entries(sc.edits ?? {})) {
    const rule = editRule(id, customCars);
    if (!rule || typeof raw !== 'number' || !Number.isFinite(raw)) {
      problems.push(`Ignored edit "${id}".`);
      continue;
    }
    edits[id] = rule === 'rating' ? Math.min(5, Math.max(1, Math.round(raw))) : rule === 'weight' ? Math.min(100, Math.max(0, raw)) : rule.bool ? (raw >= 0.5 ? 1 : 0) : clampTo(rule, raw);
  }
  const settings = normalizeSettings(sc.settings, problems);
  return { scenario: { v: 1, path, carPreset, carOverrides, miles, selected, customCars, edits, settings }, problems };
}

/**
 * Apply a scenario to state `s` in place (after normalizing it) and return `s`. Everything a scenario controls
 * is first reset to a fresh page, so earlier edits never leak through. Does not mark a path as chosen; view
 * state (theme, open panels, sort) is left alone.
 */
export function applyScenario(s: State, sc: ScenarioInput): State {
  const n = normalizeScenario(sc).scenario;
  const f = freshState();
  Object.assign(s, { g: f.g, vehicles: f.vehicles, defaults: f.defaults, meta: f.meta, ratingNotes: f.ratingNotes, groups: f.groups, criteria: f.criteria, customCount: 0 });
  s.g.disposal = n.path;
  selectCarPreset(s, n.carPreset);
  const owned = s.vehicles.find((v) => v.owned);
  if (owned) for (const [k, v] of Object.entries(n.carOverrides)) (owned as unknown as Record<string, number>)[k] = v as number;
  s.g.milesPerYear = n.miles;
  s.selected = [...n.selected];
  for (const c of n.customCars) addCustomCar(s, { kind: c.kind, price: c.price, efficiency: c.efficiency }, c.selected);
  for (const [id, v] of Object.entries(n.edits)) {
    const p = id.split('.');
    if (p[0] === 'cw') {
      const c = s.criteria.find((x) => x.id === p[1]);
      if (c) c.weight = v;
    } else if (p[0] === 'rate') {
      const veh = s.vehicles.find((x) => x.id === p[1]);
      if (veh) veh.ratings[p[2]] = v;
    } else {
      const meta = p[0] === 'g' ? GLOBAL_META[p[2]] : s.meta[p[0]]?.[metaKeyOf(p[1], p[2])];
      if (meta) writeFieldIn(s, { scope: p[0], sub: p[1] as '' | 'loan' | 'lease', key: p[2], meta }, v);
    }
  }
  const t = n.settings;
  Object.assign(s, { mode: t.mode, scale: t.scale, aggregation: t.aggregation, preset: t.preset, weights: { ...t.weights }, view: t.view });
  s.g.embodiedMode = t.embodied;
  s.notice = '';
  return s;
}

/** Read the scenario back out of state (custom car names and added lease terms are left out on purpose). */
export function scenarioFrom(s: State): Scenario {
  const owned = s.vehicles.find((v) => v.owned) as unknown as Record<string, number>;
  const dflt = s.defaults.find((v) => v.owned) as unknown as Record<string, number>;
  const carOverrides: Partial<Record<OwnedKey, number>> = {};
  for (const k of OWNED_KEYS) if (owned && dflt && Math.abs(owned[k] - dflt[k]) > 1e-9) carOverrides[k] = owned[k];
  const customs = s.vehicles.filter((v) => s.groups[v.id] === 'custom');
  const rename = new Map(customs.map((v, i) => [v.id, `custom${i + 1}`]));
  const idOf = (scope: string) => rename.get(scope) ?? scope;
  const edits: Record<string, number> = {};
  for (const f of allFields(s)) {
    if (f.scope === 'g' && f.key === 'milesPerYear') continue;
    if (f.scope === 'lx' && f.sub === '' && OWNED_KEYS.includes(f.key as OwnedKey)) continue;
    const cur = readFieldIn(s, f);
    if (Math.abs(cur - defaultOfIn(s, f)) > 1e-9) edits[fieldId({ ...f, scope: idOf(f.scope) })] = cur;
  }
  for (const v of s.vehicles) {
    const d = s.defaults.find((x) => x.id === v.id);
    for (const [c, r] of Object.entries(v.ratings)) if (d && d.ratings[c] !== r) edits[`rate.${idOf(v.id)}.${c}`] = r;
  }
  for (const c of s.criteria) {
    const d = DEFAULT_CRITERIA.find((x) => x.id === c.id);
    if (d && d.weight !== c.weight) edits[`cw.${c.id}`] = c.weight;
  }
  return {
    v: 1,
    path: s.g.disposal,
    carPreset: (PRESETS.includes(s.carPreset as PresetId) ? s.carPreset : 'sedan') as PresetId,
    carOverrides,
    miles: s.g.milesPerYear,
    selected: s.selected.filter((id) => CATALOG_IDS.has(id)),
    customCars: customs.map((v) => ({ kind: v.kind, price: v.price, efficiency: v.kind === 'ev' ? v.kwhPer100mi : v.mpg, selected: s.selected.includes(v.id) })),
    edits,
    settings: { mode: s.mode, scale: s.scale, aggregation: s.aggregation, preset: s.preset, weights: { ...s.weights }, view: s.view, embodied: s.g.embodiedMode }
  };
}

/** Name of the scenario a QA run asked for, read once at boot from a window global (never from the URL). */
export function readQaScenario(w: unknown): 'legacy' | null {
  const qa = (w as { __TBL_QA__?: unknown } | undefined)?.__TBL_QA__;
  return typeof qa === 'object' && qa !== null && (qa as { scenario?: unknown }).scenario === 'legacy' ? 'legacy' : null;
}
