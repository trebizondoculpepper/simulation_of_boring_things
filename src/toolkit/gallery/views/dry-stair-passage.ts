import {
  BoxGeometry,
  CircleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PointLight,
  RingGeometry,
  TorusGeometry,
  DoubleSide,
  Vector3,
} from 'three';
import type { Material } from 'three';
import {
  createPoolUniforms,
  createTileMaterial,
} from '../../components/pool/views/pool-surfaces';
import type { Footprint } from '../../controls/logic/walk-collision';
import {
  addBasinGutter,
  addWallSkylight,
  addSkylightAndWater,
  BASIN_GUTTER,
  roundRoomUniforms,
} from './round-room-light';

/** A dry room opening west from PR_A: one square-edged flight and a 4 m landing. */
export const DRY_PASSAGE = {
  mouthX: -15,
  nearZ: -8.03,
  farZ: -5.83,
  steps: 16,
  tread: 0.35,
  rise: 0.1875,
  landing: 4,
  height: 7,
} as const;

/** The landing meets the east opening of a separate, level circular room. */
export const ROUND_ROOM = {
  radius: 3.5,
  centreX: -27.922,
  centreZ: (DRY_PASSAGE.nearZ + DRY_PASSAGE.farZ) / 2,
  floorY: DRY_PASSAGE.steps * DRY_PASSAGE.rise,
  height: 4.2,
} as const;

/**
 * The half-width of the opening north out of the round room into
 * white_corridor_1 (`white-corridor.ts`).
 */
export const ROUND_ROOM_NORTH_OPENING = 0.8;
export const ROUND_ROOM_NORTH_HEAD = 2.5;
/** A flat chord provides a proper wall for the north tunnel opening. */
export const ROUND_ROOM_NORTH_FLAT_HALF = 1.65;
export const ROUND_ROOM_NORTH_WALL_Z =
  ROUND_ROOM.centreZ -
  Math.sqrt(ROUND_ROOM.radius ** 2 - ROUND_ROOM_NORTH_FLAT_HALF ** 2);
const onNorthFlat = (mid: number) =>
  Math.sin(mid) < 0 &&
  Math.abs(Math.cos(mid) * ROUND_ROOM.radius) < ROUND_ROOM_NORTH_FLAT_HALF;

export function roundRoomFloorAt(x: number, z: number): number | null {
  const r = ROUND_ROOM;
  const distance = Math.hypot(x - r.centreX, z - r.centreZ);
  if (distance > r.radius) return null;
  return distance < 1.5 ? r.floorY - 0.2 : r.floorY;
}

export function dryPassageFloorAt(x: number, z: number): number | null {
  const p = DRY_PASSAGE;
  const endX = p.mouthX - p.steps * p.tread - p.landing;
  if (x > p.mouthX || x < endX || z < p.nearZ || z > p.farZ) return null;
  const distance = p.mouthX - x;
  return Math.min(p.steps, Math.ceil(distance / p.tread)) * p.rise;
}

export function dryPassageSolids(): Footprint[] {
  const p = DRY_PASSAGE;
  const endX = p.mouthX - p.steps * p.tread - p.landing;
  return [
    { minX: endX, maxX: p.mouthX, minZ: p.nearZ - 0.3, maxZ: p.nearZ },
    { minX: endX, maxX: p.mouthX, minZ: p.farZ, maxZ: p.farZ + 0.3 },
  ];
}

