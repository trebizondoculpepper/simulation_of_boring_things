import { TANKS } from '../../../game/plant/museum-4-lab';
import type { LinkId, TankId } from '../../../game/plant/museum-4-lab';
import { hallColumns, hallInterior, hallOrigin } from './museum-plan';

/**
 * Hall 4's layout (107d), by hand. Pure; metres in the exhibit's frame
 * (the hall's middle the origin, y up), which stands turned half round
 * about the hall's middle (`STANDS`, layout C), so that here north (−z)
 * is the hall's south wall and the archways are on the +z side. The
 * owner's layout (2026-10-31, revised the same day; see `TANK_LIFT`): the
 * tanks raised at the back, the desk before them, the pool on the hall's
 * west wall, the pump in its far corner, the mimic on its east wall,
 * a lectern at each station along the way round (RESET is on the
 * console's screen since mission 113).
 * Each pipe is one of the schematic's links. The exhibit turns all this, and
 * `placedFootprints` gives its footprints turned.
 */
export const STANDS = { turn: Math.PI } as const;

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

/**
 * The archways, both in the north wall as the hall stands (here, turned,
 * the SOUTH side): the arrival from Hall 3 at x −5.5 and the way on to
 * Hall 5 at x 5.5 (here 5.5 and −5.5), each 3.6 m wide. Their approaches,
 * 2 m deep into the hall and 0.3 m wider each side, are kept clear.
 */
export const ARRIVAL_X = 5.5;
export const APPROACHES = [ARRIVAL_X, -ARRIVAL_X].map((x) => ({
  minX: x - 2.1,
  maxX: x + 2.1,
  minZ: INTERIOR.maxZ - 2.0,
  maxZ: INTERIOR.maxZ,
}));

/**
 * The walls' inside faces, in this (turned) frame: NORTH is the hall's
 * south wall, EAST its west wall, WEST its east wall, SOUTH its north
 * wall. Boards hang with their backs at their origins, on the wall.
 */
export const NORTH = INTERIOR.minZ;
export const EAST = INTERIOR.maxX;
export const WEST = INTERIOR.minX;
export const SOUTH = INTERIOR.maxZ;

/**
 * The owner's second layout (2026-10-31), as the hall stands: the tanks at
 * the back, a metre out from the hall's south wall (NORTH here, opposite
 * the arrival archway), under its two courtyard windows and centred on
 * them, lifted 0.6 m on a steel stand with the bund on its deck as a drip
 * tray; the desk 2 m in front of them on their centre line, its operating
 * side toward the visitor (the dosing console since mission 113; the
 * teleprinter and RESET are gone); the pump in the far right corner;
 * the readout board and the Balance Beam side by side on the west wall;
 * the mimic on the east wall. Here, turned, everything is negated.
 */
const TANKS_MID = 0.3;
export const TANK_LIFT = 0.6;
export const TANK_Z = NORTH + 1.75;
export const tankX = (id: TankId) =>
  TANKS_MID +
  (TANKS.findIndex((t) => t.id === id) - (TANKS.length - 1) / 2) * 0.6;
const TANKS_HALF = ((TANKS.length - 1) * 0.6) / 2 + 0.35;
export const BUND = {
  minX: TANKS_MID - TANKS_HALF,
  maxX: TANKS_MID + TANKS_HALF,
  minZ: TANK_Z - 0.45,
  maxZ: TANK_Z + 0.45,
  h: 0.1,
} as const;
/**
 * The steel stand under the bund, its deck at `TANK_LIFT`: a metre out from
 * the back wall (the owner, 2026-10-31), leaving a clear service space
 * behind for the dosing manifold when the hall is re-plumbed.
 */
export const STAND = {
  minX: BUND.minX,
  maxX: BUND.maxX,
  minZ: NORTH + 1.1,
  maxZ: BUND.maxZ,
  h: TANK_LIFT,
} as const;
/**
 * The dosing console (mission 113: three touch screens and DOSE, 2.4 by
 * 0.85 m) 2 m in front of the stand (the owner, 2026-10-31), front and
 * centre on the tanks, its operator's back to the arrival.
 */
export const DESK = {
  x: TANKS_MID,
  z: STAND.maxZ + 2 + 0.425,
  w: 2.4,
  /** The stand's plinth, without the old desk's shelf (the owner, 2026-10-31). */
  d: 0.5,
} as const;
/**
 * Where the pipework was laid for (the first layout): re-plumbing for the
 * tanks' new place is deferred by the owner (2026-10-31), so the lines,
 * header and fittings stay put for now.
 */
