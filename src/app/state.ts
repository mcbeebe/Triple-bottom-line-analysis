import { WEIGHT_PRESETS, type Aggregation, type Criterion, type Globals, type PillarWeights, type ScaleMode, type ScoringMode, type Vehicle } from '../engine';
import { CATALOG, DEFAULT_CRITERIA, DEFAULT_GLOBALS, DEFAULT_SELECTED, DEFAULT_VEHICLES, RATING_NOTES, VEHICLE_META, type ParamMeta, type VehicleGroup } from '../data';

/** Visual theme id; persisted in localStorage under `tbl-theme`. */
export type Theme = 'ledger' | 'night' | 'field';
/** Which financing options are shown. */
export type View = 'both' | 'loan' | 'lease';
/** Tab of the "Behind the scores" panel. */
export type Tab = 'planet' | 'people' | 'profit';

/** The single mutable UI state. Every render reads it; every event handler mutates it. */
export interface State {
  theme: Theme;
  mode: ScoringMode;
  aggregation: Aggregation;
  scale: ScaleMode;
  preset: string;
  weights: PillarWeights;
  carPreset: string;
  view: View;
  tab: Tab;
  showAll: boolean;
  resultsView: 'cards' | 'table';
  sortKey: string;
  sortDir: 1 | -1;
  copyNote: string;
  secOpen: Record<string, boolean>;
  g: Globals;
  vehicles: Vehicle[];
  defaults: Vehicle[];
  meta: Record<string, Record<string, ParamMeta>>;
  ratingNotes: Record<string, Record<string, string>>;
  groups: Record<string, VehicleGroup>;
  selected: string[];
  customCount: number;
  criteria: Criterion[];
  notice: string;
  /** True once the visitor has picked what they are deciding (Step 1, the old path chips or the analyst). */
  pathChosen: boolean;
}

/** Most cars that can be selected for comparison at once. */
export const MAX_SELECTED = 8;

/** Theme chips, in display order. */
export const THEMES: { id: Theme; label: string }[] = [
  { id: 'ledger', label: 'Ledger' },
  { id: 'night', label: 'Night desk' },
  { id: 'field', label: 'Field guide' }
];

/** Scoring modes with the one-line explanation shown in the verdict. */
export const MODES: { id: ScoringMode; label: string; blurb: string }[] = [
  { id: 'hybrid', label: 'Hybrid', blurb: 'Planet (80%) and Profit come from numbers; People and materials come from 1-5 ratings.' },
  { id: 'metrics', label: 'Numbers only', blurb: 'Planet = CO2e, Profit = net cost, People = only the externally rated criteria (crash safety, tailpipe air).' },
  { id: 'ratings', label: '1-5 scorecard', blurb: 'Every pillar is turned into a 1-5 rating (numbers are banded) and averaged.' }
];

/** Display labels for the pillar-weight presets in `WEIGHT_PRESETS`. */
export const PRESET_LABELS: Record<string, string> = { balanced: 'Balanced', planet: 'Planet-first', people: 'People-first', wallet: 'Wallet-first' };

/** Deep copy of plain data (defaults are cloned so edits never touch the originals). */
export const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/** A new application state, initialised from the sourced defaults. Every call returns independent copies. */
export function freshState(): State {
  return {
    theme: 'ledger',
    mode: 'hybrid',
    aggregation: 'average',
    scale: 'benchmark',
    preset: 'balanced',
    weights: { ...WEIGHT_PRESETS.balanced },
    carPreset: 'lexus',
    view: 'both',
    tab: 'profit',
    showAll: false,
    resultsView: 'cards',
    sortKey: 'rank',
    sortDir: 1,
    copyNote: '',
    secOpen: { confirm: true, drivers: true, cars: true, emissions: false, other: false },
    g: clone(DEFAULT_GLOBALS),
    vehicles: clone(DEFAULT_VEHICLES),
    defaults: clone(DEFAULT_VEHICLES),
    meta: clone(VEHICLE_META),
    ratingNotes: clone(RATING_NOTES),
    groups: Object.fromEntries(CATALOG.map((d) => [d.vehicle.id, d.group])),
    selected: [...DEFAULT_SELECTED],
    customCount: 0,
    criteria: clone(DEFAULT_CRITERIA),
    notice: '',
    pathChosen: false
  };
}

/** The application state the page uses. */
export const state: State = freshState();
