import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(__dirname, 'tokens.css'), 'utf8');

function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector + '{');
  if (start < 0) throw new Error(`no ${selector} block in tokens.css`);
  const body = css.slice(start + selector.length + 1, css.indexOf('}', start));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/--([\w-]+):([^;]+)/g)) out[m[1]] = m[2].trim();
  return out;
}

/** WCAG 2.1 relative luminance of a #rrggbb color. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.1 contrast ratio between two #rrggbb colors. */
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const ledger = block(':root');
const themes: [string, Record<string, string>][] = [
  ['ledger', ledger],
  ['night', { ...ledger, ...block('body[data-theme="night"]') }]
];

// Text (4.5:1): every foreground/background pair a ds- component uses.
const TEXT_PAIRS: [string, string][] = [
  ['ink', 'bg'], ['ink', 'surface'], ['ink', 'soft'], ['ink', 'tint'],
  ['muted', 'bg'], ['muted', 'surface'], ['muted', 'soft'], ['muted', 'tint'],
  ['accent', 'bg'], ['accent', 'surface'], ['accent', 'tint'],
  ['on-accent', 'accent']
];
// Non-text UI (3:1, WCAG 1.4.11): control borders and the focus ring.
const UI_PAIRS: [string, string][] = [
  ['control', 'bg'], ['control', 'surface'], ['control', 'soft'], ['control', 'tint'],
  ['accent', 'bg'], ['accent', 'surface']
];

describe.each(themes)('%s tokens', (_name, t) => {
  it('defines every color as #rrggbb', () => {
    const colors = Object.entries(t).filter(([k]) => k.startsWith('color-'));
    expect(colors.length).toBeGreaterThanOrEqual(10);
    for (const [k, v] of colors) expect(v, k).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it.each(TEXT_PAIRS)('text %s on %s is at least 4.5:1', (fg, bg) => {
    expect(contrast(t[`color-${fg}`], t[`color-${bg}`])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(UI_PAIRS)('control %s on %s is at least 3:1', (fg, bg) => {
    expect(contrast(t[`color-${fg}`], t[`color-${bg}`])).toBeGreaterThanOrEqual(3);
  });
});

describe('contrast helper', () => {
  it('matches known WCAG values', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });
});
