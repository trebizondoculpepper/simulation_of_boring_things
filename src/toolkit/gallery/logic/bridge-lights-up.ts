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

/** The stages of the main lights: the dome last (the owner, 2026-10-27). */
export const LIGHT_STAGES = ['rings', 'dome', 'walls', 'aft'] as const;
export type LightStage = (typeof LIGHT_STAGES)[number];

export const LIGHTS_UP = {
  /** On the first view, the main lights begin this long after the last display is operational: a beat with every screen glowing in the dark (the owner, 2026-10-27). */
  afterBoot: 2,
  /** On a later visit, the main lights begin this long after the walker comes in (the owner, 2026-10-27). */
  again: 2,
  /** Each luminaire's or segment's rise, seconds. */
  rise: 1.8,
  /** The share of the room's fill light left in the dark: enough to make out its shapes by the panels' glow. */
  floor: 0.04,
  /** Seconds the lights take to go out behind a walker leaving. */
  out: 2,
} as const;

/**
 * The main lights' sweep (the owner, 2026-10-27): every luminaire and
 * lit segment but the dome's (the cove rings' arcs, the wall coves, the
 * ribs' strips, the aft strip, their lamps) powers on in turn, clockwise
 * seen from above, starting at the front over the main viewscreen,
 * `step` seconds apart; the dome `domeAfter` seconds after the last of
 * them has started. `segments`: the arcs each cove ring is split into.
 */
export const SWEEP = { step: 0.2, domeAfter: 5, segments: 8 } as const;

/** The sweep's span with about this many luminaires and segments, for timing it before the room is seen. */
export const NOMINAL_SWEEP_COUNT = 40;

/**
 * Where a point is round `centre`, radians in [0, 2π), clockwise seen from
 * above: 0 at the front (−z, the main viewscreen's side), π/2 at +x.
 */
export function clockwiseAngle(
  x: number,
  z: number,
  cx: number,
  cz: number,
): number {
  const a = Math.atan2(x - cx, -(z - cz));
  return a < 0 ? a + 2 * Math.PI : a;
}

/** One luminaire or segment: where it is round the room, and whether it is the dome's. */
export interface SweepItem {
  angle: number;
  dome: boolean;
}

/**
 * Each item's start, seconds after the main lights begin: the others
 * ranked clockwise (`angle`), `SWEEP.step` apart; the dome's all at
 * `SWEEP.domeAfter` after the last of the others started. Pure.
 */
export function sweepStarts(items: readonly SweepItem[]): number[] {
  const others = items
    .map((it, i) => ({ it, i }))
    .filter(({ it }) => !it.dome)
    .sort((a, b) => a.it.angle - b.it.angle);
  const starts = new Array<number>(items.length).fill(0);
  others.forEach(({ i }, rank) => (starts[i] = rank * SWEEP.step));
  const last = others.length ? (others.length - 1) * SWEEP.step : 0;
  items.forEach((it, i) => {
    if (it.dome) starts[i] = last + SWEEP.domeAfter;
  });
  return starts;
}

/** The latest start of a sweep: when its last item begins. */
export const sweepSpan = (starts: readonly number[]) =>
  starts.length ? Math.max(...starts) : 0;

/** The span of a sweep of `n` items besides the dome. */
export const nominalSpan = (n = NOMINAL_SWEEP_COUNT) =>
  Math.max(0, n - 1) * SWEEP.step + SWEEP.domeAfter;

/** How long, from arriving, until every light is full, the main lights beginning at `at` and their sweep's last start `span` after. */
export const lightsUpTotal = (at = 0, span = nominalSpan()) =>
  at + span + LIGHTS_UP.rise;

const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/** An item's share of its normal light `t` seconds after arriving, the main lights beginning at `at` and it `start` after them. */
export const sweepLevel = (t: number, at: number, start: number) =>
  smooth((t - at - start) / LIGHTS_UP.rise);

/** The room's fill light's share, following the items' mean (`levels`). */
export function fillLevel(levels: readonly number[]): number {
  const mean = levels.length
    ? levels.reduce((a, b) => a + b, 0) / levels.length
    : 0;
  return LIGHTS_UP.floor + (1 - LIGHTS_UP.floor) * mean;
}

/** On the first view, the bridge's displays are switched on (`bridgeDisplaysOn`) this long after the doors shut (the owner, 2026-10-27). */
export const DISPLAYS_ON_AT = 2;

/**
 * Each display's boot as its power rises (the owner, 2026-10-27,
 * `doc/notes/bridge_reveal.md`): on its own durations drawn afresh (mean,
 * standard deviation): black (4, 0.6), the emblem (7, 2) its 0.3 s
 * fade-in included, black again (2, 0.5) the emblem's 0.5 s fade
 * included, then its interface drawn in over 1 s (`ui2d/boot.ts`).
 */
