import {
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  TorusGeometry,
} from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';

export type Vec3 = readonly [number, number, number];

/** Hangers this far apart along a level length, and none nearer its ends than this, metres. */
export const SUPPORT_SPACING = 1.5;
const FROM_END = 0.3;
/** Under this over the floor, a run stands on pipe stands rather than hanging. */
export const LOW = 2.0;

/**
 * Where a run's hangers go: along each of its level lengths, evenly, at
 * most `SUPPORT_SPACING` apart, clear of its bends. Pure.
 */
export function hangerPoints(
  points: readonly Vec3[],
): { at: Vec3; along: 'x' | 'z' }[] {
  const out: { at: Vec3; along: 'x' | 'z' }[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (Math.abs(a[1] - b[1]) > 1e-6) continue;
    const along = Math.abs(b[0] - a[0]) > Math.abs(b[2] - a[2]) ? 'x' : 'z';
    const length = Math.abs(along === 'x' ? b[0] - a[0] : b[2] - a[2]);
    if (length < 2 * FROM_END) continue;
    const n = Math.max(1, Math.ceil((length - 2 * FROM_END) / SUPPORT_SPACING));
    for (let k = 0; k <= n; k++) {
      const s = FROM_END + ((length - 2 * FROM_END) * k) / n;
      const t = s / length;
      out.push({
        at: [a[0] + (b[0] - a[0]) * t, a[1], a[2] + (b[2] - a[2]) * t],
        along,
      });
    }
  }
  return out;
}

/**
 * The supports for a run of pipe (round its lagging, if lagged): on each
 * level length every 1.5 m a split ring round the pipe, on a clevis
 * hanger and its galvanised drop rod up to `ceilingY`; or, a run low
 * down, on a pipe stand from the floor.
 */
export function supportPipe(
  kit: PanelKit,
  points: readonly Vec3[],
  {
    radius,
    ceilingY,
    floorY = 0,
  }: { radius: number; ceilingY: number; floorY?: number },
) {
  const group = new Group();
  group.name = 'pipe supports';
  const galv = new MeshStandardMaterial({
    color: '#a9aeae',
    roughness: 0.45,
    metalness: 0.6,
  });
  kit.materials.push(galv);
  for (const { at, along } of hangerPoints(points)) {
    const ring = new Mesh(
      new TorusGeometry(radius + 0.008, 0.007, 6, 20),
      galv,
    );
    ring.position.set(...at);
    ring.rotation.y = along === 'x' ? Math.PI / 2 : 0;
    // Low down, on a pipe stand from the floor: a post, its base plate,
    // the pipe in a clamp on its saddle.
    if (at[1] - floorY < LOW) {
      const bottom = at[1] - radius - 0.02;
      if (bottom <= floorY) continue;
      const post = new Mesh(
        new CylinderGeometry(0.02, 0.02, bottom - floorY, 8),
        galv,
      );
      post.position.set(at[0], (bottom + floorY) / 2, at[2]);
      const plate = new Mesh(new CylinderGeometry(0.07, 0.07, 0.01, 12), galv);
      plate.position.set(at[0], floorY + 0.005, at[2]);
      group.add(post, plate, ring);
      continue;
    }
    const top = at[1] + radius + 0.02;
    if (ceilingY <= top) continue;
    const rod = new Mesh(
      new CylinderGeometry(0.006, 0.006, ceilingY - top, 6),
      galv,
    );
    rod.position.set(at[0], (ceilingY + top) / 2, at[2]);
    const clevis = new Mesh(new CylinderGeometry(0.012, 0.012, 0.04, 8), galv);
    clevis.position.set(at[0], top, at[2]);
    group.add(rod, ring, clevis);
  }
  return group;
}
