import { esc } from '../../app/format';

/** Options for {@link dsSheet}. `bodyHtml` must already be safe HTML. */
export interface DsSheetOpts {
  id: string;
  title: string;
  bodyHtml: string;
}

/** Bottom-sheet markup: a hidden backdrop holding a labeled modal dialog with a Close button. */
export function dsSheet(o: DsSheetOpts): string {
  const id = esc(o.id);
  return `<div class="ds-backdrop" data-sheet="${id}" hidden><section class="ds-sheet" id="${id}" role="dialog" aria-modal="true" aria-labelledby="${id}-title" tabindex="-1">
<div class="ds-sheet-head"><h2 id="${id}-title" class="ds-sheet-title">${esc(o.title)}</h2><button type="button" class="ds-btn ds-btn-link ds-sheet-close" data-sheet-close>Close</button></div>
<div class="ds-sheet-body">${o.bodyHtml}</div></section></div>`;
}
