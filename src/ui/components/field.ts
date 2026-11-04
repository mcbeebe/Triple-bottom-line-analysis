import { esc } from '../../app/format';

/** Options for {@link dsField}. */
export interface DsFieldOpts {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  /** Show a "$" prefix and format the range as money. */
  money?: boolean;
  note?: string;
}

const fmt = (n: number, money: boolean): string => (money ? '$' : '') + n.toLocaleString('en-US');

/** Labeled number input with an optional unit and a visible allowed range linked by `aria-describedby`. */
export function dsField(o: DsFieldOpts): string {
  const money = !!o.money;
  const hintId = `${o.id}-hint`;
  const unit = o.unit ? ` ${o.unit}` : '';
  return `<div class="ds-field"><label for="${esc(o.id)}" class="ds-label">${esc(o.label)}</label>
<div class="ds-input">${money ? '<span class="ds-prefix" aria-hidden="true">$</span>' : ''}<input id="${esc(o.id)}" type="number" inputmode="decimal" min="${o.min}" max="${o.max}" step="${o.step}" value="${o.value}" aria-describedby="${esc(hintId)}">${o.unit ? `<span class="ds-unit">${esc(o.unit)}</span>` : ''}</div>
<p class="ds-hint" id="${esc(hintId)}">Allowed: ${fmt(o.min, money)} to ${fmt(o.max, money)}${esc(unit)}.${o.note ? ' ' + esc(o.note) : ''}</p></div>`;
}
