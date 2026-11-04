import { esc } from '../../app/format';
import { decimalsOf, formatNumberText } from '../../app/numberText';
import type { DsNumberDetail } from './field';

/** Options for {@link dsSlider}. */
export interface DsSliderOpts {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** Key sent with the `ds:number` event when the value changes. */
  name: string;
  /** Words after the number, for the readout's spoken value and the range line, e.g. "miles a year". */
  unitText: string;
  /** Safe HTML shown beside the label, e.g. a status label. */
  statusHtml?: string;
}

const fmt = (n: number, step: number): string => formatNumberText(n, decimalsOf(step));

/** Labeled range input (at least 44 px tall) with a visible readout and `aria-valuetext` in plain words. */
export function dsSlider(o: DsSliderOpts): string {
  const id = esc(o.id);
  const label = `<label for="${id}" class="ds-label">${esc(o.label)}</label>`;
  const unit = esc(o.unitText);
  return `<div class="ds-slider">${o.statusHtml ? `<div class="ds-label-row">${label}${o.statusHtml}</div>` : label}
<div class="ds-slider-row"><input type="range" id="${id}" min="${o.min}" max="${o.max}" step="${o.step}" value="${o.value}" aria-valuetext="${fmt(o.value, o.step)} ${unit}" data-slider="${esc(o.name)}" data-unit-text="${unit}"><output class="ds-slider-out" for="${id}" id="${id}-out">${fmt(o.value, o.step)}</output></div>
<p class="ds-hint">${fmt(o.min, o.step)} to ${fmt(o.max, o.step)} ${unit}.</p></div>`;
}

let bound = false;

/** Install the document listener once: moving a slider updates its readout and spoken value and fires `ds:number`. */
export function bindSliders(): void {
  if (bound) return;
  bound = true;
  document.addEventListener('input', (e) => {
    const el = e.target as HTMLInputElement;
    if (!(el instanceof HTMLInputElement) || el.type !== 'range' || el.dataset.slider === undefined) return;
    const value = Number(el.value);
    const text = fmt(value, Number(el.step) || 1);
    const out = document.getElementById(`${el.id}-out`);
    if (out) out.textContent = text;
    el.setAttribute('aria-valuetext', `${text} ${el.dataset.unitText ?? ''}`.trim());
    el.dispatchEvent(new CustomEvent<DsNumberDetail>('ds:number', { bubbles: true, detail: { name: el.dataset.slider, value } }));
  });
}
