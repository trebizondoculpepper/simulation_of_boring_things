import { signal } from '@preact/signals-core';
import { machineTone } from '../../sound/audio/machine-tones';
import { recordedLoop } from './recorded-loop';
import { renderFireAlarm } from '../../fire/audio/fire-alarm';
import type { LoopRecipe } from './part-audio';

/**
 * State sounds for parts: sounds a part holds for as long as its state
 * calls for them (`partAudio.hold`). Each is a recipe the part that
 * makes it imports and holds; nothing chooses them by name. They are
 * quiet, synthesised except for the recorded castors:
 *
 * - `MAINS_HUM`: a transformer or breaker carrying load: the low, coarse
 *   transformer tone of `machine-tones.ts`, faded in and out;
 * - `NEON_BUZZ`: a mains neon or lamp ballast, a thin 120 Hz rasp;
 * - `RELAY_HOLD`: a relay or contactor coil holding in: the same, much
 *   quieter and a little higher;
 * - `MOTOR_HUM`: an induction motor running: the motor tone, running up
 *   and coasting down;
 * - `FIRE_SOUNDER`: the fire alarm, the VX3 Simulator's synthesised
 *   sounders (`fire-alarm.ts`): a pulsing piezo, a two-note buzzer and a
 *   far sweep;
 * - `ALARM_BUZZER`: an accessible toilet's emergency alarm, a pulsing
 *   buzz;
 * - `EXTRACT_FAN`: a small extractor fan's whirr;
 * - `WATER_SPRAY`: sprinklers discharging, a broad hiss;
 * - `CRACKLE`: a fire in a bin: crackle and the roar of the flames;
 * - `CASTORS`: castors rolling on a hard floor;
 * - `FIRE_BELL`: an electric fire bell, its striker ringing the gong
 *   about twenty times a second, as for a sprinkler flow alarm.
 */

/** Tones at `hz`, each at its level, under one gain. */
const tones =
  (level: number, partials: [OscillatorType, number, number][]): LoopRecipe =>
  (context, out) => {
    const gain = context.createGain();
    gain.gain.value = level;
    gain.connect(out);
    return partials.map(([type, hz, share]) => {
      const osc = context.createOscillator();
      osc.type = type;
      osc.frequency.value = hz;
      const g = context.createGain();
      g.gain.value = share;
      osc.connect(g).connect(gain);
      osc.start();
      return osc;
    });
  };

/** Switched in, a transformer or contactor only fades in and out. */
const SWITCHED = { up: 0.3, down: 0.4, floor: 1 };

export const MAINS_HUM: LoopRecipe = machineTone(
  'transformer',
  signal(1),
  0.04,
  SWITCHED,
);

export const RELAY_HOLD: LoopRecipe = machineTone(
  'transformer',
  signal(1.5),
  0.012,
  SWITCHED,
);

export const NEON_BUZZ: LoopRecipe = (context, out) => {
  const osc = context.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 120;
  const band = context.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 1800;
  band.Q.value = 3;
  const gain = context.createGain();
  gain.gain.value = 0.03;
  osc.connect(band).connect(gain).connect(out);
  osc.start();
  return [osc];
};

export const MOTOR_HUM: LoopRecipe = machineTone('motor', signal(1), 0.06);

/** A shared second of white noise, for hisses. */
const noiseSource = (context: AudioContext) => {
  const buffer = context.createBuffer(
    1,
    context.sampleRate,
    context.sampleRate,
  );
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
};

/** The fire alarm's loop, rendered once for each audio context. */
const alarmLoops = new WeakMap<BaseAudioContext, AudioBuffer>();

export const FIRE_SOUNDER: LoopRecipe = (context, out) => {
  let buffer = alarmLoops.get(context);
  if (!buffer) {
    const samples = renderFireAlarm(context.sampleRate);
    buffer = context.createBuffer(1, samples.length, context.sampleRate);
    buffer.getChannelData(0).set(samples);
    alarmLoops.set(context, buffer);
  }
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const gain = context.createGain();
  gain.gain.value = 0.12;
  source.connect(gain).connect(out);
  source.start();
  return [source];
};

