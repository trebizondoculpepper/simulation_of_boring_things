import { TANKS } from '../../../game/plant/museum-4-lab';
import type { LinkId, TankId } from '../../../game/plant/museum-4-lab';
import { hallColumns, hallInterior, hallOrigin } from './museum-plan';

/**
 * Hall 4's layout (107d), by hand. Pure; metres in the exhibit's frame
 * (the hall's middle the origin, y up), which stands turned half round
 * about the hall's middle (`STANDS`, layout C), so that here north (−z)
 * is the hall's south wall and the archways are on the +z side. The
 * owner's layout (2026-10-31): the dosing desk front and centre before
 * the arrival archway, the tanks a metre behind it, the teleprinter to
 * its right, the pool against the hall's west wall between the Balance
 * Beam and the readout board, the pump, pot and tee between the tanks
 * and the pool, the mimic on the hall's east wall, RESET in the middle of
 * its north wall, a lectern at each station along the way round. Each
 * pipe is one of the schematic's links. The exhibit turns all this, and
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
 * The owner's layout (2026-10-31), as the hall stands: the dosing desk
 * front and centre before the arriving visitor, its operating side toward
 * the arrival archway; the tanks a metre behind it, seen over and past it;
 * the teleprinter to the right of the desk as the visitor stands at it;
 * the ideal pool against the west wall, the Balance Beam and the readout
 * board on either side of it behind; the mimic on the east wall; RESET in
 * the middle of the north wall. Here, turned, everything is negated.
 */
export const DESK = { x: ARRIVAL_X - 0.5, z: 3.3, w: 2.0, d: 0.75 } as const;
export const TANK_Z = 1.7;
export const tankX = (id: TankId) =>
  1.2 + TANKS.findIndex((t) => t.id === id) * 0.6;
export const BUND = {
  minX: 1.2 - 0.35,
  maxX: 1.2 + (TANKS.length - 1) * 0.6 + 0.35,
  minZ: TANK_Z - 0.45,
  maxZ: TANK_Z + 0.45,
  h: 0.1,
} as const;
/** The mimic on the east wall as the hall stands (WEST here), its middle. */
export const MIMIC_AT = { z: 0, y: 2.3 } as const;
export const PRINTER = { x: DESK.x + 1.6, z: DESK.z } as const;
/** The teleprinter on its own stand, as drawn: its footprint about `PRINTER`. */
export const PRINTER_FOOT = { hw: 0.33, minZ: -0.06, maxZ: 0.5 } as const;
/**
 * The ideal pool against the west wall as the hall stands (EAST here),
 * its long side (`w`) along the wall, facing into the hall.
 */
export const POOL = { x: 6.4, z: -2.0, w: 3.4, d: 2.4, h: 1.3 } as const;
const POOL_FRONT = POOL.x - POOL.d / 2;
/**
 * The pump, between the tanks and the pool, its suction toward the pool,
 * turned half round: its front toward the hall's south half and the
 * visitor coming round the tanks. Its footprint as drawn, about `PUMP`,
 * its set's length along x.
 */
export const PUMP = { x: 3.4, z: 0.4, yaw: Math.PI } as const;
export const PUMP_FOOT = { hw: 1.05, hd: 0.4, h: 1.44 } as const;
/**
 * The pump's nozzles, as drawn (`createEndSuctionPump`, turned half
 * round): its axial suction toward the pool, its discharge flange on top.
 */
export const PUMP_SUCTION = { x: PUMP.x + 1.0, y: 0.68, z: PUMP.z } as const;
export const PUMP_DISCHARGE = {
  x: PUMP.x + 0.57,
  y: 1.26,
  z: PUMP.z - 0.12,
} as const;
/** The dosing pot, in front of the header's end, and the tee by the pool. */
export const POT = { x: 5.6, z: 0.85, r: 0.2, h: 0.8 } as const;
export const TEE = { x: 5.6, z: 0.0, r: 0.07, h: 0.16 } as const;
/** The readout board on the west wall, south of the pool as the hall stands. */
export const READOUT = { z: -5.2, y: 2.35, h: 1.5, w: 2.96 } as const;
/** The Balance Beam against the west wall, north of the pool as the hall stands, facing into the hall. */
export const BEAM = { x: EAST - 0.25, z: 0.7 } as const;
export const CARDS_BOARD = { x: -4.3, y: 2.3 } as const;
/**
 * RESET, in the middle of the north wall as the hall stands, flush to it,
 * between the archways' approaches, facing into the hall.
 */
