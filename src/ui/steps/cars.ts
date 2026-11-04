import { makeCustomVehicle } from '../../data';
import { esc, usd } from '../../app/format';
import { canAddCar } from '../../app/mutations';
import { MAX_SELECTED, type State } from '../../app/state';
import { canShowAnswer, stepCopy } from '../../app/steps';
import { dsButton } from '../components/button';
import { dsCheckRow } from '../components/checkRow';
import { dsField } from '../components/field';
import { dsStepFooter, dsStepHeader } from '../components/stepHeader';

/** State of the "+ Add my own car" form (screen-local, never stored). */
export interface AddCarForm {
  open: boolean;
  kind: 'ev' | 'hybrid' | 'ice';
  name: string;
  price: number;
  efficiency: number;
}

/** A closed form whose starting values are the catalog averages for the kind. */
export function newAddCarForm(kind: AddCarForm['kind'] = 'ev', open = false): AddCarForm {
  const v = makeCustomVehicle(kind, 1).vehicle;
  return { open, kind, name: '', price: v.price, efficiency: kind === 'ev' ? v.kwhPer100mi : v.mpg };
}

/** The always-present status line: the count, the limit message at 4 and the reason at 0 (announced politely). */
export function countText(s: Pick<State, 'selected'>): string {
  const n = s.selected.length;
  if (n === 0) return 'No cars chosen. Pick at least one car to compare.';
  if (n >= MAX_SELECTED) return `${n} of ${MAX_SELECTED} chosen. Pick up to ${MAX_SELECTED}. Uncheck one first.`;
  return `${n} of up to ${MAX_SELECTED} chosen.`;
}

const GROUPS: { id: string; legend: string }[] = [
  { id: 'ev', legend: 'Electric' },
  { id: 'hybrid', legend: 'Hybrid' },
  { id: 'gas', legend: 'Gas' },
  { id: 'custom', legend: 'Your own' }
];

const KINDS: { id: AddCarForm['kind']; label: string }[] = [
  { id: 'ev', label: 'Electric' },
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'ice', label: 'Gas' }
];

function formHtml(f: AddCarForm): string {
  const m = makeCustomVehicle(f.kind, 1).meta;
  const eff = f.kind === 'ev'
    ? dsField({ id: 'st-new-eff', label: 'Electricity used per 100 miles', name: 'new.efficiency', unit: 'kWh', value: f.efficiency, min: m.kwhPer100mi.min, max: m.kwhPer100mi.max, step: m.kwhPer100mi.step, note: "It is on the car's EPA label." })
    : dsField({ id: 'st-new-eff', label: 'Fuel economy', name: 'new.efficiency', unit: 'mpg', value: f.efficiency, min: m.mpg.min, max: m.mpg.max, step: m.mpg.step });
  const radios = KINDS.map((k) => `<label class="ds-radio"><input type="radio" name="st-kind" value="${k.id}" data-act="st-kind"${f.kind === k.id ? ' checked' : ''}><span>${k.label}</span></label>`).join('');
  return `<form class="ds-subform" id="st-addcar" novalidate>
<h3 class="ds-group-h">Add my own car</h3>
<div class="ds-field"><label for="st-new-name" class="ds-label">Car name</label><div class="ds-input"><input id="st-new-name" type="text" maxlength="40" autocomplete="off" value="${esc(f.name)}" placeholder="My ${f.kind === 'ev' ? 'EV' : f.kind === 'hybrid' ? 'hybrid' : 'gas car'}" data-st-name="new"></div></div>
<fieldset class="ds-radios"><legend class="ds-label">Type</legend>${radios}</fieldset>
${dsField({ id: 'st-new-price', label: 'Price', name: 'new.price', money: true, value: f.price, min: m.price.min, max: m.price.max, step: m.price.step })}
${eff}
<div class="ds-guide-row"><button type="submit" class="ds-btn ds-btn-secondary">Add car</button>${dsButton({ label: 'Cancel', act: 'st-cancel', variant: 'link' })}</div>
</form>`;
}

/** Step 3 screen: which cars to compare, grouped, with the 4-car limit and your own cars. */
export function carsHtml(s: State, form: AddCarForm): string {
  const c = stepCopy('step-3', s.g.disposal);
  const room = canAddCar(s);
  const groups = GROUPS.map((g) => {
    const cars = s.vehicles.filter((v) => !v.owned && s.groups[v.id] === g.id);
    if (!cars.length) return '';
    const rows = cars
      .map((v) => {
        const on = s.selected.includes(v.id);
        const row = dsCheckRow({ id: `st-pick-${v.id}`, name: v.name, detail: `${usd(v.price)}${v.lease ? '' : ' · Loan only'}`, value: v.id, act: 'st-pick', checked: on, disabled: !on && !room, describedBy: !on && !room ? 'st-count' : undefined });
        return g.id === 'custom'
          ? `<div class="ds-check-wrap">${row}<button type="button" class="ds-btn ds-btn-link" data-act="st-remove" data-val="${esc(v.id)}" aria-label="Remove ${esc(v.short)}">Remove</button></div>`
          : row;
      })
      .join('');
    return `<fieldset class="ds-checks"><legend>${g.legend}</legend>${rows}</fieldset>`;
  }).join('');
  const add = form.open
    ? formHtml(form)
    : dsButton({ label: '+ Add my own car', act: 'st-addopen', variant: 'secondary', disabled: !room, describedBy: room ? undefined : 'st-count', id: 'st-addopen' });
  const ok = canShowAnswer(s);
  return `<div class="ds-screen">${dsStepHeader({ step: 3, total: 3, title: c.heading, sub: 'Each car is compared on a loan and, where known, a lease.', id: 'st-title' })}
<p class="ds-count" id="st-count" role="status">${esc(countText(s))}</p>
<div class="ds-groups">${groups}</div>
${add}
${dsButton({ label: 'Show my answer', act: 'st-answer', full: true, disabled: !ok, describedBy: ok ? undefined : 'st-count', id: 'st-show' })}
${dsStepFooter({ step: 3, backAct: 'st-back', skipAct: 'st-skip', skipDisabled: !ok, describedBy: 'st-count' })}</div>`;
}
