import { esc } from '../../app/format';

/** Options for {@link dsDisclosure}. `bodyHtml` must already be safe HTML. */
export interface DsDisclosureOpts {
  id: string;
  title: string;
  meta?: string;
  bodyHtml: string;
  open?: boolean;
  /** Key under which the open/closed state is remembered across re-renders (`state.secOpen`). */
  sec?: string;
  /** Id for the meta text, so it can be updated in place (e.g. an edit count). */
  metaId?: string;
}

/** Expandable row built on native `<details>`/`<summary>`, so keyboard and screen-reader behavior come for free. */
export function dsDisclosure(o: DsDisclosureOpts): string {
  const meta = o.meta || o.metaId ? `<span class="ds-disc-meta"${o.metaId ? ` id="${esc(o.metaId)}"` : ''}>${esc(o.meta ?? '')}</span>` : '';
  return `<details class="ds-disc" id="${esc(o.id)}"${o.sec ? ` data-sec="${esc(o.sec)}"` : ''}${o.open ? ' open' : ''}><summary class="ds-disc-sum"><span class="ds-disc-title">${esc(o.title)}</span>${meta}</summary><div class="ds-disc-body">${o.bodyHtml}</div></details>`;
}
