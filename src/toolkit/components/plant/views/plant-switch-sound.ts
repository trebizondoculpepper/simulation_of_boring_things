import type { LoopRecipe, SoundRecipe } from '../../core/audio/part-audio';
import { noiseSource } from '../../core/audio/part-loops';

/** Igniter ticks and the dull gas-valve knock, before the burner catches. */
export const BOILER_IGNITION: SoundRecipe = {
  sequence: [
    ...Array.from({ length: 6 }, (_, i) => ({
      at: 0.12 + i * 0.085,
      click: { band: 3400, q: 1.4, decay: 0.025, level: 0.028 },
    })),
    {
      at: 0.63,
      click: {
        band: 320,
        q: 0.7,
        decay: 0.13,
        level: 0.045,
        thump: [72, 0.18] as [number, number],
      },
    },
  ],
};

/** A burner: blower first, then an uneven low flame roar and flue hiss. */
export const boilerFiringSound: LoopRecipe = (context, out) => {
  const now = context.currentTime;
  const air = noiseSource(context);
  const blower = context.createBiquadFilter();
  blower.type = 'bandpass';
  blower.frequency.value = 760;
  blower.Q.value = 0.55;
  const blowerGain = context.createGain();
  blowerGain.gain.setValueAtTime(0.0001, now);
  blowerGain.gain.exponentialRampToValueAtTime(0.018, now + 0.35);
  air.connect(blower).connect(blowerGain).connect(out);

  const flame = noiseSource(context);
  const bass = context.createBiquadFilter();
  bass.type = 'lowpass';
  bass.frequency.value = 235;
  const flameGain = context.createGain();
  flameGain.gain.setValueAtTime(0.0001, now);
  flameGain.gain.setValueAtTime(0.0001, now + 0.65);
  flameGain.gain.exponentialRampToValueAtTime(0.052, now + 1.05);
  flame.connect(bass).connect(flameGain).connect(out);

  const flue = noiseSource(context);
  const hiss = context.createBiquadFilter();
  hiss.type = 'bandpass';
  hiss.frequency.value = 1650;
  hiss.Q.value = 0.45;
  const hissGain = context.createGain();
  hissGain.gain.setValueAtTime(0.0001, now);
  hissGain.gain.setValueAtTime(0.0001, now + 0.65);
  hissGain.gain.exponentialRampToValueAtTime(0.012, now + 1.15);
  flue.connect(hiss).connect(hissGain).connect(out);

  const flutter = context.createOscillator();
  flutter.type = 'sine';
  flutter.frequency.value = 8.5;
  const depth = context.createGain();
  depth.gain.setValueAtTime(0, now);
  depth.gain.setValueAtTime(0, now + 0.65);
  depth.gain.linearRampToValueAtTime(0.004, now + 1.05);
  flutter.connect(depth).connect(flameGain.gain);
  air.start(now);
  flame.start(now);
  flue.start(now);
  flutter.start(now);
  const sources = [air, flame, flue, flutter];
  return [
    {
      release: 1.8,
      stop(end?: number) {
        const at = context.currentTime;
        for (const gain of [flameGain, hissGain]) {
          gain.gain.cancelScheduledValues(at);
          gain.gain.setTargetAtTime(0.0001, at, 0.12);
        }
        blowerGain.gain.cancelScheduledValues(at);
        blowerGain.gain.setTargetAtTime(0.0001, at, 0.48);
        depth.gain.cancelScheduledValues(at);
        depth.gain.setValueAtTime(0, at);
        for (const source of sources) source.stop(end ?? at + 1.8);
      },
    },
  ];
};

/** Gas closes; the held blower sound supplies the coast-down. */
export const BOILER_SHUTDOWN: SoundRecipe = {
  click: { band: 360, q: 0.7, decay: 0.16, level: 0.036, thump: [70, 0.16] },
};

/** Short geared-motor run, ending at its limit switch. */
export function servoMotionSound(opening: boolean): SoundRecipe {
  const pitch = opening ? [340, 390, 440, 465] : [465, 410, 365, 320];
  return {
    tones: pitch.map((hz, i) => ({
      at: i * 0.11,
      hz,
      seconds: 0.14,
      level: 0.012,
      type: 'triangle' as const,
    })),
  };
}

export const SPRING_RETURN: SoundRecipe = {
  click: { band: 620, q: 0.9, decay: 0.18, level: 0.038, thump: [75, 0.2] },
};
