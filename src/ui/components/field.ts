import { esc } from '../../app/format';
import { checkNumberText, decimalsOf, formatNumberText, numberMessage, type NumberWords } from '../../app/numberText';

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
  /** Key sent with the `ds:number` event when a valid value is entered. */
  name?: string;
  /** Safe HTML shown beside the label, e.g. a Placeholder / Source / Your number label. */
  statusHtml?: string;
  /** Message to show in the error state (marks the input aria-invalid). */
  error?: string;
}

const fmt = (n: number, money: boolean, step: number): string => (money ? '$' : '') + formatNumberText(n, decimalsOf(step));

/**
 * Labeled text input for numbers: shows thousands separators, opens a numeric keyboard, and states the
 * allowed range. `bindNumberFields` adds the typing, clamping and error behavior.
 */
export function dsField(o: DsFieldOpts): string {
  const money = !!o.money;
  const id = esc(o.id);
  const hintId = `${id}-hint`;
  const errId = `${id}-error`;
  const dec = decimalsOf(o.step);
  const data = [
    `data-num="${esc(o.name ?? o.id)}"`,
    `data-min="${o.min}"`,
    `data-max="${o.max}"`,
    `data-step="${o.step}"`,
    `data-example="${o.value}"`,
    `data-last="${o.value}"`,
    money ? 'data-money="1"' : '',
    o.unit ? `data-unit="${esc(o.unit)}"` : ''
  ].filter(Boolean).join(' ');
  const label = `<label for="${id}" class="ds-label">${esc(o.label)}</label>`;
  const unit = o.unit ? ` ${esc(o.unit)}` : '';
  return `<div class="ds-field${o.error ? ' ds-field-invalid' : ''}">${o.statusHtml ? `<div class="ds-label-row">${label}${o.statusHtml}</div>` : label}
<div class="ds-input">${money ? '<span class="ds-prefix" aria-hidden="true">$</span>' : ''}<input id="${id}" type="text" inputmode="${dec > 0 ? 'decimal' : 'numeric'}" autocomplete="off" value="${formatNumberText(o.value, dec)}" aria-describedby="${hintId} ${errId}"${o.error ? ' aria-invalid="true"' : ''} ${data}>${o.unit ? `<span class="ds-unit">${esc(o.unit)}</span>` : ''}</div>
<p class="ds-hint" id="${hintId}">Allowed: ${fmt(o.min, money, o.step)} to ${fmt(o.max, money, o.step)}${unit}.${o.note ? ' ' + esc(o.note) : ''}</p>
<p class="ds-error" id="${errId}" aria-live="polite">${o.error ? esc(o.error) : ''}</p></div>`;
}

/** Detail of the `ds:number` event a field dispatches when it holds a new valid value. */
export interface DsNumberDetail {
  name: string;
  value: number;
}

const wordsOf = (el: HTMLInputElement): NumberWords => ({
  min: Number(el.dataset.min),
  max: Number(el.dataset.max),
  step: Number(el.dataset.step),
  example: Number(el.dataset.example),
  money: el.dataset.money === '1',
  unit: el.dataset.unit
});

function setError(el: HTMLInputElement, message: string, invalid: boolean): void {
  const err = document.getElementById(`${el.id}-error`);
  if (err) err.textContent = message;
  el.closest('.ds-field')?.classList.toggle('ds-field-invalid', invalid);
  if (invalid) el.setAttribute('aria-invalid', 'true');
  else el.removeAttribute('aria-invalid');
}

function commit(el: HTMLInputElement, value: number): void {
  el.dataset.last = String(value);
  el.dispatchEvent(new CustomEvent<DsNumberDetail>('ds:number', { bubbles: true, detail: { name: el.dataset.num ?? el.id, value } }));
}

let bound = false;

/**
 * Install the document listeners once. While typing, a valid in-range value is committed (a `ds:number`
 * event) without moving the caret, and unreadable text shows an error. On leaving the field, a valid value
 * gets its commas, an empty field goes back to the last valid value, and an out-of-range value is clamped
 * with a message saying what it was changed to.
 */
export function bindNumberFields(): void {
  if (bound) return;
  bound = true;
  document.addEventListener('input', (e) => {
    const el = e.target as HTMLInputElement;
    if (!(el instanceof HTMLInputElement) || el.dataset.num === undefined) return;
    const w = wordsOf(el);
    const c = checkNumberText(el.value, w);
    if (c.kind === 'ok') {
      setError(el, '', false);
      if (c.value !== Number(el.dataset.last)) commit(el, c.value);
    } else if (c.kind === 'invalid') setError(el, numberMessage(c, w), true);
    else setError(el, '', false);
  });
  document.addEventListener('focusout', (e) => {
    const el = e.target as HTMLInputElement;
    if (!(el instanceof HTMLInputElement) || el.dataset.num === undefined) return;
    const w = wordsOf(el);
    const dec = decimalsOf(w.step);
    const c = checkNumberText(el.value, w);
    if (c.kind === 'ok') el.value = formatNumberText(c.value, dec);
    else if (c.kind === 'empty') el.value = formatNumberText(Number(el.dataset.last), dec);
    else if (c.kind === 'low' || c.kind === 'high') {
      el.value = formatNumberText(c.clamped, dec);
      setError(el, numberMessage(c, w), false);
      if (c.clamped !== Number(el.dataset.last)) commit(el, c.clamped);
    }
  });
}
