import type { Disposal } from '../engine';
import { CATALOG, currentCarFromPreset, makeCustomVehicle } from '../data';
import { MAX_SELECTED, clone, type State } from './state';

/** The message shown when a car cannot be added because the limit is reached. */
export const limitMessage = (): string => `Pick up to ${MAX_SELECTED} cars. Remove one first.`;

/** True while another car can be selected. */
export function canAddCar(s: State): boolean {
  return s.selected.length < MAX_SELECTED;
}

const known = (s: State, id: string): boolean => s.vehicles.some((v) => v.id === id && !v.owned);

/** Choose what happens to the current car (sell, trade or none) and record that a path was chosen. */
export function setPath(s: State, path: Disposal): void {
  s.g.disposal = path;
  s.pathChosen = true;
  s.notice = '';
}

/** Replace the owned car, its defaults, notes and meta with a preset, so none of its fields read as edited. */
export function applyCarPreset(s: State, presetId: string): void {
  const c = currentCarFromPreset(presetId);
  s.vehicles = s.vehicles.map((v) => (v.owned ? clone(c.vehicle) : v));
  s.defaults = s.defaults.map((v) => (v.owned ? clone(c.vehicle) : v));
  s.meta.lx = c.meta;
  s.ratingNotes.lx = c.ratingNotes;
  s.carPreset = presetId;
}

/** Select or deselect a car. Refuses unknown ids and, at the limit, sets the limit notice. */
export function togglePick(s: State, id: string): 'added' | 'removed' | 'limit' | 'unknown' {
  if (!known(s, id)) return 'unknown';
  const i = s.selected.indexOf(id);
  s.notice = '';
  if (i >= 0) {
    s.selected.splice(i, 1);
    return 'removed';
  }
  if (!canAddCar(s)) {
    s.notice = limitMessage();
    return 'limit';
  }
  s.selected.push(id);
  return 'added';
}

/** Add a catalog car to the comparison if it is not already there and the limit allows. */
export function addCatalogCar(s: State, id: string): 'added' | 'already' | 'limit' | 'unknown' {
  if (!known(s, id)) return 'unknown';
  if (s.selected.includes(id)) return 'already';
  if (!canAddCar(s)) {
    s.notice = limitMessage();
    return 'limit';
  }
  s.selected.push(id);
  s.notice = '';
  return 'added';
}

/** A car the visitor (or the analyst) describes. Missing values fall back to the catalog averages for its kind. */
export interface CustomCarSpec {
  kind: 'ev' | 'hybrid' | 'ice';
  name?: string;
  price?: number;
  /** mpg for gas and hybrid cars, kWh per 100 miles for EVs. */
  efficiency?: number;
}

/** Build, register and select a custom car. Returns its id, or null (with the limit notice) when the limit is reached. */
export function addCustomCar(s: State, spec: CustomCarSpec): string | null {
  if (!canAddCar(s)) {
    s.notice = limitMessage();
    return null;
  }
  s.customCount += 1;
  const d = makeCustomVehicle(spec.kind, s.customCount);
  const v = d.vehicle;
  if (spec.name) {
    v.name = spec.name;
    v.short = spec.name;
  }
  if (spec.price !== undefined) {
    v.price = spec.price;
    if (v.loan) v.loan.down = Math.round((spec.price * 0.1) / 500) * 500;
  }
  if (spec.efficiency !== undefined) {
    if (spec.kind === 'ev') v.kwhPer100mi = spec.efficiency;
    else v.mpg = spec.efficiency;
  }
  s.vehicles.push(clone(v));
  s.defaults.push(clone(v));
  s.meta[v.id] = d.meta;
  s.ratingNotes[v.id] = {};
  s.groups[v.id] = 'custom';
  s.selected.push(v.id);
  s.notice = '';
  return v.id;
}

/** Remove a custom car everywhere. Catalog and owned cars are never removed. */
export function removeCustomCar(s: State, id: string): void {
  if (s.groups[id] !== 'custom' || CATALOG.some((c) => c.vehicle.id === id)) return;
  s.vehicles = s.vehicles.filter((v) => v.id !== id);
  s.defaults = s.defaults.filter((v) => v.id !== id);
  s.selected = s.selected.filter((x) => x !== id);
  delete s.meta[id];
}
