import {
  breakEvenGasPrice,
  computeOption,
  paybackYear,
  scoreOptions,
  WEIGHT_PRESETS,
  type Aggregation,
  type Disposal,
  type PillarWeights,
  type ScaleMode,
  type ScoredOption,
  type ScoringMode,
  type Vehicle
} from './engine';
import {
  buildPrompt,
  hasContent,
  sanitizeAnswer,
  sensitivityRows,
  type AnalystAnswer,
  type CarInfo,
  type FieldInfo,
  type ResultRow
} from './analyst';
import {
  CAR_PRESETS,
  CRITERIA_NOTES,
  currentCarFromPreset,
  DEFAULT_CRITERIA,
  DEFAULT_GLOBALS,
  GLOBAL_META,
  LIMITATIONS,
  SRC,
  makeCustomVehicle,
  type ParamMeta
} from './data';
import { MAX_SELECTED, MODES, PRESET_LABELS, THEMES, clone, state, type Tab, type Theme, type View } from './app/state';
import { defaultOf, fieldId, fieldRegistry, isEdited, readField, writeField, type Field } from './app/fields';
import { safeStore } from './app/storage';
import { esc, num, usd } from './app/format';
import { activeVehicles, carNow, gasBreakEven, hasCar, incentiveTotal, keepOf, kindLabel, lx, optionName, paybackText, scaleBlurb, scaleLabel, scoring, sensitivityGrid, tagFor, vehicle, visibleOptions } from './app/options';
import { $ } from './ui/dom';


