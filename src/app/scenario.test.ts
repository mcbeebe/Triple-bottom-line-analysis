import { describe, expect, it } from 'vitest';
import { scoreOptions } from '../engine';
import { CATALOG } from '../data';
import { freshState, MAX_SELECTED } from './state';
import { optionsFor } from '../engine';
import { DEFAULT_SETTINGS, LEGACY_SCENARIO, PUBLIC_DEFAULTS, applyScenario, normalizeScenario, readQaScenario, scenarioFrom, type Scenario } from './scenario';
import { addCustomCar } from './mutations';

const kindOf = (id: string) => CATALOG.find((c) => c.vehicle.id === id)?.vehicle.kind;

describe('PUBLIC_DEFAULTS (decisions 7, 8, P1)', () => {
  it('is the older gas sedan with one EV, one hybrid and one gas car', () => {
    expect(PUBLIC_DEFAULTS.carPreset).toBe('sedan');
    expect(PUBLIC_DEFAULTS.selected).toEqual(['bolt', 'camryh', 'corolla']);
    expect(PUBLIC_DEFAULTS.selected.map(kindOf).sort()).toEqual(['ev', 'hybrid', 'ice']);
    expect(PUBLIC_DEFAULTS.selected.length).toBeLessThanOrEqual(MAX_SELECTED);
    expect(normalizeScenario(PUBLIC_DEFAULTS).problems).toEqual([]);
  });

  it('produces a scored answer with a keep option on the sell path and no NaN', () => {
    const s = applyScenario(freshState(), PUBLIC_DEFAULTS);
    const scored = scoreOptions(s.g, s.vehicles, optionsFor(s.vehicles, s.selected, true), {
      mode: s.mode, aggregation: s.aggregation, scale: s.scale, pillarWeights: s.weights, criteria: s.criteria
    });
    expect(scored.map((x) => x.spec.id).sort()).toEqual(['bolt-lease', 'bolt-loan', 'camryh-lease', 'camryh-loan', 'corolla-loan', 'keep'].sort());
    for (const x of scored) {
      expect(Number.isFinite(x.overall)).toBe(true);
      expect(Number.isFinite(x.result.netCostNPV)).toBe(true);
      expect(Number.isFinite(x.result.co2.total)).toBe(true);
    }
    expect(s.vehicles.find((v) => v.owned)!.short).toBe('My gas sedan');
  });

  it('does not mark a path as chosen (Step 1 still asks)', () => {
    expect(applyScenario(freshState(), PUBLIC_DEFAULTS).pathChosen).toBe(false);
  });
});

describe('LEGACY_SCENARIO (QA hook)', () => {
  it('reproduces today\'s initial state exactly', () => {
    expect(applyScenario(freshState(), LEGACY_SCENARIO)).toEqual(freshState());
  });

  it('can be applied over the public defaults to get back to today\'s state', () => {
    const s = applyScenario(applyScenario(freshState(), PUBLIC_DEFAULTS), LEGACY_SCENARIO);
    expect(s).toEqual(freshState());
  });
});

describe('readQaScenario', () => {
  it('accepts only the known name from the window global', () => {
    expect(readQaScenario({ __TBL_QA__: { scenario: 'legacy' } })).toBe('legacy');
    expect(readQaScenario({ __TBL_QA__: { scenario: 'evil' } })).toBeNull();
    expect(readQaScenario({ __TBL_QA__: 'legacy' })).toBeNull();
    expect(readQaScenario({})).toBeNull();
    expect(readQaScenario(undefined)).toBeNull();
  });
});

