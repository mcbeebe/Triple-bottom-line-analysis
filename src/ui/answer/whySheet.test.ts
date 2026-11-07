import { beforeEach, describe, expect, it } from 'vitest';
import { scoreOptions } from '../../engine';
import { LIMITATIONS, SRC } from '../../data';
import { state } from '../../app/state';
import { PUBLIC_DEFAULTS, applyScenario } from '../../app/scenario';
import { setPath } from '../../app/mutations';
import { scoring, visibleOptions } from '../../app/options';
import { holdUp, peopleTable, planetTable, profitTable, ratedCars, raters, whyBars, whyBody } from './whySheet';

const count = (h: string, s: string) => h.split(s).length - 1;
const scored = () => scoreOptions(state.g, state.vehicles, visibleOptions(), scoring()).sort((a, b) => a.rank - b.rank);

beforeEach(() => {
  applyScenario(state, PUBLIC_DEFAULTS);
});

describe('whyBody (mockups 2a to 2c)', () => {
  it('has real tabs: three, one selected and in the Tab order, the panel labelled by it', () => {
    const h = whyBody(state, 'planet', '');
    expect(count(h, 'role="tab"')).toBe(3);
    expect(count(h, 'aria-selected="true"')).toBe(1);
    expect(h).toMatch(/id="why-tab-planet" aria-selected="true" aria-controls="why-panel" data-act="why-tab" data-val="planet">/);
    expect(count(h, 'tabindex="-1">')).toBeGreaterThanOrEqual(2);
    expect(h).toContain('role="tabpanel" id="why-panel" aria-labelledby="why-tab-planet"');
  });

  it('lists what the numbers rest on with a Source or Placeholder label each, and the car only when you have one', () => {
    const h = whyBody(state, 'profit', '');
    expect(h).toContain('What your gas sedan would sell for');
    expect(h).toMatch(/Gas price<span class="ds-rest-v">\$5\.50 a gallon/);
    setPath(state, 'none');
    expect(whyBody(state, 'profit', '')).not.toContain('would sell for');
  });

  it('lists every source as a new-tab https link, and every limitation', () => {
    const h = whyBody(state, 'planet', '', true);
    const n = Object.keys(SRC).length;
    expect(h).toContain(`All ${n} sources`);
    const list = h.slice(h.indexOf('<ul class="ds-srcs">'), h.indexOf('</ul>', h.indexOf('<ul class="ds-srcs">')));
    expect(count(list, 'target="_blank" rel="noopener"')).toBe(n);
    expect(h).not.toMatch(/href="http:/);
    expect(h).toMatch(/<details class="ds-disc" id="why-srcs" open>/);
    for (const l of LIMITATIONS) expect(h).toContain(l.slice(0, 20));
  });

  it('wide tables scroll in a focusable, labelled region', () => {
    const h = whyBody(state, 'profit', '');
    expect(h).toMatch(/<div class="ds-table-wrap" role="region" aria-label="Profit table, scrolls sideways" tabindex="0">/);
  });
});

describe('pillar tables', () => {
  it('one row per option, the keep row marked, in every tab', () => {
    const sc = scored();
    for (const t of [planetTable(state, sc), profitTable(state, sc)]) {
      expect(count(t, '<th scope="row">')).toBe(sc.length);
      expect(count(t, 'class="ds-row-keep"')).toBe(1);
    }
  });

  it('People: your car first, one column per car, the score row last', () => {
    const sc = scored();
    expect(ratedCars(sc).map((v) => v.id)).toEqual(['lx', 'bolt', 'camryh', 'corolla']);
    const t = peopleTable(state, sc);
    expect(count(t, '<th scope="row">')).toBe(state.criteria.length + 1);
    expect(t).toContain('Rated externally');
    expect(t).toContain('Judgment');
  });

  it('the People tab has the rating and weight editors; the selects show the current ratings', () => {
    const h = whyBody(state, 'people', 'bolt');
    expect(h).toContain('Change the ratings');
    expect(h).toContain('How much each one counts');
    expect(h).toMatch(/name="why-rcar" value="bolt" data-act="why-rcar" checked/);
    const bolt = state.vehicles.find((v) => v.id === 'bolt')!;
    const r = raters(state, bolt);
    expect(count(r, 'data-act="why-rate"')).toBe(state.criteria.length);
    const c0 = state.criteria[0];
    expect(r).toContain(`<option value="${bolt.ratings[c0.id] ?? 3}" selected>`);
    expect(count(h, 'data-num="cw.')).toBe(state.criteria.length);
  });
});

describe('bars and "Does the winner hold up?"', () => {
  it('bars run lowest first and carry their numbers as text', () => {
    const h = whyBars(state);
    const sc = scored();
    const costs = [...h.matchAll(/class="ds-bar-val">\$([\d,-]+)</g)].map((m) => Number(m[1].replace(/,/g, '')));
    expect(costs.length).toBe(sc.length);
    expect([...costs].sort((a, b) => a - b)).toEqual(costs);
    expect(count(h, 'aria-hidden="true"')).toBe(sc.length * 2);
  });

  it('says how often the winner holds and marks other winners in words, not only by style', () => {
    const h = holdUp(state);
    expect(h).toMatch(/wins \d+ of 12;/);
    const flips = count(h, 'class="ds-cell-flip"');
    expect(count(h, '(different winner)')).toBe(flips);
  });
});
