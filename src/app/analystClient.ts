/** Shape of the artifact host's sample API (`window.claude.use('sample')`). */
interface SampleApi {
  json: (input: string, opts?: { signal?: AbortSignal; cache?: boolean; onText?: (u: { text: string; delta: string }) => void }) => Promise<unknown>;
}

/** Minimal window surface the artifact client reads; injected in tests. */
export interface ClaudeHost {
  claude?: { use?: (name: string) => Promise<SampleApi | null> };
}

/**
 * Access to a language model for the analyst. Implementations return the raw
 * JSON the model produced; `sanitizeAnswer` validates it before anything is shown.
 */
export interface AnalystClient {
  /** True when the client can answer right now (permission granted, backend reachable). */
  available(): Promise<boolean>;
  /**
   * Ask with a complete prompt. `onWriting` is called once, when the answer starts to arrive.
   * Rejections carry the host's `code` (see {@link describeAnalystError}) or `unavailable`.
   */
  ask(prompt: string, signal: AbortSignal, onWriting?: () => void): Promise<unknown>;
}

/** Analyst client for the artifact host, wrapping the viewer's own Claude permission. */
export class ArtifactSampleClient implements AnalystClient {
  private sample: SampleApi | null = null;
  private resolved = false;

  constructor(private readonly host: ClaudeHost = globalThis as unknown as ClaudeHost) {}

  /** Resolves the sample API once; false when the host has no `claude.use`, it throws, or it returns null. */
  async available(): Promise<boolean> {
    if (!this.resolved) {
      try {
        const c = this.host.claude;
        this.sample = c?.use ? await c.use('sample') : null;
      } catch {
        this.sample = null;
      }
      this.resolved = true;
    }
    return this.sample !== null;
  }

  /** Send the prompt; rejects with `code: 'unavailable'` when no sample API was granted. */
  ask(prompt: string, signal: AbortSignal, onWriting?: () => void): Promise<unknown> {
    if (!this.sample) return Promise.reject(Object.assign(new Error('Analyst unavailable'), { code: 'unavailable' }));
    if (!onWriting) return this.sample.json(prompt, { signal, cache: false });
    let told = false;
    const onText = () => {
      if (!told) {
        told = true;
        onWriting();
      }
    };
    return this.sample.json(prompt, { signal, cache: false, onText });
  }
}

/** What the panel does about a failed call: the words to show, and whether to hide the analyst for this visit. */
export interface AnalystErrorView {
  /** The error code as the host gave it ('unknown' when there was none). Shown small, for support. */
  code: string;
  /** Plain-words message for the person; '' for a Stop they asked for. */
  message: string;
  /** True for codes that will not change during this visit: the analyst is hidden. */
  hide: boolean;
  /** False only for a Stop the person asked for. */
  isError: boolean;
}

const RETRY = 'The analyst could not answer just now. Your inputs are unchanged; try again.';
const UNAVAILABLE = 'The analyst is not available here, so it has been hidden. Everything else still works.';
const ERROR_WORDS: Record<string, { message: string; hide?: boolean }> = {
  rate_limited: { message: 'You have hit a usage limit for now. Try again in a little while.' },
  session_expired: { message: 'Your Claude sign-in has expired. Sign in again, then try.' },
  refused: { message: 'Claude declined to answer this. Try describing it differently.' },
  empty_completion: { message: 'The analyst returned an empty answer. Try a shorter description.' },
  invalid_json: { message: 'The answer came back in a form this page could not read. Try again; a shorter description helps.' },
  prompt_too_large: { message: 'That is too much to send at once. Shorten the description and try again.' },
  invalid_request: { message: 'This page sent the analyst a request it could not read (our bug). Your inputs are unchanged.' },
  transform_error: { message: 'This page sent the analyst a request it could not read (our bug). Your inputs are unchanged.' },
  queue_overflow: { message: 'Too many requests at once. Wait a moment, then try again.' },
  upstream_error: { message: RETRY },
  not_granted: { message: 'The analyst was not allowed here, so it has been hidden. Everything else still works.', hide: true },
  sampling_disabled: { message: UNAVAILABLE, hide: true },
  not_declared: { message: UNAVAILABLE, hide: true },
  capability_disabled: { message: UNAVAILABLE, hide: true },
  capability_removed: { message: UNAVAILABLE, hide: true },
  unavailable: { message: UNAVAILABLE, hide: true }
};

/**
 * Turn a rejected analyst call into what the panel shows. Covers every code the claude.ai `sample`
 * capability documents (runtime contract 0.2.96); unknown codes are treated as a passing failure.
 */
export function describeAnalystError(e: unknown): AnalystErrorView {
  const err = (e ?? {}) as { name?: unknown; code?: unknown };
  const code = typeof err.code === 'string' && err.code ? err.code : typeof err.name === 'string' && err.name === 'AbortError' ? 'cancelled' : 'unknown';
  if (code === 'cancelled' || code === 'aborted') return { code, message: 'Stopped.', hide: false, isError: false };
  const w = ERROR_WORDS[code] ?? { message: RETRY };
  return { code, message: w.message, hide: !!w.hide, isError: true };
}
