import { describe, expect, it } from 'vitest';
import {
  aggregate,
  anchoredScore,
  bandRating,
  benchmarkCo2,
  benchmarkCost,
  breakEvenGasPrice,
  computeOption,
  kwhPerMile,
  loanBalance,
  minMaxScore,
  normalizeWeights,
  optionsFor,
  paybackYear,
  peopleScore,
  pmt,
  scoreOptions,
  useEmissionsT,
  valueAt,
  weightSensitivity,
  WEIGHT_PRESETS,
  type Globals,
  type OptionSpec,
  type Scoring,
  type Vehicle
} from './engine';
import { CATALOG, DEFAULT_CRITERIA, DEFAULT_GLOBALS, DEFAULT_OPTIONS, DEFAULT_SELECTED, DEFAULT_VEHICLES, VEHICLE_META } from './data';

/** Plain globals: no escalation, no discounting, no tax, so hand math is exact. */
const flat = (over: Partial<Globals> = {}): Globals => ({
  ...DEFAULT_GLOBALS,
  horizonYears: 3,
  milesPerYear: 10000,
  gasPrice: 4,
  gasEscalation: 0,
  elecPrice: 0.3,
  elecEscalation: 0,
  discountRate: 0,
  salesTax: 0,
  chargerCost: 0,
  evRealWorldPenalty: 0,
  gasUpstreamKgPerGal: 0,
  loanInterestDeduction: false,
  firstTimeZev: false,
  cc4a: false,
  chargerRebate: 0,
  ...over
});

const car = (over: Partial<Vehicle> = {}): Vehicle => ({
  id: 'lx',
  name: 'Old',
  short: 'Old',
  kind: 'ice',
  owned: true,
  price: 10000,
  mpg: 20,
  kwhPer100mi: 0,
  realWorldAdj: 1,
  maintPerMile: 0.1,
  insurancePerYear: 1000,
  embodiedT: 0,
  depreciation5yr: 0,
  annualValueLoss: 0.1,
  materials: 4,
  ratings: {},
  ...over
});

const ev = (over: Partial<Vehicle> = {}): Vehicle => ({
  id: 'ev',
  name: 'EV',
  short: 'EV',
  kind: 'ev',
  owned: false,
  price: 40000,
  mpg: 0,
  kwhPer100mi: 30,
  realWorldAdj: 1,
  maintPerMile: 0.05,
  insurancePerYear: 2000,
  embodiedT: 9,
  depreciation5yr: 0.5,
  annualValueLoss: 0,
  loan: { apr: 0.06, termMonths: 60, down: 4000 },
  lease: { monthly: 500, dueAtSigning: 3000, termMonths: 36 },
  materials: 3,
  ratings: {},
  ...over
});

describe('loan math', () => {
  it('matches the standard amortization payment ($40k, 7%, 60 mo = $792.07)', () => {
    expect(pmt(40000, 0.07, 60)).toBeCloseTo(792.07, 1);
  });
  it('handles 0% APR and empty loans', () => {
    expect(pmt(12000, 0, 60)).toBe(200);
    expect(pmt(0, 0.07, 60)).toBe(0);
    expect(pmt(1000, 0.07, 0)).toBe(0);
  });
  it('balance is principal at 0 payments and ~0 at the end', () => {
    expect(loanBalance(30000, 0.06, 60, 0)).toBeCloseTo(30000, 6);
    expect(loanBalance(30000, 0.06, 60, 60)).toBeCloseTo(0, 4);
  });
  it('0% balance falls linearly', () => {
    expect(loanBalance(12000, 0, 60, 30)).toBeCloseTo(6000, 6);
  });
});

describe('valueAt', () => {
  it('owned vehicles lose a constant share per year', () => {
    expect(valueAt(car(), 2)).toBeCloseTo(10000 * 0.81, 6);
  });
  it('new vehicles hit the 5-year depreciation figure at year 5', () => {
    expect(valueAt(ev(), 5)).toBeCloseTo(20000, 6);
    expect(valueAt(ev(), 0)).toBe(40000);
  });
});

describe('emissions', () => {
  it('gasoline: 10k miles / 20 mpg x 8.887 kg/gal x 3 yrs', () => {
    const g = flat();
    expect(useEmissionsT(g, car())).toBeCloseTo(((30000 / 20) * 8.887) / 1000, 6);
  });
  it('EV: kWh/mi x grid factor, including the real-world penalty', () => {
    const g = flat({ gridKgPerKwh: 0.25, evRealWorldPenalty: 0.1 });
    const kwhMi = 0.3 * 1.1;
    expect(kwhPerMile(ev(), g)).toBeCloseTo(kwhMi, 9);
    expect(useEmissionsT(g, ev())).toBeCloseTo((30000 * kwhMi * 0.25) / 1000, 6);
  });
  it('allocates manufacturing emissions by years of use unless set to full', () => {
    const lx = car();
    const alloc = computeOption(flat({ horizonYears: 3, vehicleLifeYears: 15 }), ev(), 'loan', lx);
    expect(alloc.co2.embodied).toBeCloseTo(9 * (3 / 15), 9);
    const full = computeOption(flat({ embodiedMode: 'full' }), ev(), 'loan', lx);
    expect(full.co2.embodied).toBeCloseTo(9, 9);
  });
  it('never allocates more than the whole vehicle', () => {
    const r = computeOption(flat({ horizonYears: 15, vehicleLifeYears: 10 }), ev(), 'loan', car());
    expect(r.co2.embodied).toBeCloseTo(9, 9);
  });
  it('adds leakage only for replacement options', () => {
    const g = flat({ lxLeakage: 0.5 });
    const lx = car();
    const keep = computeOption(g, lx, 'none', lx);
    const rep = computeOption(g, ev(), 'loan', lx);
    expect(keep.co2.leakage).toBe(0);
    expect(rep.co2.leakage).toBeCloseTo(0.5 * useEmissionsT(g, lx), 9);
    expect(keep.co2.embodied).toBe(0);
  });
  it('total is the sum of its parts and per-mile is tonnes*1000/miles', () => {
    const r = computeOption(flat(), ev(), 'lease', car());
    expect(r.co2.total).toBeCloseTo(r.co2.use + r.co2.embodied + r.co2.leakage, 9);
    expect(r.co2PerMile).toBeCloseTo((r.co2.total * 1000) / 30000, 9);
  });
});

