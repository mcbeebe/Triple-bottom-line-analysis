/** Screen-level renderers that lower modules may trigger without importing them (keeps the import graph acyclic). */
export interface Renderers {
  /** Re-render the screen on show (a step or the answer) and anything open over it, keeping focus on the same control. */
  screen(): void;
}

let current: Renderers = { screen: () => undefined };

/** Register the renderers once at init. Before registration every refresh is a no-op. */
export function registerRenderers(r: Renderers): void {
  current = r;
}

/** Trigger a registered renderer. */
export const refresh: Renderers = {
  screen: () => current.screen()
};
