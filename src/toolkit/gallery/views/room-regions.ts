import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  Vector3,
} from 'three';
import type { Material } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { tools } from '../../components/core/views/fitting-tools';
import { GANTRY, STAIR, fromWall } from '../logic/room-regions';
import type { Gantry, Region, RegionRoom } from '../logic/room-regions';

/**
 * A room's reserved regions, drawn (`logic/room-regions.ts`): its gantry
 * and the stair up to it, in galvanised steel with guard rails, the
 * gantry carried on knee braces from its wall so that nothing stands on
 * the floor under it; each walkway's edges painted yellow on the floor,
 * as plant rooms mark them; and, faintly, the space over the stair and
 * the gantry where no pipe may run, so the experiment can be seen.
 */
export function createRoomRegions(
  kit: PanelKit,
  room: RegionRoom,
  regions: readonly Region[],
  gantry: Gantry | null,
) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Reserved regions';
  const steel = t.paint('#9da3a3', 0.45, 0.55);
  const grating = t.paint('#6f7473', 0.6, 0.5);
  const yellow = t.paint('#e3c22a', 0.6);
  const ghost = new MeshBasicMaterial({
    color: '#59a8ff',
    transparent: true,
    opacity: 0.07,
    depthWrite: false,
  });
  kit.materials.push(ghost);

  /** A bar of square section `size` from `a` to `b`. */
  const bar = (
    a: Vector3,
    b: Vector3,
    size: number,
    material: Material = steel,
  ) => {
    const d = b.clone().sub(a);
    const length = d.length();
    if (length < 1e-4) return;
    const mesh = new Mesh(new BoxGeometry(size, length, size), material);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.copy(
      new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), d.normalize()),
    );
    group.add(mesh);
  };
  /** A box between two corners. */
  const block = (
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
    material: Material,
  ) =>
    t.box(
      group,
      material,
      Math.abs(x1 - x0),
      Math.abs(y1 - y0),
      Math.abs(z1 - z0),
      (x0 + x1) / 2,
      (y0 + y1) / 2,
      (z0 + z1) / 2,
    );

  // Walkways: a yellow line round each, on the floor.
  const line = 0.075;
  for (const r of regions) {
    if (r.kind !== 'walkway' && r.kind !== 'door') continue;
    const [x0, , z0] = r.min;
    const [x1, , z1] = r.max;
    const y = 0.003;
    block(x0, 0, z0, x1, y, z0 + line, yellow);
    block(x0, 0, z1 - line, x1, y, z1, yellow);
    block(x0, 0, z0, x0 + line, y, z1, yellow);
    block(x1 - line, 0, z0, x1, y, z1, yellow);
  }
  // The space kept clear of pipes over the stair and the gantry.
  for (const r of regions)
    if (r.kind === 'stair' || r.kind === 'gantry')
      block(r.min[0], r.min[1], r.min[2], r.max[0], r.max[1], r.max[2], ghost);

  if (!gantry) return group;
  const at = (s: number, off: number, y: number) => {
    const [x, z] = fromWall(room, gantry.wall, s, off);
    return new Vector3(x, y, z);
  };
  const c = gantry.climbs;
  const { from, to, risers } = gantry.stair;

  // The stair: open treads between two stringers, a rail on its open side.
  for (let i = 1; i < risers; i++) {
    const s0 = from + c * (i - 1) * STAIR.going;
    const a = at(s0, 0.03, i * STAIR.rise - 0.02);
    const b = at(s0 + c * STAIR.going, STAIR.width - 0.03, i * STAIR.rise);
    block(a.x, a.y, a.z, b.x, b.y, b.z, grating);
  }
  for (const off of [0.02, STAIR.width - 0.02]) {
    bar(at(from, off, 0), at(to, off, gantry.y), 0.05);
    bar(at(from, off, 0.9), at(to, off, gantry.y + 0.9), 0.035);
  }
  for (let s = from; (to - s) * c > -1e-6; s += c * 1.2) {
    const y = ((s - from) * c * gantry.y) / ((to - from) * c);
    bar(
      at(s, STAIR.width - 0.02, y),
      at(s, STAIR.width - 0.02, y + 0.9),
      0.035,
    );
  }

  // The gantry: its deck, a beam along its open edge, knee braces to the wall.
  const { y } = gantry;
  const d0 = at(gantry.deck.from, 0, y - 0.04);
  const d1 = at(gantry.deck.to, GANTRY.width, y);
  block(d0.x, d0.y, d0.z, d1.x, d1.y, d1.z, grating);
  bar(
    at(gantry.deck.from, GANTRY.width - 0.05, y - 0.15),
    at(gantry.deck.to, GANTRY.width - 0.05, y - 0.15),
    0.12,
  );
  const span = Math.abs(gantry.deck.to - gantry.deck.from);
  const bays = Math.max(1, Math.ceil(span / 2));
  for (let k = 0; k <= bays; k++) {
    const s =
      gantry.deck.from + ((gantry.deck.to - gantry.deck.from) * k) / bays;
    bar(at(s, 0, y - 1.1), at(s, GANTRY.width - 0.05, y - 0.2), 0.07);
    bar(at(s, 0.02, y - 0.2), at(s, GANTRY.width - 0.05, y - 0.2), 0.08);
    // Its guard rail's posts.
    bar(
      at(s, GANTRY.width - 0.03, y),
      at(s, GANTRY.width - 0.03, y + GANTRY.rail),
      0.045,
    );
  }
  for (const h of [GANTRY.rail, GANTRY.rail / 2])
    bar(
      at(gantry.deck.from, GANTRY.width - 0.03, y + h),
      at(gantry.deck.to, GANTRY.width - 0.03, y + h),
      0.04,
    );
  // The toe board.
  const k0 = at(gantry.deck.from, GANTRY.width - 0.04, y);
  const k1 = at(gantry.deck.to, GANTRY.width - 0.02, y + 0.15);
  block(k0.x, k0.y, k0.z, k1.x, k1.y, k1.z, steel);
  // Across the deck's end past the stair's width, where the stair arrives.
  for (const h of [GANTRY.rail, GANTRY.rail / 2])
    bar(
      at(gantry.deck.from, STAIR.width, y + h),
      at(gantry.deck.from, GANTRY.width - 0.03, y + h),
      0.04,
    );
  return group;
}