describe('keep (owned vehicle) costs', () => {
  it('equals running costs minus the residual value when flat', () => {
    const g = flat();
    const lx = car();
    const r = computeOption(g, lx, 'none', lx);
    const fuel = (10000 / 20) * 4 * 3;
    const maint = 10000 * 0.1 * 3;
    const ins = 1000 * 3;
    const residual = 10000 * Math.pow(0.9, 3);
    expect(r.components.energy).toBeCloseTo(fuel, 6);
    expect(r.netCostNominal).toBeCloseTo(fuel + maint + ins - residual, 6);
    expect(r.netCostNPV).toBeCloseTo(r.netCostNominal, 6);
    expect(r.upfrontCash).toBe(0);
  });
  it('gas escalation raises fuel cost year over year', () => {
    const lx = car();
    const a = computeOption(flat({ gasEscalation: 0 }), lx, 'none', lx);
    const b = computeOption(flat({ gasEscalation: 0.1 }), lx, 'none', lx);
    const expected = (10000 / 20) * 4 * (1 + 1.1 + 1.21);
    expect(b.components.energy).toBeCloseTo(expected, 6);
    expect(b.components.energy).toBeGreaterThan(a.components.energy);
  });
  it('discounting lowers the present value of a pure cost stream (no residual)', () => {
    const lx = car({ annualValueLoss: 1 });
    const a = computeOption(flat({ discountRate: 0 }), lx, 'none', lx);
    const b = computeOption(flat({ discountRate: 0.08 }), lx, 'none', lx);
    expect(b.netCostNPV).toBeLessThan(a.netCostNPV);
  });
  it('matches a hand-computed present value for a monthly cost stream', () => {
    const lx = car({ annualValueLoss: 1 });
    const r = 0.06;
    const g = flat({ discountRate: r, horizonYears: 2 });
    const monthly = ((10000 / 20) * 4 + 10000 * 0.1 + 1000) / 12;
    let pv = 0;
    for (let m = 1; m <= 24; m++) pv += monthly * Math.pow(1 + r, -m / 12);
    expect(computeOption(g, lx, 'none', lx).netCostNPV).toBeCloseTo(pv, 6);
  });
  it('a later residual is worth less today, so discounting raises the net cost of a kept asset', () => {
    const lx = car({ annualValueLoss: 0 });
    const a = computeOption(flat({ discountRate: 0 }), lx, 'none', lx);
    const b = computeOption(flat({ discountRate: 0.08 }), lx, 'none', lx);
    expect(b.netCostNPV).toBeGreaterThan(a.netCostNPV);
  });
  it('refuses financing "none" for a vehicle you do not own', () => {
    expect(() => computeOption(flat(), ev(), 'none', car())).toThrow();
  });
});

describe('loan purchase', () => {
  it('balances: capital + interest + running costs = nominal net cost', () => {
    const g = flat({ salesTax: 0.1, chargerCost: 1500, discountRate: 0.05 });
    const lx = car();
    const r = computeOption(g, ev(), 'loan', lx);
    const c = r.components;
    expect(c.capital + c.interest + c.energy + c.maintenance + c.insurance - r.incentives.loanDeduction).toBeCloseTo(r.netCostNominal, 4);
  });
  it('interest equals payments minus principal over a full term', () => {
    const g = flat({ horizonYears: 5, salesTax: 0 });
    const v = ev({ loan: { apr: 0.07, termMonths: 60, down: 0 } });
    const r = computeOption(g, v, 'loan', car());
    expect(r.components.interest).toBeCloseTo(pmt(40000, 0.07, 60) * 60 - 40000, 4);
    expect(r.monthlyPayment).toBeCloseTo(pmt(40000, 0.07, 60), 6);
  });
  it('pays off the remaining balance from resale when the horizon is shorter than the term', () => {
    const g = flat({ horizonYears: 3 });
    const v = ev({ loan: { apr: 0.06, termMonths: 60, down: 4000 } });
    const r = computeOption(g, v, 'loan', car());
    const principal = 36000;
    const pay = pmt(principal, 0.06, 60);
    const payoff = loanBalance(principal, 0.06, 60, 36);
    expect(r.components.interest).toBeCloseTo(4000 + pay * 36 + payoff - 40000, 4);
    const ops = r.components.energy + r.components.maintenance + r.components.insurance;
    const expectedNominal = ops - 10000 + 4000 + pay * 36 - (valueAt(v, 3) - payoff);
    expect(r.netCostNominal).toBeCloseTo(expectedNominal, 4);
  });
  it('sale of the old car and the charger land at t=0', () => {
    const g = flat({ chargerCost: 1500 });
    const r = computeOption(g, ev(), 'loan', car());
    expect(r.upfrontCash).toBeCloseTo(4000 + 1500 - 10000, 6);
  });
  it('adds sales tax to the financed amount', () => {
    const g = flat({ salesTax: 0.1 });
    const v = ev({ loan: { apr: 0, termMonths: 60, down: 0 } });
    const r = computeOption(g, v, 'loan', car());
    expect(r.monthlyPayment).toBeCloseTo(44000 / 60, 6);
  });
});

describe('lease', () => {
  it('a single 36-month term costs due-at-signing + 35 taxed payments', () => {
    const g = flat({ horizonYears: 3, salesTax: 0.1 });
    const r = computeOption(g, ev(), 'lease', car());
    expect(r.components.capital).toBeCloseTo(3000 + 35 * 550 - 10000, 4);
    expect(r.monthlyPayment).toBeCloseTo(550, 9);
  });
  it('chains a second lease when the horizon is 6 years', () => {
    const g = flat({ horizonYears: 6 });
    const r = computeOption(g, ev(), 'lease', car());
    expect(r.components.capital).toBeCloseTo(2 * (3000 + 35 * 500) - 10000, 4);
  });
  it('prorates a partial final cycle (4.5 yrs = 1.5 leases)', () => {
    const g = flat({ horizonYears: 4.5 });
    const r = computeOption(g, ev(), 'lease', car());
    const cycle = 3000 + 35 * 500;
    expect(r.components.capital).toBeCloseTo(cycle * 1.5 - 10000, 3);
  });
  it('has no resale value or loan interest', () => {
    const r = computeOption(flat(), ev(), 'lease', car());
    expect(r.components.interest).toBe(0);
  });
});

