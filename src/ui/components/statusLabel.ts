import { esc } from '../../app/format';

/** Where a value comes from: an assumption, a cited source, or the visitor's own number. */
export type DsStatus = { kind: 'placeholder' } | { kind: 'yours' } | { kind: 'source'; label: string; href: string };

/**
 * Text label for a value's origin (sourced vs assumed, CLAUDE.md). A source is a link (44 px target)
 * that says it opens a new tab; only https links are accepted.
 */
export function dsStatusLabel(s: DsStatus): string {
  if (s.kind === 'placeholder') return '<span class="ds-status ds-status-ph">Placeholder</span>';
  if (s.kind === 'yours') return '<span class="ds-status ds-status-yours">Your number</span>';
  if (!/^https:\/\//.test(s.href)) throw new Error(`source link must be https: ${s.href}`);
  return `<a class="ds-status ds-status-src" href="${esc(s.href)}" target="_blank" rel="noopener">Source<span class="ds-sr">: ${esc(s.label)} (opens in a new tab)</span></a>`;
}
