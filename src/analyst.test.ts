import { describe, expect, it } from 'vitest';
import { buildPrompt, coerceValue, hasContent, sanitizeAnswer, sensitivityRows, type FieldInfo, type PromptArgs } from './analyst';
import { WEIGHT_PRESETS, type OptionSpec, type Scoring } from './engine';
import { DEFAULT_CRITERIA, DEFAULT_GLOBALS, DEFAULT_OPTIONS, DEFAULT_VEHICLES } from './data';

const field = (over: Partial<FieldInfo> = {}): FieldInfo => ({
  id: 'g..gasPrice',
  label: 'Gas price',
  unit: '$/gal',
  value: 5.5,
  defaultValue: 5.5,
  min: 2,
  max: 12,
  kind: 'number',
  ...over
});
const fields = new Map<string, FieldInfo>([
  ['g..gasPrice', field()],
  ['g..discountRate', field({ id: 'g..discountRate', label: 'Discount rate', unit: '%', value: 0.05, defaultValue: 0.05, min: 0, max: 0.2, kind: 'fraction' })],
  ['g..firstTimeZev', field({ id: 'g..firstTimeZev', label: 'First-time EV buyer', unit: '', value: 1, defaultValue: 1, min: 0, max: 1, kind: 'yesno' })]
]);
const ctx = { fields, addableCarIds: new Set(['rav4h', 'ioniq5']), removableCarIds: new Set(['tesla', 'bolt']) };

const scoring: Scoring = { mode: 'hybrid', aggregation: 'average', scale: 'benchmark', pillarWeights: { ...WEIGHT_PRESETS.balanced }, criteria: DEFAULT_CRITERIA };
const nameOf = (o: OptionSpec): string => o.label;

describe('coerceValue', () => {
  it('clamps numbers to the field range', () => {
    expect(coerceValue(field(), 99)).toBe(12);
    expect(coerceValue(field(), -4)).toBe(2);
    expect(coerceValue(field(), 6.25)).toBe(6.25);
  });
  it('accepts numeric strings and rejects junk', () => {
    expect(coerceValue(field(), '7')).toBe(7);
    expect(coerceValue(field(), 'abc')).toBeNull();
    expect(coerceValue(field(), '')).toBeNull();
    expect(coerceValue(field(), NaN)).toBeNull();
    expect(coerceValue(field(), Infinity)).toBeNull();
    expect(coerceValue(field(), null)).toBeNull();
    expect(coerceValue(field(), {})).toBeNull();
  });
  it('snaps yes/no fields to 0 or 1 and accepts booleans', () => {
    const yn = fields.get('g..firstTimeZev') as FieldInfo;
    expect(coerceValue(yn, true)).toBe(1);
    expect(coerceValue(yn, false)).toBe(0);
    expect(coerceValue(yn, 0.4)).toBe(0);
    expect(coerceValue(yn, 7)).toBe(1);
  });
});

