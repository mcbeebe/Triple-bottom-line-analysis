import { scoreOptions, type ScoredOption } from '../../engine';
import { esc, num, usd } from '../../app/format';
import { colorKey, keepOf, optionName, scaleBlurb, scoring, visibleOptions } from '../../app/options';
import { MODES, state, type Tab } from '../../app/state';
import { $ } from '../dom';
import { buildVerdict } from './verdict';
import { renderBars, renderCards } from './cards';
import { peopleTable, planetTable, profitTable, renderSens } from './why';
import { renderTable } from './table';

/** Update the live results bar inside the assumptions panel. */
export function renderLive(scored: ScoredOption[]): void {
  const sorted = [...scored].sort((a, b) => a.rank - b.rank);
  const keep = keepOf(scored);
  const top = sorted.slice(0, 4);
  const chips = top
    .map((s) => `<span class="lchip" style="--c:var(--c-${colorKey(s.vehicle.id)})"><b>#${s.rank}</b> ${esc(optionName(s.spec))} <em>${num(s.overall)}</em></span>`)
    .join('');
  const keepChip = !keep || top.includes(keep) ? '' : `<span class="lchip" style="--c:var(--c-lx)"><b>#${keep.rank}</b> ${esc(optionName(keep.spec))} <em>${num(keep.overall)}</em></span>`;
  const keepCost = keep ? `<span class="lcost">Keep: ${usd(keep.result.netCostNPV)} net cost (PV)</span>` : '';
  $('livebar').innerHTML = `<span class="llabel">Live results</span>${chips}${keepChip}${keepCost}`;
}

/** Score the visible options and render the verdict, cards or table, bars, tabs and sensitivity. */
export function renderResults(): void {
  const scored = scoreOptions(state.g, state.vehicles, visibleOptions(), scoring());
  const keep = keepOf(scored);
  const mode = MODES.find((m) => m.id === state.mode) as (typeof MODES)[number];
  const tabBody = state.tab === 'planet' ? planetTable(scored, keep) : state.tab === 'people' ? peopleTable(scored) : profitTable(scored, keep);
  const tabBtn = (t: Tab, label: string) => `<button role="tab" class="tab ${state.tab === t ? 'on' : ''}" aria-selected="${state.tab === t}" data-act="tab" data-val="${t}">${label}</button>`;
  $('res-verdict').innerHTML = `<section class="panel verdict"><h2 id="answer-title" tabindex="-1">What the numbers say</h2>${buildVerdict(scored)}
    <p class="fine">Scoring: <b>${mode.label}</b>. ${mode.blurb} Scale: ${scaleBlurb()}
    <button class="linkbtn" data-act="jump">Edit assumptions</button></p>
    <div class="vgo"><span class="fine">See every option as:</span>
      <button class="chip ${state.resultsView === 'cards' ? 'on' : ''}" data-act="resviewgo" data-val="cards">Cards</button>
      <button class="chip ${state.resultsView === 'table' ? 'on' : ''}" data-act="resviewgo" data-val="table">Table</button></div></section>`;
  const viewBtn = (v: 'cards' | 'table', label: string) => `<button class="chip ${state.resultsView === v ? 'on' : ''}" aria-pressed="${state.resultsView === v}" data-act="resview" data-val="${v}">${label}</button>`;
  const resultsBody =
    state.resultsView === 'table'
      ? renderTable(scored, keep)
      : `<section class="cards" aria-label="Ranked options">${renderCards(scored, keep)}</section>`;
  $('res-main').innerHTML = `
  <div class="viewtoggle"><h3>Show results as</h3><div class="chips">${viewBtn('cards', 'Cards')}${viewBtn('table', 'Table')}</div></div>
  ${resultsBody}
  <section class="panel">${renderBars(scored)}</section>
  <section class="panel"><h2>Behind the scores</h2>
    <div class="tabs" role="tablist">${tabBtn('planet', 'Planet')}${tabBtn('people', 'People')}${tabBtn('profit', 'Profit')}</div>
    ${tabBody}</section>
  <section class="panel"><h2>Does the winner hold up?</h2>${renderSens()}</section>`;
  renderLive(scored);
}
