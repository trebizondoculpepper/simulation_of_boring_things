import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { recordedLoop } from './recorded-loop';

function audio() {
  const gain = { gain: { value: 0 }, connect: vi.fn(), disconnect: vi.fn() };
  const source = {
    buffer: null,
    loop: false,
    connect: vi.fn(() => gain),
    start: vi.fn(),
    stop: vi.fn(),
    disconnect: vi.fn(),
    onended: undefined,
  };
  const context = {
    state: 'running',
    decodeAudioData: vi.fn(async () => ({})),
    createGain: () => gain,
    createBufferSource: () => source,
  };
  return { context: context as unknown as AudioContext, source, gain };
}

afterEach(() => vi.unstubAllGlobals());

describe('a held recorded loop', () => {
  it('loads once, loops, and stops at the requested time', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(0),
    }));
    vi.stubGlobal('fetch', fetcher);
    const { context, source, gain } = audio();
    const loop = recordedLoop(new URL('https://example.com/cart.wav'), 0.2);
    const held = loop(context, {} as AudioNode);
    await vi.waitFor(() => expect(source.start).toHaveBeenCalledOnce());
    expect(source.loop).toBe(true);
    expect(gain.gain.value).toBe(0.2);
    held[0].stop(5);
    expect(source.stop).toHaveBeenCalledWith(5);
    loop(context, {} as AudioNode);
    await vi.waitFor(() => expect(source.start).toHaveBeenCalledTimes(2));
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('does not start late if movement stops while the audio is loading', async () => {
    let loaded!: (response: unknown) => void;
    vi.stubGlobal(
      'fetch',
      () =>
        new Promise((resolve) => {
          loaded = resolve;
        }),
    );
    const { context, source } = audio();
    const held = recordedLoop(new URL('https://example.com/cart.wav'), 0.2)(
      context,
      {} as AudioNode,
    );
    held[0].stop(1);
    loaded({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) });
    await vi.waitFor(() =>
      expect(context.decodeAudioData).toHaveBeenCalledOnce(),
    );
    expect(source.start).not.toHaveBeenCalled();
    expect(source.stop).not.toHaveBeenCalled();
  });
});
