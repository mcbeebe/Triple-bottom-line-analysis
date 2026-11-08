import { WEIGHT_PRESETS } from '../../engine';
import { esc } from '../../app/format';
import { fieldId, type Field } from '../../app/fields';
import { TOP_DRIVER_KEYS, assumptionSections, carFieldGroups, findField, defaultText, editableCars, editedCount, fieldDisplay, isEditedIn } from '../../app/assumptions';
import { MODES, PRESET_LABELS, type State } from '../../app/state';
import { dsButton } from '../components/button';
import { dsDisclosure } from '../components/disclosure';
import { dsField } from '../components/field';
import { dsSlider } from '../components/slider';
import { dsStatusLabel } from '../components/statusLabel';
import { statusOf } from '../steps/status';

/** DOM-safe form of a field id (`bolt.loan.apr` -> `bolt-loan-apr`). */
export const domId = (fid: string): string => fid.replace(/[^a-zA-Z0-9_-]/g, '-');

/** The status label of a field: Your number when edited, otherwise Source (with its link) or Placeholder. */
export const fieldStatus = (s: State, f: Field): string => dsStatusLabel(statusOf(f.meta, isEditedIn(s, f)));

/** "Reset to $5.50" for an edited field, or nothing. */
export const resetHtml = (s: State, f: Field): string =>
  isEditedIn(s, f) ? dsButton({ label: `Reset to ${defaultText(s, f)}`, act: 'ft-reset', val: fieldId(f), variant: 'link', id: `fr-btn-${domId(fieldId(f))}` }) : '';

/** One editable value: a number field or a Yes/No pair, with its status label and a reset link when edited. */
export function fieldControl(s: State, f: Field): string {
  const fid = fieldId(f);
  const d = domId(fid);
  const status = `<span class="ds-status-slot" id="fs-${d}">${fieldStatus(s, f)}</span>`;
  const reset = `<div class="ds-reset-slot" id="fr-${d}">${resetHtml(s, f)}</div>`;
  if (f.meta.bool) {
    const yes = fieldDisplay(s, f).value >= 0.5;
    const radio = (v: string, label: string, on: boolean) => `<label class="ds-radio"><input type="radio" name="fb-${d}" value="${v}" data-act="ft-bool" data-fid="${esc(fid)}"${on ? ' checked' : ''}><span>${label}</span></label>`;
    return `<fieldset class="ds-radios ds-ft-group" data-fwrap="${esc(fid)}"><legend class="ds-label-row"><span class="ds-label">${esc(fieldDisplay(s, f).label)}</span>${status}</legend>${radio('1', 'Yes', yes)}${radio('0', 'No', !yes)}${f.meta.note ? `<p class="ds-hint">${esc(f.meta.note)}</p>` : ''}${reset}</fieldset>`;
  }
  const v = fieldDisplay(s, f);
  return `<div class="ds-ft-field" data-fwrap="${esc(fid)}">${dsField({ id: `fe-${d}`, name: `f:${fid}`, label: v.label, value: v.value, min: v.min, max: v.max, step: v.step, money: v.money, unit: v.unit, note: f.meta.note, statusHtml: status })}${reset}</div>`;
}

const editedMeta = (n: number): string => (n ? `${n} edited` : '');

/** The manufacturing-emissions choice (not a number, so it is a pair of radios). */
function embodiedControl(s: State): string {
  const on = s.g.embodiedMode;
  const r = (v: string, label: string) => `<label class="ds-radio"><input type="radio" name="ft-embodied" value="${v}" data-act="ft-embodied"${on === v ? ' checked' : ''}><span>${label}</span></label>`;
  return `<fieldset class="ds-radios ds-ft-group"><legend class="ds-label-row"><span class="ds-label">Making the car: how much counts to you</span>${dsStatusLabel({ kind: 'placeholder' })}</legend>${r('allocated', 'A fair share')}${r('full', 'All of it')}<p class="ds-hint">A fair share spreads the factory carbon over the car's whole life, since later owners use it too. "All of it" counts every tonne to your purchase.</p></fieldset>`;
}

/** The car chips and the chosen car's numbers (decision D1: one car at a time). */
export function carsSection(s: State, carId: string): string {
  const cars = editableCars(s);
  if (!cars.length) return '<p class="ds-small">Choose cars to compare first.</p>';
  const car = cars.find((v) => v.id === carId) ?? cars[0];
  const chips = `<fieldset class="ds-radios"><legend class="ds-label">Car</legend>${cars
    .map((v) => `<label class="ds-radio"><input type="radio" name="ft-car" value="${esc(v.id)}" data-act="ft-car"${v === car ? ' checked' : ''}><span id="ft-carname-${esc(v.id)}">${esc(v.owned ? `Yours: ${v.short}` : v.short)}</span></label>`)
    .join('')}</fieldset>`;
  return `<p class="ds-small">Pick a car, then change any of its numbers. To compare cars side by side, use Table.</p>${chips}<div id="ft-carbody" class="ds-stack">${carBody(s, car.id)}</div>`;
}

/** One car's numbers in groups, its name (for your own cars) and "Add a lease" where it has none. */
export function carBody(s: State, carId: string): string {
  const car = s.vehicles.find((v) => v.id === carId);
  if (!car) return '';
  const renamable = car.owned || car.id.startsWith('custom');
  const name = renamable
    ? `<div class="ds-field"><label class="ds-label" for="ft-rename">Name</label><div class="ds-input"><input id="ft-rename" type="text" maxlength="40" autocomplete="off" value="${esc(car.short)}" data-act="ft-rename" data-car="${esc(car.id)}"></div><p class="ds-hint" id="ft-rename-hint">Shown on the cards. Names you type are never put in share links.</p></div>`
    : '';
  const groups = carFieldGroups(s, carId)
    .map((g) => {
      const fields = g.fields.map((f) => fieldControl(s, f)).join('');
      const add = g.addLease ? `<p class="ds-small">No lease offer is entered for this car.</p>${dsButton({ label: 'Add a lease', act: 'ft-addlease', val: carId, variant: 'secondary', id: 'ft-addlease' })}` : '';
      return `<h4 class="ds-h4">${esc(g.title)}</h4>${fields}${add}`;
    })
    .join('');
  return name + groups;
}

