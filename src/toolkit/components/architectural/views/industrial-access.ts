import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  Quaternion,
  Vector3,
} from 'three';
import type { Material, Object3D } from 'three';

/** Geometry is in metres, with the walking surface at `topY`. */
export interface AccessMaterials {
  deck: Material;
  steel: Material;
  rail: Material;
  nosing: Material;
  /** Physical size of one repeat of the deck texture. */
  deckTile?: number;
}

export interface GantryDeck {
  x: number;
  z: number;
  width: number;
  depth: number;
  topY: number;
  /** Ground below the platform; omit for a wall-supported platform. */
  supportBottom?: number;
  supportSpacing?: number;
  /** Use one edge when the opposite edge bears on a wall. */
  supportEdge?: 'minX' | 'maxX' | 'minZ' | 'maxZ' | 'both';
}

export interface AccessRail {
  from: readonly [number, number, number];
  to: readonly [number, number, number];
  /** A half-height handrail without posts or a toe board, for the wall side. */
  wallMounted?: boolean;
  toeBoard?: boolean;
}

export interface AccessStair {
  /** Centre of the top edge of the flight. */
  x: number;
  z: number;
  topY: number;
  bottomY: number;
  width: number;
  run: number;
  steps: number;
  /** Number of visible treads when the last riser steps onto the floor. */
  treads?: number;
  /** Downward direction from the top: +x, -x, +z or -z. */
  direction: 'east' | 'west' | 'south' | 'north';
  /** Which side has a solid wall. Both sides receive handrails. */
  wallSide?: 'left' | 'right';
  /** Leave the last part of an open side free for stepping off sideways. */
  openSideEnd?: number;
}

const vec = (p: readonly [number, number, number]) => new Vector3(...p);

