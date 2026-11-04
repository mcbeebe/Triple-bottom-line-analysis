/**
 * AI analyst support: pure helpers that (1) build the prompt from the tool's live state, (2) compute
 * what-if sensitivities with the real engine so Claude never guesses numbers, and (3) validate whatever
 * Claude returns before the page lets the user apply it.
 */
import { scoreOptions, type Disposal, type Globals, type OptionSpec, type ScaleMode, type Scoring, type ScoringMode, type Vehicle } from './engine';

export interface FieldInfo {
  id: string;
  label: string;
  unit: string;
  value: number;
  defaultValue: number;
  /** Bounds in stored units. */
  min: number;
  max: number;
  /** 'fraction': stored as 0.07 for 7%. 'yesno': 1 = Yes, 0 = No. */
  kind: 'number' | 'fraction' | 'yesno';
  note?: string;
}

export interface AnalystQuestion {
  question: string;
  why: string;
  field: string | null;
  value: number | null;
}
export interface AnalystSuggestion {
  field: string;
  value: number;
  reason: string;
}
export interface AnalystCar {
  id: string;
  reason: string;
}
export interface AnalystNewCar {
  name: string;
  kind: 'ice' | 'hybrid' | 'ev';
  price: number;
  /** mpg for gas and hybrid cars; kWh per 100 miles for EVs. */
  efficiency: number;
  reason: string;
}
export interface AnalystSettings {
  /** What happens to the current car: sell privately, trade in, or no car to dispose of. */
  path?: Disposal;
  mode?: ScoringMode;
  scale?: ScaleMode;
  preset?: string;
  view?: 'both' | 'loan' | 'lease';
  reason: string;
}
export interface FlipFactor {
  factor: string;
  effect: string;
}
export interface AnalystAnswer {
  summary: string;
  interpretation: string;
  questions: AnalystQuestion[];
  suggestions: AnalystSuggestion[];
  addCars: AnalystCar[];
  /** Cars that are not in the catalog, built only from numbers the person gave. */
  newCars: AnalystNewCar[];
  removeCars: AnalystCar[];
  /** A name for the car the person owns now, e.g. "2014 Subaru Outback". */
  currentCarName: string;
  settings: AnalystSettings | null;
  explanation: string[];
  flipFactors: FlipFactor[];
  caveats: string[];
}

export const PRESET_IDS = ['balanced', 'planet', 'people', 'wallet'];
const MODES: ScoringMode[] = ['hybrid', 'metrics', 'ratings'];
const SCALES: ScaleMode[] = ['benchmark', 'anchored', 'relative'];
const VIEWS = ['both', 'loan', 'lease'] as const;
const PATHS: Disposal[] = ['sell', 'trade', 'none'];
export const NEW_CAR_LIMITS = { price: { min: 3000, max: 250000 }, mpg: { min: 5, max: 150 }, kwh: { min: 15, max: 70 } };

