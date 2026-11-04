import { CAR_PRESETS, GLOBAL_META } from '../../data';
import { esc } from '../../app/format';
import { tradeOffer } from '../../app/mutations';
import type { State } from '../../app/state';
import { stepCopy } from '../../app/steps';
import { dsButton } from '../components/button';
import { dsChip } from '../components/chip';
import { dsField } from '../components/field';
import { dsSlider } from '../components/slider';
import { dsStatusLabel } from '../components/statusLabel';
import { dsStepFooter, dsStepHeader } from '../components/stepHeader';
import { globalStatus, ownedStatus } from './status';

/** Preset chips in the order Step 2 shows them: the default sedan first, the Lexus example last, then Something else. */
export const PRESET_CHIPS: { id: string; label: string }[] = [
  ...['sedan', 'suv', 'hybrid', 'lexus'].map((id) => ({ id, label: (CAR_PRESETS.find((p) => p.id === id) as { label: string }).label })),
  { id: 'custom', label: 'Something else' }
];

/** Status label wrapped in an element the screen can update in place. */
const statusSlot = (id: string, html: string): string => `<span class="ds-status-slot" id="${id}">${html}</span>`;

/** Step 2 screen: the car you have now and how much you drive (miles only on the just-buy path). */
export function drivingHtml(s: State): string {
  const path = s.g.disposal;
  const c = stepCopy('step-2', path);
  const owned = s.vehicles.find((v) => v.owned);
  const meta = s.meta.lx ?? {};
  const miles = GLOBAL_META.milesPerYear;
  const slider = dsSlider({
    id: 'st-miles', label: 'Miles per year', value: s.g.milesPerYear, min: miles.min, max: miles.max, step: miles.step,
    name: 'g.milesPerYear', unitText: 'miles a year', statusHtml: statusSlot('st-miles-status', dsStatusLabel(globalStatus(s, 'milesPerYear', miles)))
  });
  let car = '';
  if (path !== 'none' && owned) {
    const chips = PRESET_CHIPS.map((p) => dsChip({ label: p.label, act: 'st-preset', val: p.id, on: s.carPreset === p.id })).join('');
    const d = s.g.tradeInDiscount;
    const pm = meta.price;
    const value =
      path === 'trade'
        ? dsField({
            id: 'st-value', label: 'Trade-in offer', name: 'owned.offer', money: true,
            value: Math.round(tradeOffer(owned.price, d)), min: Math.ceil(tradeOffer(pm.min, d)), max: Math.floor(tradeOffer(pm.max, d)), step: pm.step,
            note: `Placeholder: dealers usually offer about ${Math.round(d * 100)}% less than a private buyer.`,
            statusHtml: statusSlot('st-value-status', dsStatusLabel(ownedStatus(s, 'price')))
          })
        : dsField({
            id: 'st-value', label: 'What it would sell for', name: 'owned.price', money: true,
            value: owned.price, min: pm.min, max: pm.max, step: pm.step,
            statusHtml: statusSlot('st-value-status', dsStatusLabel(ownedStatus(s, 'price')))
          });
    const custom =
      s.carPreset === 'custom'
        ? `<div class="ds-subform"><div class="ds-field"><label for="st-car-name" class="ds-label">Car name</label><div class="ds-input"><input id="st-car-name" type="text" maxlength="40" autocomplete="off" value="${esc(owned.short)}" data-st-name="owned"></div></div>
${dsField({ id: 'st-mpg', label: 'Fuel economy', name: 'owned.mpg', unit: 'mpg', value: owned.mpg, min: meta.mpg.min, max: meta.mpg.max, step: meta.mpg.step, statusHtml: statusSlot('st-mpg-status', dsStatusLabel(ownedStatus(s, 'mpg'))) })}
${dsField({ id: 'st-maint', label: 'Repair cost per mile', name: 'owned.maintPerMile', money: true, unit: 'a mile', value: owned.maintPerMile, min: meta.maintPerMile.min, max: meta.maintPerMile.max, step: meta.maintPerMile.step, statusHtml: statusSlot('st-maint-status', dsStatusLabel(ownedStatus(s, 'maintPerMile'))) })}
${dsField({ id: 'st-ins', label: 'Insurance per year', name: 'owned.insurancePerYear', money: true, value: owned.insurancePerYear, min: meta.insurancePerYear.min, max: meta.insurancePerYear.max, step: meta.insurancePerYear.step, statusHtml: statusSlot('st-ins-status', dsStatusLabel(ownedStatus(s, 'insurancePerYear'))) })}</div>`
        : '';
    car = `<h2 class="ds-group-h" id="st-car-h">Car you have now</h2>
<div class="ds-chips" role="group" aria-labelledby="st-car-h">${chips}</div>
${custom}${value}`;
  }
  return `<div class="ds-screen">${dsStepHeader({ step: 2, total: 3, title: c.heading, sub: c.sub, id: 'st-title' })}
${car}${slider}
<p class="ds-note">Not sure of a number? Leave it. Placeholders are marked and you can change them from the answer screen.</p>
${dsButton({ label: 'Continue to cars', act: 'st-next', full: true })}
${dsStepFooter({ step: 2, backAct: 'st-back', skipAct: 'st-skip' })}</div>`;
}
