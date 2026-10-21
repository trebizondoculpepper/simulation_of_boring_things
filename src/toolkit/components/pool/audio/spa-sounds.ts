import type { LoopRecipe } from '../../core/audio/part-audio';
import { noiseSource } from '../../core/audio/part-loops';

/**
 * A jacuzzi's sounds while it runs, each held while its part runs
 * (`partAudio.hold`), all synthesised:
 *
 * - `SPA_BLOWER`: the side-channel air blower under the deck: a hard,
 *   high whine at its impeller's blade-pass (about 1.9 kHz at 2,900 rpm),
 *   its motor's hum under it, and the rush of the air it pushes;
 * - `SPA_JETS`: the jet pump, in the plant room behind a wall: the
 *   distant whine of a centrifugal pump (its vanes' pass, about 290 Hz
 *   at 2,900 rpm, and its harmonics), muffled, over its motor's hum;
 * - `SPA_BUBBLES`: the air breaking the surface: a fast, irregular
 *   burble, noise in the mid band chopped by beating low oscillators.
 */

type Source = ReturnType<LoopRecipe>[number];

/** An oscillator at `hz` through `level` into `to`, started. */
function tone(
  context: AudioContext,
  to: AudioNode,
  type: OscillatorType,
  hz: number,
  level: number,
) {
  const osc = context.createOscillator();
  osc.type = type;
  osc.frequency.value = hz;
  const gain = context.createGain();
  gain.gain.value = level;
  osc.connect(gain).connect(to);
  osc.start();
  return osc;
}

/** Noise through a filter at `hz` and `q`, at `level`, into `to`, started. */
function band(
  context: AudioContext,
  to: AudioNode,
  type: BiquadFilterType,
  hz: number,
  q: number,
  level: number,
) {
  const noise = noiseSource(context);
  const filter = context.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = hz;
  filter.Q.value = q;
  const gain = context.createGain();
  gain.gain.value = level;
  noise.connect(filter).connect(gain).connect(to);
  noise.start();
  return { noise, gain };
}

/** Swing `param` by `depth` at `hz`, about where it is. */
function wobble(
  context: AudioContext,
  param: AudioParam,
  hz: number,
  depth: number,
) {
  const lfo = context.createOscillator();
  lfo.frequency.value = hz;
  const amount = context.createGain();
  amount.gain.value = depth;
  lfo.connect(amount).connect(param);
  lfo.start();
  return lfo;
}

export const SPA_BLOWER: LoopRecipe = (context, out) => {
  const sources: Source[] = [
    tone(context, out, 'sine', 1900, 0.006),
    tone(context, out, 'triangle', 3800, 0.002),
    tone(context, out, 'sine', 100, 0.02),
    tone(context, out, 'sine', 200, 0.008),
  ];
  const air = band(context, out, 'bandpass', 900, 0.7, 0.03);
  sources.push(air.noise);
  return sources;
};

export const SPA_JETS: LoopRecipe = (context, out) => {
  // Muffled by the wall between: everything through a low-pass.
  const wall = context.createBiquadFilter();
  wall.type = 'lowpass';
  wall.frequency.value = 900;
  wall.connect(out);
  const sources: Source[] = [
    tone(context, wall, 'sawtooth', 290, 0.006),
    tone(context, wall, 'sine', 580, 0.004),
    tone(context, wall, 'sine', 870, 0.002),
    tone(context, wall, 'sine', 100, 0.012),
  ];
  const rush = band(context, wall, 'lowpass', 400, 0.5, 0.012);
  sources.push(rush.noise, wobble(context, rush.gain.gain, 0.3, 0.004));
  return sources;
};

export const SPA_BUBBLES: LoopRecipe = (context, out) => {
  const burble = band(context, out, 'bandpass', 520, 1.4, 0.0);
  // Three beating oscillators chop it into irregular gurgles.
  const sources: Source[] = [burble.noise];
  for (const [hz, depth] of [
    [7.3, 0.018],
    [11.1, 0.014],
    [4.6, 0.012],
  ])
    sources.push(wobble(context, burble.gain.gain, hz, depth));
  const fizz = band(context, out, 'highpass', 3000, 0.5, 0.006);
  sources.push(fizz.noise);
  return sources;
};