describe('scenario round trip and validation', () => {
  const sample: Scenario = {
    v: 1,
    path: 'trade',
    carPreset: 'suv',
    carOverrides: { price: 12500, mpg: 19 },
    miles: 12000,
    selected: ['tesla', 'camryh'],
    customCars: [
      { kind: 'ev', price: 41000, efficiency: 27, selected: true },
      { kind: 'ice', price: 22000, efficiency: 33, selected: false }
    ],
    edits: {},
    settings: DEFAULT_SETTINGS
  };

  it('scenarioFrom(applyScenario(s)) returns the same scenario', () => {
    expect(scenarioFrom(applyScenario(freshState(), sample))).toEqual(sample);
  });

  it('applies overrides to the owned car only, so they read as edited', () => {
    const s = applyScenario(freshState(), sample);
    const owned = s.vehicles.find((v) => v.owned)!;
    const dflt = s.defaults.find((v) => v.owned)!;
    expect([owned.price, owned.mpg]).toEqual([12500, 19]);
    expect([dflt.price, dflt.mpg]).toEqual([11000, 21]);
    expect(s.g.disposal).toBe('trade');
    expect(s.g.milesPerYear).toBe(12000);
  });

  it('renumbers custom cars custom1..n and keeps unselected ones out of the selection', () => {
    const s = freshState();
    s.selected = [];
    addCustomCar(s, { kind: 'hybrid' });
    addCustomCar(s, { kind: 'hybrid' });
    const t = applyScenario(s, sample);
    expect(t.vehicles.filter((v) => t.groups[v.id] === 'custom').map((v) => v.id)).toEqual(['custom1', 'custom2']);
    expect(t.customCount).toBe(2);
    expect(t.selected).toEqual(['tesla', 'camryh', 'custom1']);
  });

  it('"Something else" starts from the sedan values, named My car', () => {
    const s = applyScenario(freshState(), { ...PUBLIC_DEFAULTS, carPreset: 'custom' });
    const owned = s.vehicles.find((v) => v.owned)!;
    expect([owned.short, owned.price, owned.mpg]).toEqual(['My car', 9000, 28]);
    expect(s.carPreset).toBe('custom');
    expect(s.defaults.find((v) => v.owned)!.short).toBe('My car');
  });

  it('clamps numbers to the field ranges and reports it', () => {
    const r = normalizeScenario({ ...PUBLIC_DEFAULTS, miles: 30000, carOverrides: { price: 999999, mpg: 2 } });
    expect(r.scenario.miles).toBe(25000);
    expect(r.scenario.carOverrides).toEqual({ price: 150000, mpg: 8 });
    expect(r.problems.length).toBe(3);
  });

  it('rejects unknown cars, presets, paths and override keys', () => {
    const r = normalizeScenario({
      ...PUBLIC_DEFAULTS,
      path: 'fly' as never,
      carPreset: 'boat' as never,
      selected: ['bolt', 'nope', 'bolt', 'lx'],
      carOverrides: { price: 9000, embodiedT: 3 } as never
    });
    expect(r.scenario.path).toBe('sell');
    expect(r.scenario.carPreset).toBe('sedan');
    expect(r.scenario.selected).toEqual(['bolt']);
    expect(r.scenario.carOverrides).toEqual({ price: 9000 });
    // path, preset, 'nope', the duplicate 'bolt', the owned 'lx', and the 'embodiedT' key
    expect(r.problems.length).toBe(6);
  });

  it('keeps at most 4 selected cars, counting selected custom cars', () => {
    const r = normalizeScenario({
      ...PUBLIC_DEFAULTS,
      selected: ['bolt', 'camryh', 'corolla', 'tesla'],
      customCars: [{ kind: 'ev', price: 40000, efficiency: 30, selected: true }]
    });
    expect(r.scenario.selected).toEqual(['bolt', 'camryh', 'corolla']);
    expect(r.problems).toContain('Kept 4 cars; the limit is 4.');
  });

  it('clamps custom car values to the ranges the form allows', () => {
    const r = normalizeScenario({ ...PUBLIC_DEFAULTS, customCars: [{ kind: 'ev', price: 500, efficiency: 99, selected: true }] });
    expect(r.scenario.customCars[0]).toEqual({ kind: 'ev', price: 1000, efficiency: 60, selected: true });
  });
});

describe('edits and settings (Phase 3, share links)', () => {
  const withEdits: Scenario = {
    ...PUBLIC_DEFAULTS,
    selected: ['tesla', 'bolt'],
    customCars: [{ kind: 'ev', price: 41000, efficiency: 27, selected: true }],
    edits: {
      'g..gasPrice': 6,
      'g..firstTimeZev': 0,
      'bolt.loan.apr': 0.05,
      'tesla.lease.termMonths': 24,
      'custom1..insurancePerYear': 2500,
      'lx..annualValueLoss': 0.1,
      'rate.bolt.safety': 5,
      'rate.custom1.fit': 2,
      'cw.safety': 40
    },
    settings: { mode: 'metrics', scale: 'anchored', aggregation: 'weakest', preset: 'custom', weights: { planet: 0.5, people: 0.2, profit: 0.3 }, view: 'loan', embodied: 'full' }
  };

  it('round-trips globals, loan and lease fields, custom-car fields, owned-car extras, ratings, criterion weights and settings', () => {
    expect(scenarioFrom(applyScenario(freshState(), withEdits))).toEqual(withEdits);
  });

  it('applies them to state', () => {
    const s = applyScenario(freshState(), withEdits);
    expect(s.g.gasPrice).toBe(6);
    expect(s.g.firstTimeZev).toBe(false);
    expect(s.vehicles.find((v) => v.id === 'tesla')!.lease!.termMonths).toBe(24);
    expect(s.criteria.find((c) => c.id === 'safety')!.weight).toBe(40);
    expect([s.mode, s.scale, s.aggregation, s.preset, s.view, s.g.embodiedMode]).toEqual(['metrics', 'anchored', 'weakest', 'custom', 'loan', 'full']);
  });

  it('resets earlier edits when a new scenario is applied', () => {
    const s = applyScenario(freshState(), withEdits);
    applyScenario(s, PUBLIC_DEFAULTS);
    expect(scenarioFrom(s)).toEqual(PUBLIC_DEFAULTS);
  });

  it('drops edits it does not recognise and clamps the rest', () => {
    const r = normalizeScenario({
      ...PUBLIC_DEFAULTS,
      edits: { 'g..gasPrice': 999, 'g..milesPerYear': 9000, 'lx..price': 5000, 'nope..price': 1, 'custom3..price': 1, 'rate.bolt.safety': 9, 'cw.nope': 1, 'tesla.loan.monthly': 1 }
    });
    expect(Object.keys(r.scenario.edits)).toEqual(['g..gasPrice', 'rate.bolt.safety']);
    expect(r.scenario.edits['rate.bolt.safety']).toBe(5);
    expect(r.problems.length).toBe(6);
  });

  it('falls back to default settings for unknown values, and to balanced weights for bad custom weights', () => {
    const r = normalizeScenario({ ...PUBLIC_DEFAULTS, settings: { mode: 'x' as never, preset: 'custom', weights: { planet: 2, people: 0, profit: 0 } } });
    expect(r.scenario.settings.mode).toBe('hybrid');
    expect(r.scenario.settings.preset).toBe('balanced');
  });
});