function buildVerdict(scored: ScoredOption[]): string {
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

function pillarRow(label: string, value: number): string {
  const v = Math.max(0, Math.min(100, value));
  return `<div class="prow"><span class="plabel">${label}</span><span class="pbar"><i style="width:${v.toFixed(1)}%"></i></span><span class="pval">${num(value, 0)}</span></div>`;
}

function renderCards(scored: ScoredOption[], keep: ScoredOption | null): string {
  const sorted = [...scored].sort((a, b) => a.rank - b.rank);
  const shown = state.showAll ? sorted : sorted.filter((s, i) => i < 8 || s === keep);
  const cards = shown
    .map((s) => {
      const r = s.result;
      const pay = s.spec.financing === 'none' ? '-' : usd(r.monthlyPayment) + '/mo';
      const inc = incentiveTotal(r);
      return `<article class="card ${state.scale !== 'relative' ? 'anchored' : ''}" style="--c:var(--c-${colorKey(s.vehicle.id)})">
  <div class="card-top">
    <span class="rank">#${s.rank}</span>
    <div class="card-title"><h3>${esc(s.spec.financing === 'none' ? 'Keep ' + s.vehicle.short : s.vehicle.short)}</h3><span class="tag">${kindLabel(s.vehicle)} · ${tagFor(s.spec)}</span></div>
    <div class="score"><b>${num(s.overall)}</b><small>/100</small></div>
  </div>
  <div class="pillars">
    ${pillarRow('Planet', s.pillars.planet)}
    ${pillarRow('People', s.pillars.people)}
    ${pillarRow('Profit', s.pillars.profit)}
  </div>
  <dl class="stats">
    <div><dt>${state.g.horizonYears}-yr net cost (PV)</dt><dd>${usd(r.netCostNPV)}</dd></div>
    <div><dt>Payment</dt><dd>${pay}</dd></div>
    <div><dt>Lifecycle CO2e</dt><dd>${num(r.co2.total)} t</dd></div>
    <div><dt>Incentives and tax savings</dt><dd>${s.spec.financing === 'none' ? '-' : usd(inc)}</dd></div>
    <div><dt>Gas price to break even</dt><dd>${gasBreakEven(s)}</dd></div>
    <div><dt>Payback vs keeping</dt><dd>${paybackText(s, keep)}</dd></div>
  </dl>
</article>`;
    })
    .join('');
  const more =
    sorted.length > 8
      ? `<p class="morebar"><button class="btn ghost" data-act="showall">${state.showAll ? 'Show only the top 8' : `Show all ${sorted.length} options`}</button></p>`
      : '';
  return cards + more;
}

/** Stable color slot per vehicle: the original four keep their colors; others rotate. */
function colorKey(id: string): string {
  const fixed: Record<string, string> = { lx: 'lx', tesla: 'tesla', rivian: 'rivian', bolt: 'bolt' };
  if (fixed[id]) return fixed[id];
  const i = state.vehicles.findIndex((v) => v.id === id);
  return `x${i % 6}`;
}

function renderBars(scored: ScoredOption[]): string {
  const rows = [...scored].sort((a, b) => a.result.netCostNPV - b.result.netCostNPV);
  const maxCost = Math.max(...rows.map((r) => Math.abs(r.result.netCostNPV)), 1);
  const co2Rows = [...scored].sort((a, b) => a.result.co2.total - b.result.co2.total);
  const maxCo2 = Math.max(...co2Rows.map((r) => r.result.co2.total), 1);
  const costHtml = rows
    .map(
      (r) => `<div class="brow" style="--c:var(--c-${colorKey(r.vehicle.id)})"><span class="bname">${esc(optionName(r.spec))}</span><span class="btrack"><i style="width:${((Math.max(0, r.result.netCostNPV) / maxCost) * 100).toFixed(1)}%"></i></span><span class="bval">${usd(r.result.netCostNPV)}</span></div>`
    )
    .join('');
  const co2Html = co2Rows
    .map((r) => {
      const c = r.result.co2;
      const w = (x: number) => ((x / maxCo2) * 100).toFixed(2);
      return `<div class="brow"><span class="bname">${esc(optionName(r.spec))}</span><span class="btrack stack"><i class="s1" style="width:${w(c.use)}%"></i><i class="s2" style="width:${w(c.embodied)}%"></i><i class="s3" style="width:${w(c.leakage)}%"></i></span><span class="bval">${num(c.total)} t</span></div>`;
    })
    .join('');
  return `<div class="two">
  <div><h3>Net cost over ${state.g.horizonYears} years (present value)</h3>${costHtml}<p class="fine">Energy, maintenance, insurance, payments, taxes and what you get for your current car, minus resale value at the end, minus incentives. A negative cost means resale value exceeds what you pay to run it.</p></div>
  <div><h3>Lifecycle CO2e over ${state.g.horizonYears} years</h3>${co2Html}
    <div class="legend"><span><i class="s1"></i>Driving (incl. gasoline upstream)</span><span><i class="s2"></i>Manufacturing share</span><span><i class="s3"></i>Old car keeps running after you part with it</span></div></div>
</div>`;
}

function planetTable(scored: ScoredOption[], keep: ScoredOption | null): string {
  const rows = scored
    .map((s) => {
      const c = s.result.co2;
      const d = keep ? c.total - keep.result.co2.total : 0;
      return `<tr><th>${esc(optionName(s.spec))}</th><td>${num(c.use)}</td><td>${num(c.embodied)}</td><td>${num(c.leakage)}</td><td><b>${num(c.total)}</b></td><td>${num(s.result.co2PerMile * 1000, 0)}</td><td>${s.spec.financing === 'none' || !keep ? '-' : (d >= 0 ? '+' : '') + num(d)}</td></tr>`;
    })
    .join('');
  return `<div class="scroll"><table><thead><tr><th>Option</th><th>Driving (t)</th><th>Manufacturing (t)</th><th>Old car after you part with it (t)</th><th>Total (t)</th><th>g CO2e / mi</th><th>vs keep (t)</th></tr></thead><tbody>${rows}</tbody></table></div>
<p class="fine">Planet score uses total CO2e. Gasoline counts ${num(state.g.gasKgPerGal + state.g.gasUpstreamKgPerGal, 2)} kg per gallon (tailpipe plus upstream); electricity counts ${num(state.g.gridKgPerKwh, 3)} kg per kWh with no upstream. Manufacturing is shared over a ${state.g.vehicleLifeYears}-year vehicle life${state.g.embodiedMode === 'full' ? ' (strict mode: 100% charged to you)' : ''}. If you sell or trade in your current car, ${num(state.g.lxLeakage * 100, 0)}% of its emissions are assumed to continue with the next owner; if you scrap it through Clean Cars 4 All, none do.</p>`;
}

function peopleTable(scored: ScoredOption[]): string {
  const seen = new Set<string>();
  const vehs = scored.map((s) => s.vehicle).filter((v) => (seen.has(v.id) ? false : (seen.add(v.id), true)));
  const head = vehs.map((v) => `<th style="--c:var(--c-${colorKey(v.id)})" class="vh">${esc(v.short)}</th>`).join('');
  const rows = state.criteria
    .map((c) => {
      const cells = vehs
        .map((v) => {
          const note = state.ratingNotes[v.id]?.[c.id] ?? '';
          const opts = [1, 2, 3, 4, 5].map((n) => `<option value="${n}" ${v.ratings[c.id] === n ? 'selected' : ''}>${n}</option>`).join('');
          return `<td><select aria-label="${esc(v.short)} ${esc(c.label)}" data-rate="${v.id}" data-crit="${c.id}">${opts}</select><span class="note">${esc(note)}</span></td>`;
        })
        .join('');
      const help = CRITERIA_NOTES[c.id];
      const links = (help?.src ?? []).map((k) => `<a href="${SRC[k].url}" target="_blank" rel="noopener">${esc(SRC[k].label)}</a>`).join(' · ');
      return `<tr><th scope="row">${esc(c.label)} ${c.objective ? '<span class="badge sourced">rated externally</span>' : '<span class="badge assumption">judgment</span>'}
        <label class="wt">Weight <input type="number" min="0" max="100" step="5" value="${c.weight}" data-weight="${c.id}"></label>
        <span class="note">${esc(help?.help ?? '')}</span>${links ? `<span class="note">${links}</span>` : ''}</th>${cells}</tr>`;
    })
    .join('');
  const scoreRow = vehs
    .map((v) => {
      const s = scored.find((x) => x.vehicle.id === v.id) as ScoredOption;
      return `<td><b>${num(s.pillars.people, 0)}</b></td>`;
    })
    .join('');
  return `<div class="scroll"><table class="ptable"><thead><tr><th>Criterion (1 = poor, 5 = excellent)</th>${head}</tr></thead><tbody>${rows}<tr class="sum"><th>People score (0-100)</th>${scoreRow}</tr></tbody></table></div>
<p class="fine">Change any rating to match your values; the scores update immediately. In "Numbers only" mode only the externally rated criteria count. Unrated cars default to a neutral 3.</p>`;
}

function profitTable(scored: ScoredOption[], keep: ScoredOption | null): string {
  const rows = scored
    .map((s) => {
      const r = s.result;
      const c = r.components;
      const i = r.incentives;
      return `<tr><th>${esc(optionName(s.spec))}</th><td>${usd(r.upfrontCash)}</td><td>${s.spec.financing === 'none' ? '-' : usd(r.monthlyPayment)}</td><td>${usd(c.energy)}</td><td>${usd(c.maintenance)}</td><td>${usd(c.insurance)}</td><td>${usd(c.interest)}</td><td>${usd(c.capital)}</td><td>${s.spec.financing === 'none' ? '-' : usd(i.zevRebate)}</td><td>${s.spec.financing === 'none' ? '-' : usd(i.cc4aGrant + i.chargerSavings)}</td><td>${s.spec.financing === 'none' ? '-' : usd(i.loanDeduction)}</td><td>${usd(r.netCostNominal)}</td><td><b>${usd(r.netCostNPV)}</b></td><td>${s.spec.financing === 'none' || !keep ? '-' : usd(r.netCostNPV - keep.result.netCostNPV)}</td></tr>`;
    })
    .join('');
  return `<div class="scroll"><table><thead><tr><th>Option</th><th>Cash at start*</th><th>Monthly</th><th>Energy</th><th>Maint.</th><th>Insurance</th><th>Interest</th><th>Net vehicle capital</th><th>CA first-EV rebate</th><th>Scrap grant + charger</th><th>Loan-interest tax savings</th><th>Net cost (nominal)</th><th>Net cost (PV)</th><th>vs keep (PV)</th></tr></thead><tbody>${rows}</tbody></table></div>
<p class="fine">*Down payment or lease due-at-signing plus home charger, minus what you get for your current car (sale or trade-in) and any rebate or grant. Net vehicle capital = price, tax and charger minus resale value, what you get for your current car and up-front incentives (or total lease payments). Loan-interest tax savings are a separate cash inflow. Federal EV credits ended Sept 30, 2025, so none are applied.</p>`;
}

function renderSens(): string {
  const rows = sensitivityGrid()
    .map((r) => `<tr><th>${PRESET_LABELS[r.preset]}</th>${r.cells.map((c) => `<td>${esc(c.winner)}</td>`).join('')}</tr>`)
    .join('');
  const head = MODES.map((m) => `<th>${m.label}</th>`).join('');
  return `<div class="scroll"><table><thead><tr><th>Pillar weighting</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>
<p class="fine">Winner under each combination of pillar weighting and scoring mode, using your current scale (${scaleLabel()}) and ${state.aggregation === 'average' ? 'weighted average' : 'weakest-link'} aggregation.</p>`;
}

interface Col {
  key: string;
  label: string;
  num: boolean;
  get: (s: ScoredOption, keep: ScoredOption | null) => number | string;
  show: (v: number | string, s: ScoredOption) => string;
}

function tableCols(): Col[] {
  const dash = (s: ScoredOption) => s.spec.financing === 'none';
  const n0 = (v: number | string) => num(Number(v), 0);
  const n1 = (v: number | string) => num(Number(v), 1);
  const money = (v: number | string) => usd(Number(v));
  return [
    { key: 'rank', label: 'Rank', num: true, get: (s) => s.rank, show: (v) => `#${v}` },
    { key: 'name', label: 'Option', num: false, get: (s) => optionName(s.spec), show: (v) => esc(String(v)) },
    { key: 'type', label: 'Type', num: false, get: (s) => kindLabel(s.vehicle), show: (v) => String(v) },
    { key: 'fin', label: 'Financing', num: false, get: (s) => tagFor(s.spec), show: (v) => String(v) },
    { key: 'overall', label: 'Overall', num: true, get: (s) => s.overall, show: n1 },
    { key: 'planet', label: 'Planet', num: true, get: (s) => s.pillars.planet, show: n0 },
    { key: 'people', label: 'People', num: true, get: (s) => s.pillars.people, show: n0 },
    { key: 'profit', label: 'Profit', num: true, get: (s) => s.pillars.profit, show: n0 },
    { key: 'npv', label: `${state.g.horizonYears}-yr net cost (PV)`, num: true, get: (s) => s.result.netCostNPV, show: money },
    { key: 'nominal', label: 'Net cost (nominal)', num: true, get: (s) => s.result.netCostNominal, show: money },
    { key: 'monthly', label: 'Monthly payment', num: true, get: (s) => (dash(s) ? 0 : s.result.monthlyPayment), show: (v, s) => (dash(s) ? '-' : money(v)) },
    { key: 'upfront', label: 'Cash at start', num: true, get: (s) => s.result.upfrontCash, show: money },
    { key: 'co2', label: 'Lifecycle CO2e (t)', num: true, get: (s) => s.result.co2.total, show: n1 },
    { key: 'inc', label: 'Incentives and tax savings', num: true, get: (s) => (dash(s) ? 0 : incentiveTotal(s.result)), show: (v, s) => (dash(s) ? '-' : money(v)) },
    {
      key: 'be',
      label: 'Gas price to break even ($/gal)',
      num: true,
      get: (s) => {
        if (dash(s) || !hasCar()) return -1;
        const p = breakEvenGasPrice(state.g, s.vehicle, s.spec.financing, lx());
        return p === null ? 999 : p;
      },
      show: (v, s) => (dash(s) || !hasCar() ? '-' : Number(v) >= 999 ? 'none below $40' : Number(v) === 0 ? 'wins at $0' : num(Number(v), 2))
    },
    { key: 'payback', label: 'Payback vs keeping', num: false, get: (s, k) => paybackText(s, k), show: (v) => String(v) }
  ];
}

function sortedTableRows(scored: ScoredOption[], keep: ScoredOption | null): { s: ScoredOption; vals: (number | string)[] }[] {
  const cols = tableCols();
  const rows = scored.map((s) => ({ s, vals: cols.map((c) => c.get(s, keep)) }));
  const idx = Math.max(0, cols.findIndex((c) => c.key === state.sortKey));
  const col = cols[idx];
  rows.sort((a, b) => {
    const x = a.vals[idx];
    const y = b.vals[idx];
    const cmp = col.num ? Number(x) - Number(y) : String(x).localeCompare(String(y));
    return cmp * state.sortDir || a.s.rank - b.s.rank;
  });
  return rows;
}

function renderTable(scored: ScoredOption[], keep: ScoredOption | null): string {
  const cols = tableCols();
  const rows = sortedTableRows(scored, keep);
  const head = cols
    .map((c) => {
      const on = state.sortKey === c.key;
      const arrow = on ? (state.sortDir === 1 ? ' ▲' : ' ▼') : '';
      return `<th aria-sort="${on ? (state.sortDir === 1 ? 'ascending' : 'descending') : 'none'}"><button class="sortbtn ${on ? 'on' : ''}" data-act="sort" data-val="${c.key}">${esc(c.label)}${arrow}</button></th>`;
    })
    .join('');
  const body = rows
    .map(({ s, vals }) => `<tr class="${s.spec.financing === 'none' ? 'keeprow' : ''}" style="--c:var(--c-${colorKey(s.vehicle.id)})">${cols.map((c, i) => `<${i === 1 ? 'th scope="row"' : 'td'} class="${c.num ? 'n' : ''}">${c.show(vals[i], s)}</${i === 1 ? 'th' : 'td'}>`).join('')}</tr>`)
    .join('');
  return `<section class="panel"><div class="tbar"><h2>All options in a table</h2>
    <span><button class="btn ghost small" data-act="copytable">Copy for a spreadsheet</button> <span class="fine" id="copynote" role="status">${esc(state.copyNote)}</span></span></div>
    <p class="fine">Tap a column heading to sort. Scores are 0-100 (${scaleLabel()}). Scroll sideways for more columns.</p>
    <div class="scroll bigtable"><table class="results"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div></section>`;
}

function tableAsTsv(scored: ScoredOption[], keep: ScoredOption | null): string {
  const cols = tableCols();
  const rows = sortedTableRows(scored, keep);
  const plain = (c: Col, v: number | string, s: ScoredOption): string => c.show(v, s).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  return [cols.map((c) => c.label).join('\t'), ...rows.map(({ s, vals }) => cols.map((c, i) => plain(c, vals[i], s)).join('\t'))].join('\n');
}

function renderLive(scored: ScoredOption[]): void {
  const sorted = [...scored].sort((a, b) => a.rank - b.rank);
  const keep = keepOf(scored);
  const top = sorted.slice(0, 4);
  const chips = top
    .map((s) => `<span class="lchip" style="--c:var(--c-${colorKey(s.vehicle.id)})"><b>#${s.rank}</b> ${esc(optionName(s.spec))} <em>${num(s.overall)}</em></span>`)
    .join('');
  const keepChip = !keep || top.includes(keep) ? '' : `<span class="lchip" style="--c:var(--c-lx)"><b>#${keep.rank}</b> ${esc(optionName(keep.spec))} <em>${num(keep.overall)}</em></span>`;
  const keepCost = keep ? `<span class="lcost">Keep: ${usd(keep.result.netCostNPV)} net cost (PV)</span>` : '';
  $('livebar').innerHTML = `<span class="llabel">Live results</span>${chips}${keepChip}${keepCost}`;
}

function renderResults(): void {
  const scored = scoreOptions(state.g, state.vehicles, visibleOptions(), scoring());
  const keep = keepOf(scored);
  const mode = MODES.find((m) => m.id === state.mode) as (typeof MODES)[number];
  const tabBody = state.tab === 'planet' ? planetTable(scored, keep) : state.tab === 'people' ? peopleTable(scored) : profitTable(scored, keep);
  const tabBtn = (t: Tab, label: string) => `<button role="tab" class="tab ${state.tab === t ? 'on' : ''}" aria-selected="${state.tab === t}" data-act="tab" data-val="${t}">${label}</button>`;
  $('res-verdict').innerHTML = `<section class="panel verdict"><h2>What the numbers say</h2>${buildVerdict(scored)}
    <p class="fine">Scoring: <b>${mode.label}</b>. ${mode.blurb} Scale: ${scaleBlurb()}
    <button class="linkbtn" data-act="jump">Edit assumptions</button></p>
    <div class="vgo"><span class="fine">See every option as:</span>
      <button class="chip ${state.resultsView === 'cards' ? 'on' : ''}" data-act="resviewgo" data-val="cards">Cards</button>
      <button class="chip ${state.resultsView === 'table' ? 'on' : ''}" data-act="resviewgo" data-val="table">Table</button></div></section>`;
  const viewBtn = (v: 'cards' | 'table', label: string) => `<button class="chip ${state.resultsView === v ? 'on' : ''}" aria-pressed="${state.resultsView === v}" data-act="resview" data-val="${v}">${label}</button>`;
  const resultsBody =
    state.resultsView === 'table'
      ? renderTable(scored, keep)
      : `<section class="cards" aria-label="Ranked options">${renderCards(scored, keep)}</section>`;
  $('res-main').innerHTML = `
  <div class="viewtoggle"><h3>Show results as</h3><div class="chips">${viewBtn('cards', 'Cards')}${viewBtn('table', 'Table')}</div></div>
  ${resultsBody}
  <section class="panel">${renderBars(scored)}</section>
  <section class="panel"><h2>Behind the scores</h2>
    <div class="tabs" role="tablist">${tabBtn('planet', 'Planet')}${tabBtn('people', 'People')}${tabBtn('profit', 'Profit')}</div>
    ${tabBody}</section>
  <section class="panel"><h2>Does the winner hold up?</h2>${renderSens()}</section>`;
  renderLive(scored);
}

/* ----------------------------- controls ----------------------------- */

function chip(act: string, val: string, label: string, sub = '', on = false): string {
  return `<button class="chip ${on ? 'on' : ''}" aria-pressed="${on}" data-act="${act}" data-val="${val}">${label}${sub ? `<small>${sub}</small>` : ''}</button>`;
}

function renderControls(): void {
  const w = state.weights;
  const pct = (x: number) => Math.round(x * 100);
  const sum = w.planet + w.people + w.profit || 1;
  $('designbar').innerHTML = `<div class="designrow"><h3>Design</h3><div class="chips">${THEMES.map((t) => chip('theme', t.id, t.label, '', state.theme === t.id)).join('')}</div></div>`;
  const mode = MODES.find((m) => m.id === state.mode) as (typeof MODES)[number];
  const presetLabel = PRESET_LABELS[state.preset] ?? 'Custom weights';
  $('ctl-summary').textContent = `${mode.label} · ${scaleLabel()} · ${presetLabel} · ${state.aggregation === 'average' ? 'average' : 'weakest link'}`;
  $('ctl-body').innerHTML = `
  <div class="group"><h3>Scoring method</h3><div class="chips">${MODES.map((m) => chip('mode', m.id, m.label, '', state.mode === m.id)).join('')}</div></div>
  <div class="group"><h3>Scale (what 50 means)</h3><div class="chips">${chip('scale', 'benchmark', 'Typical new car', 'AAA / EPA averages', state.scale === 'benchmark')}${chip('scale', 'anchored', 'Keeping your car', 'it always scores 50', state.scale === 'anchored')}${chip('scale', 'relative', 'The field', 'best = 100', state.scale === 'relative')}</div></div>
  <div class="group"><h3>Combine pillars</h3><div class="chips">${chip('agg', 'average', 'Weighted average', '', state.aggregation === 'average')}${chip('agg', 'weakest', 'Weakest link', 'no pillar sacrificed', state.aggregation === 'weakest')}</div></div>
  <div class="group"><h3>Pillar weighting</h3><div class="chips">${Object.keys(WEIGHT_PRESETS).map((p) => chip('preset', p, PRESET_LABELS[p], '', state.preset === p)).join('')}</div>
    <div class="sliders">
      ${(['planet', 'people', 'profit'] as const).map((k) => `<label>${k[0].toUpperCase() + k.slice(1)} <input type="range" min="0" max="100" step="5" value="${pct(w[k] / sum)}" data-wslider="${k}"><output id="wo-${k}">${pct(w[k] / sum)}%</output></label>`).join('')}
    </div></div>
  <div class="group"><h3>Financing shown</h3><div class="chips">${chip('view', 'both', 'Loan + lease', '', state.view === 'both')}${chip('view', 'loan', 'Loan only', '', state.view === 'loan')}${chip('view', 'lease', 'Lease only', '', state.view === 'lease')}</div></div>`;
}


/* ------------------------------ your decision (path) ------------------------------ */

const PATHS: { id: Disposal; label: string; sub: string }[] = [
  { id: 'sell', label: 'Sell it, then buy', sub: 'private sale' },
  { id: 'trade', label: 'Trade it in', sub: 'dealer offer' },
  { id: 'none', label: 'Just buy', sub: 'no car to sell' }
];

function pathBlurb(): string {
  const d = state.g.disposal;
  if (d === 'sell') return `You sell ${esc(carNow())} yourself (about ${usd(lx().price)}) and put that toward the new car. You can also compare with keeping it.`;
  if (d === 'trade')
    return `The dealer takes ${esc(carNow())} off the price. The offer is assumed ${num(state.g.tradeInDiscount * 100, 0)}% below its private-sale value (about ${usd(lx().price * (1 - state.g.tradeInDiscount))}); edit that under Key drivers. <a href="${SRC.caTradeIn.url}" target="_blank" rel="noopener">California charges sales tax on the full price</a>, so a trade-in saves no tax here. You can also compare with keeping it.`;
  return 'You are buying without selling or trading a car in, so there is no keep-it option and no sale money. Cars are compared with each other and against a typical new car.';
}

function renderPath(): void {
  const presetChips = CAR_PRESETS.map((p) => chip('carpreset', p.id, p.label, p.blurb, state.carPreset === p.id)).join('');
  const nameBox = `<label class="fine" for="in-carname">Name of your current car</label> <input id="in-carname" class="vname" type="text" maxlength="40" value="${esc(lx().short)}" data-vname="lx" aria-label="Name of your current car">`;
  $('path').innerHTML = `<h2>Your decision</h2>
  <p class="fine">What are you doing with the car you have now? Then pick the cars in play below, or just describe it to the analyst above.</p>
  <div class="chips" role="group" aria-label="What happens to your current car">${PATHS.map((p) => chip('path', p.id, p.label, p.sub, state.g.disposal === p.id)).join('')}${analyst.sample ? '<button class="chip" data-act="askanalyst">Not sure<small>ask the analyst</small></button>' : ''}</div>
  <p class="fine" id="path-blurb">${pathBlurb()}</p>
  ${hasCar() ? `<div class="pgroup"><h3>The car you have now</h3><div class="chips" role="group" aria-label="Starting point for your current car">${presetChips}</div><p class="fine">Pick a starting point, then edit its value, mpg and costs under Cars in the assumptions. Only the Lexus values are sourced; the others are placeholders. ${nameBox}</p></div>` : ''}`;
}

/* ------------------------------ car picker ------------------------------ */

function pickChip(v: Vehicle, custom: boolean): string {
  const on = state.selected.includes(v.id);
  const lease = v.lease ? 'loan + lease' : 'loan only';
  return `<span class="pwrap"><button class="chip ${on ? 'on' : ''}" aria-pressed="${on}" data-act="pick" data-val="${v.id}">${esc(v.short)}<small>${usd(v.price)} · ${lease}</small></button>${custom ? `<button class="x" data-act="rmcustom" data-val="${v.id}" aria-label="Remove ${esc(v.short)}" title="Remove">×</button>` : ''}</span>`;
}

function renderPicker(): void {
  const groupOf = (g: string) => state.vehicles.filter((v) => !v.owned && state.groups[v.id] === g);
  const section = (title: string, list: Vehicle[], custom = false) =>
    list.length ? `<div class="pgroup"><h3>${title}</h3><div class="chips">${list.map((v) => pickChip(v, custom)).join('')}</div></div>` : '';
  $('picker').innerHTML = `<h2>Cars to compare</h2>
  <p class="fine">${hasCar() ? 'Keeping your current car is always the baseline.' : 'There is no keep option because you are just buying.'} Pick up to ${MAX_SELECTED} cars (${state.selected.length} selected). Every option gets a loan, and a lease where terms are known; add lease terms in the assumptions below.</p>
  ${state.notice ? `<p class="notice" role="status">${esc(state.notice)}</p>` : ''}
  <div class="pgrid">
    ${section('Electric', groupOf('ev'))}
    ${section('Hybrid', groupOf('hybrid'))}
    ${section('Gas', groupOf('gas'))}
    ${section('Your own', groupOf('custom'), true)}
  </div>
  <div class="padd"><span class="padd-label">Add your own car:</span>
    <button class="btn ghost" data-act="addcustom" data-val="ice">+ Gas car</button>
    <button class="btn ghost" data-act="addcustom" data-val="hybrid">+ Hybrid</button>
    <button class="btn ghost" data-act="addcustom" data-val="ev">+ EV</button>
    <button class="linkbtn" data-act="clearpicks">Clear selection</button></div>`;
}

/* --------------------------- assumptions --------------------------- */

function badge(meta: ParamMeta): string {
  return `<span class="badge ${meta.kind}">${meta.kind === 'sourced' ? 'Sourced' : 'My assumption'}</span>`;
}

function srcLinks(keys?: string[]): string {
  if (!keys?.length) return '';
  return `<span class="src">${keys.map((k) => `<a href="${SRC[k].url}" target="_blank" rel="noopener">${esc(SRC[k].label)}</a>`).join('')}</span>`;
}

function fmtDefault(f: Field): string {
  const d = defaultOf(f);
  if (f.meta.bool) return d ? 'Yes' : 'No';
  return f.meta.pct ? `${num(d * 100, 2)}%` : `${num(d, d % 1 === 0 ? 0 : 2)}`;
}

function control(f: Field, compact = false): string {
  const id = fieldId(f);
  const val = readField(f);
  if (f.meta.bool) {
    return `<select id="in-${id}" data-field="${id}" aria-label="${esc(f.meta.label)}"><option value="1" ${val ? 'selected' : ''}>Yes</option><option value="0" ${val ? '' : 'selected'}>No</option></select>`;
  }
  const scale = f.meta.pct ? 100 : 1;
  const shown = Math.round(val * scale * 10000) / 10000;
  const unit = f.meta.pct ? '%' : f.meta.unit;
  return `<span class="iwrap ${compact ? 'compact' : ''}"><input id="in-${id}" type="number" inputmode="decimal" min="${f.meta.min * scale}" max="${f.meta.max * scale}" step="${f.meta.step * scale}" value="${shown}" data-field="${id}" aria-label="${esc(f.meta.label)}"><em>${esc(unit)}</em></span>`;
}

function resetBtn(f: Field): string {
  return `<button class="rst" data-act="resetfield" data-val="${fieldId(f)}" hidden title="Reset to default">Reset (default ${fmtDefault(f)})</button>`;
}

function gridRow(key: string, sec: string): string {
  const f: Field = { sec, scope: 'g', sub: '', key, meta: GLOBAL_META[key] };
  fieldRegistry.set(fieldId(f), f);
  return `<div class="irow" data-wrap="${fieldId(f)}"><label for="in-${fieldId(f)}">${esc(f.meta.label)} ${badge(f.meta)} <span class="edited" hidden>edited</span></label>
    ${control(f)}${resetBtn(f)}
    ${f.meta.note ? `<span class="note">${esc(f.meta.note)}</span>` : ''}${srcLinks(f.meta.src)}</div>`;
}

const CONFIRM_KEYS = ['firstTimeZev', 'cc4a', 'loanInterestDeduction', 'jointFiling', 'magi', 'marginalTaxRate'];
const driverKeys = (): string[] => ['horizonYears', 'milesPerYear', 'gasPrice', 'elecPrice', 'discountRate', ...(state.g.disposal === 'trade' ? ['tradeInDiscount'] : []), ...(hasCar() ? ['lxLeakage'] : [])];
const confirmKeys = (): string[] => CONFIRM_KEYS.filter((k) => hasCar() || k !== 'cc4a');
const EMISSION_KEYS = ['gridKgPerKwh', 'gasKgPerGal', 'gasUpstreamKgPerGal', 'evRealWorldPenalty', 'vehicleLifeYears'];
const OTHER_KEYS = ['gasEscalation', 'elecEscalation', 'salesTax', 'chargerCost', 'chargerRebate', 'cc4aEvGrant', 'cc4aHybridGrant', 'cc4aCharger', 'deductionMonths'];

const MATRIX_ROWS: { key: string; section: string }[] = [
  { key: 'price', section: 'Price and efficiency' },
  { key: 'mpg', section: '' },
  { key: 'kwhPer100mi', section: '' },
  { key: 'realWorldAdj', section: '' },
  { key: 'maintPerMile', section: 'Running costs' },
  { key: 'insurancePerYear', section: '' },
  { key: 'annualValueLoss', section: 'Value and footprint' },
  { key: 'depreciation5yr', section: '' },
  { key: 'embodiedT', section: '' },
  { key: 'usAssembled', section: 'Incentives' },
  { key: 'zevRebate', section: '' },
  { key: 'apr', section: 'Loan' },
  { key: 'termMonths', section: '' },
  { key: 'down', section: '' },
  { key: 'monthly', section: 'Lease' },
  { key: 'dueAtSigning', section: '' },
  { key: 'leaseTerm', section: '' }
];
const SUB_OF: Record<string, { sub: '' | 'loan' | 'lease'; key: string }> = {
  apr: { sub: 'loan', key: 'apr' },
  termMonths: { sub: 'loan', key: 'termMonths' },
  down: { sub: 'loan', key: 'down' },
  monthly: { sub: 'lease', key: 'monthly' },
  dueAtSigning: { sub: 'lease', key: 'dueAtSigning' },
  leaseTerm: { sub: 'lease', key: 'termMonths' }
};

function matrixCell(v: Vehicle, rowKey: string): string {
  const meta = state.meta[v.id]?.[rowKey];
  if (!meta) return '<td class="na">-</td>';
  const map = SUB_OF[rowKey] ?? { sub: '' as const, key: rowKey };
  if (map.sub === 'lease' && !v.lease) {
    return rowKey === 'monthly' ? `<td class="na"><button class="btn ghost small" data-act="addlease" data-val="${v.id}">+ Add lease</button></td>` : '<td class="na">-</td>';
  }
  const f: Field = { sec: 'cars', scope: v.id, sub: map.sub, key: map.key, meta };
  fieldRegistry.set(fieldId(f), f);
  return `<td data-wrap="${fieldId(f)}">${control(f, true)}${resetBtn(f)}</td>`;
}

function renderMatrix(): string {
  const vs = activeVehicles();
  const head = vs
    .map((v) => {
      const nameCell = v.id.startsWith('custom') || v.owned ? `<input class="vname" type="text" value="${esc(v.short)}" data-vname="${v.id}" aria-label="Name of ${esc(v.short)}">` : esc(v.short);
      return `<th class="vh" style="--c:var(--c-${colorKey(v.id)})">${nameCell}<small>${kindLabel(v)}${v.owned ? ' · yours' : ''}</small></th>`;
    })
    .join('');
  let lastSection = '';
  const body = MATRIX_ROWS.map((r) => {
    const label = vs.map((v) => state.meta[v.id]?.[r.key]).find(Boolean);
    if (!label) return '';
    const sec = r.section && r.section !== lastSection ? `<tr class="sec"><th colspan="${vs.length + 1}">${r.section}</th></tr>` : '';
    if (r.section) lastSection = r.section;
    const unit = label.pct ? '%' : label.unit;
    return `${sec}<tr><th scope="row">${esc(r.key === 'termMonths' ? 'Loan term' : r.key === 'leaseTerm' ? 'Lease term' : label.label.replace('Price incl. destination', 'Price').replace('Sale value today', 'Price / sale value'))}<small>${esc(unit)}</small></th>${vs.map((v) => matrixCell(v, r.key)).join('')}</tr>`;
  }).join('');
  return `<div class="scroll matrix"><table><thead><tr><th>Input</th>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function renderNotes(): string {
  return activeVehicles()
    .map((v) => {
      const meta = state.meta[v.id] ?? {};
      const items = Object.keys(meta)
        .filter((k) => meta[k].note || meta[k].src?.length)
        .map((k) => `<li><b>${esc(meta[k].label)}</b> ${badge(meta[k])}${meta[k].note ? ` ${esc(meta[k].note as string)}` : ''}${srcLinks(meta[k].src)}</li>`)
        .join('');
      return `<details class="veh" style="--c:var(--c-${colorKey(v.id)})"><summary><i class="dot"></i>${esc(v.name)}</summary><ul class="notes">${items || '<li>No notes yet. Values are your own.</li>'}</ul></details>`;
    })
    .join('');
}

function section(id: string, title: string, inner: string, cls = ''): string {
  return `<details class="asec ${cls}" data-sec="${id}" ${state.secOpen[id] ? 'open' : ''}><summary><span>${title}</span><span class="secedit" data-secedit="${id}"></span></summary><div class="secbody">${inner}</div></details>`;
}

function renderAssumptions(): void {
  fieldRegistry.clear();
  const rows = (keys: string[], sec: string) => keys.map((k) => gridRow(k, sec)).join('');
  const embodied = `<div class="irow"><label for="in-embodied">Manufacturing emissions counted <span class="badge assumption">My assumption</span></label>
    <select id="in-embodied" data-embodied><option value="allocated" ${state.g.embodiedMode === 'allocated' ? 'selected' : ''}>Shared over vehicle life (fair share)</option><option value="full" ${state.g.embodiedMode === 'full' ? 'selected' : ''}>100% charged to me (strict)</option></select>
    <span class="note">Strict mode treats the new car's whole factory footprint as caused by your purchase. Fair share assumes the car will serve other owners later.</span>
    <span class="src"><a href="${SRC.lcaLowcvp.url}" target="_blank" rel="noopener">${esc(SRC.lcaLowcvp.label)}</a></span></div>`;
  $('assump').innerHTML = `
  <div class="ahead"><div><h2>Assumptions: see and edit everything</h2>
    <p class="fine">Every number below drives the results. <span class="badge sourced">Sourced</span> values link to their source; <span class="badge assumption">My assumption</span> values are my estimates. Edited values are highlighted and can be reset. <b id="edcount">No values edited</b>.</p></div>
    <div class="abtns"><button class="btn ghost small" data-act="collapseall">Collapse all</button><button class="btn ghost small" data-act="expandall">Expand all</button><button class="btn small" data-act="reset">Reset all to defaults</button></div></div>
  <div id="livebar" class="livebar" aria-live="polite"></div>

  ${section('confirm', 'Please confirm: these change the answer', `<p class="fine">I used placeholders where I did not know your situation. Set each one to match yours.</p><div class="igrid">${rows(confirmKeys(), 'confirm')}</div>`, 'confirm')}
  ${section('drivers', 'Key drivers', `<div class="igrid">${rows(driverKeys(), 'drivers')}</div>`)}
  ${section(
    'cars',
    'Cars: compare and edit every input',
    `<p class="fine">One column per car. Scroll sideways for more. Sources and the reasoning for each value are listed under the table.</p>${renderMatrix()}
    <details class="veh"><summary><i class="dot g"></i>Why each car input has its value (notes and sources)</summary><div class="notes-wrap">${renderNotes()}</div></details>`
  )}
  ${section('emissions', 'Emissions', `<div class="igrid">${rows(EMISSION_KEYS, 'emissions')}${embodied}</div>`)}
  ${section('other', 'Escalation, taxes, charging and incentive amounts', `<div class="igrid">${rows(OTHER_KEYS, 'other')}</div>`)}
  <p><button class="btn" data-act="reset">Reset all to defaults</button></p>`;
  refreshEdited();
  const scored = scoreOptions(state.g, state.vehicles, visibleOptions(), scoring());
  renderLive(scored);
}

function refreshEdited(): void {
  let count = 0;
  const perSec: Record<string, number> = {};
  fieldRegistry.forEach((f, id) => {
    const wrap = document.querySelector(`[data-wrap="${id}"]`);
    if (!wrap) return;
    const edited = isEdited(f);
    if (edited) {
      count++;
      perSec[f.sec ?? ''] = (perSec[f.sec ?? ''] ?? 0) + 1;
    }
    wrap.classList.toggle('is-edited', edited);
    const tag = wrap.querySelector('.edited');
    if (tag) (tag as HTMLElement).hidden = !edited;
    const btn = wrap.querySelector('.rst');
    if (btn) (btn as HTMLElement).hidden = !edited;
  });
  document.querySelectorAll('[data-secedit]').forEach((el) => {
    const n = perSec[(el as HTMLElement).dataset.secedit as string] ?? 0;
    el.textContent = n ? `${n} edited` : '';
  });
  const el = document.getElementById('edcount');
  if (el) el.textContent = count === 0 ? 'No values edited' : `${count} value${count === 1 ? '' : 's'} edited`;
}

function renderSources(): void {
  const items = Object.values(SRC)
    .map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`)
    .join('');
  $('sources').innerHTML = `<h2>Sources</h2><p class="fine">Retrieved November 1, 2026. Prices, lease offers, rates and incentive funding change often; confirm before acting.</p><ul class="srclist">${items}</ul>
  <h2>What this does not model</h2><ul class="srclist plain">${LIMITATIONS.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`;
}


