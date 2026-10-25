import { click } from '../../core/audio/part-audio';
import type { LoopRecipe } from '../../core/audio/part-audio';
import { noiseSource } from '../../core/audio/part-loops';

/** NAMUR pilot switching and the actuator reaching its mechanical stop. */
export const SOLENOID_CLICK = click({
  band: 1900,
  q: 1.1,
  decay: 0.025,
  level: 0.045,
  thump: [160, 0.025],
});
/** An electric actuator's relay pulling in or dropping out: smaller and drier than a solenoid. */
export const RELAY_CLICK = click({
  band: 2600,
  q: 1.4,
  decay: 0.012,
  level: 0.03,
  thump: [220, 0.012],
});
export const VALVE_STOP = click({
  band: 650,
  q: 0.7,
  decay: 0.055,
  level: 0.035,
  thump: [95, 0.045],
});

/** Quiet cylinder exhaust while the pneumatic quarter-turn actuator travels. */
export const PNEUMATIC_STROKE: LoopRecipe = (context, out) => {
  const air = noiseSource(context);
  const band = context.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 1700;
  band.Q.value = 0.65;
  const gain = context.createGain();
  gain.gain.value = 0.045;
  air.connect(band).connect(gain).connect(out);
  air.start();
  air.onended = () => {
    air.disconnect();
    band.disconnect();
    gain.disconnect();
  };
  return [air];
};

/**
 * A small servo valve's electric actuator travelling (the spa cabinets'
 * wash, the owner, 2026-10-25): a geared motor's thin whine, a little
 * rough, under a soft hiss.
 */
export const SERVO_WHIRR: LoopRecipe = (context, out) => {
  const motor = context.createOscillator();
  motor.type = 'sawtooth';
  motor.frequency.value = 410;
  const wobble = context.createOscillator();
  wobble.frequency.value = 23;
  const depth = context.createGain();
  depth.gain.value = 9;
  wobble.connect(depth).connect(motor.frequency);
  const tone = context.createBiquadFilter();
  tone.type = 'bandpass';
  tone.frequency.value = 900;
  tone.Q.value = 1.2;
  const gain = context.createGain();
  gain.gain.value = 0.02;
  motor.connect(tone).connect(gain).connect(out);
  motor.start();
  wobble.start();
  motor.onended = () => {
    wobble.stop();
    for (const n of [motor, wobble, depth, tone, gain]) n.disconnect();
  };
  return [motor];
};
