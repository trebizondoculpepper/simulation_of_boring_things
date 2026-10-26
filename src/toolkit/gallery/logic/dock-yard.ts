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

export interface DockFrame {
  wallZ: number;
  thickness: number;
  /** The pier door's middle along the wall. */
  doorX: number;
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
  const building: Footprint[] = low
    ? [{ minX: -200, maxX: 200, minZ: outer, maxZ: 200 }]
    : [];
  return [...rails, ...ring, ...building];
}
