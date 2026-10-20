import {
  BufferGeometry,
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Float32BufferAttribute,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
} from 'three';
import type { Material, Object3D } from 'three';
import { LOOP_INNER } from '../game/dev-corridor-plan';
import { addWallBatten, createWallBattenMaterials } from './wall-batten';
import { createWarehouseConcreteFloor } from './warehouse-concrete-floor';
import { mergeStatic } from '../toolkit/components/core/views/merge-static';
import {
  GANTRY_INNER,
  LOWER_FLOOR_Y,
  PLANT_STAIRS,
  STAIR_RUN,
  STAIR_STEPS,
  STAIR_WIDTH,
} from '../game/main-plant-plan';

/** Three storeys of clear volume, with the entry level carried by a perimeter gantry. */
export const PLANT_ROOF_Y = 7;
export const MAIN_PLANT_WALL_FITTINGS = ([-0.6, 5.35] as const).flatMap((y) =>
  ([-17, -8, 0, 8, 17] as const).flatMap((t) =>
    ([-1, 1] as const).flatMap((sign) => [
      {
        x: t,
        y,
        z: sign * (LOOP_INNER - 0.3),
        along: 'x' as const,
        face: -sign as -1 | 1,
      },
      {
        x: sign * (LOOP_INNER - 0.3),
        y,
        z: t,
        along: 'z' as const,
        face: -sign as -1 | 1,
      },
    ]),
  ),
);

