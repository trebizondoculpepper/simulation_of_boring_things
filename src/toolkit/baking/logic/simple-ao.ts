/**
 * SIMPLE ambient occlusion (`doc/reports/cheap-ambient-occlusion.md`, the
 * owner, 2026-10-30): the per-vertex occlusion worked out analytically,
 * once per room, from a few axis-aligned boxes instead of ray traced. The
 * room is its free space (`interiors`: the plan's rectangles, else the
 * shell's bounds) and its biggest solids (`occluders`: machines, plinths,
 * tanks, from their meshes' bounds). At each vertex, four taps along its
 * normal measure how near that box scene comes (distance-field occlusion,
 * after Quílez and Evans), so a three-way corner is darker than a two-way
 * junction, a junction darker than the open middle of a wall, and the
 * floor round a machine's foot darker than the floor away from it. In a
 * plant room the strength grows with distance from the nearest lamp.
 * The result is the same byte a vertex the ray-traced baker makes (255
 * open), so the same attribute, material patch, fade and cache take it.
 * Pure: plain arrays in, plain arrays out.
 */

/** An axis-aligned box, world units: min x, y, z then max x, y, z. */
export type Box = readonly [number, number, number, number, number, number];

/** How a kind of room's SIMPLE occlusion looks. */
export interface SimpleAoLook {
  /** How far a corner reaches, metres. */
  radius: number;
  /** How dark one junction gets (a wall's foot: about 1 - strength; a three-way corner about twice as dark). */
  strength: number;
  /** Extra strength far from every lamp, 0 none (plant rooms). */
  farBoost: number;
  /** From and to what distance from the nearest lamp it grows, metres. */
  farFrom: number;
  farTo: number;
  /** The longest edge a face keeps near a junction, metres. */
  maxEdge: number;
  /** The darkest it ever gets (0 black, 1 none), however many solids crowd round. */
  floor: number;
}

/**
 * Each kind of room's look: the museum subtle and clean (light is
 * everywhere, only concavities count), plant rooms grimier and darker
 * away from their lamps.
 */
export const SIMPLE_AO_LOOKS = {
  museum: {
    radius: 0.6,
    strength: 0.25,
    farBoost: 0,
    farFrom: 0,
    farTo: 1,
    maxEdge: 0.4,
    floor: 0.6,
  },
  standard: {
    radius: 0.6,
    strength: 0.25,
    farBoost: 0,
    farFrom: 0,
    farTo: 1,
    maxEdge: 0.4,
    floor: 0.55,
  },
  plant: {
    radius: 0.6,
    strength: 0.35,
    farBoost: 0.8,
    farFrom: 1.5,
    farTo: 5,
    maxEdge: 0.4,
    floor: 0.4,
  },
} as const satisfies Record<string, SimpleAoLook>;

/** Occluders taken at most. */
export const MAX_OCCLUDERS = 32;
/** Lamps weighed at most. */
export const MAX_LIGHTS = 16;

const extent = (b: Box, i: number) => b[i + 3] - b[i];
const volume = (b: Box) => extent(b, 0) * extent(b, 1) * extent(b, 2);

/** Whether `inner` lies within `outer` grown by `pad`. */
export function contains(outer: Box, inner: Box, pad = 0) {
  for (let i = 0; i < 3; i++)
    if (inner[i] < outer[i] - pad || inner[i + 3] > outer[i + 3] + pad)
      return false;
  return true;
}

/** The smallest box round all of `boxes` (the shell's bounds). */
export function boundsOf(boxes: readonly Box[]): Box | null {
  if (!boxes.length) return null;
  const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (const x of boxes)
    for (let i = 0; i < 3; i++) {
      b[i] = Math.min(b[i], x[i]);
      b[i + 3] = Math.max(b[i + 3], x[i + 3]);
    }
  return b as unknown as Box;
}

