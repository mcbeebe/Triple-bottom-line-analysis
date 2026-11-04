import { scoreOptions } from '../engine';
import { esc } from '../app/format';
import { keepOf, optionName, scoring, visibleOptions } from '../app/options';
import { state } from '../app/state';
import { dsButton } from './components/button';
import { dsChip } from './components/chip';
import { dsOption } from './components/optionButton';
import { dsStepFooter, dsStepHeader } from './components/stepHeader';
import { dsOptionCard } from './components/optionCard';
import { dsDisclosure } from './components/disclosure';
import { dsField } from './components/field';
import { dsSheet } from './components/sheet';

/** Themes the new design system supports (decision A: Field guide is not carried forward). */
export type GuideTheme = 'ledger' | 'night';

let theme: GuideTheme = 'ledger';
let bound = false;

const SWATCHES = ['bg', 'surface', 'soft', 'tint', 'ink', 'muted', 'line', 'control', 'accent', 'on-accent'];

const section = (id: string, title: string, inner: string, note = ''): string =>
  `<section class="ds-guide-sec" aria-labelledby="sg-${id}"><h2 id="sg-${id}" class="ds-guide-h">${esc(title)}</h2>${note ? `<p class="ds-guide-note">${esc(note)}</p>` : ''}${inner}</section>`;

/** Up to three ranked options plus keep, scored live by the engine with the current inputs. */
function sampleCards(): string {
  const scored = scoreOptions(state.g, state.vehicles, visibleOptions(), scoring());
  const keep = keepOf(scored);
  const ranked = [...scored].sort((a, b) => a.rank - b.rank);
  const cheapest = [...scored].sort((a, b) => a.result.netCostNPV - b.result.netCostNPV)[0];
  const cleanest = [...scored].sort((a, b) => a.result.co2.total - b.result.co2.total)[0];
  const picks = ranked.filter((s) => s !== keep).slice(0, 3);
  if (keep) picks.push(keep);
  return picks
    .map((s, i) => {
      const tag = s.rank === 1 ? 'Highest overall score' : s === cheapest ? 'Lowest cost' : s === cleanest ? 'Lowest carbon' : s === keep ? 'Your car today' : '';
      return dsOptionCard({ id: `sg-card-${i}`, name: optionName(s.spec), tag, score: s.overall, cost: s.result.netCostNPV, carbonT: s.result.co2.total, people: s.pillars.people, years: state.g.horizonYears, highlight: s.rank === 1 });
    })
    .join('');
}

