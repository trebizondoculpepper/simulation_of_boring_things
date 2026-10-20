/**
 * The quality of a building's mains supply, as a fraction of its nominal
 * voltage (230 V in a British building), over time. A big machine on the
 * same supply pulls it down: each start of a motor draws several times its
 * running current and dips the voltage for a fraction of a second, and a
 * machine run hard for long sags it and makes it wander (a brownout). A
 * machine failing catastrophically swings it wildly, with drop-outs and
 * surges. Pure and deterministic: the same condition and time always give
 * the same voltage, so it can be stepped at any frame rate.
 */

export type SupplyCondition = 'normal' | 'brownout' | 'severe';
/** The conditions in the order a test selector steps them. */
export const SUPPLY_CONDITIONS: readonly SupplyCondition[] = [
  'normal',
  'brownout',
  'severe',
];

/** A repeatable pseudo-random number in [0, 1) for an integer and a salt. */
function hash(n: number, salt: number) {
  let h = Math.imul(n ^ Math.imul(salt, 0x9e3779b1), 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Smooth value noise in [-1, 1]. */
function noise(t: number, salt: number) {
  const i = Math.floor(t);
  const f = t - i;
  const s = f * f * (3 - 2 * f);
  const a = hash(i, salt) * 2 - 1;
  const b = hash(i + 1, salt) * 2 - 1;
  return a + (b - a) * s;
}

/**
 * Events in slots of `every` seconds, each happening with chance `chance`
 * at a random moment in its slot: how far into the latest event `t` is,
 * seconds, or Infinity if none has begun in this slot or the last.
 */
function sinceEvent(t: number, every: number, chance: number, salt: number) {
  const slot = Math.floor(t / every);
  let since = Infinity;
  for (const s of [slot - 1, slot]) {
    if (hash(s, salt) >= chance) continue;
    const at = (s + hash(s, salt + 1) * 0.8) * every;
    if (t >= at) since = Math.min(since, t - at);
  }
  return since;
}

/**
 * The supply's voltage at time `t` seconds, a fraction of nominal.
 *
 * - normal: steady, within a fraction of a percent.
 * - brownout: sagging to about 80 % and wandering slowly, with a flutter,
 *   and every few seconds a motor start's dip, sharp and recovering over
 *   half a second.
 * - severe: swinging between about 40 % and 105 %, quickly, with brief
 *   drop-outs almost to nothing.
 */
export function supplyVoltage(condition: SupplyCondition, t: number) {
  switch (condition) {
    case 'normal':
      return 1 + 0.003 * noise(t * 0.7, 1);
    case 'brownout': {
      const since = sinceEvent(t, 4, 0.7, 2);
      const dip = since < 0.6 ? 0.14 * Math.exp(-since / 0.15) : 0;
      return (
        0.8 +
        0.035 * noise(t * 0.45, 3) +
        0.025 * noise(t * 2.3, 4) +
        0.025 * noise(t * 7, 5) -
        dip
      );
    }
    case 'severe': {
      const since = sinceEvent(t, 0.9, 0.35, 6);
      const drop = since < 0.25 ? 0.4 : 0;
      return Math.max(
        0.05,
        0.7 +
          0.2 * noise(t * 1.3, 7) +
          0.12 * noise(t * 6.1, 8) +
          0.06 * noise(t * 14, 9) -
          drop,
      );
    }
  }
}
