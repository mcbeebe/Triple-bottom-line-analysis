import { PUBLIC_DEFAULTS, normalizeScenario, type Scenario, type ScenarioInput } from './scenario';

/** Largest scenario a link may carry, in bytes of compact JSON (spec: about 2 KB). */
export const MAX_SHARE_BYTES = 2048;

const PREFIX = 's1-';
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';

/** Lower-case base32 (RFC 4648 alphabet, no padding): only letters and digits, so it fits a plain #name. */
export function base32Encode(bytes: Uint8Array): string {
  let out = '';
  let bits = 0;
  let value = 0;
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

/** Decode lower-case base32; null when any character is outside the alphabet. */
export function base32Decode(text: string): Uint8Array | null {
  const out: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of text) {
    const i = ALPHABET.indexOf(ch);
    if (i < 0) return null;
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

const round = (n: number): number => Math.round(n * 1e6) / 1e6;
const KEYS: [keyof Scenario, string][] = [
  ['path', 'p'], ['carPreset', 'c'], ['carOverrides', 'o'], ['miles', 'm'], ['selected', 's'], ['customCars', 'x'], ['edits', 'e'], ['settings', 't']
];

/** True for a hash that holds a shared scenario (e.g. "#s1-..."). */
export const isShareHash = (hash: string): boolean => /^#?s1-[a-z2-7]+$/.test(hash);

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/**
 * The `#name` (without "#") that reopens this scenario. Parts equal to the public defaults are left out to keep
 * links short. Numbers only; typed names are never part of a scenario.
 */
export function encodeShare(sc: Scenario): string {
  const compact: Record<string, unknown> = { v: 1 };
  for (const [k, short] of KEYS) if (!same(sc[k], PUBLIC_DEFAULTS[k])) compact[short] = sc[k];
  const json = JSON.stringify(compact, (_k, v) => (typeof v === 'number' ? round(v) : v));
  return PREFIX + base32Encode(new TextEncoder().encode(json));
}

/** Read a shared `#name`. Rejects anything malformed, of another version or over the size cap; repairs and reports bad values. */
export function decodeShare(hash: string): { ok: boolean; scenario: Scenario | null; problems: string[] } {
  const fail = (why: string) => ({ ok: false, scenario: null, problems: [why] });
  const h = hash.replace(/^#/, '');
  if (!h.startsWith(PREFIX)) return fail('Not a share link of this version.');
  const body = h.slice(PREFIX.length);
  if (body.length > Math.ceil((MAX_SHARE_BYTES * 8) / 5)) return fail('The link is too long.');
  const bytes = base32Decode(body);
  if (!bytes) return fail('The link has characters it should not.');
  let data: unknown;
  try {
    data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    return fail('The link could not be read.');
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data) || (data as { v?: unknown }).v !== 1) return fail('The link could not be read.');
  const d = data as Record<string, unknown>;
  const input: Record<string, unknown> = { ...PUBLIC_DEFAULTS };
  for (const [k, short] of KEYS) if (d[short] !== undefined) input[k] = d[short];
  const n = normalizeScenario(input as unknown as ScenarioInput);
  return { ok: true, scenario: n.scenario, problems: n.problems };
}

const PATH_WORDS: Record<string, string> = { sell: 'Sell my car, then buy', trade: 'Trade my car in', none: 'Just buy' };
const PRESET_WORDS: Record<string, string> = {
  sedan: 'The "Older gas sedan" preset',
  suv: 'The "Older gas SUV" preset',
  hybrid: 'The "Older hybrid" preset',
  lexus: 'The Lexus LX 470 example',
  custom: '"Something else" (your own numbers)'
};

/** Plain-words list of exactly what a link holds, for the Share panel. `carName` names catalog cars by id. */
export function shareSummary(sc: Scenario, carName: (id: string) => string): { label: string; value: string }[] {
  const changed = Object.keys(sc.carOverrides).length + Object.keys(sc.edits).length;
  const own = sc.customCars.length;
  const cars = [...sc.selected.map(carName), ...(own ? [`${own} car${own === 1 ? '' : 's'} of your own (name${own === 1 ? '' : 's'} left out)`] : [])];
  const st = sc.settings;
  const settings = [
    { hybrid: 'Hybrid scoring', metrics: 'Numbers only', ratings: '1 to 5 scorecard' }[st.mode],
    { benchmark: '50 = a typical new car', anchored: '50 = keeping your car', relative: 'cars scored against each other' }[st.scale],
    st.preset === 'custom' ? 'your own pillar weights' : `${{ balanced: 'balanced', planet: 'planet-first', people: 'people-first', wallet: 'wallet-first' }[st.preset] ?? st.preset} weighting`,
    ...(st.aggregation === 'weakest' ? ['the weakest pillar decides'] : []),
    { both: 'loans and leases shown', loan: 'loans only', lease: 'leases only' }[st.view],
    ...(st.embodied === 'full' ? ['all factory carbon counted'] : [])
  ].join(', ');
  return [
    { label: 'What you are deciding', value: PATH_WORDS[sc.path] },
    { label: 'Car you have now', value: sc.path === 'none' ? 'None (just buying)' : PRESET_WORDS[sc.carPreset] },
    { label: 'Numbers you changed', value: changed === 0 ? 'None yet. Only numbers that differ from the defaults go in.' : `${changed} number${changed === 1 ? '' : 's'}` },
    { label: 'Cars compared', value: cars.length ? cars.join(', ') : 'None' },
    { label: 'Miles per year', value: sc.miles.toLocaleString('en-US') },
    { label: 'Settings', value: settings }
  ];
}
