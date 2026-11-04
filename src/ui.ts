import {
  breakEvenGasPrice,
  computeOption,
  paybackYear,
  scoreOptions,
  WEIGHT_PRESETS,
  type Aggregation,
  type Disposal,
  type PillarWeights,
  type ScaleMode,
  type ScoringMode,
  type Vehicle
} from './engine';
import {
  buildPrompt,
  hasContent,
  sanitizeAnswer,
  sensitivityRows,
  type AnalystAnswer,
  type CarInfo,
  type FieldInfo,
  type ResultRow
} from './analyst';
import {
  CAR_PRESETS,
  currentCarFromPreset,
  DEFAULT_CRITERIA,
  DEFAULT_GLOBALS,
  SRC,
  makeCustomVehicle
} from './data';
import { MAX_SELECTED, MODES, PRESET_LABELS, THEMES, clone, state, type Tab, type Theme, type View } from './app/state';
import { defaultOf, fieldRegistry, readField, writeField } from './app/fields';
import { safeStore } from './app/storage';
import { esc, num, usd } from './app/format';
import { carNow, hasCar, incentiveTotal, keepOf, kindLabel, lx, optionName, scaleLabel, scoring, tagFor, vehicle, visibleOptions } from './app/options';
import { $ } from './ui/dom';
import { renderResults } from './ui/answer/answer';
import { refreshEdited, renderAssumptions } from './ui/answer/fineTune';
import { tableAsTsv } from './ui/answer/table';
import { renderSources } from './ui/answer/why';

/* ----------------------------- controls ----------------------------- */

function chip(act: string, val: string, label: string, sub = '', on = false): string {
  return `<button class="chip ${on ? 'on' : ''}" aria-pressed="${on}" data-act="${act}" data-val="${val}">${label}${sub ? `<small>${sub}</small>` : ''}</button>`;
}

function renderControls(): void {
  const w = state.weights;
  const pct = (x: number) => Math.round(x * 100);
  const sum = w.planet + w.people + w.profit || 1;
  $('designbar').innerHTML = `<div class="designrow"><h3>Design</h3><div class="chips">${THEMES.map((t) => chip('theme', t.id, t.label, '', state.theme === t.id)).join('')}</div></div>`;
  const mode = MODES.find((m) => m.id === state.mode) as (typeof MODES)[number];
  const presetLabel = PRESET_LABELS[state.preset] ?? 'Custom weights';
  $('ctl-summary').textContent = `${mode.label} · ${scaleLabel()} · ${presetLabel} · ${state.aggregation === 'average' ? 'average' : 'weakest link'}`;
  $('ctl-body').innerHTML = `
  <div class="group"><h3>Scoring method</h3><div class="chips">${MODES.map((m) => chip('mode', m.id, m.label, '', state.mode === m.id)).join('')}</div></div>
  <div class="group"><h3>Scale (what 50 means)</h3><div class="chips">${chip('scale', 'benchmark', 'Typical new car', 'AAA / EPA averages', state.scale === 'benchmark')}${chip('scale', 'anchored', 'Keeping your car', 'it always scores 50', state.scale === 'anchored')}${chip('scale', 'relative', 'The field', 'best = 100', state.scale === 'relative')}</div></div>
  <div class="group"><h3>Combine pillars</h3><div class="chips">${chip('agg', 'average', 'Weighted average', '', state.aggregation === 'average')}${chip('agg', 'weakest', 'Weakest link', 'no pillar sacrificed', state.aggregation === 'weakest')}</div></div>
  <div class="group"><h3>Pillar weighting</h3><div class="chips">${Object.keys(WEIGHT_PRESETS).map((p) => chip('preset', p, PRESET_LABELS[p], '', state.preset === p)).join('')}</div>
    <div class="sliders">
      ${(['planet', 'people', 'profit'] as const).map((k) => `<label>${k[0].toUpperCase() + k.slice(1)} <input type="range" min="0" max="100" step="5" value="${pct(w[k] / sum)}" data-wslider="${k}"><output id="wo-${k}">${pct(w[k] / sum)}%</output></label>`).join('')}
    </div></div>
  <div class="group"><h3>Financing shown</h3><div class="chips">${chip('view', 'both', 'Loan + lease', '', state.view === 'both')}${chip('view', 'loan', 'Loan only', '', state.view === 'loan')}${chip('view', 'lease', 'Lease only', '', state.view === 'lease')}</div></div>`;
}

/* ------------------------------ your decision (path) ------------------------------ */

const PATHS: { id: Disposal; label: string; sub: string }[] = [
  { id: 'sell', label: 'Sell it, then buy', sub: 'private sale' },
  { id: 'trade', label: 'Trade it in', sub: 'dealer offer' },
  { id: 'none', label: 'Just buy', sub: 'no car to sell' }
];

