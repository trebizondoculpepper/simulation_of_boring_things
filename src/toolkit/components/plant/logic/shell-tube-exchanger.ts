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
