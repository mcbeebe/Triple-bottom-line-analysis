import { describe, expect, it } from 'vitest';
import { CATALOG, SRC } from './data';

const entry = (id: string) => {
  const d = CATALOG.find((c) => c.vehicle.id === id);
  if (!d) throw new Error(`no catalog entry ${id}`);
  return d;
};

// Phase 2 decision P2: the default cars' data was fact-checked on Nov 4, 2026 before becoming the public default.
describe('default-car data (fact-checked Nov 4, 2026)', () => {
  it('Corolla LE price is the MY2027 figure with destination, from a source that is actually a Corolla', () => {
    const c = entry('corolla');
    expect(c.vehicle.price).toBe(24620);
    expect(c.vehicle.loan?.down).toBe(2500);
    expect(c.meta.price.src).toEqual(['corolla']);
    expect(SRC.corolla.url).toMatch(/corolla/i);
    expect(SRC.corolla.url).not.toMatch(/camry/i);
  });

  it('Corolla mpg cites fueleconomy.gov', () => {
    const c = entry('corolla');
    expect(c.vehicle.mpg).toBe(35);
    expect(c.meta.mpg.src).toEqual(['corollaMpg']);
    expect(SRC.corollaMpg.url).toMatch(/^https:\/\/www\.fueleconomy\.gov\//);
  });

  it('Bolt efficiency is the EPA 28 kWh/100 mi, marked sourced', () => {
    const b = entry('bolt');
    expect(b.vehicle.kwhPer100mi).toBe(28);
    expect(b.meta.kwhPer100mi.kind).toBe('sourced');
    expect(b.meta.kwhPer100mi.src).toContain('boltEpa');
    expect(SRC.boltEpa.url).toMatch(/^https:\/\/www\.fueleconomy\.gov\//);
    expect(SRC.boltRange.label).not.toMatch(/255/);
  });

  it('Bolt lease is flagged as a dated, national offer', () => {
    expect(entry('bolt').meta.monthly.note).toMatch(/^Dated offer/);
  });

  it('Camry Hybrid price says which model year it is and cites fueleconomy.gov for mpg', () => {
    const c = entry('camryh');
    expect(c.vehicle.price).toBe(30495);
    expect(c.meta.price.note).toMatch(/2026/);
    expect(c.meta.mpg.src).toContain('camryMpg');
    expect(SRC.camryMpg.url).toMatch(/^https:\/\/www\.fueleconomy\.gov\//);
  });

  it('every source link is https', () => {
    for (const [k, s] of Object.entries(SRC)) expect(s.url, k).toMatch(/^https:\/\//);
  });
});
