/** Result of reading what someone typed into a number field. */
export type ParsedNumber = { kind: 'ok'; value: number } | { kind: 'empty' } | { kind: 'invalid' };

/** Result of checking typed text against a field's range. */
export type CheckedNumber = ParsedNumber | { kind: 'low' | 'high'; value: number; clamped: number };

/** A field's allowed range and step. */
export interface NumberRange {
  min: number;
  max: number;
  step: number;
}

// Optional minus, optional "$", then plain digits or digits grouped by commas every 3, then optional decimals.
const PATTERN = /^-?\$?(\d+|\d{1,3}(,\d{3})+)(\.\d+)?$/;

/**
 * Read typed text strictly. Accepts `7000`, `7,000`, `$7,000` and, when `allowDecimals`, `7,000.50`.
 * Anything else (`7k`, `4,85`, misplaced commas, letters) is invalid and never partly read.
 */
export function parseNumberText(text: string, allowDecimals: boolean): ParsedNumber {
  const t = text.trim();
  if (t === '') return { kind: 'empty' };
  const m = PATTERN.exec(t);
  if (!m || (m[3] && !allowDecimals)) return { kind: 'invalid' };
  return { kind: 'ok', value: Number(t.replace(/[$,]/g, '')) };
}

/** Number of decimal places a step implies (500 -> 0, 0.05 -> 2). */
export function decimalsOf(step: number): number {
  const s = String(step);
  const i = s.indexOf('.');
  return i < 0 ? 0 : s.length - i - 1;
}

/** Format with thousands separators and a fixed number of decimals (7000 -> "7,000"). */
export function formatNumberText(n: number, decimals: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Parse typed text and compare it with the range; out-of-range values carry the clamped value. */
export function checkNumberText(text: string, r: NumberRange): CheckedNumber {
  const p = parseNumberText(text, decimalsOf(r.step) > 0);
  if (p.kind !== 'ok') return p;
  if (p.value < r.min) return { kind: 'low', value: p.value, clamped: r.min };
  if (p.value > r.max) return { kind: 'high', value: p.value, clamped: r.max };
  return p;
}

/** How a field describes its values in messages. */
export interface NumberWords extends NumberRange {
  money?: boolean;
  unit?: string;
  /** A sensible value to show in "like ..." (usually the field's starting value). */
  example: number;
}

/** A value the way a message reads it: "$1,000" for money, "25,000 miles" with a unit. */
function words(n: number, w: NumberWords): string {
  const s = formatNumberText(n, decimalsOf(w.step));
  return w.money ? `$${s}` : w.unit ? `${s} ${w.unit}` : s;
}

/** The message under a field for a checked value; empty when there is nothing to say. */
export function numberMessage(c: CheckedNumber, w: NumberWords): string {
  if (c.kind === 'invalid') {
    const d = decimalsOf(w.step);
    const range = w.money ? `an amount from ${words(w.min, w)} to ${words(w.max, w)}` : `a number from ${formatNumberText(w.min, d)} to ${words(w.max, w)}`;
    return `Enter ${range}, like ${formatNumberText(w.example, d)}.`;
  }
  if (c.kind === 'low') return `Changed to ${words(c.clamped, w)}, the lowest allowed.`;
  if (c.kind === 'high') return `Changed to ${words(c.clamped, w)}, the highest allowed.`;
  return '';
}
