import { esc } from '../../app/format';

/** Toggle chip button (HTML) wired to the global `data-act` click handler. */
export function chip(act: string, val: string, label: string, sub = '', on = false): string {
  return `<button class="chip ${on ? 'on' : ''}" aria-pressed="${on}" data-act="${act}" data-val="${val}">${label}${sub ? `<small>${sub}</small>` : ''}</button>`;
}

/** Options for {@link dsChip}. */
export interface DsChipOpts {
  label: string;
  sub?: string;
  act: string;
  val: string;
  on?: boolean;
}

/** Design-system toggle chip: a button with `aria-pressed`, at least 44 px tall. */
export function dsChip(o: DsChipOpts): string {
  const on = !!o.on;
  return `<button type="button" class="ds-chip${on ? ' ds-chip-on' : ''}" aria-pressed="${on}" data-act="${esc(o.act)}" data-val="${esc(o.val)}">${esc(o.label)}${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</button>`;
}
