import { breakEvenGasPrice, scoreOptions, type ScoredOption } from '../../engine';
import { sensitivityRows } from '../../analyst';
import { esc, num } from '../../app/format';
import { hasCar, lx, optionName, scoring, visibleOptions } from '../../app/options';
import type { State } from '../../app/state';
import { answerCards, breakEvenLine, cardTags, flipLine, pickFlip, verdictSentence, type VerdictOption } from '../../app/verdict';
import { dsButton } from '../components/button';
import { dsOptionCard } from '../components/optionCard';

/** Footer dates (decision Q7) and audience (Q4). */
export const DATA_NOTE = 'Estimates for comparison, not financial or tax advice. California rules and prices. Prices and rates as of Nov 1, 2026; default cars checked Nov 4, 2026.';

let notice = '';

/** A one-line notice shown under the basis line (e.g. a share link that could not be read in full); '' hides it. */
export function setAnswerNotice(text: string): void {
  notice = text;
}

const PATH_WORDS: Record<string, string> = { sell: 'Sell, then buy', trade: 'Trade in, then buy', none: 'Just buy' };

/** The scored options as the verdict sees them, best first, plus the scored list itself. */
export function rankedOptions(s: State): { scored: ScoredOption[]; ranked: VerdictOption[] } {
  const scored = scoreOptions(s.g, s.vehicles, visibleOptions(), scoring()).sort((a, b) => a.rank - b.rank);
  const ranked = scored.map((x) => ({ id: x.spec.id, name: optionName(x.spec), overall: x.overall, cost: x.result.netCostNPV, carbon: x.result.co2.total, isKeep: x.spec.financing === 'none' }));
  return { scored, ranked };
}

/** "Sell, then buy · 7,500 miles a year · 8 years, in today's dollars" (spec basis line). */
export function basisLine(s: State): string {
  return `${PATH_WORDS[s.g.disposal]} · ${s.g.milesPerYear.toLocaleString('en-US')} miles a year · ${s.g.horizonYears} years, in today's dollars`;
}

/** "What would change this": the break-even line and, when a likely change flips the winner, one what-if line. */
export function changeLines(s: State, scored: ScoredOption[]): string[] {
  if (!hasCar()) return [];
  const best = scored.find((x) => x.spec.financing !== 'none');
  if (!best) return [];
  const owned = lx();
  const lines = [breakEvenLine(optionName(best.spec), breakEvenGasPrice(s.g, best.vehicle, best.spec.financing, owned), s.g.gasPrice, owned.short)];
  const rows = sensitivityRows(s.g, s.vehicles, visibleOptions(), scoring(), (o) => o.id).rows;
  const flip = pickFlip(rows);
  if (flip) lines.push(flipLine(flip, Object.fromEntries(scored.map((x) => [x.spec.id, optionName(x.spec)])), owned.short));
  return lines;
}

/**
 * The answer screen (Option B, screen B4): verdict sentence, basis line with Edit, three cards plus keep,
 * "What would change this", the panel buttons and the not-advice footer.
 */
export function answerScreenHtml(s: State): string {
  const { scored, ranked } = rankedOptions(s);
  const carName = hasCar() ? lx().short : null;
  const tags = cardTags(ranked);
  const byId = new Map(scored.map((x) => [x.spec.id, x]));
  const cards = answerCards(ranked)
    .map((o) => {
      const x = byId.get(o.id) as ScoredOption;
      return dsOptionCard({ id: `ans-card-${o.id}`, name: o.name, tag: (tags[o.id] ?? []).join(' · ') || undefined, score: o.overall, cost: o.cost, carbonT: o.carbon, people: x.pillars.people, years: s.g.horizonYears, highlight: x.rank === 1 });
    })
    .join('');
  const change = changeLines(s, scored);
  const assumed = (s.pathChosen ? '' : '<p class="ds-answer-note">We assumed you sell your car yourself.</p>') + (notice ? `<p class="ds-answer-note" role="status">${esc(notice)}</p>` : '');
  const changeBox = change.length
    ? `<section class="ds-change" aria-labelledby="ans-change-h"><h2 class="ds-change-h" id="ans-change-h">What would change this</h2>${change.map((l) => `<p>${esc(l)}</p>`).join('')}</section>`
    : '';
  const actions = [
    dsButton({ label: 'Why this result', act: 'ans-why', variant: 'secondary', id: 'ans-why' }),
    dsButton({ label: 'Fine-tune', act: 'ans-finetune', variant: 'secondary', id: 'ans-finetune' }),
    dsButton({ label: 'Table', act: 'ans-table', variant: 'secondary', id: 'ans-table' }),
    dsButton({ label: 'Share', act: 'ans-share', variant: 'secondary', id: 'ans-share' })
  ].join('');
  return `<div class="ds-answer">
<div class="ds-answer-main">
<h1 class="ds-answer-title" id="ans-title" tabindex="-1">${esc(verdictSentence(ranked, carName))}</h1>
<p class="ds-basis">${esc(basisLine(s))} ${dsButton({ label: 'Edit', act: 'ans-edit', variant: 'link', id: 'ans-edit' })}</p>
${assumed}
<div class="ds-cards ds-answer-cards">${cards}</div>
</div>
<div class="ds-answer-side">
${changeBox}
<div class="ds-actions" role="group" aria-label="More about this answer">${actions}</div>
</div>
<footer class="ds-notice"><p>${esc(DATA_NOTE)}</p><p>${dsButton({ label: 'Sources', act: 'ans-sources', variant: 'link', id: 'ans-sources' })}</p><p class="ds-sr" id="ans-live" aria-live="polite"></p></footer>
</div>`;
}

/** Score of the top option, for checks and the live announcement. */
export const topScoreText = (s: State): string => {
  const { ranked } = rankedOptions(s);
  return ranked.length ? num(ranked[0].overall, 1) : '';
};