export function createMainPlantRoom(blockwork: Material) {
  const group = new Group();
  group.name = 'main plant room';
  const concrete = new MeshStandardMaterial({
    color: '#727b7d',
    roughness: 0.88,
  });
  const wall = new MeshStandardMaterial({ color: '#a4aaab', roughness: 0.83 });
  const steel = new MeshStandardMaterial({
    color: '#607078',
    metalness: 0.65,
    roughness: 0.38,
  });
  const tileCanvas = document.createElement('canvas');
  tileCanvas.width = tileCanvas.height = 256;
  const tile = tileCanvas.getContext('2d')!;
  tile.fillStyle = '#455052';
  tile.fillRect(0, 0, 256, 256);
  tile.fillStyle = '#303a3c';
  tile.fillRect(0, 0, 256, 5);
  tile.fillRect(0, 0, 5, 256);
  tile.fillStyle = '#697477';
  tile.fillRect(6, 6, 244, 2);
  tile.fillRect(6, 6, 2, 244);
  for (let row = 0; row < 8; row++)
    for (let col = 0; col < 8; col++) {
      const x = 18 + col * 31;
      const y = 18 + row * 31;
      tile.fillStyle = '#2c3638';
      tile.beginPath();
      tile.arc(x + 1, y + 2, 7, 0, Math.PI * 2);
      tile.fill();
      tile.fillStyle = '#657073';
      tile.beginPath();
      tile.arc(x, y, 6, 0, Math.PI * 2);
      tile.fill();
    }
  const tileMap = new CanvasTexture(tileCanvas);
  tileMap.colorSpace = SRGBColorSpace;
  tileMap.wrapS = tileMap.wrapT = RepeatWrapping;
  const deck = new MeshStandardMaterial({ map: tileMap, roughness: 0.96 });
  const safety = new MeshStandardMaterial({
    color: '#e1bd53',
    metalness: 0.3,
    roughness: 0.52,
  });
  const pipeMaterials = [
    new MeshStandardMaterial({
      color: '#93a8a5',
      metalness: 0.65,
      roughness: 0.35,
    }),
    new MeshStandardMaterial({
      color: '#4d7c98',
      metalness: 0.3,
      roughness: 0.48,
    }),
    new MeshStandardMaterial({
      color: '#aa7d4d',
      metalness: 0.45,
      roughness: 0.42,
    }),
  ];
  const skirting = new MeshStandardMaterial({
    color: '#5f6262',
    roughness: 0.9,
  });
  const battens = createWallBattenMaterials();
  const span = LOOP_INNER * 2;
  const box = (
    name: string,
    material: Material,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
  ) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    group.add(mesh);
  };
  const gantrySlab = (x: number, z: number, w: number, d: number) => {
    const geometry = new BoxGeometry(w, 0.22, d);
    const positions = geometry.attributes.position;
    const normals = geometry.attributes.normal;
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++)
      if (normals.getY(i) > 0.9)
        uv.setXY(
          i,
          (x + positions.getX(i)) / 0.6,
          (z + positions.getZ(i)) / 0.6,
        );
    const mesh = new Mesh(geometry, deck);
    mesh.name = 'perimeter gantry';
    mesh.position.set(x, -0.11, z);
    group.add(mesh);
  };
  const continuousWall = (along: 'x' | 'z', at: number) => {
    const innerAt = at - Math.sign(at) * 0.12;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const flip = along === 'x' ? at > 0 : at < 0;
    const rectangle = (u0: number, u1: number, y0: number, y1: number) => {
      const start = positions.length / 3;
      for (const [u, y] of [
        [u0, y0],
        [u1, y0],
        [u1, y1],
        [u0, y1],
      ]) {
        positions.push(...(along === 'x' ? [u, y, innerAt] : [innerAt, y, u]));
        uvs.push(u + LOOP_INNER, (y - LOWER_FLOOR_Y) / 0.4);
      }
      indices.push(
        ...(flip
          ? [start, start + 2, start + 1, start, start + 3, start + 2]
          : [start, start + 1, start + 2, start, start + 2, start + 3]),
      );
    };
    rectangle(-LOOP_INNER, -0.53, LOWER_FLOOR_Y, PLANT_ROOF_Y);
    rectangle(0.53, LOOP_INNER, LOWER_FLOOR_Y, PLANT_ROOF_Y);
    rectangle(-0.53, 0.53, LOWER_FLOOR_Y, 0);
    rectangle(-0.53, 0.53, 2.08, PLANT_ROOF_Y);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mesh = new Mesh(geometry, blockwork);
    mesh.name = 'continuous plant wall';
    group.add(mesh);
  };

  box(
    'lower floor',
    createWarehouseConcreteFloor(span),
    0,
    LOWER_FLOOR_Y - 0.15,
    0,
    span,
    0.3,
    span,
  );
  box('high ceiling', wall, 0, PLANT_ROOF_Y + 0.12, 0, span, 0.24, span);
  for (const z of [-LOOP_INNER, LOOP_INNER]) {
    continuousWall('x', z);
    for (const [from, to] of [
      [-LOOP_INNER, -0.53],
      [0.53, LOOP_INNER],
    ])
      box(
        'gantry wall skirting',
        skirting,
        (from + to) / 2,
        0.09,
        z - Math.sign(z) * 0.16,
        to - from,
        0.18,
        0.06,
      );
    box(
      'lower skirting',
      skirting,
      0,
      LOWER_FLOOR_Y + 0.08,
      z - Math.sign(z) * 0.13,
      span,
      0.16,
      0.08,
    );
  }
  for (const x of [-LOOP_INNER, LOOP_INNER]) {
    continuousWall('z', x);
    for (const [from, to] of [
      [-LOOP_INNER, -0.53],
      [0.53, LOOP_INNER],
    ])
      box(
        'gantry wall skirting',
        skirting,
        x - Math.sign(x) * 0.16,
        0.09,
        (from + to) / 2,
        0.06,
        0.18,
        to - from,
      );
    box(
      'lower skirting',
      skirting,
      x - Math.sign(x) * 0.13,
      LOWER_FLOOR_Y + 0.08,
      0,
      0.08,
      0.16,
      span,
    );
  }
  // A single flush sill bridges the two floor slabs at each doorway and
  // covers their shared depth edge when the spring leaf swings clear.
  for (const sign of [-1, 1]) {
    box(
      'plant door threshold',
      steel,
      0,
      0.018,
      sign * LOOP_INNER,
      1.04,
      0.036,
      0.42,
    );
    box(
      'plant door threshold',
      steel,
      sign * LOOP_INNER,
      0.018,
      0,
      0.42,
      0.036,
      1.04,
    );
  }
  for (const f of MAIN_PLANT_WALL_FITTINGS)
    addWallBatten(group, battens, f.x, f.y, f.z, f.along, f.face);
  const width = LOOP_INNER - GANTRY_INNER;
  const railX = (
    name: string,
    material: MeshStandardMaterial,
    y: number,
    z: number,
    height: number,
    depth: number,
    gapX: number,
  ) => {
    const gap = STAIR_WIDTH / 2 + 0.12;
    const left = gapX - gap + GANTRY_INNER;
    const right = GANTRY_INNER - gapX - gap;
    box(name, material, -GANTRY_INNER + left / 2, y, z, left, height, depth);
    box(name, material, gapX + gap + right / 2, y, z, right, height, depth);
  };
  {
    const level = 0;
    // Steel edge girders and regularly spaced transverse joists support the
    // deck, with brackets bearing back into the perimeter walls.
    for (const sign of [-1, 1]) {
      box(
        'gantry edge girder',
        steel,
        0,
        -0.38,
        sign * GANTRY_INNER,
        span,
        0.32,
        0.18,
      );
      box(
        'gantry edge girder',
        steel,
        sign * GANTRY_INNER,
        -0.38,
        0,
        0.18,
        0.32,
        span,
      );
      for (let t = -GANTRY_INNER + 2; t < GANTRY_INNER; t += 4) {
        const at = (sign * (LOOP_INNER + GANTRY_INNER)) / 2;
        box('gantry joist', steel, t, -0.3, at, 0.12, 0.2, width);
        box('gantry joist', steel, at, -0.3, t, width, 0.2, 0.12);
        box(
          'wall bearing plate',
          concrete,
          t,
          -0.58,
          sign * (LOOP_INNER - 0.18),
          0.32,
          0.42,
          0.12,
        );
        box(
          'wall bearing plate',
          concrete,
          sign * (LOOP_INNER - 0.18),
          -0.58,
          t,
          0.12,
          0.42,
          0.32,
        );
      }
    }
    for (const sign of [-1, 1]) {
      const at = (sign * (LOOP_INNER + GANTRY_INNER)) / 2;
      gantrySlab(0, at, span, width);
      gantrySlab(at, 0, width, span);
      const stair = PLANT_STAIRS.find((s) => Math.sign(s.startZ) === sign)!;
      railX(
        'pit edge marking',
        safety,
        level + 0.012,
        sign * GANTRY_INNER,
        0.024,
        0.11,
        stair.x,
      );
      box(
        'pit edge marking',
        safety,
        sign * GANTRY_INNER,
        level + 0.012,
        0,
        0.11,
        0.024,
        GANTRY_INNER * 2,
      );
      railX(
        'handrail',
        steel,
        level + 1.05,
        sign * GANTRY_INNER,
        0.07,
        0.07,
        stair.x,
      );
      box(
        'handrail',
        steel,
        sign * GANTRY_INNER,
        level + 1.05,
        0,
        0.07,
        0.07,
        GANTRY_INNER * 2,
      );
      railX(
        'midrail',
        steel,
        level + 0.53,
        sign * GANTRY_INNER,
        0.045,
        0.045,
        stair.x,
      );
      box(
        'midrail',
        steel,
        sign * GANTRY_INNER,
        level + 0.53,
        0,
        0.045,
        0.045,
        GANTRY_INNER * 2,
      );
      for (let t = -GANTRY_INNER; t <= GANTRY_INNER; t += 2.35) {
        if (Math.abs(t - stair.x) > STAIR_WIDTH / 2 + 0.16)
          box(
            'rail upright',
            steel,
            t,
            level + 0.55,
            sign * GANTRY_INNER,
            0.055,
            1.1,
            0.055,
          );
        box(
          'rail upright',
          steel,
          sign * GANTRY_INNER,
          level + 0.55,
          t,
          0.055,
          1.1,
          0.055,
        );
      }
    }
  }
  for (const stair of PLANT_STAIRS) {
    const stepRun = STAIR_RUN / STAIR_STEPS;
    const stepRise = -LOWER_FLOOR_Y / STAIR_STEPS;
    for (let i = 0; i < STAIR_STEPS; i++) {
      // The final tread is a thin cap above the slab, never a zero-height box.
      const top = Math.max(LOWER_FLOOR_Y + 0.012, -(i + 1) * stepRise);
      const z = stair.startZ + stair.direction * (i + 0.5) * stepRun;
      box(
        `${stair.corner} stair tread`,
        deck,
        stair.x,
        (LOWER_FLOOR_Y + top) / 2,
        z,
        STAIR_WIDTH,
        top - LOWER_FLOOR_Y,
        stepRun,
      );
      box(
        `${stair.corner} stair nosing`,
        safety,
        stair.x,
        top + 0.012,
        z - stair.direction * stepRun * 0.42,
        STAIR_WIDTH,
        0.024,
        0.055,
      );
    }
    for (const side of [-1, 1]) {
      const x = stair.x + side * (STAIR_WIDTH / 2 + 0.07);
      const handrail = new Mesh(
        new BoxGeometry(0.065, 0.065, Math.hypot(STAIR_RUN, -LOWER_FLOOR_Y)),
        steel,
      );
      handrail.name = `${stair.corner} stair handrail`;
      handrail.position.set(
        x,
        LOWER_FLOOR_Y / 2 + 1.05,
        stair.startZ + (stair.direction * STAIR_RUN) / 2,
      );
      handrail.rotation.x =
        stair.direction * Math.atan2(-LOWER_FLOOR_Y, STAIR_RUN);
      group.add(handrail);
      for (const along of [0.3, 2, 4, 5.8]) {
        const top = (LOWER_FLOOR_Y * along) / STAIR_RUN + 1.05;
        box(
          `${stair.corner} stair post`,
          steel,
          x,
          (top + LOWER_FLOOR_Y) / 2,
          stair.startZ + stair.direction * along,
          0.055,
          top - LOWER_FLOOR_Y,
          0.055,
        );
      }
    }
  }
  for (const x of [-LOOP_INNER + 1.1, LOOP_INNER - 1.1])
    for (const z of [-LOOP_INNER + 1.1, LOOP_INNER - 1.1])
      box('structural column', concrete, x, 2, z, 0.55, 10, 0.55);
  // Overhead pipe-density trial. The clear centre aisles remain walkable.
  const pipes = new Group();
  pipes.name = 'pipe load';
  group.add(pipes);
  const pipe = (
    name: string,
    material: Material,
    radius: number,
    a: Vector3,
    b: Vector3,
  ) => {
    const direction = new Vector3().subVectors(b, a);
    const mesh = new Mesh(
      new CylinderGeometry(radius, radius, direction.length(), 12),
      material,
    );
    mesh.name = name;
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(
      new Vector3(0, 1, 0),
      direction.normalize(),
    );
    pipes.add(mesh);
  };
  for (const [axis, tracks, y] of [
    ['x', [-12, -10, -8, 8, 10, 12], -0.72],
    ['z', [-12, -10, -8, 8, 10, 12], -0.42],
  ] as const) {
    tracks.forEach((track, i) => {
      const material = pipeMaterials[i % pipeMaterials.length];
      const radius = i % 3 === 0 ? 0.16 : 0.11;
      const at = (along: number, height: number = y) =>
        axis === 'x'
          ? new Vector3(along, height, track)
          : new Vector3(track, height, along);
      pipe('overhead service pipe', material, radius, at(-18), at(18));
      for (const along of [-12, 0, 12]) {
        pipe(
          'pipe flange',
          steel,
          radius + 0.04,
          at(along - 0.04),
          at(along + 0.04),
        );
        const bearer = new Mesh(
          new BoxGeometry(
            axis === 'x' ? 0.12 : 0.8,
            0.12,
            axis === 'x' ? 0.8 : 0.12,
          ),
          steel,
        );
        bearer.name = 'pipe rack bearer';
        bearer.position.set(
          axis === 'x' ? along : track,
          y - 0.23,
          axis === 'x' ? track : along,
        );
        pipes.add(bearer);
      }
      for (const along of [-15, 15]) {
        pipe(
          'equipment pipe drop',
          material,
          radius * 0.75,
          at(along),
          at(along, -2.1),
        );
      }
    });
  }
  // The geometry batcher turns merged pipe cylinders into a solid slab;
  // keep the independent segments until that batching path is fixed.
  const unmerged = new Set<Object3D>([pipes]);
  group.traverse((object) => {
    if (
      object instanceof Mesh &&
      [
        'structural column',
        'perimeter gantry',
        'gantry edge girder',
        'continuous plant wall',
      ].includes(object.name)
    )
      unmerged.add(object);
  });
  mergeStatic(group, Infinity, unmerged, {
    share: true,
    originals: (meshes) => meshes.forEach((mesh) => mesh.geometry.dispose()),
  });
  return group;
}
