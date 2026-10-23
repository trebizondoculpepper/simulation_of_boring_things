import { BALANCE_TANK } from '../../../game/plant/balance-tank';
import type { Vec3 } from '../../components/core/logic/pipe-route';
import type { PlantRoomLayout } from './plant-room-layout';
import { WALL_THICKNESS } from './dev-room-links';

/**
 * The Olympic pool's balance tank hall (Dev28, `doc/prompts/032-balance-tank-hall.md`):
 * a cast concrete tank, 9 × 6 m inside and 4.5 m deep, open below a steel
 * gantry round three sides of it, and at its west end, behind a blockwork
 * partition, a bay of the adjacent plant room, where its machinery is (its
 * panel, its make-up valve): the hall holds only what must be in the tank.
 * The gantry is cantilevered off the tank's walls, 1.6 m wide at the
 * partition's doorway and 1 m along the north and south; along the east
 * wall the tank is open to its rim, and there its ladder goes down. Pure;
 * metres, the room's frame, the gantry's deck and the bay's floor at y = 0.
 */

const T = BALANCE_TANK;
/** The plant bay at the west end: the adjacent plant room's side, a dry floor at the gantry's level. */
export const BAY = 3;
/** The blockwork partition between the bay and the tank, and its doorway onto the gantry. */
export const PARTITION = 0.2;
export const DOORWAY = { z: -0.4, width: 1.0, height: 2.1 } as const;
/** The hall: its walls on these bounds, its soffit under the pool's surround. */
export const HALL = {
  halfX: (BAY + PARTITION + T.length) / 2 + WALL_THICKNESS / 2,
  halfZ: T.width / 2 + WALL_THICKNESS / 2,
  height: 3.2,
} as const;
/** The room's inside faces. */
const IN = {
  x: HALL.halfX - WALL_THICKNESS / 2,
  z: HALL.halfZ - WALL_THICKNESS / 2,
};
/** The tank's inside faces, and its floor: its west wall the partition. */
export const TANK = {
  minX: -IN.x + BAY + PARTITION,
  maxX: IN.x,
  minZ: -T.width / 2,
  maxZ: T.width / 2,
  floor: -T.depth,
} as const;
/** The bay's floor. */
export const BAY_FLOOR = { minX: -IN.x, maxX: TANK.minX - PARTITION } as const;
/** The open water between the gantries: what the floor is cut away for. */
export const OPENING = {
  minX: TANK.minX + 1.6,
  maxX: TANK.maxX,
  minZ: TANK.minZ + 1,
  maxZ: TANK.maxZ - 1,
} as const;

/** A depth in the tank as a height in the hall. */
export const heightOf = (depth: number) => TANK.floor + depth;

/** The ladder: against the east wall, its top beside the south gantry's end, through the gate in its rail. */
export const LADDER = {
  z: OPENING.maxZ - 0.3,
  width: 0.45,
  standOff: 0.18,
} as const;
export const GATE = { minX: TANK.maxX - 0.6, maxX: TANK.maxX } as const;

/** The tank's middle, along x. */
const MID = (TANK.minX + TANK.maxX) / 2;

/** Where things stand. */
export const SPOTS = {
  /** The pool's two overflow returns, dropping through the soffit, their ends above the weir. */
  returns: [MID - 0.8, MID + 1.6].map((x) => ({ x, z: OPENING.minZ + 0.35 })),
  returnEnd: heightOf(T.weir) + 0.3,
  /**
   * The make-up: off the main in the bay, up through its solenoid valve, through the
   * partition high up, and down to its discharge (a Type AA air gap above the weir).
   */
  makeup: {
    x: OPENING.minX + 0.3,
    z: OPENING.maxZ - 0.3,
    end: heightOf(T.weir) + 0.35,
    valve: 1.6,
    bayX: BAY_FLOOR.maxX - 0.15,
    high: 2.7,
  },
  /** The weir to drain, out of the east wall. */
  weir: { z: -1.0 },
  /** The two suctions to the pumps, through the partition low down into the plant room. */
  suctions: [-1.2, -0.2].map((z) => ({ z, y: heightOf(0.6) })),
  /** The staff gauge on the east wall. */
  gauge: { z: 1.05 },
  /** The level transmitter, on its arm out from the south rail. */
  transmitter: { x: MID, z: OPENING.maxZ - 0.55, y: 0.3 },
  /** The float switches, hung from their bracket on the north rail. */
  floats: { x: OPENING.minX + 1.4, z: OPENING.minZ + 0.25 },
  /** In the bay: the panel on its north wall; the lifebuoy in the hall, by the doorway. */
  panel: { x: (BAY_FLOOR.minX + BAY_FLOOR.maxX) / 2, y: 1.45 },
  lifebuoy: { z: DOORWAY.z - 1.3, y: 1.5 },
} as const;