describe('payback', () => {
  it('detects when a cheaper-to-run option overtakes keeping the car', () => {
    const g = flat({ horizonYears: 10, gasPrice: 9, milesPerYear: 15000 });
    const lx = car({ mpg: 12, annualValueLoss: 0.02 });
    const cheap = ev({ price: 20000, loan: { apr: 0, termMonths: 60, down: 20000 }, insurancePerYear: 1000 });
    const keep = computeOption(g, lx, 'none', lx);
    const opt = computeOption(g, cheap, 'loan', lx);
    const y = paybackYear(opt, keep);
    expect(y).not.toBeNull();
    expect(opt.position[y as number]).toBeLessThan(keep.position[y as number]);
    expect(opt.position[y as number - 1]).toBeGreaterThanOrEqual(keep.position[y as number - 1]);
  });
  it('returns null when it never pays back', () => {
    const g = flat({ gasPrice: 1, milesPerYear: 2000 });
    const lx = car();
    const keep = computeOption(g, lx, 'none', lx);
    const opt = computeOption(g, ev(), 'lease', lx);
    expect(paybackYear(opt, keep)).toBeNull();
  });
  it('final position equals the nominal net cost', () => {
    const g = flat();
    const lx = car();
    const r = computeOption(g, ev(), 'loan', lx);
    expect(r.position[r.position.length - 1]).toBeCloseTo(r.netCostNominal, 4);
    const k = computeOption(g, lx, 'none', lx);
    expect(k.position[k.position.length - 1]).toBeCloseTo(k.netCostNominal, 4);
  });
});

describe('break-even gas price', () => {
  it('equalises the NPV of keeping and replacing', () => {
    const g = flat({ discountRate: 0.04, gasEscalation: 0.02 });
    const lx = car({ mpg: 13 });
    const v = ev();
    const p = breakEvenGasPrice(g, v, 'loan', lx) as number;
    expect(p).toBeGreaterThan(0);
    const gg = { ...g, gasPrice: p };
    const a = computeOption(gg, lx, 'none', lx).netCostNPV;
    const b = computeOption(gg, v, 'loan', lx).netCostNPV;
    expect(a).toBeCloseTo(b, 2);
  });
  it('is null when no gas price up to $40 closes the gap', () => {
    const g = flat({ milesPerYear: 100, horizonYears: 2 });
    expect(breakEvenGasPrice(g, ev({ price: 90000 }), 'loan', car())).toBeNull();
  });
  it('is 0 when the replacement already wins at free gas', () => {
    const g = flat();
    const lx = car({ insurancePerYear: 9000, maintPerMile: 0.5 });
    const v = ev({ price: 10000, loan: { apr: 0, termMonths: 60, down: 10000 }, insurancePerYear: 0, maintPerMile: 0 });
    expect(breakEvenGasPrice(g, v, 'loan', lx)).toBe(0);
  });
});

describe('score helpers', () => {
  it('anchoredScore: reference = 50, better > 50, worse < 50, symmetric, monotone, never clamped', () => {
    const out = anchoredScore([100, 60, 140, 0, 400], 100, 100);
    expect(out[0]).toBeCloseTo(50, 9);
    expect(out[1]).toBeGreaterThan(50);
    expect(out[2]).toBeLessThan(50);
    expect(out[1] + out[2]).toBeCloseTo(100, 9); // symmetric around the reference
    expect(out[3]).toBeGreaterThan(out[1]);
    expect(out[4]).toBeGreaterThan(0);
    expect(out[4]).toBeLessThan(out[2]);
  });
  it('anchoredScore works when the reference is zero or negative (net cost below zero)', () => {
    const [a, b, c] = anchoredScore([-2071, 5000, 15504], -2071, 12000);
    expect(a).toBeCloseTo(50, 9);
    expect(b).toBeLessThan(a);
    expect(c).toBeLessThan(b);
    expect(new Set([a, b, c]).size).toBe(3);
  });
  it('anchoredScore falls back to a neutral 50 only when there is no usable scale', () => {
    expect(anchoredScore([10, -5], 0, 0)).toEqual([50, 50]);
    expect(anchoredScore([10], 3, -3)).toEqual([50]);
  });
  it('minMaxScore maps best to 100 and worst to 10', () => {
    expect(minMaxScore([10, 20, 30])).toEqual([100, 55, 10]);
  });
  it('minMaxScore gives everyone 100 when all values are equal', () => {
    expect(minMaxScore([5, 5, 5])).toEqual([100, 100, 100]);
  });
  it('bandRating covers the 1-5 range at the thresholds', () => {
    expect([100, 85, 84.9, 65, 45, 25, 24.9, 0].map(bandRating)).toEqual([5, 5, 4, 4, 3, 2, 1, 1]);
  });
  it('normalizeWeights sums to one and guards against all-zero weights', () => {
    const n = normalizeWeights({ planet: 2, people: 1, profit: 1 });
    expect(n.planet + n.people + n.profit).toBeCloseTo(1, 9);
    expect(normalizeWeights({ planet: 0, people: 0, profit: 0 }).planet).toBeCloseTo(1 / 3, 9);
  });
  it('every preset is already normalised', () => {
    for (const w of Object.values(WEIGHT_PRESETS)) expect(w.planet + w.people + w.profit).toBeCloseTo(1, 9);
  });
  it('average aggregation is a weighted mean; weakest-link punishes a low pillar', () => {
    const p = { planet: 100, people: 100, profit: 10 };
    const w = WEIGHT_PRESETS.balanced;
    const avg = aggregate(p, w, 'average');
    const geo = aggregate(p, w, 'weakest');
    expect(avg).toBeCloseTo(70, 6);
    expect(geo).toBeCloseTo(Math.pow(100 * 100 * 10, 1 / 3), 6);
    expect(geo).toBeLessThan(avg);
  });
  it('equal pillars give identical results under both aggregations', () => {
    const p = { planet: 60, people: 60, profit: 60 };
    expect(aggregate(p, WEIGHT_PRESETS.wallet, 'average')).toBeCloseTo(60, 6);
    expect(aggregate(p, WEIGHT_PRESETS.wallet, 'weakest')).toBeCloseTo(60, 6);
  });
  it('peopleScore weights ratings and can use objective criteria only', () => {
    const crit = [
      { id: 'a', label: 'A', weight: 3, objective: true },
      { id: 'b', label: 'B', weight: 1, objective: false }
    ];
    const v = car({ ratings: { a: 5, b: 1 } });
    expect(peopleScore(v, crit, false)).toBeCloseTo((3 * 100 + 0) / 4, 6);
    expect(peopleScore(v, crit, true)).toBeCloseTo(100, 6);
    expect(peopleScore(v, [], false)).toBe(50);
  });
});

