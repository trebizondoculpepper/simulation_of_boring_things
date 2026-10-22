import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import type { Material } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { mergeStatic } from '../../components/core/views/merge-static';
import type { Containment, WallEntry } from '../logic/cable-containment';

/**
 * Cable containment as `logic/cable-containment.ts` lays it out:
 * heavy-duty galvanised cable ladder (two flanged side rails, a rung
 * every 300 mm, its cables laid along it in black, hung on threaded rods
 * to the roof), steel trunking with a coupler every metre, and a
 * fire-stopped collar where a length goes into a wall. All of it still,
 * so it is drawn in a few merged meshes.
 */
export function createContainment(
  kit: PanelKit,
  runs: readonly Containment[],
  entries: readonly WallEntry[],
  roof: number,
  floorY = 0,
) {
  const group = new Group();
  group.name = 'cable containment';
  const paint = (color: string, roughness = 0.5, metalness = 0.6) => {
    const m = new MeshStandardMaterial({ color, roughness, metalness });
    kit.materials.push(m);
    return m;
  };
  const galv = paint('#a9b0b1');
  const steel = paint('#8f979a', 0.45, 0.6);
  const cable = paint('#17191a', 0.7, 0.05);
  const collar = paint('#5d6366', 0.6, 0.3);
  const fire = paint('#b8402f', 0.8, 0);
  const box = (
    m: Material,
    sx: number,
    sy: number,
    sz: number,
    x: number,
    y: number,
    z: number,
    name = '',
  ) => {
    const mesh = new Mesh(new BoxGeometry(sx, sy, sz), m);
    mesh.position.set(x, floorY + y, z);
    mesh.name = name;
    group.add(mesh);
    return mesh;
  };
  for (const r of runs) {
    const [x0, y0, z0] = r.from;
    const [x1, y1, z1] = r.to;
    const alongX = Math.abs(x1 - x0) > 1e-6;
    const rising = Math.abs(y1 - y0) > 1e-6;
    if (rising) {
      // Trunking up a wall: its broad face to the room.
      const len = Math.abs(y1 - y0);
      const across = r.facing === 'x';
      const sx = across ? r.depth : r.width;
      const sz = across ? r.width : r.depth;
      box(steel, sx, len, sz, x0, (y0 + y1) / 2, z0, r.name);
      for (let s = 1; s < len; s += 1)
        box(galv, sx + 0.01, 0.04, sz + 0.01, x0, Math.min(y0, y1) + s, z0);
      continue;
    }
    const len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
    if (len < 1e-6) continue;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const y = y0;
    // Run on by half its width at each end, so its corners close.
    const L = len + r.width;
    const sx = (along: number, across: number) => (alongX ? along : across);
    const sz = (along: number, across: number) => (alongX ? across : along);
    if (r.kind === 'trunking') {
      box(steel, sx(L, r.width), r.depth, sz(L, r.width), cx, y, cz, r.name);
      continue;
    }
    // The ladder: its two side rails, its rungs, its cables, its hangers.
    for (const side of [-1, 1]) {
      const off = (side * r.width) / 2;
      box(
        galv,
        sx(L, 0.02),
        r.depth,
        sz(L, 0.02),
        cx + (alongX ? 0 : off),
        y,
        cz + (alongX ? off : 0),
        r.name,
      );
    }
    const start = (alongX ? Math.min(x0, x1) : Math.min(z0, z1)) - r.width / 2;
    for (let s = 0.15; s < L; s += 0.3)
      box(
        galv,
        sx(0.04, r.width),
        0.02,
        sz(0.04, r.width),
        alongX ? start + s : cx,
        y - r.depth / 2 + 0.01,
        alongX ? cz : start + s,
      );
    // Its cables, side by side along it, on the rungs.
    for (let k = 0; k < 6; k++) {
      const off = -r.width / 2 + 0.07 + k * ((r.width - 0.14) / 5);
      box(
        cable,
        sx(L, 0.045),
        0.045,
        sz(L, 0.045),
        cx + (alongX ? 0 : off),
        y - r.depth / 2 + 0.045,
        cz + (alongX ? off : 0),
      );
    }
    // Threaded rods to the roof, a pair every 1.5 m.
    for (let s = 0.3; s < L; s += 1.5)
      for (const side of [-1, 1]) {
        const off = side * (r.width / 2 + 0.03);
        box(
          steel,
          0.012,
          roof - y,
          0.012,
          alongX ? start + s : cx + off,
          (roof + y) / 2,
          alongX ? cz + off : start + s,
        );
      }
  }
  // The collars where lengths go into walls, fire-stopped.
  for (const e of entries) {
    const across = Math.abs(e.normal[0]) > 0.5;
    const w = e.width + 0.16;
    box(
      collar,
      across ? 0.08 : w,
      0.3,
      across ? w : 0.08,
      e.at[0] - e.normal[0] * 0.04,
      e.at[1],
      e.at[2] - e.normal[1] * 0.04,
      e.name,
    );
    box(
      fire,
      across ? 0.02 : w - 0.06,
      0.22,
      across ? w - 0.06 : 0.02,
      e.at[0] - e.normal[0] * 0.085,
      e.at[1],
      e.at[2] - e.normal[1] * 0.085,
    );
  }
  group.updateMatrixWorld(true);
  mergeStatic(group, 8, new Set(), { share: true });
  return group;
}
