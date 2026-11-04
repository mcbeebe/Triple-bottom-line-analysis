import { esc } from '../../app/format';

/** Options for {@link dsOption}. */
export interface DsOptionOpts {
  title: string;
  sub: string;
  act: string;
  val: string;
  on?: boolean;
}

/** Large one-tap choice (Step 1): title and a one-line description inside one button. */
export function dsOption(o: DsOptionOpts): string {
  const on = !!o.on;
  return `<button type="button" class="ds-option${on ? ' ds-option-on' : ''}" aria-pressed="${on}" data-act="${esc(o.act)}" data-val="${esc(o.val)}"><span class="ds-option-title">${esc(o.title)}</span><span class="ds-option-sub">${esc(o.sub)}</span></button>`;
}