describe('scoreOptions with the Lexus test case', () => {
  const scoring = (
    mode: Scoring['mode'],
    aggregation: Scoring['aggregation'] = 'average',
    scale: Scoring['scale'] = 'anchored'
  ): Scoring => ({
    mode,
    aggregation,
    scale,
    pillarWeights: WEIGHT_PRESETS.balanced,
    criteria: DEFAULT_CRITERIA
  });

  it('builds one scored row per option with ranks 1..n and pillars in 0-100', () => {
    for (const mode of ['hybrid', 'metrics', 'ratings'] as const) {
      const s = scoreOptions(DEFAULT_GLOBALS, DEFAULT_VEHICLES, DEFAULT_OPTIONS, scoring(mode));
      expect(s).toHaveLength(DEFAULT_OPTIONS.length);
      expect(s.map((x) => x.rank).sort((a, b) => a - b)).toEqual(DEFAULT_OPTIONS.map((_, i) => i + 1));
      for (const x of s) {
        for (const p of Object.values(x.pillars)) {
          expect(p).toBeGreaterThanOrEqual(0);
          expect(p).toBeLessThanOrEqual(100);
        }
        expect(x.overall).toBeGreaterThan(0);
      }
    }
  });

  it('shows the expected trade-off: keeping is cheapest, EVs cut lifecycle CO2e', () => {
    const s = scoreOptions(DEFAULT_GLOBALS, DEFAULT_VEHICLES, DEFAULT_OPTIONS, scoring('hybrid'));
    const keep = s.find((x) => x.spec.id === 'keep') as (typeof s)[number];
    const others = s.filter((x) => x.spec.id !== 'keep');
    for (const o of others) {
      expect(o.result.netCostNPV).toBeGreaterThan(keep.result.netCostNPV);
      expect(o.result.co2.total).toBeLessThan(keep.result.co2.total);
    }
    expect(keep.pillars.profit).toBeCloseTo(50, 9); // status quo anchor
    const rel = scoreOptions(DEFAULT_GLOBALS, DEFAULT_VEHICLES, DEFAULT_OPTIONS, scoring('hybrid', 'average', 'relative'));
    expect((rel.find((x) => x.spec.id === 'keep') as (typeof rel)[number]).pillars.profit).toBe(100);
  });

  it('profit scores still respond to assumptions when keeping the car has a negative net cost', () => {
    // a high sale/residual value makes the Lexus NPV negative; the profit pillar must not freeze at 50
    const rich = DEFAULT_VEHICLES.map((v) => (v.owned ? { ...v, price: 60000, annualValueLoss: 0 } : v));
    const g = { ...DEFAULT_GLOBALS, horizonYears: 3 };
    const keepNpv = computeOption(g, rich[0], 'none', rich[0]).netCostNPV;
    expect(keepNpv).toBeLessThan(0);
    const s = scoreOptions(g, rich, DEFAULT_OPTIONS, scoring('hybrid'));
    const profits = s.map((x) => Math.round(x.pillars.profit * 1000));
    expect(new Set(profits).size).toBeGreaterThan(3);
    const cheap = scoreOptions({ ...g, gasPrice: 12 }, rich, DEFAULT_OPTIONS, scoring('hybrid'));
    const profitOf = (arr: typeof s, id: string) => (arr.find((x) => x.spec.id === id) as (typeof s)[number]).pillars.profit;
    expect(profitOf(s, 'keep')).toBeCloseTo(50, 9); // the status quo is the anchor by definition
    expect(profitOf(cheap, 'bolt-loan')).toBeGreaterThan(profitOf(s, 'bolt-loan') + 1); // pricier gas helps the EV
    expect(profitOf(s, 'bolt-loan')).not.toBeCloseTo(50, 1);
  });

  it('anchored scores do not move when another option is removed; relative scores do', () => {
    const fewer = DEFAULT_OPTIONS.filter((o: OptionSpec) => o.id !== 'rivian-lease');
    const pick = (s: ReturnType<typeof scoreOptions>, id: string) => (s.find((x) => x.spec.id === id) as (typeof s)[number]).pillars;
    const a1 = scoreOptions(DEFAULT_GLOBALS, DEFAULT_VEHICLES, DEFAULT_OPTIONS, scoring('hybrid'));
    const a2 = scoreOptions(DEFAULT_GLOBALS, DEFAULT_VEHICLES, fewer, scoring('hybrid'));
    expect(pick(a2, 'tesla-loan').profit).toBeCloseTo(pick(a1, 'tesla-loan').profit, 9);
    const r1 = scoreOptions(DEFAULT_GLOBALS, DEFAULT_VEHICLES, DEFAULT_OPTIONS, scoring('hybrid', 'average', 'relative'));
    const r2 = scoreOptions(DEFAULT_GLOBALS, DEFAULT_VEHICLES, fewer, scoring('hybrid', 'average', 'relative'));
    expect(pick(r2, 'tesla-loan').profit).not.toBeCloseTo(pick(r1, 'tesla-loan').profit, 3);
  });

  it('leasing repeatedly costs more than financing the same car over 8 years', () => {
    const s = scoreOptions(DEFAULT_GLOBALS, DEFAULT_VEHICLES, DEFAULT_OPTIONS, scoring('hybrid'));
    const get = (id: string) => (s.find((x) => x.spec.id === id) as (typeof s)[number]).result.netCostNPV;
    expect(get('tesla-lease')).toBeGreaterThan(get('tesla-loan'));
    expect(get('bolt-lease')).toBeGreaterThan(get('bolt-loan'));
  });

  it('metrics mode ignores subjective criteria', () => {
    const subjective = DEFAULT_CRITERIA.map((c) => (c.objective ? c : { ...c, weight: 100 }));
    const a = scoreOptions(DEFAULT_GLOBALS, DEFAULT_VEHICLES, DEFAULT_OPTIONS, scoring('metrics'));
    const b = scoreOptions(DEFAULT_GLOBALS, DEFAULT_VEHICLES, DEFAULT_OPTIONS, { ...scoring('metrics'), criteria: subjective });
    a.forEach((x, i) => expect(x.pillars.people).toBeCloseTo(b[i].pillars.people, 9));
  });

  it('raising gas prices improves the replacement options relative to keeping', () => {
    const lo = scoreOptions({ ...DEFAULT_GLOBALS, gasPrice: 3 }, DEFAULT_VEHICLES, DEFAULT_OPTIONS, scoring('hybrid'));
    const hi = scoreOptions({ ...DEFAULT_GLOBALS, gasPrice: 12 }, DEFAULT_VEHICLES, DEFAULT_OPTIONS, scoring('hybrid'));
    const gap = (s: typeof lo) =>
      (s.find((x) => x.spec.id === 'bolt-loan') as (typeof s)[number]).result.netCostNPV -
      (s.find((x) => x.spec.id === 'keep') as (typeof s)[number]).result.netCostNPV;
    expect(gap(hi)).toBeLessThan(gap(lo));
  });

  it('throws when no owned vehicle is defined', () => {
    const noOwned = DEFAULT_VEHICLES.map((v) => ({ ...v, owned: false }));
    expect(() => scoreOptions(DEFAULT_GLOBALS, noOwned, DEFAULT_OPTIONS, scoring('hybrid'))).toThrow();
  });

  it('sensitivity covers every preset under both aggregations with valid winners', () => {
    const rows = weightSensitivity(DEFAULT_GLOBALS, DEFAULT_VEHICLES, DEFAULT_OPTIONS, scoring('hybrid'));
    expect(rows).toHaveLength(Object.keys(WEIGHT_PRESETS).length * 2);
    const ids = new Set(DEFAULT_OPTIONS.map((o: OptionSpec) => o.id));
    for (const r of rows) expect(ids.has(r.winnerId)).toBe(true);
  });
});

