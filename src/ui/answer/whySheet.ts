import { scoreOptions, type ScoredOption, type Vehicle } from '../../engine';
import { CRITERIA_NOTES, GLOBAL_META, LIMITATIONS, SRC } from '../../data';
import { esc, num, usd } from '../../app/format';
import { hasCar, incentiveTotal, keepOf, lx, optionName, scoring, sensitivityGrid, visibleOptions } from '../../app/options';
import { MODES, PRESET_LABELS, type State, type Tab } from '../../app/state';
import { carPhrase, shownName } from '../../app/verdict';
import { dsDisclosure } from '../components/disclosure';
import { dsField } from '../components/field';
import { dsSheet } from '../components/sheet';
import { dsStatusLabel } from '../components/statusLabel';
import { globalStatus, ownedStatus } from '../steps/status';

/** Id of the "Why this result" sheet. */
export const WHY_SHEET = 'why';

/** The tabs of the pillar tables, in order. */
export const WHY_TABS: Tab[] = ['planet', 'people', 'profit'];

const cap = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1);

/** Wide tables scroll inside their own box, which keyboard users can focus and scroll. */
const wrap = (label: string, table: string): string => `<div class="ds-table-wrap" role="region" aria-label="${esc(label)}, scrolls sideways" tabindex="0">${table}</div>`;

const scoredFor = (s: State): ScoredOption[] => scoreOptions(s.g, s.vehicles, visibleOptions(), scoring()).sort((a, b) => a.rank - b.rank);

/** Cars in the pillar tables: your car first, then each compared car once. */
export function ratedCars(scored: ScoredOption[]): Vehicle[] {
  const seen = new Set<string>();
  const out = scored.map((x) => x.vehicle).filter((v) => (seen.has(v.id) ? false : (seen.add(v.id), true)));
  return [...out.filter((v) => v.owned), ...out.filter((v) => !v.owned)];
}

/** "What these numbers rest on": the few values that move the answer most, each with where it comes from. */
function restOn(s: State): string {
  const m = GLOBAL_META;
  const rows: [string, string, string][] = [
    ['Gas price', `$${num(s.g.gasPrice, 2)} a gallon`, dsStatusLabel(globalStatus(s, 'gasPrice', m.gasPrice))],
    ['Home charging price', `$${num(s.g.elecPrice, 2)} per kWh`, dsStatusLabel(globalStatus(s, 'elecPrice', m.elecPrice))],
    ['Carbon per kWh from the grid', `${num(s.g.gridKgPerKwh, 3)} kg`, dsStatusLabel(globalStatus(s, 'gridKgPerKwh', m.gridKgPerKwh))],
    ['Miles per year', s.g.milesPerYear.toLocaleString('en-US'), dsStatusLabel(globalStatus(s, 'milesPerYear', m.milesPerYear))]
  ];
  if (hasCar()) {
    const car = carPhrase(lx().short);
    rows.push([s.g.disposal === 'trade' ? `What ${car} is worth before the trade-in discount` : `What ${car} would sell for`, usd(lx().price), dsStatusLabel(ownedStatus(s, 'price'))]);
    rows.push(['Driving that continues after you part with it', `${num(s.g.lxLeakage * 100, 0)}%`, dsStatusLabel(globalStatus(s, 'lxLeakage', m.lxLeakage))]);
  }
  return `<ul class="ds-rest">${rows.map(([k, v, b]) => `<li><span class="ds-rest-k">${esc(k)}<span class="ds-rest-v">${esc(v)}</span></span>${b}</li>`).join('')}</ul>`;
}

/** The scale in one plain sentence. */
function scaleLine(s: State): string {
  const fifty = s.scale === 'benchmark' ? 'costs and emits the same as a typical new car at your mileage' : s.scale === 'anchored' && hasCar() ? 'the same as keeping your car' : 'halfway between the best and worst option here';
  return `<p class="ds-small">Scores are out of 100. 50 = ${fifty}; higher is better. The overall score combines Planet, People and Profit with ${esc(PRESET_LABELS[s.preset] ?? 'your own')} weighting.</p>`;
}

/** Planet tab table. */
export function planetTable(s: State, scored: ScoredOption[]): string {
  const keep = keepOf(scored);
  const rows = scored
    .map((x) => {
      const c = x.result.co2;
      const isKeep = x === keep;
      const vs = isKeep || !keep ? '-' : `${c.total - keep.result.co2.total >= 0 ? '+' : ''}${num(c.total - keep.result.co2.total)}`;
      return `<tr${isKeep ? ' class="ds-row-keep"' : ''}><th scope="row">${esc(shownName(optionName(x.spec)))}</th><td class="n">${num(c.use)}</td><td class="n">${num(c.embodied)}</td><td class="n">${num(c.leakage)}</td><td class="n"><b>${num(c.total)}</b></td><td class="n">${vs}</td><td class="n">${num(x.pillars.planet, 0)}</td></tr>`;
    })
    .join('');
  return wrap(
    'Planet table',
    `<table class="ds-table"><caption class="ds-sr">Carbon over ${s.g.horizonYears} years, in tonnes</caption><thead><tr><th scope="col">Option</th><th scope="col" class="n">Driving</th><th scope="col" class="n">Making the car</th><th scope="col" class="n">Old car after you part with it</th><th scope="col" class="n">Total carbon (t)</th><th scope="col" class="n">vs keeping (t)</th><th scope="col" class="n">Planet score</th></tr></thead><tbody>${rows}</tbody></table>`
  );
}

