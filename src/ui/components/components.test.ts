import { describe, expect, it } from 'vitest';
import { dsButton } from './button';
import { dsChip } from './chip';
import { dsOption } from './optionButton';
import { dsStepFooter, dsStepHeader } from './stepHeader';
import { dsOptionCard } from './optionCard';
import { dsDisclosure } from './disclosure';
import { dsField } from './field';
import { dsSheet } from './sheet';
import { dsCheckRow } from './checkRow';
import { dsSlider } from './slider';
import { dsStatusLabel } from './statusLabel';

const EVIL = '<img src=x onerror="alert(1)">&';
const SAFE = '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;';
const count = (html: string, s: string) => html.split(s).length - 1;

describe('dsButton', () => {
  it('renders a real button with type, action and escaped label', () => {
    const h = dsButton({ label: EVIL, act: 'go', val: 'a"b' });
    expect(h).toMatch(/^<button type="button" class="ds-btn ds-btn-primary"/);
    expect(h).toContain('data-act="go"');
    expect(h).toContain('data-val="a&quot;b"');
    expect(h).toContain(SAFE);
    expect(h).not.toContain('<img');
  });

  it('supports secondary, link and full-width variants', () => {
    expect(dsButton({ label: 'x', act: 'a', variant: 'secondary' })).toContain('ds-btn-secondary');
    expect(dsButton({ label: 'x', act: 'a', variant: 'link' })).toContain('ds-btn-link');
    expect(dsButton({ label: 'x', act: 'a', full: true })).toContain('ds-btn-full');
  });

  it('disables natively and links the reason', () => {
    const h = dsButton({ label: 'Show my answer', act: 'answer', disabled: true, describedBy: 'why-off' });
    expect(h).toContain(' disabled');
    expect(h).toContain('aria-describedby="why-off"');
    expect(dsButton({ label: 'x', act: 'a' })).not.toContain('disabled');
  });
});

describe('dsChip', () => {
  it('reports pressed state and escapes label and sub-label', () => {
    const on = dsChip({ label: EVIL, sub: EVIL, act: 'pick', val: 'tesla', on: true });
    expect(on).toContain('aria-pressed="true"');
    expect(on).toContain('ds-chip-on');
    expect(count(on, SAFE)).toBe(2);
    const off = dsChip({ label: 'Bolt', act: 'pick', val: 'bolt' });
    expect(off).toContain('aria-pressed="false"');
    expect(off).not.toContain('<small');
  });
});

describe('dsOption', () => {
  it('renders title and description inside one button', () => {
    const h = dsOption({ title: 'Sell my car, then buy', sub: EVIL, act: 'path', val: 'sell', on: true });
    expect(count(h, '<button')).toBe(1);
    expect(h).toContain('aria-pressed="true"');
    expect(h).toContain('Sell my car, then buy');
    expect(h).toContain(SAFE);
  });
});

describe('dsStepHeader', () => {
  it('states the step in text and fills that many progress segments', () => {
    const h = dsStepHeader({ step: 2, total: 3, title: 'Your car and your driving', id: 'h2' });
    expect(h).toContain('Step 2 of 3');
    expect(count(h, 'class="ds-seg ds-seg-on"')).toBe(2);
    expect(count(h, 'class="ds-seg"')).toBe(1);
    expect(h).toContain('aria-hidden="true"');
  });

  it('makes the heading focusable by script only, at the requested level', () => {
    const h = dsStepHeader({ step: 1, total: 3, title: EVIL, id: 'h1x', level: 2 });
    expect(h).toContain('<h2 id="h1x" class="ds-step-title" tabindex="-1" aria-describedby="h1x-count">');
    expect(h).toContain('<p class="ds-step-count" id="h1x-count">Step 1 of 3</p>');
    expect(h).toContain(SAFE);
    expect(dsStepHeader({ step: 1, total: 3, title: 't', id: 'a' })).toContain('<h1 ');
  });

  it('rejects a step outside 1..total', () => {
    expect(() => dsStepHeader({ step: 0, total: 3, title: 't', id: 'a' })).toThrow(RangeError);
    expect(() => dsStepHeader({ step: 4, total: 3, title: 't', id: 'a' })).toThrow(RangeError);
  });
});