describe('sanitizeAnswer', () => {
  it('returns an empty answer for garbage input', () => {
    for (const bad of [null, undefined, 'text', 42, [], {}]) {
      const a = sanitizeAnswer(bad, ctx);
      expect(hasContent(a)).toBe(false);
      expect(a.suggestions).toEqual([]);
      expect(a.settings).toBeNull();
    }
  });
  it('drops suggestions for unknown fields and clamps out-of-range values', () => {
    const a = sanitizeAnswer(
      { suggestions: [{ field: 'g..gasPrice', value: 500, reason: 'r' }, { field: 'hack..x', value: 1, reason: 'r' }, { field: 'g..discountRate', value: '0.07', reason: 'r' }] },
      ctx
    );
    expect(a.suggestions.map((s) => s.field)).toEqual(['g..gasPrice', 'g..discountRate']);
    expect(a.suggestions[0].value).toBe(12);
    expect(a.suggestions[1].value).toBeCloseTo(0.07);
  });
  it('drops duplicates, no-ops and non-numeric values', () => {
    const a = sanitizeAnswer(
      { suggestions: [{ field: 'g..gasPrice', value: 5.5 }, { field: 'g..gasPrice', value: 6 }, { field: 'g..gasPrice', value: 7 }, { field: 'g..discountRate', value: 'lots' }] },
      ctx
    );
    expect(a.suggestions).toHaveLength(1);
    expect(a.suggestions[0].value).toBe(6);
  });
  it('keeps only addable cars, once each', () => {
    const a = sanitizeAnswer({ addCars: [{ id: 'rav4h', reason: 'a' }, { id: 'rav4h', reason: 'dup' }, { id: 'lx', reason: 'owned' }, { id: 'nope' }, 'x'] }, ctx);
    expect(a.addCars.map((c) => c.id)).toEqual(['rav4h']);
  });
  it('validates settings values and returns null when none are valid', () => {
    expect(sanitizeAnswer({ settings: { mode: 'chaos', scale: 'x', preset: 'y', view: 'z', reason: 'r' } }, ctx).settings).toBeNull();
    const ok = sanitizeAnswer({ settings: { mode: 'metrics', scale: 'relative', preset: 'planet', view: 'loan', reason: 'because' } }, ctx).settings;
    expect(ok).toEqual({ mode: 'metrics', scale: 'relative', preset: 'planet', view: 'loan', reason: 'because' });
    expect(sanitizeAnswer({ settings: { preset: 'planet', mode: 'bad' } }, ctx).settings).toEqual({ preset: 'planet', reason: '' });
  });
  it('links a question to a field only when the field exists', () => {
    const a = sanitizeAnswer({ questions: [{ question: 'Gas?', why: 'w', field: 'g..gasPrice', value: 6 }, { question: 'Other?', why: 'w', field: 'bogus', value: 3 }, { question: '', field: 'g..gasPrice' }] }, ctx);
    expect(a.questions).toHaveLength(2);
    expect(a.questions[0]).toMatchObject({ field: 'g..gasPrice', value: 6 });
    expect(a.questions[1]).toMatchObject({ field: null, value: null });
  });
  it('caps list lengths and string lengths', () => {
    const long = 'x'.repeat(5000);
    const a = sanitizeAnswer(
      { summary: long, explanation: Array(30).fill('e'), caveats: Array(30).fill('c'), flipFactors: Array(30).fill({ factor: 'f', effect: 'e' }), questions: Array(30).fill({ question: 'q' }) },
      ctx
    );
    expect(a.summary.length).toBeLessThanOrEqual(900);
    expect(a.explanation.length).toBe(8);
    expect(a.caveats.length).toBe(5);
    expect(a.flipFactors.length).toBe(8);
    expect(a.questions.length).toBe(6);
  });
  it('keeps markup as plain text (rendering escapes it) and ignores non-string entries', () => {
    const a = sanitizeAnswer({ summary: '<img src=x onerror=alert(1)>', explanation: [1, null, '<b>ok</b>'] }, ctx);
    expect(a.summary).toContain('<img');
    expect(a.explanation).toEqual(['<b>ok</b>']);
  });
});

describe('sanitizeAnswer: path, current car and car set', () => {
  it('accepts a valid path and rejects an invalid one', () => {
    expect(sanitizeAnswer({ settings: { path: 'trade', reason: 'r' } }, ctx).settings?.path).toBe('trade');
    expect(sanitizeAnswer({ settings: { path: 'steal', reason: 'r' } }, ctx).settings).toBeNull();
  });
  it('removeCars only accepts cars that are currently selected', () => {
    const a = sanitizeAnswer({ removeCars: [{ id: 'tesla' }, { id: 'rav4h' }, { id: 'tesla' }] }, ctx);
    expect(a.removeCars.map((c) => c.id)).toEqual(['tesla']);
  });
  it('newCars need a kind, name, price and efficiency, and are clamped', () => {
    const a = sanitizeAnswer(
      {
        newCars: [
          { name: 'Subaru Outback', kind: 'ice', price: 38000, efficiency: 29 },
          { name: 'Cheap', kind: 'ev', price: 10, efficiency: 1 },
          { name: 'No price', kind: 'ice', efficiency: 30 },
          { name: 'Bad kind', kind: 'rocket', price: 30000, efficiency: 30 },
          { name: '', kind: 'ice', price: 30000, efficiency: 30 },
          { name: 'Text price', kind: 'ice', price: '30000', efficiency: 30 }
        ]
      },
      ctx
    );
    expect(a.newCars.map((c) => c.name)).toEqual(['Subaru Outback', 'Cheap']);
    expect(a.newCars[1]).toMatchObject({ price: 3000, efficiency: 15 });
  });
  it('caps new cars at three and names at 40 characters', () => {
    const a = sanitizeAnswer({ newCars: Array(10).fill({ name: 'x'.repeat(100), kind: 'ice', price: 30000, efficiency: 30 }), currentCarName: 'y'.repeat(100) }, ctx);
    expect(a.newCars).toHaveLength(3);
    expect(a.newCars[0].name.length).toBe(40);
    expect(a.currentCarName.length).toBe(40);
  });
});

