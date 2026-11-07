import { WEIGHT_PRESETS, type Aggregation, type ScaleMode, type ScoringMode } from '../../engine';
import { addLease, findField, resetAll } from '../../app/assumptions';
import { defaultOfIn, readFieldIn, writeFieldIn } from '../../app/fields';
import { decimalsOf, formatNumberText } from '../../app/numberText';
import { state, type Theme, type View } from '../../app/state';
import { safeStore } from '../../app/storage';
import { applyTheme } from '../events';
import { clearShareHash, renderAnswer } from '../steps/router';
import { openSheetId } from '../components/sheet';
import type { DsNumberDetail } from '../components/field';
import { FT_SHEET, fineTuneBody, refreshFineTuneStatus } from './fineTuneSheet';
import { allAssumptions, carBody, domId, fieldStatus, resetHtml, scoringBody } from './assumptionsPanel';

/** The car whose numbers are shown in "Your cars' numbers" (screen-local; the first editable car when empty). */
let ftCar = '';

/** The car shown in Fine-tune's car section. */
export const fineTuneCar = (): string => ftCar;

const $ = (id: string): HTMLElement | null => document.getElementById(id);

/** Announce the new verdict in Fine-tune's live region. */
function announce(): void {
  const live = $('ft-live');
  if (live) live.textContent = `Answer updated. ${$('ans-title')?.textContent ?? ''}`;
}

/** Put every on-screen value, label, reset link and edit count back in step with state, except `skip` (the field being typed in). */
export function syncFineTune(skip: Element | null = document.activeElement): void {
  const active = skip;
  document.querySelectorAll<HTMLElement>('#ft [data-fwrap]').forEach((wrap) => {
    const fid = wrap.dataset.fwrap as string;
    const f = findField(state, fid);
    if (!f) return;
    const d = domId(fid);
    const st = $(`fs-${d}`);
    if (st) st.innerHTML = fieldStatus(state, f);
    const rs = $(`fr-${d}`);
    if (rs && !rs.contains(document.activeElement)) rs.innerHTML = resetHtml(state, f);
    const v = readFieldIn(state, f);
    if (f.meta.bool) {
      wrap.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach((r) => (r.checked = (r.value === '1') === v >= 0.5));
      return;
    }
    const input = $(`fe-${d}`) as HTMLInputElement | null;
    if (!input || input === active) return;
    const shown = Math.round(v * (f.meta.pct ? 100 : 1) * 1e6) / 1e6;
    input.value = formatNumberText(shown, decimalsOf(Number(input.dataset.step)));
    input.dataset.last = String(shown);
  });
  // Top drivers share values with the sections (gas price, sale value, first-time EV buyer, trade-in discount).
  const setText = (id: string, value: number) => {
    const el = $(id) as HTMLInputElement | null;
    if (!el || el === active) return;
    el.value = formatNumberText(value, decimalsOf(Number(el.dataset.step)));
    el.dataset.last = String(value);
  };
  setText('ft-gas', state.g.gasPrice);
  if (state.g.disposal === 'sell') setText('ft-value', state.vehicles.find((v) => v.owned)?.price ?? 0);
  setText('ft-discount', Math.round(state.g.tradeInDiscount * 100));
  document.querySelectorAll<HTMLInputElement>('input[name="ft-zev"]').forEach((r) => (r.checked = (r.value === '1') === state.g.firstTimeZev));
  const miles = $('ft-miles') as HTMLInputElement | null;
  if (miles && miles !== active && Number(miles.value) !== state.g.milesPerYear) {
    miles.value = String(state.g.milesPerYear);
    const out = $('ft-miles-out');
    if (out) out.textContent = state.g.milesPerYear.toLocaleString('en-US');
    miles.setAttribute('aria-valuetext', `${state.g.milesPerYear.toLocaleString('en-US')} miles a year`);
  }
  refreshFineTuneStatus(state);
  refreshCounts();
}

/** Update the section edit counts and the "N values changed" line from a fresh render of the same sections. */
function refreshCounts(): void {
  const tmp = document.createElement('div');
  tmp.innerHTML = allAssumptions(state, ftCar);
  for (const id of ['confirm', 'drivers', 'cars', 'emissions', 'other']) {
    const now = $(`ft-sec-${id}-meta`);
    const fresh = tmp.querySelector(`#ft-sec-${id}-meta`);
    if (now && fresh) now.textContent = fresh.textContent;
  }
  const c = $('ft-edcount');
  const fresh = tmp.querySelector('#ft-edcount');
  if (c && fresh && c.textContent !== fresh.textContent) c.textContent = fresh.textContent;
}

/** After any Fine-tune edit: the share name is out of date, the answer is re-drawn, the panel re-synced and announced. */
export function afterFineTuneEdit(skip: Element | null = document.activeElement): void {
  clearShareHash();
  renderAnswer();
  syncFineTune(skip);
  announce();
}

/** Re-render the whole sheet body (after Reset all), keeping open sections and putting focus back on `focusId`. */
function rerenderBody(focusId: string): void {
  const body = document.querySelector('#ft .ds-sheet-body');
  if (!body) return;
  body.innerHTML = fineTuneBody(state, ftCar);
  $(focusId)?.focus();
}

