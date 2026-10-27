/**
 * The bridge's entrance (the owner, 2026-10-27, `doc/notes/bridge_reveal.md`):
 * the walker comes in from the corridor; on the first view to a bridge
 * under its emergency glow alone, which goes out, the displays booting in
 * the dark, the glow coming back; then its lights come up in turn, the coves round the
 * dome first, then the dome, the wall and rib coves, and the light strip
 * over the aft consoles, to its normal lighting. Presentation only: not
 * in the world, which still says whether its lighting way is lit; this
 * scales what that gives. Pure: seconds since the walker arrived in,
 * shares of each stage's normal light.
 */
import { meanBootReady } from '../../../ui2d/boot';
import type { BootSpec } from '../../../ui2d/boot';

/** The stages, in the order they come up. */
export const LIGHT_STAGES = ['rings', 'dome', 'walls', 'aft'] as const;
export type LightStage = (typeof LIGHT_STAGES)[number];

export const LIGHTS_UP = {
  /** On the first view, the main lights begin this long after the last display is operational: a beat with every screen glowing in the dark (the owner, 2026-10-27). */
  afterBoot: 2,
  /** On a later visit, the main lights begin this long after the walker comes in (the owner, 2026-10-27). */
  again: 2,
  /** Each stage's start after the main lights begin, and its rise, seconds. */
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

/** How long, from arriving, until every stage is full, the main lights beginning at `at`. */
export const lightsUpTotal = (at = 0) =>
  at +
  Math.max(...LIGHT_STAGES.map((s) => LIGHTS_UP.starts[s])) +
  LIGHTS_UP.rise;

const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/** Each stage's share of its normal light `t` seconds after arriving, the main lights beginning at `at` (the rings then, the others after), and the fill's (the room's general light: its share following the stages'). */
export function lightsUpLevels(
  t: number,
  at = 0,
): Record<LightStage | 'fill', number> {
  const out = {} as Record<LightStage | 'fill', number>;
  for (const s of LIGHT_STAGES)
    out[s] = smooth((t - at - LIGHTS_UP.starts[s]) / LIGHTS_UP.rise);
  const mean =
    LIGHT_STAGES.reduce((sum, s) => sum + out[s], 0) / LIGHT_STAGES.length;
  out.fill = LIGHTS_UP.floor + (1 - LIGHTS_UP.floor) * mean;
  return out;
}

/**
 * The displays booting on the first view (the owner, 2026-10-27,
 * `doc/notes/bridge_reveal.md`): black as the walker comes in; from
 * `from` seconds each display, on its own durations drawn afresh (mean,
 * standard deviation): black (4, 0.6), the emblem (7, 2) its 0.3 s
 * fade-in included, black again (2, 0.5) the emblem's 0.5 s fade
 * included, then its interface drawn in over 1 s (`ui2d/boot.ts`).
 */
export const ENTRANCE_BOOT: BootSpec = {
  from: 2,
  black: { mean: 4, sd: 0.6 },
  emblem: { mean: 7, sd: 2, min: 0.5 },
  after: { mean: 2, sd: 0.5, min: 0.5 },
};

/** The first view's displays operational, on average, seconds after arriving. */
export const entranceBootMean = () => meanBootReady(ENTRANCE_BOOT);

/**
 * The emergency glow under the consoles in an entrance (the owner,
 * 2026-10-27). On the first view it is on as the walker comes in, fades
 * to black over `out`, stays black for `black` and fades back up over
 * `back`; on a later visit it is simply on. Either way, once the main
 * lights are full it fades over `fade` (unless EMERGENCY LIGHTS keeps it
 * lit, which the world says, not this).
 */
export const ENTRANCE_GLOW = { out: 1, black: 4, back: 1, fade: 1.5 } as const;

/** The first view's theme begins as the room goes wholly black: the glow faded out (the owner, 2026-10-27). */
export const THEME_AT = ENTRANCE_GLOW.out;

/** How the walker came in: the first view (the reveal), a later visit, or neither (`null`). */
export type EntranceKind = 'first' | 'again';

export interface Entrance {
  kind: EntranceKind;
  /** Seconds after arriving that the main lights begin. */
  lightsAt: number;
}

/** The first view's glow curve `t` seconds after the threshold: on, out over 1 s, black 4 s, back up over 1 s. */
export function firstViewGlow(t: number): number {
  const g = ENTRANCE_GLOW;
  if (t < g.out) return 1 - smooth(t / g.out);
  return smooth((t - g.out - g.black) / g.back);
}

/** The entrance's own share of the under-console glow `t` seconds after arriving. */
export function entranceGlow(t: number, entrance: Entrance): number {
  const base = entrance.kind === 'first' ? firstViewGlow(t) : 1;
  const down =
    1 - smooth((t - lightsUpTotal(entrance.lightsAt)) / ENTRANCE_GLOW.fade);
  return Math.min(base, down);
}

/**
 * Which entrance an entry plays: walked in from the corridor (and not the
 * page opened on the bridge, `playsEntrance`), the first view while the
 * theme has not been heard (a first visit, or after RESET), a later visit
 * otherwise; any other way in, none.
 */
export function entranceKind(
  from: string | null,
  openedHere: boolean,
  themeHeard: boolean,
): EntranceKind | null {
  if (!playsEntrance(from, openedHere)) return null;
  return themeHeard ? 'again' : 'first';
}

/** When the main lights begin: on the first view `afterBoot` after the last display is operational (`ready`), on a later visit at `again`. */
export function entranceLightsAt(kind: EntranceKind, ready: number): number {
  return kind === 'first' ? ready + LIGHTS_UP.afterBoot : LIGHTS_UP.again;
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
