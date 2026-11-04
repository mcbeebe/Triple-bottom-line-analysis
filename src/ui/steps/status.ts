import { DEFAULT_GLOBALS, SRC, type ParamMeta } from '../../data';
import type { State } from '../../app/state';
import type { DsStatus } from '../components/statusLabel';

/** Status of a value: edited by the visitor, sourced (first cited source), or a placeholder assumption. */
export function statusOf(meta: ParamMeta | undefined, edited: boolean): DsStatus {
  if (edited) return { kind: 'yours' };
  const key = meta?.kind === 'sourced' ? meta.src?.[0] : undefined;
  const src = key ? SRC[key] : undefined;
  return src ? { kind: 'source', label: src.label, href: src.url } : { kind: 'placeholder' };
}

/** Status of an owned-car field (price, mpg, ...), comparing the car with its preset defaults. */
export function ownedStatus(s: State, key: string): DsStatus {
  const v = s.vehicles.find((x) => x.owned) as unknown as Record<string, number> | undefined;
  const d = s.defaults.find((x) => x.owned) as unknown as Record<string, number> | undefined;
  const edited = !!v && !!d && Math.abs(v[key] - d[key]) > 1e-9;
  return statusOf(s.meta.lx?.[key], edited);
}

/** Status of a global setting such as miles per year. */
export function globalStatus(s: State, key: string, meta: ParamMeta): DsStatus {
  const cur = (s.g as unknown as Record<string, number>)[key];
  const dflt = (DEFAULT_GLOBALS as unknown as Record<string, number>)[key];
  return statusOf(meta, Math.abs(cur - dflt) > 1e-9);
}