/** Show one car's numbers. */
function showCar(id: string, focusId?: string): void {
  ftCar = id;
  const host = $('ft-carbody');
  if (host) host.innerHTML = carBody(state, id);
  if (focusId) $(focusId)?.focus();
}

function setSecOpen(open: boolean): void {
  for (const k of ['confirm', 'drivers', 'cars', 'emissions', 'other']) state.secOpen[k] = open;
  document.querySelectorAll<HTMLDetailsElement>('#ft-all-body details[data-sec]').forEach((d) => (d.open = open));
}

/** Re-render the scoring settings (sliders follow a preset), keeping focus on the radio that was chosen. */
function rerenderScoring(name: string): void {
  const host = $('ft-scoring-body');
  if (!host) return;
  host.innerHTML = scoringBody(state);
  host.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.focus();
}

let bound = false;

/** Install the listeners for everything below Fine-tune's top drivers, once. */
export function bindFineTuneActions(): void {
  if (bound) return;
  bound = true;
  document.addEventListener('ds:number', (e) => {
    if (openSheetId() !== FT_SHEET) return;
    const d = (e as CustomEvent<DsNumberDetail>).detail;
    if (d.name.startsWith('f:')) {
      const f = findField(state, d.name.slice(2));
      if (!f) return;
      writeFieldIn(state, f, f.meta.pct ? d.value / 100 : d.value);
      afterFineTuneEdit();
    } else if (d.name.startsWith('w.')) {
      const k = d.name.slice(2) as 'planet' | 'people' | 'profit';
      if (!(k in state.weights)) return;
      state.weights = { ...state.weights, [k]: Math.max(0, Math.min(1, d.value / 100)) };
      state.preset = 'custom';
      const custom = document.querySelector<HTMLInputElement>('input[name="ft-preset"][value="custom"]');
      if (custom) custom.checked = true;
      afterFineTuneEdit();
    }
  });
  document.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act^="ft-"]');
    if (!el || openSheetId() !== FT_SHEET) return;
    switch (el.dataset.act) {
      case 'ft-reset': {
        const fid = el.dataset.val ?? '';
        const f = findField(state, fid);
        if (!f) return;
        writeFieldIn(state, f, defaultOfIn(state, f));
        afterFineTuneEdit(null);
        const d = domId(fid);
        (($(`fe-${d}`) as HTMLElement | null) ?? document.querySelector<HTMLElement>(`input[name="fb-${d}"]:checked`))?.focus();
        return;
      }
      case 'ft-resetall':
        resetAll(state);
        clearShareHash();
        renderAnswer();
        rerenderBody('ft-resetall');
        announce();
        return;
      case 'ft-openall':
        setSecOpen(true);
        return;
      case 'ft-closeall':
        setSecOpen(false);
        return;
      case 'ft-addlease':
        if (addLease(state, el.dataset.val ?? '')) {
          showCar(el.dataset.val ?? '', `fe-${domId(`${el.dataset.val}.lease.monthly`)}`);
          afterFineTuneEdit();
        }
        return;
    }
  });
  document.addEventListener('change', (e) => {
    const el = e.target as HTMLInputElement;
    if (!(el instanceof HTMLInputElement) || openSheetId() !== FT_SHEET) return;
    switch (el.dataset.act) {
      case 'ft-bool': {
        const f = findField(state, el.dataset.fid ?? '');
        if (!f) return;
        writeFieldIn(state, f, el.value === '1' ? 1 : 0);
        afterFineTuneEdit();
        return;
      }
      case 'ft-car':
        showCar(el.value);
        return;
      case 'ft-embodied':
        state.g.embodiedMode = el.value === 'full' ? 'full' : 'allocated';
        break;
      case 'ft-mode':
        state.mode = el.value as ScoringMode;
        rerenderScoring('ft-mode');
        break;
      case 'ft-scale':
        state.scale = el.value as ScaleMode;
        break;
      case 'ft-agg':
        state.aggregation = el.value as Aggregation;
        break;
      case 'ft-preset':
        if (el.value === 'custom') return;
        state.preset = el.value;
        state.weights = { ...WEIGHT_PRESETS[el.value] };
        rerenderScoring('ft-preset');
        break;
      case 'ft-view':
        state.view = el.value as View;
        break;
      case 'ft-theme':
        state.theme = (el.value === 'night' ? 'night' : 'ledger') as Theme;
        safeStore('tbl-theme', state.theme);
        applyTheme();
        return;
      default:
        return;
    }
    afterFineTuneEdit();
  });
  document.addEventListener('input', (e) => {
    const el = e.target as HTMLInputElement;
    if (!(el instanceof HTMLInputElement) || el.dataset.act !== 'ft-rename') return;
    const car = state.vehicles.find((v) => v.id === el.dataset.car);
    if (!car) return;
    const name = el.value.trim() || 'My car';
    car.short = name;
    car.name = name;
    const chip = $(`ft-carname-${car.id}`);
    if (chip) chip.textContent = car.owned ? `Yours: ${name}` : name;
    afterFineTuneEdit();
  });
}
