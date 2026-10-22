import { layoutRoom } from './room-equipment';
import {
  pipeObstacles,
  roomIsolators,
  roomPipes,
  standFootprint,
} from './room-pipes';
import type { Footprint } from '../../controls/logic/walk-collision';

/** The ozone monitor's post's footprint, square, metres. */
export const MONITOR_POST = 0.24;

const overlap = (a: Footprint, b: Footprint) =>
  a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;

/**
 * Where a plant room's ozone monitor stands: on its own post beside its
 * ozone generator, in line with it, at the nearest place off either end
 * that is clear of the room's low pipework (its risers too), its
 * isolators' stands and its other machines, and inside the room. Given in
 * the generator's own frame (x along it, from its middle); null if the
 * room has no generator, or nowhere near it is clear. Pure.
 */
export function ozoneMonitorPlace(room: string): { x: number } | null {
  const layout = layoutRoom(room);
  const generator = layout?.placed.find((p) =>
    p.item.key.startsWith('ozone-generator'),
  );
  if (!layout || !generator) return null;
  const obstacles: Footprint[] = [
    ...pipeObstacles(roomPipes(room)),
    ...roomIsolators(room).stands.map(standFootprint),
    ...layout.placed
      .filter((p) => p !== generator && p.item.mount === 'floor')
      .map((p) => p.footprint),
  ];
  const { w, d } = layout.box;
  const along: [number, number] = [
    Math.cos(generator.yaw),
    -Math.sin(generator.yaw),
  ];
  const half = MONITOR_POST / 2;
  for (let gap = 0.3; gap <= 2 + 1e-9; gap += 0.1)
    for (const side of [1, -1]) {
      const x = side * (generator.item.w / 2 + gap);
      const cx = generator.x + along[0] * x;
      const cz = generator.z + along[1] * x;
      const post = {
        minX: cx - half,
        maxX: cx + half,
        minZ: cz - half,
        maxZ: cz + half,
      };
      const inside =
        post.minX > -w / 2 &&
        post.maxX < w / 2 &&
        post.minZ > -d / 2 &&
        post.maxZ < d / 2;
      if (inside && !obstacles.some((o) => overlap(o, post))) return { x };
    }
  return null;
}
