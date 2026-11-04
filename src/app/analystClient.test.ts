import { describe, expect, it, vi } from 'vitest';
import { ArtifactSampleClient, describeAnalystError, type ClaudeHost } from './analystClient';

const hostWith = (json = vi.fn().mockResolvedValue({ summary: 'ok' })) => {
  const use = vi.fn().mockResolvedValue({ json });
  return { host: { claude: { use } } as ClaudeHost, use, json };
};

describe('ArtifactSampleClient.available', () => {
  it('is false when the host has no claude object', async () => {
    expect(await new ArtifactSampleClient({}).available()).toBe(false);
  });

  it('is false when claude.use is missing', async () => {
    expect(await new ArtifactSampleClient({ claude: {} }).available()).toBe(false);
  });

  it('is false when claude.use throws', async () => {
    const host: ClaudeHost = { claude: { use: () => Promise.reject(new Error('denied')) } };
    expect(await new ArtifactSampleClient(host).available()).toBe(false);
  });

  it('is false when claude.use resolves null', async () => {
    const host: ClaudeHost = { claude: { use: () => Promise.resolve(null) } };
    expect(await new ArtifactSampleClient(host).available()).toBe(false);
  });

  it('is true when the sample API is granted, and asks for "sample" only once', async () => {
    const { host, use } = hostWith();
    const c = new ArtifactSampleClient(host);
    expect(await c.available()).toBe(true);
    expect(await c.available()).toBe(true);
    expect(use).toHaveBeenCalledTimes(1);
    expect(use).toHaveBeenCalledWith('sample');
  });
});

describe('ArtifactSampleClient.ask', () => {
  it('passes the prompt and abort signal through with caching off, and returns the raw answer', async () => {
    const { host, json } = hostWith(vi.fn().mockResolvedValue({ summary: 'hi' }));
    const c = new ArtifactSampleClient(host);
    await c.available();
    const ctrl = new AbortController();
    await expect(c.ask('PROMPT', ctrl.signal)).resolves.toEqual({ summary: 'hi' });
    expect(json).toHaveBeenCalledWith('PROMPT', { signal: ctrl.signal, cache: false });
  });

  it('rejects with code "unavailable" before available() has granted access', async () => {
    const c = new ArtifactSampleClient(hostWith().host);
    await expect(c.ask('x', new AbortController().signal)).rejects.toMatchObject({ code: 'unavailable' });
  });

  it('propagates host errors unchanged so the UI can branch on their code', async () => {
    const err = Object.assign(new Error('limit'), { code: 'rate_limited' });
    const c = new ArtifactSampleClient(hostWith(vi.fn().mockRejectedValue(err)).host);
    await c.available();
    await expect(c.ask('x', new AbortController().signal)).rejects.toBe(err);
  });
});

describe('ArtifactSampleClient.ask onWriting', () => {
  it('calls onWriting once, when the first text arrives', async () => {
    const json = vi.fn(async (_p: string, o?: { onText?: (u: { text: string; delta: string }) => void }) => {
      o?.onText?.({ text: 'a', delta: 'a' });
      o?.onText?.({ text: 'ab', delta: 'b' });
      return { summary: 'x' };
    });
    const c = new ArtifactSampleClient(hostWith(json).host);
    await c.available();
    const onWriting = vi.fn();
    await c.ask('P', new AbortController().signal, onWriting);
    expect(onWriting).toHaveBeenCalledTimes(1);
    expect(json.mock.calls[0][1]).toMatchObject({ cache: false });
  });
});

describe('describeAnalystError (every code in the sample contract 0.2.96)', () => {
  const codes = ['invalid_request', 'prompt_too_large', 'images_unavailable', 'tools_unavailable', 'image_rejected', 'cancelled', 'not_granted', 'session_expired', 'sampling_disabled', 'not_declared', 'rate_limited', 'refused', 'empty_completion', 'invalid_json', 'upstream_error', 'capability_disabled', 'capability_removed', 'transform_error', 'queue_overflow'];

  it('gives every code a non-empty message and keeps the code', () => {
    for (const code of codes) {
      const v = describeAnalystError({ code, message: 'dev text' });
      expect(v.code).toBe(code);
      expect(v.message.length).toBeGreaterThan(0);
      expect(v.message).not.toContain('dev text');
    }
  });

  it('hides the analyst only for codes that will not change during the visit', () => {
    const hidden = codes.filter((code) => describeAnalystError({ code }).hide).sort();
    expect(hidden).toEqual(['capability_disabled', 'capability_removed', 'not_declared', 'not_granted', 'sampling_disabled']);
    expect(describeAnalystError({ code: 'unavailable' }).hide).toBe(true);
  });

  it('treats a Stop as not an error, from the host code or a DOM AbortError', () => {
    expect(describeAnalystError({ code: 'cancelled' })).toEqual({ code: 'cancelled', message: 'Stopped.', hide: false, isError: false });
    expect(describeAnalystError(Object.assign(new Error('x'), { name: 'AbortError' })).isError).toBe(false);
  });

  it('gives specific words for the likely failures and a retry message for unknown ones', () => {
    expect(describeAnalystError({ code: 'invalid_json' }).message).toMatch(/could not read/);
    expect(describeAnalystError({ code: 'rate_limited' }).message).toMatch(/usage limit/);
    expect(describeAnalystError({ code: 'session_expired' }).message).toMatch(/Sign in again/);
    expect(describeAnalystError({ code: 'brand_new' })).toMatchObject({ code: 'brand_new', hide: false, isError: true });
    expect(describeAnalystError(undefined)).toMatchObject({ code: 'unknown', isError: true });
    expect(describeAnalystError('boom').message).toMatch(/try again/);
  });
});
