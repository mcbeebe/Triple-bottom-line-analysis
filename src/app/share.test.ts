import { describe, expect, it } from 'vitest';
import { freshState } from './state';
import { PUBLIC_DEFAULTS, applyScenario, scenarioFrom, type Scenario } from './scenario';
import { addCustomCar } from './mutations';
import { MAX_SHARE_BYTES, base32Decode, base32Encode, decodeShare, encodeShare, isShareHash, shareSummary } from './share';

const busy: Scenario = {
  ...PUBLIC_DEFAULTS,
  path: 'trade',
  carPreset: 'suv',
  carOverrides: { price: 12500, mpg: 19 },
  miles: 12000,
  selected: ['tesla', 'camryh'],
  customCars: [{ kind: 'ev', price: 41000, efficiency: 27, selected: true }],
  edits: { 'g..gasPrice': 6.25, 'bolt.loan.apr': 0.049, 'rate.bolt.safety': 5, 'cw.safety': 40 },
  settings: { mode: 'metrics', scale: 'anchored', aggregation: 'weakest', preset: 'custom', weights: { planet: 0.5, people: 0.2, profit: 0.3 }, view: 'loan', embodied: 'full' }
};

describe('base32', () => {
  it('round-trips bytes using only a-z and 2-7', () => {
    const bytes = new TextEncoder().encode('{"v":1,"p":"sell"} €');
    const enc = base32Encode(bytes);
    expect(enc).toMatch(/^[a-z2-7]+$/);
    expect(new TextDecoder().decode(base32Decode(enc)!)).toBe('{"v":1,"p":"sell"} €');
  });
  it('rejects characters outside the alphabet', () => {
    expect(base32Decode('abc1')).toBeNull();
    expect(base32Decode('ABC')).toBeNull();
  });
});

describe('encodeShare / decodeShare (Q2)', () => {
  it('produces a plain #name of letters, digits and hyphens with a version prefix', () => {
    const h = encodeShare(busy);
    expect(h).toMatch(/^s1-[a-z2-7]+$/);
    expect(isShareHash('#' + h)).toBe(true);
    expect(isShareHash('#step-2')).toBe(false);
  });

  it('round-trips a full scenario', () => {
    const d = decodeShare(encodeShare(busy));
    expect(d.ok).toBe(true);
    expect(d.scenario).toEqual(busy);
    expect(d.problems).toEqual([]);
  });

  it('keeps the defaults link short', () => {
    expect(encodeShare(PUBLIC_DEFAULTS).length).toBeLessThan(120);
    expect(decodeShare(encodeShare(PUBLIC_DEFAULTS)).scenario).toEqual(PUBLIC_DEFAULTS);
  });

  it('never carries typed car names', () => {
    const s = applyScenario(freshState(), PUBLIC_DEFAULTS);
    addCustomCar(s, { kind: 'ev', name: 'Grandma secret car', price: 41000, efficiency: 27 });
    s.vehicles.find((v) => v.owned)!.short = 'Old Civic';
    const text = new TextDecoder().decode(base32Decode(encodeShare(scenarioFrom(s)).slice(3))!);
    expect(text).not.toMatch(/Grandma|Civic/);
  });

  it('rejects tampered, unknown-version and oversized links safely', () => {
    expect(decodeShare('s1-!!!').ok).toBe(false);
    expect(decodeShare('s2-' + encodeShare(busy).slice(3)).ok).toBe(false);
    expect(decodeShare('s1-' + base32Encode(new TextEncoder().encode('not json'))).ok).toBe(false);
    expect(decodeShare('s1-' + base32Encode(new TextEncoder().encode('[1,2]'))).ok).toBe(false);
    expect(decodeShare('s1-' + 'a'.repeat(Math.ceil((MAX_SHARE_BYTES * 8) / 5) + 10)).ok).toBe(false);
  });

  it('accepts a link with bad values but reports and repairs them', () => {
    const bad = { ...busy, selected: ['tesla', 'nope'], miles: 99999 };
    const d = decodeShare(encodeShare(bad as Scenario));
    expect(d.ok).toBe(true);
    expect(d.scenario!.selected).toEqual(['tesla']);
    expect(d.scenario!.miles).toBe(25000);
    expect(d.problems.length).toBe(2);
  });
});

describe('shareSummary', () => {
  it('lists exactly what the link holds, in plain words', () => {
    const rows = shareSummary(busy, (id) => ({ tesla: 'Tesla Model Y', camryh: 'Toyota Camry Hybrid' })[id] ?? id);
    expect(rows.map((r) => r.label)).toEqual(['What you are deciding', 'Car you have now', 'Numbers you changed', 'Cars compared', 'Miles per year', 'Settings']);
    expect(rows[0].value).toBe('Trade my car in');
    expect(rows[2].value).toBe('6 numbers');
    expect(rows[3].value).toBe('Tesla Model Y, Toyota Camry Hybrid, 1 car of your own (name left out)');
    expect(rows[4].value).toBe('12,000');
  });
});