/* ------------------------------ AI analyst ------------------------------ */

interface SampleApi {
  json: (input: string, opts?: { signal?: AbortSignal; cache?: boolean }) => Promise<unknown>;
}

const analyst = {
  sample: null as SampleApi | null,
  text: '',
  busy: false,
  ctrl: null as AbortController | null,
  answer: null as AnalystAnswer | null,
  status: '',
  statusErr: false,
  applied: new Set<string>(),
  history: [] as { user: string; summary: string }[]
};

const AN_EXAMPLES = [
  'I drive about 40 miles a day, mostly freeway, and I can charge at home on solar.',
  'I tow a small trailer and have two kids. I want something efficient but cannot risk running out of range.',
  'I am not sure an EV is worth it. What would make keeping my current car the right call?',
  'Money is tight. I want the lowest monthly cost, even if it is less green.',
  'I drive a 2014 Subaru Outback worth about $9,000 and might trade it in for a hybrid. Which is better, trading in or selling it myself?',
  'I do not own a car right now and need one. Compare a few for me.'
];

const toShown = (f: FieldInfo, v: number): number => (f.kind === 'fraction' ? Math.round(v * 1e6) / 1e4 : Math.round(v * 1e4) / 1e4);
const fromShown = (f: FieldInfo, v: number): number => (f.kind === 'fraction' ? v / 100 : v);
const fmtField = (f: FieldInfo, v: number): string => (f.kind === 'yesno' ? (v ? 'Yes' : 'No') : f.kind === 'fraction' ? `${num(v * 100, 2)}%` : `${num(v, v % 1 === 0 ? 0 : 2)}${f.unit ? ' ' + f.unit : ''}`);

