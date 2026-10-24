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
