/**
 * Triple-bottom-line (people / planet / profit) decision engine for personal
 * vehicle decisions. Pure functions only: no DOM, no I/O.
 */

export type Financing = 'none' | 'loan' | 'lease';
export type ScoringMode = 'hybrid' | 'metrics' | 'ratings';
export type Aggregation = 'average' | 'weakest';
export type EmbodiedMode = 'allocated' | 'full';
export type Disposal = 'sell' | 'trade' | 'none';
/**
 * 'benchmark': 50 = costs and emits the same as a typical new car (AAA / EPA averages), so every car,
 *   including the one you own, moves when its own inputs change.
 * 'anchored': 50 = same as keeping the car you own (the status quo is always exactly 50).
 * 'relative': best option in the set = 100, worst = 10.
 */
export type ScaleMode = 'benchmark' | 'anchored' | 'relative';

/** Assumptions shared by every option being compared. */
export interface Globals {
  horizonYears: number;
  milesPerYear: number;
  /** $/gallon today. */
  gasPrice: number;
  gasEscalation: number;
  /** $/kWh blended home charging. */
  elecPrice: number;
  elecEscalation: number;
  /** kg CO2e per kWh delivered (grid average incl. line losses). */
  gridKgPerKwh: number;
  /** kg CO2 per gallon of gasoline (tailpipe). */
  gasKgPerGal: number;
  /** kg CO2e per gallon for crude extraction, refining and delivery (well-to-tank). */
  gasUpstreamKgPerGal: number;
  /** Extra real-world energy use over the EPA label for EVs (0.1 = +10%). */
  evRealWorldPenalty: number;
  discountRate: number;
  salesTax: number;
  /** One-time home charger install cost for EV options. */
  chargerCost: number;
  embodiedMode: EmbodiedMode;
  vehicleLifeYears: number;
  /** Share of the kept car's emissions that continue if you sell it (it stays on the road). */
  lxLeakage: number;
  /**
   * What happens to the car you own when you buy: 'sell' it privately, 'trade' it in at a dealer, or
   * 'none' (no car to dispose of: buying fresh, or keeping it outside this comparison).
   */
  disposal: Disposal;
  /** How far below the private-sale value a dealer trade-in offer is (0.15 = 15% less). */
  tradeInDiscount: number;
  /** Federal car-loan interest deduction (2025-2028, new U.S.-assembled vehicles, loans only). */
  loanInterestDeduction: boolean;
  /** Your marginal federal income tax rate. */
  marginalTaxRate: number;
  /** Modified adjusted gross income used for the deduction phase-out. */
  magi: number;
  jointFiling: boolean;
  /** Months of loan interest, counted from purchase, that fall in tax years 2025-2028. */
  deductionMonths: number;
  /** California MyFirstEV point-of-sale rebate: household has never bought or leased a ZEV. */
  firstTimeZev: boolean;
  /** Clean Cars 4 All: scrap the owned car for an income-qualified replacement grant. */
  cc4a: boolean;
  cc4aEvGrant: number;
  cc4aHybridGrant: number;
  /** Clean Cars 4 All home-charger funding (EV only). */
  cc4aCharger: number;
  /** Utility or community-choice charger rebate. */
  chargerRebate: number;
}

export interface LoanTerms {
  apr: number;
  termMonths: number;
  down: number;
}

export interface LeaseTerms {
  monthly: number;
  dueAtSigning: number;
  termMonths: number;
}