describe('upstream gasoline emissions', () => {
  it('adds well-to-tank emissions to every gallon burned', () => {
    const g = flat({ gasUpstreamKgPerGal: 2.86 });
    expect(useEmissionsT(g, car())).toBeCloseTo(((30000 / 20) * (8.887 + 2.86)) / 1000, 6);
  });
  it('treats a hybrid like a gasoline car (mpg-driven fuel and emissions)', () => {
    const hy = car({ id: 'hy', kind: 'hybrid', owned: false, mpg: 50, price: 30000, loan: { apr: 0, termMonths: 60, down: 0 } });
    const g = flat();
    expect(useEmissionsT(g, hy)).toBeCloseTo(((30000 / 50) * 8.887) / 1000, 6);
    expect(computeOption(g, hy, 'loan', car()).components.energy).toBeCloseTo((10000 / 50) * 4 * 3, 6);
  });
  it('upstream emissions raise the Lexus footprint more than an EV footprint', () => {
    const lx = car();
    const a = flat({ gasUpstreamKgPerGal: 0 });
    const b = flat({ gasUpstreamKgPerGal: 3 });
    expect(computeOption(b, lx, 'none', lx).co2.use).toBeGreaterThan(computeOption(a, lx, 'none', lx).co2.use);
    expect(computeOption(b, ev(), 'loan', lx).co2.use).toBeCloseTo(computeOption(a, ev(), 'loan', lx).co2.use, 9);
  });
});

describe('federal car-loan interest deduction', () => {
  const dg = (over: Partial<Globals> = {}) =>
    flat({ loanInterestDeduction: true, marginalTaxRate: 0.22, magi: 100000, jointFiling: true, deductionMonths: 60, ...over });
  const loanCar = (over: Partial<Vehicle> = {}) =>
    ev({ usAssembled: true, loan: { apr: 0.07, termMonths: 60, down: 0 }, ...over });

  it('saves marginal-rate x interest for an eligible, U.S.-assembled loan', () => {
    const g = dg({ horizonYears: 5 });
    const r = computeOption(g, loanCar(), 'loan', car());
    expect(r.incentives.loanDeduction).toBeCloseTo(r.components.interest * 0.22, 4);
    const none = computeOption(dg({ loanInterestDeduction: false, horizonYears: 5 }), loanCar(), 'loan', car());
    expect(none.netCostNominal - r.netCostNominal).toBeCloseTo(r.incentives.loanDeduction, 4);
  });
  it('gives nothing for leases, foreign-assembled cars, or when switched off', () => {
    const g = dg();
    expect(computeOption(g, loanCar(), 'lease', car()).incentives.loanDeduction).toBe(0);
    expect(computeOption(g, loanCar({ usAssembled: false }), 'loan', car()).incentives.loanDeduction).toBe(0);
    expect(computeOption(dg({ loanInterestDeduction: false }), loanCar(), 'loan', car()).incentives.loanDeduction).toBe(0);
  });
  it('only counts interest paid inside the eligible months (law ends after 2028)', () => {
    const full = computeOption(dg({ horizonYears: 5 }), loanCar(), 'loan', car()).incentives.loanDeduction;
    const first26 = computeOption(dg({ horizonYears: 5, deductionMonths: 26 }), loanCar(), 'loan', car()).incentives.loanDeduction;
    expect(first26).toBeLessThan(full);
    expect(first26).toBeGreaterThan(0);
    expect(computeOption(dg({ deductionMonths: 0 }), loanCar(), 'loan', car()).incentives.loanDeduction).toBe(0);
  });
  it('phases out by $200 per $1,000 of income over the threshold', () => {
    // huge loan so the $10,000 cap binds in year 1
    const big = loanCar({ price: 400000, loan: { apr: 0.08, termMonths: 60, down: 0 } });
    const atCap = computeOption(dg({ horizonYears: 1, deductionMonths: 12, magi: 200000 }), big, 'loan', car()).incentives.loanDeduction;
    expect(atCap).toBeCloseTo(10000 * 0.22, 4);
    const over25k = computeOption(dg({ horizonYears: 1, deductionMonths: 12, magi: 225000 }), big, 'loan', car()).incentives.loanDeduction;
    expect(over25k).toBeCloseTo((10000 - 0.2 * 25000) * 0.22, 4);
    const gone = computeOption(dg({ horizonYears: 1, deductionMonths: 12, magi: 260000 }), big, 'loan', car()).incentives.loanDeduction;
    expect(gone).toBe(0);
  });
  it('uses the lower $100k threshold for single filers', () => {
    const big = loanCar({ price: 400000, loan: { apr: 0.08, termMonths: 60, down: 0 } });
    const single = computeOption(dg({ horizonYears: 1, deductionMonths: 12, magi: 125000, jointFiling: false }), big, 'loan', car());
    expect(single.incentives.loanDeduction).toBeCloseTo((10000 - 0.2 * 25000) * 0.22, 4);
  });
});

