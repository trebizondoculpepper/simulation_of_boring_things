import { TANKS } from '../../../game/plant/museum-4-lab';
import type { LinkId, TankId } from '../../../game/plant/museum-4-lab';
import { hallColumns, hallInterior, hallOrigin } from './museum-plan';

/**
 * Hall 4's layout (107d), by hand: the visitor comes in from Hall 3 by the
 * west archway and leaves by the east, so the exhibit stands along the
 * street (north) wall, facing south, read left to right with the flow
 * (rule 5): the ten tanks on a bund on the west, the dosing desk with its
 * mimic above it and the teleprinter in the middle, the dosing pot and
 * the ideal pool on the east with its readout board on the east wall; the
 * Balance Beam in front of the pool; the lecterns along the visitors'
 * side. Each pipe is one of the schematic's links. Pure; metres in the
 * hall's frame (its middle the origin, y up, north −z).
 */

export const INTERIOR = (() => {
  const i = hallInterior('museum4');
  const o = hallOrigin('museum4');
  return {
    minX: i.minX - o.x,
    maxX: i.maxX - o.x,
    minZ: i.minZ - o.z,
    maxZ: i.maxZ - o.z,
  };
})();
export const COLUMNS = hallColumns('museum4');
/** The walk from archway to archway, kept clear. */
export const WALKWAY = { minZ: -1.9, maxZ: 1.9 } as const;

export const NORTH = INTERIOR.minZ + 0.04;
export const EAST = INTERIOR.maxX - 0.04;

export const TANK_Z = -6.05;
export const tankX = (id: TankId) =>
  -7.0 + TANKS.findIndex((t) => t.id === id) * 0.6;
export const BUND = {
  minX: -7.35,
  maxX: -1.25,
  minZ: -6.5,
  maxZ: -5.6,
  h: 0.1,
} as const;
export const DESK = { x: 0.9, z: -5.2, w: 2.0, d: 0.75 } as const;
export const MIMIC_AT = { x: 0.9, y: 2.3 } as const;
export const PRINTER = { x: 2.55, z: -5.2 } as const;
export const POT = { x: 2.7, z: -6.25, r: 0.2, h: 0.8 } as const;
export const PUMP = { x: 3.55, z: -4.7 } as const;
export const TEE = { x: 3.55, z: -6.25 } as const;
export const POOL = { x: 5.7, z: -5.1, w: 3.4, d: 2.4, h: 1.3 } as const;
export const READOUT = { z: -4.2, y: 2.35 } as const;
export const BEAM = { x: 5.4, z: -2.85 } as const;
export const CARDS_BOARD = { x: -4.3, y: 2.3 } as const;
export const ENTRANCE = { x: -5.4, z: 3.2 } as const;
export const RESET = { x: -3.6, z: 3.2 } as const;
/** The lecterns, by station, each facing south toward the visitor. */
export const LECTERNS: Record<number, { x: number; z: number }> = {
  1: { x: -4.4, z: -4.2 },
  2: { x: -0.9, z: -3.9 },
  3: { x: 7.0, z: -2.3 },
  4: { x: 3.6, z: -3.3 },
  5: { x: 1.8, z: -3.6 },
};

const Y = 0.2;
const H = 0.25;
type V3 = [number, number, number];
/** Each link's run, in the hall's frame. */
export function pipeRuns(): { edge: LinkId; od: number; points: V3[] }[] {
  const runs: { edge: LinkId; od: number; points: V3[] }[] = [];
  for (const t of TANKS) {
    const x = tankX(t.id);
    if (t.id === 'fresh')
      runs.push({
        edge: 'dose.fresh',
        od: 0.06,
        points: [
          [x, 0.16, TANK_Z],
          [x, 0.16, -6.62],
          [POOL.x - POOL.w / 2 - 0.1, 0.16, -6.62],
          [POOL.x - POOL.w / 2 - 0.1, POOL.h + 0.25, -6.62],
          [POOL.x - POOL.w / 2 - 0.1, POOL.h + 0.25, -6.0],
        ],
      });
    else
      runs.push({
        edge: `dose.${t.id}` as LinkId,
        od: 0.025,
        points: [
          [x, H, TANK_Z],
          [x, H, -6.45],
          [x, Y, -6.45],
        ],
      });
  }
  runs.push({
    edge: 'header',
    od: 0.04,
    points: [
      [tankX('hypo'), Y, -6.45],
      [POT.x - POT.r, Y, -6.45],
    ],
  });
  runs.push({
    edge: 'injection',
    od: 0.03,
    points: [
      [POT.x + POT.r, Y, POT.z],
      [TEE.x, Y, TEE.z],
    ],
  });
  runs.push({
    edge: 'poolOut',
    od: 0.11,
    points: [
      [POOL.x - POOL.w / 2, 0.3, PUMP.z],
      [PUMP.x + 0.3, 0.3, PUMP.z],
    ],
  });
  runs.push({
    edge: 'poolDischarge',
    od: 0.11,
    points: [
      [PUMP.x, 0.45, PUMP.z - 0.25],
      [PUMP.x, 0.45, TEE.z + 0.1],
      [TEE.x, Y + 0.0, TEE.z + 0.1],
    ],
  });
  runs.push({
    edge: 'poolReturn',
    od: 0.11,
    points: [
      [TEE.x, Y, TEE.z],
      [POOL.x - POOL.w / 2, Y, TEE.z],
    ],
  });
  runs.push({
    edge: 'sample',
    od: 0.015,
    points: [
      [POOL.x + POOL.w / 2, 1.0, READOUT.z],
      [EAST - 0.05, 1.0, READOUT.z],
    ],
  });
  return runs;
}

/** Every footprint on the floor, for the walker and the test. */
export function footprints() {
  const r = (x: number, z: number, hw: number, hd: number) => ({
    minX: x - hw,
    maxX: x + hw,
    minZ: z - hd,
    maxZ: z + hd,
  });
  return [
    { minX: BUND.minX, maxX: BUND.maxX, minZ: BUND.minZ, maxZ: BUND.maxZ },
    r(DESK.x, DESK.z, DESK.w / 2, DESK.d / 2),
    r(PRINTER.x, PRINTER.z, 0.35, 0.3),
    r(POT.x, POT.z, POT.r, POT.r),
    r(PUMP.x, PUMP.z, 0.35, 0.25),
    r(POOL.x, POOL.z, POOL.w / 2, POOL.d / 2),
    r(BEAM.x, BEAM.z, 0.95, 0.25),
    r(RESET.x, RESET.z, 0.25, 0.25),
    r(ENTRANCE.x, ENTRANCE.z, 1.0, 0.15),
    ...Object.values(LECTERNS).map((l) => r(l.x, l.z, 0.2, 0.2)),
  ];
}