const PLUMBED = { tankZ: 1.7, readoutZ: -5.2 } as const;
const plumbedTankX = (id: TankId) =>
  1.2 + TANKS.findIndex((t) => t.id === id) * 0.6;
/**
 * The mimic ("The map") on the back wall (the owner, 2026-10-31), flush,
 * behind the tanks and centred on them, its middle: 3.0 × 1.4 m, its foot
 * at 2.65 m, over the tanks' tops (2.3 m) as read from the desk, its head
 * at 4.05 m, under the windows' sills (4.2 m).
 */
export const MIMIC_AT = { x: TANKS_MID, y: 3.35 } as const;
/**
 * The ideal pool (the owner, 2026-10-31: "where a visitor at the desk can
 * see the effect of dosing"): ahead and to the right of the desk, beside
 * the tanks' stand, its long side (`w`) along x and its display facing
 * the desk; the readout board on the right wall just beyond its corner.
 */
export const POOL = { x: 5.6, z: -4.3, w: 3.4, d: 2.4, h: 1.3 } as const;
/**
 * Its balancing tank, the model's pool's 30 m³ (drawn as an ideal vessel,
 * bound to the pool), before the pool's front right corner on the room
 * side (the owner, 2026-10-31), seen from the desk and the room, right of
 * the desk's sight line to the pool's display; the pump in the far right
 * corner, the injection tee behind the pool, and the dosing pot at the
 * east end of the manifold strip.
 */
export const BALANCE_TANK = {
  x: 6.7,
  z: -2.4,
  w: 1.0,
  d: 0.8,
  h: 1.2,
} as const;
/**
 * The pump M4-P1, with its valves and flowmeter as a unit, in the far
 * right corner (the owner, 2026-10-31): the back wall's east end here,
 * facing into the room (+z), its set's length along x. Its pipes are not
 * yet re-laid (deferred by the owner): they still run to where it was.
 */
export const PUMP = { x: EAST - 1.25, z: NORTH + 0.6, yaw: 0 } as const;
/** Which way the pump's set runs along x: −1 faced into the room, +1 turned half round. */
const PUMP_DIR = PUMP.yaw === 0 ? -1 : 1;
export const PUMP_FOOT = { hw: 1.05, hd: 0.4, h: 1.44 } as const;
/**
 * The pump's nozzles, as drawn (`createEndSuctionPump`, turned half
 * round): its axial suction toward the pool, its discharge flange on top.
 */
export const PUMP_SUCTION = {
  x: PUMP.x + PUMP_DIR * 1.0,
  y: 0.68,
  z: PUMP.z,
} as const;
export const PUMP_DISCHARGE = {
  x: PUMP.x + PUMP_DIR * 0.57,
  y: 1.26,
  z: PUMP.z - PUMP_DIR * 0.12,
} as const;
/** The pump's nozzles where its pipes were laid for (the first layout). */
const PLUMBED_SUCTION = { x: 4.4, y: 0.68, z: 0.4 } as const;
const PLUMBED_DISCHARGE = { x: 3.97, y: 1.26, z: 0.28 } as const;
/** The dosing pot, in front of the header's end, and the tee by the pool. */
export const POT = { x: 3.7, z: -6.35, r: 0.2, h: 0.8 } as const;
export const TEE = { x: 5.2, z: -5.65, r: 0.07, h: 0.16 } as const;
/** The readout board on the west wall, south of the pool as the hall stands. */
/**
 * The analyser's readout board alone, centred on the hall's west wall (EAST
 * here: on the right of a visitor arriving from Hall 3 and facing the
 * tanks), above the pool's rim; the Balance Beam hung opposite it, flush
 * on the hall's east wall (WEST here, the left), centred to match (the
 * owner, 2026-10-31). The pool is on the right wall, so nothing meets.
 */
export const READOUT = { z: 0, y: 2.35, h: 1.5, w: 2.96 } as const;
/**
 * The Balance Beam hung as the readout board's match across the hall (the
 * owner, 2026-10-31): scaled to the board's width and height (its own
 * 1.9 × 1.25 m without its plaque), at the board's height, its foot shelf's
 * back to the wall; its words on a lectern of its own before it.
 */