describe('California incentives', () => {
  it('MyFirstEV: $3,500 off the up-front cash for loan and lease, only for BEVs that still have funding', () => {
    const lx = car();
    const rebated = ev({ zevRebate: 3500 });
    const off = flat({ firstTimeZev: false });
    const on = flat({ firstTimeZev: true });
    for (const fin of ['loan', 'lease'] as const) {
      const a = computeOption(off, rebated, fin, lx);
      const b = computeOption(on, rebated, fin, lx);
      expect(a.netCostNominal - b.netCostNominal).toBeCloseTo(3500, 6);
      expect(b.incentives.zevRebate).toBe(3500);
    }
    expect(computeOption(on, ev({ zevRebate: 0 }), 'loan', lx).incentives.zevRebate).toBe(0);
    const hybrid = car({ id: 'h', kind: 'hybrid', owned: false, zevRebate: 3500, loan: { apr: 0, termMonths: 60, down: 0 } });
    expect(computeOption(on, hybrid, 'loan', lx).incentives.zevRebate).toBe(0);
  });
  it('Clean Cars 4 All: grant in, no sale proceeds, no leakage, charger funded', () => {
    const lx = car();
    const g = flat({ cc4a: true, cc4aEvGrant: 5500, cc4aCharger: 2000, chargerCost: 1500, lxLeakage: 0.5 });
    const base = computeOption({ ...g, cc4a: false }, ev(), 'loan', lx);
    const scrap = computeOption(g, ev(), 'loan', lx);
    expect(scrap.incentives.lxScrapped).toBe(true);
    expect(scrap.co2.leakage).toBe(0);
    expect(base.co2.leakage).toBeGreaterThan(0);
    // cash effect: lose the $10,000 sale, gain $5,500 grant, save the whole $1,500 charger
    expect(scrap.netCostNominal - base.netCostNominal).toBeCloseTo(10000 - 5500 - 1500, 4);
    expect(scrap.incentives.chargerSavings).toBe(1500);
  });
  it('Clean Cars 4 All does not apply to a gasoline-only replacement', () => {
    const lx = car();
    const gas = car({ id: 'g', kind: 'ice', owned: false, price: 25000, loan: { apr: 0, termMonths: 60, down: 0 } });
    const r = computeOption(flat({ cc4a: true }), gas, 'loan', lx);
    expect(r.incentives.lxScrapped).toBe(false);
    expect(r.incentives.cc4aGrant).toBe(0);
    expect(r.co2.leakage).toBeGreaterThan(0);
  });
  it('hybrids get the hybrid grant', () => {
    const lx = car();
    const hy = car({ id: 'h', kind: 'hybrid', owned: false, price: 30000, loan: { apr: 0, termMonths: 60, down: 0 } });
    const r = computeOption(flat({ cc4a: true, cc4aHybridGrant: 5000 }), hy, 'loan', lx);
    expect(r.incentives.cc4aGrant).toBe(5000);
  });
  it('utility charger rebate cannot push the charger cost below zero', () => {
    const lx = car();
    const r = computeOption(flat({ chargerCost: 1500, chargerRebate: 4000 }), ev(), 'loan', lx);
    expect(r.incentives.chargerSavings).toBe(1500);
    expect(r.upfrontCash).toBeCloseTo(4000 - 10000, 6);
  });
  it('incentives never change the owned-car (keep) option', () => {
    const lx = car();
    const a = computeOption(flat(), lx, 'none', lx);
    const b = computeOption(flat({ firstTimeZev: true, cc4a: true, chargerRebate: 500 }), lx, 'none', lx);
    expect(b.netCostNPV).toBeCloseTo(a.netCostNPV, 9);
    expect(b.incentives.zevRebate + b.incentives.cc4aGrant + b.incentives.loanDeduction).toBe(0);
  });
});

describe('default data sanity', () => {
  it('has exactly one owned vehicle and every option references a real vehicle', () => {
    expect(DEFAULT_VEHICLES.filter((v) => v.owned)).toHaveLength(1);
    const ids = new Set(DEFAULT_VEHICLES.map((v) => v.id));
    for (const o of DEFAULT_OPTIONS) expect(ids.has(o.vehicleId)).toBe(true);
  });
  it('every vehicle has a rating for every criterion between 1 and 5', () => {
    for (const v of DEFAULT_VEHICLES) {
      for (const c of DEFAULT_CRITERIA) {
        expect(v.ratings[c.id]).toBeGreaterThanOrEqual(1);
        expect(v.ratings[c.id]).toBeLessThanOrEqual(5);
      }
    }
  });
  it('criterion weights are positive', () => {
    for (const c of DEFAULT_CRITERIA) expect(c.weight).toBeGreaterThan(0);
  });
  it('financed options have loan or lease terms', () => {
    for (const o of DEFAULT_OPTIONS) {
      const v = DEFAULT_VEHICLES.find((x) => x.id === o.vehicleId) as Vehicle;
      if (o.financing === 'loan') expect(v.loan).toBeDefined();
      if (o.financing === 'lease') expect(v.lease).toBeDefined();
    }
  });
});

