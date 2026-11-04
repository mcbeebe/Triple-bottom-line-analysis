import type { AnalystAnswer } from '../analyst';
import type { AnalystClient } from './analystClient';

/** Mutable analyst session: the granted client (null when unavailable), the typed text, the last answer and what was applied. */
export const analyst = {
  client: null as AnalystClient | null,
  text: '',
  busy: false,
  ctrl: null as AbortController | null,
  answer: null as AnalystAnswer | null,
  status: '',
  statusErr: false,
  applied: new Set<string>(),
  history: [] as { user: string; summary: string }[]
};
