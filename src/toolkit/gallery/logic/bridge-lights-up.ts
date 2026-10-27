/**
 * The bridge's entrance (the owner, 2026-10-27): the walker comes in from
 * the corridor to a dark bridge, only its controls and displays glowing;
 * after a few seconds its lights come up in turn, the coves round the
 * dome first, then the dome, the wall and rib coves, and the light strip
 * over the aft consoles, to its normal lighting. Presentation only: not
 * in the world, which still says whether its lighting way is lit; this
 * scales what that gives. Pure: seconds since the walker arrived in,
 * shares of each stage's normal light.
 */

/** The stages, in the order they come up. */
export const LIGHT_STAGES = ['rings', 'dome', 'walls', 'aft'] as const;
export type LightStage = (typeof LIGHT_STAGES)[number];

export const LIGHTS_UP = {
  /** Seconds of darkness after arriving. */
  dark: 2.5,
  /** Each stage's start after the darkness, and its rise, seconds. */
  starts: { rings: 0, dome: 0.6, walls: 1.2, aft: 1.7 } as Record<
    LightStage,
    number
  >,
  rise: 1.8,
  /** The share of the room's fill light left in the dark: enough to make out its shapes by the panels' glow. */
  floor: 0.04,
  /** Seconds the lights take to go out behind a walker leaving. */
  out: 2,
} as const;

/** How long, from arriving, until every stage is full. */
export const lightsUpTotal = () =>
  LIGHTS_UP.dark +
  Math.max(...LIGHT_STAGES.map((s) => LIGHTS_UP.starts[s])) +
  LIGHTS_UP.rise;

const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/** Each stage's share of its normal light `t` seconds after arriving, and the fill's (the room's general light: its share following the stages'). */
export function lightsUpLevels(t: number): Record<LightStage | 'fill', number> {
  const out = {} as Record<LightStage | 'fill', number>;
  for (const s of LIGHT_STAGES)
    out[s] = smooth(
      (t - LIGHTS_UP.dark - LIGHTS_UP.starts[s]) / LIGHTS_UP.rise,
    );
  const mean =
    LIGHT_STAGES.reduce((sum, s) => sum + out[s], 0) / LIGHT_STAGES.length;
  out.fill = LIGHTS_UP.floor + (1 - LIGHTS_UP.floor) * mean;
  return out;
}

/**
 * Whether an entry into the bridge plays the entrance: walked in from the
 * corridor, but not the page opened (or reloaded) on the bridge itself,
 * which only names where it was entered from.
 */
export function playsEntrance(
  from: string | null,
  openedHere: boolean,
): boolean {
  return from === 'main_corridor' && !openedHere;
}
