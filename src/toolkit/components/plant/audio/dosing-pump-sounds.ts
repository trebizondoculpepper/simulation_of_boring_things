import type { LoopRecipe } from '../../core/audio/part-audio';
import { noiseSource } from '../../core/audio/part-loops';

/**
 * The small dosing pumps' sounds (the owner, 2026-10-27), synthesised and
 * quiet, held while each runs:
 *
 * - `SUBMERGED_PUMP`: the DoseCell's pump, down in its bottle: a motor's
 *   50 Hz hum and its harmonic heard through liquid and plastic, so dull
 *   (lowpassed hard), with a soft diaphragm thump twice a second;
 * - `PERISTALTIC_PUMP`: a geared servo running easily (the owner,
 *   2026-10-27): a fairly low hum, not a whine, under the rollers'
 *   soft rhythmic squeeze of the tube, three a turn.
 */

export const SUBMERGED_PUMP: LoopRecipe = (context, out) => {
  const master = context.createGain();
  master.gain.value = 0.05;
  const muffle = context.createBiquadFilter();
  muffle.type = 'lowpass';
  muffle.frequency.value = 260;
  muffle.Q.value = 0.7;
  muffle.connect(master).connect(out);
  const hum = [
    [50, 0.6],
    [100, 0.35],
    [150, 0.12],
  ].map(([hz, level]) => {
    const osc = context.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = hz;
    const g = context.createGain();
    g.gain.value = level;
    osc.connect(g).connect(muffle);
    osc.start();
    return osc;
  });
  // The diaphragm: a burst of low noise, gated twice a second.
  const noise = noiseSource(context);
  const band = context.createBiquadFilter();
  band.type = 'lowpass';
  band.frequency.value = 180;
  const gate = context.createGain();
  gate.gain.value = 0;
  const lfo = context.createOscillator();
  lfo.type = 'square';
  lfo.frequency.value = 2;
  const depth = context.createGain();
  depth.gain.value = 0.5;
  lfo.connect(depth).connect(gate.gain);
  noise.connect(band).connect(gate).connect(muffle);
  noise.start();
  lfo.start();
  return [...hum, noise, lfo];
};

export const PERISTALTIC_PUMP: LoopRecipe = (context, out) => {
  const master = context.createGain();
  master.gain.value = 0.035;
  master.connect(out);
  // The geared servo's low hum, and its gear mesh a little above it.
  const hum = (
    [
      [96, 0.4],
      [192, 0.12],
      [288, 0.04],
    ] as const
  ).map(([hz, level]) => {
    const osc = context.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = hz;
    const g = context.createGain();
    g.gain.value = level;
    osc.connect(g).connect(master);
    osc.start();
    return osc;
  });
  // The rollers squeezing the tube: a soft, rubbery swish three times a turn.
  const noise = noiseSource(context);
  const band = context.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 320;
  band.Q.value = 1.2;
  const gate = context.createGain();
  gate.gain.value = 0.3;
  const lfo = context.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 3.5;
  const depth = context.createGain();
  depth.gain.value = 0.3;
  lfo.connect(depth).connect(gate.gain);
  noise.connect(band).connect(gate).connect(master);
  noise.start();
  lfo.start();
  return [...hum, noise, lfo];
};

/**
 * A solenoid metering pump (prompt 089, item 2): its solenoid's sharp
 * tick at each stroke, a dry knock of the diaphragm and its valves,
 * about one and a half a second, over a faint mains buzz.
 */
export const SOLENOID_PUMP: LoopRecipe = (context, out) => {
  const master = context.createGain();
  master.gain.value = 0.045;
  master.connect(out);
  const buzz = context.createOscillator();
  buzz.type = 'sawtooth';
  buzz.frequency.value = 100;
  const buzzLevel = context.createGain();
  buzzLevel.gain.value = 0.03;
  buzz.connect(buzzLevel).connect(master);
  buzz.start();
  // Each stroke: a short burst of bright noise, its tick, in a buffer one
  // stroke long played round and round (1.5 a second). Not a noise gated
  // by a square wave, which held the gate open for half of every stroke,
  // a hiss pulsing like a warning beeper (the owner, 2026-10-28, at
  // DP-101A).
  const stroke = Math.round(context.sampleRate / 1.5);
  const tick = context.createBuffer(1, stroke, context.sampleRate);
  const samples = tick.getChannelData(0);
  const length = Math.round(context.sampleRate * 0.015);
  let seed = 7;
  for (let i = 0; i < length; i++) {
    seed = (seed * 16807) % 2147483647;
    const decay = Math.exp((-6 * i) / length);
    samples[i] = ((seed / 2147483647) * 2 - 1) * decay;
  }
  const ticks = context.createBufferSource();
  ticks.buffer = tick;
  ticks.loop = true;
  const band = context.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 1400;
  band.Q.value = 0.9;
  ticks.connect(band).connect(master);
  ticks.start();
  return [buzz, ticks];
};

/**
 * A stepper-motor metering pump (prompt 089, item 2), after the Grundfos
 * DDA: quiet, a soft electrical whine at its stepping rate whose pitch
 * stays put, louder through the quick suction stroke (a fifth of each
 * stroke, the motor driven hard) than the long, slow discharge, and a
 * muffled click of its valves as each stroke turns. One stroke's sound,
 * 1.2 a second, in a buffer played round and round. (It was a tone swept
 * up and down by a sawtooth, a siren's wail: the owner, 2026-10-28, at
 * DP-102.)
 */
export const STEPPER_PUMP: LoopRecipe = (context, out) => {
  const master = context.createGain();
  master.gain.value = 0.03;
  master.connect(out);
  const rate = context.sampleRate;
  const stroke = Math.round(rate / 1.2);
  const buffer = context.createBuffer(1, stroke, rate);
  const samples = buffer.getChannelData(0);
  const suction = Math.round(stroke * 0.2);
  const click = Math.round(rate * 0.012);
  // The whine: the step rate's fundamental and two harmonics, a whole
  // number of cycles a stroke (200 at 240 Hz) so the loop joins cleanly.
  const f = Math.round(240 / 1.2) * 1.2;
  let seed = 11;
  for (let i = 0; i < stroke; i++) {
    const t = i / rate;
    const whine =
      Math.sin(2 * Math.PI * f * t) * 0.6 +
      Math.sin(4 * Math.PI * f * t) * 0.25 +
      Math.sin(6 * Math.PI * f * t) * 0.1;
    // Louder while it draws (eased in and out), quieter while it pushes.
    const level =
      i < suction ? 0.35 + 0.25 * Math.sin((Math.PI * i) / suction) : 0.22;
    let sample = whine * level;
    // The valves' muffled click as suction gives way to discharge.
    const k = i - suction;
    if (k >= 0 && k < click) {
      seed = (seed * 16807) % 2147483647;
      sample +=
        ((seed / 2147483647) * 2 - 1) * 0.5 * Math.exp((-5 * k) / click);
    }
    samples[i] = sample;
  }
  const loop = context.createBufferSource();
  loop.buffer = buffer;
  loop.loop = true;
  const soften = context.createBiquadFilter();
  soften.type = 'lowpass';
  soften.frequency.value = 1200;
  loop.connect(soften).connect(master);
  loop.start();
  return [loop];
};