export function createIndustrialAccess(materials: AccessMaterials) {
  const group = new Group();
  group.name = 'industrial access';
  const box = (
    name: string,
    material: Material,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    parent: Object3D = group,
    tileTop = false,
  ) => {
    const geometry = new BoxGeometry(w, h, d);
    if (tileTop && materials.deckTile) {
      const uv = geometry.attributes.uv;
      // The first four BoxGeometry faces are the two horizontal surfaces.
      for (let i = 8; i < 16; i++)
        uv.setXY(
          i,
          ((i % 4 === 0 || i % 4 === 3 ? -w / 2 : w / 2) + x) /
            materials.deckTile,
          ((i % 4 < 2 ? -d / 2 : d / 2) + z) / materials.deckTile,
        );
    }
    const mesh = new Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const rod = (
    name: string,
    material: Material,
    a: readonly [number, number, number],
    b: readonly [number, number, number],
    radius: number,
  ) => {
    const from = vec(a);
    const to = vec(b);
    const delta = to.clone().sub(from);
    const mesh = new Mesh(
      new CylinderGeometry(radius, radius, delta.length(), 10),
      material,
    );
    mesh.name = name;
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.quaternion.copy(
      new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        delta.normalize(),
      ),
    );
    group.add(mesh);
    return mesh;
  };

  const deck = (p: GantryDeck) => {
    const slab = box(
      'gantry non-slip deck',
      materials.deck,
      p.x,
      p.topY - 0.025,
      p.z,
      p.width,
      0.05,
      p.depth,
      group,
      true,
    );
    // Perimeter channels and transverse joists make the deck read as a supported structure.
    for (const z of [p.z - p.depth / 2 + 0.045, p.z + p.depth / 2 - 0.045])
      box(
        'gantry edge channel',
        materials.steel,
        p.x,
        p.topY - 0.18,
        z,
        p.width,
        0.24,
        0.09,
      );
    for (const x of [p.x - p.width / 2 + 0.045, p.x + p.width / 2 - 0.045])
      box(
        'gantry edge channel',
        materials.steel,
        x,
        p.topY - 0.18,
        p.z,
        0.09,
        0.24,
        p.depth,
      );
    const acrossX = p.width >= p.depth;
    const length = acrossX ? p.width : p.depth;
    const count = Math.max(1, Math.ceil(length / (p.supportSpacing ?? 2.4)));
    for (let i = 1; i < count; i++) {
      const along = -length / 2 + (length * i) / count;
      box(
        'gantry joist',
        materials.steel,
        p.x + (acrossX ? along : 0),
        p.topY - 0.16,
        p.z + (acrossX ? 0 : along),
        acrossX ? 0.08 : p.width,
        0.13,
        acrossX ? p.depth : 0.08,
      );
    }
    if (p.supportBottom !== undefined) {
      const postHeight = p.topY - 0.3 - p.supportBottom;
      const alongX = p.width >= p.depth;
      const length = alongX ? p.width : p.depth;
      const stations = Math.max(
        1,
        Math.ceil(length / (p.supportSpacing ?? 2.4)),
      );
      if (postHeight > 0)
        for (let i = 0; i <= stations; i++)
          for (const edge of [-1, 1]) {
            if (p.supportEdge && p.supportEdge !== 'both') {
              const edgeName = alongX
                ? edge < 0
                  ? 'minZ'
                  : 'maxZ'
                : edge < 0
                  ? 'minX'
                  : 'maxX';
              if (edgeName !== p.supportEdge) continue;
            }
            const along = -length / 2 + 0.1 + ((length - 0.2) * i) / stations;
            const x = p.x + (alongX ? along : edge * (p.width / 2 - 0.1));
            const z = p.z + (alongX ? edge * (p.depth / 2 - 0.1) : along);
            box(
              'gantry support column',
              materials.steel,
              x,
              p.supportBottom + postHeight / 2,
              z,
              0.09,
              postHeight,
              0.09,
            );
            box(
              'gantry base plate',
              materials.steel,
              x,
              p.supportBottom + 0.012,
              z,
              0.18,
              0.024,
              0.18,
            );
          }
    }
    return slab;
  };

  const rail = (p: AccessRail) => {
    const a = vec(p.from);
    const b = vec(p.to);
    const length = a.distanceTo(b);
    const points = Math.max(1, Math.ceil(length / 1.5));
    const raised = (height: number) => {
      const aa: [number, number, number] = [a.x, a.y + height, a.z];
      const bb: [number, number, number] = [b.x, b.y + height, b.z];
      rod('continuous handrail', materials.rail, aa, bb, 0.022);
    };
    raised(p.wallMounted ? 0.92 : 1.1);
    if (p.wallMounted) {
      for (let i = 0; i <= points; i++) {
        const at = a.clone().lerp(b, i / points);
        box(
          'handrail wall bracket',
          materials.steel,
          at.x,
          at.y + 0.92,
          at.z,
          0.08,
          0.04,
          0.08,
        );
      }
      return;
    }
    raised(0.55);
    for (let i = 0; i <= points; i++) {
      const at = a.clone().lerp(b, i / points);
      rod(
        'guardrail post',
        materials.rail,
        [at.x, at.y, at.z],
        [at.x, at.y + 1.1, at.z],
        0.022,
      );
      box(
        'guardrail base flange',
        materials.steel,
        at.x,
        at.y + 0.008,
        at.z,
        0.12,
        0.016,
        0.12,
      );
    }
    if (p.toeBoard !== false) {
      const mid = a.clone().add(b).multiplyScalar(0.5);
      const board = box(
        'gantry toe board',
        materials.steel,
        mid.x,
        mid.y + 0.08,
        mid.z,
        0.008,
        0.15,
        length,
      );
      board.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    }
  };

  const stair = (p: AccessStair) => {
    const [dx, dz] =
      p.direction === 'east'
        ? [1, 0]
        : p.direction === 'west'
          ? [-1, 0]
          : p.direction === 'south'
            ? [0, 1]
            : [0, -1];
    const rise = p.topY - p.bottomY;
    const treads = p.treads ?? p.steps;
    const going = p.run / treads;
    const acrossX = dz !== 0;
    const position = (along: number, side = 0): [number, number] => [
      p.x + dx * along + (acrossX ? side : 0),
      p.z + dz * along + (acrossX ? 0 : side),
    ];
    for (let i = 0; i < treads; i++) {
      const top = p.topY - ((i + 1) * rise) / p.steps;
      const [x, z] = position((i + 0.5) * going);
      box(
        'industrial stair tread',
        materials.deck,
        x,
        top - 0.025,
        z,
        acrossX ? p.width : going,
        0.05,
        acrossX ? going : p.width,
        group,
        true,
      );
      // Project the narrow nosing just past the downhill tread edge. It must
      // not share a front plane with the tread, which would flicker.
      const [nx, nz] = position((i + 1) * going - 0.004);
      box(
        'stair safety nosing',
        materials.nosing,
        nx,
        top + 0.009,
        nz,
        acrossX ? p.width : 0.036,
        0.016,
        acrossX ? 0.036 : p.width,
      );
    }
    for (const side of [-1, 1] as const) {
      const [x0, z0] = position(0, side * (p.width / 2 - 0.035));
      const [x1, z1] = position(p.run, side * (p.width / 2 - 0.035));
      rod(
        'stair steel stringer',
        materials.steel,
        [x0, p.topY - 0.19, z0],
        [x1, p.bottomY - 0.19, z1],
        0.055,
      );
      const wall = p.wallSide === (side < 0 ? 'left' : 'right');
      const end = wall ? p.run : p.run - (p.openSideEnd ?? 0);
      rail({
        from: [x0, p.topY, z0],
        to: [
          p.x + dx * end + (acrossX ? side * (p.width / 2 - 0.035) : 0),
          p.topY - (rise * end) / p.run,
          p.z + dz * end + (acrossX ? 0 : side * (p.width / 2 - 0.035)),
        ],
        wallMounted: wall,
        toeBoard: false,
      });
    }
  };

  return { group, deck, rail, stair };
}
