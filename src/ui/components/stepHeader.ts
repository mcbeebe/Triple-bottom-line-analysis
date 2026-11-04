import { esc } from '../../app/format';
import { dsButton } from './button';

/** Options for {@link dsStepHeader}. */
export interface DsStepHeaderOpts {
  step: number;
  total: number;
  title: string;
  sub?: string;
  /** Id of the heading, so the router can move focus to it on a step change. */
  id: string;
  level?: 1 | 2 | 3;
}

/**
 * "Step N of M" in text, a progress bar hidden from screen readers (the text already says it),
 * and the screen heading, focusable by script only.
 */
export function dsStepHeader(o: DsStepHeaderOpts): string {
  if (!Number.isInteger(o.step) || o.step < 1 || o.step > o.total) throw new RangeError(`step ${o.step} is outside 1..${o.total}`);
  const h = `h${o.level ?? 1}`;
  const segs = Array.from({ length: o.total }, (_, i) => `<i class="ds-seg${i < o.step ? ' ds-seg-on' : ''}"></i>`).join('');
  return `<header class="ds-step"><p class="ds-step-count">Step ${o.step} of ${o.total}</p><div class="ds-progress" aria-hidden="true">${segs}</div><${h} id="${esc(o.id)}" class="ds-step-title" tabindex="-1">${esc(o.title)}</${h}>${o.sub ? `<p class="ds-step-sub">${esc(o.sub)}</p>` : ''}</header>`;
}

/** Options for {@link dsStepFooter}. */
export interface DsStepFooterOpts {
  step: number;
  backAct: string;
  skipAct: string;
}

/** Back (disabled on step 1) and "Skip to answer", in a labeled nav. */
export function dsStepFooter(o: DsStepFooterOpts): string {
  return `<nav class="ds-step-nav" aria-label="Step navigation">${dsButton({ label: 'Back', act: o.backAct, variant: 'link', disabled: o.step <= 1 })}${dsButton({ label: 'Skip to answer', act: o.skipAct, variant: 'link' })}</nav>`;
}
