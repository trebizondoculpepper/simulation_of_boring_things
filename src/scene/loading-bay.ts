import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import type { Material } from 'three';
import type { Footprint } from '../toolkit/controls/logic/walk-collision';
import { createMicroLabel } from '../toolkit/components/core/views/eighties-controls';
import type { PanelKit } from '../toolkit/components/core/views/eighties-controls';
import { createWarehouseConcreteFloor } from './warehouse-concrete-floor';

/**
 * Covered loading dock behind the plant corridor. Two open truck positions
 * face the road beyond the south edge. Dimensions use the corridor frame.
 */
export const LOADING_BAY = {
  /**
   * Its floor's extent: from the corridor's outer wall (south side)
   * outward, between the store doors either side (their lobbies, 7 m off).
   */
  minX: -6,
  maxX: 6,
  minZ: 26.6,
  maxZ: 40.6,
  height: 6,
  /** The opening into it from the corridor: centred on the side, its width and lintel. */
  opening: { side: 'south' as const, t: 0, width: 4, height: 3.4 },
};

const WALL = 0.22;

/** Side walls and the dock drop, so walkers cannot step off the platform. */
export function loadingBayWalls(): Footprint[] {
  const b = LOADING_BAY;
  const h = WALL / 2;
  return [
    { minX: b.minX - h, maxX: b.maxX + h, minZ: b.maxZ - h, maxZ: b.maxZ + h },
    { minX: b.minX - h, maxX: b.minX + h, minZ: b.minZ, maxZ: b.maxZ },
    { minX: b.maxX - h, maxX: b.maxX + h, minZ: b.minZ, maxZ: b.maxZ },
  ];
}

export function createLoadingBay(kit: PanelKit, blockwork: Material) {
  const b = LOADING_BAY;
  const group = new Group();
  group.name = 'loading bay';
  const w = b.maxX - b.minX,
    d = b.maxZ - b.minZ;
  const cx = (b.minX + b.maxX) / 2,
    cz = (b.minZ + b.maxZ) / 2;
  const ceiling = new MeshStandardMaterial({
    color: '#a4aaab',
    roughness: 0.85,
  });
  const floor = new Mesh(
    new BoxGeometry(w, 0.3, d),
    createWarehouseConcreteFloor(w),
  );
  floor.position.set(cx, -0.15, cz);
  floor.name = 'loading bay floor';
  const roof = new Mesh(new BoxGeometry(w, 0.24, d), ceiling);
  roof.position.set(cx, b.height + 0.12, cz);
  roof.name = 'loading bay ceiling';
  group.add(floor, roof);
  const yellow = new MeshStandardMaterial({
    color: '#d6ad32',
    roughness: 0.88,
  });
  const rubber = new MeshStandardMaterial({
    color: '#171d1e',
    roughness: 0.96,
  });
  const steel = new MeshStandardMaterial({
    color: '#647176',
    metalness: 0.35,
    roughness: 0.6,
  });
  const shutter = new MeshStandardMaterial({
    color: '#aeb7ba',
    metalness: 0.58,
    roughness: 0.48,
  });
  const shutterJoint = new MeshStandardMaterial({
    color: '#758287',
    metalness: 0.65,
    roughness: 0.55,
  });
  const addBox = (
    name: string,
    material: Material,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    group.add(mesh);
  };
  // Beyond the dock mouths is intentionally only a white background.
  for (const x of [-3, 3]) {
    // Each pier has a protected dock edge and rubber bumpers.
    addBox(
      'dock edge warning strip',
      yellow,
      4.6,
      0.015,
      0.16,
      x,
      0.012,
      b.maxZ - 0.15,
    );
    for (const side of [-1, 1]) {
      addBox(
        'dock rubber bumper',
        rubber,
        0.34,
        0.7,
        0.24,
        x + side * 1.85,
        -0.56,
        b.maxZ + 0.12,
      );
    }
    addBox('dock leveller lip', steel, 2.6, 0.04, 0.42, x, 0, b.maxZ - 0.24);
  }
  /** A painted blockwork wall, its UVs at block size. */
  const blockWall = (
    along: 'x' | 'z',
    at: number,
    from: number,
    to: number,
    bottom: number,
    top: number,
  ) => {
    const span = to - from,
      height = top - bottom;
    const geometry = new BoxGeometry(
      along === 'x' ? span : WALL,
      height,
      along === 'x' ? WALL : span,
    );
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++)
      uv.setXY(i, uv.getX(i) * span, uv.getY(i) * (height / 0.4));
    const mesh = new Mesh(geometry, blockwork);
    const mid = (from + to) / 2;
    mesh.position.set(
      along === 'x' ? mid : at,
      (bottom + top) / 2,
      along === 'x' ? at : mid,
    );
    mesh.name = 'painted breeze block wall';
    group.add(mesh);
  };
  // Two 4.6 m dock mouths, separated by a central masonry pier.
  for (const [from, to] of [
    [b.minX, -5.3],
    [-0.7, 0.7],
    [5.3, b.maxX],
  ])
    blockWall('x', b.maxZ, from, to, 0, b.height);
  for (const [from, to] of [
    [-5.3, -0.7],
    [0.7, 5.3],
  ])
    blockWall('x', b.maxZ, from, to, 4.2, b.height);
  for (const [x, closedHeight] of [
    [-3, 0.48],
    [3, 2.25],
  ] as const) {
    const shutterZ = b.maxZ - 0.17;
    addBox(
      'roller shutter cassette',
      steel,
      4.7,
      0.38,
      0.42,
      x,
      4.15,
      shutterZ,
    );
    for (const side of [-1, 1])
      addBox(
        'roller shutter guide',
        steel,
        0.13,
        4.1,
        0.16,
        x + side * 2.27,
        2.05,
        shutterZ,
      );
    const slatHeight = 0.15;
    for (let i = 0; i < Math.ceil(closedHeight / slatHeight); i++) {
      const top = 4.02 - i * slatHeight;
      const bottom = Math.max(4.02 - closedHeight, top - slatHeight);
      const h = top - bottom;
      if (h <= 0) continue;
      addBox(
        'roller shutter slat',
        shutter,
        4.42,
        h - 0.006,
        0.055,
        x,
        (top + bottom) / 2,
        shutterZ,
      );
      addBox(
        'roller shutter seam',
        shutterJoint,
        4.42,
        0.008,
        0.064,
        x,
        bottom,
        shutterZ - 0.002,
      );
    }
    addBox(
      'roller shutter bottom rail',
      shutterJoint,
      4.48,
      0.075,
      0.09,
      x,
      4.02 - closedHeight,
      shutterZ,
    );
  }
  blockWall('z', b.minX, b.minZ, b.maxZ, 0, b.height);
  blockWall('z', b.maxX, b.minZ, b.maxZ, 0, b.height);
  // The corridor owns the jambs and lintel below its ceiling. A second
  // overlapping wall there causes the visible depth-fighting checkerboard.
  blockWall('x', b.minZ - 0.1, b.minX, b.maxX, 4, b.height);
  // One short plate per lintel, clear of the two open dock mouths.
  for (const [x, text] of [
    [-3, 'BAY 2'],
    [3, 'BAY 1'],
  ] as const) {
    const card = createMicroLabel(kit, text, {
      height: 0.2,
      ink: '#101214',
      plate: '#d6af24',
      maxWidth: 2.2,
    });
    card.position.set(x, 5.05, b.maxZ - WALL / 2 - 0.02);
    card.rotation.y = Math.PI;
    group.add(card);
  }
  return group;
}