/** Snapshot of every input currently on screen, in stored units, for the analyst. */
function analystFields(): Map<string, FieldInfo> {
  const out = new Map<string, FieldInfo>();
  fieldRegistry.forEach((f, id) => {
    const v = f.scope === 'g' ? undefined : state.vehicles.find((x) => x.id === f.scope);
    const where = f.sub === 'loan' ? ' (loan)' : f.sub === 'lease' ? ' (lease)' : '';
    out.set(id, {
      id,
      label: `${v ? v.short + ': ' : ''}${f.meta.label}${where}`,
      unit: f.meta.pct ? '%' : f.meta.unit,
      value: readField(f),
      defaultValue: defaultOf(f),
      min: f.meta.bool ? 0 : f.meta.min,
      max: f.meta.bool ? 1 : f.meta.max,
      kind: f.meta.bool ? 'yesno' : f.meta.pct ? 'fraction' : 'number',
      note: f.meta.note ? f.meta.note.slice(0, 140) : undefined
    });
  });
  return out;
}

function addableCars(): Vehicle[] {
  return state.vehicles.filter((v) => !v.owned && state.groups[v.id] !== 'custom' && !state.selected.includes(v.id));
}

function analystPrompt(task: 'guide' | 'explain'): string {
  const opts = visibleOptions();
  const scored = scoreOptions(state.g, state.vehicles, opts, scoring());
  const keep = keepOf(scored);
  const results: ResultRow[] = [...scored]
    .sort((a, b) => a.rank - b.rank)
    .map((s) => {
      const none = s.spec.financing === 'none';
      const be = none || !hasCar() ? null : breakEvenGasPrice(state.g, s.vehicle, s.spec.financing, lx());
      const pb = none || !keep ? null : paybackYear(s.result, keep.result);
      return {
        rank: s.rank,
        option: optionName(s.spec),
        type: kindLabel(s.vehicle),
        financing: tagFor(s.spec),
        overall: Math.round(s.overall * 10) / 10,
        planet: Math.round(s.pillars.planet),
        people: Math.round(s.pillars.people),
        profit: Math.round(s.pillars.profit),
        netCostPV: Math.round(s.result.netCostNPV),
        co2eTonnes: Math.round(s.result.co2.total * 10) / 10,
        monthlyPayment: none ? null : Math.round(s.result.monthlyPayment),
        incentivesAndTaxSavings: none ? null : Math.round(incentiveTotal(s.result)),
        breakEvenGasPrice: none ? '-' : be === null ? 'none below $40/gal' : `$${num(be, 2)}/gal`,
        payback: none ? '-' : pb === null ? `not within ${state.g.horizonYears} yrs` : `year ${pb}`
      };
    });
  const cars: CarInfo[] = state.vehicles
    .filter((v) => !v.owned)
    .map((v) => ({ id: v.id, name: v.name, kind: v.kind, price: Math.round(v.price), selected: state.selected.includes(v.id), group: state.groups[v.id] }));
  const lead = task === 'explain' ? 'TASK: Explain these results in plain language and say what would change the outcome. Ask for more inputs only if essential.\n' : 'TASK: Work out which inputs matter for this person and suggest values; also say how the answer could change.\n';
  return buildPrompt({
    scenario: lead + analyst.text,
    history: analyst.history,
    fields: [...analystFields().values()],
    results,
    sensitivity: sensitivityRows(state.g, state.vehicles, opts, scoring(), optionName),
    cars,
    currentCar: hasCar() ? { name: lx().short, kind: lx().kind, saleValue: Math.round(lx().price) } : null,
    selectedCars: state.selected.map((id) => vehicle(id)?.short).filter(Boolean),
    settings: { path: state.g.disposal, mode: state.mode, scale: state.scale, aggregation: state.aggregation, preset: state.preset, view: state.view, horizonYears: state.g.horizonYears }
  });
}