export const ENTRANCE_BOOT: BootSpec = {
  black: { mean: 4, sd: 0.6 },
  emblem: { mean: 7, sd: 2, min: 0.5 },
  after: { mean: 2, sd: 0.5, min: 0.5 },
};

/** The first view's displays operational, on average, seconds after the doors shut. */
export const entranceBootMean = () =>
  DISPLAYS_ON_AT + meanBootReady(ENTRANCE_BOOT);

/**
 * The emergency glow under the consoles in an entrance (the owner,
 * 2026-10-27). On the first view it is on as the walker comes in, fades
 * to black over `out`, stays black for `black` and fades back up over
 * `back`; on a later visit it is simply on. Either way, once the main
 * lights are full it fades over `fade` (unless EMERGENCY LIGHTS keeps it
 * lit, which the world says, not this).
 */
export const ENTRANCE_GLOW = { out: 1, black: 5, back: 1, fade: 1.5 } as const;

/**
 * The first view begins as the corridor doors shut behind the walker (the
 * owner, 2026-10-27: "I want the user to walk into a mysterious space for
 * a bit"); until then the room stays as seen from outside. Its trigger:
 * waiting until the doors, once seen open (as the walker comes through
 * them), are shut; if they are never seen open (handed over already
 * shut), any shut after `assumeOpenAfter` seconds. Pure.
 */
export const REVEAL_DOORS = { assumeOpenAfter: 2 } as const;

export interface RevealTrigger {
  /** The doors seen open since the walker came in. */
  seenOpen: boolean;
  /** Seconds since the walker came in. */
  waited: number;
  /** The doors have shut behind the walker: the first view's t = 0. */
  started: boolean;
}

/** The trigger as the walker comes in. */
export const revealWaiting = (): RevealTrigger => ({
  seenOpen: false,
  waited: 0,
  started: false,
});

/** The trigger `delta` seconds on, the doors `shut` (fully closed) or not. Once started, it stays so. */
export function stepReveal(
  s: RevealTrigger,
  delta: number,
  shut: boolean,
): RevealTrigger {
  if (s.started) return s;
  const waited = s.waited + delta;
  const seenOpen = s.seenOpen || !shut;
  return {
    seenOpen,
    waited,
    started: shut && (seenOpen || waited >= REVEAL_DOORS.assumeOpenAfter),
  };
}

/**
 * Whether the bridge being suspended puts its displays on (the owner,
 * 2026-10-27: leaving, the monitors stay on): only when the walker was
 * inside and the first view had begun. Not when it is merely drawn
 * beyond the corridor's doors (suspended without ever being entered: so
 * after RESET they stay black), nor when the walker left before the doors
 * shut behind them (still the first view).
 */
export function displaysOnLeaving(
  wasInside: boolean,
  heldFirstView: boolean,
): boolean {
  return wasInside && !heldFirstView;
}

/** The first view's theme begins as the room goes wholly black, the glow faded out, `THEME_AT` seconds after the doors shut (the owner, 2026-10-27). */
export const THEME_AT = ENTRANCE_GLOW.out;

/** How the walker came in: the first view (the reveal), a later visit, or neither (`null`). */
export type EntranceKind = 'first' | 'again';

export interface Entrance {
  kind: EntranceKind;
  /** Seconds after arriving that the main lights begin. */
  lightsAt: number;
  /** Their sweep's last start after `lightsAt`, once the room's lights are known (`nominalSpan` until then). */
  span?: number;
}

/** The first view's glow curve `t` seconds after the doors shut behind the walker: on, out over 1 s, black 5 s, back up over 1 s. */
export function firstViewGlow(t: number): number {
  const g = ENTRANCE_GLOW;
  if (t < g.out) return 1 - smooth(t / g.out);
  return smooth((t - g.out - g.black) / g.back);
}

/** The entrance's own share of the under-console glow `t` seconds after arriving. */
export function entranceGlow(t: number, entrance: Entrance): number {
  const base = entrance.kind === 'first' ? firstViewGlow(t) : 1;
  const down =
    1 -
    smooth(
      (t - lightsUpTotal(entrance.lightsAt, entrance.span)) /
        ENTRANCE_GLOW.fade,
    );
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
 * corridor, or out of the freight lift at floor 3 (mission 108; the owner,
 * 2026-10-29: the lift gives the bridge's arrival as the doors do, its
 * first visit the first view), but not the page opened (or reloaded) on
 * the bridge itself, which only names where it was entered from.
 */
export function playsEntrance(
  from: string | null,
  openedHere: boolean,
): boolean {
  return (from === 'main_corridor' || from === 'freight_lift') && !openedHere;
}
