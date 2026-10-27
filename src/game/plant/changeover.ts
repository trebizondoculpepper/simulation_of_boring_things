import type { PlantServices } from './services';

/**
 * The mains/generator changeover switch (prompt 089, item 6; the owner,
 * 2026-10-27): a manual three-position changeover, I · 0 · II, after the
 * Socomec SIRCOVER and ABB OT…C, between the main incoming switch and the
 * LV main switchboard, with the loading bay's generator cable landing on
 * its II side. In I the switchboard is fed from the mains, in II from the
 * generator, in 0 from nothing. Its handle turns one position at a time,
 * through 0, so it breaks one supply before it makes the other: mains and
 * generator are never paralleled. Worked only on its own panel in the
 * switch room (a local control). Pure.
 */

/** Its handle's positions, in the order it turns: I (mains), 0 (off), II (generator). */
export const CHANGEOVER_POSITIONS = ['I', '0', 'II'] as const;
export type ChangeoverPosition = (typeof CHANGEOVER_POSITIONS)[number];

/** What feeds the switchboard. */
export type SwitchboardSource = 'mains' | 'generator';

/** Whether `value` is one of its positions (for a save). */
export const isChangeoverPosition = (
  value: unknown,
): value is ChangeoverPosition =>
  (CHANGEOVER_POSITIONS as readonly unknown[]).includes(value);

/** Its handle turned one position (`direction` −1 toward I, +1 toward II), stopping at its ends. */
export function turnChangeover(
  position: ChangeoverPosition,
  direction: number,
): ChangeoverPosition {
  const i = CHANGEOVER_POSITIONS.indexOf(position);
  const next = Math.max(
    0,
    Math.min(CHANGEOVER_POSITIONS.length - 1, i + Math.sign(direction)),
  );
  return CHANGEOVER_POSITIONS[next];
}

/**
 * Whether the mains is at the switch's I side: the main incoming switch
 * closed, with the supply company's supply behind it (the world's
 * `sources.power`, as the intake leaves it). Its MAINS AVAILABLE lamp.
 */
export const mainsAvailable = (plant: PlantServices): boolean =>
  plant.sources.power;

/**
 * Whether a generator is at the switch's II side, connected and running.
 * No hired generator is modelled yet (a later item, TODO), so never: in II
 * the switchboard is dead, and GENERATOR AVAILABLE unlit.
 */
export const generatorAvailable = (_plant: PlantServices): boolean => false;

/** What the switchboard is fed from now, if anything: one supply at most. */
export function switchboardSource(
  plant: PlantServices,
): SwitchboardSource | null {
  const position = plant.changeover ?? 'I';
  if (position === 'I') return mainsAvailable(plant) ? 'mains' : null;
  if (position === 'II') return generatorAvailable(plant) ? 'generator' : null;
  return null;
}

/** Whether the switchboard is live. */
export const switchboardLive = (plant: PlantServices): boolean =>
  switchboardSource(plant) !== null;

/** Its state in words, as its handle and lamps show it (inspection). */
export function changeoverStatus(plant: PlantServices): string {
  const position = plant.changeover ?? 'I';
  const where =
    position === 'I'
      ? 'I (mains)'
      : position === 'II'
        ? 'II (generator)'
        : '0 (off)';
  const lamps = [
    mainsAvailable(plant) ? 'MAINS AVAILABLE lit' : 'MAINS AVAILABLE unlit',
    generatorAvailable(plant)
      ? 'GENERATOR AVAILABLE lit'
      : 'GENERATOR AVAILABLE unlit',
  ];
  return `Handle at ${where}; ${lamps.join(', ')}`;
}
