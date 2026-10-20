import { ExtrudeGeometry, Group, Mesh, Path, PointLight, Shape } from 'three';
import {
  createPoolUniforms,
  createTileMaterial,
} from '../../components/pool/views/pool-surfaces';
import type { Footprint } from '../../controls/logic/walk-collision';
import {
  ROUND_ROOM,
  ROUND_ROOM_NORTH_OPENING,
  ROUND_ROOM_NORTH_WALL_Z,
} from './dry-stair-passage';

/**
 * white_corridor_1: a white-tiled corridor north out of CR_A_ROUND, 5 m
 * long and 2.5 m high, its section a rectangle with its corners rounded,
 * top and bottom, opening into the green room. Metres, PR_A's frame.
 */
export const WHITE_CORRIDOR = {
  x: ROUND_ROOM.centreX,
  floorY: ROUND_ROOM.floorY,
  width: 2 * ROUND_ROOM_NORTH_OPENING,
  height: 2.5,
  /** The radius of its rounded corners, and its walls' thickness. */
  corner: 0.35,
  wall: 0.2,
  length: 5,
} as const;

const w = WHITE_CORRIDOR;
const half = w.width / 2;
/** Where its sides meet the round room's wall, and its blind end. */
export const WHITE_CORRIDOR_START = ROUND_ROOM_NORTH_WALL_Z;
const startZ = WHITE_CORRIDOR_START;
const endZ = startZ - w.length;

/** Whether (x, z) is in the corridor. */
export function whiteCorridorZoneAt(
  x: number,
  z: number,
): 'white_corridor_1' | null {
  return Math.abs(x - w.x) <= half && z <= startZ && z >= endZ
    ? 'white_corridor_1'
    : null;
}

/** The floor in the corridor (the round room's, carried on), or null outside it. */
export function whiteCorridorFloorAt(x: number, z: number): number | null {
  return whiteCorridorZoneAt(x, z) ? w.floorY : null;
}

/** Its sides, for the walker; the north end is open to the green room. */
export function whiteCorridorSolids(): Footprint[] {
  const t = w.wall;
  return [
    {
      minX: w.x - half - t,
      maxX: w.x - half,
      minZ: endZ - t,
      maxZ: startZ + 0.2,
    },
    {
      minX: w.x + half,
      maxX: w.x + half + t,
      minZ: endZ - t,
      maxZ: startZ + 0.2,
    },
  ];
}

/** A rectangle `width` by `height` from (x, y), its corners rounded `r`. */
function rounded(
  path: Path,
  x: number,
  y: number,
  width: number,
  height: number,
  r: number,
) {
  path.moveTo(x + r, y);
  path.lineTo(x + width - r, y);
  path.absarc(x + width - r, y + r, r, -Math.PI / 2, 0, false);
  path.lineTo(x + width, y + height - r);
  path.absarc(x + width - r, y + height - r, r, 0, Math.PI / 2, false);
  path.lineTo(x + r, y + height);
  path.absarc(x + r, y + height - r, r, Math.PI / 2, Math.PI, false);
  path.lineTo(x, y + r);
  path.absarc(x + r, y + r, r, Math.PI, (3 * Math.PI) / 2, false);
  return path;
}

/** The corridor, scaled to `metre`. */
export function createWhiteCorridor(metre: number) {
  const group = new Group();
  group.name = 'white_corridor_1';
  group.scale.setScalar(metre);
  const uniforms = createPoolUniforms(metre, -100, []);
  uniforms.caustics.value = 0;
  uniforms.reflected.value = 0;
  const tile = createTileMaterial(uniforms, {
    colour: '#f3f5f1',
    grout: '#c3cbca',
    roughness: [0.12, 0.3],
  });
  const t = w.wall;
  // The section: the walls' outline with the corridor's own as its hole,
  // drawn along the corridor. Its floor is the hole's flat bottom.
  const section = rounded(
    new Shape(),
    -half - t,
    -t,
    w.width + 2 * t,
    w.height + 2 * t,
    w.corner + t,
  ) as Shape;
  section.holes.push(
    rounded(new Path(), -half, 0, w.width, w.height, w.corner),
  );
  // Meet the flat pink wall without pushing the white casing through it.
  const from = startZ - 0.04;
  const tube = new Mesh(
    new ExtrudeGeometry(section, {
      depth: from - endZ,
      bevelEnabled: false,
      curveSegments: 12,
    }).translate(w.x, w.floorY, endZ),
    tile,
  );
  tube.name = 'white_corridor_1 walls';
  group.add(tube);
  for (const f of [0.35, 0.8]) {
    const light = new PointLight('#f2f6f4', 1 * metre * metre, 5 * metre, 2);
    light.position.set(w.x, w.floorY + w.height - 0.25, startZ - f * w.length);
    group.add(light);
  }
  return group;
}
