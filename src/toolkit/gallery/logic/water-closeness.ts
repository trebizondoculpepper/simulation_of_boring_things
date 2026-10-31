import { bandDistance, required } from '../../../game/plant/museum-4-challenge';
import type {
  ChallengeCard,
  Hall4Game,
  ReadingId,
} from '../../../game/plant/museum-4-challenge';
import { readWater, water } from '../../../game/plant/museum-4-lab';
import type { Hall4Readings } from '../../../game/plant/museum-4-lab';

/**
 * How close Hall 4's water is to balanced for the challenge being played
 * (mission 113): the scenario screen's closeness bar. Each reading the
 * level requires (`required(card, level)`) is measured by how far it lies
 * outside its band (`bandDistance`, 0 inside), divided by that reading's
 * scale below, so that one scale out of band counts the same whichever
 * reading it is; the required readings' scaled distances are summed. The
 * closeness is 1 − now ÷ start, against the card's starting water: 0 (or
 * near it) as the card is dealt, 1 only when every required reading is in
 * band, lower again when a dose makes things worse, clamped to 0..1. Free
 * play has no start and no targets, so it shows no bar (null). Pure.
 */

/**
 * One scale of each reading, in its own units: roughly the step a
 * typical corrective dose moves it, and about the width of its band's
 * nearer half, so pH 0.3 out, alkalinity 30 mg/l out and calcium hardness
 * 150 mg/l out each count as one.
 */
export const CLOSENESS_SCALE: Record<ReadingId, number> = {
  fc: 1, // mg/l: the whole width of the 1–2 band.
  cc: 0.5, // mg/l: half the 1.0 limit.
  ph: 0.3, // pH units: a little under the 7.2–7.6 band's width.
  ta: 30, // mg/l as CaCO₃: a usual alkalinity correction.
  ch: 150, // mg/l as CaCO₃: hardness moves slowly and spans a wide band.
  lsi: 0.3, // a third of the ±0.5 band's half-width again.
};

/** The closeness is shown, and redrawn, in steps of this fraction (2 %). */
export const CLOSENESS_STEP = 0.02;

/** The summed scaled distance of `ids` from their bands (0 when all in band). */
export function scaledDistance(
  r: Hall4Readings,
  ids: readonly ReadingId[],
): number {
  return ids.reduce(
    (sum, id) => sum + bandDistance(id, r) / CLOSENESS_SCALE[id],
    0,
  );
}

/**
 * Closeness 0..1 of `now` to balanced, relative to `start`, over `ids`;
 * floored to `CLOSENESS_STEP`, so it reads 1 only when every reading is in
 * band. A start already in band is measured against one scale.
 */
export function closeness(
  start: Hall4Readings,
  now: Hall4Readings,
  ids: readonly ReadingId[],
): number {
  const d = scaledDistance(now, ids);
  if (d === 0) return 1;
  const d0 = scaledDistance(start, ids);
  const raw = 1 - d / (d0 > 0 ? d0 : 1);
  const steps = Math.floor(
    Math.max(0, Math.min(1, raw)) / CLOSENESS_STEP + 1e-9,
  );
  return Math.min(
    Math.round(steps * CLOSENESS_STEP * 1e6) / 1e6,
    1 - CLOSENESS_STEP,
  );
}

const starts = new WeakMap<ChallengeCard, Hall4Readings>();
/** A card's starting readings, read once per card. */
export function startReadings(card: ChallengeCard): Hall4Readings {
  let r = starts.get(card);
  if (!r) starts.set(card, (r = readWater(card.water())));
  return r;
}

/** The game's closeness to balanced for its card and level, or null in free play. */
export function gameCloseness(g: Hall4Game): number | null {
  if (!g.card) return null;
  return closeness(
    startReadings(g.card),
    readWater(water(g.lab)),
    required(g.card, g.level),
  );
}