describe('sensitivityRows', () => {
  const run = () => sensitivityRows(DEFAULT_GLOBALS, DEFAULT_VEHICLES, DEFAULT_OPTIONS, scoring, nameOf);
  it('reports the base winner and flags changes against it', () => {
    const { base, rows } = run();
    expect(base.winnerChanged).toBe(false);
    expect(base.top3).toHaveLength(3);
    expect(rows.length).toBeGreaterThanOrEqual(15);
    for (const r of rows) expect(r.winnerChanged).toBe(r.winner !== base.winner);
  });
  it('offers the other disposal as a what-if, and none when there is no car to dispose of', () => {
    const sell = sensitivityRows({ ...DEFAULT_GLOBALS, disposal: 'sell' }, DEFAULT_VEHICLES, DEFAULT_OPTIONS, scoring, nameOf).rows.map((r) => r.change);
    const trade = sensitivityRows({ ...DEFAULT_GLOBALS, disposal: 'trade' }, DEFAULT_VEHICLES, DEFAULT_OPTIONS, scoring, nameOf).rows.map((r) => r.change);
    const none = sensitivityRows({ ...DEFAULT_GLOBALS, disposal: 'none' }, DEFAULT_VEHICLES, DEFAULT_OPTIONS.filter((o) => o.financing !== 'none'), scoring, nameOf).rows.map((r) => r.change);
    expect(sell.some((c) => c.startsWith('Trade in'))).toBe(true);
    expect(trade.some((c) => c.startsWith('Sell privately'))).toBe(true);
    expect(none.some((c) => c.startsWith('Trade in') || c.startsWith('Sell privately'))).toBe(false);
  });
  it('does not mutate its inputs', () => {
    const g = JSON.stringify(DEFAULT_GLOBALS);
    const v = JSON.stringify(DEFAULT_VEHICLES);
    run();
    expect(JSON.stringify(DEFAULT_GLOBALS)).toBe(g);
    expect(JSON.stringify(DEFAULT_VEHICLES)).toBe(v);
  });
  it('some change moves the Lexus rank (the scenarios are not all inert)', () => {
    const { base, rows } = run();
    expect(rows.some((r) => r.keepRank !== base.keepRank || r.winner !== base.winner || r.winnerScore !== base.winnerScore)).toBe(true);
  });
});

describe('buildPrompt', () => {
  const args = (over: Partial<PromptArgs> = {}): PromptArgs => ({
    scenario: 'I commute 40 miles a day and have solar at home',
    history: [],
    fields: [...fields.values()],
    results: [],
    sensitivity: sensitivityRows(DEFAULT_GLOBALS, DEFAULT_VEHICLES, DEFAULT_OPTIONS, scoring, nameOf),
    cars: [{ id: 'rav4h', name: 'RAV4 Hybrid', kind: 'hybrid', price: 33000, selected: false, group: 'hybrid' }],
    settings: { path: 'sell', mode: 'hybrid', scale: 'benchmark', aggregation: 'average', preset: 'balanced', view: 'both', horizonYears: 8 },
    currentCar: { name: 'Lexus LX 470', kind: 'ice', saleValue: 7000 },
    selectedCars: ['tesla'],
    ...over
  });
  it('contains the scenario, the field ids, the cars, the what-if table and the JSON contract', () => {
    const p = buildPrompt(args());
    expect(p).toContain('40 miles a day');
    expect(p).toContain('g..gasPrice');
    expect(p).toContain('rav4h');
    expect(p).toContain('Gas price 50% higher');
    expect(p).toContain('"flipFactors"');
    expect(p).toContain('0.07 means 7%');
  });
  it('handles an empty scenario and truncates a huge one', () => {
    expect(buildPrompt(args({ scenario: '' }))).toContain('did not describe a situation');
    expect(buildPrompt(args({ scenario: 'y'.repeat(50000) })).length).toBeLessThan(60000);
    expect(buildPrompt(args({ scenario: 'y'.repeat(50000) }))).not.toContain('y'.repeat(2500));
  });
  it('includes only the last three history turns', () => {
    const history = [1, 2, 3, 4, 5].map((n) => ({ user: `question-${n}`, summary: `answer-${n}` }));
    const p = buildPrompt(args({ history }));
    expect(p).not.toContain('question-1');
    expect(p).not.toContain('question-2');
    expect(p).toContain('question-5');
  });
  it('explains the path and the no-credit rule in the prompt', () => {
    const p = buildPrompt(args());
    expect(p).toContain('"trade"');
    expect(p).toContain('no sales-tax credit');
    expect(p).toContain('newCars');
    expect(p).toContain('THE CAR THEY HAVE NOW');
  });
  it('stays well under the 256 KiB input limit for the real catalog', () => {
    expect(new TextEncoder().encode(buildPrompt(args())).length).toBeLessThan(200_000);
  });
});
