import { esc } from '../../app/format';

/** Options for {@link dsDisclosure}. `bodyHtml` must already be safe HTML. */
export interface DsDisclosureOpts {
  id: string;
  title: string;
  meta?: string;
  bodyHtml: string;
  open?: boolean;
}

/** Expandable row built on native `<details>`/`<summary>`, so keyboard and screen-reader behavior come for free. */
export function dsDisclosure(o: DsDisclosureOpts): string {
  return `<details class="ds-disc" id="${esc(o.id)}"${o.open ? ' open' : ''}><summary class="ds-disc-sum"><span class="ds-disc-title">${esc(o.title)}</span>${o.meta ? `<span class="ds-disc-meta">${esc(o.meta)}</span>` : ''}</summary><div class="ds-disc-body">${o.bodyHtml}</div></details>`;
}
