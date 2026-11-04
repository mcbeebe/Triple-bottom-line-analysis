/** Element by id; the mount points in template.html are assumed to exist. */
export const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;
