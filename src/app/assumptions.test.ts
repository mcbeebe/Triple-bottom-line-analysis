import { describe, expect, it } from 'vitest';
import { freshState } from './state';
import { PUBLIC_DEFAULTS, applyScenario } from './scenario';
import { addCustomCar, setPath } from './mutations';
import { fieldId, readFieldIn, writeFieldIn } from './fields';
import {
  TOP_DRIVER_KEYS,
  addLease,
  analystFieldList,
  assumptionSections,
  carFieldGroups,
  defaultText,
  editableCars,
  editedCount,
  fieldDisplay,
  fieldLabel,
  findField,
  resetAll
} from './assumptions';

const fresh = () => applyScenario(freshState(), PUBLIC_DEFAULTS);

describe('assumptionSections', () => {
  it('has four sections in order, and leaves the top drivers out so no value has two inputs', () => {
    const s = fresh();
    const secs = assumptionSections(s);
    expect(secs.map((x) => x.id)).toEqual(['confirm', 'drivers', 'emissions', 'other']);
    const keys = secs.flatMap((x) => x.fields.map((f) => f.key));
    for (const k of TOP_DRIVER_KEYS) expect(keys).not.toContain(k);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('follows the path: Clean Cars 4 All and sold-car emissions only when you have a car', () => {
    const s = fresh();
    const keys = () => assumptionSections(s).flatMap((x) => x.fields.map((f) => f.key));
    expect(keys()).toEqual(expect.arrayContaining(['cc4a', 'lxLeakage']));
    setPath(s, 'none');
    expect(keys()).not.toContain('cc4a');
    expect(keys()).not.toContain('lxLeakage');
  });
});

describe('editableCars', () => {
  it('lists your car first, then the compared cars in order; none of yours when just buying', () => {
    const s = fresh();
    expect(editableCars(s).map((v) => v.id)).toEqual(['lx', 'bolt', 'camryh', 'corolla']);
    setPath(s, 'none');
    expect(editableCars(s).map((v) => v.id)).toEqual(['bolt', 'camryh', 'corolla']);
  });
});

describe('carFieldGroups (decision D1: one car at a time)', () => {
  it('an EV has energy use but no mpg; a gas car the reverse', () => {
    const s = fresh();
    const keys = (id: string) => carFieldGroups(s, id).flatMap((g) => g.fields.map((f) => f.key));
    expect(keys('bolt')).toContain('kwhPer100mi');
    expect(keys('bolt')).not.toContain('mpg');
    expect(keys('corolla')).toContain('mpg');
    expect(keys('corolla')).not.toContain('kwhPer100mi');
  });

  it('keeps the old grid order and drops empty groups; your car has no loan or lease', () => {
    const s = fresh();
    expect(carFieldGroups(s, 'bolt').map((g) => g.id)).toEqual(['price', 'running', 'value', 'incentives', 'loan', 'lease']);
    const own = carFieldGroups(s, 'lx').map((g) => g.id);
    expect(own).not.toContain('loan');
    expect(own).not.toContain('lease');
    expect(carFieldGroups(s, 'nope')).toEqual([]);
  });

  it('a car without a lease offers "Add a lease" instead of lease fields, and addLease fills them', () => {
    const s = fresh();
    const leaseOf = () => carFieldGroups(s, 'corolla').find((g) => g.id === 'lease');
    const before = leaseOf();
    if (before) {
      expect(before.fields).toEqual([]);
      expect(before.addLease).toBe(true);
    }
    const had = !!s.vehicles.find((v) => v.id === 'corolla')?.lease;
    expect(addLease(s, 'corolla')).toBe(!had);
    if (!had && before) {
      const after = leaseOf()!;
      expect(after.addLease).toBe(false);
      expect(after.fields.map((f) => fieldId(f))).toEqual(['corolla.lease.monthly', 'corolla.lease.dueAtSigning', 'corolla.lease.termMonths']);
      expect(s.defaults.find((v) => v.id === 'corolla')?.lease).toEqual(s.vehicles.find((v) => v.id === 'corolla')?.lease);
    }
    expect(addLease(s, 'lx')).toBe(false);
  });

  it('a custom car gets its own groups', () => {
    const s = fresh();
    const id = addCustomCar(s, { kind: 'hybrid', name: 'Mine', price: 30000, efficiency: 45 });
    expect(id).not.toBeNull();
    expect(carFieldGroups(s, id as string)[0].fields.map((f) => f.key)).toContain('mpg');
  });
});

describe('findField', () => {
  it('finds globals, car fields and the lease term by id; rejects unknown ones', () => {
    const s = fresh();
    expect(findField(s, 'g..gasPrice')?.key).toBe('gasPrice');
    expect(findField(s, 'bolt..price')?.meta.label).toBeTruthy();
    expect(findField(s, 'bolt.loan.apr')?.sub).toBe('loan');
    const leased = s.vehicles.find((v) => v.lease && !v.owned)!;
    expect(findField(s, `${leased.id}.lease.termMonths`)?.meta).toBe(s.meta[leased.id].leaseTerm);
    expect(findField(s, 'g..nope')).toBeUndefined();
    expect(findField(s, 'nope..price')).toBeUndefined();
    expect(findField(s, 'lx.loan.apr')).toBeUndefined();
    expect(findField(s, 'bolt.x.price')).toBeUndefined();
  });
});

describe('fieldDisplay, fieldLabel and defaultText', () => {
  it('shows percentages as percent, money with $, and plain unit words', () => {
    const s = fresh();
    const pct = fieldDisplay(s, findField(s, 'g..discountRate')!);
    expect(pct.unit).toBe('%');
    expect(pct.value).toBeCloseTo(s.g.discountRate * 100, 6);
    expect(pct.max).toBeCloseTo(15, 6);
    const elec = fieldDisplay(s, findField(s, 'g..elecPrice')!);
    expect(elec).toMatchObject({ money: true, unit: 'per kWh' });
    const price = fieldDisplay(s, findField(s, 'bolt..price')!);
    expect(price).toMatchObject({ money: true, unit: undefined, label: 'Price' });
    expect(fieldDisplay(s, findField(s, 'lx..price')!).label).toBe('What it would sell for');
  });

  it('names the loan and lease terms', () => {
    const s = fresh();
    expect(fieldLabel(findField(s, 'bolt.loan.termMonths')!)).toBe('Loan term');
    const leased = s.vehicles.find((v) => v.lease && !v.owned)!;
    expect(fieldLabel(findField(s, `${leased.id}.lease.termMonths`)!)).toBe('Lease term');
  });

  it('writes the default for "Reset to …" in the shown units', () => {
    const s = fresh();
    expect(defaultText(s, findField(s, 'g..firstTimeZev')!)).toMatch(/^(Yes|No)$/);
    expect(defaultText(s, findField(s, 'g..discountRate')!)).toMatch(/%$/);
    expect(defaultText(s, findField(s, 'g..gasPrice')!)).toBe('$5.50');
  });
});

describe('editedCount and resetAll', () => {
  it('counts edits per section, and reset puts every value back but keeps the path and the cars', () => {
    const s = fresh();
    setPath(s, 'trade');
    const drivers = assumptionSections(s).find((x) => x.id === 'drivers')!.fields;
    expect(editedCount(s, drivers)).toBe(0);
    writeFieldIn(s, findField(s, 'g..elecPrice')!, 0.2);
    writeFieldIn(s, findField(s, 'bolt..price')!, 25000);
    s.criteria[0].weight = 0;
    expect(editedCount(s, drivers)).toBe(1);
    resetAll(s);
    expect(editedCount(s, drivers)).toBe(0);
    expect(readFieldIn(s, findField(s, 'bolt..price')!)).toBe(s.defaults.find((v) => v.id === 'bolt')!.price);
    expect(s.criteria[0].weight).toBeGreaterThan(0);
    expect(s.g.disposal).toBe('trade');
    expect(s.selected).toEqual(['bolt', 'camryh', 'corolla']);
  });
});

describe('analystFieldList (what the analyst may read and suggest)', () => {
  const ids = (s: ReturnType<typeof fresh>) => analystFieldList(s).map((f) => fieldId(f));
  it('has the top drivers, every section and the compared cars, each once', () => {
    const s = fresh();
    const list = ids(s);
    expect(list).toEqual(expect.arrayContaining(['g..milesPerYear', 'g..gasPrice', 'g..firstTimeZev', 'g..elecPrice', 'lx..price', 'lx..mpg', 'bolt.loan.apr', 'corolla..price']));
    expect(new Set(list).size).toBe(list.length);
  });

  it('leaves out cars that are not compared, and follows the path', () => {
    const s = fresh();
    expect(ids(s).some((id) => id.startsWith('tesla.'))).toBe(false);
    expect(ids(s)).not.toContain('g..tradeInDiscount');
    setPath(s, 'trade');
    expect(ids(s)).toContain('g..tradeInDiscount');
    setPath(s, 'none');
    expect(ids(s).some((id) => id.startsWith('lx.'))).toBe(false);
    expect(ids(s)).not.toContain('g..lxLeakage');
  });
});
