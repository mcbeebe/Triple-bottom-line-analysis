import { beforeEach, describe, expect, it } from 'vitest';
import { state } from '../../app/state';
import { PUBLIC_DEFAULTS, applyScenario } from '../../app/scenario';
import { tableBody, tableHtml } from './tableSheet';

const count = (h: string, s: string) => h.split(s).length - 1;

beforeEach(() => {
  applyScenario(state, PUBLIC_DEFAULTS);
});

describe('tableHtml (mockup 4)', () => {
  it('one row per option, in a focusable sideways-scrolling region, with the keep row marked', () => {
    const h = tableHtml(state);
    expect(h).toContain('<div class="ds-table-wrap" role="region" aria-label="All options table, scrolls sideways" tabindex="0">');
    expect(count(h, '<th scope="row">')).toBe(6);
    expect(count(h, 'class="ds-row-keep"')).toBe(1);
  });

  it('every column sorts with a real button; exactly one says how the table is sorted', () => {
    state.sortKey = 'npv';
    state.sortDir = 1;
    const h = tableHtml(state);
    expect(count(h, 'data-act="tb-sort"')).toBe(count(h, '<th scope="col"'));
    expect(count(h, 'aria-sort="ascending"')).toBe(1);
    expect(count(h, 'aria-sort="descending"')).toBe(0);
    expect(h).toContain('sorted by Cost over 8 years, lowest first');
    expect(h).toMatch(/aria-sort="ascending" class="n"><button type="button" class="ds-sort ds-sort-on" id="tb-sort-npv"/);
  });

  it('the body explains sorting and offers Copy as spreadsheet text with a status line', () => {
    const b = tableBody(state);
    expect(b).toContain('Copy as spreadsheet text');
    expect(b).toContain('id="tb-status" role="status"');
  });
});