/** People tab table (read-only; the ratings are changed below it). */
export function peopleTable(s: State, scored: ScoredOption[]): string {
  const cars = ratedCars(scored);
  const score = (v: Vehicle) => scored.find((x) => x.vehicle.id === v.id)?.pillars.people ?? 0;
  const rows = s.criteria
    .map((c) => `<tr><th scope="row">${esc(c.label)}<span class="ds-kind">${c.objective ? 'Rated externally' : 'Judgment'}</span></th>${cars.map((v) => `<td class="n">${v.ratings[c.id] ?? 3}</td>`).join('')}</tr>`)
    .join('');
  return wrap(
    'People table',
    `<table class="ds-table"><caption class="ds-sr">People ratings, 1 = poor, 5 = excellent</caption><thead><tr><th scope="col">Rating (1 to 5)</th>${cars.map((v) => `<th scope="col" class="n">${esc(v.short)}</th>`).join('')}</tr></thead><tbody>${rows}<tr class="ds-row-sum"><th scope="row">People score</th>${cars.map((v) => `<td class="n"><b>${num(score(v), 0)}</b></td>`).join('')}</tr></tbody></table>`
  );
}

/** Profit tab table. */
export function profitTable(s: State, scored: ScoredOption[]): string {
  const keep = keepOf(scored);
  const rows = scored
    .map((x) => {
      const r = x.result;
      const k = x.spec.financing === 'none';
      const i = r.incentives;
      const vs = k || !keep ? '-' : `${r.netCostNPV - keep.result.netCostNPV >= 0 ? '+' : ''}${usd(r.netCostNPV - keep.result.netCostNPV)}`;
      return `<tr${k ? ' class="ds-row-keep"' : ''}><th scope="row">${esc(shownName(optionName(x.spec)))}</th><td class="n">${usd(r.upfrontCash)}</td><td class="n">${k ? '-' : usd(r.monthlyPayment)}</td><td class="n">${usd(r.components.energy)}</td><td class="n">${usd(r.components.maintenance)}</td><td class="n">${usd(r.components.insurance)}</td><td class="n">${usd(r.components.interest)}</td><td class="n">${usd(r.components.capital)}</td><td class="n">${k ? '-' : usd(i.zevRebate)}</td><td class="n">${k ? '-' : usd(i.cc4aGrant + i.chargerSavings)}</td><td class="n">${k ? '-' : usd(i.loanDeduction)}</td><td class="n">${k ? '-' : usd(incentiveTotal(r))}</td><td class="n"><b>${usd(r.netCostNPV)}</b></td><td class="n">${vs}</td><td class="n">${num(x.pillars.profit, 0)}</td></tr>`;
    })
    .join('');
  const y = s.g.horizonYears;
  return wrap(
    'Profit table',
    `<table class="ds-table"><caption class="ds-sr">Money over ${y} years, in today's dollars</caption><thead><tr><th scope="col">Option</th><th scope="col" class="n">Cash at start</th><th scope="col" class="n">Monthly</th><th scope="col" class="n">Energy</th><th scope="col" class="n">Maintenance</th><th scope="col" class="n">Insurance</th><th scope="col" class="n">Interest</th><th scope="col" class="n">The car itself, after resale</th><th scope="col" class="n">CA first-EV rebate</th><th scope="col" class="n">Scrap grant and charger</th><th scope="col" class="n">Loan-interest tax savings</th><th scope="col" class="n">Rebates and tax savings</th><th scope="col" class="n">Cost over ${y} years</th><th scope="col" class="n">vs keeping</th><th scope="col" class="n">Profit score</th></tr></thead><tbody>${rows}</tbody></table>`
  );
}