function pathBlurb(): string {
  const d = state.g.disposal;
  if (d === 'sell') return `You sell ${esc(carNow())} yourself (about ${usd(lx().price)}) and put that toward the new car. You can also compare with keeping it.`;
  if (d === 'trade')
    return `The dealer takes ${esc(carNow())} off the price. The offer is assumed ${num(state.g.tradeInDiscount * 100, 0)}% below its private-sale value (about ${usd(lx().price * (1 - state.g.tradeInDiscount))}); edit that under Key drivers. <a href="${SRC.caTradeIn.url}" target="_blank" rel="noopener">California charges sales tax on the full price</a>, so a trade-in saves no tax here. You can also compare with keeping it.`;
  return 'You are buying without selling or trading a car in, so there is no keep-it option and no sale money. Cars are compared with each other and against a typical new car.';
}

function renderPath(): void {
  const presetChips = CAR_PRESETS.map((p) => chip('carpreset', p.id, p.label, p.blurb, state.carPreset === p.id)).join('');
  const nameBox = `<label class="fine" for="in-carname">Name of your current car</label> <input id="in-carname" class="vname" type="text" maxlength="40" value="${esc(lx().short)}" data-vname="lx" aria-label="Name of your current car">`;
  $('path').innerHTML = `<h2>Your decision</h2>
  <p class="fine">What are you doing with the car you have now? Then pick the cars in play below, or just describe it to the analyst above.</p>
  <div class="chips" role="group" aria-label="What happens to your current car">${PATHS.map((p) => chip('path', p.id, p.label, p.sub, state.g.disposal === p.id)).join('')}${analyst.sample ? '<button class="chip" data-act="askanalyst">Not sure<small>ask the analyst</small></button>' : ''}</div>
  <p class="fine" id="path-blurb">${pathBlurb()}</p>
  ${hasCar() ? `<div class="pgroup"><h3>The car you have now</h3><div class="chips" role="group" aria-label="Starting point for your current car">${presetChips}</div><p class="fine">Pick a starting point, then edit its value, mpg and costs under Cars in the assumptions. Only the Lexus values are sourced; the others are placeholders. ${nameBox}</p></div>` : ''}`;
}

/* ------------------------------ car picker ------------------------------ */

function pickChip(v: Vehicle, custom: boolean): string {
  const on = state.selected.includes(v.id);
  const lease = v.lease ? 'loan + lease' : 'loan only';
  return `<span class="pwrap"><button class="chip ${on ? 'on' : ''}" aria-pressed="${on}" data-act="pick" data-val="${v.id}">${esc(v.short)}<small>${usd(v.price)} · ${lease}</small></button>${custom ? `<button class="x" data-act="rmcustom" data-val="${v.id}" aria-label="Remove ${esc(v.short)}" title="Remove">×</button>` : ''}</span>`;
}

function renderPicker(): void {
  const groupOf = (g: string) => state.vehicles.filter((v) => !v.owned && state.groups[v.id] === g);
  const section = (title: string, list: Vehicle[], custom = false) =>
    list.length ? `<div class="pgroup"><h3>${title}</h3><div class="chips">${list.map((v) => pickChip(v, custom)).join('')}</div></div>` : '';
  $('picker').innerHTML = `<h2>Cars to compare</h2>
  <p class="fine">${hasCar() ? 'Keeping your current car is always the baseline.' : 'There is no keep option because you are just buying.'} Pick up to ${MAX_SELECTED} cars (${state.selected.length} selected). Every option gets a loan, and a lease where terms are known; add lease terms in the assumptions below.</p>
  ${state.notice ? `<p class="notice" role="status">${esc(state.notice)}</p>` : ''}
  <div class="pgrid">
    ${section('Electric', groupOf('ev'))}
    ${section('Hybrid', groupOf('hybrid'))}
    ${section('Gas', groupOf('gas'))}
    ${section('Your own', groupOf('custom'), true)}
  </div>
  <div class="padd"><span class="padd-label">Add your own car:</span>
    <button class="btn ghost" data-act="addcustom" data-val="ice">+ Gas car</button>
    <button class="btn ghost" data-act="addcustom" data-val="hybrid">+ Hybrid</button>
    <button class="btn ghost" data-act="addcustom" data-val="ev">+ EV</button>
    <button class="linkbtn" data-act="clearpicks">Clear selection</button></div>`;
}

/* --------------------------- assumptions --------------------------- */

/* ------------------------------ AI analyst ------------------------------ */

interface SampleApi {
  json: (input: string, opts?: { signal?: AbortSignal; cache?: boolean }) => Promise<unknown>;
}

const analyst = {
  sample: null as SampleApi | null,
  text: '',
  busy: false,
  ctrl: null as AbortController | null,
  answer: null as AnalystAnswer | null,
  status: '',
  statusErr: false,
  applied: new Set<string>(),
  history: [] as { user: string; summary: string }[]
};

const AN_EXAMPLES = [
  'I drive about 40 miles a day, mostly freeway, and I can charge at home on solar.',
  'I tow a small trailer and have two kids. I want something efficient but cannot risk running out of range.',
  'I am not sure an EV is worth it. What would make keeping my current car the right call?',
  'Money is tight. I want the lowest monthly cost, even if it is less green.',
  'I drive a 2014 Subaru Outback worth about $9,000 and might trade it in for a hybrid. Which is better, trading in or selling it myself?',
  'I do not own a car right now and need one. Compare a few for me.'
];