export const ALARM_BUZZER: LoopRecipe = (context, out) => {
  const osc = context.createOscillator();
  osc.type = 'square';
  osc.frequency.value = 2400;
  const gate = context.createGain();
  gate.gain.value = 0;
  // Pulse it on and off about twice a second.
  const lfo = context.createOscillator();
  lfo.type = 'square';
  lfo.frequency.value = 2;
  const depth = context.createGain();
  depth.gain.value = 0.02;
  lfo.connect(depth).connect(gate.gain);
  const bias = context.createConstantSource();
  bias.offset.value = 0.02;
  bias.connect(gate.gain);
  osc.connect(gate).connect(out);
  osc.start();
  lfo.start();
  bias.start();
  return [osc, lfo, bias];
};

export const EXTRACT_FAN: LoopRecipe = (context, out) => {
  const hum = tones(0.02, [
    ['sine', 100, 1],
    ['sine', 200, 0.3],
  ])(context, out);
  const air = noiseSource(context);
  const band = context.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 1400;
  band.Q.value = 0.6;
  const level = context.createGain();
  level.gain.value = 0.02;
  air.connect(band).connect(level).connect(out);
  air.start();
  return [...hum, air];
};

export const WATER_SPRAY: LoopRecipe = (context, out) => {
  const spray = noiseSource(context);
  const band = context.createBiquadFilter();
  band.type = 'highpass';
  band.frequency.value = 1500;
  const level = context.createGain();
  level.gain.value = 0.06;
  spray.connect(band).connect(level).connect(out);
  spray.start();
  return [spray];
};

/** A second of an electric bell: a gong of inharmonic partials struck 20 times. */
function renderBell(sampleRate: number) {
  const length = sampleRate;
  const out = new Float32Array(length);
  const partials: [number, number, number][] = [
    [1180, 1, 9],
    [2830, 0.5, 14],
    [4710, 0.3, 20],
    [6360, 0.15, 26],
  ];
  const strikes = 20;
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const since = t % (1 / strikes);
    let v = 0;
    for (const [hz, level, decay] of partials)
      // The gong rings on through the strikes; each strike refreshes it.
      v +=
        level *
        Math.sin(2 * Math.PI * hz * t) *
        (0.55 + 0.45 * Math.exp(-since * decay * 4));
    out[i] = v * 0.35;
  }
  return out;
}
const bells = new WeakMap<BaseAudioContext, AudioBuffer>();

export const FIRE_BELL: LoopRecipe = (context, out) => {
  let buffer = bells.get(context);
  if (!buffer) {
    const samples = renderBell(context.sampleRate);
    buffer = context.createBuffer(1, samples.length, context.sampleRate);
    buffer.getChannelData(0).set(samples);
    bells.set(context, buffer);
  }
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const gain = context.createGain();
  gain.gain.value = 0.06;
  source.connect(gain).connect(out);
  source.start();
  return [source];
};

export const CRACKLE: LoopRecipe = (context, out) => {
  // The roar: low noise.
  const roar = noiseSource(context);
  const low = context.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = 500;
  const roarLevel = context.createGain();
  roarLevel.gain.value = 0.05;
  roar.connect(low).connect(roarLevel).connect(out);
  roar.start();
  // The crackle: sparse clicks, noise gated by a fast random envelope.
  const length = context.sampleRate * 2;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++)
    if (Math.random() < 0.0009) {
      const amp = 0.3 + Math.random() * 0.7;
      for (let k = 0; k < 120 && i + k < length; k++)
        data[i + k] += amp * (Math.random() * 2 - 1) * Math.exp(-k / 25);
    }
  const crackle = context.createBufferSource();
  crackle.buffer = buffer;
  crackle.loop = true;
  const crackleLevel = context.createGain();
  crackleLevel.gain.value = 0.12;
  crackle.connect(crackleLevel).connect(out);
  crackle.start();
  return [roar, crackle];
};

/** Recorded squeaky shopping-cart wheels; held only while the stand moves. */
export const CASTORS = recordedLoop(
  new URL('./assets/trolley-squeak.wav', import.meta.url),
  0.2,
);