describe('vehicle catalog and option building', () => {
  it('builds loan and lease options only where terms exist, keeping the owned car first', () => {
    const opts = optionsFor(DEFAULT_VEHICLES, ['rav4h', 'corolla', 'hlh']);
    expect(opts[0].id).toBe('keep');
    expect(opts.map((o: OptionSpec) => o.id)).toEqual(['keep', 'rav4h-loan', 'rav4h-lease', 'hlh-loan', 'corolla-loan']);
  });
  it('an unselected vehicle never appears; the owned car always does', () => {
    const opts = optionsFor(DEFAULT_VEHICLES, []);
    expect(opts.map((o: OptionSpec) => o.id)).toEqual(['keep']);
  });
  it('default selection reproduces the original four-vehicle test case', () => {
    expect(DEFAULT_SELECTED).toEqual(['tesla', 'rivian', 'bolt']);
    expect(DEFAULT_OPTIONS).toHaveLength(7);
  });
  it('catalog covers EVs, hybrids and gas cars with unique ids', () => {
    const groups = new Set(CATALOG.map((d) => d.group));
    expect([...groups].sort()).toEqual(['ev', 'gas', 'hybrid', 'owned']);
    const ids = CATALOG.map((d) => d.vehicle.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const d of CATALOG) {
      const v = d.vehicle;
      expect(v.kind === (d.group === 'owned' ? 'ice' : d.group === 'gas' ? 'ice' : d.group)).toBe(true);
      expect(VEHICLE_META[v.id]).toBeDefined();
      if (v.kind === 'ev') expect(v.kwhPer100mi).toBeGreaterThan(0);
      else expect(v.mpg).toBeGreaterThan(0);
    }
  });
  it('every catalog vehicle computes finite results for every option it offers', () => {
    const opts = optionsFor(DEFAULT_VEHICLES, DEFAULT_VEHICLES.filter((v) => !v.owned).map((v) => v.id));
    const s = scoreOptions(DEFAULT_GLOBALS, DEFAULT_VEHICLES, opts, { mode: 'hybrid', aggregation: 'average', scale: 'anchored', pillarWeights: WEIGHT_PRESETS.balanced, criteria: DEFAULT_CRITERIA });
    expect(s.length).toBe(opts.length);
    for (const x of s) {
      expect(Number.isFinite(x.result.netCostNPV)).toBe(true);
      expect(Number.isFinite(x.result.co2.total)).toBe(true);
      expect(Number.isFinite(x.overall)).toBe(true);
    }
  });
  it('hybrids emit less than the gas equivalent and more than the EVs on the default grid', () => {
    const g = DEFAULT_GLOBALS;
    const byId = (id: string) => DEFAULT_VEHICLES.find((v) => v.id === id) as Vehicle;
    const lx = byId('lx');
    const co2 = (id: string) => computeOption(g, byId(id), 'loan', lx).co2.use;
    expect(co2('crvh')).toBeLessThan(co2('crvg'));
    expect(co2('bolt')).toBeLessThan(co2('crvh'));
  });
  it('MyFirstEV default: Tesla $0 (closed); Rivian, Bolt, Equinox EV, Ioniq 5 $3,500; hybrids and gas $0', () => {
    const rebate = (id: string) => (DEFAULT_VEHICLES.find((v) => v.id === id) as Vehicle).zevRebate ?? 0;
    expect(rebate('tesla')).toBe(0);
    for (const id of ['rivian', 'bolt', 'equinoxev', 'ioniq5']) expect(rebate(id)).toBe(3500);
    for (const id of ['rav4h', 'corolla', 'hlg']) expect(rebate(id)).toBe(0);
  });
});

describe('benchmark scale (default): every car, including the Lexus, responds to its own inputs', () => {
  const bench = (): Scoring => ({ mode: 'hybrid', aggregation: 'average', scale: 'benchmark', pillarWeights: WEIGHT_PRESETS.balanced, criteria: DEFAULT_CRITERIA });
  const pick = (s: ReturnType<typeof scoreOptions>, id: string) => (s.find((x) => x.spec.id === id) as (typeof s)[number]).pillars;

  it('benchmark cost is the AAA fixed cost plus per-mile cost at your mileage, discounted', () => {
    const g = flat({ horizonYears: 1, milesPerYear: 15000, discountRate: 0 });
    expect(benchmarkCost(g)).toBeCloseTo(11577, 4);
    const half = flat({ horizonYears: 1, milesPerYear: 0, discountRate: 0 });
    expect(benchmarkCost(half)).toBeCloseTo(11577 - 15000 * (0.13 + 0.1104), 4);
    expect(benchmarkCost(flat({ horizonYears: 1, milesPerYear: 15000, discountRate: 0.1 }))).toBeLessThan(11577);
  });
  it('benchmark CO2 uses 400 g/mi tailpipe plus gasoline upstream plus shared manufacturing', () => {
    const g = flat({ horizonYears: 3, milesPerYear: 10000, gasUpstreamKgPerGal: 0, vehicleLifeYears: 15 });
    expect(benchmarkCo2(g)).toBeCloseTo(0.4 * 30 + 6 * (3 / 15), 6);
    const withUp = flat({ horizonYears: 3, milesPerYear: 10000, gasUpstreamKgPerGal: 8.887, vehicleLifeYears: 15 });
    expect(benchmarkCo2(withUp)).toBeGreaterThan(benchmarkCo2(g));
  });
  it('the Lexus profit score rises when its running costs fall (the reported complaint)', () => {
    const cheaper = DEFAULT_VEHICLES.map((v) => (v.owned ? { ...v, maintPerMile: 0.05, insurancePerYear: 400 } : v));
    const a = pick(scoreOptions(DEFAULT_GLOBALS, DEFAULT_VEHICLES, DEFAULT_OPTIONS, bench()), 'keep').profit;
    const b = pick(scoreOptions(DEFAULT_GLOBALS, cheaper, DEFAULT_OPTIONS, bench()), 'keep').profit;
    expect(b).toBeGreaterThan(a + 1);
  });
  it('the Lexus profit score also rises when its resale value rises or the horizon is short and it is paid off', () => {
    const richer = DEFAULT_VEHICLES.map((v) => (v.owned ? { ...v, price: 20000 } : v));
    const a = pick(scoreOptions(DEFAULT_GLOBALS, DEFAULT_VEHICLES, DEFAULT_OPTIONS, bench()), 'keep').profit;
    const b = pick(scoreOptions(DEFAULT_GLOBALS, richer, DEFAULT_OPTIONS, bench()), 'keep').profit;
    expect(b).toBeGreaterThan(a);
  });
  it('the Lexus planet score rises when its fuel economy improves', () => {
    const better = DEFAULT_VEHICLES.map((v) => (v.owned ? { ...v, mpg: 25 } : v));
    const a = pick(scoreOptions(DEFAULT_GLOBALS, DEFAULT_VEHICLES, DEFAULT_OPTIONS, bench()), 'keep').planet;
    const b = pick(scoreOptions(DEFAULT_GLOBALS, better, DEFAULT_OPTIONS, bench()), 'keep').planet;
    expect(b).toBeGreaterThan(a + 1);
  });
  it('profit scores stay distinct and finite even when the Lexus net cost is negative', () => {
    const rich = DEFAULT_VEHICLES.map((v) => (v.owned ? { ...v, price: 60000, annualValueLoss: 0 } : v));
    const g = { ...DEFAULT_GLOBALS, horizonYears: 3 };
    const s = scoreOptions(g, rich, DEFAULT_OPTIONS, bench());
    expect(new Set(s.map((x) => Math.round(x.pillars.profit * 1000))).size).toBeGreaterThan(4);
    for (const x of s) expect(Number.isFinite(x.overall)).toBe(true);
  });
  it('scores do not depend on which other cars are being compared', () => {
    const fewer = DEFAULT_OPTIONS.filter((o: OptionSpec) => o.id !== 'rivian-lease');
    const a = pick(scoreOptions(DEFAULT_GLOBALS, DEFAULT_VEHICLES, DEFAULT_OPTIONS, bench()), 'tesla-loan');
    const b = pick(scoreOptions(DEFAULT_GLOBALS, DEFAULT_VEHICLES, fewer, bench()), 'tesla-loan');
    expect(b.profit).toBeCloseTo(a.profit, 9);
    expect(b.planet).toBeCloseTo(a.planet, 9);
  });
  it('the status-quo scale still pins the Lexus at exactly 50 (by design)', () => {
    const anch = scoreOptions(DEFAULT_GLOBALS, DEFAULT_VEHICLES, DEFAULT_OPTIONS, { ...bench(), scale: 'anchored' });
    expect(pick(anch, 'keep').profit).toBeCloseTo(50, 9);
  });
});