/** A mesh offered as an occluder: its world bounds and what is known of its shape. */
export interface OccluderCandidate {
  box: Box;
  /**
   * Its surface area over its box's (1 or more for a solid block; a long
   * L of pipe or a run of cable fills its box far less).
   */
  fill?: number;
  /** Marked as never occluding (cables, conduits, signs, labels, decals). */
  excluded?: boolean;
}

/** What makes an occluder: big and solid (the owner, 2026-10-30). Metres. */
export const OCCLUDER_RULES = {
  /** Its smallest side at least this, so thin things, however long, are not. */
  minThickness: 0.2,
  /** Its volume at least this, cubic metres. */
  minVolume: 0.05,
  /** Its surface at least this share of its box's: a solid, not a sprawl. */
  minFill: 0.5,
  /** Never spanning more than this share of the room along any axis. */
  maxSpan: 0.5,
} as const;

/**
 * The occluders worth weighing, biggest first, at most `max`: only big,
 * solid things (machines, tanks, plinths, cabinets, large pipes and
 * ducts). Refused: anything marked excluded; anything whose smallest side
 * is under `minThickness` or volume under `minVolume`; a sprawl that fills
 * little of its box (a run of pipe, a merged tangle); anything spanning
 * much of the room (a wall, floor or ceiling slab, a merged mesh across
 * it); anything already inside a chosen one. `unit` is scene units a metre.
 */
export function chooseOccluders(
  candidates: readonly OccluderCandidate[],
  interiors: readonly Box[],
  unit: number,
  max = MAX_OCCLUDERS,
  rules = OCCLUDER_RULES,
): Box[] {
  const spansRoom = (b: Box) =>
    interiors.some((r) => {
      for (let i = 0; i < 3; i++)
        if (extent(b, i) > rules.maxSpan * extent(r, i)) return true;
      return false;
    });
  const solid = candidates
    .filter(({ box: b, fill = 1, excluded }) => {
      if (excluded || fill < rules.minFill) return false;
      const thin = Math.min(extent(b, 0), extent(b, 1), extent(b, 2));
      if (thin < rules.minThickness * unit) return false;
      if (volume(b) < rules.minVolume * unit ** 3) return false;
      return !spansRoom(b);
    })
    .map((c) => c.box)
    .sort((a, b) => volume(b) - volume(a));
  const chosen: Box[] = [];
  for (const b of solid) {
    if (chosen.length >= max) break;
    if (chosen.some((c) => contains(c, b, 0.02 * unit))) continue;
    chosen.push(b);
  }
  return chosen;
}

/** Signed distance from (x, y, z) to box `b` (negative inside). */
export function boxDistance(x: number, y: number, z: number, b: Box) {
  const qx = Math.abs(x - (b[0] + b[3]) / 2) - (b[3] - b[0]) / 2;
  const qy = Math.abs(y - (b[1] + b[4]) / 2) - (b[4] - b[1]) / 2;
  const qz = Math.abs(z - (b[2] + b[5]) / 2) - (b[5] - b[2]) / 2;
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  const oz = Math.max(qz, 0);
  return (
    Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, qy, qz), 0)
  );
}

/** A room described for SIMPLE occlusion, world units. */
export interface SimpleAoScene {
  interiors: readonly Box[];
  occluders: readonly Box[];
  /** Lamps' positions, x, y, z each. */
  lights: ArrayLike<number>;
  /** Scene units a metre. */
  unit: number;
  look: SimpleAoLook;
}

/** One solid's share of the occlusion: four taps along the normal, nearer ones weighing more. */
function taps(radius: number, distance: (h: number) => number) {
  let occ = 0;
  let weight = 1;
  for (let k = 1; k <= 4; k++) {
    const h = radius * k * 0.25;
    occ += (weight * (h - Math.min(Math.max(distance(h), 0), h))) / radius;
    weight *= 0.6;
  }
  return occ;
}

/**
 * Occlusion at one surface point (1 open, toward 0 shut in). `near` are
 * the occluders worth testing here (all, or those near its mesh). Each
 * wall, floor and ceiling of the interior it is in adds its own share, and
 * the occluders one more between them, so a three-way corner (two walls over a floor) is
 * darker than a junction of two. Boxes the point is on or in (its own)
 * are left out, so a machine never shades itself; outside every interior
 * (a neighbour's hall, the far side of a wall), the room's planes are left
 * out too.
 */
