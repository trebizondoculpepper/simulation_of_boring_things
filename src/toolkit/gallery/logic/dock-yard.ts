import type { Footprint } from '../../controls/logic/walk-collision';

/**
 * Walking from the loading dock out to the goods yard (prompts 073, 080;
 * the owner, 2026-10-26: one model for now): out through the pier's fire
 * exit door onto a landing level with the dock's floor, down a flight of
 * steps between handrails to the tarmac, 1.2 m below, and about the yard
 * no further than a circle about 50 m across round the steps' foot; the
 * end of the universe. Pure: metres in the dock's frame, its middle at the
 * origin, its floor at y = 0, x east, z south; its outside wall's inside
 * face at z = `wallZ`, `thickness` thick.
 */

export const YARD = {
  level: -1.2,
  /** The landing outside the door, and the flight down from it. */
  width: 1.5,
  landing: 1.2,
  risers: 7,
  going: 0.28,
  /** The yard's limit: a circle this wide round the steps' foot. */
  across: 50,
} as const;

/**
 * The site's intake on the building's outside wall, left of the dock
 * (prompt 083): each service's place along the wall, x, and the wall's
 * outer face, z (the dock's own: 6 m deep inside, a 0.2 m wall).
 */
export const INTAKE = {
  wallZ: -6.2,
  water: -9.8,
  gas: -13.2,
  power: -16.2,
} as const;

/** What the intake stands in the way of, down in the yard: its devices and its bollards. */
export function intakeSolids(): Footprint[] {
  const z = INTAKE.wallZ;
  return [
    {
      minX: INTAKE.power - 0.5,
      maxX: INTAKE.water + 0.2,
      minZ: z - 0.5,
      maxZ: z,
    },
    ...[
      INTAKE.power - 1.0,
      (INTAKE.power + INTAKE.gas) / 2,
      (INTAKE.gas + INTAKE.water) / 2,
      INTAKE.water + 0.7,
    ].map((x) => ({
      minX: x - 0.1,
      maxX: x + 0.1,
      minZ: z - 1.9,
      maxZ: z - 1.7,
    })),
  ];
}

/**
 * The goods yard's dressing (prompt 083; the owner, 2026-10-26: what a
 * yard holds), right of the dock as seen from inside (left as one faces
 * the building), clear of the bays and the steps: each piece's kind, its
 * place (x, z), its turn, and its footprint (w along x, d along z).
 */
export const YARD_DRESSING = [
  { kind: 'planter', x: 6.0, z: -6.6, yaw: 0, w: 0.6, d: 0.6 },
  { kind: 'planter', x: 6.9, z: -6.6, yaw: 0, w: 0.6, d: 0.6 },
  { kind: 'bin-general', x: 8.6, z: -6.8, yaw: Math.PI, w: 1.3, d: 1.0 },
  { kind: 'bin-recycling', x: 10.1, z: -6.8, yaw: Math.PI, w: 1.3, d: 1.0 },
  { kind: 'cardboard', x: 11.7, z: -6.85, yaw: 0, w: 1.2, d: 1.0 },
  { kind: 'crates', x: 12.8, z: -6.6, yaw: 0.2, w: 0.6, d: 0.5 },
  { kind: 'crates-green', x: 13.4, z: -6.55, yaw: -0.1, w: 0.6, d: 0.5 },
  { kind: 'lpg', x: 15.0, z: -6.7, yaw: Math.PI, w: 1.5, d: 0.8 },
  { kind: 'grit', x: 16.6, z: -6.6, yaw: Math.PI, w: 0.95, d: 0.66 },
  { kind: 'skip', x: 12.0, z: -11.0, yaw: 0.08, w: 2.0, d: 1.4 },
  // The dock's empty pallets, out of its way (the owner, 2026-10-26).
  { kind: 'pallets', x: 13.9, z: -11.3, yaw: -0.15, w: 1.2, d: 1.2 },
  { kind: 'cone', x: 9.6, z: -10.2, yaw: 0, w: 0.4, d: 0.4 },
  { kind: 'cone', x: 9.9, z: -11.6, yaw: 0, w: 0.4, d: 0.4 },
  { kind: 'pallets', x: 15.4, z: -9.8, yaw: 0.3, w: 1.2, d: 1.2 },
] as const;

