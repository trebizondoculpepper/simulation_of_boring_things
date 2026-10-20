/**
 * How damaged an illuminated push button's lens is, in steps from perfect
 * to gone: each step keeps the damage of the one before and adds to it, so
 * a lens can be made worse a step at a time (by a blast, say) and its
 * cracks grow from where they were. Drawn by `src/toolkit/components/core/views/lens-damage.ts`.
 */
export const LENS_DAMAGE = [
  /** As made: clear and glossy. */
  'intact',
  /** Fine scratches and a dull patch, from hands and cleaning. */
  'scuffed',
  /** Struck once: a starred impact, its cracks running part way. */
  'cracked',
  /** Cracks right across to the bezel, joined by rings: a spider's web. */
  'crazed',
  /** As crazed, with a piece broken out of the edge. */
  'chipped',
  /** Most of it gone: the lamp behind shows, shards round the bezel. */
  'shattered',
] as const;
export type LensDamage = (typeof LENS_DAMAGE)[number];

/** How far along the scale `damage` is: 0 intact, upwards. */
export const lensDamageLevel = (damage: LensDamage) =>
  LENS_DAMAGE.indexOf(damage);

/**
 * `damage` made worse by `steps` (default one), never past shattered, never
 * better: a lens does not mend itself.
 */
export function worsenLens(damage: LensDamage, steps = 1): LensDamage {
  const level = lensDamageLevel(damage) + Math.max(0, Math.round(steps));
  return LENS_DAMAGE[Math.min(LENS_DAMAGE.length - 1, level)];
}
