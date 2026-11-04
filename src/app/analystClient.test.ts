import { describe, expect, it, vi } from 'vitest';
import { ArtifactSampleClient, type ClaudeHost } from './analystClient';

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
