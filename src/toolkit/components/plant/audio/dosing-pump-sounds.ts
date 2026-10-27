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
