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
    how: 'A spinning impeller throws water outward; a magnet turns it through a solid wall.',
    fact: 'No shaft seal: the chemical cannot leak out along the shaft.',
  },
  2: {
    how: 'Water enters both sides of one impeller at once; the casing splits along the shaft, so the top lifts off for maintenance.',
    fact: 'This is the size of pump that keeps an Olympic pool moving: its whole 2,500 cubic metres through the filters every four hours.',
  },
};

/** The sponsor's slogans, a different groaner on each plaque (the owner, 2026-10-29). */
const SLOGANS = [
  'Grundflow: magnetically attracted to your business.',
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
  const fastest = fillSeconds(2);
  return { ratio: slowest / fastest, slowest, fastest };
}

/** The entrance panel. */
export function hall6Entrance() {
  const k = hall6Facts();
  // To two figures: about 100.
  const ratio = Number(k.ratio.toPrecision(2));
  return {
    title: 'Grundflow’s Amazing World of Pumps',
    subtitle: 'Hall 6: We Keep Water Moving',
    introduction: `A swimming pool needs pumps of every size, from a small one that moves its chemicals to one that could empty a swimming pool in an afternoon. Press either pump’s button and watch the tank. Each sign tells you how long that pump would take to fill it. The big one moves water about ${ratio.toLocaleString('en-GB')} times faster than the small one. When the tank is full, the pumps stop: press RESET to empty it.`,
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
    body: 'Push a fixed amount each stroke or turn, almost whatever the pressure. That is why they dose: count the strokes, and you know how much went in. Find them at work in the plant rooms.',
  },
  centrifugal: {
    title: 'Centrifugal',
    body: 'A spinning impeller throws the water outward. How much flows depends on what it pushes against: its curve meets the system’s. Close a valve and the flow falls. Both pumps here.',
  },
} as const;
