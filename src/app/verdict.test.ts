import { describe, expect, it } from 'vitest';
import { answerCards, breakEvenLine, cardTags, carPhrase, flipLine, pickFlip, verdictSentence, type VerdictOption } from './verdict';

const opt = (id: string, name: string, overall: number, cost: number, carbon: number, isKeep = false): VerdictOption => ({ id, name, overall, cost, carbon, isKeep });
const KEEP = (overall: number, cost = 20000, carbon = 25) => opt('keep', 'Keep My gas sedan', overall, cost, carbon, true);
const BOLT = (overall: number, cost = 39000, carbon = 21) => opt('bolt-loan', 'Chevy Bolt (loan)', overall, cost, carbon);
const CAMRY = (overall: number, cost = 37000, carbon = 30) => opt('camryh-loan', 'Toyota Camry Hybrid (loan)', overall, cost, carbon);
const sorted = (...o: VerdictOption[]) => [...o].sort((a, b) => b.overall - a.overall);

describe('carPhrase (Q8: natural names)', () => {
  it('turns preset names into "your ..."', () => {
    expect(carPhrase('My gas sedan')).toBe('your gas sedan');
    expect(carPhrase('My hybrid')).toBe('your hybrid');
    expect(carPhrase('My car')).toBe('your car');
    expect(carPhrase('Lexus LX 470')).toBe('your Lexus LX 470');
    expect(carPhrase('Old Civic')).toBe('your Old Civic');
    expect(carPhrase('  ')).toBe('your car');
  });
});

describe('verdictSentence (02-ux-spec rules 1 to 5, with Q8 wording)', () => {
  it('rule 4 (near tie) wins when keep is first and the top two are within 2 points', () => {
    expect(verdictSentence(sorted(KEEP(61.6), BOLT(59.7), CAMRY(58.1)), 'My gas sedan')).toBe('It is close. Keeping your gas sedan and the Chevy Bolt (loan) are within 2 points.');
  });

  it('rule 4 with keep second', () => {
    expect(verdictSentence(sorted(BOLT(61), KEEP(60), CAMRY(50)), 'My gas sedan')).toBe('It is close. The Chevy Bolt (loan) and keeping your gas sedan are within 2 points.');
  });

  it('rule 4 when neither of the top two is keep', () => {
    expect(verdictSentence(sorted(BOLT(61), CAMRY(60), KEEP(50)), 'My gas sedan')).toBe('It is close. The Chevy Bolt (loan) and the Toyota Camry Hybrid (loan) are within 2 points.');
  });

  it('exactly 2 points counts as close; just over does not', () => {
    expect(verdictSentence(sorted(KEEP(62), BOLT(60)), 'My gas sedan')).toMatch(/^It is close\./);
    expect(verdictSentence(sorted(KEEP(62.01), BOLT(60)), 'My gas sedan')).not.toMatch(/^It is close\./);
  });

  it('rule 2: keep is top overall', () => {
    expect(verdictSentence(sorted(KEEP(70), BOLT(60)), 'Lexus LX 470')).toBe('Keeping your Lexus LX 470 comes out ahead overall.');
  });

  it('rule 1: keep is cheapest but another option scores highest', () => {
    expect(verdictSentence(sorted(BOLT(70, 39000), KEEP(60, 20000), CAMRY(55, 37000)), 'My gas sedan')).toBe('Keeping your gas sedan costs least. The Chevy Bolt (loan) scores highest overall.');
  });

  it('rule 3: the top option is also the cheapest', () => {
    expect(verdictSentence(sorted(CAMRY(70, 15000), KEEP(60, 20000), BOLT(55)), 'My gas sedan')).toBe('The Toyota Camry Hybrid (loan) wins on cost and overall score.');
  });

  it('rule 5: no current car', () => {
    expect(verdictSentence(sorted(BOLT(70, 39000), CAMRY(60, 37000)), null)).toBe('The Chevy Bolt (loan) scores highest overall; the Toyota Camry Hybrid (loan) costs least.');
    expect(verdictSentence(sorted(CAMRY(70, 30000), BOLT(60, 39000)), null)).toBe('The Toyota Camry Hybrid (loan) wins on cost and overall score.');
  });

  it('never more than two sentences, and a single option still reads well', () => {
    expect(verdictSentence([BOLT(70)], null)).toBe('The Chevy Bolt (loan) wins on cost and overall score.');
    for (const s of [verdictSentence(sorted(BOLT(70), KEEP(60, 10)), 'My car'), verdictSentence(sorted(KEEP(61.6), BOLT(59.7)), 'My car')]) {
      expect(s.split('. ').length).toBeLessThanOrEqual(2);
    }
  });
});

