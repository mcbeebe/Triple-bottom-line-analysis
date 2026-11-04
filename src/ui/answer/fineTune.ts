import { scoreOptions, type Vehicle } from '../../engine';
import { GLOBAL_META, SRC, type ParamMeta } from '../../data';
import { esc, num } from '../../app/format';
import { defaultOf, fieldId, fieldRegistry, isEdited, readField, type Field } from '../../app/fields';
import { activeVehicles, colorKey, hasCar, kindLabel, scoring, visibleOptions } from '../../app/options';
import { state } from '../../app/state';
import { $ } from '../dom';
import { renderLive } from './answer';

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

/** Render every assumption section into #assump, rebuild the field registry, then refresh the edited marks and live bar. */
export function renderAssumptions(): void {
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

/** Update the "edited" marks, reset buttons and per-section counts from the field registry. */
export function refreshEdited(): void {
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
