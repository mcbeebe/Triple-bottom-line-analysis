import { describe, expect, it } from 'vitest';
import { THEMES, freshState, themeFrom } from './state';

describe('themes (Phase 1 decision A: Ledger and Night only)', () => {
  it('offers exactly Ledger and Night', () => {
    expect(THEMES.map((t) => t.id)).toEqual(['ledger', 'night']);
  });

  it('a saved Night stays Night; a saved "field" (the old page\'s third theme) or anything else falls back to Ledger', () => {
    expect(themeFrom('night')).toBe('night');
    expect(themeFrom('ledger')).toBe('ledger');
    expect(themeFrom('field')).toBe('ledger');
    expect(themeFrom(null)).toBe('ledger');
    expect(themeFrom('<script>')).toBe('ledger');
  });

  it('fresh state starts in Ledger', () => {
    expect(freshState().theme).toBe('ledger');
  });
});