const toShown = (f: FieldInfo, v: number): number => (f.kind === 'fraction' ? Math.round(v * 1e6) / 1e4 : Math.round(v * 1e4) / 1e4);
const fromShown = (f: FieldInfo, v: number): number => (f.kind === 'fraction' ? v / 100 : v);
const fmtField = (f: FieldInfo, v: number): string => (f.kind === 'yesno' ? (v ? 'Yes' : 'No') : f.kind === 'fraction' ? `${num(v * 100, 2)}%` : `${num(v, v % 1 === 0 ? 0 : 2)}${f.unit ? ' ' + f.unit : ''}`);

/** Snapshot of every input currently on screen, in stored units, for the analyst. */
function analystFields(): Map<string, FieldInfo> {
  const out = new Map<string, FieldInfo>();
  fieldRegistry.forEach((f, id) => {
    const v = f.scope === 'g' ? undefined : state.vehicles.find((x) => x.id === f.scope);
    const where = f.sub === 'loan' ? ' (loan)' : f.sub === 'lease' ? ' (lease)' : '';
    out.set(id, {
      id,
      label: `${v ? v.short + ': ' : ''}${f.meta.label}${where}`,
      unit: f.meta.pct ? '%' : f.meta.unit,
      value: readField(f),
      defaultValue: defaultOf(f),
      min: f.meta.bool ? 0 : f.meta.min,
      max: f.meta.bool ? 1 : f.meta.max,
      kind: f.meta.bool ? 'yesno' : f.meta.pct ? 'fraction' : 'number',
      note: f.meta.note ? f.meta.note.slice(0, 140) : undefined
    });
  });
  return out;
}

function addableCars(): Vehicle[] {
  return state.vehicles.filter((v) => !v.owned && state.groups[v.id] !== 'custom' && !state.selected.includes(v.id));
}

function analystPrompt(task: 'guide' | 'explain'): string {
  const opts = visibleOptions();
  const scored = scoreOptions(state.g, state.vehicles, opts, scoring());
  const keep = keepOf(scored);
  const results: ResultRow[] = [...scored]
    .sort((a, b) => a.rank - b.rank)
    .map((s) => {
      const none = s.spec.financing === 'none';
      const be = none || !hasCar() ? null : breakEvenGasPrice(state.g, s.vehicle, s.spec.financing, lx());
      const pb = none || !keep ? null : paybackYear(s.result, keep.result);
      return {
        rank: s.rank,
        option: optionName(s.spec),
        type: kindLabel(s.vehicle),
        financing: tagFor(s.spec),
        overall: Math.round(s.overall * 10) / 10,
        planet: Math.round(s.pillars.planet),
        people: Math.round(s.pillars.people),
        profit: Math.round(s.pillars.profit),
        netCostPV: Math.round(s.result.netCostNPV),
        co2eTonnes: Math.round(s.result.co2.total * 10) / 10,
        monthlyPayment: none ? null : Math.round(s.result.monthlyPayment),
        incentivesAndTaxSavings: none ? null : Math.round(incentiveTotal(s.result)),
        breakEvenGasPrice: none ? '-' : be === null ? 'none below $40/gal' : `$${num(be, 2)}/gal`,
        payback: none ? '-' : pb === null ? `not within ${state.g.horizonYears} yrs` : `year ${pb}`
      };
    });
  const cars: CarInfo[] = state.vehicles
    .filter((v) => !v.owned)
    .map((v) => ({ id: v.id, name: v.name, kind: v.kind, price: Math.round(v.price), selected: state.selected.includes(v.id), group: state.groups[v.id] }));
  const lead = task === 'explain' ? 'TASK: Explain these results in plain language and say what would change the outcome. Ask for more inputs only if essential.\n' : 'TASK: Work out which inputs matter for this person and suggest values; also say how the answer could change.\n';
  return buildPrompt({
    scenario: lead + analyst.text,
    history: analyst.history,
    fields: [...analystFields().values()],
    results,
    sensitivity: sensitivityRows(state.g, state.vehicles, opts, scoring(), optionName),
    cars,
    currentCar: hasCar() ? { name: lx().short, kind: lx().kind, saleValue: Math.round(lx().price) } : null,
    selectedCars: state.selected.map((id) => vehicle(id)?.short).filter(Boolean),
    settings: { path: state.g.disposal, mode: state.mode, scale: state.scale, aggregation: state.aggregation, preset: state.preset, view: state.view, horizonYears: state.g.horizonYears }
  });
}

function setAnStatus(msg: string, err = false): void {
  analyst.status = msg;
  analyst.statusErr = err;
  const el = document.getElementById('an-status');
  if (el) {
    el.textContent = msg;
    el.classList.toggle('err', err);
  }
}

