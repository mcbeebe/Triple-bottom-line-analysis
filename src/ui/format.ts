/** Escape text for insertion into HTML. Every string from the engine, the user or the AI goes through this. */
export const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** Element by id; the mount points in template.html are assumed to exist. */
export const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;
/** Whole dollars with a thousands separator and a leading minus for negatives. */
export const usd = (n: number): string => (n < 0 ? '-' : '') + '$' + Math.round(Math.abs(n)).toLocaleString('en-US');
/** Number with `d` decimals and a thousands separator. */
export const num = (n: number, d = 1): string => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
