import type { ScoredOption } from '../../engine';
import { esc, num, usd } from '../../app/format';
import { carNow, incentiveTotal, keepOf, optionName, sensitivityGrid } from '../../app/options';
import { state } from '../../app/state';

/** The "What the numbers say" bullet list (HTML) for the scored options. */
export function buildVerdict(scored: ScoredOption[]): string {
  const sorted = [...scored].sort((a, b) => a.rank - b.rank);
  const top = sorted[0];
  const keep = keepOf(scored);
  const cheapest = [...scored].sort((a, b) => a.result.netCostNPV - b.result.netCostNPV)[0];
  const cleanest = [...scored].sort((a, b) => a.result.co2.total - b.result.co2.total)[0];
  const yrs = state.g.horizonYears;
  const items: string[] = [];

  const margin = sorted.length > 1 ? top.overall - sorted[1].overall : 0;
  items.push(
    `<li><strong>${esc(optionName(top.spec))}</strong> ranks #1 with ${num(top.overall)}/100` +
      (sorted.length > 1 ? `, ${num(margin)} points ahead of ${esc(optionName(sorted[1].spec))}.` : '.') +
      (margin < 2 && sorted.length > 1 ? ' That is effectively a tie.' : '') + '</li>'
  );
  items.push(
    `<li><strong>Cheapest over ${yrs} years:</strong> ${esc(optionName(cheapest.spec))} at ${usd(cheapest.result.netCostNPV)} present-value net cost` +
      (keep && cheapest !== keep ? ` (${usd(keep.result.netCostNPV)} to keep ${esc(carNow())}).` : '.') + '</li>'
  );
  items.push(
    `<li><strong>Lowest lifecycle CO2e:</strong> ${esc(optionName(cleanest.spec))} at ${num(cleanest.result.co2.total)} t` +
      (keep && cleanest !== keep ? `, ${num(keep.result.co2.total - cleanest.result.co2.total)} t (${num(((keep.result.co2.total - cleanest.result.co2.total) / keep.result.co2.total) * 100, 0)}%) below keeping ${esc(carNow())}.` : '.') + '</li>'
  );

  const winners = new Set(sensitivityGrid().flatMap((r) => r.cells.map((c) => c.winner)));
  items.push(
    winners.size === 1
      ? `<li><strong>Robust:</strong> the same option wins under every weighting and scoring mode.</li>`
      : `<li><strong>Not robust:</strong> the winner changes with the weighting or scoring mode (${[...winners].map(esc).join(', ')}). See the sensitivity table.</li>`
  );

  if (keep && top !== keep && state.mode !== 'metrics') {
    const w = state.weights;
    const sum = w.planet + w.people + w.profit || 1;
    const adv = {
      planet: ((top.pillars.planet - keep.pillars.planet) * w.planet) / sum,
      people: ((top.pillars.people - keep.pillars.people) * w.people) / sum,
      profit: ((top.pillars.profit - keep.pillars.profit) * w.profit) / sum
    };
    if (adv.people > adv.planet && adv.people > 0 && adv.people > Math.abs(adv.profit)) {
      items.push('<li><strong>Check this:</strong> the lead over keeping your current car comes mainly from the People ratings, which are partly subjective. Review them in the People tab.</li>');
    }
  }
  if (keep && cheapest === keep) {
    items.push('<li>Replacing a paid-off, low-mileage vehicle rarely pays back on fuel savings alone; at these inputs the economics favor keeping it.</li>');
  }
  if (!keep) items.push('<li>You chose to just buy, so there is no keep-your-car option here; options are compared with each other and with a typical new car.</li>');
  const anyInc = scored.some((s) => incentiveTotal(s.result) > 0);
  if (anyInc) {
    const best = [...scored].sort((a, b) => incentiveTotal(b.result) - incentiveTotal(a.result))[0];
    items.push(`<li><strong>Incentives counted:</strong> up to ${usd(incentiveTotal(best.result))} (${esc(optionName(best.spec))}). Several need your confirmation; see the yellow box in the assumptions below.</li>`);
  }
  return `<ul class="verdict-list">${items.join('')}</ul>`;
}