export const RESET = { x: 0, z: SOUTH - 0.25 } as const;
/** A lectern's footprint as drawn, facing +z: its tilted head overhangs its post. */
export const LECTERN_FOOT = { hw: 0.47, hd: 0.21 } as const;
/**
 * The lecterns, by station, each before or beside what it describes and
 * facing the visitor looking at it, numbered along the way round from the
 * arrival archway: the desk, the tanks, the swimmers (at the pool), the
 * readout, the challenge cards.
 */
export const LECTERNS: Record<number, { x: number; z: number; yaw: number }> = {
  1: { x: DESK.x - 1.55, z: DESK.z + 0.1, yaw: 0 },
  2: { x: 0.5, z: TANK_Z + 0.9, yaw: 0 },
  3: { x: POOL_FRONT - 0.9, z: POOL.z, yaw: -Math.PI / 2 },
  4: { x: POOL_FRONT + 0.2, z: READOUT.z + 0.2, yaw: -Math.PI / 2 },
  5: { x: CARDS_BOARD.x, z: NORTH + 1.3, yaw: 0 },
};
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
  z: TANK_Z - 0.4,
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
  const back = TANK_Z - 0.57;
  for (const t of TANKS) {
    const x = tankX(t.id);
    if (t.id === 'fresh')
      runs.push({
        edge: 'dose.fresh',
        od: 0.06,
        points: [
          [x, 0.16, TANK_Z],
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
          [x, H, TANK_Z],
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
      [SUCTION_X, PUMP_SUCTION.y, POOL.z + POOL.w / 2],
      [SUCTION_X, PUMP_SUCTION.y, PUMP_SUCTION.z],
      [PUMP_SUCTION.x, PUMP_SUCTION.y, PUMP_SUCTION.z],
    ],
  });
  runs.push({
    edge: 'poolDischarge',
    od: 0.11,
    points: [
      [PUMP_DISCHARGE.x, PUMP_DISCHARGE.y, PUMP_DISCHARGE.z],
      [PUMP_DISCHARGE.x, OVER, PUMP_DISCHARGE.z],
      [TEE.x, OVER, PUMP_DISCHARGE.z],
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
  const sampleZ = READOUT.z + READOUT.w / 2 - 0.3;
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
          ? [tankX(t.id), 0.16, TANK_Z - 0.4]
          : [tankX(t.id), H, TANK_Z - 0.31],
      along: [0, 0, -1],
    };
  places['pump.suction'] = {
    edge: 'poolOut',
    at: [PUMP_SUCTION.x + 0.45, PUMP_SUCTION.y, PUMP_SUCTION.z],
    along: [-1, 0, 0],
  };
  places['pump.nrv'] = {
    edge: 'poolDischarge',
    at: [PUMP_DISCHARGE.x + 0.3, OVER, PUMP_DISCHARGE.z],
    along: [1, 0, 0],
  };
  places['pump.discharge'] = {
    edge: 'poolDischarge',
    at: [PUMP_DISCHARGE.x + 0.75, OVER, PUMP_DISCHARGE.z],
    along: [1, 0, 0],
  };
  places['flow'] = {
    edge: 'poolDischarge',
    at: [TEE.x, 0.9, TEE.z],
    along: [0, -1, 0],
    upright: true,
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
    { minX: BUND.minX, maxX: BUND.maxX, minZ: BUND.minZ, maxZ: BUND.maxZ },
    r(DESK.x, DESK.z, DESK.w / 2, DESK.d / 2),
    {
      minX: PRINTER.x - PRINTER_FOOT.hw,
      maxX: PRINTER.x + PRINTER_FOOT.hw,
      minZ: PRINTER.z + PRINTER_FOOT.minZ,
      maxZ: PRINTER.z + PRINTER_FOOT.maxZ,
    },
    r(POT.x, POT.z, POT.r, POT.r),
    r(PUMP.x, PUMP.z, PUMP_FOOT.hw, PUMP_FOOT.hd),
    r(POOL.x, POOL.z, POOL.d / 2, POOL.w / 2),
    r(BEAM.x, BEAM.z, 0.25, 0.95),
    r(RESET.x, RESET.z, 0.25, 0.25),
    ...Object.values(LECTERNS).map(lecternFoot),
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
      [x - 0.22, BUND.h, TANK_Z - 0.22],
      [x + 0.22, 1.6, TANK_Z + 0.25],
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
        [POOL.x - POOL.d / 2, 0, POOL.z - POOL.w / 2],
        [POOL.x + POOL.d / 2, POOL.h, POOL.z + POOL.w / 2],
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
