import { effect } from '@preact/signals-core';
import type { ReadonlySignal } from '@preact/signals-core';
import type { LoopRecipe } from './part-audio';

/**
 * A held recording that may finish loading after the part has stopped.
 * With `follow` (0 to 1, a machine's speed), its loudness and its pitch
 * follow it: it runs up and runs down with what makes it.
 */
export function recordedLoop(
  url: URL,
  level: number,
  follow?: ReadonlySignal<number>,
): LoopRecipe {
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
        const node = source;
        const stopFollowing = follow
          ? effect(() => {
              const v = Math.max(0, Math.min(1, follow.value));
              const now = context.currentTime;
              gain.gain.setTargetAtTime(level * v, now, 0.05);
              node.playbackRate.setTargetAtTime(0.55 + 0.45 * v, now, 0.05);
            })
          : () => {};
        source.onended = () => {
          stopFollowing();
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