async function runAnalyst(task: 'guide' | 'explain'): Promise<void> {
  if (!analyst.sample || analyst.busy) return;
  const ta = document.getElementById('an-text') as HTMLTextAreaElement | null;
  analyst.text = ta ? ta.value.trim().slice(0, 1500) : analyst.text;
  if (task === 'guide' && !analyst.text) {
    setAnStatus('Describe your situation first, or choose "Explain these results".', true);
    return;
  }
  analyst.busy = true;
  analyst.ctrl = new AbortController();
  setAnStatus('Thinking…');
  syncAnButtons();
  try {
    const raw = await analyst.sample.json(analystPrompt(task), { signal: analyst.ctrl.signal, cache: false });
    const ans = sanitizeAnswer(raw, { fields: analystFields(), addableCarIds: new Set(addableCars().map((v) => v.id)), removableCarIds: new Set(state.selected) });
    if (!hasContent(ans)) {
      analyst.answer = null;
      setAnStatus('The analyst did not return anything usable. Try rewording, or ask again.', true);
    } else {
      analyst.answer = ans;
      analyst.applied = new Set();
      analyst.history.push({ user: analyst.text || 'Explain the results', summary: ans.summary });
      setAnStatus('');
    }
  } catch (e) {
    const err = e as { name?: string; code?: string; message?: string };
    if (err?.name === 'AbortError' || err?.code === 'aborted') setAnStatus('Stopped.');
    else if (err?.code === 'rate_limited') setAnStatus('You have hit a usage limit for now. Try again in a little while.', true);
    else if (err?.code === 'not_granted') {
      analyst.sample = null;
      setAnStatus('', false);
      renderAnalyst();
      return;
    } else setAnStatus('The analyst could not answer just now. Your inputs are unchanged; try again.', true);
  } finally {
    analyst.busy = false;
    analyst.ctrl = null;
  }
  renderAnalystOut();
  syncAnButtons();
}

function syncAnButtons(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-act="an-analyze"],[data-act="an-explain"]').forEach((b) => (b.disabled = analyst.busy));
  const stop = document.querySelector<HTMLElement>('[data-act="an-stop"]');
  if (stop) stop.hidden = !analyst.busy;
}

function renderAnalyst(): void {
  const host = $('analyst');
  if (!analyst.sample) {
    host.hidden = true;
    return;
  }
  host.hidden = false;
  host.innerHTML = `<h2>Ask the analyst</h2>
  <p class="fine">Describe your situation in your own words. The analyst suggests which inputs to set (and to what), can add cars worth comparing, and explains what would change the result. It only reads the numbers on this page, and nothing changes until you tap Apply. Uses your Claude usage.</p>
  <label class="fine" for="an-text">Your situation</label>
  <textarea id="an-text" maxlength="1500" placeholder="e.g. I commute 40 miles a day, have solar panels, and my current car needs a $3,000 repair soon. Is it time to switch?"></textarea>
  <div class="an-examples" aria-label="Examples">${AN_EXAMPLES.map((t, i) => `<button class="chip" data-act="an-example" data-val="${i}">${esc(t)}</button>`).join('')}</div>
  <div class="an-actions"><button class="btn" data-act="an-analyze">Analyze my situation</button><button class="btn ghost" data-act="an-explain">Explain these results</button><button class="btn ghost" data-act="an-stop" hidden>Stop</button><span id="an-status" role="status" aria-live="polite"></span></div>
  <div id="an-out" class="an-out"></div>`;
  (document.getElementById('an-text') as HTMLTextAreaElement).value = analyst.text;
  setAnStatus(analyst.status, analyst.statusErr);
  renderAnalystOut();
  syncAnButtons();
}