const BLURB: Record<Tab, (s: State) => string> = {
  planet: (s) =>
    `Carbon over ${s.g.horizonYears} years, in tonnes. Gas counts ${num(s.g.gasKgPerGal + s.g.gasUpstreamKgPerGal, 2)} kg a gallon (tailpipe and refining); electricity ${num(s.g.gridKgPerKwh, 3)} kg per kWh. Making the car is shared over a ${s.g.vehicleLifeYears}-year life${s.g.embodiedMode === 'full' ? ' (strict: all of it counted to you)' : ''}.${hasCar() ? ` If you sell or trade in your car, ${num(s.g.lxLeakage * 100, 0)}% of its driving is assumed to continue with the next owner; scrapping it through Clean Cars 4 All ends it.` : ''}`,
  people: () => 'Ratings from 1 (poor) to 5 (excellent). "Rated externally" uses crash tests and tailpipe data; "Judgment" is an assumption you can change below. In "Numbers only" scoring only the externally rated ones count.',
  profit: (s) =>
    `Cost over ${s.g.horizonYears} years in today's dollars, after rebates${hasCar() ? ' and what you get for your car' : ''}. Cash at start = down payment or amount due at signing, plus a home charger${hasCar() ? ', minus what you get for your car' : ''} and any rebate; a minus sign means money back. Federal EV credits ended Sept 30, 2025, so none are applied.`
};

/** The rating and weight editors on the People tab: pick a car, then rate it; how much each criterion counts. */
function peopleEditors(s: State, scored: ScoredOption[], rateCar: string): string {
  const cars = ratedCars(scored);
  const car = cars.find((v) => v.id === rateCar) ?? cars[0];
  if (!car) return '';
  const chips = `<fieldset class="ds-radios"><legend class="ds-label">Car to rate</legend>${cars
    .map((v) => `<label class="ds-radio"><input type="radio" name="why-rcar" value="${esc(v.id)}" data-act="why-rcar"${v === car ? ' checked' : ''}><span>${esc(v.short)}</span></label>`)
    .join('')}</fieldset>`;
  const weights = s.criteria
    .map((c) => dsField({ id: `why-cw-${c.id}`, label: c.label, name: `cw.${c.id}`, value: c.weight, min: 0, max: 100, step: 5, note: CRITERIA_NOTES[c.id]?.help }))
    .join('');
  return `${dsDisclosure({ id: 'why-rate', title: 'Change the ratings', bodyHtml: `${chips}<div id="why-raters" class="ds-stack">${raters(s, car)}</div>` })}${dsDisclosure({ id: 'why-weights', title: 'How much each one counts', meta: '0 to 100', bodyHtml: `<p class="ds-small">Weights are relative: a criterion at 20 counts twice as much as one at 10. 0 leaves it out.</p>${weights}` })}`;
}

/** One select per criterion for one car, with the note behind its default rating. */
export function raters(s: State, car: Vehicle): string {
  return s.criteria
    .map((c) => {
      const id = `why-r-${c.id}`;
      const note = s.ratingNotes[car.id]?.[c.id];
      const opts = [1, 2, 3, 4, 5].map((n) => `<option value="${n}"${(car.ratings[c.id] ?? 3) === n ? ' selected' : ''}>${n}</option>`).join('');
      return `<div class="ds-field"><label class="ds-label" for="${id}">${esc(c.label)}</label><select class="ds-select" id="${id}" data-act="why-rate" data-car="${esc(car.id)}" data-crit="${esc(c.id)}"${note ? ` aria-describedby="${id}-note"` : ''}>${opts}</select>${note ? `<p class="ds-hint" id="${id}-note">${esc(note)}</p>` : ''}</div>`;
    })
    .join('');
}

/** The open tab's contents. */
export function whyPanel(s: State, tab: Tab, rateCar: string): string {
  const scored = scoredFor(s);
  const table = tab === 'planet' ? planetTable(s, scored) : tab === 'people' ? peopleTable(s, scored) : profitTable(s, scored);
  return `<p class="ds-small">${esc(BLURB[tab](s))}</p><div id="why-table">${table}</div>${tab === 'people' ? peopleEditors(s, scored, rateCar) : ''}`;
}

/** Cost and carbon bars, cheapest and cleanest first; every bar carries its number as text. */
export function whyBars(s: State): string {
  const scored = scoredFor(s);
  const bars = (rows: ScoredOption[], value: (x: ScoredOption) => number, text: (x: ScoredOption) => string) => {
    const max = Math.max(...rows.map((x) => Math.abs(value(x))), 1);
    return `<ul class="ds-bars">${rows
      .map((x) => `<li class="ds-bar"><span class="ds-bar-name">${esc(shownName(optionName(x.spec)))}</span><span class="ds-bar-val">${esc(text(x))}</span><span class="ds-bar-track" aria-hidden="true"><i style="width:${((Math.max(0, value(x)) / max) * 100).toFixed(1)}%"></i></span></li>`)
      .join('')}</ul>`;
  };
  const byCost = [...scored].sort((a, b) => a.result.netCostNPV - b.result.netCostNPV);
  const byCo2 = [...scored].sort((a, b) => a.result.co2.total - b.result.co2.total);
  return `<h4 class="ds-h4">Cost over ${s.g.horizonYears} years, lowest first</h4>${bars(byCost, (x) => x.result.netCostNPV, (x) => usd(x.result.netCostNPV))}
<h4 class="ds-h4">Carbon over ${s.g.horizonYears} years, lowest first</h4>${bars(byCo2, (x) => x.result.co2.total, (x) => `${num(x.result.co2.total)} t`)}`;
}