/** What the dressing stands in the way of. */
export function dressingSolids(): Footprint[] {
  return YARD_DRESSING.map((p) => ({
    minX: p.x - p.w / 2,
    maxX: p.x + p.w / 2,
    minZ: p.z - p.d / 2,
    maxZ: p.z + p.d / 2,
  }));
}

export interface DockFrame {
  wallZ: number;
  thickness: number;
  /** The pier door's middle along the wall. */
  doorX: number;
  /** The lorry channels, sunk to the yard's level, open to it through the wall. */
  channels?: readonly Footprint[];
}

/** Where the landing, the flight and the steps' foot are. */
export function dockSteps(f: DockFrame) {
  const outer = f.wallZ - f.thickness;
  const half = YARD.width / 2;
  const landing = {
    minX: f.doorX - half,
    maxX: f.doorX + half,
    minZ: outer - YARD.landing,
    maxZ: outer,
  };
  const flight = {
    minX: f.doorX - half,
    maxX: f.doorX + half,
    minZ: landing.minZ - YARD.risers * YARD.going,
    maxZ: landing.minZ,
  };
  return { outer, landing, flight, foot: { x: f.doorX, z: flight.minZ } };
}

/** The floor at (x, z): the dock's, the landing's, a step's, or the yard's. */
export function dockFloorAt(f: DockFrame, x: number, z: number): number {
  const { outer, landing, flight } = dockSteps(f);
  const within = (r: Footprint) => x >= r.minX && x <= r.maxX;
  // In a lorry channel, or its opening through the wall: the yard's level
  // (the owner, 2026-10-26: walked into from the tarmac).
  for (const c of f.channels ?? [])
    if (within(c) && z >= outer && z <= c.maxZ) return YARD.level;
  // Inside, and in the door's opening through the wall: the dock's floor.
  if (z >= outer) return 0;
  if (within(landing) && z >= landing.minZ) return 0;
  if (within(flight) && z >= flight.minZ) {
    // Each step down from the landing's edge.
    const k = Math.ceil((landing.minZ - z) / YARD.going);
    const rise = -YARD.level / YARD.risers;
    return -Math.min(YARD.risers, k) * rise;
  }
  return YARD.level;
}

/**
 * What stops the walker beyond the dock's own walls: the handrails along
 * the landing and the flight; the yard's limit, a ring of short lengths;
 * and down in the yard, the building itself (`low`), so the walker can
 * only come back in by the steps.
 */
export function dockYardSolids(f: DockFrame, low: boolean): Footprint[] {
  const { outer, landing, flight, foot } = dockSteps(f);
  const t = 0.05;
  const rails: Footprint[] = [landing.minX - t, landing.maxX].map((x) => ({
    minX: x,
    maxX: x + t,
    minZ: flight.minZ + 0.3,
    maxZ: outer,
  }));
  const ring: Footprint[] = [];
  const r = YARD.across / 2;
  const n = 64;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const cx = foot.x + Math.cos(a) * r;
    const cz = foot.z + Math.sin(a) * r;
    const s = (Math.PI * r) / n + 0.2;
    ring.push({ minX: cx - s, maxX: cx + s, minZ: cz - s, maxZ: cz + s });
  }
  // Down at the yard's level, the building is solid but for its lorry
  // channels, walked into from the tarmac; up on the dock's floor, the
  // channels are the drop, kept out of.
  const channels = [...(f.channels ?? [])].sort((a, b) => a.minX - b.minX);
  const building: Footprint[] = [];
  if (low) {
    let from = -200;
    for (const c of channels) {
      building.push({ minX: from, maxX: c.minX, minZ: outer, maxZ: 200 });
      building.push({ minX: c.minX, maxX: c.maxX, minZ: c.maxZ, maxZ: 200 });
      from = c.maxX;
    }
    building.push({ minX: from, maxX: 200, minZ: outer, maxZ: 200 });
  } else building.push(...channels.map((c) => ({ ...c, minZ: outer })));
  return [
    ...rails,
    ...ring,
    ...building,
    ...(low ? [...intakeSolids(), ...dressingSolids()] : []),
  ];
}
