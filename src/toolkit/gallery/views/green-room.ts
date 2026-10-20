import {
  BoxGeometry,
  CircleGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
  TorusGeometry,
} from 'three';
import {
  createPoolUniforms,
  createTileMaterial,
} from '../../components/pool/views/pool-surfaces';
import type { Footprint } from '../../controls/logic/walk-collision';
import { WHITE_CORRIDOR, WHITE_CORRIDOR_START } from './white-corridor';

/** A separate dry room at the north end of the white corridor. */
export const GREEN_ROOM = {
  x: WHITE_CORRIDOR.x,
  southZ: WHITE_CORRIDOR_START - WHITE_CORRIDOR.length,
  width: 30,
  depth: 30,
  height: 4,
  floorY: WHITE_CORRIDOR.floorY,
} as const;

export function greenRoomZoneAt(x: number, z: number): 'green_room_1' | null {
  const r = GREEN_ROOM;
  return Math.abs(x - r.x) <= r.width / 2 &&
    z <= r.southZ &&
    z >= r.southZ - r.depth
    ? 'green_room_1'
    : null;
}

export function greenRoomSolids(): Footprint[] {
  const r = GREEN_ROOM;
  const left = r.x - r.width / 2;
  const right = r.x + r.width / 2;
  const north = r.southZ - r.depth;
  const mouth = WHITE_CORRIDOR.width / 2;
  return [
    { minX: left - 0.2, maxX: left, minZ: north - 0.2, maxZ: r.southZ + 0.2 },
    { minX: right, maxX: right + 0.2, minZ: north - 0.2, maxZ: r.southZ + 0.2 },
    { minX: left, maxX: right, minZ: north - 0.2, maxZ: north },
    { minX: left, maxX: r.x - mouth, minZ: r.southZ, maxZ: r.southZ + 0.2 },
    { minX: r.x + mouth, maxX: right, minZ: r.southZ, maxZ: r.southZ + 0.2 },
  ];
}

export function createGreenRoom(metre: number) {
  const r = GREEN_ROOM;
  const group = new Group();
  group.name = 'green_room_1';
  group.scale.setScalar(metre);
  const uniforms = createPoolUniforms(metre, -100, []);
  uniforms.caustics.value = 0;
  uniforms.reflected.value = 0;
  const tile = createTileMaterial(uniforms, {
    colour: '#174e42',
    grout: '#0b302a',
    roughness: [0.24, 0.42],
    glaze: 0.26,
  });
  tile.side = DoubleSide;
  const add = (
    name: string,
    sx: number,
    sy: number,
    sz: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new Mesh(new BoxGeometry(sx, sy, sz), tile);
    mesh.name = name;
    mesh.position.set(x, y, z);
    group.add(mesh);
  };
  const centreZ = r.southZ - r.depth / 2;
  add(
    'green tiled floor',
    r.width,
    0.08,
    r.depth,
    r.x,
    r.floorY - 0.04,
    centreZ,
  );
  add(
    'green tiled ceiling',
    r.width,
    0.12,
    r.depth,
    r.x,
    r.floorY + r.height + 0.06,
    centreZ,
  );
  for (const side of [-1, 1])
    add(
      'green side wall',
      0.16,
      r.height,
      r.depth,
      r.x + (side * r.width) / 2,
      r.floorY + r.height / 2,
      centreZ,
    );
  add(
    'green north wall',
    r.width,
    r.height,
    0.16,
    r.x,
    r.floorY + r.height / 2,
    r.southZ - r.depth,
  );
  const shoulder = (r.width - WHITE_CORRIDOR.width) / 2;
  for (const side of [-1, 1])
    add(
      'green south jamb',
      shoulder,
      r.height,
      0.16,
      r.x + side * (WHITE_CORRIDOR.width / 2 + shoulder / 2),
      r.floorY + r.height / 2,
      r.southZ,
    );
  add(
    'green south lintel',
    WHITE_CORRIDOR.width,
    r.height - WHITE_CORRIDOR.height,
    0.16,
    r.x,
    r.floorY + (r.height + WHITE_CORRIDOR.height) / 2,
    r.southZ,
  );

  const glass = new MeshBasicMaterial({ color: '#d9eef0', side: DoubleSide });
  const frame = new MeshStandardMaterial({
    color: '#345c53',
    metalness: 0.4,
    roughness: 0.45,
  });
  for (const dx of [-7.5, 7.5])
    for (const dz of [-8, -22]) {
      const x = r.x + dx;
      const z = r.southZ + dz;
      const skylight = new Mesh(new CircleGeometry(1.25, 48), glass);
      skylight.name = 'round skylight';
      skylight.rotation.x = -Math.PI / 2;
      skylight.position.set(x, r.floorY + r.height - 0.015, z);
      const rim = new Mesh(new TorusGeometry(1.25, 0.055, 8, 48), frame);
      rim.rotation.x = Math.PI / 2;
      rim.position.copy(skylight.position);
      rim.position.y -= 0.01;
      const light = new PointLight('#d9f4ee', 3 * metre * metre, 10 * metre, 2);
      light.position.set(x, r.floorY + r.height - 0.2, z);
      group.add(skylight, rim, light);
    }
  return group;
}