function renderAnalystOut(): void {
  const out = document.getElementById('an-out');
  if (!out) return;
  const a = analyst.answer;
  if (!a) {
    out.innerHTML = '';
    return;
  }
  const fields = analystFields();
  const block = (title: string, inner: string) => (inner ? `<div class="an-block"><h3>${title}</h3>${inner}</div>` : '');
  const ul = (items: string[]) => (items.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '');

  const head = a.summary || a.interpretation ? `<div class="an-block"><p class="an-summary"><b>${esc(a.summary)}</b></p>${a.interpretation ? `<p>${esc(a.interpretation)}</p>` : ''}</div>` : '';

  const qs = a.questions
    .map((q, i) => {
      const f = q.field ? fields.get(q.field) : undefined;
      let ctl = '';
      if (f) {
        const start = q.value ?? f.value;
        ctl =
          f.kind === 'yesno'
            ? `<select id="an-q-${i}" aria-label="${esc(f.label)}"><option value="1" ${start ? 'selected' : ''}>Yes</option><option value="0" ${start ? '' : 'selected'}>No</option></select>`
            : `<input id="an-q-${i}" type="number" inputmode="decimal" value="${toShown(f, start)}" aria-label="${esc(f.label)}"><em class="fine">${esc(f.kind === 'fraction' ? '%' : f.unit)}</em>`;
        const done = analyst.applied.has('f:' + f.id);
        ctl += done ? ' <span class="an-done">Set</span>' : ` <button class="btn small" data-act="an-qset" data-val="${i}">Set</button>`;
      }
      return `<div class="an-q"><b>${esc(q.question)}</b>${q.why ? `<span class="an-why">${esc(q.why)}</span>` : ''}${f ? `<div class="an-row"><span class="fine">${esc(f.label)} (now ${esc(fmtField(f, f.value))}):</span>${ctl}</div>` : ''}</div>`;
    })
    .join('');

  const pending = a.suggestions.filter((s) => !analyst.applied.has('f:' + s.field));
  const sugs = a.suggestions
    .map((s, i) => {
      const f = fields.get(s.field) as FieldInfo;
      const done = analyst.applied.has('f:' + s.field);
      return `<div class="an-s"><b>${esc(f.label)}</b><span class="an-arrow">${esc(fmtField(f, f.value))} → <b>${esc(fmtField(f, s.value))}</b></span>${s.reason ? `<span class="an-why">${esc(s.reason)}</span>` : ''}<div class="an-row">${done ? '<span class="an-done">Applied</span>' : `<button class="btn small" data-act="an-apply" data-val="${i}">Apply</button>`}</div></div>`;
    })
    .join('');
  const applyAll = pending.length > 1 ? `<div class="an-row"><button class="btn small" data-act="an-applyall">Apply all ${pending.length}</button></div>` : '';

  const cars = a.addCars
    .map((c) => {
      const v = state.vehicles.find((x) => x.id === c.id);
      if (!v) return '';
      const on = state.selected.includes(c.id);
      return `<div class="an-s"><b>${esc(v.short)}</b><span class="an-why">${esc(c.reason)}</span><div class="an-row">${on ? '<span class="an-done">Added</span>' : `<button class="btn small" data-act="an-addcar" data-val="${c.id}">Add to comparison</button>`}</div></div>`;
    })
    .join('');

  const newCars = a.newCars
    .map((c, i) => {
      const done = analyst.applied.has('newcar:' + i);
      const eff = c.kind === 'ev' ? `${num(c.efficiency, 0)} kWh/100 mi` : `${num(c.efficiency, 0)} mpg`;
      return `<div class="an-s"><b>${esc(c.name)}</b><span class="an-arrow">${esc(c.kind === 'ev' ? 'EV' : c.kind === 'hybrid' ? 'Hybrid' : 'Gas')} · ${usd(c.price)} · ${esc(eff)}</span>${c.reason ? `<span class="an-why">${esc(c.reason)}</span>` : ''}<div class="an-row">${done ? '<span class="an-done">Added</span>' : `<button class="btn small" data-act="an-newcar" data-val="${i}">Add this car</button>`}</div></div>`;
    })
    .join('');
  const removes = a.removeCars
    .map((c) => {
      const v = state.vehicles.find((x) => x.id === c.id);
      if (!v) return '';
      const gone = !state.selected.includes(c.id);
      return `<div class="an-s"><b>Drop ${esc(v.short)}</b><span class="an-why">${esc(c.reason)}</span><div class="an-row">${gone ? '<span class="an-done">Removed</span>' : `<button class="btn small" data-act="an-removecar" data-val="${c.id}">Remove from comparison</button>`}</div></div>`;
    })
    .join('');
  const carName = a.currentCarName
    ? `<div class="an-s"><b>${esc(a.currentCarName)}</b><span class="an-why">Name for the car you have now. Its value, mpg and costs come from the input suggestions above.</span><div class="an-row">${analyst.applied.has('name') ? '<span class="an-done">Applied</span>' : '<button class="btn small" data-act="an-carname">Use this name</button>'}</div></div>`
    : '';

  let settings = '';
  if (a.settings) {
    const st = a.settings;
    const parts = [st.path && `path: ${PATHS.find((p) => p.id === st.path)?.label}`, st.mode && `scoring: ${MODES.find((m) => m.id === st.mode)?.label}`, st.scale && `scale: ${st.scale}`, st.preset && `weighting: ${PRESET_LABELS[st.preset]}`, st.view && `financing: ${st.view}`].filter(Boolean).join(' · ');
    settings = `<div class="an-s"><b>${esc(parts)}</b>${st.reason ? `<span class="an-why">${esc(st.reason)}</span>` : ''}<div class="an-row">${analyst.applied.has('settings') ? '<span class="an-done">Applied</span>' : '<button class="btn small" data-act="an-settings">Apply settings</button>'}</div></div>`;
  }

  const flips = a.flipFactors.length ? `<ul>${a.flipFactors.map((f) => `<li><b>${esc(f.factor)}:</b> ${esc(f.effect)}</li>`).join('')}</ul>` : '';
  out.innerHTML =
    head +
    block('Questions that would sharpen the answer', qs) +
    block('Suggested inputs', sugs + applyAll) +
    block('Your current car', carName) +
    block('Cars worth adding', cars + newCars) +
    block('Cars to drop', removes) +
    block('Suggested scoring settings', settings) +
    block('What the results mean', ul(a.explanation)) +
    block('What could change the outcome', flips) +
    block('Keep in mind', ul(a.caveats));
}

