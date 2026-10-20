import { effect } from '@preact/signals-core';
import type { Readable } from '../logic/world/components';
import type { DropProfile } from '../../../controls/logic/drop-profile';
import { boardClatter } from './board-impact';
import { click } from './part-audio';
import type { LoopRecipe } from './part-audio';

/** Flat boards chatter; solid housings and cylindrical parts sound each real contact. */
export function objectImpact(
  profile: DropProfile,
  speed: number,
  contact: number,
) {
  if (profile.shape === 'flat')
    return contact === 1
      ? boardClatter(speed, profile.span, Math.random, profile.sound)
      : null;
  const strength = Math.min(1, Math.max(0.01, speed) / 5.5);
  return click({
    band: profile.sound.band * (0.85 + Math.random() * 0.3),
    q: profile.sound.material === 'metal' ? 2.2 : 0.8,
    decay: profile.sound.decay * (0.6 + strength * 0.4),
    level: profile.sound.gain * strength ** 0.8,
    thump: [profile.sound.thump, profile.sound.decay * 0.65],
  });
}

/** Quiet continuous surface contact; no repeated impacts for a round rolling part. */
export function objectRoll(
  profile: DropProfile,
  speed: Readable<number>,
): LoopRecipe {
  return (context, out) => {
    const buffer = context.createBuffer(
      1,
      context.sampleRate,
      context.sampleRate,
    );
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    const noise = context.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = profile.sound.band * 0.15;
    const gain = context.createGain();
    const stop = effect(() => {
      gain.gain.setTargetAtTime(
        0.025 * Math.min(1, speed.value),
        context.currentTime,
        0.04,
      );
    });
    noise.connect(filter).connect(gain).connect(out);
    noise.start();
    return [
      {
        stop(when?: number) {
          stop();
          noise.stop(when);
          noise.onended = () => {
            noise.disconnect();
            filter.disconnect();
            gain.disconnect();
          };
        },
      },
    ];
  };
}
