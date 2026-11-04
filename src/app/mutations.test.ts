import { describe, expect, it } from 'vitest';
import { freshState, MAX_SELECTED, state } from './state';
import { priceFromOffer, tradeOffer, addCatalogCar, addCustomCar, applyCarPreset, canAddCar, limitMessage, removeCustomCar, setPath, togglePick } from './mutations';
import { defaultOfIn, readFieldIn, writeFieldIn, type Field } from './fields';
import { DEFAULT_SELECTED, GLOBAL_META } from '../data';

describe('freshState', () => {
  it('matches the module singleton at load and returns independent copies', () => {
    const a = freshState();
    const b = freshState();
    expect(a).toEqual(b);
    a.selected.push('x');
    a.vehicles[0].price = 1;
    expect(b.selected).toEqual([...DEFAULT_SELECTED]);
    expect(b.vehicles[0].price).not.toBe(1);
    expect(Object.keys(state).sort()).toEqual(Object.keys(b).sort());
  });

  it('starts with no path chosen', () => {
    expect(freshState().pathChosen).toBe(false);
  });
});

describe('field helpers with an explicit state', () => {
  const miles: Field = { scope: 'g', sub: '', key: 'milesPerYear', meta: GLOBAL_META.milesPerYear };
  it('read, write (clamped) and default work on the given state only', () => {
    const s = freshState();
    writeFieldIn(s, miles, 99999);
    expect(readFieldIn(s, miles)).toBe(GLOBAL_META.milesPerYear.max);
    expect(defaultOfIn(s, miles)).toBe(7500);
    expect(readFieldIn(freshState(), miles)).toBe(7500);
  });
});

describe('mutations', () => {
  it('setPath sets the disposal, marks the path chosen and clears the notice', () => {
    const s = freshState();
    s.notice = 'old';
    setPath(s, 'trade');
    expect(s.g.disposal).toBe('trade');
    expect(s.pathChosen).toBe(true);
    expect(s.notice).toBe('');
  });

  it('applyCarPreset swaps the owned car and its defaults, so nothing reads as edited', () => {
    const s = freshState();
    applyCarPreset(s, 'sedan');
    const owned = s.vehicles.find((v) => v.owned)!;
    expect(owned.short).toBe('My gas sedan');
    expect(owned.price).toBe(9000);
    expect(s.defaults.find((v) => v.owned)!.price).toBe(9000);
    expect(s.carPreset).toBe('sedan');
    expect(s.meta.lx.price.kind).toBe('assumption');
    expect(s.vehicles[0].owned).toBe(true);
  });

  it('togglePick adds, removes and refuses past the limit with the limit message', () => {
    const s = freshState();
    s.selected = [];
    const ids = ['tesla', 'bolt', 'rivian', 'ioniq5', 'camryh', 'rav4h', 'crvh', 'corolla', 'crvg'];
    for (let i = 0; i < MAX_SELECTED; i++) expect(togglePick(s, ids[i])).toBe('added');
    expect(canAddCar(s)).toBe(false);
    expect(togglePick(s, ids[MAX_SELECTED])).toBe('limit');
    expect(s.notice).toBe(limitMessage());
    expect(s.selected).toHaveLength(MAX_SELECTED);
    expect(togglePick(s, ids[0])).toBe('removed');
    expect(s.notice).toBe('');
    expect(canAddCar(s)).toBe(true);
  });

  it('togglePick ignores unknown ids', () => {
    const s = freshState();
    expect(togglePick(s, 'nope')).toBe('unknown');
    expect(s.selected).toEqual([...DEFAULT_SELECTED]);
  });

  it('addCatalogCar is idempotent and respects the limit', () => {
    const s = freshState();
    expect(addCatalogCar(s, 'tesla')).toBe('already');
    s.selected = s.selected.slice(0, 0);
    expect(addCatalogCar(s, 'camryh')).toBe('added');
    expect(s.selected).toEqual(['camryh']);
  });

  it('addCustomCar builds, selects and registers a car with the given values before saving its defaults', () => {
    const s = freshState();
    s.selected = [];
    const id = addCustomCar(s, { kind: 'ev', name: 'My EV', price: 41000, efficiency: 27 });
    expect(id).toBe('custom1');
    const v = s.vehicles.find((x) => x.id === id)!;
    expect([v.name, v.short, v.price, v.kwhPer100mi, v.loan?.down]).toEqual(['My EV', 'My EV', 41000, 27, 4000]);
    expect(s.defaults.find((x) => x.id === id)!.price).toBe(41000);
    expect(s.groups[id!]).toBe('custom');
    expect(s.selected).toEqual(['custom1']);
    expect(s.customCount).toBe(1);
  });

  it('addCustomCar without values uses the catalog averages, and refuses at the limit', () => {
    const s = freshState();
    s.selected = ['tesla', 'bolt', 'rivian', 'camryh', 'rav4h', 'crvh', 'corolla', 'crvg'].slice(0, MAX_SELECTED);
    expect(addCustomCar(s, { kind: 'ice' })).toBeNull();
    expect(s.notice).toBe(limitMessage());
    s.selected = [];
    const id = addCustomCar(s, { kind: 'ice' })!;
    expect(s.vehicles.find((x) => x.id === id)!.mpg).toBe(30);
  });

  it('removeCustomCar removes every trace, and never removes a catalog car', () => {
    const s = freshState();
    s.selected = [];
    const id = addCustomCar(s, { kind: 'hybrid' })!;
    removeCustomCar(s, id);
    expect(s.vehicles.some((v) => v.id === id)).toBe(false);
    expect(s.defaults.some((v) => v.id === id)).toBe(false);
    expect(s.meta[id]).toBeUndefined();
    expect(s.selected).not.toContain(id);
    removeCustomCar(s, 'tesla');
    expect(s.vehicles.some((v) => v.id === 'tesla')).toBe(true);
  });
});

describe('trade-in offer (P4)', () => {
  it('converts between private value and dealer offer and round-trips exactly', () => {
    expect(tradeOffer(9000, 0.15)).toBeCloseTo(7650, 9);
    expect(priceFromOffer(7650, 0.15)).toBeCloseTo(9000, 9);
    for (const p of [1000, 7000, 12345, 150000]) for (const d of [0, 0.15, 0.5]) expect(priceFromOffer(tradeOffer(p, d), d)).toBeCloseTo(p, 9);
  });
});
