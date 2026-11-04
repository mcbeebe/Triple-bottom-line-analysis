import { esc, num, usd } from '../../app/format';

/** Options for {@link dsOptionCard}. */
export interface DsOptionCardOpts {
  id: string;
  name: string;
  /** Plain-words reason this card stands out, e.g. "Lowest cost". */
  tag?: string;
  score: number;
  cost: number;
  carbonT: number;
  people: number;
  years: number;
  highlight?: boolean;
}

/** Answer-screen card: name, tag, overall score out of 100, cost over N years, carbon in tonnes, People score. */
export function dsOptionCard(o: DsOptionCardOpts): string {
  const nameId = `${o.id}-name`;
  return `<article class="ds-card${o.highlight ? ' ds-card-top' : ''}" aria-labelledby="${esc(nameId)}">
<div class="ds-card-head"><div class="ds-card-names"><h3 id="${esc(nameId)}" class="ds-card-name">${esc(o.name)}</h3>${o.tag ? `<p class="ds-card-tag">${esc(o.tag)}</p>` : ''}</div><p class="ds-card-score"><b>${num(o.score, 0)}</b><span>/100</span></p></div>
<dl class="ds-card-stats"><div><dt>Cost over ${o.years} years</dt><dd>${usd(o.cost)}</dd></div><div><dt>Carbon</dt><dd>${num(o.carbonT, 1)} t</dd></div><div><dt>People</dt><dd>${num(o.people, 0)}</dd></div></dl>
</article>`;
}
