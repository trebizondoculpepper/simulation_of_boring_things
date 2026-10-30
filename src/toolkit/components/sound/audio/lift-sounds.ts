import { click, tone } from '../../core/audio/part-audio';
import type { LoopRecipe, SoundRecipe } from '../../core/audio/part-audio';

/**
 * The freight lift's sounds (mission 108), synthesised: the door
 * operator's whirr while the doors move and a soft thud at each end of
 * their travel (the owner, 2026-10-30), the arrival chime, the brake's clunk, the
 * warning tone before the doors close, the nudging buzzer, the alarm
 * bell, and, held while the car runs, the traction motor's hum and its
 * gear's whine.
 */

/** The doors meeting, or reaching their stops: a soft, damped thud. */
export const DOOR_THUD: SoundRecipe = click({
  band: 260,
  q: 0.8,
  decay: 0.07,
  level: 0.22,
  thump: [62, 0.14],
});

/**
 * The door operator running, held while the doors move: a small
 * variable-speed motor's smooth whirr (a low fundamental and its
 * harmonics, a belt's faint swish over them), swelling in and dying away
 * gently as the operator eases.
 */
export const DOOR_WHIRR: LoopRecipe = (context, out) => {
  const gain = context.createGain();
  gain.gain.value = 0.0001;
  gain.gain.exponentialRampToValueAtTime(0.07, context.currentTime + 0.25);
  gain.connect(out);
  const sources: { stop(when?: number): void; release?: number }[] = [];
  for (const [hz, level, type] of [
    [118, 0.5, 'triangle'],
    [236, 0.25, 'sine'],
    [354, 0.08, 'sine'],
    [1420, 0.015, 'sine'],
  ] as const) {
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.value = hz;
    // The motor coming up to speed: its pitch rises a little.
    osc.frequency.setValueAtTime(hz * 0.8, context.currentTime);
    osc.frequency.linearRampToValueAtTime(hz, context.currentTime + 0.4);
    const g = context.createGain();
    g.gain.value = level;
    osc.connect(g).connect(gain);
    osc.start();
    sources.push({
      stop: () => {
        const now = context.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
        osc.frequency.cancelScheduledValues(now);
        osc.frequency.linearRampToValueAtTime(hz * 0.7, now + 0.25);
        osc.stop(now + 0.3);
      },
      release: 0.3,
    });
  }
  return sources;
};

/** The brake setting as the car levels in, a relay clunk with it. */
export const BRAKE_CLUNK: SoundRecipe = {
  sequence: [
    {
      at: 0,
      click: { band: 400, q: 1, decay: 0.09, level: 0.45, thump: [55, 0.2] },
    },
    { at: 0.12, click: { band: 2600, q: 2, decay: 0.03, level: 0.25 } },
  ],
};

/** The arrival chime: two falling notes. */
export const ARRIVAL_CHIME: SoundRecipe = {
  tones: [
    { at: 0, hz: 988, seconds: 0.45, level: 0.12, type: 'sine' },
    { at: 0.38, hz: 784, seconds: 0.7, level: 0.12, type: 'sine' },
  ],
};

/** The doors about to close: a short warning tone. */
export const CLOSING_WARNING: SoundRecipe = tone({
  hz: 1800,
  seconds: 0.12,
  level: 0.06,
  type: 'square',
  repeat: [3, 0.12],
});

/** Nudging: the doors closing slowly on someone holding them, a buzzer. */
export const NUDGE_BUZZER: SoundRecipe = tone({
  hz: 180,
  seconds: 0.6,
  level: 0.08,
  type: 'sawtooth',
});

/** The alarm bell: a fast-struck bell, rung for as long as it is held. */
export const ALARM_BELL: SoundRecipe = tone({
  hz: 1150,
  seconds: 0.05,
  level: 0.12,
  type: 'triangle',
  repeat: [24, 0.07],
});

/**
 * The traction machine running: a mains hum and its harmonics, and a gear
 * whine over it (an old geared machine), dying away over half a second
 * once stopped.
 */
export const MOTOR_RUN: LoopRecipe = (context, out) => {
  const gain = context.createGain();
  gain.gain.value = 0.0001;
  gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.6);
  gain.connect(out);
  const sources: { stop(when?: number): void; release?: number }[] = [];
  for (const [hz, level, type] of [
    [50, 0.5, 'sawtooth'],
    [100, 0.35, 'sine'],
    [620, 0.06, 'triangle'],
    [1240, 0.02, 'sine'],
  ] as const) {
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.value = hz;
    const g = context.createGain();
    g.gain.value = level;
    osc.connect(g).connect(gain);
    osc.start();
    sources.push({
      stop: () => {
        const now = context.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
        osc.stop(now + 0.55);
      },
      release: 0.55,
    });
  }
  return sources;
};