export const BEAM_SCALE = {
  x: READOUT.w / 1.9,
  y: READOUT.h / 1.25,
  z: READOUT.h / 1.25,
} as const;
export const BEAM = {
  x: WEST + 0.25 * BEAM_SCALE.z,
  z: READOUT.z,
  y: READOUT.y - READOUT.h / 2,
} as const;
/** The beam's lectern, before it, facing the visitor looking at the beam. */
export const BEAM_LECTERN = {
  x: WEST + 0.5 * BEAM_SCALE.z + 0.6,
  z: READOUT.z,
  yaw: Math.PI / 2,
} as const;
/**
 * The 1,000× plaque on the archways' wall (SOUTH here, the hall's north
 * wall), centred between the archways, where LAB TIME hung (mission 113).
 */
export const PLAQUE = { x: 0, y: 1.6 } as const;
/** The challenge cards' poster on the back wall, its middle; its controls' plate centred under it. */
export const CARDS_BOARD = { x: -5.0, y: 2.3, controlsY: 1.4 } as const;
/** A lectern's footprint as drawn, facing +z: its tilted head overhangs its post. */
export const LECTERN_FOOT = { hw: 0.47, hd: 0.21 } as const;
/**
 * The lecterns, by station, each before or beside what it describes and
 * facing the visitor looking at it, numbered along the way round from the
 * arrival archway: the desk, the tanks, the swimmers (at the pool), the
 * readout, the challenge cards.
 */
export const LECTERNS: Record<number, { x: number; z: number; yaw: number }> = {
  1: { x: DESK.x + 2.6, z: DESK.z + 0.1, yaw: 0 },
  2: { x: BUND.minX - 0.65, z: TANK_Z + 0.9, yaw: 0 },
  3: { x: POOL.x, z: POOL.z + POOL.d / 2 + 0.6, yaw: 0 },
  4: { x: EAST - 1.2, z: READOUT.z + 2.0, yaw: -Math.PI / 2 },
  5: { x: CARDS_BOARD.x, z: NORTH + 1.3, yaw: 0 },
};
/**
 * TEMPORARY, for the owner's review of the second layout (2026-10-31):
 * the station lecterns are parked out of bounds, far below the floor, and
 * their footprints taken off the floor. Set false to bring them back.
 */
export const LECTERNS_PARKED = true;
/** Where a parked lectern is put: well out of the hall and out of sight. */
export const PARKED_Y = -50;
/** A lectern's footprint, turned with it. */
export function lecternFoot(l: { x: number; z: number; yaw: number }) {
  const across = Math.abs(Math.sin(l.yaw)) > 0.5;
  const hw = across ? LECTERN_FOOT.hd : LECTERN_FOOT.hw;
  const hd = across ? LECTERN_FOOT.hw : LECTERN_FOOT.hd;
  return { minX: l.x - hw, maxX: l.x + hw, minZ: l.z - hd, maxZ: l.z + hd };
}

const Y = 0.2;
const H = 0.25;
/** Overhead, clear of every head: the make-up's run to the pool. */
const OVERHEAD = 2.4;
/** The pump's discharge, over to the injection tee. */
const OVER = 1.6;
/** The pool's suction: up out of its north end, then along to the pump. */
const SUCTION_X = 6.3;
/**
 * The dosing header DH1: a manifold along the bund's back, under the
 * tanks' outlets, each chemical's line dropping into it (not the
 * make-up's, which runs to the pool).
 */
