

/** Toggle chip button (HTML) wired to the global `data-act` click handler. */
export function chip(act: string, val: string, label: string, sub = '', on = false): string {
  return `<button class="chip ${on ? 'on' : ''}" aria-pressed="${on}" data-act="${act}" data-val="${val}">${label}${sub ? `<small>${sub}</small>` : ''}</button>`;
}
