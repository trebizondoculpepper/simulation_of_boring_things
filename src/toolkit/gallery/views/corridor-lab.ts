import {
  BoxGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  PointLight,
} from 'three';
import type { Footprint } from '../../controls/logic/walk-collision';
import {
  CORRIDOR_WALL,
  CORRIDOR_WIDTH,
  corridorFloorAt,
  corridorFootprints,
  layoutCorridor,
  pieceLength,
} from '../../components/architectural/logic/corridor-path';
import type { CorridorPiece } from '../../components/architectural/logic/corridor-path';
import { createCorridorRun } from '../../components/architectural/views/corridor';
import {
  createPoolUniforms,
  createTileMaterial,
} from '../../components/pool/views/pool-surfaces';
import { METRE } from '../../components/core/logic/units';

/**
 * corridor_lab: the corridor kit (`components/architectural/views/
 * corridor.ts`), laid out as one run from a list of pieces, to walk: a
 * straight, a left turn, a straight, a right turn, a flight up, a right
 * turn, a left turn, a flight down (the same flight, met from its head)
 * and a last straight, with straights between; both ends closed.
 * Every corridor in the game is made of these pieces. Metres; the run
 * starts at the origin heading east.
 */
export const CORRIDOR_LAB_PIECES: readonly CorridorPiece[] = [
  { kind: 'straight', length: 6 },
  { kind: 'left' },
  { kind: 'straight', length: 4 },
  { kind: 'right' },
  { kind: 'straight', length: 3 },
  { kind: 'stairs', rise: 2 },
  { kind: 'straight', length: 3 },
  { kind: 'right' },
  { kind: 'straight', length: 3 },
  { kind: 'left' },
  { kind: 'straight', length: 2 },
  { kind: 'stairs', rise: -2 },
  { kind: 'straight', length: 4 },
];

const lab = () =>
  layoutCorridor(CORRIDOR_LAB_PIECES, { x: 0, z: 0, heading: 0 });

/** The floor under the walker, on the run. */
export function corridorLabFloorAt(x: number, z: number) {
  return corridorFloorAt(lab().placed, x, z) ?? 0;
}

/** The run's walls and its two closed ends, for walking collision. */
export function corridorLabSolids(): Footprint[] {
  const { placed, end } = lab();
  const half = CORRIDOR_WIDTH / 2 + CORRIDOR_WALL;
  return [
    ...corridorFootprints(placed),
    { minX: -CORRIDOR_WALL, maxX: 0, minZ: -half, maxZ: half },
    {
      minX: end.x,
      maxX: end.x + CORRIDOR_WALL,
      minZ: end.z - half,
      maxZ: end.z + half,
    },
  ];
}

export function createCorridorLab(metre: number) {
  const group = new Group();
  group.name = 'corridor_lab';
  group.scale.setScalar(metre);
  const uniforms = createPoolUniforms(METRE, -100, []);
  uniforms.caustics.value = uniforms.reflected.value = 0;
  const tile = createTileMaterial(uniforms);
  tile.side = DoubleSide;
  const { placed, end } = lab();
  group.add(createCorridorRun(placed, tile));
  // The two ends, closed: the run ends heading east at both.
  for (const x of [-CORRIDOR_WALL / 2, end.x + CORRIDOR_WALL / 2]) {
    const cap = new Mesh(
      new BoxGeometry(CORRIDOR_WALL, 2.5, CORRIDOR_WIDTH),
      tile,
    );
    cap.position.set(x, (x < 0 ? 0 : end.y) + 1.25, x < 0 ? 0 : end.z);
    group.add(cap);
  }
  // A ceiling lamp in each piece, a lit panel over a light.
  const panel = new MeshStandardMaterial({
    color: '#fff6e8',
    emissive: '#ffefd6',
    emissiveIntensity: 1.4,
  });
  for (const p of placed) {
    // No lamp in the turns.
    if (p.piece.kind === 'left' || p.piece.kind === 'right') continue;
    const along = pieceLength(p.piece) / 2;
    const y = p.y + (p.piece.kind === 'stairs' ? p.piece.rise / 2 : 0);
    const x = p.x + Math.cos(p.yaw) * along;
    const z = p.z - Math.sin(p.yaw) * along;
    const lamp = new Mesh(new BoxGeometry(0.5, 0.03, 0.5), panel);
    lamp.position.set(x, y + 2.485, z);
    group.add(lamp);
    const light = new PointLight('#ffe8c8', 1.2 * metre * metre, 9 * metre, 2);
    light.position.set(x, y + 2.3, z);
    group.add(light);
  }
  return group;
}
