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
import { BOOT_TIMING, bootDuration } from '../../../ui2d/boot';
import type { BootTiming } from '../../../ui2d/boot';

/** The stages, in the order they come up. */
export const LIGHT_STAGES = ['rings', 'dome', 'walls', 'aft'] as const;
export type LightStage = (typeof LIGHT_STAGES)[number];

export const LIGHTS_UP = {
  /** Seconds of darkness (the displays booting, the under-console glow coming up in it) before the main lights. */
  /** The last display booted (`entranceInterfaces().to`, 9.85 s) and two seconds more (the owner, 2026-10-27). */
  dark: 11.85,
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
 * The under-console glow in the entrance (the owner, 2026-10-27:
 * displays only, then the glow under the consoles, then the main
 * lights): it comes up `at` seconds after arriving over `rise`, before
 * the main lights at `LIGHTS_UP.dark`, and, once they are full, fades
 * over `fade` (unless EMERGENCY LIGHTS keeps it lit, which the world
 * says, not this).
 */
// The owner (2026-10-27): the bridge is first found under its emergency
// lights alone, the glow under the consoles: lit from the start.
export const ENTRANCE_GLOW = { at: -1, rise: 0.5, fade: 1.5 } as const;

/**
 * The displays booting in the entrance (the owner, 2026-10-27): black as
 * the walker comes in, the emblems appearing in a scattered wave from
 * `first` over `spread` seconds, each shown `emblem` seconds, then the
 * interfaces drawing in, as the under-console glow comes up and before
 * the main lights (`ui2d/boot.ts`).
 */
// The owner's timings (2026-10-27): the start delay about 2.7 s on
// average (2.2 to 3.2 s), the emblem about 5 s.
export const ENTRANCE_BOOT = { first: 2.2, spread: 1.0, emblem: 5.0 } as const;

/** The displays' boot timing in the entrance. */
export const entranceBootTiming = (): BootTiming => ({
  ...BOOT_TIMING,
  emblem: ENTRANCE_BOOT.emblem,
});

/** Seconds after arriving that the displays' interfaces begin, and finish, drawing in (the earliest's start, the latest's end). */
export function entranceInterfaces() {
  const t = entranceBootTiming();
  const before = t.emblem + t.fade + t.gap;
  return {
    from: ENTRANCE_BOOT.first + before,
    to: ENTRANCE_BOOT.first + ENTRANCE_BOOT.spread + bootDuration(t),
  };
}

/** The entrance's own share of the under-console glow `t` seconds after arriving. */
export function entranceGlow(t: number): number {
  const up = smooth((t - ENTRANCE_GLOW.at) / ENTRANCE_GLOW.rise);
  const down = 1 - smooth((t - lightsUpTotal()) / ENTRANCE_GLOW.fade);
  return Math.min(up, down);
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