describe('disposal path: sell, trade in, or no car', () => {
  const lxV = DEFAULT_VEHICLES.find((v) => v.owned) as Vehicle;
  const bolt = DEFAULT_VEHICLES.find((v) => v.id === 'bolt') as Vehicle;
  const run = (g: Partial<Globals>) => computeOption({ ...DEFAULT_GLOBALS, ...g }, bolt, 'loan', lxV);

  it('selling privately credits the full sale value up front', () => {
    const sell = run({ disposal: 'sell' });
    const none = run({ disposal: 'none' });
    expect(none.upfrontCash - sell.upfrontCash).toBeCloseTo(lxV.price, 6);
  });
  it('a trade-in credits the sale value minus the trade-in discount', () => {
    const sell = run({ disposal: 'sell' });
    const trade = run({ disposal: 'trade', tradeInDiscount: 0.2 });
    expect(trade.upfrontCash - sell.upfrontCash).toBeCloseTo(lxV.price * 0.2, 6);
  });
  it('a zero-discount trade-in equals a private sale', () => {
    expect(run({ disposal: 'trade', tradeInDiscount: 0 }).netCostNPV).toBeCloseTo(run({ disposal: 'sell' }).netCostNPV, 6);
  });
  it('a trade-in never beats selling when the discount is positive', () => {
    expect(run({ disposal: 'trade', tradeInDiscount: 0.15 }).netCostNPV).toBeGreaterThan(run({ disposal: 'sell' }).netCostNPV);
  });
  it('California: the trade-in does not change sales tax, so the loan payment is the same', () => {
    expect(run({ disposal: 'trade', tradeInDiscount: 0.3 }).monthlyPayment).toBeCloseTo(run({ disposal: 'sell' }).monthlyPayment, 8);
  });
  it('with no car to dispose of, the old car adds no leakage emissions', () => {
    expect(run({ disposal: 'none' }).co2.leakage).toBe(0);
    expect(run({ disposal: 'sell' }).co2.leakage).toBeGreaterThan(0);
    expect(run({ disposal: 'trade' }).co2.leakage).toBeGreaterThan(0);
  });
  it('Clean Cars 4 All needs a car to scrap: ignored when there is none', () => {
    expect(run({ disposal: 'none', cc4a: true }).incentives.cc4aGrant).toBe(0);
    expect(run({ disposal: 'trade', cc4a: true }).incentives.cc4aGrant).toBeGreaterThan(0);
  });
  it('optionsFor can omit the Keep option, and scoring still works (anchored falls back to benchmark)', () => {
    const opts = optionsFor(DEFAULT_VEHICLES, ['tesla', 'bolt'], false);
    expect(opts.some((o) => o.financing === 'none')).toBe(false);
    expect(opts.length).toBeGreaterThan(0);
    const g = { ...DEFAULT_GLOBALS, disposal: 'none' as const };
    for (const scale of ['benchmark', 'anchored', 'relative'] as const) {
      const s = scoreOptions(g, DEFAULT_VEHICLES, opts, { mode: 'hybrid', aggregation: 'average', scale, pillarWeights: { ...WEIGHT_PRESETS.balanced }, criteria: DEFAULT_CRITERIA });
      expect(s).toHaveLength(opts.length);
      for (const x of s) expect(Number.isFinite(x.overall)).toBe(true);
    }
    const a = scoreOptions(g, DEFAULT_VEHICLES, opts, { mode: 'hybrid', aggregation: 'average', scale: 'anchored', pillarWeights: { ...WEIGHT_PRESETS.balanced }, criteria: DEFAULT_CRITERIA });
    const b = scoreOptions(g, DEFAULT_VEHICLES, opts, { mode: 'hybrid', aggregation: 'average', scale: 'benchmark', pillarWeights: { ...WEIGHT_PRESETS.balanced }, criteria: DEFAULT_CRITERIA });
    expect(a.map((x) => x.overall)).toEqual(b.map((x) => x.overall));
  });
  it('keeping the owned car is unaffected by the disposal setting', () => {
    const k = (d: 'sell' | 'trade' | 'none') => computeOption({ ...DEFAULT_GLOBALS, disposal: d }, lxV, 'none', lxV).netCostNPV;
    expect(k('trade')).toBeCloseTo(k('sell'), 8);
    expect(k('none')).toBeCloseTo(k('sell'), 8);
  });
});

describe('current-car presets', () => {
  it('every preset builds a valid owned car whose inputs are all in range', async () => {
    const { CAR_PRESETS, currentCarFromPreset } = await import('./data');
    for (const p of CAR_PRESETS) {
      const { vehicle, meta } = currentCarFromPreset(p.id);
      expect(vehicle.owned).toBe(true);
      expect(vehicle.id).toBe('lx');
      const r = computeOption(DEFAULT_GLOBALS, vehicle, 'none', vehicle);
      expect(Number.isFinite(r.netCostNPV)).toBe(true);
      expect(r.co2.total).toBeGreaterThan(0);
      for (const key of ['price', 'mpg', 'maintPerMile', 'insurancePerYear', 'annualValueLoss']) {
        const m = meta[key];
        const val = (vehicle as unknown as Record<string, number>)[key];
        expect(m, `${p.id}.${key} meta`).toBeDefined();
        expect(val).toBeGreaterThanOrEqual(m.min);
        expect(val).toBeLessThanOrEqual(m.max);
      }
    }
  });
  it('the Lexus preset equals the catalog default', async () => {
    const { currentCarFromPreset } = await import('./data');
    expect(currentCarFromPreset('lexus').vehicle).toEqual(DEFAULT_VEHICLES.find((v) => v.owned));
  });
});