/** "All assumptions": every value, in sections that remember whether they are open, with edit counts and Reset all. */
export function allAssumptions(s: State, carId: string): string {
  const secs = assumptionSections(s);
  const carFields = editableCars(s).flatMap((v) => carFieldGroups(s, v.id).flatMap((g) => g.fields));
  const top = TOP_DRIVER_KEYS.map((k) => findField(s, `g..${k}`)).filter((f): f is Field => !!f);
  const total = secs.reduce((n, x) => n + editedCount(s, x.fields), 0) + editedCount(s, carFields) + editedCount(s, top);
  const head = `<div class="ds-ft-head"><p class="ds-small" id="ft-edcount" role="status">${total ? `${total} value${total === 1 ? '' : 's'} changed from the defaults.` : 'No values changed yet.'}</p>
<div class="ds-ft-tools">${dsButton({ label: 'Open all', act: 'ft-openall', variant: 'link', id: 'ft-openall' })}${dsButton({ label: 'Close all', act: 'ft-closeall', variant: 'link', id: 'ft-closeall' })}${dsButton({ label: 'Reset all', act: 'ft-resetall', variant: 'link', id: 'ft-resetall' })}</div></div>`;
  const disc = (id: string, title: string, body: string, n: number) =>
    dsDisclosure({ id: `ft-sec-${id}`, sec: id, title, meta: editedMeta(n), metaId: `ft-sec-${id}-meta`, open: !!s.secOpen[id], bodyHtml: body });
  const parts = secs.map((x) => {
    const body = x.fields.map((f) => fieldControl(s, f)).join('') + (x.id === 'emissions' ? embodiedControl(s) : '');
    return { id: x.id, html: disc(x.id, x.title, body, editedCount(s, x.fields)) };
  });
  const cars = disc('cars', "Your cars' numbers", carsSection(s, carId), editedCount(s, carFields));
  const order = ['confirm', 'drivers', 'cars', 'emissions', 'other'];
  const byId = Object.fromEntries([...parts.map((p) => [p.id, p.html]), ['cars', cars]]);
  return head + `<div class="ds-stack">${order.map((id) => byId[id]).join('')}</div>`;
}

/** Radios for one single-choice setting. */
function radios(legend: string, name: string, opts: [string, string][], on: string, hint = ''): string {
  return `<fieldset class="ds-radios ds-ft-group"><legend class="ds-label">${esc(legend)}</legend>${opts
    .map(([v, l]) => `<label class="ds-radio"><input type="radio" name="${name}" value="${esc(v)}" data-act="${name}"${v === on ? ' checked' : ''}><span>${esc(l)}</span></label>`)
    .join('')}${hint ? `<p class="ds-hint">${esc(hint)}</p>` : ''}</fieldset>`;
}

/** "Scoring and appearance" (mockup 3b): method, what 50 means, combining, weighting with sliders, financing shown, theme. */
export function scoringBody(s: State): string {
  const w = s.weights;
  const sliders = (['planet', 'people', 'profit'] as const)
    .map((k) => dsSlider({ id: `ft-w-${k}`, label: `${k.charAt(0).toUpperCase()}${k.slice(1)} weight`, value: Math.round(w[k] * 100), min: 0, max: 100, step: 5, name: `w.${k}`, unitText: 'points' }))
    .join('');
  return [
    radios('How scores are made', 'ft-mode', MODES.map((m) => [m.id, m.label]), s.mode, MODES.find((m) => m.id === s.mode)?.blurb),
    radios('What a score of 50 means', 'ft-scale', [['benchmark', 'A typical new car'], ['anchored', 'Keeping your car'], ['relative', 'Best and worst here']], s.scale),
    radios('Combining Planet, People and Profit', 'ft-agg', [['average', 'Weighted average'], ['weakest', 'The weakest one decides']], s.aggregation),
    radios('Weighting', 'ft-preset', [...Object.keys(WEIGHT_PRESETS).map((p) => [p, PRESET_LABELS[p]] as [string, string]), ['custom', 'Your own']], s.preset in WEIGHT_PRESETS ? s.preset : 'custom', 'Moving a slider below switches to "Your own". Weights are relative; they need not add up to 100.'),
    `<div id="ft-sliders" class="ds-stack">${sliders}</div>`,
    radios('Financing shown', 'ft-view', [['both', 'Loan and lease'], ['loan', 'Loan only'], ['lease', 'Lease only']], s.view),
    radios('Theme', 'ft-theme', [['ledger', 'Ledger'], ['night', 'Night']], s.theme)
  ].join('');
}

/** The two closed groups under the top drivers (mockup 3a). */
export function moreGroups(s: State, carId: string): string {
  return `<div class="ds-stack">${dsDisclosure({ id: 'ft-all', sec: 'all', title: 'All assumptions', open: !!s.secOpen.all, bodyHtml: `<div id="ft-all-body" class="ds-stack">${allAssumptions(s, carId)}</div>` })}${dsDisclosure({ id: 'ft-scoring', sec: 'scoring', title: 'Scoring and appearance', open: !!s.secOpen.scoring, bodyHtml: `<div id="ft-scoring-body" class="ds-stack">${scoringBody(s)}</div>` })}</div>`;
}
