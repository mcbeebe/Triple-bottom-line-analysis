import { WEIGHT_PRESETS } from '../engine';
import { MODES, PRESET_LABELS, THEMES, state } from '../app/state';
import { scaleLabel } from '../app/options';
import { $ } from './dom';
import { chip } from './components/chip';

/** Render the design bar and the scoring options panel. */
export function renderControls(): void {
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
