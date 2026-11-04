import type { AnalystAnswer } from '../analyst';

/** Shape of the artifact host's sample API (`window.claude.use('sample')`). */
export interface SampleApi {
  json: (input: string, opts?: { signal?: AbortSignal; cache?: boolean }) => Promise<unknown>;
}

/** Mutable analyst session: the granted API (null when unavailable), the typed text, the last answer and what was applied. */
export const analyst = {
  sample: null as SampleApi | null,
  text: '',
  busy: false,
  ctrl: null as AbortController | null,
  answer: null as AnalystAnswer | null,
  status: '',
  statusErr: false,
  applied: new Set<string>(),
  history: [] as { user: string; summary: string }[]
};
