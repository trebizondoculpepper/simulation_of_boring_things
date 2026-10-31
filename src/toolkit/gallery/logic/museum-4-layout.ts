import { TANKS } from "../../../game/plant/museum-4-lab";
import type { LinkId, TankId } from "../../../game/plant/museum-4-lab";
import { hallColumns, hallInterior, hallOrigin } from "./museum-plan";

/**
 * Hall 4's layout (107d), by hand: laid out along the north wall, facing
 * south: the ten tanks on a bund on the west, the dosing desk with its
 * mimic above it and the teleprinter in the middle, the dosing pot and
 * the ideal pool on the east with its readout board on the east wall; the
 * Balance Beam in front of the pool; the lecterns along the visitors'
 * side. Each pipe is one of the schematic's links. Pure; metres in the
 * hall's frame (its middle the origin, y up, north −z).
 *
 * Layout C (112, the owner, 2026-10-30: "just put everything that is on
 * the door side on the opposite side of the hall"): both archways are now
 * in the north wall, near its ends, so the whole exhibit stands turned
 * half round about the hall's middle (`STANDS`): along the south wall,
 * facing north, its readout board on the west wall, the walk along the
 * north side from archway to archway. Everything here is as laid out; the
 * exhibit turns it, and `placedFootprints` gives its footprints turned.
 */
export const STANDS = { turn: Math.PI } as const;

export const INTERIOR = (() => {
  const i = hallInterior("museum4");
  const o = hallOrigin("museum4");
  return {
    minX: i.minX - o.x,
    maxX: i.maxX - o.x,
    minZ: i.minZ - o.z,
    maxZ: i.maxZ - o.z,
  };
})();
export const COLUMNS = hallColumns("museum4");
/** The walk from archway to archway, kept clear. */
export const WALKWAY = { minZ: -1.9, maxZ: 1.9 } as const;

/**
 * The north and east walls' inside faces: the mimic, the challenge cards
 * board and the readout board have their backs at their origins, so they
 * hang with their backs on the wall (the audit, 2026-10-31: they stood
 * 40 mm off it, with nothing behind them).
 */
export const NORTH = INTERIOR.minZ;
export const EAST = INTERIOR.maxX;

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
/** The teleprinter on its own stand, as drawn: its footprint about `PRINTER`. */
export const PRINTER_FOOT = { hw: 0.33, minZ: -0.06, maxZ: 0.5 } as const;
export const POT = { x: 2.7, z: -6.25, r: 0.2, h: 0.8 } as const;
export const PUMP = { x: 3.55, z: -4.7 } as const;
/**
 * The pump's front (its motor's side, gauges and nameplate) faces west
 * here, east as the exhibit stands: neither the wall nor the hall's middle
 * is clear-cut for a machine set across the pool's suction, and east it
 * faces a visitor coming in by the arrival archway and the hall's middle
 * (the facing rule). Its footprint as drawn, about `PUMP`.
 */
export const PUMP_FOOT = { hw: 0.4, hd: 1.05, h: 1.44 } as const;
export const TEE = { x: 3.55, z: -6.25, r: 0.07, h: 0.16 } as const;
export const POOL = { x: 5.7, z: -5.1, w: 3.4, d: 2.4, h: 1.3 } as const;
export const READOUT = { z: -4.2, y: 2.35, h: 1.5, w: 2.96 } as const;
export const BEAM = { x: 5.4, z: -2.85 } as const;
export const CARDS_BOARD = { x: -4.3, y: 2.3 } as const;
/**
 * The entrance panel, on the north wall beside the arrival archway
 * (museum3's, at x −5.5), facing into the hall, clear of the archway's
 * approach and its floor arrows, and east of the call point and bulkhead
 * beside it (`museum-safety.ts`). It belongs to the archways, not the
 * exhibit, so it is given as the hall stands, outside `STANDS`' turn.
 */
export const ENTRANCE = { x: -1.3, w: 1.9, y: 1.65 } as const;
/** RESET, beside the desk where it is used (in the exhibit’s frame, turned); lectern 2 stands west of it, so it hides neither. */
export const RESET = { x: -0.55, z: -5.05 } as const;
/** A lectern's footprint as drawn: its tilted head overhangs its post. */
export const LECTERN_FOOT = { hw: 0.47, hd: 0.21 } as const;
/** The lecterns, by station, each facing south toward the visitor. */
export const LECTERNS: Record<number, { x: number; z: number }> = {
  1: { x: -4.4, z: -4.2 },
  2: { x: -1.7, z: -3.9 },
  3: { x: 7.0, z: -2.3 },
  4: { x: 3.6, z: -3.3 },
  5: { x: 1.8, z: -3.6 },
};

