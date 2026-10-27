/**
 * A dose bottle (the owner, 2026-10-27): an idealised, self-contained
 * chemical day tank for every size below the Olympic's 1,000 l, invented
 * for the game rather than copied from one product. A moulded HDPE bottle
 * with a powered head on its lid holding everything a small tank needs:
 * an ultrasonic sensor that reads its contents, high and low switches, its
 * own motorised dosing pump drawing through a lance, and a small display
 * showing its litres. Its fill comes in through the lid from a transfer
 * line, which the game keeps (real small tanks are topped up by hand; the
 * owner prefers networks of pipes for the player to work out). Pure.
 *
 * - It calls for chemical at its low switch (20%) and stops calling at its
 *   high switch (90%).
 * - Its pump runs while dosing is asked of it and it is not empty: it cuts
 *   out at 2%, as a lance's float would, so it never runs dry.
 * - Unpowered, it neither reads, calls nor pumps: its display is dark.
 */

export const BOTTLE = {
  low: 0.2,
  high: 0.9,
  /** The pump's dry-run cut-out, a share of full. */
  empty: 0.02,
} as const;

export interface DoseBottle {
  capacity: number;
  litres: number;
  /** Its low switch has called, and its high switch not yet stopped it. */
  calling: boolean;
  /** Its pump is running now. */
  pumping: boolean;
}

export function newDoseBottle(capacity: number, share = 0.7): DoseBottle {
  return {
    capacity,
    litres: capacity * share,
    calling: false,
    pumping: false,
  };
}

export const bottleLevel = (b: DoseBottle) => b.litres / b.capacity;

/** What its head shows: its reading, its switches' lamps, its pump. */
export function bottleReadout(b: DoseBottle, powered = true) {
  const level = bottleLevel(b);
  return {
    powered,
    litres: powered ? b.litres : null,
    level,
    high: powered && level >= BOTTLE.high,
    low: powered && level <= BOTTLE.low,
    calling: powered && b.calling,
    pumping: powered && b.pumping,
  };
}

/**
 * The bottle `dt` seconds on: `fillLpm` coming in through its lid,
 * `doseLpm` asked of its pump.
 */
export function stepDoseBottle(
  b: DoseBottle,
  { fillLpm = 0, doseLpm = 0, powered = true },
  dt: number,
): DoseBottle {
  const level = bottleLevel(b);
  let calling = b.calling;
  if (powered) {
    if (level >= BOTTLE.high) calling = false;
    else if (level <= BOTTLE.low) calling = true;
  }
  const pumping = powered && doseLpm > 0 && level > BOTTLE.empty;
  const litres =
    b.litres + (fillLpm * dt) / 60 - (pumping ? (doseLpm * dt) / 60 : 0);
  return {
    ...b,
    calling: powered && calling,
    pumping,
    litres: Math.min(b.capacity, Math.max(0, litres)),
  };
}

/** A bottle's body for its size, metres: a cylinder about 1.4 times as tall as it is wide. */
export function bottleSize(litres: number) {
  const d = Math.cbrt((4 * (litres / 1000)) / (1.4 * Math.PI));
  return { d, h: 1.4 * d };
}

/** Below this size a day tank is a dose bottle; at it and above, a framed tank. */
export const BOTTLE_MAX_LITRES = 1000;
export const isDoseBottle = (litres: number) => litres < BOTTLE_MAX_LITRES;

/** Its spill pallet, metres: a square sump holding 110% of it under a grid deck. */
export function bottleBund(litres: number) {
  const side = bottleSize(litres).d + 0.2;
  return { side, sump: (1.1 * litres) / 1000 / (side * side) };
}

/**
 * What its head's 16 × 2 character LCD shows: its tag and its litres on
 * the first line; on the second a bar of ten blocks, one a tenth full,
 * dashes for the rest, and its percentage. Blank unpowered.
 */
export function bottleLcd(tag: string, b: DoseBottle, powered = true) {
  if (!powered) return { lines: [] as string[], on: false };
  const level = Math.max(0, Math.min(1, bottleLevel(b)));
  const litres = b.litres.toFixed(b.capacity < 100 ? 1 : 0);
  const first = `${tag.slice(0, 8).padEnd(8)}${`${litres} L`.padStart(8)}`;
  const blocks = Math.round(level * 10);
  const second = `${'█'.repeat(blocks)}${'-'.repeat(10 - blocks)} ${`${Math.round(level * 100)}`.padStart(3)}%`;
  return { lines: [first, second], on: true };
}