const clip = (x: unknown, max: number): string => (typeof x === 'string' ? x.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const arr = (x: unknown, max: number): unknown[] => (Array.isArray(x) ? x.slice(0, max) : []);
const obj = (x: unknown): Record<string, unknown> => (x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : {});

/** Clamp a proposed value to a field's range, snapping yes/no fields to 0 or 1. Returns null if not a finite number. */
export function coerceValue(f: FieldInfo, v: unknown): number | null {
  let n: number;
  if (typeof v === 'boolean') n = v ? 1 : 0;
  else if (typeof v === 'number') n = v;
  else if (typeof v === 'string' && v.trim() !== '') n = Number(v);
  else return null;
  if (!Number.isFinite(n)) return null;
  if (f.kind === 'yesno') return n >= 0.5 ? 1 : 0;
  return Math.min(f.max, Math.max(f.min, n));
}

/**
 * Turn Claude's raw JSON into a safe, bounded answer. Unknown inputs, out-of-range numbers, unknown cars
 * and malformed entries are dropped or clamped; nothing here changes the app (the user must tap Apply).
 */
export function sanitizeAnswer(raw: unknown, ctx: { fields: Map<string, FieldInfo>; addableCarIds: Set<string>; removableCarIds?: Set<string> }): AnalystAnswer {
  const r = obj(raw);
  const seenField = new Set<string>();

  const questions: AnalystQuestion[] = [];
  for (const q of arr(r.questions, 6)) {
    const o = obj(q);
    const question = clip(o.question, 300);
    if (!question) continue;
    const fid = typeof o.field === 'string' ? o.field : '';
    const info = ctx.fields.get(fid);
    questions.push({ question, why: clip(o.why, 300), field: info ? fid : null, value: info ? coerceValue(info, o.value) : null });
  }

  const suggestions: AnalystSuggestion[] = [];
  for (const s of arr(r.suggestions, 14)) {
    const o = obj(s);
    const fid = typeof o.field === 'string' ? o.field : '';
    const info = ctx.fields.get(fid);
    if (!info || seenField.has(fid)) continue;
    const value = coerceValue(info, o.value);
    if (value === null) continue;
    if (Math.abs(value - info.value) < 1e-9) continue; // a no-op is not a suggestion
    seenField.add(fid);
    suggestions.push({ field: fid, value, reason: clip(o.reason, 320) });
  }

  const addCars: AnalystCar[] = [];
  const seenCar = new Set<string>();
  for (const c of arr(r.addCars, 5)) {
    const o = obj(c);
    const id = typeof o.id === 'string' ? o.id : '';
    if (!ctx.addableCarIds.has(id) || seenCar.has(id)) continue;
    seenCar.add(id);
    addCars.push({ id, reason: clip(o.reason, 240) });
  }

  const removeCars: AnalystCar[] = [];
  const seenRemove = new Set<string>();
  for (const c of arr(r.removeCars, 8)) {
    const o = obj(c);
    const id = typeof o.id === 'string' ? o.id : '';
    if (!ctx.removableCarIds?.has(id) || seenRemove.has(id)) continue;
    seenRemove.add(id);
    removeCars.push({ id, reason: clip(o.reason, 240) });
  }

  const newCars: AnalystNewCar[] = [];
  for (const c of arr(r.newCars, 3)) {
    const o = obj(c);
    const kind = o.kind === 'ice' || o.kind === 'hybrid' || o.kind === 'ev' ? o.kind : null;
    const name = clip(o.name, 40);
    const price = typeof o.price === 'number' && Number.isFinite(o.price) ? o.price : NaN;
    const eff = typeof o.efficiency === 'number' && Number.isFinite(o.efficiency) ? o.efficiency : NaN;
    if (!kind || !name || Number.isNaN(price) || Number.isNaN(eff)) continue;
    const lim = kind === 'ev' ? NEW_CAR_LIMITS.kwh : NEW_CAR_LIMITS.mpg;
    newCars.push({
      name,
      kind,
      price: Math.min(NEW_CAR_LIMITS.price.max, Math.max(NEW_CAR_LIMITS.price.min, Math.round(price))),
      efficiency: Math.min(lim.max, Math.max(lim.min, eff)),
      reason: clip(o.reason, 240)
    });
  }

  let settings: AnalystSettings | null = null;
  const so = obj(r.settings);
  const st: AnalystSettings = { reason: clip(so.reason, 300) };
  if (typeof so.path === 'string' && (PATHS as string[]).includes(so.path)) st.path = so.path as Disposal;
  if (typeof so.mode === 'string' && (MODES as string[]).includes(so.mode)) st.mode = so.mode as ScoringMode;
  if (typeof so.scale === 'string' && (SCALES as string[]).includes(so.scale)) st.scale = so.scale as ScaleMode;
  if (typeof so.preset === 'string' && PRESET_IDS.includes(so.preset)) st.preset = so.preset;
  if (typeof so.view === 'string' && (VIEWS as readonly string[]).includes(so.view)) st.view = so.view as 'both' | 'loan' | 'lease';
  if (st.path || st.mode || st.scale || st.preset || st.view) settings = st;

  const strings = (x: unknown, n: number, len: number): string[] => arr(x, n).map((s) => clip(s, len)).filter(Boolean);
  const flipFactors: FlipFactor[] = [];
  for (const f of arr(r.flipFactors, 8)) {
    const o = obj(f);
    const factor = clip(o.factor, 160);
    const effect = clip(o.effect, 320);
    if (factor && effect) flipFactors.push({ factor, effect });
  }

  return {
    summary: clip(r.summary, 900),
    interpretation: clip(r.interpretation, 900),
    questions,
    suggestions,
    addCars,
    newCars,
    removeCars,
    currentCarName: clip(r.currentCarName, 40),
    settings,
    explanation: strings(r.explanation, 8, 500),
    flipFactors,
    caveats: strings(r.caveats, 5, 300)
  };
}

/** True when the answer carries anything worth showing. */
export function hasContent(a: AnalystAnswer): boolean {
  return !!(a.summary || a.interpretation || a.questions.length || a.suggestions.length || a.addCars.length || a.newCars.length || a.removeCars.length || a.currentCarName || a.settings || a.explanation.length || a.flipFactors.length);
}

/* ----------------------------- what-if sensitivities ----------------------------- */

export interface SensRow {
  change: string;
  winner: string;
  winnerScore: number;
  keepRank: number;
  winnerChanged: boolean;
  top3: string[];
}

interface Scenario {
  change: string;
  g?: (g: Globals) => Globals;
  v?: (vs: Vehicle[]) => Vehicle[];
}

const mapOwned = (vs: Vehicle[], f: (v: Vehicle) => Vehicle): Vehicle[] => vs.map((v) => (v.owned ? f(v) : v));

/**
 * Re-score the current comparison under a set of single changes, with the real engine. The base winner
 * is compared with each variant so Claude can say truthfully what would flip the result.
 */
export function sensitivityRows(
  g: Globals,
  vehicles: Vehicle[],
  options: OptionSpec[],
  scoring: Scoring,
  nameOf: (o: OptionSpec) => string
): { base: SensRow; rows: SensRow[] } {
  const run = (change: string, gg: Globals, vs: Vehicle[], baseWinner: string | null): SensRow => {
    const s = scoreOptions(gg, vs, options, scoring);
    const sorted = [...s].sort((a, b) => a.rank - b.rank);
    const winner = nameOf(sorted[0].spec);
    const keep = s.find((x) => x.spec.financing === 'none');
    return {
      change,
      winner,
      winnerScore: Math.round(sorted[0].overall * 10) / 10,
      keepRank: keep ? keep.rank : 0,
      winnerChanged: baseWinner !== null && winner !== baseWinner,
      top3: sorted.slice(0, 3).map((x) => nameOf(x.spec))
    };
  };
  const base = run('Current inputs', g, vehicles, null);
  const scenarios: Scenario[] = [
    { change: 'Gas price 40% lower', g: (x) => ({ ...x, gasPrice: x.gasPrice * 0.6 }) },
    { change: 'Gas price 50% higher', g: (x) => ({ ...x, gasPrice: x.gasPrice * 1.5 }) },
    { change: 'Half the miles per year', g: (x) => ({ ...x, milesPerYear: x.milesPerYear * 0.5 }) },
    { change: 'Double the miles per year', g: (x) => ({ ...x, milesPerYear: x.milesPerYear * 2 }) },
    { change: 'Shorter 5-year horizon', g: (x) => ({ ...x, horizonYears: 5 }) },
    { change: 'Longer 12-year horizon', g: (x) => ({ ...x, horizonYears: 12 }) },
    { change: 'Electricity 30% pricier', g: (x) => ({ ...x, elecPrice: x.elecPrice * 1.3 }) },
    { change: 'Cleaner grid (half the CO2 per kWh)', g: (x) => ({ ...x, gridKgPerKwh: x.gridKgPerKwh * 0.5 }) },
    { change: 'Old car stops emitting after you part with it (0% continues, e.g. scrapped)', g: (x) => ({ ...x, lxLeakage: 0 }) },
    { change: 'Old car keeps emitting at 100% after you part with it', g: (x) => ({ ...x, lxLeakage: 1 }) },
    { change: 'Strict manufacturing emissions (100% charged to you)', g: (x) => ({ ...x, embodiedMode: 'full' }) },
    { change: 'No California first-time-EV rebate', g: (x) => ({ ...x, firstTimeZev: false }) },
    { change: 'No loan-interest deduction', g: (x) => ({ ...x, loanInterestDeduction: false }) },
    { change: 'Clean Cars 4 All grant (scrap the owned car)', g: (x) => ({ ...x, cc4a: true }) },
    ...(g.disposal === 'sell' ? [{ change: 'Trade in at a dealer instead of selling privately', g: (x: Globals) => ({ ...x, disposal: 'trade' as Disposal }) }] : []),
    ...(g.disposal === 'trade' ? [{ change: 'Sell privately instead of trading in', g: (x: Globals) => ({ ...x, disposal: 'sell' as Disposal }) }] : []),
    { change: 'Owned car sells for 50% less', v: (vs) => mapOwned(vs, (o) => ({ ...o, price: o.price * 0.5 })) },
    { change: 'Owned car sells for 50% more', v: (vs) => mapOwned(vs, (o) => ({ ...o, price: o.price * 1.5 })) },
    { change: 'Owned car repair costs double', v: (vs) => mapOwned(vs, (o) => ({ ...o, maintPerMile: o.maintPerMile * 2 })) }
  ];
  const rows = scenarios.map((sc) => run(sc.change, sc.g ? sc.g(g) : g, sc.v ? sc.v(vehicles) : vehicles, base.winner));
  return { base, rows };
}

/* ----------------------------- prompt ----------------------------- */

export interface ResultRow {
  rank: number;
  option: string;
  type: string;
  financing: string;
  overall: number;
  planet: number;
  people: number;
  profit: number;
  netCostPV: number;
  co2eTonnes: number;
  monthlyPayment: number | null;
  incentivesAndTaxSavings: number | null;
  breakEvenGasPrice: string;
  payback: string;
}

export interface CarInfo {
  id: string;
  name: string;
  kind: string;
  price: number;
  selected: boolean;
  group: string;
}

export interface PromptArgs {
  scenario: string;
  history: { user: string; summary: string }[];
  fields: FieldInfo[];
  results: ResultRow[];
  sensitivity: { base: SensRow; rows: SensRow[] };
  cars: CarInfo[];
  settings: { path: string; mode: string; scale: string; aggregation: string; preset: string; view: string; horizonYears: number };
  /** The car the person has now, or null when they have none to dispose of. */
  currentCar: { name: string; kind: string; saleValue: number } | null;
  selectedCars: string[];
}

export const MAX_SCENARIO_CHARS = 2000;

export function buildPrompt(a: PromptArgs): string {
  const scenario = a.scenario.trim().slice(0, MAX_SCENARIO_CHARS);
  const hist = a.history
    .slice(-3)
    .map((h, i) => `Earlier question ${i + 1}: ${h.user.slice(0, 400)}\nWhat you answered: ${h.summary.slice(0, 400)}`)
    .join('\n');
  const fields = a.fields.map((f) => ({
    id: f.id,
    label: f.label,
    unit: f.unit,
    value: f.value,
    default: f.defaultValue,
    min: f.min,
    max: f.max,
    stored: f.kind === 'fraction' ? 'fraction (0.07 means 7%)' : f.kind === 'yesno' ? '1 = Yes, 0 = No' : 'plain number',
    ...(f.note ? { note: f.note } : {})
  }));
  return `You are the analyst inside a "triple bottom line" car-decision tool (planet, people, profit). The person is deciding how to get their next car. Their "path" is one of: "sell" (sell the car they have privately, then buy), "trade" (trade it in at a dealer), or "none" (they have no car to sell, or are keeping it outside this comparison, so they are just buying). The tool starts with a 1999 Lexus LX 470 as an example current car; it is a placeholder unless they say otherwise. Your job: work out their path, their current car and which cars are in play, tell them which inputs matter most and what values to use, and explain what the results mean and what could change them.

RULES
- Use ONLY the numbers in the data below for results and sensitivities. Never invent a price, rate, rebate amount or percentage. If you recommend an input value, base it on what the person told you or on a value already shown here; otherwise ask a question instead.
- Prefer a few high-impact questions over many trivial ones. Ask only what you truly need. Plain language, no jargon.
- "suggestions" may change ONLY inputs whose id appears in INPUTS, in the stored units shown. Percent fields are fractions. Do not suggest a value equal to the current one.
- "addCars" may use only ids in CARS where selected is false; "removeCars" only ids where selected is true.
- "newCars" is for a car NOT in CARS, and only when the person gave you its price (or you can ask via a question first). efficiency is mpg for gas and hybrid, kWh per 100 miles for an EV. Never make up a price or efficiency.
- If the person says what they drive now, set "currentCarName" and suggest its value, mpg and costs through "suggestions" (ids starting "lx.") only from numbers they gave. If you cannot tell whether they will sell, trade in or just buy, ask that as a question first.
- With path "none" there is no Keep option and no sale proceeds; with "trade" the tool uses a dealer offer below private-sale value, and California gives no sales-tax credit for trade-ins.
- You are not a financial, tax or legal advisor; for tax and incentive eligibility, say what to confirm and with whom.
- Be honest about uncertainty and about anything that is a placeholder assumption.
- Nothing you propose is applied automatically; the person taps Apply.

${scenario ? `THE PERSON'S SITUATION (their words):\n${scenario}` : 'The person did not describe a situation. Explain the current results and what would change them.'}
${hist ? `\nCONVERSATION SO FAR\n${hist}\n` : ''}
CURRENT SETTINGS
${JSON.stringify(a.settings)}

THE CAR THEY HAVE NOW: ${JSON.stringify(a.currentCar)}
CARS CURRENTLY BEING COMPARED: ${JSON.stringify(a.selectedCars)}

CURRENT RESULTS (scores 0-100; netCostPV in dollars over the horizon; lower cost is better; an option named "Keep ..." is the baseline of keeping the current car, absent when path is "none")
${JSON.stringify(a.results)}

WHAT-IF TABLE (computed by the tool with its real model; each row changes ONE thing)
${JSON.stringify(a.sensitivity)}

INPUTS YOU MAY SUGGEST CHANGES TO
${JSON.stringify(fields)}

CARS
${JSON.stringify(a.cars)}

OUTPUT: reply with ONLY one JSON object, exactly this shape (use [] or "" or null when empty):
{
 "summary": "2-4 sentence plain answer to what they asked, with the headline result",
 "interpretation": "how their situation changes the picture (1-3 sentences)",
 "questions": [{"question": "...", "why": "which result this changes", "field": "an INPUTS id or null", "value": "a suggested number for that field or null"}],
 "suggestions": [{"field": "an INPUTS id", "value": 0, "reason": "why this value, citing their words or a shown value"}],
 "addCars": [{"id": "a CARS id", "reason": "..."}],
 "removeCars": [{"id": "a CARS id", "reason": "..."}],
 "newCars": [{"name": "short name", "kind": "ice|hybrid|ev", "price": 0, "efficiency": 0, "reason": "..."}],
 "currentCarName": "name of the car they have now, or empty",
 "settings": {"path": "sell|trade|none", "mode": "hybrid|metrics|ratings", "scale": "benchmark|anchored|relative", "preset": "balanced|planet|people|wallet", "view": "both|loan|lease", "reason": "..."} or null,
 "explanation": ["short bullets explaining the current results using the numbers above"],
 "flipFactors": [{"factor": "what changes", "effect": "what happens to the winner or ranking, taken from the WHAT-IF TABLE"}],
 "caveats": ["things that are uncertain or need their confirmation"]
}`;
}