export const MANIFOLD = {
  minX: 1.2 - 0.05,
  maxX: 1.2 + (TANKS.length - 2) * 0.6 + 0.15,
  z: PLUMBED.tankZ - 0.4,
  y: Y,
  od: 0.05,
} as const;
/** The make-up's spout, over the pool's north rim and above its water. */
export const FRESH_SPOUT = {
  x: 1.2 + (TANKS.length - 1) * 0.6,
  y: POOL.h - 0.05,
  z: POOL.z + POOL.w / 2 - 0.25,
};
type V3 = [number, number, number];
/** Each link's run, in the hall's frame. */
export function pipeRuns(): { edge: LinkId; od: number; points: V3[] }[] {
  const runs: { edge: LinkId; od: number; points: V3[] }[] = [];
  const back = PLUMBED.tankZ - 0.57;
  for (const t of TANKS) {
    const x = plumbedTankX(t.id);
    if (t.id === 'fresh')
      runs.push({
        edge: 'dose.fresh',
        od: 0.06,
        points: [
          [x, 0.16, PLUMBED.tankZ],
          [x, 0.16, back],
          // Up behind the tanks, overhead to the pool, down to its spout.
          [x, OVERHEAD, back],
          [x, OVERHEAD, FRESH_SPOUT.z],
          [FRESH_SPOUT.x, FRESH_SPOUT.y, FRESH_SPOUT.z],
        ],
      });
    else
      runs.push({
        edge: `dose.${t.id}` as LinkId,
        od: 0.025,
        points: [
          [x, H, PLUMBED.tankZ],
          [x, H, MANIFOLD.z],
          [x, Y, MANIFOLD.z],
        ],
      });
  }
  // From the manifold's end, round into the dosing pot's side.
  runs.push({
    edge: 'header',
    od: 0.04,
    points: [
      [MANIFOLD.maxX, Y, MANIFOLD.z],
      [SUCTION_X, Y, MANIFOLD.z],
      [SUCTION_X, Y, POT.z],
      [POT.x + POT.r, Y, POT.z],
    ],
  });
  runs.push({
    edge: 'injection',
    od: 0.03,
    points: [
      [POT.x, Y, POT.z - POT.r],
      [TEE.x, Y, TEE.z + TEE.r],
    ],
  });
  runs.push({
    edge: 'poolOut',
    od: 0.11,
    points: [
      [SUCTION_X, PLUMBED_SUCTION.y, POOL.z + POOL.w / 2],
      [SUCTION_X, PLUMBED_SUCTION.y, PLUMBED_SUCTION.z],
      [PLUMBED_SUCTION.x, PLUMBED_SUCTION.y, PLUMBED_SUCTION.z],
    ],
  });
  runs.push({
    edge: 'poolDischarge',
    od: 0.11,
    points: [
      [PLUMBED_DISCHARGE.x, PLUMBED_DISCHARGE.y, PLUMBED_DISCHARGE.z],
      [PLUMBED_DISCHARGE.x, OVER, PLUMBED_DISCHARGE.z],
      [TEE.x, OVER, PLUMBED_DISCHARGE.z],
      [TEE.x, OVER, TEE.z],
      [TEE.x, Y + TEE.h / 2, TEE.z],
    ],
  });
  runs.push({
    edge: 'poolReturn',
    od: 0.11,
    points: [
      [TEE.x, Y, TEE.z - TEE.r],
      [TEE.x, Y, POOL.z + POOL.w / 2],
    ],
  });
  const sampleZ = PLUMBED.readoutZ + READOUT.w / 2 - 0.3;
  runs.push({
    edge: 'sample',
    od: 0.015,
    points: [
      [EAST - 0.3, 1.0, POOL.z - POOL.w / 2],
      [EAST - 0.3, 1.0, sampleZ],
      [EAST - 0.03, 1.0, sampleZ],
      [EAST - 0.03, READOUT.y - READOUT.h / 2, sampleZ],
    ],
  });
  return runs;
}

/**
 * Where each fitting of the schematic sits on its line, in the hall's
 * frame, and the way its line runs there: each tank's valve on its
 * outlet just off the tank, the pump's suction valve on the suction just
 * before the pump, its non-return and discharge valves on the discharge's
 * run over to the tee, the flowmeter on its drop to the tee.
 */
export function fittingPlaces(): Record<
  string,
  { edge: LinkId; at: V3; along: V3; upright?: boolean }
> {
  const places: Record<
    string,
    { edge: LinkId; at: V3; along: V3; upright?: boolean }
  > = {};
  for (const t of TANKS)
    places[`${t.id}.v`] = {
      edge: `dose.${t.id}` as LinkId,
      at:
        t.id === 'fresh'
          ? [tankX(t.id), TANK_LIFT + 0.16, TANK_Z - 0.4]
          : [tankX(t.id), TANK_LIFT + H, TANK_Z - 0.31],
      along: [0, 0, -1],
    };
  places['pump.suction'] = {
    edge: 'poolOut',
    at: [PUMP_SUCTION.x + PUMP_DIR * 0.45, PUMP_SUCTION.y, PUMP_SUCTION.z],
    along: [-PUMP_DIR, 0, 0],
  };
  places['pump.nrv'] = {
    edge: 'poolDischarge',
    at: [PUMP_DISCHARGE.x + PUMP_DIR * 0.3, OVER, PUMP_DISCHARGE.z],
    along: [PUMP_DIR, 0, 0],
  };
  places['pump.discharge'] = {
    edge: 'poolDischarge',
    at: [PUMP_DISCHARGE.x + PUMP_DIR * 0.75, OVER, PUMP_DISCHARGE.z],
    along: [PUMP_DIR, 0, 0],
  };
  places['flow'] = {
    edge: 'poolDischarge',
    // With the pump, on its discharge beyond the valves.
    at: [PUMP_DISCHARGE.x + PUMP_DIR * 1.2, OVER, PUMP_DISCHARGE.z],
    along: [PUMP_DIR, 0, 0],
  };
  return places;
}