/** "Does the winner hold up?": the winner under every weighting and scoring method; other winners are marked in words. */
export function holdUp(s: State): string {
  const grid = sensitivityGrid();
  const top = scoredFor(s)[0];
  const topName = top ? optionName(top.spec) : '';
  const show = (t: string) => esc(shownName(t));
  const total = grid.length * MODES.length;
  const wins = grid.flatMap((r) => r.cells).filter((c) => c.winner === topName).length;
  const table = `<table class="ds-table"><thead><tr><th scope="col">Weighting</th>${MODES.map((m) => `<th scope="col">${esc(m.label)}</th>`).join('')}</tr></thead><tbody>${grid
    .map((r) => `<tr><th scope="row">${esc(PRESET_LABELS[r.preset])}</th>${r.cells.map((c) => (c.winner === topName ? `<td>${show(c.winner)}</td>` : `<td class="ds-cell-flip">${show(c.winner)}<span class="ds-sr"> (different winner)</span></td>`)).join('')}</tr>`)
    .join('')}</tbody></table>`;
  return `<p class="ds-small">Winner under each weighting and scoring method. ${show(topName)} wins ${wins} of ${total}; other winners are marked ≠.</p>${wrap('Does the winner hold up', table)}`;
}

/** Sources (every link opens in a new tab) and what the tool leaves out. */
function sourcesAndLimits(open: boolean): string {
  const all = Object.values(SRC);
  const item = (x: { label: string; url: string }) => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.label)}<span class="ds-sr"> (opens in a new tab)</span></a></li>`;
  return `<h3 class="ds-h3" id="why-src-h" tabindex="-1">Sources</h3><p class="ds-small">Retrieved November 1, 2026. Prices, lease offers, rates and incentive funding change often; confirm before acting.</p>
${dsDisclosure({ id: 'why-srcs', title: `All ${all.length} sources`, open, bodyHtml: `<ul class="ds-srcs">${all.map(item).join('')}</ul>` })}
<h3 class="ds-h3">What this does not model</h3><ul class="ds-limits">${LIMITATIONS.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`;
}

/** The tab list: real tabs (arrow keys move between them; only the selected one is in the Tab order). */
function tabList(tab: Tab): string {
  return `<div class="ds-tabs" role="tablist" aria-label="Pillar">${WHY_TABS.map(
    (t) => `<button type="button" role="tab" class="ds-tab${t === tab ? ' ds-tab-on' : ''}" id="why-tab-${t}" aria-selected="${t === tab}" aria-controls="why-panel" data-act="why-tab" data-val="${t}"${t === tab ? '' : ' tabindex="-1"'}>${cap(t)}</button>`
  ).join('')}</div>`;
}

/** The whole "Why this result" sheet body (mockups 2a to 2c). */
export function whyBody(s: State, tab: Tab, rateCar: string, sourcesOpen = false): string {
  return `${scaleLine(s)}
<h3 class="ds-h3">What these numbers rest on</h3><div id="why-rest">${restOn(s)}</div>
<h3 class="ds-h3">Scores by pillar</h3>${tabList(tab)}<div role="tabpanel" id="why-panel" aria-labelledby="why-tab-${tab}" class="ds-tabpanel">${whyPanel(s, tab, rateCar)}</div>
<h3 class="ds-h3">Cost and carbon at a glance</h3><div id="why-bars">${whyBars(s)}</div>
<h3 class="ds-h3">Does the winner hold up?</h3><div id="why-hold">${holdUp(s)}</div>
${sourcesAndLimits(sourcesOpen)}
<p class="ds-sr" id="why-live" aria-live="polite"></p>`;
}

/** Render the sheet into the sheet host (hidden until shown). */
export function renderWhySheet(s: State, rateCar: string, sourcesOpen = false): void {
  const host = document.getElementById('ds-sheets');
  if (host) host.innerHTML = dsSheet({ id: WHY_SHEET, title: 'Why this result', bodyHtml: whyBody(s, s.tab, rateCar, sourcesOpen) });
}

/** After an edit: refresh everything in the sheet that depends on the scores, without touching the controls. */
export function refreshWhy(s: State): void {
  const set = (id: string, html: string) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  };
  const scored = scoredFor(s);
  set('why-rest', restOn(s));
  set('why-table', s.tab === 'planet' ? planetTable(s, scored) : s.tab === 'people' ? peopleTable(s, scored) : profitTable(s, scored));
  set('why-bars', whyBars(s));
  set('why-hold', holdUp(s));
}
