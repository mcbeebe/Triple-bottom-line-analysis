import { esc } from '../../app/format';
import { state } from '../../app/state';
import { backAction, guardRoute, hashFor, parseRoute, titleFor, type HistoryTag, type Route } from '../../app/steps';
import { applyTheme, refreshAll } from '../events';
import { renderStyleGuide } from '../styleGuide';
import { hideSheet } from '../components/sheet';
import { carsHtml, newAddCarForm, type AddCarForm } from './cars';
import { decisionHtml } from './decision';
import { drivingHtml } from './driving';

let current: Route = 'step-1';
let rendered = '';

/** The add-car form on Step 3 (screen-local state, never stored). */
export const addCarForm: { value: AddCarForm } = { value: newAddCarForm() };

/** The screen on show. */
export const currentRoute = (): Route => current;

const el = (id: string): HTMLElement | null => document.getElementById(id);
const oldMain = (): HTMLElement | null => document.querySelector('main:not(#steps)');

/** Re-render the step on show, then put focus back on the control that matches `focusSelector` (if any). */
export function renderStep(focusSelector?: string): void {
  const host = el('steps');
  if (!host) return;
  host.innerHTML = current === 'step-1' ? decisionHtml(state) : current === 'step-2' ? drivingHtml(state) : carsHtml(state, addCarForm.value);
  if (focusSelector) document.querySelector<HTMLElement>(focusSelector)?.focus();
}

function answerBar(): void {
  const bar = el('answer-bar');
  if (!bar) return;
  const assumed = state.pathChosen ? '' : '<p class="ds-app-bar-note">We assumed you sell your car yourself.</p>';
  bar.innerHTML = `<div class="ds-app-bar-inner">${assumed}<button type="button" class="ds-btn ds-btn-secondary" data-act="st-edit" id="st-edit">${esc('Change my answers')}</button></div>`;
}

function show(route: Route, focus: boolean): void {
  const leavingGuide = current === 'style-guide' && route !== 'style-guide';
  current = route;
  rendered = hashFor(route);
  const isStep = route === 'step-1' || route === 'step-2' || route === 'step-3';
  const steps = el('steps');
  const main = oldMain();
  const guide = el('style-guide');
  const bar = el('answer-bar');
  if (steps) steps.hidden = !isStep;
  if (main) main.hidden = route !== 'answer';
  if (guide) guide.hidden = route !== 'style-guide';
  if (bar) bar.hidden = route !== 'answer';
  document.body.classList.toggle('has-answer-bar', route === 'answer');
  if (route !== 'style-guide') hideSheet();
  if (leavingGuide) applyTheme();
  document.title = titleFor(route, state.g.disposal);
  if (isStep) {
    if (route !== 'step-3') addCarForm.value = newAddCarForm();
    renderStep();
    if (focus) {
      window.scrollTo(0, 0);
      el('st-title')?.focus();
    }
  } else if (route === 'answer') {
    refreshAll();
    answerBar();
    if (focus) {
      const h = el('answer-title');
      h?.focus({ preventScroll: true });
      h?.scrollIntoView({ block: 'start' });
    }
  } else renderStyleGuide();
}

/** Go to a screen: push a tagged history entry (or replace this one), render it and move focus to its heading. */
export function navigate(route: Route, opts: { replace?: boolean } = {}): void {
  const g = guardRoute(route, state);
  const tag: HistoryTag = { tbl: true, prev: opts.replace || g.replace ? (history.state as Partial<HistoryTag> | null)?.prev ?? null : current };
  if (opts.replace || g.replace) history.replaceState(tag, '', hashFor(g.route));
  else history.pushState(tag, '', hashFor(g.route));
  show(g.route, true);
}

/** In-app Back: browser history when the previous entry is the step we want, otherwise replace with that step. */
export function goBack(): void {
  const a = backAction(current, history.state);
  if (a.kind === 'history-back') history.back();
  else if (a.kind === 'replace') navigate(a.route, { replace: true });
}

function onLocationChange(): void {
  if (location.hash === rendered || (location.hash === '' && rendered === '#step-1')) return;
  const g = guardRoute(parseRoute(location.hash), state);
  if (g.replace) history.replaceState({ tbl: true, prev: null } satisfies HistoryTag, '', hashFor(g.route));
  show(g.route, true);
}

/** Show the screen named by the address on first load (without moving focus) and follow Back, Forward and typed hashes. */
export function startRouter(): void {
  const g = guardRoute(parseRoute(location.hash), state);
  const keepUrl = location.hash === '' && g.route === 'step-1';
  history.replaceState({ tbl: true, prev: null } satisfies HistoryTag, '', keepUrl ? location.href : hashFor(g.route));
  show(g.route, false);
  rendered = keepUrl ? '#step-1' : hashFor(g.route);
  window.addEventListener('popstate', onLocationChange);
  window.addEventListener('hashchange', onLocationChange);
}