/** Every footprint on the floor, in the exhibit's frame, for the walker and the test. */
export function footprints() {
  const r = (x: number, z: number, hw: number, hd: number) => ({
    minX: x - hw,
    maxX: x + hw,
    minZ: z - hd,
    maxZ: z + hd,
  });
  return [
    { minX: STAND.minX, maxX: STAND.maxX, minZ: STAND.minZ, maxZ: STAND.maxZ },
    r(DESK.x, DESK.z, DESK.w / 2, DESK.d / 2),
    r(POT.x, POT.z, POT.r, POT.r),
    r(PUMP.x, PUMP.z, PUMP_FOOT.hw, PUMP_FOOT.hd),
    r(POOL.x, POOL.z, POOL.w / 2, POOL.d / 2),
    r(BALANCE_TANK.x, BALANCE_TANK.z, BALANCE_TANK.w / 2, BALANCE_TANK.d / 2),
    // Hung on the wall, its foot shelf out over the floor.
    {
      minX: WEST,
      maxX: WEST + 0.5 * BEAM_SCALE.z,
      minZ: BEAM.z - (1.9 / 2) * BEAM_SCALE.x,
      maxZ: BEAM.z + (1.9 / 2) * BEAM_SCALE.x,
    },
    lecternFoot(BEAM_LECTERN),
    ...(LECTERNS_PARKED ? [] : Object.values(LECTERNS).map(lecternFoot)),
  ];
}

/** The footprints as the exhibit stands, turned half round (`STANDS`). */
export function placedFootprints() {
  return footprints().map((f) => ({
    minX: -f.maxX,
    maxX: -f.minX,
    minZ: -f.maxZ,
    maxZ: -f.minZ,
  }));
}

type Shape =
  | { kind: 'box'; min: V3; max: V3 }
  | { kind: 'cyl'; x: number; z: number; r: number; y0: number; y1: number };
const box = (min: V3, max: V3): Shape => ({ kind: 'box', min, max });
/** Each node a pipe meets, its solid as drawn, in the exhibit's frame. */
export function nodeShape(node: string): Shape {
  if (node.startsWith('tank.')) {
    const x = tankX(node.slice(5) as TankId);
    return box(
      [x - 0.22, TANK_LIFT + BUND.h, TANK_Z - 0.22],
      [x + 0.22, TANK_LIFT + 1.6, TANK_Z + 0.25],
    );
  }
  switch (node) {
    case 'header':
      return box(
        [MANIFOLD.minX, Y - MANIFOLD.od / 2, MANIFOLD.z - MANIFOLD.od / 2],
        [MANIFOLD.maxX, Y + MANIFOLD.od / 2, MANIFOLD.z + MANIFOLD.od / 2],
      );
    case 'pot':
      return { kind: 'cyl', x: POT.x, z: POT.z, r: POT.r, y0: 0, y1: POT.h };
    case 'injection':
      return {
        kind: 'cyl',
        x: TEE.x,
        z: TEE.z,
        r: TEE.r,
        y0: Y - TEE.h / 2,
        y1: Y + TEE.h / 2,
      };
    case 'pump':
      return box(
        [PUMP.x - PUMP_FOOT.hw, 0, PUMP.z - PUMP_FOOT.hd],
        [PUMP.x + PUMP_FOOT.hw, PUMP_FOOT.h, PUMP.z + PUMP_FOOT.hd],
      );
    case 'pool':
      return box(
        [POOL.x - POOL.w / 2, 0, POOL.z - POOL.d / 2],
        [POOL.x + POOL.w / 2, POOL.h, POOL.z + POOL.d / 2],
      );
    case 'analyser':
      return box(
        [EAST - 0.17, READOUT.y - READOUT.h / 2, READOUT.z - READOUT.w / 2],
        [EAST, READOUT.y + READOUT.h / 2, READOUT.z + READOUT.w / 2],
      );
  }
  throw new Error(`no shape for ${node}`);
}

/** How far a point is from a node's solid (0 inside it). */
export function distanceTo(shape: Shape, p: V3): number {
  if (shape.kind === 'box') {
    const d = [0, 1, 2].map((k) =>
      Math.max(shape.min[k] - p[k], 0, p[k] - shape.max[k]),
    );
    return Math.hypot(d[0], d[1], d[2]);
  }
  const radial = Math.max(
    0,
    Math.hypot(p[0] - shape.x, p[2] - shape.z) - shape.r,
  );
  const up = Math.max(shape.y0 - p[1], 0, p[1] - shape.y1);
  return Math.hypot(radial, up);
}
