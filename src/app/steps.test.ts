import { describe, expect, it } from 'vitest';
import { freshState } from './state';
import { backAction, canShowAnswer, guardRoute, hashFor, nextRoute, parseRoute, prevRoute, stepCopy, titleFor, type Route } from './steps';

describe('routes', () => {
  it('parses known hashes and sends anything else to Step 1', () => {
    expect(parseRoute('#step-1')).toBe('step-1');
    expect(parseRoute('#step-2')).toBe('step-2');
    expect(parseRoute('#step-3')).toBe('step-3');
    expect(parseRoute('#answer')).toBe('answer');
    expect(parseRoute('#style-guide')).toBe('style-guide');
    expect(parseRoute('')).toBe('step-1');
    expect(parseRoute('#')).toBe('step-1');
    expect(parseRoute('#/step-2')).toBe('step-1');
    expect(parseRoute('#bogus')).toBe('step-1');
  });

  it('formats a route back into its hash', () => {
    for (const r of ['step-1', 'step-2', 'step-3', 'answer', 'style-guide'] as Route[]) expect(parseRoute(hashFor(r))).toBe(r);
  });

  it('orders the flow Step 1 -> 2 -> 3 -> answer', () => {
    expect(nextRoute('step-1')).toBe('step-2');
    expect(nextRoute('step-2')).toBe('step-3');
    expect(nextRoute('step-3')).toBe('answer');
    expect(nextRoute('answer')).toBe('answer');
    expect(prevRoute('step-1')).toBeNull();
    expect(prevRoute('step-2')).toBe('step-1');
    expect(prevRoute('step-3')).toBe('step-2');
    expect(prevRoute('answer')).toBe('step-3');
  });
});

describe('guardRoute (deep links and reloads)', () => {
  it('sends Step 2 and Step 3 back to Step 1 until a path is chosen, replacing the history entry', () => {
    const s = freshState();
    expect(guardRoute('step-2', s)).toEqual({ route: 'step-1', replace: true });
    expect(guardRoute('step-3', s)).toEqual({ route: 'step-1', replace: true });
    s.pathChosen = true;
    expect(guardRoute('step-3', s)).toEqual({ route: 'step-3', replace: false });
  });

  it('lets Step 1, the answer and the style guide through', () => {
    const s = freshState();
    for (const r of ['step-1', 'answer', 'style-guide'] as Route[]) expect(guardRoute(r, s)).toEqual({ route: r, replace: false });
  });
});

describe('backAction', () => {
  it('uses history.back() when the previous history entry is the step we want', () => {
    expect(backAction('step-2', { tbl: true, prev: 'step-1' })).toEqual({ kind: 'history-back' });
    expect(backAction('answer', { tbl: true, prev: 'step-3' })).toEqual({ kind: 'history-back' });
  });

  it('replaces the entry otherwise (deep link, reload, or a different previous page)', () => {
    expect(backAction('step-2', null)).toEqual({ kind: 'replace', route: 'step-1' });
    expect(backAction('step-3', { tbl: true, prev: 'answer' })).toEqual({ kind: 'replace', route: 'step-2' });
    expect(backAction('step-2', { prev: 'step-1' })).toEqual({ kind: 'replace', route: 'step-1' });
  });

  it('does nothing on Step 1', () => {
    expect(backAction('step-1', { tbl: true, prev: 'step-1' })).toEqual({ kind: 'none' });
  });
});

describe('canShowAnswer (P7)', () => {
  it('needs at least one car chosen', () => {
    const s = freshState();
    expect(canShowAnswer(s)).toBe(true);
    s.selected = [];
    expect(canShowAnswer(s)).toBe(false);
  });
});

describe('copy and titles', () => {
  it('uses the spec copy for each step', () => {
    expect(stepCopy('step-1', 'sell')).toEqual({ heading: 'What are you deciding?', sub: 'Pick the closest one. You can change it later.' });
    expect(stepCopy('step-2', 'sell').heading).toBe('Your car and your driving');
    expect(stepCopy('step-2', 'trade').heading).toBe('Your car and your driving');
    expect(stepCopy('step-3', 'sell').heading).toBe('Which cars should we compare?');
  });

  it('uses the proposed miles-only copy on the just-buy path (P9)', () => {
    expect(stepCopy('step-2', 'none')).toEqual({ heading: 'Your driving', sub: 'Miles change fuel and charging costs.' });
  });

  it('titles each screen without any typed text', () => {
    expect(titleFor('step-2', 'sell')).toBe('Step 2 of 3: Your car and your driving · TBL Decision Scorecard');
    expect(titleFor('step-2', 'none')).toBe('Step 2 of 3: Your driving · TBL Decision Scorecard');
    expect(titleFor('answer', 'sell')).toBe('Your answer · TBL Decision Scorecard');
    expect(titleFor('style-guide', 'sell')).toBe('Style guide · TBL Decision Scorecard');
  });
});
