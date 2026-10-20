import type { LoopRecipe } from './part-audio';

/** A held recording that may finish loading after the part has stopped. */
export function recordedLoop(url: URL, level: number): LoopRecipe {
  const buffers = new WeakMap<AudioContext, Promise<AudioBuffer>>();
  return (context, out) => {
    let cancelled = false;
    let source: AudioBufferSourceNode | undefined;
    if (!buffers.has(context)) {
      const pending = fetch(url)
        .then((response) => {
          if (!response.ok) throw new Error(`Sound unavailable: ${url}`);
          return response.arrayBuffer();
        })
        .then((bytes) => context.decodeAudioData(bytes));
      buffers.set(context, pending);
      void pending.catch(() => buffers.delete(context));
    }
    void buffers
      .get(context)!
      .then((buffer) => {
        if (cancelled || context.state !== 'running') return;
        source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const gain = context.createGain();
        gain.gain.value = level;
        source.connect(gain).connect(out);
        source.onended = () => {
          source?.disconnect();
          gain.disconnect();
        };
        source.start();
      })
      .catch((error) => console.warn('A rolling sound could not play.', error));
    return [
      {
        stop(when) {
          cancelled = true;
          source?.stop(when);
        },
      },
    ];
  };
}
