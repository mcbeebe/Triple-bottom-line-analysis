import { WEIGHT_PRESETS } from '../../engine';
import { hasContent, sanitizeAnswer, type FieldInfo } from '../../analyst';
import { esc, num, usd } from '../../app/format';
import { fieldRegistry, readField, writeField } from '../../app/fields';
import { MODES, PRESET_LABELS, state } from '../../app/state';
import { analyst } from '../../app/analystSession';
import { AN_EXAMPLES, addableCars, analystFields, analystPrompt, fmtField, fromShown, toShown } from '../../app/analystBridge';
import { ArtifactSampleClient, describeAnalystError, type AnalystClient } from '../../app/analystClient';
import { PATHS } from '../legacy/pathPanel';
import { renderResults } from '../answer/answer';
import { refreshEdited } from '../answer/fineTune';
import { addCatalogCar, addCustomCar } from '../../app/mutations';
import { refresh } from '../refresh';

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
  if (!analyst.client || analyst.busy) return;
  const ta = document.getElementById('an-text') as HTMLTextAreaElement | null;
  analyst.text = ta ? ta.value.trim().slice(0, 1500) : analyst.text;
  if (task === 'guide' && !analyst.text) {
    setAnStatus('Describe your situation first, or choose "Explain these results".', true);
    return;
  }
  analyst.busy = true;
  analyst.ctrl = new AbortController();
  setAnStatus('Thinking… This can take up to a minute.');
  syncAnButtons();
  try {
    const raw = await analyst.client.ask(analystPrompt(task), analyst.ctrl.signal, () => setAnStatus('Writing the answer…'));
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
    const v = describeAnalystError(e);
    // The code is shown so a failure on the live site can be diagnosed; it never includes what was typed.
    const text = v.isError ? `${v.message} (code: ${v.code})` : v.message;
    if (v.hide) {
      analyst.client = null;
      setAnStatus(text, true);
      renderAnalyst();
      refresh.screen();
      return;
    }
    setAnStatus(text, v.isError);
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

/** Where the analyst renders: the old page's panel, or the body of the "Ask the analyst" sheet. */
export type AnalystHost = 'analyst' | 'ai-host';

/** Class names per host: the old page's styles, or design-system buttons (44 px targets) in the sheet. */
const SKINS = {
  analyst: { btn: 'btn', ghost: 'btn ghost', small: 'btn small', chip: 'chip', label: 'fine' },
  'ai-host': { btn: 'ds-btn ds-btn-primary', ghost: 'ds-btn ds-btn-secondary', small: 'ds-btn ds-btn-secondary', chip: 'ds-chip', label: 'ds-label' }
} as const;

let hostId: AnalystHost = 'analyst';
let K: (typeof SKINS)[AnalystHost] = SKINS.analyst;

/** The host the analyst renders into now. */
export const analystHost = (): AnalystHost => hostId;

/**
 * Move the analyst to `id` and render it there. The other host is emptied so its ids (an-text, an-out,
 * an-status) exist only once. Session state (text, last answer, what was applied) is kept.
 */
export function setAnalystHost(id: AnalystHost): void {
  const other = document.getElementById(id === 'analyst' ? 'ai-host' : 'analyst');
  if (other && hostId !== id) other.innerHTML = '';
  hostId = id;
  K = SKINS[id];
  renderAnalyst();
}

/** Render the analyst into its current host, or hide the old panel when no client is available. */
export function renderAnalyst(): void {
  const host = document.getElementById(hostId);
  if (!host) return;
  if (!analyst.client) {
    if (hostId === 'analyst') host.hidden = true;
    else host.innerHTML = `<p class="ds-note" role="status">${esc(analyst.status || 'The analyst is not available here.')}</p>`;
    return;
  }
  host.hidden = false;
  // In the sheet the Analyze button comes before the long examples, so it is in view on a phone.
  const examples = `<div class="an-examples" aria-label="Examples">${AN_EXAMPLES.map((t, i) => `<button type="button" class="${K.chip}" data-act="an-example" data-val="${i}">${esc(t)}</button>`).join('')}</div>`;
  const intro =
    hostId === 'analyst'
      ? `<h2>Ask the analyst</h2>
  <p class="fine">Describe your situation in your own words. The analyst suggests which inputs to set (and to what), can add cars worth comparing, and explains what would change the result. It only reads the numbers on this page, and nothing changes until you tap Apply. Uses your Claude usage.</p>`
      : `<p class="ds-guide-note">Say it in your own words. The analyst suggests answers and cars to compare; nothing changes until you tap Apply. Uses your Claude usage.</p>`;
  host.innerHTML = `${intro}
  <label class="${K.label}" for="an-text">Your situation</label>
  <textarea id="an-text" maxlength="1500" placeholder="e.g. I commute 40 miles a day, have solar panels, and my current car needs a $3,000 repair soon. Is it time to switch?"></textarea>
  ${hostId === 'analyst' ? examples : ''}
  <div class="an-actions"><button type="button" class="${K.btn}" data-act="an-analyze">Analyze my situation</button><button type="button" class="${K.ghost}" data-act="an-explain">Explain these results</button><button type="button" class="${K.ghost}" data-act="an-stop" hidden>Stop</button><span id="an-status" role="status" aria-live="polite"></span></div>
  ${hostId === 'analyst' ? '' : `<h3 class="ds-group-h">Or start from an example</h3>${examples}`}
  <div id="an-out" class="an-out"></div>`;
  (document.getElementById('an-text') as HTMLTextAreaElement).value = analyst.text;
  setAnStatus(analyst.status, analyst.statusErr);
  renderAnalystOut();
  syncAnButtons();
}

/** Render the last answer (questions, suggestions, cars, settings, explanation) with Apply controls. */
export function renderAnalystOut(): void {
  const out = document.getElementById('an-out');
  if (!out) return;
  const a = analyst.answer;
  // An applied button is replaced by "Applied": keep focus on the next button rather than dropping it to the page.
  const before = [...out.querySelectorAll<HTMLElement>('button')];
  const focusAt = before.indexOf(document.activeElement as HTMLElement);
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
        ctl += done ? ' <span class="an-done">Set</span>' : ` <button class="${K.small}" data-act="an-qset" data-val="${i}">Set</button>`;
      }
      return `<div class="an-q"><b>${esc(q.question)}</b>${q.why ? `<span class="an-why">${esc(q.why)}</span>` : ''}${f ? `<div class="an-row"><span class="fine">${esc(f.label)} (now ${esc(fmtField(f, f.value))}):</span>${ctl}</div>` : ''}</div>`;
    })
    .join('');

  const pending = a.suggestions.filter((s) => !analyst.applied.has('f:' + s.field));
  const sugs = a.suggestions
    .map((s, i) => {
      const f = fields.get(s.field) as FieldInfo;
      const done = analyst.applied.has('f:' + s.field);
      return `<div class="an-s"><b>${esc(f.label)}</b><span class="an-arrow">${esc(fmtField(f, f.value))} → <b>${esc(fmtField(f, s.value))}</b></span>${s.reason ? `<span class="an-why">${esc(s.reason)}</span>` : ''}<div class="an-row">${done ? '<span class="an-done">Applied</span>' : `<button class="${K.small}" data-act="an-apply" data-val="${i}">Apply</button>`}</div></div>`;
    })
    .join('');
  const applyAll = pending.length > 1 ? `<div class="an-row"><button class="${K.small}" data-act="an-applyall">Apply all ${pending.length}</button></div>` : '';

  const cars = a.addCars
    .map((c) => {
      const v = state.vehicles.find((x) => x.id === c.id);
      if (!v) return '';
      const on = state.selected.includes(c.id);
      return `<div class="an-s"><b>${esc(v.short)}</b><span class="an-why">${esc(c.reason)}</span><div class="an-row">${on ? '<span class="an-done">Added</span>' : `<button class="${K.small}" data-act="an-addcar" data-val="${c.id}">Add to comparison</button>`}</div></div>`;
    })
    .join('');

  const newCars = a.newCars
    .map((c, i) => {
      const done = analyst.applied.has('newcar:' + i);
      const eff = c.kind === 'ev' ? `${num(c.efficiency, 0)} kWh/100 mi` : `${num(c.efficiency, 0)} mpg`;
      return `<div class="an-s"><b>${esc(c.name)}</b><span class="an-arrow">${esc(c.kind === 'ev' ? 'EV' : c.kind === 'hybrid' ? 'Hybrid' : 'Gas')} · ${usd(c.price)} · ${esc(eff)}</span>${c.reason ? `<span class="an-why">${esc(c.reason)}</span>` : ''}<div class="an-row">${done ? '<span class="an-done">Added</span>' : `<button class="${K.small}" data-act="an-newcar" data-val="${i}">Add this car</button>`}</div></div>`;
    })
    .join('');
  const removes = a.removeCars
    .map((c) => {
      const v = state.vehicles.find((x) => x.id === c.id);
      if (!v) return '';
      const gone = !state.selected.includes(c.id);
      return `<div class="an-s"><b>Drop ${esc(v.short)}</b><span class="an-why">${esc(c.reason)}</span><div class="an-row">${gone ? '<span class="an-done">Removed</span>' : `<button class="${K.small}" data-act="an-removecar" data-val="${c.id}">Remove from comparison</button>`}</div></div>`;
    })
    .join('');
  const carName = a.currentCarName
    ? `<div class="an-s"><b>${esc(a.currentCarName)}</b><span class="an-why">Name for the car you have now. Its value, mpg and costs come from the input suggestions above.</span><div class="an-row">${analyst.applied.has('name') ? '<span class="an-done">Applied</span>' : `<button type="button" class="${K.small}" data-act="an-carname">Use this name</button>`}</div></div>`
    : '';

  let settings = '';
  if (a.settings) {
    const st = a.settings;
    const parts = [st.path && `path: ${PATHS.find((p) => p.id === st.path)?.label}`, st.mode && `scoring: ${MODES.find((m) => m.id === st.mode)?.label}`, st.scale && `scale: ${st.scale}`, st.preset && `weighting: ${PRESET_LABELS[st.preset]}`, st.view && `financing: ${st.view}`].filter(Boolean).join(' · ');
    settings = `<div class="an-s"><b>${esc(parts)}</b>${st.reason ? `<span class="an-why">${esc(st.reason)}</span>` : ''}<div class="an-row">${analyst.applied.has('settings') ? '<span class="an-done">Applied</span>' : `<button type="button" class="${K.small}" data-act="an-settings">Apply settings</button>`}</div></div>`;
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
  if (focusAt >= 0) {
    const after = [...out.querySelectorAll<HTMLElement>('button')];
    (after[Math.min(focusAt, after.length - 1)] ?? document.getElementById('an-text'))?.focus();
  }
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

/** Handle an `an-*` action from the panel; returns true when the action was recognised. */
export function onAnalystAction(act: string, val: string): boolean {
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
        setAnStatus(`Applied ${n} input${n === 1 ? '' : 's'}.${hostId === 'analyst' ? ' Scroll down to see the new results.' : ''}`);
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
      const r = addCatalogCar(state, val);
      if (r === 'limit') {
        setAnStatus(state.notice, true);
        refresh.picker();
        return true;
      }
      if (r !== 'added') return true;
      refresh.all();
      renderAnalystOut();
      return true;
    }
    case 'an-newcar': {
      const nc = a?.newCars[Number(val)];
      if (!nc || analyst.applied.has('newcar:' + val)) return true;
      if (addCustomCar(state, { kind: nc.kind, name: nc.name, price: nc.price, efficiency: nc.efficiency }) === null) {
        setAnStatus(state.notice, true);
        refresh.picker();
        return true;
      }
      analyst.applied.add('newcar:' + val);
      refresh.all();
      renderAnalystOut();
      return true;
    }
    case 'an-removecar': {
      state.selected = state.selected.filter((id) => id !== val);
      refresh.all();
      renderAnalystOut();
      return true;
    }
    case 'an-carname': {
      const name = a?.currentCarName;
      if (!name) return true;
      state.vehicles = state.vehicles.map((v) => (v.owned ? { ...v, name, short: name } : v));
      state.defaults = state.defaults.map((v) => (v.owned ? { ...v, name, short: name } : v));
      analyst.applied.add('name');
      refresh.all();
      renderAnalystOut();
      return true;
    }
    case 'an-settings': {
      const st = a?.settings;
      if (!st) return true;
      if (st.path) {
        state.g.disposal = st.path;
        state.pathChosen = true;
      }
      if (st.mode) state.mode = st.mode;
      if (st.scale) state.scale = st.scale;
      if (st.preset && WEIGHT_PRESETS[st.preset]) {
        state.preset = st.preset;
        state.weights = { ...WEIGHT_PRESETS[st.preset] };
      }
      if (st.view) state.view = st.view;
      analyst.applied.add('settings');
      refresh.controls();
      refresh.all();
      renderAnalystOut();
      return true;
    }
    default:
      return false;
  }
}

/** Resolve the client once and render the panel; the panel stays hidden when the client is unavailable. */
export async function initAnalyst(client: AnalystClient = new ArtifactSampleClient()): Promise<void> {
  analyst.client = (await client.available()) ? client : null;
  renderAnalyst();
  refresh.screen();
}
