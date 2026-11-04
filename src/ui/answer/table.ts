import { breakEvenGasPrice, type ScoredOption } from '../../engine';
import { esc, num, usd } from '../../app/format';
import { colorKey, hasCar, incentiveTotal, kindLabel, lx, optionName, paybackText, scaleLabel, tagFor } from '../../app/options';
import { state } from '../../app/state';

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

/** The sortable "All options in a table" panel (HTML). */
export function renderTable(scored: ScoredOption[], keep: ScoredOption | null): string {
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

/** The same table as tab-separated text for pasting into a spreadsheet. */
export function tableAsTsv(scored: ScoredOption[], keep: ScoredOption | null): string {
  const cols = tableCols();
  const rows = sortedTableRows(scored, keep);
  const plain = (c: Col, v: number | string, s: ScoredOption): string => c.show(v, s).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  return [cols.map((c) => c.label).join('\t'), ...rows.map(({ s, vals }) => cols.map((c, i) => plain(c, vals[i], s)).join('\t'))].join('\n');
}
