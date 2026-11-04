import { describe, expect, it } from 'vitest';
import { closeSheet, closedSheet, nextFocusIndex, openSheet } from './sheet';

describe('sheet state', () => {
  it('starts closed', () => {
    expect(closedSheet()).toEqual({ open: null, returnTo: null });
  });

  it('opens and remembers where focus came from', () => {
    expect(openSheet(closedSheet<string>(), 'why', 'btn-why')).toEqual({ open: 'why', returnTo: 'btn-why' });
  });

  it('closes and hands back the focus target', () => {
    const r = closeSheet(openSheet(closedSheet<string>(), 'why', 'btn-why'));
    expect(r.state).toEqual({ open: null, returnTo: null });
    expect(r.focus).toBe('btn-why');
  });

  it('closing when nothing is open is a no-op with no focus target', () => {
    expect(closeSheet(closedSheet<string>())).toEqual({ state: { open: null, returnTo: null }, focus: null });
  });

  it('opening a second sheet replaces the first but keeps the original opener', () => {
    const s = openSheet(openSheet(closedSheet<string>(), 'why', 'btn-why'), 'share', 'btn-inside-why');
    expect(s).toEqual({ open: 'share', returnTo: 'btn-why' });
    expect(closeSheet(s).focus).toBe('btn-why');
  });

  it('re-opening the same sheet keeps the original opener', () => {
    const s = openSheet(openSheet(closedSheet<string>(), 'why', 'a'), 'why', 'b');
    expect(s).toEqual({ open: 'why', returnTo: 'a' });
  });

  it('does not mutate the previous state', () => {
    const a = closedSheet<string>();
    openSheet(a, 'why', 'x');
    expect(a).toEqual({ open: null, returnTo: null });
  });
});

describe('nextFocusIndex', () => {
  it('moves forward and wraps from last to first', () => {
    expect(nextFocusIndex(0, 3, false)).toBe(1);
    expect(nextFocusIndex(2, 3, false)).toBe(0);
  });

  it('moves backward and wraps from first to last', () => {
    expect(nextFocusIndex(1, 3, true)).toBe(0);
    expect(nextFocusIndex(0, 3, true)).toBe(2);
  });

  it('enters at the first or last element when focus is outside (-1)', () => {
    expect(nextFocusIndex(-1, 3, false)).toBe(0);
    expect(nextFocusIndex(-1, 3, true)).toBe(2);
  });

  it('stays put with a single element and returns -1 with none', () => {
    expect(nextFocusIndex(0, 1, false)).toBe(0);
    expect(nextFocusIndex(0, 1, true)).toBe(0);
    expect(nextFocusIndex(-1, 0, false)).toBe(-1);
  });
});
