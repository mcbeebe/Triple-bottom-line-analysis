import type { Disposal } from '../engine';
import { CATALOG, GLOBAL_META, currentCarFromPreset, makeCustomVehicle, type ParamMeta } from '../data';
import { addCustomCar, removeCustomCar, selectCarPreset } from './mutations';
import { MAX_SELECTED, type State } from './state';

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

/**
 * What the guided steps decide. Phase 2 holds only what the steps set; Fine-tune edits and scoring
 * settings join in Phase 3 with share links.
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
}

/** Public defaults (decisions 7, 8 and P1): the older gas sedan, with a Bolt, a Camry Hybrid and a Corolla. */
export const PUBLIC_DEFAULTS: Scenario = {
  v: 1,
  path: 'sell',
  carPreset: 'sedan',
  carOverrides: {},
  miles: 7500,
  selected: ['bolt', 'camryh', 'corolla'],
  customCars: []
};

/** Today's original test case (Lexus, Tesla, Rivian, Bolt). Used only by the QA hook to keep the old suites meaningful. */
export const LEGACY_SCENARIO: Scenario = {
  v: 1,
  path: 'sell',
  carPreset: 'lexus',
  carOverrides: {},
  miles: 7500,
  selected: ['tesla', 'rivian', 'bolt'],
  customCars: []
};

const PRESETS: PresetId[] = ['sedan', 'suv', 'hybrid', 'lexus', 'custom'];
const PATHS: Disposal[] = ['sell', 'trade', 'none'];
const OWNED_KEYS: OwnedKey[] = ['price', 'mpg', 'maintPerMile', 'insurancePerYear'];
const CATALOG_IDS = new Set(CATALOG.filter((c) => !c.vehicle.owned).map((c) => c.vehicle.id));
const OWNED_META = currentCarFromPreset('sedan').meta;

const clampTo = (m: Pick<ParamMeta, 'min' | 'max'>, v: number): number => Math.min(m.max, Math.max(m.min, v));
const customMeta = (kind: CustomCarScenario['kind']) => makeCustomVehicle(kind, 1).meta;

/** Check a scenario: unknown values are replaced or dropped, numbers clamped, the selection capped. Lists what changed. */
export function normalizeScenario(sc: Scenario): { scenario: Scenario; problems: string[] } {
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
  const customCars = (sc.customCars ?? [])
    .filter((c) => ['ev', 'hybrid', 'ice'].includes(c.kind) || (problems.push(`Dropped a custom car of unknown type.`), false))
    .map((c) => {
      const m = customMeta(c.kind);
      const effMeta = c.kind === 'ev' ? m.kwhPer100mi : m.mpg;
      return { kind: c.kind, price: clampTo(m.price, c.price), efficiency: clampTo(effMeta, c.efficiency), selected: !!c.selected };
    });
  const seen = new Set<string>();
  let selected = (sc.selected ?? []).filter((id) => {
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
  return { scenario: { v: 1, path, carPreset, carOverrides, miles, selected, customCars }, problems };
}

/** Apply a scenario to state `s` in place (after normalizing it) and return `s`. Does not mark a path as chosen. */
export function applyScenario(s: State, sc: Scenario): State {
  const n = normalizeScenario(sc).scenario;
  s.g.disposal = n.path;
  selectCarPreset(s, n.carPreset);
  const owned = s.vehicles.find((v) => v.owned);
  if (owned) for (const [k, v] of Object.entries(n.carOverrides)) (owned as unknown as Record<string, number>)[k] = v as number;
  s.g.milesPerYear = n.miles;
  for (const id of Object.keys(s.groups).filter((id) => s.groups[id] === 'custom')) removeCustomCar(s, id);
  s.customCount = 0;
  s.selected = [...n.selected];
  for (const c of n.customCars) addCustomCar(s, { kind: c.kind, price: c.price, efficiency: c.efficiency }, c.selected);
  s.notice = '';
  return s;
}

/** Read the scenario the steps can see back out of state (custom car names are left out on purpose). */
export function scenarioFrom(s: State): Scenario {
  const owned = s.vehicles.find((v) => v.owned) as unknown as Record<string, number>;
  const dflt = s.defaults.find((v) => v.owned) as unknown as Record<string, number>;
  const carOverrides: Partial<Record<OwnedKey, number>> = {};
  for (const k of OWNED_KEYS) if (owned && dflt && Math.abs(owned[k] - dflt[k]) > 1e-9) carOverrides[k] = owned[k];
  const customCars = s.vehicles
    .filter((v) => s.groups[v.id] === 'custom')
    .map((v) => ({ kind: v.kind, price: v.price, efficiency: v.kind === 'ev' ? v.kwhPer100mi : v.mpg, selected: s.selected.includes(v.id) }));
  return {
    v: 1,
    path: s.g.disposal,
    carPreset: (PRESETS.includes(s.carPreset as PresetId) ? s.carPreset : 'sedan') as PresetId,
    carOverrides,
    miles: s.g.milesPerYear,
    selected: s.selected.filter((id) => CATALOG_IDS.has(id)),
    customCars
  };
}

/** Name of the scenario a QA run asked for, read once at boot from a window global (never from the URL). */
export function readQaScenario(w: unknown): 'legacy' | null {
  const qa = (w as { __TBL_QA__?: unknown } | undefined)?.__TBL_QA__;
  return typeof qa === 'object' && qa !== null && (qa as { scenario?: unknown }).scenario === 'legacy' ? 'legacy' : null;
}
