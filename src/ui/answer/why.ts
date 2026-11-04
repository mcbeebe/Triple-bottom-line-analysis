import type { ScoredOption } from '../../engine';
import { CRITERIA_NOTES, LIMITATIONS, SRC } from '../../data';
import { esc, num, usd } from '../../app/format';
import { colorKey, optionName, scaleLabel, sensitivityGrid } from '../../app/options';
import { MODES, PRESET_LABELS, state } from '../../app/state';
import { $ } from '../dom';

/** Planet tab: lifecycle CO2e breakdown per option (HTML). */
export function planetTable(scored: ScoredOption[], keep: ScoredOption | null): string {
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

/** People tab: editable 1 to 5 ratings per criterion and vehicle (HTML). */
export function peopleTable(scored: ScoredOption[]): string {
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

/** Profit tab: cost components and incentives per option (HTML). */
export function profitTable(scored: ScoredOption[], keep: ScoredOption | null): string {
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

/** "Does the winner hold up?" sensitivity table (HTML). */
export function renderSens(): string {
  const rows = sensitivityGrid()
    .map((r) => `<tr><th>${PRESET_LABELS[r.preset]}</th>${r.cells.map((c) => `<td>${esc(c.winner)}</td>`).join('')}</tr>`)
    .join('');
  const head = MODES.map((m) => `<th>${m.label}</th>`).join('');
  return `<div class="scroll"><table><thead><tr><th>Pillar weighting</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>
<p class="fine">Winner under each combination of pillar weighting and scoring mode, using your current scale (${scaleLabel()}) and ${state.aggregation === 'average' ? 'weighted average' : 'weakest-link'} aggregation.</p>`;
}

/** Render the sources list and the "what this does not model" list into #sources. */
export function renderSources(): void {
  const items = Object.values(SRC)
    .map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`)
    .join('');
  $('sources').innerHTML = `<h2>Sources</h2><p class="fine">Retrieved November 1, 2026. Prices, lease offers, rates and incentive funding change often; confirm before acting.</p><ul class="srclist">${items}</ul>
  <h2>What this does not model</h2><ul class="srclist plain">${LIMITATIONS.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`;
}
