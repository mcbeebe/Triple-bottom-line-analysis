import { esc } from '../../app/format';
import { scenarioFrom } from '../../app/scenario';
import { encodeShare, shareSummary } from '../../app/share';
import type { State } from '../../app/state';
import { dsButton } from '../components/button';
import { dsSheet } from '../components/sheet';

/** Id of the Share sheet. */
export const SHARE_SHEET = 'share';

/** The full link that reopens this answer: this page's address with the scenario as its #name. */
export function shareLink(s: State): string {
  return `${location.href.split('#')[0]}#${encodeShare(scenarioFrom(s))}`;
}

/** Share sheet body: Copy link, the link itself (selectable), and a plain list of exactly what it holds. */
export function shareBody(s: State, link: string): string {
  const name = (id: string) => s.vehicles.find((v) => v.id === id)?.name ?? id;
  const rows = shareSummary(scenarioFrom(s), name)
    .map((r) => `<div class="ds-kv"><dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd></div>`)
    .join('');
  return `<p class="ds-guide-note">Anyone with the link sees this answer with the same numbers.</p>
${dsButton({ label: 'Copy link', act: 'ans-copylink', full: true, id: 'share-copy' })}
<p class="ds-count" id="share-status" role="status"></p>
<div class="ds-field"><label for="share-link" class="ds-label">Link</label><div class="ds-input"><input id="share-link" type="text" readonly value="${esc(link)}" aria-describedby="share-hint"></div><p class="ds-hint" id="share-hint">If copying is blocked, select the link and copy it yourself.</p></div>
<h3 class="ds-group-h">The link contains exactly this</h3>
<dl class="ds-kvs">${rows}</dl>
<p class="ds-note">Nothing is sent anywhere. The link holds only these numbers; car names you typed are left out.</p>`;
}

/** Render the Share sheet into the sheet host (hidden until shown). */
export function renderShareSheet(s: State, link: string): void {
  const host = document.getElementById('ds-sheets');
  if (host) host.innerHTML = dsSheet({ id: SHARE_SHEET, title: 'Share this answer', bodyHtml: shareBody(s, link) });
}
