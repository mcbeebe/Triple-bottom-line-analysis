import type { Vehicle } from '../engine';
import { DEFAULT_GLOBALS, GLOBAL_META, type ParamMeta } from '../data';
import { state, type State } from './state';

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

/** Current value in stored units (booleans as 0 or 1), read from state `s`. */
export function readFieldIn(s: State, f: Field): number {
  const raw = f.scope === 'g' ? (s.g as unknown as Record<string, unknown>)[f.key] : holderOf(f, s.vehicles)?.[f.key];
  return typeof raw === 'boolean' ? (raw ? 1 : 0) : Number(raw ?? 0);
}

/** Default value in stored units: globals from DEFAULT_GLOBALS, vehicle fields from `s.defaults`. */
export function defaultOfIn(s: State, f: Field): number {
  const raw = f.scope === 'g' ? (DEFAULT_GLOBALS as unknown as Record<string, unknown>)[f.key] : holderOf(f, s.defaults)?.[f.key];
  return typeof raw === 'boolean' ? (raw ? 1 : 0) : Number(raw ?? 0);
}

/** Write a value in stored units into state `s`, clamped to the field range (booleans from >= 0.5). */
export function writeFieldIn(s: State, f: Field, value: number): void {
  if (f.meta.bool) {
    const b = value >= 0.5;
    if (f.scope === 'g') (s.g as unknown as Record<string, unknown>)[f.key] = b;
    else (holderOf(f, s.vehicles) as Record<string, unknown>)[f.key] = b;
    return;
  }
  const clamped = Math.min(f.meta.max, Math.max(f.meta.min, value));
  if (f.scope === 'g') (s.g as unknown as Record<string, unknown>)[f.key] = clamped;
  else {
    const h = holderOf(f, s.vehicles);
    if (h) h[f.key] = clamped;
  }
}

/** Current value in stored units (booleans as 0 or 1). */
export const readField = (f: Field): number => readFieldIn(state, f);

/** Default value in stored units, from the sourced defaults. */
export const defaultOf = (f: Field): number => defaultOfIn(state, f);

/** Write a value in stored units, clamped to the field range (booleans from >= 0.5). */
export const writeField = (f: Field, value: number): void => writeFieldIn(state, f, value);

/** True when the current value differs from the default. */
export function isEdited(f: Field): boolean {
  return Math.abs(readField(f) - defaultOf(f)) > 1e-9;
}

/** Vehicle meta keys that live under the loan or lease (and the lease term's real key). Others are on the vehicle itself. */
export const SUB_OF: Record<string, { sub: '' | 'loan' | 'lease'; key: string }> = {
  apr: { sub: 'loan', key: 'apr' },
  termMonths: { sub: 'loan', key: 'termMonths' },
  down: { sub: 'loan', key: 'down' },
  monthly: { sub: 'lease', key: 'monthly' },
  dueAtSigning: { sub: 'lease', key: 'dueAtSigning' },
  leaseTerm: { sub: 'lease', key: 'termMonths' }
};

/**
 * Every editable number in state `s`, whether or not it is on screen: each global in GLOBAL_META and each
 * vehicle meta key (lease fields only when the car has a lease).
 */
export function allFields(s: State): Field[] {
  const out: Field[] = Object.entries(GLOBAL_META).map(([key, meta]) => ({ scope: 'g', sub: '' as const, key, meta }));
  for (const v of s.vehicles) {
    for (const [mk, meta] of Object.entries(s.meta[v.id] ?? {})) {
      const map = SUB_OF[mk] ?? { sub: '' as const, key: mk };
      if (map.sub === 'lease' && !v.lease) continue;
      if (map.sub === 'loan' && !v.loan) continue;
      out.push({ scope: v.id, sub: map.sub, key: map.key, meta });
    }
  }
  return out;
}
