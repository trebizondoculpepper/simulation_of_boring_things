import { click } from '../../core/audio/part-audio';
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
 *
 * Each about a third (−10 dB) of what they first were (the owner,
 * 2026-10-28): a diaphragm pump is loud for its size close to (a hard
 * clack each stroke), but is not to be heard over a circulation pump
 * across the room; that masking is voice limiting's (prompt 098), not
 * a quieter pump.
 */

export const SUBMERGED_PUMP: LoopRecipe = (context, out) => {
  const master = context.createGain();
  master.gain.value = 0.016;
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
  master.gain.value = 0.011;
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
  master.gain.value = 0.014;
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
  // A hard clack (the owner, 2026-10-28: loud for its size): the
  // solenoid's bright tick over the diaphragm's low knock, 30 ms.
  const length = Math.round(context.sampleRate * 0.03);
  let seed = 7;
  for (let i = 0; i < length; i++) {
    seed = (seed * 16807) % 2147483647;
    const t = i / context.sampleRate;
    const tickPart =
      ((seed / 2147483647) * 2 - 1) * Math.exp((-12 * i) / length);
    const knock =
      Math.sin(2 * Math.PI * 160 * t) * 1.4 * Math.exp((-5 * i) / length);
    samples[i] = tickPart + knock;
  }
  const ticks = context.createBufferSource();
  ticks.buffer = tick;
  ticks.loop = true;
  const band = context.createBiquadFilter();
  band.type = 'lowpass';
  band.frequency.value = 3200;
  ticks.connect(band).connect(master);
  ticks.start();
  return [buzz, ticks];
};

/**
 * A motor-driven diaphragm pump's rattle (the owner, 2026-10-28, after a
 * recording of a three-chamber diaphragm water pump), used for the
 * stepper-motor metering pumps (after the Grundfos DDA), the nearest the
 * plant has: its diaphragms fire 42 times a second (a motor at about 14
 * turns a second, three chambers), each a short knock, so a hard, buzzing
 * rattle rich in that pulse's harmonics, strongest from 250 Hz to 1 kHz,
 * swelling a little six times a second as the motor's load comes and
 * goes. A second of it, a whole number of pulses and swells, played round
 * and round. Synthesised from the recording's measurements; nothing of
 * the recording itself.
 */
export const STEPPER_PUMP: LoopRecipe = (context, out) => {
  const master = context.createGain();
  master.gain.value = 0.0095;
  master.connect(out);
  const rate = context.sampleRate;
  const buffer = context.createBuffer(1, rate, rate);
  const samples = buffer.getChannelData(0);
  const pulses = 42;
  const period = rate / pulses;
  const knock = Math.round(rate * 0.006);
  let seed = 13;
  for (let i = 0; i < rate; i++) {
    const t = i / rate;
    const swell = 0.8 + 0.2 * Math.sin(2 * Math.PI * 6 * t);
    // Within its pulse: a short knock, a little noise and a ring.
    const k = i % period;
    let sample = 0;
    if (k < knock) {
      seed = (seed * 16807) % 2147483647;
      const decay = Math.exp((-4 * k) / knock);
      sample =
        (((seed / 2147483647) * 2 - 1) * 0.6 +
          Math.sin((2 * Math.PI * 520 * k) / rate)) *
        decay;
    }
    // The pulse's own fundamental, under it.
    sample += Math.sin(2 * Math.PI * pulses * t) * 0.15;
    samples[i] = sample * swell;
  }
  const loop = context.createBufferSource();
  loop.buffer = buffer;
  loop.loop = true;
  // Strongest from 250 Hz to 1 kHz, as recorded.
  const band = context.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 500;
  band.Q.value = 0.6;
  const low = context.createGain();
  low.gain.value = 0.6;
  loop.connect(band).connect(master);
  loop.connect(low).connect(master);
  loop.start();
  return [loop];
};

/**
 * A motor-driven metering pump (prompt 102, the Grundflow DMH, after the
 * ProMinent Sigma/ 1), held while it runs: its small four-pole motor's
 * 100 Hz hum and its shaft's 24 Hz beat, and the faint whine of its worm
 * gear (about 480 Hz), the rest of its sound being its strokes
 * (`MOTOR_PUMP_STROKE`), played one by one as they come.
 */
export const MOTOR_DIAPHRAGM_PUMP: LoopRecipe = (context, out) => {
  const master = context.createGain();
  master.gain.value = 0.012;
  master.connect(out);
  const voices = (
    [
      [100, 0.5, 'sine'],
      [200, 0.12, 'sine'],
      [24, 0.25, 'triangle'],
      [480, 0.035, 'sawtooth'],
    ] as const
  ).map(([hz, level, type]) => {
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.value = hz;
    const g = context.createGain();
    g.gain.value = level;
    // The gear's sawtooth lowpassed, so it is the hum's edge, not a tone.
    if (type === 'sawtooth') {
      const soft = context.createBiquadFilter();
      soft.type = 'lowpass';
      soft.frequency.value = 900;
      osc.connect(g).connect(soft).connect(master);
    } else osc.connect(g).connect(master);
    osc.start();
    return osc;
  });
  return voices;
};

/**
 * One of its strokes, as it is heard (prompt 102): delivering, a firm
 * knock as its discharge stroke meets the line's pressure and its valve
 * balls seat; gas-locked, the same stroke hollow, a light tick with no
 * weight behind it, as a pump that has lost its prime sounds; bleeding, a
 * wet gurgle as gas and liquid go to the return.
 */
export const MOTOR_PUMP_STROKE = {
  delivering: click({
    band: 1700,
    q: 2.2,
    decay: 0.03,
    level: 0.11,
    thump: [70, 0.07],
  }),
  locked: click({ band: 2600, q: 3, decay: 0.012, level: 0.06 }),
  bleeding: click({ band: 700, q: 1.2, decay: 0.05, level: 0.06, sweep: 0.18 }),
} as const;