export function roundRoomSolids(): Footprint[] {
  const r = ROUND_ROOM;
  const segments = 40;
  const solids: Footprint[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const b = ((i + 1) / segments) * Math.PI * 2;
    const mid = (a + b) / 2;
    // Leave an opening that has the landing's exact 2.2 m width.
    if (Math.cos(mid) > 0 && Math.abs(Math.sin(mid) * r.radius) < 1.15)
      continue;
    if (onNorthFlat(mid)) continue;
    const ax = r.centreX + Math.cos(a) * r.radius;
    const az = r.centreZ + Math.sin(a) * r.radius;
    const bx = r.centreX + Math.cos(b) * r.radius;
    const bz = r.centreZ + Math.sin(b) * r.radius;
    solids.push({
      minX: Math.min(ax, bx) - 0.1,
      maxX: Math.max(ax, bx) + 0.1,
      minZ: Math.min(az, bz) - 0.1,
      maxZ: Math.max(az, bz) + 0.1,
    });
  }
  const left = r.centreX - ROUND_ROOM_NORTH_FLAT_HALF;
  const right = r.centreX + ROUND_ROOM_NORTH_FLAT_HALF;
  solids.push(
    {
      minX: left - 0.15,
      maxX: r.centreX - ROUND_ROOM_NORTH_OPENING,
      minZ: ROUND_ROOM_NORTH_WALL_Z - 0.12,
      maxZ: ROUND_ROOM_NORTH_WALL_Z + 0.12,
    },
    {
      minX: r.centreX + ROUND_ROOM_NORTH_OPENING,
      maxX: right + 0.15,
      minZ: ROUND_ROOM_NORTH_WALL_Z - 0.12,
      maxZ: ROUND_ROOM_NORTH_WALL_Z + 0.12,
    },
  );
  return solids;
}

