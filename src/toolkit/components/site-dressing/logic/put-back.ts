/**
 * Things picked up to be looked at, and put back where they were or
 * thrown in a bin (the owner, 2026-10-31: the engineer's software boxes,
 * and the PC's empty carton beside the desk). Each has a home, its pose in
 * its own parent's frame when it was set out, and may rest on another (a
 * box on a pile, a box leaning on its neighbour). One is held at a time.
 * Nothing is left floating: a thing stays put while anything resting on
 * it is home or in the hands (to go back on top of it), and a thing whose
 * support is away cannot be put back, only binned. Put back, it goes to
 * its home exactly; binned, it takes the bin's next place, on top of what
 * is in it, and only the top one can be taken out again. The carrying
 * itself is the control scheme's (`controls/input/object-handling.ts`);
 * this is only whose turn it is and where each belongs. Not saved: a room
 * built afresh sets everything out again. Pure.
 */

/** A pose in a parent's frame: position, metres, and rotation as a quaternion (x, y, z, w). */
export interface Pose {
  readonly position: readonly [number, number, number];
  readonly quaternion: readonly [number, number, number, number];
}

/** Where a thing is: at home, in the hands, or in the bin. */
export type Whereabouts = 'home' | 'held' | 'binned';

export interface PutBack<K> {
  /** Set `key` out at `home`, resting on `restsOn` if anything. */
  home(key: K, home: Pose, restsOn?: K): void;
  /** Whether `key` is one of these things. */
  has(key: K): boolean;
  /** Where `key` is, or null if it is not one of these things. */
  where(key: K): Whereabouts | null;
  /** Whether `key` may be picked up now. */
  canPickUp(key: K): boolean;
  /** Pick `key` up, if it may be; whether it was. */
  pickUp(key: K): boolean;
  /** Whether the held `key` could be put back now (its support home), changing nothing. */
  canPutBack(key: K): boolean;
  /** Put the held `key` back: its home, or null if it is not the one held or its support is away. */
  putBack(key: K): Pose | null;
  /** Throw the held `key` in the bin: its place there (0 at the bottom), or null if it is not the one held. */
  bin(key: K): number | null;
  /** What is in the bin, bottom first. */
  binned(): readonly K[];
  /** What is held, if anything. */
  held(): K | null;
}

export function createPutBack<K>(): PutBack<K> {
  const homes = new Map<K, { pose: Pose; restsOn?: K }>();
  const inBin: K[] = [];
  let held: K | null = null;
  const where = (key: K): Whereabouts | null =>
    !homes.has(key)
      ? null
      : key === held
        ? 'held'
        : inBin.includes(key)
          ? 'binned'
          : 'home';
  const canPickUp = (key: K) => {
    if (held !== null) return false;
    const at = where(key);
    if (at === 'binned') return inBin[inBin.length - 1] === key;
    if (at !== 'home') return false;
    return ![...homes].some(
      ([other, { restsOn }]) => restsOn === key && where(other) === 'home',
    );
  };
  const canPutBack = (key: K) => {
    if (held === null || held !== key) return false;
    const { restsOn } = homes.get(key)!;
    return restsOn === undefined || where(restsOn) === 'home';
  };
  return {
    home(key, pose, restsOn) {
      homes.set(key, { pose, restsOn });
    },
    has: (key) => homes.has(key),
    where,
    canPickUp,
    pickUp(key) {
      if (!canPickUp(key)) return false;
      if (where(key) === 'binned') inBin.pop();
      held = key;
      return true;
    },
    canPutBack,
    putBack(key) {
      if (!canPutBack(key)) return null;
      held = null;
      return homes.get(key)!.pose;
    },
    bin(key) {
      if (held === null || held !== key) return null;
      held = null;
      inBin.push(key);
      return inBin.length - 1;
    },
    binned: () => inBin,
    held: () => held,
  };
}