function setAnStatus(msg: string, err = false): void {
  analyst.status = msg;
  analyst.statusErr = err;
  const el = document.getElementById('an-status');
  if (el) {
    el.textContent = msg;
    el.classList.toggle('err', err);
  }
}

async function runAnalyst(task: 'guide' | 'explain'): Promise<void> {
  if (!analyst.sample || analyst.busy) return;
  const ta = document.getElementById('an-text') as HTMLTextAreaElement | null;
  analyst.text = ta ? ta.value.trim().slice(0, 1500) : analyst.text;
  if (task === 'guide' && !analyst.text) {
    setAnStatus('Describe your situation first, or choose "Explain these results".', true);
    return;
  }
  analyst.busy = true;
  analyst.ctrl = new AbortController();
  setAnStatus('Thinking…');
  syncAnButtons();
  try {
    const raw = await analyst.sample.json(analystPrompt(task), { signal: analyst.ctrl.signal, cache: false });
    const ans = sanitizeAnswer(raw, { fields: analystFields(), addableCarIds: new Set(addableCars().map((v) => v.id)), removableCarIds: new Set(state.selected) });
    if (!hasContent(ans)) {
      analyst.answer = null;
      setAnStatus('The analyst did not return anything usable. Try rewording, or ask again.', true);
    } else {
      analyst.answer = ans;
      analyst.applied = new Set();
      analyst.history.push({ user: analyst.text || 'Explain the results', summary: ans.summary });
      setAnStatus('');
    }
  } catch (e) {
    const err = e as { name?: string; code?: string; message?: string };
    if (err?.name === 'AbortError' || err?.code === 'aborted') setAnStatus('Stopped.');
    else if (err?.code === 'rate_limited') setAnStatus('You have hit a usage limit for now. Try again in a little while.', true);
    else if (err?.code === 'not_granted') {
      analyst.sample = null;
      setAnStatus('', false);
      renderAnalyst();
      return;
    } else setAnStatus('The analyst could not answer just now. Your inputs are unchanged; try again.', true);
  } finally {
    analyst.busy = false;
    analyst.ctrl = null;
  }
  renderAnalystOut();
  syncAnButtons();
}

