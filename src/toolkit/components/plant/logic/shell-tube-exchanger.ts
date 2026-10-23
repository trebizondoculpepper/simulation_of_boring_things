/**
 * A shell-and-tube pool heat exchanger, after Bowman's FG100-5115-2 (the
 * owner, 2026-10-23: it replaces Dev19's plate heat exchanger). Pool water
 * goes straight through it: in at one end cover, out at the other, through
 * the tube stack. Boiler water flows round the tubes in the shell, in and
 * out through two branches on top, counterflow (boiler water in at the
 * pool-water outlet's end). So it sits in the pool return line like a
 * large fitting, and the heating flow and return drop onto it from above.
 *
 * From Bowman's datasheet: 470 mm overall, a 128 mm shell, 2½" BSP end
 * covers and 1¼" BSP boiler branches at 294 mm centres, on two feet at
 * 190 mm centres, the branches' tops 80 mm and the feet 75 mm from the
 * axis, 14 kg in titanium, for pools up to 250 m³ heated by up to 170 kW.
 * Pure: metres, its own frame, the pool water's way along +x, its middle
 * on the axis.
 */

export type Vec3 = readonly [number, number, number];

export const SHELL_TUBE = {
  length: 0.47,
  shell: 0.128,
  /** The end covers, cast, round their 2½" connections. */
  cover: { diameter: 0.17, length: 0.055 },
  branchCentres: 0.294,
  branchTop: 0.08,
  branchDiameter: 0.05,
  feetCentres: 0.19,
  feetBelow: 0.075,
  /** What it can serve, after the datasheet: pool volume, boiler power. */
  rating: { poolM3: 250, boilerKW: 170 },
} as const;

/**
 * On its plinth (the owner, 2026-10-23: plinths are cheap): a concrete
 * block lifting its axis to a working height, so the pool line runs
 * through it within reach and the heating flow and return drop straight
 * onto its branches. The plinth's footprint, metres.
 */
export const ON_PLINTH = {
  axis: 0.9,
  plinth: { w: 0.34, d: 0.26 },
  /** What it takes on the floor, with room round its end covers, and its height to its branches' tops. */
  size: { w: 0.6, d: 0.32, h: 0.9 + 0.08 + 0.03 },
  /** To draw its tube stack out of an end, metres. */
  withdrawal: 0.45,
} as const;

/** Its ports, and which way each faces, in its own frame; `axis` its height over the floor. */
export function shellTubePorts(
  axis = 0,
): Record<
  'pool-in' | 'pool-out' | 'primary-in' | 'primary-out',
  { at: Vec3; out: Vec3 }
> {
  const half = SHELL_TUBE.length / 2;
  const branch = SHELL_TUBE.branchCentres / 2;
  return {
    'pool-in': { at: [-half, axis, 0], out: [-1, 0, 0] },
    'pool-out': { at: [half, axis, 0], out: [1, 0, 0] },
    // Counterflow: boiler water in over the pool water's outlet.
    'primary-in': {
      at: [branch, axis + SHELL_TUBE.branchTop, 0],
      out: [0, 1, 0],
    },
    'primary-out': {
      at: [-branch, axis + SHELL_TUBE.branchTop, 0],
      out: [0, 1, 0],
    },
  };
}

/**
 * The pool heat exchanger's variants (the owner, 2026-10-23: components
 * have variants, and ports near the floor limit routing):
 *
 * - `shell-tube-plinth`: the shell-and-tube exchanger on its plinth, pool
 *   water through its ends at 0.9 m, heating on top;
 * - `plate-floor`: a gasketed plate exchanger on the floor, all four ports
 *   on its fixed frame at the frame's corners (heating on one side, pool
 *   water on the other, counterflow), so its movable end opens without
 *   breaking a pipe;
 * - `plate-plinth`: the same on a 0.3 m plinth, its low ports lifted.
 */
export type ExchangerVariant =
  | 'shell-tube-plinth'
  | 'plate-floor'
  | 'plate-plinth';
export const EXCHANGER_VARIANTS: readonly ExchangerVariant[] = [
  'shell-tube-plinth',
  'plate-floor',
  'plate-plinth',
];

/** The plate exchanger: its frame plate's outer face, metres from its middle, and its corners' ports. */
export const PLATE = {
  /** Overall, frame plate to end support; width; height. */
  length: 1.1,
  width: 0.47,
  height: 1.084,
  /** The fixed frame's outer face, from its middle (−x). */
  face: -0.56,
  /** The ports' corners: up from the floor, and out from the middle. */
  low: 0.2,
  high: 0.88,
  side: 0.15,
  /** Room for its movable end to open, at +x. */
  opening: 0.8,
  /** A plinth lifting it. */
  plinth: 0.3,
} as const;

/** A variant's ports, in its own frame (the floor at y = 0). */
export function exchangerPorts(variant: ExchangerVariant) {
  if (variant === 'shell-tube-plinth') return shellTubePorts(ON_PLINTH.axis);
  const lift = variant === 'plate-plinth' ? PLATE.plinth : 0;
  const at = (y: number, z: number) => ({
    at: [PLATE.face, lift + y, z] as Vec3,
    out: [-1, 0, 0] as Vec3,
  });
  return {
    // Heating down one side, pool water up the other: counterflow.
    'primary-in': at(PLATE.high, -PLATE.side),
    'primary-out': at(PLATE.low, -PLATE.side),
    'pool-in': at(PLATE.low, PLATE.side),
    'pool-out': at(PLATE.high, PLATE.side),
  };
}

/** What a variant takes on the floor, and what it asks of placement. */
export function exchangerPlacing(variant: ExchangerVariant) {
  if (variant === 'shell-tube-plinth')
    return {
      size: ON_PLINTH.size,
      withdrawal: { left: ON_PLINTH.withdrawal },
      clearAbove: true,
    };
  const lift = variant === 'plate-plinth' ? PLATE.plinth : 0;
  return {
    size: { w: PLATE.length + 0.1, d: 0.6, h: PLATE.height + lift },
    withdrawal: { right: PLATE.opening },
    clearAbove: false,
  };
}