export function simpleOcclusion(
  px: number,
  py: number,
  pz: number,
  nx: number,
  ny: number,
  nz: number,
  scene: SimpleAoScene,
  near: readonly Box[] = scene.occluders,
) {
  const radius = scene.look.radius * scene.unit;
  const own = radius * 0.02;
  // How far a surface may stand off the plan's planes and still be one of
  // them (a wall's face a little outside or inside the plan's line).
  const slack = 0.3 * scene.unit;
  let occ = 0;
  // The interior it is in (the deepest, where several overlap).
  let room: Box | null = null;
  let deepest = -slack;
  for (const r of scene.interiors) {
    const f = -boxDistance(px, py, pz, r);
    if (f >= deepest) {
      deepest = f;
      room = r;
    }
  }
  if (room) {
    const r = room;
    const p = [px, py, pz];
    const n = [nx, ny, nz];
    for (let i = 0; i < 3; i++) {
      // Its two planes on this axis, each a solid of its own: the one the
      // point lies on is never reached by moving off it along the normal.
      if (n[i] < 0.9 || p[i] - r[i] > slack)
        occ += taps(radius, (h) => p[i] + n[i] * h - r[i]);
      if (n[i] > -0.9 || r[i + 3] - p[i] > slack)
        occ += taps(radius, (h) => r[i + 3] - (p[i] + n[i] * h));
    }
  }
  // The occluders together as a union (each a share of what is left open),
  // so a crowd of beams or pipes never adds up past one solid wall.
  let open = 1;
  for (const b of near) {
    if (boxDistance(px, py, pz, b) <= own) continue;
    const o = taps(radius, (h) =>
      boxDistance(px + nx * h, py + ny * h, pz + nz * h, b),
    );
    open *= 1 - Math.min(1, o);
  }
  occ += 1 - open;
  let strength = scene.look.strength;
  const { lights, look } = scene;
  if (look.farBoost > 0 && lights.length >= 3) {
    let nearest = Infinity;
    for (let i = 0; i + 2 < lights.length; i += 3)
      nearest = Math.min(
        nearest,
        Math.hypot(px - lights[i], py - lights[i + 1], pz - lights[i + 2]),
      );
    const a = look.farFrom * scene.unit;
    const b = look.farTo * scene.unit;
    const t = Math.min(1, Math.max(0, (nearest - a) / (b - a)));
    strength *= 1 + look.farBoost * t * t * (3 - 2 * t);
  }
  return Math.min(1, Math.max(scene.look.floor, 1 - occ * strength));
}

/** The occluders within reach of a mesh's world bounds. */
export function occludersNear(bounds: Box, scene: SimpleAoScene) {
  const reach = scene.look.radius * scene.unit;
  const grown: Box = [
    bounds[0] - reach,
    bounds[1] - reach,
    bounds[2] - reach,
    bounds[3] + reach,
    bounds[4] + reach,
    bounds[5] + reach,
  ];
  return scene.occluders.filter((b) => {
    for (let i = 0; i < 3; i++)
      if (b[i] > grown[i + 3] || b[i + 3] < grown[i]) return false;
    return true;
  });
}

/** Every vertex's occlusion, one byte each (255 open), as the baker stores it. */
export function simpleVertexAo(
  positions: Float32Array,
  normals: Float32Array,
  scene: SimpleAoScene,
  near: readonly Box[] = scene.occluders,
) {
  const out = new Uint8Array(positions.length / 3);
  for (let v = 0; v < out.length; v++) {
    const i = v * 3;
    out[v] = Math.round(
      255 *
        simpleOcclusion(
          positions[i],
          positions[i + 1],
          positions[i + 2],
          normals[i],
          normals[i + 1],
          normals[i + 2],
          scene,
          near,
        ),
    );
  }
  return out;
}
