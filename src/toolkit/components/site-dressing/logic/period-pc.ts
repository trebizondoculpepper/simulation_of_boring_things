/**
 * The engineer's late-1990s desktop PC (a Gateway 3000, `views/period-pc.ts`):
 * what its screen shows and when. It is set decoration with a little life:
 * its power button turns it on and off, a touch on its keyboard or mouse
 * wakes it from its screensaver, and left alone it drifts back into the
 * screensaver. Pure logic; the view draws whatever `pcFrame` says.
 *
 * Booting is a hook: while `screen` is `'booting'` the view draws its
 * boot screen for `PC_BOOT.seconds`. The game's boot sequences
 * (`core/logic/boot-sequence.ts`, its `'gui'` family) can be handed to the
 * view later as that screen, and its length to `stepPc` as `bootSeconds`,
 * without changing anything here.
 */

/**
 * The PC's maker. The owner's choice (2026-10-31): "Gateway 3000", an
 * unmistakable homage to the Gateway 2000 of the 1990s, its Holstein
 * cow-spot cartons and badges, on a period beige case. Its logo is our own
 * drawing (`views/period-pc.ts`), not Gateway's artwork.
 */
export const PC_MAKER = {
  name: 'Gateway 3000',
  model: 'P5-166 Family PC',
  /** The beige of its case, monitor and keyboard. */
  beige: '#d9d0b8',
} as const;

/** One blotch of a Holstein's coat, as fractions of the surface it is on. */
export interface CowSpot {
  x: number;
  y: number;
  /** Its radius, a fraction of the surface's shorter side. */
  r: number;
  /** Its outline's wobble: the radius at each of its lobes' angles, as multiples of `r`. */
  lobes: number[];
}

/** A small seeded generator: the same numbers for the same seed. */
export function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0;
    s = (s ^ (s >>> 13)) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Black blotches for a white surface: `count` of them, scattered evenly
 * enough that no stretch is bare and none crowds another, each an
 * irregular lobed blob, as on a Holstein (and a Gateway carton).
 */
export function cowSpots(seed: number, count: number): CowSpot[] {
  const rand = seeded(seed);
  const cols = Math.max(1, Math.round(Math.sqrt(count)));
  const rows = Math.ceil(count / cols);
  return Array.from({ length: count }, (_, i) => {
    const x = ((i % cols) + 0.15 + rand() * 0.7) / cols;
    const y = (Math.floor(i / cols) + 0.15 + rand() * 0.7) / rows;
    const lobes = Array.from({ length: 11 }, () => 0.5 + rand() * 0.85);
    return { x, y, r: (0.3 + rand() * 0.22) / cols, lobes };
  });
}

/** What the screen shows. */
export type PcScreen = 'off' | 'booting' | 'desktop' | 'screensaver';

export interface PcState {
  /** Whether the tower's power is on. */
  power: boolean;
  screen: PcScreen;
  /** Seconds in this screen. */
  since: number;
  /** Seconds since anyone touched the keyboard or mouse. */
  idle: number;
}

/** The boot's family, for the boot sequences when they come, and its default length. */
export const PC_BOOT = { family: 'gui', seconds: 9 } as const;
/** Seconds untouched before the screensaver starts. */
export const SCREENSAVER_AFTER = 120;
/** The screensaver's frames a second: a CRT animation kept to a slow, cheap step. */
export const SCREENSAVER_HZ = 4;
/** The boot screen's frames a second, for its counting memory and its dots. */
export const BOOT_HZ = 4;

/** As the engineer just left it: on, the bookings open; the screensaver comes on if it is left alone. */
export const newPc = (): PcState => ({
  power: true,
  screen: 'desktop',
  since: 0,
  idle: 0,
});

/** `delta` seconds on. */
export function stepPc(
  pc: PcState,
  delta: number,
  bootSeconds: number = PC_BOOT.seconds,
): PcState {
  if (!pc.power) return { ...pc, screen: 'off', since: pc.since + delta };
  const since = pc.since + delta;
  const idle = pc.idle + delta;
  if (pc.screen === 'booting' && since >= bootSeconds)
    return { ...pc, screen: 'desktop', since: 0, idle: 0 };
  if (pc.screen === 'desktop' && idle >= SCREENSAVER_AFTER)
    return { ...pc, screen: 'screensaver', since: 0, idle };
  return { ...pc, since, idle };
}

/** The power button: on, it boots; off, the screen goes dark. */
export const pressPower = (pc: PcState): PcState =>
  pc.power
    ? { power: false, screen: 'off', since: 0, idle: 0 }
    : { power: true, screen: 'booting', since: 0, idle: 0 };

/** A touch on the keyboard or mouse: wakes the screensaver, and keeps it awake. */
export const touchPc = (pc: PcState): PcState =>
  !pc.power
    ? pc
    : pc.screen === 'screensaver'
      ? { ...pc, screen: 'desktop', since: 0, idle: 0 }
      : { ...pc, idle: 0 };

/** Whether the hard disc's lamp is lit: busy through the boot, now and then otherwise. */
export function diskBusy(pc: PcState): boolean {
  if (!pc.power) return false;
  if (pc.screen === 'booting') return Math.floor(pc.since * 7) % 3 !== 0;
  // A brief flicker every half minute or so: the swap file.
  return pc.since % 31 < 0.4;
}

/**
 * What the screen must show, as a key that changes only when the picture
 * does: the screen, and its step (the screensaver's frame, the boot's
 * quarter second, the desktop clock's minute from `clockMinutes`).
 */
export function pcFrame(
  pc: PcState,
  clockMinutes: number,
): { screen: PcScreen; step: number; key: string } {
  const step =
    pc.screen === 'screensaver'
      ? Math.floor(pc.since * SCREENSAVER_HZ)
      : pc.screen === 'booting'
        ? Math.floor(pc.since * BOOT_HZ)
        : pc.screen === 'desktop'
          ? Math.floor(clockMinutes)
          : 0;
  return { screen: pc.screen, step, key: `${pc.screen}:${step}` };
}

/** The taskbar clock, `HH:MM`, from minutes since midnight. */
export const clockText = (minutes: number) => {
  const m = ((Math.floor(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/**
 * The screensaver's rubber ducks, drifting and bouncing off the screen's
 * edges: each duck's place, as fractions of the screen, at frame `step`.
 * Deterministic, so a frame is drawn the same whenever it is drawn.
 */
export function duckPositions(
  step: number,
  count = 5,
): { x: number; y: number; flip: boolean }[] {
  const bounce = (t: number) => {
    const u = ((t % 2) + 2) % 2;
    return u < 1 ? u : 2 - u;
  };
  return Array.from({ length: count }, (_, i) => {
    const vx = 0.011 + 0.004 * ((i * 7) % 5);
    const vy = 0.008 + 0.003 * ((i * 3) % 4);
    const tx = step * vx + i * 0.37;
    const ty = step * vy + i * 0.61;
    return {
      x: bounce(tx),
      y: bounce(ty),
      flip: ((Math.floor(tx) % 2) + 2) % 2 === 1,
    };
  });
}
