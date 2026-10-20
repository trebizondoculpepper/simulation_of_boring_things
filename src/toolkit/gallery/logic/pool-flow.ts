import {
  POOL_OUTLINE,
  POOL_RECTS,
  WALL_FITTINGS,
  inPool,
} from './pool-room-plan';

/**
 * How the water moves in dev11's pool, for its flow-map ripples (Vlachos's
 * flow-map water, `components/pool/logic/flow-map.ts`). The circulation of
 * a deck-level pool: the filtered water comes back through the wall
 * inlets in the back pool, each a jet that slows and spreads; the back
 * pool's water drifts up the channel into the main pool; and all of it
 * spreads slowly outward to the overflow at the edge, quickening as it
 * nears it. Pure: metres, metres a second, (x, z).
 */

/** The fastest the flow map holds, metres a second. */
export const POOL_FLOW_MAX = 0.35;

/** The area the flow map covers: the pool's bounding box, metres. */
export const POOL_FLOW_RECT = (() => {
  const xs = POOL_RECTS.flatMap((r) => [r.minX, r.maxX]);
  const zs = POOL_RECTS.flatMap((r) => [r.minZ, r.maxZ]);
  return {
    minX: Math.min(...xs),
    minZ: Math.min(...zs),
    w: Math.max(...xs) - Math.min(...xs),
    d: Math.max(...zs) - Math.min(...zs),
  };
})();

/** The nearest point on the pool's edge to (x, z). */
function nearestEdge(x: number, z: number): [number, number] {
  let best: [number, number] = [x, z];
  let bestD = Infinity;
  const n = POOL_OUTLINE.length;
  for (let i = 0; i < n; i++) {
    const [ax, az] = POOL_OUTLINE[i],
      [bx, bz] = POOL_OUTLINE[(i + 1) % n];
    const dx = bx - ax,
      dz = bz - az;
    const t = Math.max(
      0,
      Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)),
    );
    const px = ax + dx * t,
      pz = az + dz * t;
    const d = Math.hypot(x - px, z - pz);
    if (d < bestD) {
      bestD = d;
      best = [px, pz];
    }
  }
  return best;
}

const CHANNEL = POOL_RECTS[1];
const BACK = POOL_RECTS[2];

export function poolFlow(x: number, z: number): [number, number] {
  if (!inPool(x, z)) return [0, 0];
  let fx = 0,
    fz = 0;
  // The inlets' jets: fast at the wall, slowing and widening as they go.
  for (const inlet of WALL_FITTINGS.filter((f) => f.kind === 'inlet')) {
    const [ux, uz] = inlet.facing;
    const along = (x - inlet.x) * ux + (z - inlet.z) * uz;
    if (along < 0) continue;
    const across = (x - inlet.x) * -uz + (z - inlet.z) * ux;
    const width = 0.25 + 0.3 * along;
    const strength =
      0.3 * Math.exp(-along / 2.2) * Math.exp(-((across / width) ** 2));
    fx += ux * strength;
    fz += uz * strength;
  }
  // The back pool drifts to the channel's mouth, and the channel carries
  // it north into the main pool.
  const inBack =
    x > BACK.minX && x < BACK.maxX && z > BACK.minZ && z < BACK.maxZ;
  if (inBack) {
    const dx = 0 - x,
      dz = CHANNEL.minZ - z;
    const l = Math.hypot(dx, dz) || 1;
    fx += (dx / l) * 0.03;
    fz += (dz / l) * 0.03;
  }
  if (
    x > CHANNEL.minX &&
    x < CHANNEL.maxX &&
    z > CHANNEL.minZ &&
    z < CHANNEL.maxZ
  )
    fz += 0.06;
  // Everywhere, a slow spread to the overflow, quickening near the edge.
  const [ex, ez] = nearestEdge(x, z);
  const d = Math.hypot(ex - x, ez - z);
  if (d > 1e-6) {
    const pull = 0.015 + 0.05 * Math.exp(-d / 0.6);
    fx += ((ex - x) / d) * pull;
    fz += ((ez - z) / d) * pull;
  }
  const speed = Math.hypot(fx, fz);
  if (speed > POOL_FLOW_MAX) {
    fx *= POOL_FLOW_MAX / speed;
    fz *= POOL_FLOW_MAX / speed;
  }
  return [fx, fz];
}

/** The flow in the flow map's own coordinates: u, v from 0 to 1 over its rect. */
export const poolFlowUv = (u: number, v: number): [number, number] =>
  poolFlow(
    POOL_FLOW_RECT.minX + u * POOL_FLOW_RECT.w,
    POOL_FLOW_RECT.minZ + v * POOL_FLOW_RECT.d,
  );
