import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  PointLight,
  Shape,
  ShapeGeometry,
} from 'three';
import {
  createPoolUniforms,
  createTileMaterial,
} from '../../components/pool/views/pool-surfaces';
import type { Footprint } from '../../controls/logic/walk-collision';

/**
 * red_bendy_1: a red-tiled corridor north from PR_A's back hall, its
 * section a half circle standing on a flat floor (3 m radius: 6 m
 * wide, 3 m to the crown), turning gently right, through 20 degrees,
 * as it goes, to a blind end. Metres, PR_A's frame.
 */
export const RED_BENDY = {
  /** The middle of its mouth in PR_A's north wall, x. */
  x: 10,
  /** PR_A's north wall: its inner face, and its thickness. */
  mouthZ: -9,
  hallWall: 0.3,
  radius: 3,
  /** Its length along its middle, and how far it turns (radians, to the right). */
  length: 12,
  turn: (20 * Math.PI) / 180,
} as const;

const b = RED_BENDY;
/** The corridor's middle line curves round a centre to its right (east). */
const bendRadius = b.length / b.turn;
const start = b.mouthZ - b.hallWall;
const centre = { x: b.x + bendRadius, z: start };

/** The middle line at `a` radians round the bend: its point and heading. */
function along(a: number) {
  return {
    x: centre.x - bendRadius * Math.cos(a),
    z: centre.z - bendRadius * Math.sin(a),
    /** The way along, and the way to the right (across), in (x, z). */
    ahead: [Math.sin(a), -Math.cos(a)] as const,
    right: [Math.cos(a), Math.sin(a)] as const,
  };
}

/** Where (x, z) is on the bend: how far round (radians) and how far right of the middle. */
function onBend(x: number, z: number) {
  const dx = x - centre.x,
    dz = z - centre.z;
  return {
    a: Math.atan2(-dz, -dx),
    across: bendRadius - Math.hypot(dx, dz),
  };
}

/** The half-width a walker keeps to: where the vault is still head high. */
const WALK = 2.15;

/**
 * A wall's face with the corridor's half-round mouth notched out of its
 * bottom edge, from `a` to `c` along x and `top` high: a shape in (x, y).
 */
export function redBendyWallShape(a: number, c: number, top: number) {
  const s = new Shape();
  s.moveTo(a, 0);
  s.lineTo(b.x - b.radius, 0);
  s.absarc(b.x, 0, b.radius, Math.PI, 0, true);
  s.lineTo(c, 0);
  s.lineTo(c, top);
  s.lineTo(a, top);
  s.closePath();
  return s;
}

/** The mouth's edges, x. */
export const redBendyJambs = () => [b.x - b.radius, b.x + b.radius] as const;

/** Whether (x, z) is in the corridor (through the hall's wall too). */
export function redBendyZoneAt(x: number, z: number): 'red_bendy_1' | null {
  if (z > b.mouthZ) return null;
  const { a, across } = onBend(x, z);
  if (Math.abs(across) > b.radius) return null;
  return a >= -0.05 && a <= b.turn ? 'red_bendy_1' : null;
}

/**
 * Continuous overlapping collision strips along each side, where the
 * vault comes down to head height, and across the blind end.
 */
export function redBendySolids(): Footprint[] {
  const solids: Footprint[] = [];
  const steps = 96;
  const thickness = 0.18;
  const first = -b.hallWall / bendRadius;
  for (let i = 0; i < steps; i++) {
    const p = along(first + (i / steps) * (b.turn - first));
    const q = along(first + ((i + 1) / steps) * (b.turn - first));
    for (const side of [-1, 1]) {
      const x = p.x + p.right[0] * side * WALK;
      const z = p.z + p.right[1] * side * WALK;
      const nextX = q.x + q.right[0] * side * WALK;
      const nextZ = q.z + q.right[1] * side * WALK;
      solids.push({
        minX: Math.min(x, nextX) - thickness,
        maxX: Math.max(x, nextX) + thickness,
        minZ: Math.min(z, nextZ) - thickness,
        maxZ: Math.max(z, nextZ) + thickness,
      });
    }
  }
  const end = along(b.turn);
  for (let k = -WALK; k < WALK; k += 0.12) {
    const x = end.x + end.right[0] * k + end.ahead[0] * 0.1;
    const z = end.z + end.right[1] * k + end.ahead[1] * 0.1;
    solids.push({
      minX: x - 0.16,
      maxX: x + 0.16,
      minZ: z - 0.16,
      maxZ: z + 0.16,
    });
  }
  return solids;
}

