/** Read (no value) or write a localStorage key; returns null when storage is unavailable or blocked. */
export function safeStore(key: string, value?: string): string | null {
  try {
    if (value === undefined) return window.localStorage.getItem(key);
    window.localStorage.setItem(key, value);
    return value;
  } catch {
    return null;
  }
}