function syncAnButtons(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-act="an-analyze"],[data-act="an-explain"]').forEach((b) => (b.disabled = analyst.busy));
  const stop = document.querySelector<HTMLElement>('[data-act="an-stop"]');
  if (stop) stop.hidden = !analyst.busy;
}

function renderAnalyst(): void {
  const host = $('analyst');
  if (!analyst.sample) {
    host.hidden = true;
    return;
  }
  host.hidden = false;
  host.innerHTML = `<h2>Ask the analyst</h2>
  <p class="fine">Describe your situation in your own words. The analyst suggests which inputs to set (and to what), can add cars worth comparing, and explains what would change the result. It only reads the numbers on this page, and nothing changes until you tap Apply. Uses your Claude usage.</p>
  <label class="fine" for="an-text">Your situation</label>
  <textarea id="an-text" maxlength="1500" placeholder="e.g. I commute 40 miles a day, have solar panels, and my current car needs a $3,000 repair soon. Is it time to switch?"></textarea>
  <div class="an-examples" aria-label="Examples">${AN_EXAMPLES.map((t, i) => `<button class="chip" data-act="an-example" data-val="${i}">${esc(t)}</button>`).join('')}</div>
  <div class="an-actions"><button class="btn" data-act="an-analyze">Analyze my situation</button><button class="btn ghost" data-act="an-explain">Explain these results</button><button class="btn ghost" data-act="an-stop" hidden>Stop</button><span id="an-status" role="status" aria-live="polite"></span></div>
  <div id="an-out" class="an-out"></div>`;
  (document.getElementById('an-text') as HTMLTextAreaElement).value = analyst.text;
  setAnStatus(analyst.status, analyst.statusErr);
  renderAnalystOut();
  syncAnButtons();
}

function renderAnalystOut(): void {
  const out = document.getElementById('an-out');
  if (!out) return;
  const a = analyst.answer;
  if (!a) {
    out.innerHTML = '';
    return;
  }
  const fields = analystFields();
  const block = (title: string, inner: string) => (inner ? `<div class="an-block"><h3>${title}</h3>${inner}</div>` : '');
  const ul = (items: string[]) => (items.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '');

  const head = a.summary || a.interpretation ? `<div class="an-block"><p class="an-summary"><b>${esc(a.summary)}</b></p>${a.interpretation ? `<p>${esc(a.interpretation)}</p>` : ''}</div>` : '';

  const qs = a.questions
    .map((q, i) => {
      const f = q.field ? fields.get(q.field) : undefined;
      let ctl = '';
      if (f) {
        const start = q.value ?? f.value;
        ctl =
          f.kind === 'yesno'
            ? `<select id="an-q-${i}" aria-label="${esc(f.label)}"><option value="1" ${start ? 'selected' : ''}>Yes</option><option value="0" ${start ? '' : 'selected'}>No</option></select>`
            : `<input id="an-q-${i}" type="number" inputmode="decimal" value="${toShown(f, start)}" aria-label="${esc(f.label)}"><em class="fine">${esc(f.kind === 'fraction' ? '%' : f.unit)}</em>`;
        const done = analyst.applied.has('f:' + f.id);
        ctl += done ? ' <span class="an-done">Set</span>' : ` <button class="btn small" data-act="an-qset" data-val="${i}">Set</button>`;
      }
      return `<div class="an-q"><b>${esc(q.question)}</b>${q.why ? `<span class="an-why">${esc(q.why)}</span>` : ''}${f ? `<div class="an-row"><span class="fine">${esc(f.label)} (now ${esc(fmtField(f, f.value))}):</span>${ctl}</div>` : ''}</div>`;
    })
    .join('');

  const pending = a.suggestions.filter((s) => !analyst.applied.has('f:' + s.field));
  const sugs = a.suggestions
    .map((s, i) => {
      const f = fields.get(s.field) as FieldInfo;
      const done = analyst.applied.has('f:' + s.field);
      return `<div class="an-s"><b>${esc(f.label)}</b><span class="an-arrow">${esc(fmtField(f, f.value))} → <b>${esc(fmtField(f, s.value))}</b></span>${s.reason ? `<span class="an-why">${esc(s.reason)}</span>` : ''}<div class="an-row">${done ? '<span class="an-done">Applied</span>' : `<button class="btn small" data-act="an-apply" data-val="${i}">Apply</button>`}</div></div>`;
    })
    .join('');
  const applyAll = pending.length > 1 ? `<div class="an-row"><button class="btn small" data-act="an-applyall">Apply all ${pending.length}</button></div>` : '';

  const cars = a.addCars
    .map((c) => {
      const v = state.vehicles.find((x) => x.id === c.id);
      if (!v) return '';
      const on = state.selected.includes(c.id);
      return `<div class="an-s"><b>${esc(v.short)}</b><span class="an-why">${esc(c.reason)}</span><div class="an-row">${on ? '<span class="an-done">Added</span>' : `<button class="btn small" data-act="an-addcar" data-val="${c.id}">Add to comparison</button>`}</div></div>`;
    })
    .join('');

  const newCars = a.newCars
    .map((c, i) => {
      const done = analyst.applied.has('newcar:' + i);
      const eff = c.kind === 'ev' ? `${num(c.efficiency, 0)} kWh/100 mi` : `${num(c.efficiency, 0)} mpg`;
      return `<div class="an-s"><b>${esc(c.name)}</b><span class="an-arrow">${esc(c.kind === 'ev' ? 'EV' : c.kind === 'hybrid' ? 'Hybrid' : 'Gas')} · ${usd(c.price)} · ${esc(eff)}</span>${c.reason ? `<span class="an-why">${esc(c.reason)}</span>` : ''}<div class="an-row">${done ? '<span class="an-done">Added</span>' : `<button class="btn small" data-act="an-newcar" data-val="${i}">Add this car</button>`}</div></div>`;
    })
    .join('');
  const removes = a.removeCars
    .map((c) => {
      const v = state.vehicles.find((x) => x.id === c.id);
      if (!v) return '';
      const gone = !state.selected.includes(c.id);
      return `<div class="an-s"><b>Drop ${esc(v.short)}</b><span class="an-why">${esc(c.reason)}</span><div class="an-row">${gone ? '<span class="an-done">Removed</span>' : `<button class="btn small" data-act="an-removecar" data-val="${c.id}">Remove from comparison</button>`}</div></div>`;
    })
    .join('');
  const carName = a.currentCarName
    ? `<div class="an-s"><b>${esc(a.currentCarName)}</b><span class="an-why">Name for the car you have now. Its value, mpg and costs come from the input suggestions above.</span><div class="an-row">${analyst.applied.has('name') ? '<span class="an-done">Applied</span>' : '<button class="btn small" data-act="an-carname">Use this name</button>'}</div></div>`
    : '';

  let settings = '';
  if (a.settings) {
    const st = a.settings;
    const parts = [st.path && `path: ${PATHS.find((p) => p.id === st.path)?.label}`, st.mode && `scoring: ${MODES.find((m) => m.id === st.mode)?.label}`, st.scale && `scale: ${st.scale}`, st.preset && `weighting: ${PRESET_LABELS[st.preset]}`, st.view && `financing: ${st.view}`].filter(Boolean).join(' · ');
    settings = `<div class="an-s"><b>${esc(parts)}</b>${st.reason ? `<span class="an-why">${esc(st.reason)}</span>` : ''}<div class="an-row">${analyst.applied.has('settings') ? '<span class="an-done">Applied</span>' : '<button class="btn small" data-act="an-settings">Apply settings</button>'}</div></div>`;
  }

  const flips = a.flipFactors.length ? `<ul>${a.flipFactors.map((f) => `<li><b>${esc(f.factor)}:</b> ${esc(f.effect)}</li>`).join('')}</ul>` : '';
  out.innerHTML =
    head +
    block('Questions that would sharpen the answer', qs) +
    block('Suggested inputs', sugs + applyAll) +
    block('Your current car', carName) +
    block('Cars worth adding', cars + newCars) +
    block('Cars to drop', removes) +
    block('Suggested scoring settings', settings) +
    block('What the results mean', ul(a.explanation)) +
    block('What could change the outcome', flips) +
    block('Keep in mind', ul(a.caveats));
}

