/** Shape of the artifact host's sample API (`window.claude.use('sample')`). */
interface SampleApi {
  json: (input: string, opts?: { signal?: AbortSignal; cache?: boolean }) => Promise<unknown>;
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
  /** Ask with a complete prompt. Rejections carry `code`: `rate_limited`, `not_granted`, `unavailable`, or `aborted`. */
  ask(prompt: string, signal: AbortSignal): Promise<unknown>;
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
  ask(prompt: string, signal: AbortSignal): Promise<unknown> {
    if (!this.sample) return Promise.reject(Object.assign(new Error('Analyst unavailable'), { code: 'unavailable' }));
    return this.sample.json(prompt, { signal, cache: false });
  }
}
