import { esc } from '../../app/format';

/** Options for {@link dsCheckRow}. */
export interface DsCheckRowOpts {
  id: string;
  /** Accessible name and visible title of the row. */
  name: string;
  /** Second line, e.g. "$28,995 · Loan only"; linked to the checkbox with aria-describedby. */
  detail: string;
  value: string;
  act: string;
  checked?: boolean;
  disabled?: boolean;
  /** Id of visible text that explains the state (e.g. the car-limit message). */
  describedBy?: string;
}

/**
 * Checkbox row: a real `<input type="checkbox">` with a 44 x 44 px hit area over a drawn box,
 * and a `<label>` that makes the whole row tappable. Checked is shown by a tick, not by color alone.
 */
export function dsCheckRow(o: DsCheckRowOpts): string {
  const id = esc(o.id);
  const described = [`${id}-detail`, o.describedBy ? esc(o.describedBy) : ''].filter(Boolean).join(' ');
  return `<div class="ds-check${o.checked ? ' ds-check-on' : ''}"><span class="ds-check-ctl"><input type="checkbox" class="ds-check-input" id="${id}" value="${esc(o.value)}" data-act="${esc(o.act)}" aria-describedby="${described}"${o.checked ? ' checked' : ''}${o.disabled ? ' disabled' : ''}><span class="ds-check-box" aria-hidden="true"></span></span><label for="${id}" class="ds-check-label"><span class="ds-check-name">${esc(o.name)}</span><span class="ds-check-detail" id="${id}-detail">${esc(o.detail)}</span></label></div>`;
}
