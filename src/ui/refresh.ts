/** Screen-level renderers that lower modules may trigger without importing them (keeps the import graph acyclic). */
export interface Renderers {
  /** Re-render the path, picker, assumptions and results. */
  all(): void;
  /** Re-render the scoring controls. */
  controls(): void;
  /** Re-render the car picker. */
  picker(): void;
  /** Re-render the new screen on show (a step or the answer), keeping focus on the same control. */
  screen(): void;
}

let current: Renderers = { all: () => undefined, controls: () => undefined, picker: () => undefined, screen: () => undefined };

/** Register the renderers once at init. Before registration every refresh is a no-op. */
export function registerRenderers(r: Renderers): void {
  current = r;
}

/** Trigger a registered renderer. */
export const refresh: Renderers = {
  all: () => current.all(),
  controls: () => current.controls(),
  picker: () => current.picker(),
  screen: () => current.screen()
};