function applyAnalystField(fieldId: string, value: number): boolean {
  const f = fieldRegistry.get(fieldId);
  if (!f) return false;
  writeField(f, value);
  const input = document.getElementById(`in-${fieldId}`) as HTMLInputElement | HTMLSelectElement | null;
  if (input) input.value = String(f.meta.bool ? (value >= 0.5 ? 1 : 0) : Math.round(readField(f) * (f.meta.pct ? 100 : 1) * 10000) / 10000);
  analyst.applied.add('f:' + fieldId);
  return true;
}

function onAnalystAction(act: string, val: string): boolean {
  const a = analyst.answer;
  switch (act) {
    case 'an-example': {
      const ta = document.getElementById('an-text') as HTMLTextAreaElement;
      ta.value = AN_EXAMPLES[Number(val)] ?? '';
      ta.focus();
      return true;
    }
    case 'an-analyze':
      void runAnalyst('guide');
      return true;
    case 'an-explain':
      void runAnalyst('explain');
      return true;
    case 'an-stop':
      analyst.ctrl?.abort();
      return true;
    case 'an-apply': {
      const s = a?.suggestions[Number(val)];
      if (s && applyAnalystField(s.field, s.value)) {
        refreshEdited();
        renderResults();
        renderAnalystOut();
      }
      return true;
    }
    case 'an-applyall': {
      let n = 0;
      for (const s of a?.suggestions ?? []) if (!analyst.applied.has('f:' + s.field) && applyAnalystField(s.field, s.value)) n++;
      if (n) {
        refreshEdited();
        renderResults();
        renderAnalystOut();
        setAnStatus(`Applied ${n} input${n === 1 ? '' : 's'}. Scroll down to see the new results.`);
      }
      return true;
    }
    case 'an-qset': {
      const q = a?.questions[Number(val)];
      const f = q?.field ? analystFields().get(q.field) : undefined;
      const el = document.getElementById(`an-q-${val}`) as HTMLInputElement | HTMLSelectElement | null;
      if (!q || !f || !el || el.value.trim() === '') return true;
      const n = parseFloat(el.value);
      if (!Number.isFinite(n)) return true;
      if (applyAnalystField(f.id, f.kind === 'yesno' ? n : fromShown(f, n))) {
        refreshEdited();
        renderResults();
        renderAnalystOut();
      }
      return true;
    }
    case 'an-addcar': {
      if (state.selected.includes(val)) return true;
      if (state.selected.length >= MAX_SELECTED) {
        state.notice = `Pick up to ${MAX_SELECTED} cars. Remove one first.`;
        setAnStatus(state.notice, true);
        renderPicker();
        return true;
      }
      state.selected.push(val);
      state.notice = '';
      refreshAll();
      renderAnalystOut();
      return true;
    }
    case 'an-newcar': {
      const nc = a?.newCars[Number(val)];
      if (!nc || analyst.applied.has('newcar:' + val)) return true;
      if (state.selected.length >= MAX_SELECTED) {
        state.notice = `Pick up to ${MAX_SELECTED} cars. Remove one first.`;
        setAnStatus(state.notice, true);
        renderPicker();
        return true;
      }
      state.customCount += 1;
      const d = makeCustomVehicle(nc.kind, state.customCount);
      d.vehicle.name = nc.name;
      d.vehicle.short = nc.name;
      d.vehicle.price = nc.price;
      if (nc.kind === 'ev') d.vehicle.kwhPer100mi = nc.efficiency;
      else d.vehicle.mpg = nc.efficiency;
      if (d.vehicle.loan) d.vehicle.loan.down = Math.round((nc.price * 0.1) / 500) * 500;
      state.vehicles.push(clone(d.vehicle));
      state.defaults.push(clone(d.vehicle));
      state.meta[d.vehicle.id] = d.meta;
      state.ratingNotes[d.vehicle.id] = {};
      state.groups[d.vehicle.id] = 'custom';
      state.selected.push(d.vehicle.id);
      state.notice = '';
      analyst.applied.add('newcar:' + val);
      refreshAll();
      renderAnalystOut();
      return true;
    }
    case 'an-removecar': {
      state.selected = state.selected.filter((id) => id !== val);
      refreshAll();
      renderAnalystOut();
      return true;
    }
    case 'an-carname': {
      const name = a?.currentCarName;
      if (!name) return true;
      state.vehicles = state.vehicles.map((v) => (v.owned ? { ...v, name, short: name } : v));
      state.defaults = state.defaults.map((v) => (v.owned ? { ...v, name, short: name } : v));
      analyst.applied.add('name');
      refreshAll();
      renderAnalystOut();
      return true;
    }
    case 'an-settings': {
      const st = a?.settings;
      if (!st) return true;
      if (st.path) state.g.disposal = st.path;
      if (st.mode) state.mode = st.mode;
      if (st.scale) state.scale = st.scale;
      if (st.preset && WEIGHT_PRESETS[st.preset]) {
        state.preset = st.preset;
        state.weights = { ...WEIGHT_PRESETS[st.preset] };
      }
      if (st.view) state.view = st.view;
      analyst.applied.add('settings');
      renderControls();
      refreshAll();
      renderAnalystOut();
      return true;
    }
    default:
      return false;
  }
}

