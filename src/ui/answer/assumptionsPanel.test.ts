import { beforeEach, describe, expect, it } from 'vitest';
import { state } from '../../app/state';
import { PUBLIC_DEFAULTS, applyScenario } from '../../app/scenario';
import { findField } from '../../app/assumptions';
import { writeFieldIn } from '../../app/fields';
import { addCustomCar, setPath } from '../../app/mutations';
import { allAssumptions, carBody, carsSection, domId, fieldControl, moreGroups, scoringBody } from './assumptionsPanel';

const count = (h: string, s: string) => h.split(s).length - 1;

beforeEach(() => {
  applyScenario(state, PUBLIC_DEFAULTS);
});

describe('fieldControl', () => {
  it('a number field: comma text input named by field id, status label, no reset until edited', () => {
    const f = findField(state, 'g..gasPrice')!;
    const h = fieldControl(state, f);
    expect(h).toContain('id="fe-g--gasPrice"');
    expect(h).toContain('data-num="f:g..gasPrice"');
    expect(h).toContain('ds-status-src');
    expect(h).not.toContain('Reset to');
    writeFieldIn(state, f, 7);
    const e = fieldControl(state, f);
    expect(e).toContain('Your number');
    expect(e).toContain('>Reset to $5.50</button>');
    expect(e).toContain('data-act="ft-reset" data-val="g..gasPrice"');
  });

  it('a percent field shows percent; a Yes/No field is a pair of radios with the current one checked', () => {
    const pct = fieldControl(state, findField(state, 'g..discountRate')!);
    expect(pct).toContain('data-unit="%"');
    const yn = fieldControl(state, findField(state, 'g..firstTimeZev')!);
    expect(count(yn, 'type="radio"')).toBe(2);
    expect(count(yn, ' checked')).toBe(1);
    expect(yn).toContain('data-act="ft-bool" data-fid="g..firstTimeZev"');
  });

  it('domId makes field ids safe for element ids', () => {
    expect(domId('bolt.loan.apr')).toBe('bolt-loan-apr');
    expect(domId('g..gasPrice')).toBe('g--gasPrice');
  });
});

describe('cars (decision D1: one car at a time)', () => {
  it('one chip per editable car, yours first and labelled, the chosen one checked', () => {
    const h = carsSection(state, 'camryh');
    expect(count(h, 'name="ft-car"')).toBe(4);
    expect(h).toContain('>Yours: My gas sedan</span>');
    expect(h).toMatch(/value="camryh" data-act="ft-car" checked/);
    expect(count(h.slice(0, h.indexOf('</fieldset>')), ' checked')).toBe(1);
  });

  it('falls back to the first car, and says so when there is none', () => {
    expect(carsSection(state, 'nope')).toMatch(/value="lx" data-act="ft-car" checked/);
    setPath(state, 'none');
    state.selected = [];
    expect(carsSection(state, '')).toContain('Choose cars to compare first.');
  });

  it('your car and your own cars can be renamed; catalog cars cannot', () => {
    expect(carBody(state, 'lx')).toContain('id="ft-rename"');
    expect(carBody(state, 'bolt')).not.toContain('id="ft-rename"');
    const id = addCustomCar(state, { kind: 'ev', name: 'Mine', price: 30000, efficiency: 30 }) as string;
    expect(carBody(state, id)).toContain('id="ft-rename"');
  });

  it('a car with no lease offers "Add a lease"; the loan APR of a compared car is editable', () => {
    const bolt = carBody(state, 'bolt');
    expect(bolt).toContain('data-num="f:bolt.loan.apr"');
    const noLease = state.vehicles.find((v) => !v.owned && !v.lease && state.selected.includes(v.id) && state.meta[v.id]?.monthly);
    if (noLease) expect(carBody(state, noLease.id)).toContain('data-act="ft-addlease"');
  });
});

describe('allAssumptions', () => {
  it('five sections in order, remembered by data-sec; Please confirm starts open', () => {
    const h = allAssumptions(state, '');
    const secs = [...h.matchAll(/data-sec="(\w+)"/g)].map((m) => m[1]);
    expect(secs).toEqual(['confirm', 'drivers', 'cars', 'emissions', 'other']);
    expect(h).toMatch(/id="ft-sec-confirm" data-sec="confirm" open>/);
    expect(h).toContain('No values changed yet.');
    expect(h).toContain('data-act="ft-resetall"');
  });

  it('counts edits per section and in all', () => {
    writeFieldIn(state, findField(state, 'g..magi')!, 300000);
    writeFieldIn(state, findField(state, 'bolt..price')!, 25000);
    const h = allAssumptions(state, '');
    expect(h).toContain('2 values changed from the defaults.');
    expect(h).toContain('id="ft-sec-confirm-meta">1 edited</span>');
    expect(h).toContain('id="ft-sec-cars-meta">1 edited</span>');
    expect(h).toContain('id="ft-sec-drivers-meta"></span>');
    writeFieldIn(state, findField(state, 'g..gasPrice')!, 7);
    expect(allAssumptions(state, '')).toContain('3 values changed from the defaults.');
  });

  it('the emissions section has the manufacturing-emissions choice', () => {
    expect(allAssumptions(state, '')).toMatch(/name="ft-embodied" value="allocated" data-act="ft-embodied" checked/);
  });
});

describe('scoringBody and moreGroups', () => {
  it('every setting is a radio group with the current value checked; themes are Ledger and Night only', () => {
    const h = scoringBody(state);
    for (const [name, v] of [['ft-mode', 'hybrid'], ['ft-scale', 'benchmark'], ['ft-agg', 'average'], ['ft-preset', 'balanced'], ['ft-view', 'both'], ['ft-theme', 'ledger']])
      expect(h).toMatch(new RegExp(`name="${name}" value="${v}" data-act="${name}" checked`));
    expect(h).not.toContain('value="field"');
    expect(count(h, 'data-slider="w.')).toBe(3);
    state.preset = 'custom';
    expect(scoringBody(state)).toMatch(/name="ft-preset" value="custom" data-act="ft-preset" checked/);
  });

  it('both groups start closed and remember being opened', () => {
    const h = moreGroups(state, '');
    expect(h).toMatch(/id="ft-all" data-sec="all">/);
    expect(h).toMatch(/id="ft-scoring" data-sec="scoring">/);
    state.secOpen.scoring = true;
    expect(moreGroups(state, '')).toMatch(/id="ft-scoring" data-sec="scoring" open>/);
    state.secOpen.scoring = false;
  });
});
