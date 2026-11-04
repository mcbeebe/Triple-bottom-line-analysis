import { esc } from '../../app/format';
import { state } from '../../app/state';
import { backAction, guardRoute, hashFor, parseRoute, titleFor, type HistoryTag, type Route } from '../../app/steps';
import { applyTheme, refreshAll } from '../events';
import { renderStyleGuide } from '../styleGuide';
import { hideSheet } from '../components/sheet';
import { setAnalystHost } from '../analyst/sheet';
import { carsHtml, newAddCarForm, type AddCarForm } from './cars';
import { decisionHtml } from './decision';
import { drivingHtml } from './driving';
import { answerScreenHtml, setAnswerNotice } from '../answer/screen';
import { applyScenario } from '../../app/scenario';
import { decodeShare, isShareHash } from '../../app/share';

let current: Route = 'step-1';
let rendered = '';

/** The add-car form on Step 3 (screen-local state, never stored). */
export const addCarForm: { value: AddCarForm } = { value: newAddCarForm() };

/** The screen on show. */
export const currentRoute = (): Route => current;

const el = (id: string): HTMLElement | null => document.getElementById(id);
const oldMain = (): HTMLElement | null => document.querySelector('main:not(#steps):not(#answer-screen)');

/** Re-render the step on show, then put focus back on the control that matches `focusSelector` (if any). */
export function renderStep(focusSelector?: string): void {
  const host = el('steps');
  if (!host) return;
  host.innerHTML = current === 'step-1' ? decisionHtml(state) : current === 'step-2' ? drivingHtml(state) : carsHtml(state, addCarForm.value);
  if (focusSelector) document.querySelector<HTMLElement>(focusSelector)?.focus();
}

/**
 * Re-render the step or answer on show after a change made elsewhere (the analyst sheet, or the analyst becoming
 * available), putting focus back on the same control when it was inside the screen.
 */
export function rerenderScreen(): void {
  const host = current === 'answer' ? el('answer-screen') : current === 'step-1' || current === 'step-2' || current === 'step-3' ? el('steps') : null;
  if (!host || host.hidden) return;
  const active = document.activeElement as HTMLElement | null;
  const inside = active && host.contains(active) ? active : null;
  const key = inside?.id ? `#${CSS.escape(inside.id)}` : inside?.dataset.act ? `[data-act="${CSS.escape(inside.dataset.act)}"][data-val="${CSS.escape(inside.dataset.val ?? '')}"]` : null;
  if (current === 'answer') host.innerHTML = answerScreenHtml(state);
  else renderStep();
  if (key) host.querySelector<HTMLElement>(key)?.focus();
}

/** Bar under "All the details" (the old page): back to the answer, or change the step answers. */
function detailsBar(): void {
  const bar = el('answer-bar');
  if (!bar) return;
  bar.innerHTML = `<div class="ds-app-bar-inner"><button type="button" class="ds-btn ds-btn-primary" data-act="st-toanswer" id="st-toanswer">${esc('Back to my answer')}</button><button type="button" class="ds-btn ds-btn-secondary" data-act="st-edit" id="st-edit">${esc('Change my answers')}</button></div>`;
}

/** Re-render the answer screen in place (after a Fine-tune edit), keeping focus where it is. */
export function renderAnswer(): void {
  const host = el('answer-screen');
  if (host && !host.hidden) host.innerHTML = answerScreenHtml(state);
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
  const ans = el('answer-screen');
  if (steps) steps.hidden = !isStep;
  if (ans) ans.hidden = route !== 'answer';
  if (main) main.hidden = route !== 'details';
  if (guide) guide.hidden = route !== 'style-guide';
  if (bar) bar.hidden = route !== 'details';
  document.body.classList.toggle('has-answer-bar', route === 'details');
  if (route !== 'style-guide') hideSheet();
  if (leavingGuide) applyTheme();
  document.title = titleFor(route, state.g.disposal);
  if (route !== 'answer') setAnswerNotice('');
  if (isStep) {
    if (route !== 'step-3') addCarForm.value = newAddCarForm();
    renderStep();
    if (focus) {
      window.scrollTo(0, 0);
      el('st-title')?.focus();
    }
  } else if (route === 'answer') {
    if (ans) ans.innerHTML = answerScreenHtml(state);
    if (focus) {
      window.scrollTo(0, 0);
      el('ans-title')?.focus();
    }
  } else if (route === 'details') {
    setAnalystHost('analyst');
    refreshAll();
    detailsBar();
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

/**
 * Open a shared answer: apply the scenario from the #s1- name and show the answer. The path counts as chosen
 * (the link says what is being decided). A link that cannot be read shows the defaults with a notice.
 */
function openShare(hash: string, focus: boolean): void {
  const d = decodeShare(hash);
  if (d.ok && d.scenario) {
    applyScenario(state, d.scenario);
    state.pathChosen = true;
    setAnswerNotice(d.problems.length ? 'That link could not be read in full; some values were left out.' : '');
  } else setAnswerNotice('That link could not be read, so this shows the standard example.');
  history.replaceState({ tbl: true, prev: null } satisfies HistoryTag, '', hash);
  show('answer', focus);
  rendered = hash;
}

/** Put a share name in the address without navigating, so the page's own address reopens this answer. */
export function setShareHash(hash: string): void {
  history.replaceState(history.state, '', `#${hash}`);
  rendered = `#${hash}`;
}

/** After an edit, a share name in the address is out of date: go back to plain #answer (without navigating). */
export function clearShareHash(): void {
  if (!isShareHash(location.hash)) return;
  history.replaceState(history.state, '', hashFor('answer'));
  rendered = hashFor('answer');
}

function onLocationChange(): void {
  if (location.hash === rendered || (location.hash === '' && rendered === '#step-1')) return;
  if (isShareHash(location.hash)) return openShare(location.hash, true);
  const g = guardRoute(parseRoute(location.hash), state);
  if (g.replace) history.replaceState({ tbl: true, prev: null } satisfies HistoryTag, '', hashFor(g.route));
  show(g.route, true);
}

/** Show the screen named by the address on first load (without moving focus) and follow Back, Forward and typed hashes. */
export function startRouter(): void {
  window.addEventListener('popstate', onLocationChange);
  window.addEventListener('hashchange', onLocationChange);
  if (isShareHash(location.hash)) return openShare(location.hash, false);
  const g = guardRoute(parseRoute(location.hash), state);
  const keepUrl = location.hash === '' && g.route === 'step-1';
  history.replaceState({ tbl: true, prev: null } satisfies HistoryTag, '', keepUrl ? location.href : hashFor(g.route));
  show(g.route, false);
  rendered = keepUrl ? '#step-1' : hashFor(g.route);
}
