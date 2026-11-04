import { analyst } from '../../app/analystSession';
import { dsButton } from '../components/button';

/** The entry point on Step 1 and the answer screen. Shown only when the analyst is available (owner reversed P8). */
export function aiOfferHtml(where: 'step' | 'answer', available: boolean = analyst.client !== null): string {
  if (!available) return '';
  if (where === 'answer') return dsButton({ label: 'Ask the analyst', act: 'ai-open', variant: 'secondary', id: 'ans-ai' });
  return `<p class="ds-or" aria-hidden="true">or</p>
<button type="button" class="ds-option ds-option-ai" data-act="ai-open" id="st-ai" aria-haspopup="dialog"><span class="ds-option-title">Not sure? Describe it in a sentence</span><span class="ds-option-sub">The analyst suggests answers. Nothing changes until you tap Apply.</span></button>`;
}