function applyAnalystField(fieldId: string, value: number): boolean {
  const f = fieldRegistry.get(fieldId);
  if (!f) return false;
  writeField(f, value);
  const input = document.getElementById(`in-${fieldId}`) as HTMLInputElement | HTMLSelectElement | null;
  if (input) input.value = String(f.meta.bool ? (value >= 0.5 ? 1 : 0) : Math.round(readField(f) * (f.meta.pct ? 100 : 1) * 10000) / 10000);
  analyst.applied.add('f:' + fieldId);
  return true;
}

function onAnalystAction(act: string, val: string): boolean {
  const a = analyst.answer;
  switch (act) {
    case 'an-example': {
      const ta = document.getElementById('an-text') as HTMLTextAreaElement;
      ta.value = AN_EXAMPLES[Number(val)] ?? '';
      ta.focus();
      return true;
    }
    case 'an-analyze':
      void runAnalyst('guide');
      return true;
    case 'an-explain':
      void runAnalyst('explain');
      return true;
    case 'an-stop':
      analyst.ctrl?.abort();
      return true;
    case 'an-apply': {
      const s = a?.suggestions[Number(val)];
      if (s && applyAnalystField(s.field, s.value)) {
        refreshEdited();
        renderResults();
        renderAnalystOut();
      }
      return true;
    }
    case 'an-applyall': {
      let n = 0;
      for (const s of a?.suggestions ?? []) if (!analyst.applied.has('f:' + s.field) && applyAnalystField(s.field, s.value)) n++;
      if (n) {
        refreshEdited();
        renderResults();
        renderAnalystOut();
        setAnStatus(`Applied ${n} input${n === 1 ? '' : 's'}. Scroll down to see the new results.`);
      }
      return true;
    }
    case 'an-qset': {
      const q = a?.questions[Number(val)];
      const f = q?.field ? analystFields().get(q.field) : undefined;
      const el = document.getElementById(`an-q-${val}`) as HTMLInputElement | HTMLSelectElement | null;
      if (!q || !f || !el || el.value.trim() === '') return true;
      const n = parseFloat(el.value);
      if (!Number.isFinite(n)) return true;
      if (applyAnalystField(f.id, f.kind === 'yesno' ? n : fromShown(f, n))) {
        refreshEdited();
        renderResults();
        renderAnalystOut();
      }
      return true;
    }
    case 'an-addcar': {
      if (state.selected.includes(val)) return true;
      if (state.selected.length >= MAX_SELECTED) {
        state.notice = `Pick up to ${MAX_SELECTED} cars. Remove one first.`;
        setAnStatus(state.notice, true);
        renderPicker();
        return true;
      }
      state.selected.push(val);
      state.notice = '';
      refreshAll();
      renderAnalystOut();
      return true;
    }
    case 'an-newcar': {
      const nc = a?.newCars[Number(val)];
      if (!nc || analyst.applied.has('newcar:' + val)) return true;
      if (state.selected.length >= MAX_SELECTED) {
        state.notice = `Pick up to ${MAX_SELECTED} cars. Remove one first.`;
        setAnStatus(state.notice, true);
        renderPicker();
        return true;
      }
      state.customCount += 1;
      const d = makeCustomVehicle(nc.kind, state.customCount);
      d.vehicle.name = nc.name;
      d.vehicle.short = nc.name;
      d.vehicle.price = nc.price;
      if (nc.kind === 'ev') d.vehicle.kwhPer100mi = nc.efficiency;
      else d.vehicle.mpg = nc.efficiency;
      if (d.vehicle.loan) d.vehicle.loan.down = Math.round((nc.price * 0.1) / 500) * 500;
      state.vehicles.push(clone(d.vehicle));
      state.defaults.push(clone(d.vehicle));
      state.meta[d.vehicle.id] = d.meta;
      state.ratingNotes[d.vehicle.id] = {};
      state.groups[d.vehicle.id] = 'custom';
      state.selected.push(d.vehicle.id);
      state.notice = '';
      analyst.applied.add('newcar:' + val);
      refreshAll();
      renderAnalystOut();
      return true;
    }
    case 'an-removecar': {
      state.selected = state.selected.filter((id) => id !== val);
      refreshAll();
      renderAnalystOut();
      return true;
    }
    case 'an-carname': {
      const name = a?.currentCarName;
      if (!name) return true;
      state.vehicles = state.vehicles.map((v) => (v.owned ? { ...v, name, short: name } : v));
      state.defaults = state.defaults.map((v) => (v.owned ? { ...v, name, short: name } : v));
      analyst.applied.add('name');
      refreshAll();
      renderAnalystOut();
      return true;
    }
    case 'an-settings': {
      const st = a?.settings;
      if (!st) return true;
      if (st.path) state.g.disposal = st.path;
      if (st.mode) state.mode = st.mode;
      if (st.scale) state.scale = st.scale;
      if (st.preset && WEIGHT_PRESETS[st.preset]) {
        state.preset = st.preset;
        state.weights = { ...WEIGHT_PRESETS[st.preset] };
      }
      if (st.view) state.view = st.view;
      analyst.applied.add('settings');
      renderControls();
      refreshAll();
      renderAnalystOut();
      return true;
    }
    default:
      return false;
  }
}

async function initAnalyst(): Promise<void> {
  try {
    const c = (window as unknown as { claude?: { use?: (n: string) => Promise<SampleApi | null> } }).claude;
    analyst.sample = c?.use ? await c.use('sample') : null;
  } catch {
    analyst.sample = null;
  }
  renderAnalyst();
}

/* ------------------------------ events ------------------------------ */

function applyTheme(): void {
  document.body.setAttribute('data-theme', state.theme);
}

function refreshAll(): void {
  renderPath();
  renderPicker();
  renderAssumptions();
  renderResults();
}