/** Render the style guide into #style-guide and its example sheet into #ds-sheets, in the guide's theme. */
export function renderStyleGuide(): void {
  const host = document.getElementById('style-guide');
  const sheets = document.getElementById('ds-sheets');
  if (!host || !sheets) return;
  document.body.setAttribute('data-theme', theme);
  const swatches = `<ul class="ds-swatches">${SWATCHES.map((s) => `<li class="ds-swatch"><i style="background:var(--color-${s})"></i><code>--color-${s}</code></li>`).join('')}</ul>`;
  host.innerHTML = `<div class="ds-guide-inner">
<header><h1 class="ds-guide-title">Style guide</h1><p class="ds-guide-lead">Building blocks for the guided-steps redesign. This page is not linked from the scorecard.</p><a class="ds-btn ds-btn-link" href="#">Back to the scorecard</a></header>
${section('theme', 'Theme', `<div class="ds-chips" role="group" aria-label="Theme">${dsChip({ label: 'Ledger', sub: 'light', act: 'sg-theme', val: 'ledger', on: theme === 'ledger' })}${dsChip({ label: 'Night', sub: 'dark', act: 'sg-theme', val: 'night', on: theme === 'night' })}</div>`)}
${section('colors', 'Colors', swatches, 'Text pairs meet 4.5:1 and control borders 3:1 in both themes (checked by tokens.test.ts and axe).')}
${section('buttons', 'Buttons', `<div class="ds-guide-row">${dsButton({ label: 'Continue to cars', act: 'sg-noop' })}${dsButton({ label: 'Edit', act: 'sg-noop', variant: 'secondary' })}${dsButton({ label: 'Skip to answer', act: 'sg-noop', variant: 'link' })}</div>
<div class="ds-guide-col">${dsButton({ label: 'Show my answer', act: 'sg-noop', disabled: true, full: true, describedBy: 'sg-why-off' })}<p class="ds-guide-note" id="sg-why-off">Pick at least one car to see your answer.</p></div>`)}
${section('chips', 'Chips', `<div class="ds-chips" role="group" aria-label="Car you have now">${dsChip({ label: 'Older gas sedan', sub: 'Placeholder values', act: 'sg-chip', val: 'sedan', on: true })}${dsChip({ label: 'Older gas SUV', sub: 'Placeholder values', act: 'sg-chip', val: 'suv' })}${dsChip({ label: 'Something else', act: 'sg-chip', val: 'custom' })}</div>`)}
${section('options', 'Option buttons', `<div class="ds-guide-col ds-options" role="group" aria-label="What are you deciding?">${dsOption({ title: 'Sell my car, then buy', sub: 'Sell it yourself and put the money toward the next car', act: 'sg-option', val: 'sell', on: true })}${dsOption({ title: 'Trade my car in', sub: 'A dealer takes it off the price', act: 'sg-option', val: 'trade' })}${dsOption({ title: 'Just buy', sub: 'No car to sell, or I am keeping mine', act: 'sg-option', val: 'none' })}${dsOption({ title: 'Not sure: describe it in a sentence', sub: 'Opens the analyst', act: 'sg-option', val: 'analyst' })}</div>`)}
${section('steps', 'Step header and navigation', `<div class="ds-guide-col">${dsStepHeader({ step: 1, total: 3, title: 'What are you deciding?', sub: 'Pick the closest one. You can change it later.', id: 'sg-step1', level: 3 })}${dsStepFooter({ step: 1, backAct: 'sg-noop', skipAct: 'sg-noop' })}</div>
<div class="ds-guide-col">${dsStepHeader({ step: 2, total: 3, title: 'Your car and your driving', sub: 'Start from a preset. Values marked as placeholders are not sourced.', id: 'sg-step2', level: 3 })}${dsStepFooter({ step: 2, backAct: 'sg-noop', skipAct: 'sg-noop' })}</div>`)}
${section('fields', 'Fields', `<div class="ds-guide-col">${dsField({ id: 'sg-sale', label: 'What it would sell for', value: 7000, min: 0, max: 200000, step: 100, money: true })}${dsField({ id: 'sg-miles', label: 'Miles per year', value: 7500, min: 1000, max: 30000, step: 500, unit: 'miles', note: 'Placeholder until you change it.' })}</div>`)}
${section('cards', 'Option cards', `<div class="ds-cards">${sampleCards()}</div>`, 'Scored live by the engine with the current inputs.')}
${section('disclosure', 'Disclosure', `<div class="ds-guide-col">${dsDisclosure({ id: 'sg-disc-1', title: 'All assumptions', meta: '2 edited', bodyHtml: '<p class="ds-guide-note">Every input, grouped as today.</p>' })}${dsDisclosure({ id: 'sg-disc-2', title: 'Why this result', bodyHtml: '<p class="ds-guide-note">Planet, People and Profit tables, and the sources.</p>', open: true })}</div>`)}
${section('sheet', 'Bottom sheet', dsButton({ label: 'Open an example sheet', act: 'open-sheet', val: 'sg-sheet', variant: 'secondary', id: 'sg-open-sheet' }), 'Escape, Close or a tap outside closes it; focus returns to the button.')}
</div>`;
  sheets.innerHTML = dsSheet({
    id: 'sg-sheet',
    title: 'Fine-tune',
    bodyHtml: `<p class="ds-guide-note">Changes update the answer behind this sheet.</p>${dsField({ id: 'sg-gas', label: 'Gas price', value: 4.85, min: 1, max: 15, step: 0.05, money: true, unit: 'a gallon' })}<div class="ds-chips" role="group" aria-label="Financing shown">${dsChip({ label: 'Loan and lease', act: 'sg-chip', val: 'both', on: true })}${dsChip({ label: 'Loan only', act: 'sg-chip', val: 'loan' })}</div>`
  });
}

/** Set the guide theme and re-render. Exposed for the browser suite. */
export function setGuideTheme(t: GuideTheme): void {
  theme = t;
  renderStyleGuide();
}

/** Handle clicks on `sg-*` actions: theme switch, and pressed state for example chips and option buttons. */
export function bindStyleGuide(): void {
  if (bound) return;
  bound = true;
  document.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act^="sg-"]');
    if (!el) return;
    const act = el.dataset.act;
    if (act === 'sg-theme') {
      setGuideTheme(el.dataset.val === 'night' ? 'night' : 'ledger');
      document.querySelector<HTMLElement>(`[data-act="sg-theme"][data-val="${theme}"]`)?.focus();
    } else if (act === 'sg-chip' || act === 'sg-option') {
      const cls = act === 'sg-chip' ? 'ds-chip-on' : 'ds-option-on';
      el.parentElement?.querySelectorAll<HTMLElement>(`[data-act="${act}"]`).forEach((b) => {
        const on = b === el;
        b.classList.toggle(cls, on);
        b.setAttribute('aria-pressed', String(on));
      });
    }
  });
}
