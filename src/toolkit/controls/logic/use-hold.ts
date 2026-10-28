/**
 * Press-and-hold for a use (prompt 091; the owner, 2026-10-28: "Let's
 * test it out and see if it works"): the click, E, A, a touch held still
 * or the touch Use button that uses whatever is aimed at is also a held
 * input, held until the button, key or finger that gave it is let go. A
 * component that wants to know (a terminal's cursor keys repeating while
 * held) asks for the use's hold as it is used (`input/use-holding.ts`)
 * and watches `held`; every other component sees the one use, as before.
 * Pure: no DOM.
 */

/** What gave a use: each has at most one hold at a time. */
export type HoldSource = 'mouse' | 'key' | 'pad' | 'hud' | 'touch';

/** A use's hold: held until its source is let go. */
export interface UseHold {
  readonly source: HoldSource | null;
  readonly held: boolean;
}

/** The hold of a use that is over as it happens (a tap lifted, a script's use). */
export const RELEASED: UseHold = Object.freeze({ source: null, held: false });

/**
 * How long a touch (or a free mouse, where dragging looks) must stay still
 * before it counts as a held use rather than a tap or the start of a drag,
 * seconds. A tap shorter than this uses as it lifts, as before.
 */
export const TOUCH_HOLD_DELAY = 0.45;

/** The holds now live, one per source. */
export function createUseHolds() {
  const live = new Map<HoldSource, { source: HoldSource; held: boolean }>();
  const release = (source: HoldSource) => {
    const h = live.get(source);
    if (h) h.held = false;
    live.delete(source);
  };
  return {
    /** A use begins, held, from `source` (any earlier hold of it let go). */
    press(source: HoldSource): UseHold {
      release(source);
      const h = { source, held: true };
      live.set(source, h);
      return h;
    },
    /** `source` let go: its hold ends. */
    release,
    /** Everything let go (the window lost focus, a menu opened). */
    releaseAll() {
      for (const source of [...live.keys()]) release(source);
    },
    /** Whether `source` is holding a use now. */
    holding: (source: HoldSource) => live.get(source)?.held ?? false,
  };
}