describe('dsStepFooter', () => {
  it('disables Back on the first step only', () => {
    const first = dsStepFooter({ step: 1, backAct: 'back', skipAct: 'skip' });
    expect(first).toMatch(/data-act="back"[^>]* disabled/);
    expect(dsStepFooter({ step: 2, backAct: 'back', skipAct: 'skip' })).not.toContain('disabled');
  });

  it('always offers Skip to answer inside a labeled nav', () => {
    const h = dsStepFooter({ step: 3, backAct: 'back', skipAct: 'skip' });
    expect(h).toContain('<nav class="ds-step-nav" aria-label="Step navigation">');
    expect(h).toContain('Skip to answer');
  });
});

describe('dsOptionCard', () => {
  const base = { id: 'c1', name: 'Tesla Model Y (loan)', score: 57.14, cost: 59398, carbonT: 36.62, people: 59.4, years: 8 };

  it('shows score, cost over N years, carbon and People in plain words', () => {
    const h = dsOptionCard(base);
    expect(h).toContain('<article class="ds-card" aria-labelledby="c1-name">');
    expect(h).toContain('57');
    expect(h).toContain('/100');
    expect(h).toContain('Cost over 8 years');
    expect(h).toContain('$59,398');
    expect(h).toContain('36.6 t');
    expect(h).toContain('People');
    expect(h).not.toMatch(/NPV|CO2e/);
  });

  it('marks the highlighted card with text, not color alone', () => {
    const h = dsOptionCard({ ...base, tag: 'Highest overall score', highlight: true });
    expect(h).toContain('ds-card-top');
    expect(h).toContain('Highest overall score');
  });

  it('escapes the name and tag', () => {
    const h = dsOptionCard({ ...base, name: EVIL, tag: EVIL });
    expect(count(h, SAFE)).toBe(2);
  });
});

describe('dsDisclosure', () => {
  it('uses native details and summary, closed unless asked', () => {
    const h = dsDisclosure({ id: 'why', title: EVIL, meta: '3 edited', bodyHtml: '<p>body</p>' });
    expect(h).toMatch(/^<details class="ds-disc" id="why">/);
    expect(h).toContain('<summary');
    expect(h).toContain(SAFE);
    expect(h).toContain('3 edited');
    expect(h).toContain('<p>body</p>');
    expect(dsDisclosure({ id: 'x', title: 't', bodyHtml: '', open: true })).toContain('<details class="ds-disc" id="x" open>');
  });
});

describe('dsField', () => {
  it('is a labeled text input with commas, a numeric keyboard and the allowed range', () => {
    const h = dsField({ id: 'miles', label: 'Miles per year', value: 7500, min: 1000, max: 25000, step: 500, unit: 'miles', name: 'miles' });
    expect(h).toContain('<label for="miles"');
    expect(h).toContain('id="miles"');
    expect(h).toContain('type="text" inputmode="numeric"');
    expect(h).toContain('value="7,500"');
    expect(h).toContain('aria-describedby="miles-hint miles-error"');
    expect(h).toContain('data-num="miles" data-min="1000" data-max="25000" data-step="500" data-example="7500" data-last="7500" data-unit="miles"');
    expect(h).toContain('Allowed: 1,000 to 25,000 miles');
    expect(h).toContain('<p class="ds-error" id="miles-error" aria-live="polite"></p>');
    expect(h).not.toContain('aria-invalid');
  });

  it('uses a decimal keyboard and step precision when the step has cents', () => {
    const h = dsField({ id: 'gas', label: 'Gas price', value: 4.85, min: 1, max: 15, step: 0.05, money: true });
    expect(h).toContain('inputmode="decimal"');
    expect(h).toContain('value="4.85"');
    expect(h).toContain('data-money="1"');
  });

  it('shows a dollar prefix for money and escapes label and note', () => {
    const h = dsField({ id: 'sale', label: EVIL, value: 7000, min: 0, max: 200000, step: 100, money: true, note: EVIL });
    expect(h).toContain('class="ds-prefix"');
    expect(h).toContain('value="7,000"');
    expect(h).toContain('Allowed: $0 to $200,000');
    expect(count(h, SAFE)).toBe(2);
  });

  it('renders an error state with aria-invalid and the message', () => {
    const h = dsField({ id: 'sale', label: 'Value', value: 7000, min: 1000, max: 150000, step: 250, money: true, error: 'Enter an amount from $1,000 to $150,000, like 7,000.' });
    expect(h).toContain('aria-invalid="true"');
    expect(h).toContain('ds-field ds-field-invalid');
    expect(h).toContain('>Enter an amount from $1,000 to $150,000, like 7,000.</p>');
  });

  it('places an optional status label next to the field label', () => {
    const h = dsField({ id: 'v', label: 'Value', value: 1, min: 0, max: 2, step: 1, statusHtml: '<span class="ds-status">Placeholder</span>' });
    expect(h).toContain('<div class="ds-label-row"><label for="v" class="ds-label">Value</label><span class="ds-status">Placeholder</span></div>');
  });
});

