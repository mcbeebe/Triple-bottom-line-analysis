import type { State } from '../../app/state';
import { stepCopy } from '../../app/steps';
import { dsOption } from '../components/optionButton';
import { dsStepFooter, dsStepHeader } from '../components/stepHeader';

/** Step 1 options (spec copy). The analyst option stays hidden until Phase 4 (decision P8). */
export const DECISIONS = [
  { id: 'sell', title: 'Sell my car, then buy', sub: 'Sell it yourself and put the money toward the next car' },
  { id: 'trade', title: 'Trade my car in', sub: 'A dealer takes it off the price' },
  { id: 'none', title: 'Just buy', sub: 'No car to sell, or I am keeping mine' }
] as const;

/** Step 1 screen: "What are you deciding?" Nothing is pressed until a path has been chosen. */
export function decisionHtml(s: State): string {
  const c = stepCopy('step-1', s.g.disposal);
  const options = DECISIONS.map((d) => dsOption({ title: d.title, sub: d.sub, act: 'st-path', val: d.id, on: s.pathChosen && s.g.disposal === d.id })).join('');
  return `<div class="ds-screen">${dsStepHeader({ step: 1, total: 3, title: c.heading, sub: c.sub, id: 'st-title' })}
<div class="ds-options" role="group" aria-labelledby="st-title">${options}</div>
${dsStepFooter({ step: 1, backAct: 'st-back', skipAct: 'st-skip' })}</div>`;
}
