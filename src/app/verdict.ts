/** One option as the answer screen sees it (already scored by the engine). */
export interface VerdictOption {
  id: string;
  /** Display name from `optionName`, e.g. "Chevy Bolt (loan)" or "Keep My gas sedan". */
  name: string;
  overall: number;
  /** Cost over the horizon, present value. */
  cost: number;
  /** Lifecycle carbon, tonnes. */
  carbon: number;
  isKeep: boolean;
}

/** A row of the what-if table, keyed by option id (from `sensitivityRows` with ids as names). */
export interface FlipRow {
  change: string;
  winner: string;
  winnerChanged?: boolean;
}

/** Points within which two options count as a near tie (spec rule 4, inclusive). */
export const CLOSE_POINTS = 2;

/** "My gas sedan" -> "your gas sedan"; any other name -> "your {name}" (decision Q8). */
export function carPhrase(short: string): string {
  const t = short.trim();
  if (!t) return 'your car';
  return /^my\s/i.test(t) ? `your ${t.slice(3).trim()}` : `your ${t}`;
}

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** How an option reads mid-sentence: "keeping your gas sedan" or "the Chevy Bolt (loan)". */
function phrase(o: VerdictOption, car: string | null): string {
  return o.isKeep ? `keeping ${carPhrase(car ?? '')}` : `the ${o.name}`;
}

const cheapestOf = (opts: VerdictOption[]): VerdictOption => opts.reduce((a, b) => (b.cost < a.cost ? b : a));
const cleanestOf = (opts: VerdictOption[]): VerdictOption => opts.reduce((a, b) => (b.carbon < a.carbon ? b : a));

/**
 * The answer's heading: one or two plain sentences following the spec's five rules. When the top two are
 * within 2 points, the near-tie rule wins over "keep comes out ahead" (decision Q8). `ranked` must be sorted
 * best first; `carName` is the owned car's short name, or null when there is no current car.
 */
export function verdictSentence(ranked: VerdictOption[], carName: string | null): string {
  if (!ranked.length) return 'Pick at least one car to compare.';
  const [top, second] = ranked;
  const keep = ranked.find((o) => o.isKeep) ?? null;
  const cheapest = cheapestOf(ranked);
  if (second && top.overall - second.overall <= CLOSE_POINTS)
    return `It is close. ${cap(phrase(top, carName))} and ${phrase(second, carName)} are within ${CLOSE_POINTS} points.`;
  if (keep && top === keep) return `${cap(phrase(keep, carName))} comes out ahead overall.`;
  if (keep && cheapest === keep) return `${cap(phrase(keep, carName))} costs least. ${cap(phrase(top, carName))} scores highest overall.`;
  if (cheapest === top) return `${cap(phrase(top, carName))} wins on cost and overall score.`;
  return `${cap(phrase(top, carName))} scores highest overall; ${phrase(cheapest, carName)} costs least.`;
}

/** The cards to show: the top three by score, plus keep when it is not already among them (spec). */
export function answerCards(ranked: VerdictOption[]): VerdictOption[] {
  const top = ranked.slice(0, 3);
  const keep = ranked.find((o) => o.isKeep);
  return keep && !top.includes(keep) ? [...top, keep] : top;
}

/** Tags in words, each given to the option that earns it; one option can earn several. */
export function cardTags(ranked: VerdictOption[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const add = (o: VerdictOption | undefined, tag: string) => {
    if (o) (out[o.id] ??= []).push(tag);
  };
  if (!ranked.length) return out;
  add(ranked[0], 'Highest overall score');
  add(cheapestOf(ranked), 'Lowest cost');
  add(cleanestOf(ranked), 'Lowest carbon');
  return out;
}

const money = (n: number): string => `$${n.toFixed(2)}`;

/**
 * "What would change this", first line: the gas price at which the best replacement costs the same as keeping.
 * `breakEven` is the engine's value: null = none below $40, 0 = cheaper even with free gas.
 */
export function breakEvenLine(optionName: string, breakEven: number | null, gasPrice: number, carName: string): string {
  const car = carPhrase(carName);
  if (breakEven === null) return `No realistic gas price makes the ${optionName} cheaper than keeping ${car}.`;
  if (breakEven === 0) return `The ${optionName} costs less than keeping ${car} at any gas price.`;
  if (breakEven <= gasPrice) return `The ${optionName} already costs less than keeping ${car} at ${money(gasPrice)} a gallon; it stays cheaper down to ${money(breakEven)}.`;
  return `Gas above ${money(breakEven)} a gallon makes the ${optionName} cost less than keeping ${car}. Today the tool assumes ${money(gasPrice)}.`;
}

/** Plain-words conditions for each what-if row (`{car}` becomes "your gas sedan"). Order = preference when several flip. */
const FLIP_PHRASES: [string, string][] = [
  ['Double the miles per year', 'If you drove twice as far'],
  ['Half the miles per year', 'If you drove half as far'],
  ['Gas price 50% higher', 'If gas cost 50% more'],
  ['Gas price 40% lower', 'If gas cost 40% less'],
  ['Old car stops emitting after you part with it (0% continues, e.g. scrapped)', 'If {car} were scrapped instead of driven by a new owner'],
  ['Old car keeps emitting at 100% after you part with it', 'If all of {car}\'s driving continued with its next owner'],
  ['Shorter 5-year horizon', 'Over 5 years'],
  ['Longer 12-year horizon', 'Over 12 years'],
  ['Electricity 30% pricier', 'If electricity cost 30% more'],
  ['Cleaner grid (half the CO2 per kWh)', 'If the power grid were twice as clean'],
  ['No California first-time-EV rebate', 'Without the California first-time EV rebate'],
  ['No loan-interest deduction', 'Without the loan-interest tax deduction'],
  ['Clean Cars 4 All grant (scrap the owned car)', 'With a Clean Cars 4 All grant for scrapping {car}'],
  ['Trade in at a dealer instead of selling privately', 'If you traded {car} in instead of selling it'],
  ['Sell privately instead of trading in', 'If you sold {car} yourself instead of trading it in'],
  ['Owned car sells for 50% less', 'If {car} sold for half as much'],
  ['Owned car sells for 50% more', 'If {car} sold for 50% more'],
  ['Owned car repair costs double', 'If {car}\'s repair costs doubled'],
  ['Strict manufacturing emissions (100% charged to you)', 'If you counted all of a new car\'s factory emissions']
];

/** The first row (in preference order) whose change flips the winner, or null. */
export function pickFlip(rows: FlipRow[]): FlipRow | null {
  const flipped = rows.filter((r) => r.winnerChanged);
  if (!flipped.length) return null;
  const rank = (r: FlipRow) => {
    const i = FLIP_PHRASES.findIndex(([c]) => c === r.change);
    return i < 0 ? FLIP_PHRASES.length : i;
  };
  return [...flipped].sort((a, b) => rank(a) - rank(b))[0];
}

/** "If you drove twice as far, the Chevy Bolt (loan) would score highest." `names` maps option ids to display names. */
export function flipLine(row: FlipRow, names: Record<string, string>, carName: string): string {
  const car = carPhrase(carName);
  const who = row.winner === 'keep' ? `keeping ${car}` : `the ${names[row.winner] ?? row.winner}`;
  const known = FLIP_PHRASES.find(([c]) => c === row.change);
  if (!known) return `With this change (${row.change.charAt(0).toLowerCase() + row.change.slice(1)}), ${who} would score highest.`;
  return `${known[1].replace('{car}', car)}, ${who} would score highest.`;
}
