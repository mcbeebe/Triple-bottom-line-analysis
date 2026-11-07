import { GLOBAL_META } from '../../data';
import { hasCar, lx } from '../../app/options';
import { priceFromOffer, tradeOffer } from '../../app/mutations';
import type { State } from '../../app/state';
import { dsField, type DsNumberDetail } from '../components/field';
import { dsSheet } from '../components/sheet';
import { dsSlider } from '../components/slider';
import { dsStatusLabel } from '../components/statusLabel';
import { globalStatus, ownedStatus } from '../steps/status';
import { moreGroups } from './assumptionsPanel';

/** Id of the Fine-tune sheet. */
export const FT_SHEET = 'ft';

const slot = (id: string, html: string): string => `<span class="ds-status-slot" id="${id}">${html}</span>`;
const evChosen = (s: State): boolean => s.vehicles.some((v) => v.kind === 'ev' && !v.owned && s.selected.includes(v.id));

/**
 * Fine-tune, top drivers (spec): miles, gas price, what the car would sell for (or the trade-in offer),
 * first-time EV buyer (only with an EV chosen) and the trade-in discount (only on the trade path). Every value
 * says whether it is a placeholder, sourced or your own. Below them, two closed groups: "All assumptions"
 * (every value, each car one at a time, decision D1) and "Scoring and appearance".
 */
export function fineTuneBody(s: State, carId = ''): string {
  const m = GLOBAL_META;
  const parts: string[] = [
    '<p class="ds-guide-note">Your answer updates as you change these. Close to see it.</p>',
    '<h3 class="ds-group-h">Top drivers</h3>',
    dsSlider({ id: 'ft-miles', label: 'Miles per year', value: s.g.milesPerYear, min: m.milesPerYear.min, max: m.milesPerYear.max, step: m.milesPerYear.step, name: 'ft.miles', unitText: 'miles a year', statusHtml: slot('ft-miles-status', dsStatusLabel(globalStatus(s, 'milesPerYear', m.milesPerYear))) }),
    dsField({ id: 'ft-gas', label: 'Gas price', name: 'ft.gas', money: true, unit: 'a gallon', value: s.g.gasPrice, min: m.gasPrice.min, max: m.gasPrice.max, step: 0.01, statusHtml: slot('ft-gas-status', dsStatusLabel(globalStatus(s, 'gasPrice', m.gasPrice))) })
  ];
  if (hasCar()) {
    const owned = lx();
    const pm = s.meta.lx.price;
    const d = s.g.tradeInDiscount;
    parts.push(
      s.g.disposal === 'trade'
        ? dsField({ id: 'ft-value', label: 'Trade-in offer', name: 'ft.offer', money: true, value: Math.round(tradeOffer(owned.price, d)), min: Math.ceil(tradeOffer(pm.min, d)), max: Math.floor(tradeOffer(pm.max, d)), step: pm.step, statusHtml: slot('ft-value-status', dsStatusLabel(ownedStatus(s, 'price'))) })
        : dsField({ id: 'ft-value', label: 'What it would sell for', name: 'ft.value', money: true, value: owned.price, min: pm.min, max: pm.max, step: pm.step, statusHtml: slot('ft-value-status', dsStatusLabel(ownedStatus(s, 'price'))) })
    );
  }
  if (evChosen(s)) {
    const yes = s.g.firstTimeZev;
    parts.push(`<fieldset class="ds-radios ds-ft-group"><legend class="ds-label-row"><span class="ds-label">First-time EV buyer</span>${slot('ft-zev-status', dsStatusLabel(globalStatus(s, 'firstTimeZev', m.firstTimeZev)))}</legend>
<label class="ds-radio"><input type="radio" name="ft-zev" value="1" data-act="ft-zev"${yes ? ' checked' : ''}><span>Yes</span></label><label class="ds-radio"><input type="radio" name="ft-zev" value="0" data-act="ft-zev"${yes ? '' : ' checked'}><span>No</span></label>
<p class="ds-hint">Yes counts the California first-time EV rebate. Confirm you qualify.</p></fieldset>`);
  }
  if (s.g.disposal === 'trade') {
    const t = m.tradeInDiscount;
    parts.push(dsField({ id: 'ft-discount', label: 'Trade-in discount', name: 'ft.discount', unit: 'percent', value: Math.round(s.g.tradeInDiscount * 100), min: t.min * 100, max: t.max * 100, step: 1, note: 'How much less a dealer offers than a private buyer.', statusHtml: slot('ft-discount-status', dsStatusLabel(globalStatus(s, 'tradeInDiscount', t))) }));
  }
  parts.push(moreGroups(s, carId));
  parts.push('<p class="ds-sr" id="ft-live" aria-live="polite"></p>');
  return parts.join('\n');
}

/** Render the Fine-tune sheet's markup into the sheet host (hidden until shown); `carId` is the car shown in "Your cars' numbers". */
export function renderFineTuneSheet(s: State, carId = ''): void {
  const host = document.getElementById('ds-sheets');
  if (host) host.innerHTML = dsSheet({ id: FT_SHEET, title: 'Fine-tune', bodyHtml: fineTuneBody(s, carId) });
}

/** Apply one Fine-tune value to state; returns false when the name is not a Fine-tune field. */
export function applyFineTune(s: State, d: DsNumberDetail): boolean {
  const m = GLOBAL_META;
  const clamp = (lo: number, hi: number, x: number) => Math.min(hi, Math.max(lo, x));
  const owned = s.vehicles.find((v) => v.owned);
  switch (d.name) {
    case 'ft.miles':
      s.g.milesPerYear = clamp(m.milesPerYear.min, m.milesPerYear.max, d.value);
      return true;
    case 'ft.gas':
      s.g.gasPrice = clamp(m.gasPrice.min, m.gasPrice.max, d.value);
      return true;
    case 'ft.value':
    case 'ft.offer': {
      if (!owned) return false;
      const pm = s.meta.lx.price;
      owned.price = clamp(pm.min, pm.max, d.name === 'ft.offer' ? priceFromOffer(d.value, s.g.tradeInDiscount) : d.value);
      return true;
    }
    case 'ft.discount':
      s.g.tradeInDiscount = clamp(m.tradeInDiscount.min, m.tradeInDiscount.max, d.value / 100);
      return true;
    default:
      return false;
  }
}

/** Refresh the status labels in the open sheet after an edit. */
export function refreshFineTuneStatus(s: State): void {
  const set = (id: string, html: string) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  };
  const m = GLOBAL_META;
  set('ft-miles-status', dsStatusLabel(globalStatus(s, 'milesPerYear', m.milesPerYear)));
  set('ft-gas-status', dsStatusLabel(globalStatus(s, 'gasPrice', m.gasPrice)));
  set('ft-zev-status', dsStatusLabel(globalStatus(s, 'firstTimeZev', m.firstTimeZev)));
  set('ft-discount-status', dsStatusLabel(globalStatus(s, 'tradeInDiscount', m.tradeInDiscount)));
  if (hasCar()) set('ft-value-status', dsStatusLabel(ownedStatus(s, 'price')));
}