export function createRoundPinkRoom(metre: number) {
  const r = ROUND_ROOM;
  const group = new Group();
  group.name = 'CR_A_ROUND pink tiled room';
  group.scale.setScalar(metre);
  // The basin's water, for its caustics (`round-room-light.ts`).
  const spec = {
    centreX: r.centreX,
    centreZ: r.centreZ,
    floorY: r.floorY,
    height: r.height,
    skylightRadius: 1.3,
    basinRadius: 1.5,
    waterY: r.floorY - 0.12,
  };
  const uniforms = roundRoomUniforms(metre, spec);
  const tile = createTileMaterial(uniforms, {
    colour: '#eab2bd',
    grout: '#bd8390',
    roughness: [0.22, 0.4],
    glaze: 0.28,
  });
  tile.side = DoubleSide;
  const clippedRing = (inner: number, outer: number, ceiling = false) => {
    const geometry = new RingGeometry(inner, outer, 96);
    const positions = geometry.getAttribute('position');
    const edge = r.centreZ - ROUND_ROOM_NORTH_WALL_Z;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      positions.setY(i, ceiling ? Math.max(y, -edge) : Math.min(y, edge));
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    return geometry;
  };
  const floor = new Mesh(clippedRing(1.5 + BASIN_GUTTER.width, r.radius), tile);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(r.centreX, r.floorY, r.centreZ);
  group.add(floor);
  const basinWall = new Mesh(
    new CylinderGeometry(1.5, 1.5, 0.28, 64, 1, true),
    tile,
  );
  basinWall.position.set(r.centreX, r.floorY - 0.14, r.centreZ);
  group.add(basinWall);
  const basinFloor = new Mesh(new CircleGeometry(1.5, 64), tile);
  basinFloor.rotation.x = -Math.PI / 2;
  basinFloor.position.set(r.centreX, r.floorY - 0.28, r.centreZ);
  group.add(basinFloor);
  const water = new Mesh(
    new CircleGeometry(1.48, 64),
    new MeshPhysicalMaterial({
      color: '#83d7d9',
      transparent: true,
      opacity: 0.68,
      roughness: 0.13,
      metalness: 0.05,
      depthWrite: false,
      side: DoubleSide,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(r.centreX, r.floorY - 0.12, r.centreZ);
  group.add(water);
  const ceiling = new Mesh(clippedRing(1.3, r.radius, true), tile);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(r.centreX, r.floorY + r.height, r.centreZ);
  group.add(ceiling);
  const skylight = new Mesh(
    new CircleGeometry(1.3, 64),
    new MeshBasicMaterial({ color: '#e2f5fa', side: DoubleSide }),
  );
  skylight.rotation.x = -Math.PI / 2;
  skylight.position.set(r.centreX, r.floorY + r.height + 0.02, r.centreZ);
  group.add(skylight);
  const skylightFrame = new Mesh(
    new TorusGeometry(1.3, 0.055, 8, 64),
    new MeshStandardMaterial({ color: '#e9d5db', roughness: 0.4 }),
  );
  skylightFrame.rotation.x = Math.PI / 2;
  skylightFrame.position.set(r.centreX, r.floorY + r.height - 0.005, r.centreZ);
  group.add(skylightFrame);
  // A flush drainage gully covers the change from the square landing tile
  // to the circular floor, including the slivers at each curved jamb.
  const mouthX =
    DRY_PASSAGE.mouthX -
    DRY_PASSAGE.steps * DRY_PASSAGE.tread -
    DRY_PASSAGE.landing;
  const width = DRY_PASSAGE.farZ - DRY_PASSAGE.nearZ;
  const channel = new Mesh(
    new BoxGeometry(0.44, 0.012, width + 0.08),
    new MeshStandardMaterial({ color: '#17242a', roughness: 0.92 }),
  );
  // The tiled deck continues beneath this threshold; a dark channel liner
  // covers it so the bars read as a drain rather than floating over tiles.
  channel.position.set(mouthX + 0.04, r.floorY + 0.007, r.centreZ);
  group.add(channel);
  const metal = new MeshStandardMaterial({
    color: '#b7c4c5',
    metalness: 0.65,
    roughness: 0.38,
  });
  for (let z = DRY_PASSAGE.nearZ + 0.055; z < DRY_PASSAGE.farZ; z += 0.115) {
    const bar = new Mesh(new BoxGeometry(0.39, 0.018, 0.035), metal);
    bar.position.set(mouthX + 0.04, r.floorY + 0.024, z);
    group.add(bar);
  }
  const segments = 64;
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const b = ((i + 1) / segments) * Math.PI * 2;
    const mid = (a + b) / 2;
    if (Math.cos(mid) > 0 && Math.abs(Math.sin(mid) * r.radius) < 1.15)
      continue;
    if (onNorthFlat(mid)) continue;
    const w = 2 * r.radius * Math.sin((b - a) / 2) + 0.015;
    const panel = new Mesh(new BoxGeometry(w, r.height, 0.16), tile);
    panel.position.set(
      r.centreX + Math.cos(mid) * r.radius,
      r.floorY + r.height / 2,
      r.centreZ + Math.sin(mid) * r.radius,
    );
    panel.rotation.y = -mid - Math.PI / 2;
    group.add(panel);
  }
  // Two jambs and a lintel on one plane, instead of radial panels cutting
  // through the tunnel's white shell.
  for (const side of [-1, 1]) {
    const width = ROUND_ROOM_NORTH_FLAT_HALF - ROUND_ROOM_NORTH_OPENING;
    const panel = new Mesh(new BoxGeometry(width, r.height, 0.16), tile);
    panel.position.set(
      r.centreX + side * (ROUND_ROOM_NORTH_OPENING + width / 2),
      r.floorY + r.height / 2,
      ROUND_ROOM_NORTH_WALL_Z,
    );
    group.add(panel);
  }
  const lintel = new Mesh(
    new BoxGeometry(
      2 * ROUND_ROOM_NORTH_OPENING,
      r.height - ROUND_ROOM_NORTH_HEAD,
      0.16,
    ),
    tile,
  );
  lintel.position.set(
    r.centreX,
    r.floorY + (r.height + ROUND_ROOM_NORTH_HEAD) / 2,
    ROUND_ROOM_NORTH_WALL_Z,
  );
  group.add(lintel);
  const light = new PointLight('#ffe4eb', 80, 7);
  light.position.set(r.centreX, r.floorY + r.height - 0.4, r.centreZ);
  group.add(light);
  addSkylightAndWater(group, spec, uniforms, water);
  addBasinGutter(group, spec, tile);
  return group;
}

export function createDryStairPassage(metre: number) {
  const p = DRY_PASSAGE;
  const group = new Group();
  group.name = 'Dry stair passage';
  group.scale.setScalar(metre);
  // Share the poolroom's projected ceramic tile shader, with no water
  // rectangles or caustics in this dry room.
  const uniforms = createPoolUniforms(metre, -100, []);
  uniforms.caustics.value = 0;
  uniforms.reflected.value = 0;
  const wall = createTileMaterial(uniforms, {
    colour: '#eef3f0',
    grout: '#b9c8c8',
  });
  const floor = createTileMaterial(uniforms, {
    colour: '#e7edeb',
    grout: '#b9c8c8',
    roughness: [0.14, 0.32],
    glaze: 0.35,
  });
  const lamp = new MeshStandardMaterial({
    color: '#eef8f5',
    emissive: '#d9fffa',
    emissiveIntensity: 1.8,
    roughness: 0.35,
  });
  const width = p.farZ - p.nearZ;
  const stairLength = p.steps * p.tread;
  const endX = p.mouthX - stairLength - p.landing;
  const wallStart = p.mouthX - 0.3;
  const middleZ = (p.nearZ + p.farZ) / 2;
  const box = (
    material: Material,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    group.add(mesh);
  };
  for (let i = 0; i < p.steps; i++) {
    const top = (i + 1) * p.rise;
    box(
      floor,
      p.tread,
      top,
      width,
      p.mouthX - (i + 0.5) * p.tread,
      top / 2,
      middleZ,
    );
  }
  const landingX = p.mouthX - stairLength - p.landing / 2;
  const landingY = p.steps * p.rise;
  box(floor, p.landing, landingY, width, landingX, landingY / 2, middleZ);
  box(
    wall,
    wallStart - endX,
    p.height,
    0.3,
    (wallStart + endX) / 2,
    p.height / 2,
    p.nearZ - 0.15,
  );
  box(
    wall,
    wallStart - endX,
    p.height,
    0.3,
    (wallStart + endX) / 2,
    p.height / 2,
    p.farZ + 0.15,
  );
  // Line the pool wall's exposed lintel on the corridor side. The opening
  // remains clear below 3.2 m, including the sightline into PR_A.
  box(
    wall,
    0.08,
    p.height - 3.2,
    width,
    p.mouthX - 0.34,
    (p.height + 3.2) / 2,
    middleZ,
  );
  // A skylight on its side, high on the lintel's lining, its daylight
  // slanting down the flight (`round-room-light.ts`).
  addWallSkylight(
    group,
    metre,
    { x: p.mouthX - 0.38, y: 5, z: middleZ, size: 1.6 },
    new Vector3(p.mouthX - 4.5, 4.5 * (p.rise / p.tread), middleZ),
  );
  box(
    wall,
    p.mouthX - endX,
    0.2,
    width + 0.6,
    (p.mouthX + endX) / 2,
    p.height + 0.1,
    middleZ,
  );
  // Small circular fittings are recessed flush with the wall face.
  for (const x of [p.mouthX - 1.4, p.mouthX - 4.2, landingX]) {
    const lightY = (dryPassageFloorAt(x, middleZ) ?? 0) + 2.1;
    for (const z of [p.nearZ + 0.002, p.farZ - 0.002]) {
      const disc = new Mesh(new CylinderGeometry(0.12, 0.12, 0.012, 24), lamp);
      disc.rotation.x = Math.PI / 2;
      disc.position.set(x, lightY, z);
      group.add(disc);
      const light = new PointLight('#e3f6f2', 10, 4.5);
      light.position.set(
        x,
        lightY,
        z === p.nearZ + 0.002 ? z + 0.12 : z - 0.12,
      );
      group.add(light);
    }
  }
  return group;
}
