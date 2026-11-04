import type { Vehicle } from '../engine';
import { DEFAULT_GLOBALS, type ParamMeta } from '../data';
import { state } from './state';

/** An editable input: a global (`scope` "g") or a vehicle field (`scope` = vehicle id), optionally under loan or lease. */
export interface Field {
  sec?: string;
  scope: string;
  sub: '' | 'loan' | 'lease';
  key: string;
  meta: ParamMeta;
}

/** Fields currently rendered, by id. Rebuilt on every assumptions render; read by events and the analyst. */
export const fieldRegistry = new Map<string, Field>();
/** Stable id for a field: `scope.sub.key`. */
export const fieldId = (f: Field): string => `${f.scope}.${f.sub}.${f.key}`;

/** The object that holds a vehicle field (the vehicle, its loan or its lease), or undefined for globals. */
export function holderOf(f: Field, vehicles: Vehicle[]): Record<string, unknown> | undefined {
  if (f.scope === 'g') return undefined;
  const v = vehicles.find((x) => x.id === f.scope);
  if (!v) return undefined;
  return (f.sub === '' ? v : f.sub === 'loan' ? v.loan : v.lease) as unknown as Record<string, unknown> | undefined;
}

/** Current value in stored units (booleans as 0 or 1). */
export function readField(f: Field): number {
  const raw = f.scope === 'g' ? (state.g as unknown as Record<string, unknown>)[f.key] : holderOf(f, state.vehicles)?.[f.key];
  return typeof raw === 'boolean' ? (raw ? 1 : 0) : Number(raw ?? 0);
}

/** Default value in stored units, from the sourced defaults. */
export function defaultOf(f: Field): number {
  const raw = f.scope === 'g' ? (DEFAULT_GLOBALS as unknown as Record<string, unknown>)[f.key] : holderOf(f, state.defaults)?.[f.key];
  return typeof raw === 'boolean' ? (raw ? 1 : 0) : Number(raw ?? 0);
}

/** Write a value in stored units, clamped to the field range (booleans from >= 0.5). */
export function writeField(f: Field, value: number): void {
  if (f.meta.bool) {
    const b = value >= 0.5;
    if (f.scope === 'g') (state.g as unknown as Record<string, unknown>)[f.key] = b;
    else (holderOf(f, state.vehicles) as Record<string, unknown>)[f.key] = b;
    return;
  }
  const clamped = Math.min(f.meta.max, Math.max(f.meta.min, value));
  if (f.scope === 'g') (state.g as unknown as Record<string, unknown>)[f.key] = clamped;
  else {
    const h = holderOf(f, state.vehicles);
    if (h) h[f.key] = clamped;
  }
}

/** True when the current value differs from the default. */
export function isEdited(f: Field): boolean {
  return Math.abs(readField(f) - defaultOf(f)) > 1e-9;
}
