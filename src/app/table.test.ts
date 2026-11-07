import { beforeEach, describe, expect, it } from 'vitest';
import { scoreOptions } from '../engine';
import { state } from './state';
import { PUBLIC_DEFAULTS, applyScenario } from './scenario';
import { keepOf, scoring, visibleOptions } from './options';
import { setPath } from './mutations';
import { nextSort, sortedRows, tableCols, tableTsv } from './table';

const scored = () => scoreOptions(state.g, state.vehicles, visibleOptions(), scoring());

beforeEach(() => {
  applyScenario(state, PUBLIC_DEFAULTS);
});

describe('tableCols', () => {
  it('starts with the option name and uses plain words', () => {
    const labels = tableCols().map((c) => c.label);
    expect(labels[0]).toBe('Option');
    expect(labels).toEqual(expect.arrayContaining(['Overall score', 'Cost over 8 years', 'Carbon over 8 years (t)', 'Rebates and tax savings', 'Gas price to break even', 'Pays back vs keeping']));
    expect(labels.join(' ')).not.toMatch(/NPV|PV\)|CO2e/);
  });

  it('names the keep option "Keep your gas sedan"', () => {
    const sc = scored();
    const rows = sortedRows(sc, keepOf(sc), 'rank', 1);
    expect(rows.map((r) => r.vals[0])).toContain('Keep your gas sedan');
  });
});

describe('sortedRows and nextSort', () => {
  it('sorts by cost lowest first and by score highest first; ties keep rank order', () => {
    const sc = scored();
    const idx = (k: string) => tableCols().findIndex((c) => c.key === k);
    const byCost = sortedRows(sc, keepOf(sc), 'npv', 1).map((r) => Number(r.vals[idx('npv')]));
    expect([...byCost].sort((a, b) => a - b)).toEqual(byCost);
    const byScore = sortedRows(sc, keepOf(sc), 'overall', -1).map((r) => Number(r.vals[idx('overall')]));
    expect([...byScore].sort((a, b) => b - a)).toEqual(byScore);
    expect(sortedRows(sc, keepOf(sc), 'nope', 1).map((r) => r.vals[0])).toEqual(sortedRows(sc, keepOf(sc), 'name', 1).map((r) => r.vals[0]));
  });

  it('a new column starts in its natural direction; the same column flips', () => {
    expect(nextSort('rank', 1, 'npv')).toEqual({ key: 'npv', dir: 1 });
    expect(nextSort('rank', 1, 'overall')).toEqual({ key: 'overall', dir: -1 });
    expect(nextSort('npv', 1, 'npv')).toEqual({ key: 'npv', dir: -1 });
    expect(nextSort('npv', -1, 'npv')).toEqual({ key: 'npv', dir: 1 });
  });
});

describe('tableTsv', () => {
  it('a header row plus one row per option, tab-separated, plain text', () => {
    const sc = scored();
    const tsv = tableTsv(sc, keepOf(sc), 'rank', 1).split('\n');
    expect(tsv.length).toBe(sc.length + 1);
    expect(tsv[0].split('\t').length).toBe(tableCols().length);
    expect(tsv.join('\n')).not.toMatch(/&amp;|&lt;|&quot;/);
  });

  it('without a car: no break-even or payback numbers', () => {
    setPath(state, 'none');
    const sc = scored();
    const tsv = tableTsv(sc, keepOf(sc), 'rank', 1);
    const be = tableCols().findIndex((c) => c.key === 'be');
    expect(tsv.split('\n').slice(1).every((r) => r.split('\t')[be] === '-')).toBe(true);
  });
});
