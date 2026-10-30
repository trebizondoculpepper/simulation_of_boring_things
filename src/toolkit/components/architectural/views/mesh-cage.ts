import {
  BoxGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three';
import type { Material, Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import {
  CAGE_DEFAULTS,
  cageLayout,
  doorLeafAngle,
  meshWires,
  sideLine,
} from '../logic/mesh-cage';
import type { CageLayout, MeshCageSpec } from '../logic/mesh-cage';

/**
 * A welded-mesh cage, drawn (`logic/mesh-cage.ts` lays it out): galvanised
 * square-tube posts and rails, 50 mm welded mesh of 4 mm wire on every
 * side, partition and roof, a hinged mesh door in its own frame with a
 * hasp, staple and padlock, and base plates or feet. Every bar and wire
 * of the fixed cage is one instance of one box in one draw, and the door's
 * another, so a cage of a thousand wires costs two draw calls (and one
 * for its padlock's brass).
 *
 * In the cage's frame (see the logic): floor at y = 0, front facing +z.
 */

type V3 = [number, number, number];

/** Boxes, axis-aligned: each its centre and its size. */
class Bars {
  readonly items: { c: V3; s: V3 }[] = [];
  add(c: V3, s: V3) {
    this.items.push({ c, s });
  }
  /** A bar from `a` to `b` along one axis, `t` square. */
  run(a: V3, b: V3, t: number) {
    const c: V3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    const s: V3 = [
      Math.max(t, Math.abs(b[0] - a[0])),
      Math.max(t, Math.abs(b[1] - a[1])),
      Math.max(t, Math.abs(b[2] - a[2])),
    ];
    this.add(c, s);
  }
  mesh(material: Material, name: string) {
    const m = new InstancedMesh(
      new BoxGeometry(1, 1, 1),
      material,
      this.items.length,
    );
    m.name = name;
    const matrix = new Matrix4();
    const q = new Quaternion();
    this.items.forEach(({ c, s }, i) => {
      matrix.compose(new Vector3(...c), q, new Vector3(...s));
      m.setMatrixAt(i, matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    return m;
  }
}

export interface MeshCageView {
  group: Group;
  layout: CageLayout;
  /** The door's hinge pivot, turned by `setOpen`. */
  door: Group;
  /** What a use on the door works: its leaf. */
  doorLeaf: Object3D;
  /** Show the door `open`, 0 (shut) to 1 (open a right angle). */
  setOpen(open: number): void;
}

export function createMeshCage(
  kit: PanelKit,
  spec: MeshCageSpec,
  { colour = '#a9aeae' }: { colour?: string } = {},
): MeshCageView {
  const layout = cageLayout(spec);
  const pitch = spec.pitch ?? CAGE_DEFAULTS.pitch;
  const wire = spec.wire ?? CAGE_DEFAULTS.wire;
  const P = CAGE_DEFAULTS.post;
  const R = CAGE_DEFAULTS.rail;
  const { w: W, d: D, h: H } = spec;
  const galv = new MeshStandardMaterial({
    color: colour,
    roughness: 0.45,
    metalness: 0.6,
  });
  const brass = new MeshStandardMaterial({
    color: '#c9a227',
    roughness: 0.35,
    metalness: 0.8,
  });
  kit.materials.push(galv, brass);
  const group = new Group();
  group.name = 'Welded mesh cage';
  const frame = new Bars();

  /**
   * A mesh panel in the plane of a line: `at(s)` maps a distance along it
   * to (x, z); from `a` to `b` along it, `y0` to `y1` up it.
   */
  const meshPanel = (
    bars: Bars,
    at: (s: number) => [number, number],
    a: number,
    b: number,
    y0: number,
    y1: number,
  ) => {
    const len = b - a;
    const mid = (a + b) / 2;
    for (const s of meshWires(len, pitch)) {
      const [x, z] = at(mid + s);
      bars.run([x, y0, z], [x, y1, z], wire);
    }
    for (const y of meshWires(y1 - y0, pitch)) {
      const yy = (y0 + y1) / 2 + y;
      const p = at(a);
      const q = at(b);
      bars.run([p[0], yy, p[1]], [q[0], yy, q[1]], wire);
    }
  };

  // ---- Posts, rails and base -------------------------------------------
  for (const [x, z] of layout.posts) {
    frame.run([x, 0, z], [x, H, z], P);
    if ((spec.base ?? CAGE_DEFAULTS.base) === 'plates')
      frame.add([x, 0.003, z], [0.15, 0.006, 0.15]);
    else frame.add([x, 0.02, z], [0.08, 0.04, 0.08]);
  }
  const sides = ['front', 'back', 'left', 'right'] as const;
  for (const side of sides) {
    const l = sideLine(W, D, side);
    const a = l.at(-l.length / 2);
    const b = l.at(l.length / 2);
    for (const y of [R, H - R / 2])
      frame.run([a[0], y, a[1]], [b[0], y, b[1]], R);
  }
  // ---- Infill on every side ----------------------------------------------
  const mesh = new Bars();
  for (const p of layout.panels) {
    const l = sideLine(W, D, p.side);
    meshPanel(mesh, l.at, p.from + P / 2, p.to - P / 2, R * 1.5, H - R);
  }
  // ---- Partitions: posts at the front and back, rails, mesh across --------
  for (const x of layout.partitions) {
    for (const y of [R, H - R / 2]) frame.run([x, y, -D / 2], [x, y, D / 2], R);
    meshPanel(
      mesh,
      (s) => [x, s],
      -D / 2 + P / 2,
      D / 2 - P / 2,
      R * 1.5,
      H - R,
    );
  }
  // ---- The roof ------------------------------------------------------------
  if (spec.roof ?? CAGE_DEFAULTS.roof) {
    const y = H;
    for (const s of meshWires(W - P, pitch))
      mesh.run([s, y, -D / 2], [s, y, D / 2], wire);
    for (const s of meshWires(D - P, pitch))
      mesh.run([-W / 2, y, s], [W / 2, y, s], wire);
  }

  // ---- The door: its own frame, mesh, hasp and padlock, on its hinge --------
  const { door } = layout;
  const leafW = door.width - 0.02;
  const door3 = new Group();
  door3.name = 'Cage door';
  door3.position.set(door.hinge[0], 0, door.hinge[1]);
  group.add(door3);
  const leaf = new Group();
  // The leaf's local +x runs from the hinge along the side to its free end.
  const line = sideLine(W, D, door.side);
  const dir: [number, number] =
    line.along === 'x' ? [door.toward, 0] : [0, door.toward];
  leaf.rotation.y = Math.atan2(-dir[1], dir[0]);
  // Hung just outside the side's line, clear of the jambs.
  leaf.position.set(
    line.out[0] * (P / 2 + 0.02),
    0,
    line.out[1] * (P / 2 + 0.02),
  );
  door3.add(leaf);
  const doorBars = new Bars();
  const T = 0.04;
  const top = H - 0.08;
  const bottom = 0.06;
  for (const x of [0.01 + T / 2, leafW - T / 2])
    doorBars.run([x, bottom, 0], [x, top, 0], T);
  for (const y of [bottom + T / 2, top - T / 2, (bottom + top) / 2])
    doorBars.run([0.01, y, 0], [leafW, y, 0], T);
  meshPanel(doorBars, (s) => [s, 0], 0.01 + T, leafW - T, bottom + T, top - T);
  // Hinges: two knuckles at the hinge end.
  for (const y of [bottom + 0.2, top - 0.2])
    doorBars.add([0, y, 0], [0.03, 0.1, 0.03]);
  // The hasp on the leaf's free end, over a staple on the jamb.
  const haspY = 1.1;
  doorBars.add([leafW + 0.02, haspY, 0.0], [0.09, 0.03, 0.006]);
  const leafMesh = doorBars.mesh(galv, 'Cage door leaf');
  leaf.add(leafMesh);
  const lockBars = new Bars();
  lockBars.add([leafW + 0.045, haspY - 0.045, 0.012], [0.045, 0.05, 0.022]);
  const lock = lockBars.mesh(brass, 'Padlock');
  leaf.add(lock);
  // The staple, on the jamb at the leaf's free end.
  const free = line.at(door.hingeAlong + door.toward * door.width);
  frame.add(
    [
      free[0] + line.out[0] * (P / 2 + 0.01),
      haspY,
      free[1] + line.out[1] * (P / 2 + 0.01),
    ],
    [0.02, 0.05, 0.02],
  );

  group.add(frame.mesh(galv, 'Cage frame'));
  group.add(mesh.mesh(galv, 'Cage welded mesh'));
  const setOpen = (open: number) => {
    door3.rotation.y = doorLeafAngle(spec, open);
  };
  setOpen(0);
  return { group, layout, door: door3, doorLeaf: leaf, setOpen };
}
