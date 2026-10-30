import {
  PUMPS,
  TAGS,
  deliveryAlone,
  fillSeconds,
  fillSentence,
  pumpId,
} from '../../../game/plant/museum-6-pumps';
import type { HallPump, PumpNo } from '../../../game/plant/museum-6-pumps';
import { RESET_SIGN } from './ideal-pool-plant-placards';
import type { Placard } from './ideal-pool-plant-placards';

export { RESET_SIGN };

/**
 * Hall 6's words (107j): the entrance panel, each pump's plaque, and the
 * two-families panel by the tank. Names, tags, powers, flows and every
 * fill time come from the model (`museum-6-pumps.ts`); only the
 * explanation is written here. Pure.
 */

/** How each pump works, what it is for, and its one fact (107j's research). */
const WORDS: Record<PumpNo, { how: string; fact: string }> = {
  1: {
    how: 'A solenoid flicks a rubber diaphragm back and forth; valves let the water in on one stroke and out on the next.',
    fact: 'Each click is one stroke, about a fifth of a millilitre. It would need about five million to fill the tank.',
  },
  2: {
    how: 'A stepper motor pushes the diaphragm, slowly out and quickly back.',
    fact: 'Its slow push and quick return make the chemical flow smoothly, not in spurts.',
  },
  3: {
    how: 'An electric motor and a worm gear drive the diaphragm through a full, adjustable stroke.',
    fact: 'Built to push against 10 bar, ten times a car tyre; here it pushes against a sixth of a bar.',
  },
  4: {
    how: 'Rollers on a spinning rotor squeeze a tube, pushing the water along in front of them.',
    fact: 'Nothing touches the liquid but the tube. Rollers squeeze it like toothpaste.',
  },
  5: {
    how: 'A spinning impeller throws water outward; a magnet turns it through a solid wall.',
    fact: 'No shaft seal: the chemical cannot leak out along the shaft.',
  },
  6: {
    how: 'Water enters the eye of the impeller and is flung out round the spiral casing.',
    fact: 'This one turns over a 25 m pool’s water every few hours, all day, every day.',
  },
  7: {
    how: 'A bigger impeller, a bigger motor: the same idea, scaled up.',
    fact: 'Its impeller is 315 mm across: the number in its name.',
  },
  8: {
    how: 'Water enters both sides of one impeller at once; the casing splits along the shaft, so the top lifts off for maintenance.',
    fact: 'This is the size of pump that keeps an Olympic pool moving: its whole 2,500 cubic metres through the filters every four hours.',
  },
};

/** The sponsor's slogans, a different groaner on each plaque (the owner, 2026-10-29). */
const SLOGANS = [
  'Grundflow: we’ve got your back-pressure.',
  'Grundflow: every drop counts. We counted.',
  'Grundflow: small strokes, big impression.',
  'Grundflow: we squeeze so you don’t have to.',
  'Grundflow: magnetically attracted to your business.',
  'Grundflow: we never lose our head.',
  'Grundflow: under pressure since 1952.',
  'Grundflow: splitting the difference since forever.',
];

/** A power in friendly units: watts below a kilowatt. */
export const powerText = (kW: number) =>
  kW < 1 ? `${Math.round(kW * 1000)} W` : `${kW.toLocaleString('en-GB')} kW`;

/** A flow in friendly units: l/h for the small, m³/h for the large. */
export const flowText = (m3h: number) =>
  m3h < 0.1
    ? `${(m3h * 1000).toLocaleString('en-GB', { maximumFractionDigits: 1 })} litres an hour`
    : `${m3h.toLocaleString('en-GB', { maximumFractionDigits: m3h < 10 ? 1 : 0 })} m³ an hour`;

const family = (p: HallPump) =>
  p.family === 'displacement' ? 'Positive displacement' : 'Centrifugal';

/** Each pump's plaque. */
export function pumpPlaque(no: PumpNo): Placard {
  const p = PUMPS[no - 1];
  const w = WORDS[no];
  return {
    station: no,
    of: pumpId(no),
    icon: 'pump',
    headline: fillSentence(no),
    title: `${no}. ${p.model} · ${TAGS[pumpId(no)]}`,
    body: `${family(p)}: ${p.kind}. ${w.how} In a pool: ${p.job}. ${powerText(p.kW)}; here it delivers ${flowText(deliveryAlone(no))}.`,
    fact: w.fact,
    tryIt: `Press RUN. ${SLOGANS[no - 1]}`,
  };
}

export const hall6Plaques = () => PUMPS.map((p) => pumpPlaque(p.no));

/** The hall's figures, from the model. */
export function hall6Facts() {
  const slowest = fillSeconds(1);
  const fastest = fillSeconds(8);
  return { ratio: slowest / fastest, slowest, fastest };
}

/** The entrance panel. */
export function hall6Entrance() {
  const k = hall6Facts();
  const ratio = Math.round(k.ratio / 10000) * 10000;
  return {
    title: 'Grundflow’s Amazing World of Pumps',
    subtitle: 'Hall 6: We Keep Water Moving',
    introduction: `A swimming pool needs pumps of every size, from one that pushes out a few drops a minute to one that could empty a swimming pool in an afternoon. Press any pump’s button and watch the tank. Each sign tells you how long that pump would take to fill it. The biggest pump here moves water about ${ratio.toLocaleString('en-GB')} times faster than the smallest. When the tank is full, the pumps stop: press RESET to empty it.`,
    route: PUMPS.map((p) => ({
      station: p.no,
      name: p.model.replace('Grundflow ', ''),
      what: p.kind,
    })),
    reset:
      'Can’t break it: the big red RESET SIMULATION button empties the tank and puts everything back to the start.',
  };
}

/** The two-families panel by the tank. */
export const FAMILIES = {
  headline: 'Two families of pump',
  displacement: {
    title: 'Positive displacement',
    body: 'Push a fixed amount each stroke or turn, almost whatever the pressure. That is why they dose: count the strokes, and you know how much went in. Pumps 1 to 4.',
  },
  centrifugal: {
    title: 'Centrifugal',
    body: 'A spinning impeller throws the water outward. How much flows depends on what it pushes against: its curve meets the system’s. Close a valve and the flow falls. Pumps 5 to 8.',
  },
} as const;