async function initAnalyst(): Promise<void> {
  try {
    const c = (window as unknown as { claude?: { use?: (n: string) => Promise<SampleApi | null> } }).claude;
    analyst.sample = c?.use ? await c.use('sample') : null;
  } catch {
    analyst.sample = null;
  }
  renderAnalyst();
}

/* ------------------------------ events ------------------------------ */

function applyTheme(): void {
  document.body.setAttribute('data-theme', state.theme);
}

function refreshAll(): void {
  renderPath();
  renderPicker();
  renderAssumptions();
  renderResults();
}

function onAction(act: string, val: string): void {
  if (act.startsWith('an-')) {
    onAnalystAction(act, val);
    return;
  }
  switch (act) {
    case 'theme':
      state.theme = val as Theme;
      safeStore('tbl-theme', val);
      applyTheme();
      renderControls();
      return;
    case 'mode':
      state.mode = val as ScoringMode;
      renderControls();
      break;
    case 'scale':
      state.scale = val as ScaleMode;
      renderControls();
      break;
    case 'agg':
      state.aggregation = val as Aggregation;
      renderControls();
      break;
    case 'preset':
      state.preset = val;
      state.weights = { ...WEIGHT_PRESETS[val] };
      renderControls();
      break;
    case 'view':
      state.view = val as View;
      renderControls();
      break;
    case 'path':
      state.g.disposal = val as Disposal;
      state.notice = '';
      refreshAll();
      return;
    case 'carpreset': {
      const c = currentCarFromPreset(val);
      state.vehicles = state.vehicles.map((v) => (v.owned ? clone(c.vehicle) : v));
      state.defaults = state.defaults.map((v) => (v.owned ? clone(c.vehicle) : v));
      state.meta.lx = c.meta;
      state.ratingNotes.lx = c.ratingNotes;
      state.carPreset = val;
      refreshAll();
      return;
    }
    case 'askanalyst':
      document.getElementById('analyst')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      (document.getElementById('an-text') as HTMLTextAreaElement | null)?.focus();
      return;
    case 'tab':
      state.tab = val as Tab;
      break;
    case 'showall':
      state.showAll = !state.showAll;
      break;
    case 'collapseall':
    case 'expandall': {
      const open = act === 'expandall';
      for (const k of Object.keys(state.secOpen)) state.secOpen[k] = open;
      document.querySelectorAll('details.asec').forEach((d) => ((d as HTMLDetailsElement).open = open));
      return;
    }
    case 'resview':
      state.resultsView = val as 'cards' | 'table';
      break;
    case 'resviewgo':
      state.resultsView = val as 'cards' | 'table';
      renderResults();
      document.getElementById('res-main')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    case 'sort':
      if (state.sortKey === val) state.sortDir = state.sortDir === 1 ? -1 : 1;
      else {
        state.sortKey = val;
        state.sortDir = val === 'overall' || val === 'planet' || val === 'people' || val === 'profit' || val === 'inc' ? -1 : 1;
      }
      break;
    case 'copytable': {
      const scored = scoreOptions(state.g, state.vehicles, visibleOptions(), scoring());
      const keep = keepOf(scored);
      const tsv = tableAsTsv(scored, keep);
      const done = (msg: string) => {
        state.copyNote = msg;
        const el = document.getElementById('copynote');
        if (el) el.textContent = msg;
      };
      try {
        void navigator.clipboard.writeText(tsv).then(
          () => done('Copied. Paste into Sheets or Excel.'),
          () => done('Copy was blocked here; select the table and copy it instead.')
        );
      } catch {
        done('Copy was blocked here; select the table and copy it instead.');
      }
      return;
    }
    case 'jump':
      document.getElementById('assump')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    case 'pick': {
      const i = state.selected.indexOf(val);
      state.notice = '';
      if (i >= 0) state.selected.splice(i, 1);
      else if (state.selected.length >= MAX_SELECTED) state.notice = `Pick up to ${MAX_SELECTED} cars. Remove one first.`;
      else state.selected.push(val);
      refreshAll();
      return;
    }
    case 'clearpicks':
      state.selected = [];
      state.notice = '';
      refreshAll();
      return;
    case 'addcustom': {
      if (state.selected.length >= MAX_SELECTED) {
        state.notice = `Pick up to ${MAX_SELECTED} cars. Remove one first.`;
        renderPicker();
        return;
      }
      state.customCount += 1;
      const d = makeCustomVehicle(val as 'ice' | 'hybrid' | 'ev', state.customCount);
      state.vehicles.push(clone(d.vehicle));
      state.defaults.push(clone(d.vehicle));
      state.meta[d.vehicle.id] = d.meta;
      state.ratingNotes[d.vehicle.id] = {};
      state.groups[d.vehicle.id] = 'custom';
      state.selected.push(d.vehicle.id);
      state.notice = '';
      refreshAll();
      return;
    }
    case 'rmcustom': {
      state.vehicles = state.vehicles.filter((v) => v.id !== val);
      state.defaults = state.defaults.filter((v) => v.id !== val);
      state.selected = state.selected.filter((id) => id !== val);
      delete state.meta[val];
      refreshAll();
      return;
    }
    case 'addlease': {
      const v = vehicle(val);
      const monthly = Math.round((v.price * 0.011) / 5) * 5;
      v.lease = { monthly, dueAtSigning: monthly + 2500, termMonths: 36 };
      const d = state.defaults.find((x) => x.id === val);
      if (d) d.lease = clone(v.lease);
      refreshAll();
      return;
    }
    case 'resetfield': {
      const f = fieldRegistry.get(val);
      if (!f) return;
      writeField(f, defaultOf(f));
      const input = document.getElementById(`in-${val}`) as HTMLInputElement | HTMLSelectElement | null;
      if (input) input.value = String(f.meta.bool ? defaultOf(f) : Math.round(defaultOf(f) * (f.meta.pct ? 100 : 1) * 10000) / 10000);
      refreshEdited();
      break;
    }
    case 'reset':
      state.g = clone(DEFAULT_GLOBALS);
      state.vehicles = clone(state.defaults);
      state.criteria = clone(DEFAULT_CRITERIA);
      refreshAll();
      return;
    default:
      return;
  }
  renderResults();
}

