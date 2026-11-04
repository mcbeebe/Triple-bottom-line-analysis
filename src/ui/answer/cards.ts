import type { ScoredOption } from '../../engine';
import { esc, num, usd } from '../../app/format';
import { colorKey, gasBreakEven, incentiveTotal, kindLabel, optionName, paybackText, tagFor } from '../../app/options';
import { state } from '../../app/state';

function pillarRow(label: string, value: number): string {
  const v = Math.max(0, Math.min(100, value));
  return `<div class="prow"><span class="plabel">${label}</span><span class="pbar"><i style="width:${v.toFixed(1)}%"></i></span><span class="pval">${num(value, 0)}</span></div>`;
}

/** Ranked option cards (HTML), top 8 unless "show all" is on; the keep option is always included. */
export function renderCards(scored: ScoredOption[], keep: ScoredOption | null): string {
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

/** Cost and carbon bar charts (HTML). */
export function renderBars(scored: ScoredOption[]): string {
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
