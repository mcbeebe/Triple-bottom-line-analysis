import { describe, expect, it } from 'vitest';
import { aiOfferHtml } from './offer';
import { aiSheetBody } from './aiSheet';

describe('aiOfferHtml (owner reversed P8)', () => {
  it('renders nothing when the analyst is unavailable', () => {
    expect(aiOfferHtml('step', false)).toBe('');
    expect(aiOfferHtml('answer', false)).toBe('');
  });

  it('on Step 1: a dashed option that opens a dialog, after an "or" hidden from screen readers', () => {
    const h = aiOfferHtml('step', true);
    expect(h).toContain('<p class="ds-or" aria-hidden="true">or</p>');
    expect(h).toMatch(/<button type="button" class="ds-option ds-option-ai" data-act="ai-open" id="st-ai" aria-haspopup="dialog">/);
    expect(h).toContain('Nothing changes until you tap Apply.');
    expect(h).not.toContain('aria-pressed');
  });

  it('on the answer screen: a secondary button with a stable id for focus return', () => {
    expect(aiOfferHtml('answer', true)).toBe('<button type="button" class="ds-btn ds-btn-secondary" id="ans-ai" data-act="ai-open">Ask the analyst</button>');
  });
});

describe('aiSheetBody', () => {
  it('holds the analyst host and a way to the answer, worded for where it was opened', () => {
    expect(aiSheetBody(false)).toContain('<div id="ai-host" class="ds-ai"></div>');
    expect(aiSheetBody(false)).toContain('>See my answer</button>');
    expect(aiSheetBody(true)).toContain('>Back to my answer</button>');
    expect(aiSheetBody(true)).toContain('data-act="ai-answer"');
  });
});
