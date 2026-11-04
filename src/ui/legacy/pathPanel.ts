import type { Disposal } from '../../engine';
import { CAR_PRESETS, SRC } from '../../data';
import { esc, num, usd } from '../../app/format';
import { carNow, hasCar, lx } from '../../app/options';
import { state } from '../../app/state';
import { analyst } from '../../app/analystSession';
import { $ } from '../dom';
import { chip } from '../components/chip';

/** The three decision paths with their chip labels. */
export const PATHS: { id: Disposal; label: string; sub: string }[] = [
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

/** The old page's top lines. The Lexus example keeps the original test-case wording; any other car gets neutral copy (decision P10). */
export function heroText(carPreset: string): { lead: string; pill: string } {
  if (carPreset === 'lexus')
    return {
      lead: 'Compare a personal purchase by its effect on the planet, on people, and on your wallet. Test case: keep a 1999 Lexus LX 470, or sell it and replace it with an EV on a loan or a lease.',
      pill: 'Test case · prices and rates as of Nov 1, 2026 · every input is editable'
    };
  return {
    lead: 'Compare keeping your current car with buying another, by its effect on the planet, on people and on your wallet.',
    pill: 'Prices and rates as of Nov 1, 2026 · every input is editable'
  };
}

/** Render the "Your decision" panel: path chips, the analyst shortcut and the current-car presets. */
export function renderPath(): void {
  const presetChips = CAR_PRESETS.map((p) => chip('carpreset', p.id, p.label, p.blurb, state.carPreset === p.id)).join('');
  const nameBox = `<label class="fine" for="in-carname">Name of your current car</label> <input id="in-carname" class="vname" type="text" maxlength="40" value="${esc(lx().short)}" data-vname="lx" aria-label="Name of your current car">`;
  const hero = heroText(state.carPreset);
  const lead = document.getElementById('hero-lead');
  const pill = document.getElementById('hero-pill');
  if (lead) lead.textContent = hero.lead;
  if (pill) pill.textContent = hero.pill;
  $('path').innerHTML = `<h2>Your decision</h2>
  <p class="fine">What are you doing with the car you have now? Then pick the cars in play below, or just describe it to the analyst above.</p>
  <div class="chips" role="group" aria-label="What happens to your current car">${PATHS.map((p) => chip('path', p.id, p.label, p.sub, state.g.disposal === p.id)).join('')}${analyst.client ? '<button class="chip" data-act="askanalyst">Not sure<small>ask the analyst</small></button>' : ''}</div>
  <p class="fine" id="path-blurb">${pathBlurb()}</p>
  ${hasCar() ? `<div class="pgroup"><h3>The car you have now</h3><div class="chips" role="group" aria-label="Starting point for your current car">${presetChips}</div><p class="fine">Pick a starting point, then edit its value, mpg and costs under Cars in the assumptions. Only the Lexus values are sourced; the others are placeholders. ${nameBox}</p></div>` : ''}`;
}