describe('answerCards and cardTags', () => {
  it('shows the top three, plus keep when it is not among them', () => {
    const all = sorted(BOLT(70), CAMRY(68), opt('c', 'Toyota Corolla (loan)', 66, 34000, 36), KEEP(60));
    expect(answerCards(all).map((o) => o.id)).toEqual(['bolt-loan', 'camryh-loan', 'c', 'keep']);
    expect(answerCards(sorted(KEEP(61.6), BOLT(59.7), CAMRY(58.1), opt('c', 'C', 50, 1, 1))).map((o) => o.id)).toEqual(['keep', 'bolt-loan', 'camryh-loan']);
  });

  it('gives each tag to the option that earns it, possibly two on one card', () => {
    const all = sorted(KEEP(61.6, 20984, 25.2), BOLT(59.7, 39480, 21.3), CAMRY(58.1, 37736, 29.9));
    expect(cardTags(all)).toEqual({ keep: ['Highest overall score', 'Lowest cost'], 'bolt-loan': ['Lowest carbon'] });
  });
});

describe('breakEvenLine ("What would change this")', () => {
  it('finite and above today: states the gas price and today\'s assumption', () => {
    expect(breakEvenLine('Chevy Bolt (loan)', 15.29, 5.5, 'My gas sedan')).toBe('Gas above $15.29 a gallon makes the Chevy Bolt (loan) cost less than keeping your gas sedan. Today the tool assumes $5.50.');
  });
  it('none below $40', () => {
    expect(breakEvenLine('Chevy Bolt (loan)', null, 5.5, 'My gas sedan')).toBe('No realistic gas price makes the Chevy Bolt (loan) cheaper than keeping your gas sedan.');
  });
  it('already cheaper at any gas price, or at today\'s price', () => {
    expect(breakEvenLine('Chevy Bolt (loan)', 0, 5.5, 'My gas sedan')).toBe('The Chevy Bolt (loan) costs less than keeping your gas sedan at any gas price.');
    expect(breakEvenLine('Chevy Bolt (loan)', 3.1, 5.5, 'My gas sedan')).toBe('The Chevy Bolt (loan) already costs less than keeping your gas sedan at $5.50 a gallon; it stays cheaper down to $3.10.');
  });
});

describe('flipLine', () => {
  const names = { 'bolt-loan': 'Chevy Bolt (loan)', keep: 'Keep My gas sedan' };
  it('phrases a winner flip in plain words', () => {
    expect(flipLine({ change: 'Double the miles per year', winner: 'bolt-loan' }, names, 'My gas sedan')).toBe('If you drove twice as far, the Chevy Bolt (loan) would score highest.');
    expect(flipLine({ change: 'Old car stops emitting after you part with it (0% continues, e.g. scrapped)', winner: 'bolt-loan' }, names, 'My gas sedan')).toBe('If your gas sedan were scrapped instead of driven by a new owner, the Chevy Bolt (loan) would score highest.');
  });
  it('says "keeping your car" when keep becomes the winner', () => {
    expect(flipLine({ change: 'Half the miles per year', winner: 'keep' }, names, 'My gas sedan')).toBe('If you drove half as far, keeping your gas sedan would score highest.');
  });
  it('falls back to a generic sentence for an unknown change', () => {
    expect(flipLine({ change: 'Something new', winner: 'bolt-loan' }, names, 'My car')).toBe('With this change (something new), the Chevy Bolt (loan) would score highest.');
  });
});

describe('pickFlip', () => {
  it('returns null when no change flips the winner', () => {
    expect(pickFlip([{ change: 'Double the miles per year', winner: 'keep', winnerChanged: false }])).toBeNull();
  });
  it('prefers the most familiar change when several flip', () => {
    const rows = [
      { change: 'Owned car repair costs double', winner: 'bolt-loan', winnerChanged: true },
      { change: 'Old car stops emitting after you part with it (0% continues, e.g. scrapped)', winner: 'bolt-loan', winnerChanged: true },
      { change: 'Something new', winner: 'x', winnerChanged: true }
    ];
    expect(pickFlip(rows)?.change).toBe('Old car stops emitting after you part with it (0% continues, e.g. scrapped)');
  });
});
