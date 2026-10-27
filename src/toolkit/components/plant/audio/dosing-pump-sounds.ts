import type { LoopRecipe } from '../../core/audio/part-audio';
import { noiseSource } from '../../core/audio/part-loops';

/**
 * The small dosing pumps' sounds (the owner, 2026-10-27), synthesised and
 * quiet, held while each runs:
 *
 * - `SUBMERGED_PUMP`: the DoseCell's pump, down in its bottle: a motor's
 *   50 Hz hum and its harmonic heard through liquid and plastic, so dull
 *   (lowpassed hard), with a soft diaphragm thump twice a second;
 * - `PERISTALTIC_PUMP`: a geared motor's thin whine under the rollers'
 *   rhythmic squeeze of the tube, three a turn.
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
  // The geared motor's whine.
  const whine = context.createOscillator();
  whine.type = 'triangle';
  whine.frequency.value = 420;
  const wg = context.createGain();
  wg.gain.value = 0.25;
  whine.connect(wg).connect(master);
  whine.start();
  // The rollers squeezing the tube: a soft, rubbery swish three times a turn.
  const noise = noiseSource(context);
  const band = context.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 650;
  band.Q.value = 1.4;
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
  return [whine, noise, lfo];
};
