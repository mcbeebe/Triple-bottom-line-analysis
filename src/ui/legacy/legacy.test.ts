import { describe, expect, it } from 'vitest';
import { heroText } from './pathPanel';

describe('heroText (decision P10)', () => {
  it('keeps the original test-case wording for the Lexus example', () => {
    const h = heroText('lexus');
    expect(h.lead).toContain('Test case: keep a 1999 Lexus LX 470');
    expect(h.pill).toMatch(/^Test case/);
  });

  it('uses neutral wording for every other current car', () => {
    for (const p of ['sedan', 'suv', 'hybrid', 'custom']) {
      const h = heroText(p);
      expect(h.lead).not.toMatch(/Lexus|Test case|EV/);
      expect(h.pill).not.toMatch(/Test case/);
    }
  });
});
