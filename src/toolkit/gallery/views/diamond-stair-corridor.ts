import {
  BoxGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Mesh,
  PointLight,
  Shape,
  Path,
} from 'three';
import {
  createPoolUniforms,
  createTileMaterial,
} from '../../components/pool/views/pool-surfaces';
import type { Footprint } from '../../controls/logic/walk-collision';
import { GREEN_ROOM, GREEN_WEST_PORTAL_Z } from './green-room';

/** The west exit of the green room. The far end hands off to CR_A_STEPS. */
export const DIAMOND_STAIR = {
  eastX: GREEN_ROOM.x - GREEN_ROOM.width / 2,
  z: GREEN_WEST_PORTAL_Z,
  width: 2,
  length: 3.8,
  landing: 1,
  steps: 6,
  tread: 0.3,
  rise: 1 / 6,
  floorY: GREEN_ROOM.floorY,
  crown: 3.5,
} as const;

export const DIAMOND_STAIR_WEST_X = DIAMOND_STAIR.eastX - DIAMOND_STAIR.length;

/** A pointed diamond vault with its lower point truncated into a flat floor. */
export function diamondOutline(path: Shape | Path, inset = 0) {
  const half = DIAMOND_STAIR.width / 2 + inset;
  const shoulder = 1.35 + inset;
  path.moveTo(-half, -inset);
  path.lineTo(half, -inset);
  path.lineTo(shoulder, 1.4);
  path.lineTo(0.28 + inset, DIAMOND_STAIR.crown + inset);
  path.lineTo(-0.28 - inset, DIAMOND_STAIR.crown + inset);
  path.lineTo(-shoulder, 1.4);
  path.closePath();
  return path;
}

export function diamondStairZoneAt(
  x: number,
  z: number,
): 'CR_GREEN_STAIR' | null {
  return x <= DIAMOND_STAIR.eastX &&
    x >= DIAMOND_STAIR_WEST_X &&
    Math.abs(z - DIAMOND_STAIR.z) <= DIAMOND_STAIR.width / 2
    ? 'CR_GREEN_STAIR'
    : null;
}

export function diamondStairFloorAt(x: number, z: number): number | null {
  if (!diamondStairZoneAt(x, z)) return null;
  const d = DIAMOND_STAIR.eastX - x;
  if (d <= DIAMOND_STAIR.landing) return DIAMOND_STAIR.floorY;
  const step = Math.min(
    DIAMOND_STAIR.steps,
    Math.ceil((d - DIAMOND_STAIR.landing) / DIAMOND_STAIR.tread),
  );
  return DIAMOND_STAIR.floorY + step * DIAMOND_STAIR.rise;
}

export function diamondStairSolids(): Footprint[] {
  const d = DIAMOND_STAIR;
  return [
    {
      minX: DIAMOND_STAIR_WEST_X - 0.2,
      maxX: d.eastX + 0.2,
      minZ: d.z - d.width / 2 - 0.2,
      maxZ: d.z - d.width / 2,
    },
    {
      minX: DIAMOND_STAIR_WEST_X - 0.2,
      maxX: d.eastX + 0.2,
      minZ: d.z + d.width / 2,
      maxZ: d.z + d.width / 2 + 0.2,
    },
  ];
}

export function createDiamondStairCorridor(metre: number) {
  const d = DIAMOND_STAIR;
  const group = new Group();
  group.name = 'CR_GREEN_STAIR diamond tiled stair';
  group.scale.setScalar(metre);
  const uniforms = createPoolUniforms(metre, -100, []);
  uniforms.caustics.value = 0;
  uniforms.reflected.value = 0;
  const tile = createTileMaterial(uniforms, {
    colour: '#bdd9cc',
    grout: '#688b7e',
    roughness: [0.2, 0.4],
  });
  tile.side = DoubleSide;
  const outer = diamondOutline(new Shape(), 0.18) as Shape;
  outer.holes.push(diamondOutline(new Path()) as Path);
  const shell = new Mesh(
    new ExtrudeGeometry(outer, { depth: d.length, bevelEnabled: false })
      .rotateY(Math.PI / 2)
      .translate(DIAMOND_STAIR_WEST_X, d.floorY, d.z),
    tile,
  );
  shell.name = 'truncated diamond tiled shell';
  group.add(shell);
  for (let i = 1; i <= d.steps; i++) {
    const east = d.eastX - d.landing - (i - 1) * d.tread;
    const step = new Mesh(new BoxGeometry(d.tread, i * d.rise, d.width), tile);
    step.name = `diamond stair step ${i}`;
    step.position.set(east - d.tread / 2, d.floorY + (i * d.rise) / 2, d.z);
    group.add(step);
  }
  const light = new PointLight('#e3f6ec', 5 * metre * metre, 5 * metre, 2);
  light.position.set(d.eastX - 2.1, d.floorY + 2.8, d.z);
  group.add(light);
  return group;
}
