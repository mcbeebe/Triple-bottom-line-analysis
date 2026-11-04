/** Which bottom sheet is open and where focus returns when it closes. `T` is the focus target (an element in the UI, a string in tests). */
export interface SheetState<T> {
  open: string | null;
  returnTo: T | null;
}

/** The closed state. */
export function closedSheet<T>(): SheetState<T> {
  return { open: null, returnTo: null };
}

/**
 * Open sheet `id`. When a sheet is already open it is replaced, and focus will
 * still return to the element that opened the first one: the second opener
 * lived inside the sheet that is going away.
 */
export function openSheet<T>(s: SheetState<T>, id: string, opener: T): SheetState<T> {
  return { open: id, returnTo: s.open === null ? opener : s.returnTo };
}

/** Close whatever is open; `focus` is where focus should go next (null if nothing was open). */
export function closeSheet<T>(s: SheetState<T>): { state: SheetState<T>; focus: T | null } {
  return { state: closedSheet<T>(), focus: s.open === null ? null : s.returnTo };
}

/**
 * Index of the element that Tab (or Shift-Tab when `backwards`) should focus,
 * wrapping at both ends so focus never leaves the sheet. `current` is -1 when
 * focus is outside the list. Returns -1 when the list is empty.
 */
export function nextFocusIndex(current: number, count: number, backwards: boolean): number {
  if (count <= 0) return -1;
  if (current < 0) return backwards ? count - 1 : 0;
  return backwards ? (current - 1 + count) % count : (current + 1) % count;
}
