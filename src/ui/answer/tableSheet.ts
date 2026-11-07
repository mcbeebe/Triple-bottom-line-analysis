import { scoreOptions } from '../../engine';
import { esc } from '../../app/format';
import { keepOf, scoring, visibleOptions } from '../../app/options';
import type { State } from '../../app/state';
import { sortedRows, tableCols } from '../../app/table';
import { dsButton } from '../components/button';
import { dsSheet } from '../components/sheet';

/** Id of the Table sheet. */
export const TABLE_SHEET = 'table';

/** The sortable table of every option (mockup 4): column buttons sort; aria-sort says the order in words. */
export function tableHtml(s: State): string {
  const scored = scoreOptions(s.g, s.vehicles, visibleOptions(), scoring());
  const keep = keepOf(scored);
  const cols = tableCols();
  const rows = sortedRows(scored, keep, s.sortKey, s.sortDir);
  const sortCol = cols.find((c) => c.key === s.sortKey) ?? cols[1];
  const order = s.sortDir === 1 ? 'lowest first' : 'highest first';
  const head = cols
    .map((c) => {
      const on = c === sortCol;
      const sort = on ? (s.sortDir === 1 ? 'ascending' : 'descending') : 'none';
      const ico = on ? (s.sortDir === 1 ? '▲' : '▼') : '↕';
      return `<th scope="col" aria-sort="${sort}"${c.num ? ' class="n"' : ''}><button type="button" class="ds-sort${on ? ' ds-sort-on' : ''}" id="tb-sort-${c.key}" data-act="tb-sort" data-val="${c.key}">${esc(c.label)}<span class="ds-sort-ico" aria-hidden="true">${ico}</span></button></th>`;
    })
    .join('');
  const body = rows
    .map(({ s: x, vals }) => `<tr${x.spec.financing === 'none' ? ' class="ds-row-keep"' : ''}>${cols.map((c, i) => (i === 0 ? `<th scope="row">${c.show(vals[i], x)}</th>` : `<td${c.num ? ' class="n"' : ''}>${c.show(vals[i], x)}</td>`)).join('')}</tr>`)
    .join('');
  return `<div class="ds-table-wrap" role="region" aria-label="All options table, scrolls sideways" tabindex="0"><table class="ds-table ds-table-sort"><caption class="ds-sr">All ${rows.length} options, sorted by ${esc(sortCol.label)}, ${order}</caption><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

/** The sheet body: how to use it, the table and "Copy as spreadsheet text". */
export function tableBody(s: State): string {
  return `<p class="ds-small">Every option, not only the top three. Choose a column name to sort; choose it again to reverse. Scroll sideways for more columns.</p>
<div id="tb-wrap">${tableHtml(s)}</div>
<div class="ds-copy">${dsButton({ label: 'Copy as spreadsheet text', act: 'tb-copy', variant: 'secondary', full: true, id: 'tb-copy' })}<p class="ds-small" id="tb-status" role="status">Copies the table as tab-separated text you can paste into Sheets or Excel.</p></div>`;
}

/** Render the sheet into the sheet host (hidden until shown). */
export function renderTableSheet(s: State): void {
  const host = document.getElementById('ds-sheets');
  if (host) host.innerHTML = dsSheet({ id: TABLE_SHEET, title: 'All options', bodyHtml: tableBody(s) });
}
