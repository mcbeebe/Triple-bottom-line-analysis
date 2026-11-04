import type { Vehicle } from '../../engine';
import { esc, usd } from '../../app/format';
import { hasCar } from '../../app/options';
import { MAX_SELECTED, state } from '../../app/state';
import { $ } from '../dom';

function pickChip(v: Vehicle, custom: boolean): string {
  const on = state.selected.includes(v.id);
  const lease = v.lease ? 'loan + lease' : 'loan only';
  return `<span class="pwrap"><button class="chip ${on ? 'on' : ''}" aria-pressed="${on}" data-act="pick" data-val="${v.id}">${esc(v.short)}<small>${usd(v.price)} · ${lease}</small></button>${custom ? `<button class="x" data-act="rmcustom" data-val="${v.id}" aria-label="Remove ${esc(v.short)}" title="Remove">×</button>` : ''}</span>`;
}

/** Render the "Cars to compare" picker grouped by electric, hybrid, gas and your own. */
export function renderPicker(): void {
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
