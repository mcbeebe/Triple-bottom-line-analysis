import { breakEvenGasPrice, type ScoredOption } from '../engine';
import { esc, num, usd } from './format';
import { hasCar, incentiveTotal, kindLabel, lx, optionName, paybackText, tagFor } from './options';
import { state } from './state';
import { shownName } from './verdict';

/** One column of the all-options table: how to read a value for sorting, and how to show it (safe HTML). */
export interface TableCol {
  key: string;
  label: string;
  num: boolean;
  get: (s: ScoredOption, keep: ScoredOption | null) => number | string;
  show: (v: number | string, s: ScoredOption) => string;
}

/** Sort keys whose first click sorts highest first (scores and savings); every other key sorts lowest first. */
export const DESCENDING_FIRST = new Set(['overall', 'planet', 'people', 'profit', 'inc']);

/** The columns, in plain words (CLAUDE.md: "cost over 8 years", not "NPV"). */
export function tableCols(): TableCol[] {
  const dash = (s: ScoredOption) => s.spec.financing === 'none';
  const n0 = (v: number | string) => num(Number(v), 0);
  const n1 = (v: number | string) => num(Number(v), 1);
  const money = (v: number | string) => usd(Number(v));
  const y = state.g.horizonYears;
  return [
    { key: 'name', label: 'Option', num: false, get: (s) => shownName(optionName(s.spec)), show: (v) => esc(String(v)) },
    { key: 'rank', label: 'Rank', num: true, get: (s) => s.rank, show: (v) => String(v) },
    { key: 'overall', label: 'Overall score', num: true, get: (s) => s.overall, show: n1 },
    { key: 'planet', label: 'Planet', num: true, get: (s) => s.pillars.planet, show: n0 },
    { key: 'people', label: 'People', num: true, get: (s) => s.pillars.people, show: n0 },
    { key: 'profit', label: 'Profit', num: true, get: (s) => s.pillars.profit, show: n0 },
    { key: 'npv', label: `Cost over ${y} years`, num: true, get: (s) => s.result.netCostNPV, show: money },
    { key: 'co2', label: `Carbon over ${y} years (t)`, num: true, get: (s) => s.result.co2.total, show: n1 },
    { key: 'monthly', label: 'Monthly payment', num: true, get: (s) => (dash(s) ? 0 : s.result.monthlyPayment), show: (v, s) => (dash(s) ? '-' : money(v)) },
    { key: 'upfront', label: 'Cash at start', num: true, get: (s) => s.result.upfrontCash, show: money },
    { key: 'inc', label: 'Rebates and tax savings', num: true, get: (s) => (dash(s) ? 0 : incentiveTotal(s.result)), show: (v, s) => (dash(s) ? '-' : money(v)) },
    {
      key: 'be',
      label: 'Gas price to break even',
      num: true,
      get: (s) => {
        if (dash(s) || !hasCar()) return -1;
        const p = breakEvenGasPrice(state.g, s.vehicle, s.spec.financing, lx());
        return p === null ? 999 : p;
      },
      show: (v, s) => (dash(s) || !hasCar() ? '-' : Number(v) >= 999 ? 'none below $40' : Number(v) === 0 ? 'wins at $0' : `$${num(Number(v), 2)}`)
    },
    { key: 'payback', label: 'Pays back vs keeping', num: false, get: (s, k) => paybackText(s, k), show: (v) => esc(String(v)) },
    { key: 'type', label: 'Type', num: false, get: (s) => kindLabel(s.vehicle), show: (v) => esc(String(v)) },
    { key: 'fin', label: 'Financing', num: false, get: (s) => tagFor(s.spec), show: (v) => esc(String(v)) }
  ];
}

/** Rows sorted by `key` in direction `dir` (1 lowest first, -1 highest first); ties fall back to rank. */
export function sortedRows(scored: ScoredOption[], keep: ScoredOption | null, key: string, dir: 1 | -1): { s: ScoredOption; vals: (number | string)[] }[] {
  const cols = tableCols();
  const rows = scored.map((s) => ({ s, vals: cols.map((c) => c.get(s, keep)) }));
  const idx = Math.max(0, cols.findIndex((c) => c.key === key));
  const col = cols[idx];
  rows.sort((a, b) => {
    const x = a.vals[idx];
    const y = b.vals[idx];
    const cmp = col.num ? Number(x) - Number(y) : String(x).localeCompare(String(y));
    return cmp * dir || a.s.rank - b.s.rank;
  });
  return rows;
}

/** The next sort after choosing column `key`: the same column flips direction; a new one starts in its natural direction. */
export function nextSort(curKey: string, curDir: 1 | -1, key: string): { key: string; dir: 1 | -1 } {
  if (curKey === key) return { key, dir: curDir === 1 ? -1 : 1 };
  return { key, dir: DESCENDING_FIRST.has(key) ? -1 : 1 };
}

/** The table as tab-separated text in the shown order, for pasting into a spreadsheet. */
export function tableTsv(scored: ScoredOption[], keep: ScoredOption | null, key: string, dir: 1 | -1): string {
  const cols = tableCols();
  const plain = (c: TableCol, v: number | string, s: ScoredOption): string =>
    c.show(v, s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  return [cols.map((c) => c.label).join('\t'), ...sortedRows(scored, keep, key, dir).map(({ s, vals }) => cols.map((c, i) => plain(c, vals[i], s)).join('\t'))].join('\n');
}
