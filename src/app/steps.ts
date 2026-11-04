import type { Disposal } from '../engine';
import type { State } from './state';

/** Every screen the hash can name. Plain #names, which the artifact host passes through. */
/** 'details' is the old full page, reachable from the answer until Phase 3b rebuilds its panels. */
export type Route = 'step-1' | 'step-2' | 'step-3' | 'answer' | 'details' | 'style-guide';

const ROUTES: Route[] = ['step-1', 'step-2', 'step-3', 'answer', 'details', 'style-guide'];
const FLOW: Route[] = ['step-1', 'step-2', 'step-3', 'answer'];
const APP = 'TBL Decision Scorecard';

/** Route for a location hash; an empty or unknown hash means Step 1. */
export function parseRoute(hash: string): Route {
  const name = hash.replace(/^#/, '');
  return (ROUTES as string[]).includes(name) ? (name as Route) : 'step-1';
}

/** Hash for a route. */
export const hashFor = (r: Route): string => `#${r}`;

/** The screen after this one in the flow (the answer stays the answer). */
export function nextRoute(r: Route): Route {
  const i = FLOW.indexOf(r);
  return i < 0 || i === FLOW.length - 1 ? r : FLOW[i + 1];
}

/** The screen before this one in the flow, or null on Step 1 and the style guide. */
export function prevRoute(r: Route): Route | null {
  const i = FLOW.indexOf(r);
  return i <= 0 ? null : FLOW[i - 1];
}

/** Deep links and reloads to Step 2 or 3 before a path is chosen go to Step 1, replacing the history entry. */
export function guardRoute(r: Route, s: Pick<State, 'pathChosen'>): { route: Route; replace: boolean } {
  if ((r === 'step-2' || r === 'step-3') && !s.pathChosen) return { route: 'step-1', replace: true };
  return { route: r, replace: false };
}

/** What the app records on each history entry it creates. */
export interface HistoryTag {
  tbl: true;
  prev: Route | null;
}

/**
 * In-app Back: use history.back() only when the previous history entry is the step we want, so in-app
 * Back and the browser's Back never disagree; otherwise replace this entry with the previous step.
 */
export function backAction(current: Route, historyState: unknown): { kind: 'history-back' } | { kind: 'replace'; route: Route } | { kind: 'none' } {
  const prev = prevRoute(current);
  if (!prev) return { kind: 'none' };
  const tag = historyState as Partial<HistoryTag> | null;
  if (tag && tag.tbl === true && tag.prev === prev) return { kind: 'history-back' };
  return { kind: 'replace', route: prev };
}

/** "Show my answer" and "Skip to answer" need at least one car to compare (P7). */
export const canShowAnswer = (s: Pick<State, 'selected'>): boolean => s.selected.length > 0;

/** Heading and sub-line for a step (spec copy; the just-buy Step 2 copy is the approved proposal P9). */
export function stepCopy(r: Route, path: Disposal): { heading: string; sub: string } {
  if (r === 'step-1') return { heading: 'What are you deciding?', sub: 'Pick the closest one. You can change it later.' };
  if (r === 'step-2')
    return path === 'none'
      ? { heading: 'Your driving', sub: 'Miles change fuel and charging costs.' }
      : { heading: 'Your car and your driving', sub: 'Start from a preset. Values marked as placeholders are not sourced.' };
  if (r === 'step-3') return { heading: 'Which cars should we compare?', sub: '' };
  return { heading: r === 'answer' ? 'Your answer' : r === 'details' ? 'All the details' : 'Style guide', sub: '' };
}

/** Page title for a screen. Never includes car names or anything typed (privacy rule). */
export function titleFor(r: Route, path: Disposal): string {
  const n = FLOW.indexOf(r);
  if (r === 'answer' || r === 'details' || r === 'style-guide') return `${stepCopy(r, path).heading} · ${APP}`;
  return `Step ${n + 1} of 3: ${stepCopy(r, path).heading} · ${APP}`;
}