export interface Vehicle {
  id: string;
  name: string;
  short: string;
  kind: 'ice' | 'hybrid' | 'ev';
  /** true = the car you already own. */
  owned: boolean;
  /** Purchase price (new) or current sale value (owned). */
  price: number;
  mpg: number;
  kwhPer100mi: number;
  realWorldAdj: number;
  maintPerMile: number;
  insurancePerYear: number;
  /** Manufacturing emissions in tonnes CO2e (0 for an already-built owned car). */
  embodiedT: number;
  /** Fraction of value lost over 5 years (new vehicles). */
  depreciation5yr: number;
  /** Fraction of value lost per year (owned vehicle). */
  annualValueLoss: number;
  loan?: LoanTerms;
  lease?: LeaseTerms;
  /** Final assembly in the U.S. (needed for the loan-interest deduction). */
  usAssembled?: boolean;
  /** California MyFirstEV rebate available on this model right now ($0 if funding closed or not eligible). */
  zevRebate?: number;
  /** 1-5 rating of materials / waste footprint. */
  materials: number;
  /** 1-5 ratings keyed by criterion id. */
  ratings: Record<string, number>;
}

export interface OptionSpec {
  id: string;
  vehicleId: string;
  financing: Financing;
  label: string;
}

export interface OptionResult {
  netCostNPV: number;
  netCostNominal: number;
  components: {
    /** Net vehicle capital: price+tax+charger minus resale and sale proceeds (or lease payments). */
    capital: number;
    interest: number;
    energy: number;
    maintenance: number;
    insurance: number;
  };
  /** Dollar value of each incentive in this option (positive = money in your pocket). */
  incentives: { zevRebate: number; cc4aGrant: number; chargerSavings: number; loanDeduction: number; lxScrapped: boolean };
  upfrontCash: number;
  monthlyPayment: number;
  /** Cumulative net position (cash out minus asset value) at the end of each year, index 0 = today. */
  position: number[];
  co2: { use: number; embodied: number; leakage: number; total: number };
  co2PerMile: number;
}

/**
 * Build the comparison set: the car you own plus a loan option (and a lease option when lease
 * terms exist) for each selected replacement. Order follows the vehicle list.
 */
export function optionsFor(vehicles: Vehicle[], selectedIds: string[], includeKeep = true): OptionSpec[] {
  const out: OptionSpec[] = [];
  for (const v of vehicles) {
    if (v.owned) {
      if (includeKeep) out.push({ id: 'keep', vehicleId: v.id, financing: 'none', label: `Keep ${v.short}` });
      continue;
    }
    if (!selectedIds.includes(v.id)) continue;
    if (v.loan) out.push({ id: `${v.id}-loan`, vehicleId: v.id, financing: 'loan', label: `${v.short}: loan` });
    if (v.lease) out.push({ id: `${v.id}-lease`, vehicleId: v.id, financing: 'lease', label: `${v.short}: lease` });
  }
  return out;
}