function bindEvents(): void {
  document.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
    if (el) onAction(el.dataset.act as string, el.dataset.val ?? '');
  });

  // <details> toggle events do not bubble, so listen in the capture phase to remember open/closed sections.
  document.addEventListener(
    'toggle',
    (e) => {
      const d = e.target as HTMLDetailsElement;
      if (d.dataset?.sec) state.secOpen[d.dataset.sec] = d.open;
    },
    true
  );

  document.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.dataset.field && t.tagName === 'INPUT') {
      const f = fieldRegistry.get(t.dataset.field);
      const n = parseFloat(t.value);
      if (f && Number.isFinite(n)) {
        writeField(f, f.meta.pct ? n / 100 : n);
        refreshEdited();
        renderResults();
      }
    } else if (t.dataset.wslider) {
      const k = t.dataset.wslider as keyof PillarWeights;
      state.weights = { ...state.weights, [k]: parseFloat(t.value) / 100 };
      state.preset = 'custom';
      const sum = state.weights.planet + state.weights.people + state.weights.profit || 1;
      (['planet', 'people', 'profit'] as const).forEach((p) => {
        const o = document.getElementById(`wo-${p}`);
        if (o) o.textContent = `${Math.round((state.weights[p] / sum) * 100)}%`;
      });
      document.querySelectorAll('[data-act="preset"]').forEach((b) => {
        b.classList.remove('on');
        b.setAttribute('aria-pressed', 'false');
      });
      const mode = MODES.find((m) => m.id === state.mode) as (typeof MODES)[number];
      $('ctl-summary').textContent = `${mode.label} · ${scaleLabel()} · Custom weights · ${state.aggregation === 'average' ? 'average' : 'weakest link'}`;
      renderResults();
    } else if (t.dataset.weight) {
      const c = state.criteria.find((x) => x.id === t.dataset.weight);
      const n = parseFloat(t.value);
      if (c && Number.isFinite(n)) {
        c.weight = Math.max(0, Math.min(100, n));
        renderResults();
      }
    } else if (t.dataset.vname) {
      const v = vehicle(t.dataset.vname);
      const name = t.value.trim() || 'My car';
      v.short = name;
      v.name = name;
      renderPicker();
      renderResults();
    }
  });

  document.addEventListener('change', (e) => {
    const t = e.target as HTMLSelectElement;
    if (t.dataset.rate) {
      vehicle(t.dataset.rate).ratings[t.dataset.crit as string] = parseInt(t.value, 10);
      renderResults();
    } else if (t.dataset.embodied !== undefined) {
      state.g.embodiedMode = t.value as 'allocated' | 'full';
      renderResults();
    } else if (t.dataset.field && t.tagName === 'SELECT') {
      const f = fieldRegistry.get(t.dataset.field);
      if (f) {
        writeField(f, parseFloat(t.value));
        refreshEdited();
        renderResults();
      }
    } else if (t.dataset.vname) {
      renderPicker();
    }
  });
}

export function init(): void {
  const saved = safeStore('tbl-theme');
  if (saved === 'ledger' || saved === 'night' || saved === 'field') state.theme = saved;
  applyTheme();
  renderControls();
  (document.getElementById('controls') as HTMLDetailsElement).open = window.innerWidth >= 760;
  renderPath();
  renderPicker();
  renderAssumptions();
  renderSources();
  renderResults();
  bindEvents();
  void initAnalyst();
  // Expose a tiny read-only hook so automated QA can verify state without scraping.
  (window as unknown as { __tbl: unknown }).__tbl = {
    snapshot: () => {
      const keep = computeOption(state.g, lx(), 'none', lx());
      return {
        theme: state.theme,
        mode: state.mode,
        selected: [...state.selected],
        ranks: scoreOptions(state.g, state.vehicles, visibleOptions(), scoring()).map((s) => ({ id: s.spec.id, rank: s.rank, overall: s.overall, profit: s.pillars.profit, npv: s.result.netCostNPV })),
        keepNPV: keep.netCostNPV
      };
    }
  };
}