/** The pipes' centrelines. */
export function hallPipes() {
  const top = HALL.height + 0.3;
  const m = SPOTS.makeup;
  const w = SPOTS.weir;
  return {
    returns: SPOTS.returns.map((r): Vec3[] => [
      [r.x, top, r.z],
      [r.x, SPOTS.returnEnd, r.z],
    ]),
    // Off the main along the bay's north wall, up past its solenoid valve, along the partition overhead, through it, and down.
    makeup: [
      [m.bayX, 0.9, TANK.minZ],
      [m.bayX, 0.9, TANK.minZ + 0.25],
      [m.bayX, m.high, TANK.minZ + 0.25],
      [m.bayX, m.high, m.z],
      [m.x, m.high, m.z],
      [m.x, m.end, m.z],
    ] as Vec3[],
    // From its bellmouth at the weir's level, down, and out through the wall.
    weir: [
      [TANK.maxX - 0.35, heightOf(T.weir), w.z],
      [TANK.maxX - 0.35, heightOf(T.weir) - 0.5, w.z],
      [TANK.maxX + 0.4, heightOf(T.weir) - 0.5, w.z],
    ] as Vec3[],
    // From their bellmouths, turned down, west through the partition to the pumps.
    suctions: SPOTS.suctions.map((s): Vec3[] => [
      [TANK.minX + 0.45, s.y - 0.25, s.z],
      [TANK.minX + 0.45, s.y, s.z],
      [TANK.minX - PARTITION - 0.4, s.y, s.z],
    ]),
  };
}

export const HALL_PIPES = {
  returns: { od: 0.315 },
  makeup: { od: 0.054 },
  weir: { od: 0.2 },
  suction: { od: 0.315 },
} as const;

/** The opening, as the floor cuts it out (x, z). */
export const OPENING_OUTLINE: readonly (readonly [number, number])[] = [
  [OPENING.minX, OPENING.minZ],
  [OPENING.maxX, OPENING.minZ],
  [OPENING.maxX, OPENING.maxZ],
  [OPENING.minX, OPENING.maxZ],
];

/** The hall's one exhibit (the tank, the bay and all in them) at the room's middle; the opening, the partition and the panel to keep walkers out of. */
export function layoutBalanceHall(): PlantRoomLayout {
  const px = { minX: TANK.minX - PARTITION, maxX: TANK.minX };
  return {
    halfX: HALL.halfX,
    halfZ: HALL.halfZ,
    height: HALL.height,
    places: [{ x: 0, y: 0, z: 0, yaw: 0 }],
    solids: [
      { ...OPENING },
      { ...px, minZ: TANK.minZ, maxZ: DOORWAY.z - DOORWAY.width / 2 },
      { ...px, minZ: DOORWAY.z + DOORWAY.width / 2, maxZ: TANK.maxZ },
      {
        minX: SPOTS.panel.x - 0.45,
        maxX: SPOTS.panel.x + 0.45,
        minZ: TANK.minZ,
        maxZ: TANK.minZ + 0.3,
      },
    ],
  };
}

/** Where the walker starts: in the bay, facing the doorway onto the gantry. */
export const START = {
  x: BAY_FLOOR.minX + 1.2,
  z: DOORWAY.z,
  yaw: Math.PI / 2,
} as const;