/** The corridor, scaled to `metre`: its vault, floor and blind end, in red tiles. */
export function createRedBendy(metre: number) {
  const group = new Group();
  group.name = 'red_bendy_1';
  group.scale.setScalar(metre);
  const uniforms = createPoolUniforms(metre, -100, []);
  uniforms.caustics.value = 0;
  uniforms.reflected.value = 0;
  const red = createTileMaterial(uniforms, {
    colour: '#b8322a',
    grout: '#7a1d18',
    roughness: [0.18, 0.36],
    glaze: 0.45,
  });
  red.side = DoubleSide;
  const floorTile = createTileMaterial(uniforms, {
    colour: '#a52c25',
    grout: '#6d1914',
    roughness: [0.2, 0.4],
    glaze: 0.3,
  });

  // A grid of rings along the bend: the vault (a half circle across) and
  // the floor (a straight line across), from the hall's wall face (the
  // floor from its inner face, through the wall) to the end.
  const rings = 48;
  const round = 32;
  const grid = (
    first: number,
    across: number,
    at: (p: ReturnType<typeof along>, j: number) => [number, number, number],
  ) => {
    const positions: number[] = [];
    const index: number[] = [];
    for (let i = 0; i <= rings; i++) {
      const p = along(first + (i / rings) * (b.turn - first));
      for (let j = 0; j <= across; j++) positions.push(...at(p, j));
    }
    for (let i = 0; i < rings; i++)
      for (let j = 0; j < across; j++) {
        const q = i * (across + 1) + j;
        index.push(
          q,
          q + across + 1,
          q + 1,
          q + 1,
          q + across + 1,
          q + across + 2,
        );
      }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setIndex(index);
    geometry.computeVertexNormals();
    return geometry;
  };
  const vault = new Mesh(
    grid(0, round, (p, j) => {
      const t = (j / round) * Math.PI;
      const side = b.radius * Math.cos(t);
      return [
        p.x + p.right[0] * side,
        b.radius * Math.sin(t),
        p.z + p.right[1] * side,
      ];
    }),
    red,
  );
  vault.name = 'red_bendy_1 vault';
  const floor = new Mesh(
    grid(-b.hallWall / bendRadius, 8, (p, j) => {
      const side = b.radius * (j / 8 - 0.5) * 2;
      return [p.x + p.right[0] * side, 0, p.z + p.right[1] * side];
    }),
    floorTile,
  );
  floor.name = 'red_bendy_1 floor';
  floorTile.side = DoubleSide;
  // The blind end: a half disc across the corridor's end.
  const end = along(b.turn);
  const half = new Shape();
  half.moveTo(-b.radius, 0);
  half.absarc(0, 0, b.radius, Math.PI, 0, true);
  half.closePath();
  const endWall = new Mesh(new ShapeGeometry(half, 32), red);
  endWall.name = 'red_bendy_1 end wall';
  endWall.position.set(end.x, 0, end.z);
  endWall.rotation.y = -b.turn;
  group.add(vault, floor, endWall);

  // Dim, warm light along the crown.
  for (const f of [0.25, 0.6, 0.92]) {
    const p = along(f * b.turn);
    const light = new PointLight('#ffd9c8', 1.5 * metre * metre, 6 * metre, 2);
    light.position.set(p.x, b.radius - 0.3, p.z);
    group.add(light);
  }
  return group;
}