function onAction(act: string, val: string): void {
  if (act.startsWith('an-')) {
    onAnalystAction(act, val);
    return;
  }
  switch (act) {
    case 'theme':
      state.theme = val as Theme;
      safeStore('tbl-theme', val);
      applyTheme();
      renderControls();
      return;
    case 'mode':
      state.mode = val as ScoringMode;
      renderControls();
      break;
    case 'scale':
      state.scale = val as ScaleMode;
      renderControls();
      break;
    case 'agg':
      state.aggregation = val as Aggregation;
      renderControls();
      break;
    case 'preset':
      state.preset = val;
      state.weights = { ...WEIGHT_PRESETS[val] };
      renderControls();
      break;
    case 'view':
      state.view = val as View;
      renderControls();
      break;
    case 'path':
      state.g.disposal = val as Disposal;
      state.notice = '';
      refreshAll();
      return;
    case 'carpreset': {
      const c = currentCarFromPreset(val);
      state.vehicles = state.vehicles.map((v) => (v.owned ? clone(c.vehicle) : v));
      state.defaults = state.defaults.map((v) => (v.owned ? clone(c.vehicle) : v));
      state.meta.lx = c.meta;
      state.ratingNotes.lx = c.ratingNotes;
      state.carPreset = val;
      refreshAll();
      return;
    }
    case 'askanalyst':
      document.getElementById('analyst')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      (document.getElementById('an-text') as HTMLTextAreaElement | null)?.focus();
      return;
    case 'tab':
      state.tab = val as Tab;
      break;
    case 'showall':
      state.showAll = !state.showAll;
      break;
    case 'collapseall':
    case 'expandall': {
      const open = act === 'expandall';
      for (const k of Object.keys(state.secOpen)) state.secOpen[k] = open;
      document.querySelectorAll('details.asec').forEach((d) => ((d as HTMLDetailsElement).open = open));
      return;
    }
    case 'resview':
      state.resultsView = val as 'cards' | 'table';
      break;
    case 'resviewgo':
      state.resultsView = val as 'cards' | 'table';
      renderResults();
      document.getElementById('res-main')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    case 'sort':
      if (state.sortKey === val) state.sortDir = state.sortDir === 1 ? -1 : 1;
      else {
        state.sortKey = val;
        state.sortDir = val === 'overall' || val === 'planet' || val === 'people' || val === 'profit' || val === 'inc' ? -1 : 1;
      }
      break;
    case 'copytable': {
      const scored = scoreOptions(state.g, state.vehicles, visibleOptions(), scoring());
      const keep = keepOf(scored);
      const tsv = tableAsTsv(scored, keep);
      const done = (msg: string) => {
        state.copyNote = msg;
        const el = document.getElementById('copynote');
        if (el) el.textContent = msg;
      };
      try {
        void navigator.clipboard.writeText(tsv).then(
          () => done('Copied. Paste into Sheets or Excel.'),
          () => done('Copy was blocked here; select the table and copy it instead.')
        );
      } catch {
        done('Copy was blocked here; select the table and copy it instead.');
      }
      return;
    }
    case 'jump':
      document.getElementById('assump')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    case 'pick': {
      const i = state.selected.indexOf(val);
      state.notice = '';
      if (i >= 0) state.selected.splice(i, 1);
      else if (state.selected.length >= MAX_SELECTED) state.notice = `Pick up to ${MAX_SELECTED} cars. Remove one first.`;
      else state.selected.push(val);
      refreshAll();
      return;
    }
    case 'clearpicks':
      state.selected = [];
      state.notice = '';
      refreshAll();
      return;
    case 'addcustom': {
      if (state.selected.length >= MAX_SELECTED) {
        state.notice = `Pick up to ${MAX_SELECTED} cars. Remove one first.`;
        renderPicker();
        return;
      }
      state.customCount += 1;
      const d = makeCustomVehicle(val as 'ice' | 'hybrid' | 'ev', state.customCount);
      state.vehicles.push(clone(d.vehicle));
      state.defaults.push(clone(d.vehicle));
      state.meta[d.vehicle.id] = d.meta;
      state.ratingNotes[d.vehicle.id] = {};
      state.groups[d.vehicle.id] = 'custom';
      state.selected.push(d.vehicle.id);
      state.notice = '';
      refreshAll();
      return;
    }
    case 'rmcustom': {
      state.vehicles = state.vehicles.filter((v) => v.id !== val);
      state.defaults = state.defaults.filter((v) => v.id !== val);
      state.selected = state.selected.filter((id) => id !== val);
      delete state.meta[val];
      refreshAll();
      return;
    }
    case 'addlease': {
      const v = vehicle(val);
      const monthly = Math.round((v.price * 0.011) / 5) * 5;
      v.lease = { monthly, dueAtSigning: monthly + 2500, termMonths: 36 };
      const d = state.defaults.find((x) => x.id === val);
      if (d) d.lease = clone(v.lease);
      refreshAll();
      return;
    }
    case 'resetfield': {
      const f = fieldRegistry.get(val);
      if (!f) return;
      writeField(f, defaultOf(f));
      const input = document.getElementById(`in-${val}`) as HTMLInputElement | HTMLSelectElement | null;
      if (input) input.value = String(f.meta.bool ? defaultOf(f) : Math.round(defaultOf(f) * (f.meta.pct ? 100 : 1) * 10000) / 10000);
      refreshEdited();
      break;
    }
    case 'reset':
      state.g = clone(DEFAULT_GLOBALS);
      state.vehicles = clone(state.defaults);
      state.criteria = clone(DEFAULT_CRITERIA);
      refreshAll();
      return;
    default:
      return;
  }
  renderResults();
}

function bindEvents(): void {
  document.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
    if (el) onAction(el.dataset.act as string, el.dataset.val ?? '');
  });

  // <details> toggle events do not bubble, so listen in the capture phase to remember open/closed sections.
  document.addEventListener(
    'toggle',
    (e) => {
      const d = e.target as HTMLDetailsElement;
      if (d.dataset?.sec) state.secOpen[d.dataset.sec] = d.open;
    },
    true
  );

  document.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.dataset.field && t.tagName === 'INPUT') {
      const f = fieldRegistry.get(t.dataset.field);
      const n = parseFloat(t.value);
      if (f && Number.isFinite(n)) {
        writeField(f, f.meta.pct ? n / 100 : n);
        refreshEdited();
        renderResults();
      }
    } else if (t.dataset.wslider) {
      const k = t.dataset.wslider as keyof PillarWeights;
      state.weights = { ...state.weights, [k]: parseFloat(t.value) / 100 };
      state.preset = 'custom';
      const sum = state.weights.planet + state.weights.people + state.weights.profit || 1;
      (['planet', 'people', 'profit'] as const).forEach((p) => {
        const o = document.getElementById(`wo-${p}`);
        if (o) o.textContent = `${Math.round((state.weights[p] / sum) * 100)}%`;
      });
      document.querySelectorAll('[data-act="preset"]').forEach((b) => {
        b.classList.remove('on');
        b.setAttribute('aria-pressed', 'false');
      });
      const mode = MODES.find((m) => m.id === state.mode) as (typeof MODES)[number];
      $('ctl-summary').textContent = `${mode.label} · ${scaleLabel()} · Custom weights · ${state.aggregation === 'average' ? 'average' : 'weakest link'}`;
      renderResults();
    } else if (t.dataset.weight) {
      const c = state.criteria.find((x) => x.id === t.dataset.weight);
      const n = parseFloat(t.value);
      if (c && Number.isFinite(n)) {
        c.weight = Math.max(0, Math.min(100, n));
        renderResults();
      }
    } else if (t.dataset.vname) {
      const v = vehicle(t.dataset.vname);
      const name = t.value.trim() || 'My car';
      v.short = name;
      v.name = name;
      renderPicker();
      renderResults();
    }
  });

  document.addEventListener('change', (e) => {
    const t = e.target as HTMLSelectElement;
    if (t.dataset.rate) {
      vehicle(t.dataset.rate).ratings[t.dataset.crit as string] = parseInt(t.value, 10);
      renderResults();
    } else if (t.dataset.embodied !== undefined) {
      state.g.embodiedMode = t.value as 'allocated' | 'full';
      renderResults();
    } else if (t.dataset.field && t.tagName === 'SELECT') {
      const f = fieldRegistry.get(t.dataset.field);
      if (f) {
        writeField(f, parseFloat(t.value));
        refreshEdited();
        renderResults();
      }
    } else if (t.dataset.vname) {
      renderPicker();
    }
  });
}

export function init(): void {
  const saved = safeStore('tbl-theme');
  if (saved === 'ledger' || saved === 'night' || saved === 'field') state.theme = saved;
  applyTheme();
  renderControls();
  (document.getElementById('controls') as HTMLDetailsElement).open = window.innerWidth >= 760;
  renderPath();
  renderPicker();
  renderAssumptions();
  renderSources();
  renderResults();
  bindEvents();
  void initAnalyst();
  // Expose a tiny read-only hook so automated QA can verify state without scraping.
  (window as unknown as { __tbl: unknown }).__tbl = {
    snapshot: () => {
      const keep = computeOption(state.g, lx(), 'none', lx());
      return {
        theme: state.theme,
        mode: state.mode,
        selected: [...state.selected],
        ranks: scoreOptions(state.g, state.vehicles, visibleOptions(), scoring()).map((s) => ({ id: s.spec.id, rank: s.rank, overall: s.overall, profit: s.pillars.profit, npv: s.result.netCostNPV })),
        keepNPV: keep.netCostNPV
      };
    }
  };
}