const Y = 0.2;
/** The make-up's spout, over the pool's rim and above its water. */
export const FRESH_SPOUT = { x: POOL.x - POOL.w / 2 + 0.25, y: POOL.h - 0.05 };
const H = 0.25;
type V3 = [number, number, number];
/** Each link's run, in the hall's frame. */
export function pipeRuns(): { edge: LinkId; od: number; points: V3[] }[] {
  const runs: { edge: LinkId; od: number; points: V3[] }[] = [];
  for (const t of TANKS) {
    const x = tankX(t.id);
    if (t.id === "fresh")
      runs.push({
        edge: "dose.fresh",
        od: 0.06,
        points: [
          [x, 0.16, TANK_Z],
          [x, 0.16, -6.62],
          [POOL.x - POOL.w / 2 - 0.1, 0.16, -6.62],
          [POOL.x - POOL.w / 2 - 0.1, POOL.h + 0.25, -6.62],
          [POOL.x - POOL.w / 2 - 0.1, POOL.h + 0.25, -6.0],
          // Over the rim, and down to its spout above the water.
          [FRESH_SPOUT.x, POOL.h + 0.25, -6.0],
          [FRESH_SPOUT.x, FRESH_SPOUT.y, -6.0],
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
    edge: "header",
    od: 0.04,
    points: [
      [tankX("hypo"), Y, -6.45],
      [POT.x - POT.r - 0.1, Y, -6.45],
      [POT.x - POT.r - 0.1, Y, POT.z],
      [POT.x - POT.r, Y, POT.z],
    ],
  });
  runs.push({
    edge: "injection",
    od: 0.03,
    points: [
      [POT.x + POT.r, Y, POT.z],
      [TEE.x, Y, TEE.z],
    ],
  });
  runs.push({
    edge: "poolOut",
    od: 0.11,
    points: [
      [POOL.x - POOL.w / 2, 0.3, PUMP.z],
      [PUMP.x + 0.3, 0.3, PUMP.z],
    ],
  });
  runs.push({
    edge: "poolDischarge",
    od: 0.11,
    points: [
      [PUMP.x, 0.45, PUMP.z - 0.25],
      [PUMP.x, 0.45, TEE.z + TEE.r],
      [TEE.x, Y, TEE.z + TEE.r],
    ],
  });
  runs.push({
    edge: "poolReturn",
    od: 0.11,
    points: [
      [TEE.x, Y, TEE.z],
      [POOL.x - POOL.w / 2, Y, TEE.z],
    ],
  });
  runs.push({
    edge: "sample",
    od: 0.015,
    points: [
      [POOL.x + POOL.w / 2, 1.0, READOUT.z],
      [EAST - 0.03, 1.0, READOUT.z],
      [EAST - 0.03, READOUT.y - READOUT.h / 2, READOUT.z],
    ],
  });
  return runs;
}

/** Every footprint on the floor, in the exhibit's frame, for the walker and the test (the entrance panel hangs on the wall). */
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
    r(POOL.x, POOL.z, POOL.w / 2, POOL.d / 2),
    r(BEAM.x, BEAM.z, 0.95, 0.25),
    r(RESET.x, RESET.z, 0.25, 0.25),
    ...Object.values(LECTERNS).map((l) =>
      r(l.x, l.z, LECTERN_FOOT.hw, LECTERN_FOOT.hd),
    ),
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
  | { kind: "box"; min: V3; max: V3 }
  | { kind: "cyl"; x: number; z: number; r: number; y0: number; y1: number };
const box = (min: V3, max: V3): Shape => ({ kind: "box", min, max });
/** Each node a pipe meets, its solid as drawn, in the exhibit's frame. */
export function nodeShape(node: string): Shape {
  if (node.startsWith("tank.")) {
    const x = tankX(node.slice(5) as TankId);
    return box(
      [x - 0.22, BUND.h, TANK_Z - 0.22],
      [x + 0.22, 1.6, TANK_Z + 0.25],
    );
  }
  switch (node) {
    case "header":
      return box(
        [tankX(TANKS[0].id) - 0.02, Y - 0.02, -6.47],
        [POT.x, Y + 0.02, POT.z],
      );
    case "pot":
      return { kind: "cyl", x: POT.x, z: POT.z, r: POT.r, y0: 0, y1: POT.h };
    case "injection":
      return {
        kind: "cyl",
        x: TEE.x,
        z: TEE.z,
        r: TEE.r,
        y0: Y - TEE.h / 2,
        y1: Y + TEE.h / 2,
      };
    case "pump":
      return box(
        [PUMP.x - PUMP_FOOT.hw, 0, PUMP.z - PUMP_FOOT.hd],
        [PUMP.x + PUMP_FOOT.hw, PUMP_FOOT.h, PUMP.z + PUMP_FOOT.hd],
      );
    case "pool":
      return box(
        [POOL.x - POOL.w / 2, 0, POOL.z - POOL.d / 2],
        [POOL.x + POOL.w / 2, POOL.h, POOL.z + POOL.d / 2],
      );
    case "analyser":
      return box(
        [EAST - 0.17, READOUT.y - READOUT.h / 2, READOUT.z - READOUT.w / 2],
        [EAST, READOUT.y + READOUT.h / 2, READOUT.z + READOUT.w / 2],
      );
  }
  throw new Error(`no shape for ${node}`);
}

/** How far a point is from a node's solid (0 inside it). */
export function distanceTo(shape: Shape, p: V3): number {
  if (shape.kind === "box") {
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