/** Monthly payment for a fully-amortizing loan. */
export function pmt(principal: number, apr: number, n: number): number {
  if (n <= 0 || principal <= 0) return 0;
  const r = apr / 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

/** Remaining loan balance after k payments. */
export function loanBalance(principal: number, apr: number, n: number, k: number): number {
  if (principal <= 0) return 0;
  const kk = Math.min(k, n);
  const r = apr / 12;
  if (r === 0) return principal * (1 - kk / n);
  const p = pmt(principal, apr, n);
  const g = Math.pow(1 + r, kk);
  return Math.max(0, principal * g - (p * (g - 1)) / r);
}

/** Estimated market value of a vehicle after `years` of ownership. */
export function valueAt(v: Vehicle, years: number): number {
  if (v.owned) return v.price * Math.pow(1 - v.annualValueLoss, years);
  return v.price * Math.pow(1 - v.depreciation5yr, years / 5);
}

/** Wall-to-wheel kWh per mile including the real-world adjustments. */
export function kwhPerMile(v: Vehicle, g: Globals): number {
  return (v.kwhPer100mi / 100) * v.realWorldAdj * (1 + g.evRealWorldPenalty);
}

/** Tonnes CO2e from operating a vehicle for the horizon. */
export function useEmissionsT(g: Globals, v: Vehicle): number {
  const miles = g.milesPerYear * g.horizonYears;
  if (v.kind !== 'ev') return ((miles / v.mpg) * (g.gasKgPerGal + g.gasUpstreamKgPerGal)) / 1000;
  return (miles * kwhPerMile(v, g) * g.gridKgPerKwh) / 1000;
}

/**
 * Compute costs and emissions for one vehicle + financing combination.
 * `lx` is the car you currently own; replacing it yields sale proceeds at t=0.
 */
/**
 * Cash received at t=0 for the car you own. California gives no sales-tax credit for a trade-in, so a
 * trade-in differs from a private sale only in the (usually lower) value you receive.
 */
export function exitProceeds(g: Globals, lx: Vehicle): number {
  if (g.disposal === 'none') return 0;
  return g.disposal === 'trade' ? lx.price * (1 - g.tradeInDiscount) : lx.price;
}

export function computeOption(g: Globals, v: Vehicle, fin: Financing, lx: Vehicle): OptionResult {
  if (fin === 'none' && !v.owned) throw new Error(`${v.id}: only an owned vehicle can have financing 'none'`);
  if (fin === 'loan' && !v.loan) throw new Error(`${v.id}: no loan terms`);
  if (fin === 'lease' && !v.lease) throw new Error(`${v.id}: no lease terms`);

  const months = Math.round(g.horizonYears * 12);
  const years = months / 12;
  const monthlyRate = Math.pow(1 + g.discountRate, 1 / 12) - 1;
  const disc = (m: number) => Math.pow(1 + monthlyRate, -m);

  // cfBase[m]: cash out (+) / in (-) at month m, excluding terminal resale/payoff.
  const cfBase = new Array<number>(months + 1).fill(0);
  let energy = 0;
  let maintenance = 0;
  let insurance = 0;
  const isEv = v.kind === 'ev';
  const evKwh = isEv ? kwhPerMile(v, g) : 0;

  for (let m = 0; m < months; m++) {
    const y = Math.floor(m / 12);
    const fuelYear =
      !isEv
        ? (g.milesPerYear / v.mpg) * g.gasPrice * Math.pow(1 + g.gasEscalation, y)
        : g.milesPerYear * evKwh * g.elecPrice * Math.pow(1 + g.elecEscalation, y);
    const e = fuelYear / 12;
    const mt = (g.milesPerYear * v.maintPerMile) / 12;
    const ins = v.insurancePerYear / 12;
    cfBase[m + 1] += e + mt + ins;
    energy += e;
    maintenance += mt;
    insurance += ins;
  }

  let upfrontCash = 0;
  let monthlyPayment = 0;
  let capitalCash = 0; // vehicle-related cash excluding interest
  let interest = 0;
  let terminalInflow = 0; // resale minus loan payoff at the end of the horizon
  let assetAt = (_y: number) => 0;
  let balanceAt = (_y: number) => 0;
  let loanDeduction = 0;

  let zevRebate = 0;
  let cc4aGrant = 0;
  let chargerSavings = 0;
  let lxScrapped = false;
  if (!v.owned) {
    // Clean Cars 4 All requires retiring (scrapping) the old car instead of selling it.
    if (g.cc4a && g.disposal !== 'none' && v.kind !== 'ice') {
      lxScrapped = true;
      cc4aGrant = v.kind === 'ev' ? g.cc4aEvGrant : g.cc4aHybridGrant;
    }
    // Replacing the owned car: sale proceeds at t=0 (none if it is scrapped).
    if (!lxScrapped) {
      const proceeds = exitProceeds(g, lx);
      cfBase[0] -= proceeds;
      capitalCash -= proceeds;
      upfrontCash -= proceeds;
    }
    if (isEv) {
      const full = g.chargerCost;
      const net = Math.max(0, full - g.chargerRebate - (lxScrapped ? g.cc4aCharger : 0));
      chargerSavings = full - net;
      cfBase[0] += net;
      capitalCash += net;
      upfrontCash += net;
      if (g.firstTimeZev && (v.zevRebate ?? 0) > 0) zevRebate = v.zevRebate ?? 0;
    }
    if (cc4aGrant > 0) {
      cfBase[0] -= cc4aGrant;
      capitalCash -= cc4aGrant;
      upfrontCash -= cc4aGrant;
    }
    if (zevRebate > 0) {
      cfBase[0] -= zevRebate;
      capitalCash -= zevRebate;
      upfrontCash -= zevRebate;
    }
  }

  if (fin === 'none') {
    assetAt = (y) => valueAt(v, y);
    terminalInflow = valueAt(v, years);
    capitalCash -= terminalInflow;
  } else if (fin === 'loan') {
    const loan = v.loan as LoanTerms;
    const priceWithTax = v.price * (1 + g.salesTax);
    const principal = Math.max(0, priceWithTax - loan.down);
    const pay = pmt(principal, loan.apr, loan.termMonths);
    monthlyPayment = pay;
    cfBase[0] += loan.down;
    upfrontCash += loan.down;
    const nPay = Math.min(loan.termMonths, months);
    for (let k = 1; k <= nPay; k++) cfBase[k] += pay;
    const payoff = months < loan.termMonths ? loanBalance(principal, loan.apr, loan.termMonths, months) : 0;
    const totalPaid = loan.down + pay * nPay + payoff;
    interest = totalPaid - priceWithTax;
    if (g.loanInterestDeduction && v.usAssembled && !v.owned) {
      // OBBBA: up to $10,000/yr of interest on new, U.S.-assembled vehicles, reduced by $200 per
      // $1,000 of MAGI over $100k ($200k joint); tax years 2025-2028 only; loans only.
      const threshold = g.jointFiling ? 200000 : 100000;
      const cap = Math.max(0, 10000 - 0.2 * Math.max(0, g.magi - threshold));
      const eligibleMonths = Math.min(nPay, Math.max(0, Math.round(g.deductionMonths)));
      const blocks: number[] = [];
      let bal = principal;
      const mr = loan.apr / 12;
      for (let k = 1; k <= eligibleMonths; k++) {
        const intK = bal * mr;
        bal -= pay - intK;
        const b = Math.floor((k - 1) / 12);
        blocks[b] = (blocks[b] ?? 0) + intK;
      }
      blocks.forEach((blockInterest, b) => {
        const saved = Math.min(blockInterest, cap) * g.marginalTaxRate;
        const at = Math.min(eligibleMonths, (b + 1) * 12);
        cfBase[at] -= saved;
        loanDeduction += saved;
      });
    }
    capitalCash += priceWithTax;
    const resale = valueAt(v, years);
    terminalInflow = resale - payoff;
    capitalCash -= resale;
    assetAt = (y) => valueAt(v, y);
    balanceAt = (y) => loanBalance(principal, loan.apr, loan.termMonths, Math.round(y * 12));
  } else {
    const lease = v.lease as LeaseTerms;
    const term = lease.termMonths;
    const payTaxed = lease.monthly * (1 + g.salesTax);
    monthlyPayment = payTaxed;
    let leaseTotal = 0;
    for (let s = 0; s < months; s += term) {
      const k = Math.min(term, months - s);
      const f = k / term;
      const das = lease.dueAtSigning * f;
      cfBase[s] += das;
      leaseTotal += das;
      if (s === 0) upfrontCash += das;
      if (k > 1) {
        const scale = k < term ? ((term - 1) / (k - 1)) * f : 1;
        for (let p = 1; p <= k - 1; p++) {
          cfBase[s + p] += payTaxed * scale;
          leaseTotal += payTaxed * scale;
        }
      }
    }
    capitalCash += leaseTotal;
  }

  const cum = new Array<number>(months + 1).fill(0);
  let run = 0;
  let nominal = 0;
  let npv = 0;
  for (let m = 0; m <= months; m++) {
    run += cfBase[m];
    cum[m] = run;
    nominal += cfBase[m];
    npv += cfBase[m] * disc(m);
  }
  nominal -= terminalInflow;
  npv -= terminalInflow * disc(months);

  const position: number[] = [];
  for (let y = 0; y <= Math.floor(years); y++) {
    const m = Math.min(months, y * 12);
    position.push(cum[m] - assetAt(y) + balanceAt(y));
  }
  if (!Number.isInteger(years)) position.push(nominal);

  const useT = useEmissionsT(g, v);
  const embodiedT = v.owned ? 0 : v.embodiedT * (g.embodiedMode === 'full' ? 1 : Math.min(1, years / g.vehicleLifeYears));
  const leakageT = v.owned || lxScrapped || g.disposal === 'none' ? 0 : g.lxLeakage * useEmissionsT(g, lx);
  const total = useT + embodiedT + leakageT;
  const miles = g.milesPerYear * years;

  return {
    netCostNPV: npv,
    netCostNominal: nominal,
    components: { capital: capitalCash, interest, energy, maintenance, insurance },
    incentives: { zevRebate, cc4aGrant, chargerSavings, loanDeduction, lxScrapped },
    upfrontCash,
    monthlyPayment,
    position,
    co2: { use: useT, embodied: embodiedT, leakage: leakageT, total },
    co2PerMile: miles > 0 ? (total * 1000) / miles : 0
  };
}

/* ------------------------------------------------------------------ */
/* Scoring                                                              */
/* ------------------------------------------------------------------ */

export interface Criterion {
  id: string;
  label: string;
  weight: number;
  /** true when the rating rests on an external, measurable source (crash tests, tailpipe). */
  objective: boolean;
}

export interface PillarWeights {
  planet: number;
  people: number;
  profit: number;
}

export interface Scoring {
  mode: ScoringMode;
  aggregation: Aggregation;
  scale: ScaleMode;
  pillarWeights: PillarWeights;
  criteria: Criterion[];
}

export interface PillarScores {
  planet: number;
  people: number;
  profit: number;
}

export interface ScoredOption {
  spec: OptionSpec;
  vehicle: Vehicle;
  result: OptionResult;
  pillars: PillarScores;
  overall: number;
  rank: number;
}

export const WEIGHT_PRESETS: Record<string, PillarWeights> = {
  balanced: { planet: 1 / 3, people: 1 / 3, profit: 1 / 3 },
  planet: { planet: 0.5, people: 0.25, profit: 0.25 },
  people: { planet: 0.25, people: 0.5, profit: 0.25 },
  wallet: { planet: 0.25, people: 0.25, profit: 0.5 }
};

/** Lower-is-better values -> 100 (best) .. 10 (worst). Equal values all score 100. */
export function minMaxScore(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  if (range < 1e-9) return values.map(() => 100);
  return values.map((v) => 100 - (90 * (v - min)) / range);
}

/**
 * Lower-is-better values scored against a reference (the status quo): 100 / (1 + exp(k * (value - ref) / scale)).
 * Equal to the reference = 50; better than it > 50; worse < 50. Smooth, never clamped, defined for any
 * sign of `ref` (a net cost can be negative when resale value exceeds running costs), and independent of
 * which other options are being compared. `scale` is a positive yardstick in the same units as the
 * values (for example the status quo's running costs). Returns 50 for everyone if scale is not positive.
 */
export function anchoredScore(values: number[], ref: number, scale: number): number[] {
  if (!(scale > 0)) return values.map(() => 50);
  const k = 1.4;
  return values.map((v) => 100 / (1 + Math.exp((k * (v - ref)) / scale)));
}

/** AAA 2025 average new-vehicle ownership cost at 15,000 mi/yr and its mileage-driven parts. */
export const AAA_ANNUAL_COST = 11577;
export const AAA_FUEL_PER_MILE = 0.13;
export const AAA_MAINT_PER_MILE = 0.1104;
/** EPA (June 2023 fact sheet): the average passenger vehicle emits about 400 g CO2 per mile from the tailpipe. */
export const EPA_AVG_TAILPIPE_KG_PER_MILE = 0.4;
/** Production emissions of a typical petrol car in tonnes CO2e (Autocar / LowCVP: ~5.6-6). */
export const TYPICAL_CAR_EMBODIED_T = 6;

/**
 * Present-value cost of owning and running a typical new car for the horizon: AAA's fixed costs
 * (depreciation, insurance, taxes, finance) plus its per-mile fuel and maintenance, at your mileage.
 */
export function benchmarkCost(g: Globals): number {
  const fixed = AAA_ANNUAL_COST - 15000 * (AAA_FUEL_PER_MILE + AAA_MAINT_PER_MILE);
  const annual = fixed + g.milesPerYear * (AAA_FUEL_PER_MILE + AAA_MAINT_PER_MILE);
  const months = Math.round(g.horizonYears * 12);
  const mr = Math.pow(1 + g.discountRate, 1 / 12) - 1;
  let pv = 0;
  for (let m = 1; m <= months; m++) pv += annual / 12 / Math.pow(1 + mr, m);
  return pv;
}

/** Lifecycle tonnes CO2e of a typical gasoline car (tailpipe + upstream + shared manufacturing) at your mileage. */
export function benchmarkCo2(g: Globals): number {
  const kgPerMile = EPA_AVG_TAILPIPE_KG_PER_MILE * (1 + g.gasUpstreamKgPerGal / g.gasKgPerGal);
  const use = (kgPerMile * g.milesPerYear * g.horizonYears) / 1000;
  const embodied = TYPICAL_CAR_EMBODIED_T * (g.embodiedMode === 'full' ? 1 : Math.min(1, g.horizonYears / g.vehicleLifeYears));
  return use + embodied;
}

/** Energy + maintenance + insurance over the horizon: a positive yardstick for cost differences. */
export function runningCosts(r: OptionResult): number {
  return r.components.energy + r.components.maintenance + r.components.insurance;
}

/** Convert a 0-100 score to a 1-5 band. */
export function bandRating(score: number): number {
  if (score >= 85) return 5;
  if (score >= 65) return 4;
  if (score >= 45) return 3;
  if (score >= 25) return 2;
  return 1;
}

const rating100 = (r: number) => ((r - 1) / 4) * 100;

export function normalizeWeights(w: PillarWeights): PillarWeights {
  const sum = w.planet + w.people + w.profit;
  if (sum <= 0) return { planet: 1 / 3, people: 1 / 3, profit: 1 / 3 };
  return { planet: w.planet / sum, people: w.people / sum, profit: w.profit / sum };
}

export function aggregate(p: PillarScores, w: PillarWeights, mode: Aggregation): number {
  const n = normalizeWeights(w);
  if (mode === 'average') return p.planet * n.planet + p.people * n.people + p.profit * n.profit;
  const f = (s: number) => Math.max(s, 1);
  return Math.exp(n.planet * Math.log(f(p.planet)) + n.people * Math.log(f(p.people)) + n.profit * Math.log(f(p.profit)));
}

/** People pillar: weighted average of 1-5 ratings, rescaled to 0-100. */
export function peopleScore(v: Vehicle, criteria: Criterion[], objectiveOnly: boolean): number {
  const used = criteria.filter((c) => (objectiveOnly ? c.objective : true) && c.weight > 0);
  const total = used.reduce((a, c) => a + c.weight, 0);
  if (total <= 0) return 50;
  return used.reduce((a, c) => a + c.weight * rating100(v.ratings[c.id] ?? 3), 0) / total;
}

export function scoreOptions(
  g: Globals,
  vehicles: Vehicle[],
  options: OptionSpec[],
  scoring: Scoring
): ScoredOption[] {
  const byId = new Map(vehicles.map((v) => [v.id, v]));
  const lx = vehicles.find((v) => v.owned);
  if (!lx) throw new Error('No owned vehicle defined');
  const results = options.map((o) => computeOption(g, byId.get(o.vehicleId) as Vehicle, o.financing, lx));
  const keepRef = computeOption(g, lx, 'none', lx);
  const costs = results.map((r) => r.netCostNPV);
  const co2s = results.map((r) => r.co2.total);
  let econ: number[];
  let carbon: number[];
  if (scoring.scale === 'benchmark' || (scoring.scale === 'anchored' && !options.some((o) => o.financing === 'none'))) {
    const bc = benchmarkCost(g);
    const be = benchmarkCo2(g);
    econ = anchoredScore(costs, bc, bc);
    carbon = anchoredScore(co2s, be, be);
  } else if (scoring.scale === 'anchored' && options.some((o) => o.financing === 'none')) {
    econ = anchoredScore(costs, keepRef.netCostNPV, runningCosts(keepRef));
    carbon = anchoredScore(co2s, keepRef.co2.total, keepRef.co2.total);
  } else {
    econ = minMaxScore(costs);
    carbon = minMaxScore(co2s);
  }

  const scored = options.map((spec, i): ScoredOption => {
    const v = byId.get(spec.vehicleId) as Vehicle;
    let planet: number;
    let profit: number;
    let people: number;
    if (scoring.mode === 'hybrid') {
      planet = 0.8 * carbon[i] + 0.2 * rating100(v.materials);
      profit = econ[i];
      people = peopleScore(v, scoring.criteria, false);
    } else if (scoring.mode === 'metrics') {
      planet = carbon[i];
      profit = econ[i];
      people = peopleScore(v, scoring.criteria, true);
    } else {
      planet = rating100((bandRating(carbon[i]) + v.materials) / 2);
      profit = rating100(bandRating(econ[i]));
      people = peopleScore(v, scoring.criteria, false);
    }
    const pillars = { planet, people, profit };
    return {
      spec,
      vehicle: v,
      result: results[i],
      pillars,
      overall: aggregate(pillars, scoring.pillarWeights, scoring.aggregation),
      rank: 0
    };
  });
  const order = [...scored].sort((a, b) => b.overall - a.overall);
  order.forEach((s, i) => (s.rank = i + 1));
  return scored;
}

/** Winner (option id) under every pillar-weight preset and both aggregation rules. */
export function weightSensitivity(
  g: Globals,
  vehicles: Vehicle[],
  options: OptionSpec[],
  scoring: Scoring
): { preset: string; aggregation: Aggregation; winnerId: string; overall: number }[] {
  const out: { preset: string; aggregation: Aggregation; winnerId: string; overall: number }[] = [];
  for (const [preset, w] of Object.entries(WEIGHT_PRESETS)) {
    for (const aggregation of ['average', 'weakest'] as Aggregation[]) {
      const s = scoreOptions(g, vehicles, options, { ...scoring, pillarWeights: w, aggregation });
      const top = s.find((x) => x.rank === 1) as ScoredOption;
      out.push({ preset, aggregation, winnerId: top.spec.id, overall: top.overall });
    }
  }
  return out;
}

/**
 * Gas price ($/gal) at which keeping the owned car costs the same (NPV) as the
 * given option. Returns null if no price up to $40 makes them equal, 0 if the
 * option already wins at $0 gas.
 */
export function breakEvenGasPrice(g: Globals, v: Vehicle, fin: Financing, lx: Vehicle): number | null {
  const diff = (p: number) => {
    const gg = { ...g, gasPrice: p };
    return computeOption(gg, lx, 'none', lx).netCostNPV - computeOption(gg, v, fin, lx).netCostNPV;
  };
  if (diff(0) >= 0) return 0;
  if (diff(40) < 0) return null;
  let lo = 0;
  let hi = 40;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (diff(mid) < 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** First whole year at which the option's cumulative position beats keeping the car, or null. */
export function paybackYear(option: OptionResult, keep: OptionResult): number | null {
  const n = Math.min(option.position.length, keep.position.length);
  for (let y = 1; y < n; y++) if (option.position[y] < keep.position[y]) return y;
  return null;
}