describe('dsSheet', () => {
  it('is a labeled modal dialog, hidden until opened, with a Close button', () => {
    const h = dsSheet({ id: 'share', title: EVIL, bodyHtml: '<p>b</p>' });
    expect(h).toContain('data-sheet="share" hidden');
    expect(h).toContain('role="dialog" aria-modal="true" aria-labelledby="share-title"');
    expect(h).toContain('<h2 id="share-title" class="ds-sheet-title">');
    expect(h).toContain(SAFE);
    expect(h).toContain('data-sheet-close');
    expect(h).toContain('>Close</button>');
  });
});

describe('dsCheckRow', () => {
  it('is a real checkbox with a label, value and detail linked by aria-describedby', () => {
    const h = dsCheckRow({ id: 'pick-bolt', name: 'Chevrolet Bolt LT (2027)', detail: '$28,995', value: 'bolt', act: 'st-pick', checked: true });
    expect(h).toContain('<input type="checkbox" class="ds-check-input" id="pick-bolt" value="bolt" data-act="st-pick" aria-describedby="pick-bolt-detail" checked>');
    expect(h).toContain('<label for="pick-bolt" class="ds-check-label">');
    expect(h).toContain('<span class="ds-check-detail" id="pick-bolt-detail">$28,995</span>');
    expect(h).toContain('ds-check ds-check-on');
    expect(h).toContain('class="ds-check-box" aria-hidden="true"');
  });

  it('can be disabled with an extra description id, and escapes text', () => {
    const h = dsCheckRow({ id: 'p', name: EVIL, detail: EVIL, value: 'v', act: 'st-pick', disabled: true, describedBy: 'limit-msg' });
    expect(h).toContain('aria-describedby="p-detail limit-msg" disabled>');
    expect(h).not.toContain(' checked');
    expect(count(h, SAFE)).toBe(2);
  });
});

describe('dsSlider', () => {
  it('is a labeled range input with a spoken value and a visible readout', () => {
    const h = dsSlider({ id: 'miles', label: 'Miles per year', value: 7500, min: 1000, max: 25000, step: 500, name: 'miles', unitText: 'miles a year' });
    expect(h).toContain('<label for="miles" class="ds-label">Miles per year</label>');
    expect(h).toContain('type="range" id="miles" min="1000" max="25000" step="500" value="7500"');
    expect(h).toContain('aria-valuetext="7,500 miles a year"');
    expect(h).toContain('data-slider="miles" data-unit-text="miles a year"');
    expect(h).toContain('<output class="ds-slider-out" for="miles" id="miles-out">7,500</output>');
    expect(h).toContain('1,000 to 25,000 miles a year.');
  });

  it('includes an optional status label', () => {
    expect(dsSlider({ id: 'm', label: 'L', value: 1, min: 0, max: 2, step: 1, name: 'm', unitText: 'u', statusHtml: '<span>S</span>' })).toContain('<span>S</span>');
  });
});

describe('dsStatusLabel', () => {
  it('marks assumed values as Placeholder', () => {
    expect(dsStatusLabel({ kind: 'placeholder' })).toBe('<span class="ds-status ds-status-ph">Placeholder</span>');
  });

  it('marks edited values as Your number', () => {
    expect(dsStatusLabel({ kind: 'yours' })).toBe('<span class="ds-status ds-status-yours">Your number</span>');
  });

  it('links sourced values, says the link opens a new tab, and escapes', () => {
    const h = dsStatusLabel({ kind: 'source', label: EVIL, href: 'https://example.org/a?b=1&c=2' });
    expect(h).toContain('<a class="ds-status ds-status-src" href="https://example.org/a?b=1&amp;c=2" target="_blank" rel="noopener">Source<span class="ds-sr">: ');
    expect(h).toContain(SAFE);
    expect(h).toContain(' (opens in a new tab)</span></a>');
  });

  it('refuses non-https source links', () => {
    expect(() => dsStatusLabel({ kind: 'source', label: 'x', href: 'javascript:alert(1)' })).toThrow();
  });
});

describe('dsStepFooter skip state', () => {
  it('can disable Skip to answer with a reason', () => {
    const h = dsStepFooter({ step: 3, backAct: 'b', skipAct: 's', skipDisabled: true, describedBy: 'why' });
    expect(h).toMatch(/data-act="s" aria-describedby="why" disabled>Skip to answer/);
  });
});
