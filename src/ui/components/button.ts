import { esc } from '../../app/format';

/** Options for {@link dsButton}. */
export interface DsButtonOpts {
  label: string;
  act: string;
  val?: string;
  variant?: 'primary' | 'secondary' | 'link';
  full?: boolean;
  disabled?: boolean;
  /** Id of visible text that explains the button, e.g. why it is disabled. */
  describedBy?: string;
  id?: string;
}

/** A real `<button>` wired to the global `data-act` click handler. Disabled buttons use the native attribute. */
export function dsButton(o: DsButtonOpts): string {
  const cls = ['ds-btn', `ds-btn-${o.variant ?? 'primary'}`, o.full ? 'ds-btn-full' : ''].filter(Boolean).join(' ');
  const attrs = [
    o.id ? ` id="${esc(o.id)}"` : '',
    ` data-act="${esc(o.act)}"`,
    o.val !== undefined ? ` data-val="${esc(o.val)}"` : '',
    o.describedBy ? ` aria-describedby="${esc(o.describedBy)}"` : '',
    o.disabled ? ' disabled' : ''
  ].join('');
  return `<button type="button" class="${cls}"${attrs}>${esc(o.label)}</button>`;
}
