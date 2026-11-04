import { esc } from '../../app/format';
import { closeSheet, closedSheet, nextFocusIndex, openSheet, type SheetState } from '../../app/sheet';

/** Options for {@link dsSheet}. `bodyHtml` must already be safe HTML. */
export interface DsSheetOpts {
  id: string;
  title: string;
  bodyHtml: string;
}

/** Bottom-sheet markup: a hidden backdrop holding a labeled modal dialog with a Close button. */
export function dsSheet(o: DsSheetOpts): string {
  const id = esc(o.id);
  return `<div class="ds-backdrop" data-sheet="${id}" hidden><section class="ds-sheet" id="${id}" role="dialog" aria-modal="true" aria-labelledby="${id}-title" tabindex="-1">
<div class="ds-sheet-head"><h2 id="${id}-title" class="ds-sheet-title">${esc(o.title)}</h2><button type="button" class="ds-btn ds-btn-link ds-sheet-close" data-sheet-close>Close</button></div>
<div class="ds-sheet-body">${o.bodyHtml}</div></section></div>`;
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';
let current: SheetState<HTMLElement> = closedSheet<HTMLElement>();
let inerted: HTMLElement[] = [];
let bound = false;

const backdropOf = (id: string): HTMLElement | null => document.querySelector<HTMLElement>(`[data-sheet="${CSS.escape(id)}"]`);
const focusables = (root: HTMLElement): HTMLElement[] => [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);

/** Id of the open sheet, or null. */
export function openSheetId(): string | null {
  return current.open;
}

/**
 * Open sheet `id`: show it, make everything else in the body inert, lock page scroll and move focus
 * to its first control. Focus returns to `opener` (default: the focused element) on close.
 */
export function showSheet(id: string, opener: HTMLElement | null = document.activeElement as HTMLElement | null): void {
  const backdrop = backdropOf(id);
  if (!backdrop) return;
  if (current.open && current.open !== id) backdropOf(current.open)?.setAttribute('hidden', '');
  current = openSheet(current, id, opener ?? document.body);
  backdrop.hidden = false;
  if (!inerted.length) {
    const keep = [...document.body.children].find((c) => c.contains(backdrop));
    inerted = [...document.body.children].filter((c): c is HTMLElement => c !== keep && c instanceof HTMLElement && !c.inert);
    inerted.forEach((el) => (el.inert = true));
    document.documentElement.classList.add('ds-scroll-lock');
  }
  const sheet = backdrop.querySelector<HTMLElement>('[role="dialog"]') as HTMLElement;
  (focusables(sheet)[0] ?? sheet).focus();
}

/** Close the open sheet (if any), restore the page and return focus to the opener. */
export function hideSheet(): void {
  if (!current.open) return;
  backdropOf(current.open)?.setAttribute('hidden', '');
  inerted.forEach((el) => (el.inert = false));
  inerted = [];
  document.documentElement.classList.remove('ds-scroll-lock');
  const r = closeSheet(current);
  current = r.state;
  r.focus?.focus();
}

/**
 * Install the document listeners once: `data-act="open-sheet"` with `data-val` opens a sheet;
 * Close, a click on the backdrop and Escape close it; Tab and Shift-Tab wrap inside it.
 */
export function bindSheets(): void {
  if (bound) return;
  bound = true;
  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const opener = t.closest<HTMLElement>('[data-act="open-sheet"]');
    if (opener) return showSheet(opener.dataset.val ?? '', opener);
    if (t.closest('[data-sheet-close]') || (t.matches('[data-sheet]') && current.open)) hideSheet();
  });
  document.addEventListener('keydown', (e) => {
    if (!current.open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      hideSheet();
      return;
    }
    if (e.key !== 'Tab') return;
    const sheet = backdropOf(current.open)?.querySelector<HTMLElement>('[role="dialog"]');
    if (!sheet) return;
    const list = focusables(sheet);
    const next = nextFocusIndex(list.indexOf(document.activeElement as HTMLElement), list.length, e.shiftKey);
    e.preventDefault();
    (next < 0 ? sheet : list[next]).focus();
  });
}
