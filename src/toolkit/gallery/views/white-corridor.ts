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

/**
 * Its last stretch steps down a metre to the green room's floor: six
 * small steps with rounded nosings, the last riser at the corridor's
 * end; the section deepens over them, its ceiling level.
 */
export const WHITE_CORRIDOR_STEPS = {
  count: 6,
  tread: 0.3,
  drop: 1,
  nosing: 0.05,
} as const;
const st = WHITE_CORRIDOR_STEPS;
const stepRise = st.drop / st.count;
/** Where the flight begins (its top riser), z. */
const stepTop = endZ + (st.count - 1) * st.tread;

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
  if (!whiteCorridorZoneAt(x, z)) return null;
  if (z >= stepTop) return w.floorY;
  const step = Math.min(st.count, Math.ceil((stepTop - z) / st.tread));
  return w.floorY - step * stepRise;
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

/**
 * The corridor's outside outline, its walls included, in (x, y) about its
 * middle and its floor: for cutting the hole a wall it passes through
 * needs (`green-room.ts`).
 */
export function whiteCorridorOutline<P extends Path>(
  path: P,
  drop: number = st.drop,
): P {
  const t = w.wall;
  return rounded(
    path,
    -half - t,
    -t - drop,
    w.width + 2 * t,
    w.height + drop + 2 * t,
    w.corner + t,
  ) as P;
}

/** How far past its end the corridor's casing runs, through the green room's wall to its face. */
export const WHITE_CORRIDOR_THROUGH = 0.08;

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
  // The section: the walls' outline with the corridor's own as its hole,
  // drawn along the corridor; its floor is the hole's flat bottom, `drop`
  // below the corridor's floor (over the steps, a metre).
  const section = (drop: number) => {
    const shape = whiteCorridorOutline(new Shape(), drop);
    shape.holes.push(
      rounded(new Path(), -half, -drop, w.width, w.height + drop, w.corner),
    );
    return shape;
  };
  const tube = (drop: number, from: number, to: number, name: string) => {
    const mesh = new Mesh(
      new ExtrudeGeometry(section(drop), {
        depth: to - from,
        bevelEnabled: false,
        curveSegments: 12,
      }).translate(w.x, w.floorY, from),
      tile,
    );
    mesh.name = name;
    group.add(mesh);
  };
  // Meet the flat pink wall without pushing the white casing through it.
  tube(0, stepTop, startZ - 0.04, 'white_corridor_1 walls');
  // Over the steps, and through the green room's wall to its face.
  tube(
    st.drop,
    endZ - WHITE_CORRIDOR_THROUGH,
    stepTop,
    'white_corridor_1 walls over the steps',
  );
  // The steps: their side profile, each nosing rounded, drawn across the
  // corridor's width (a shape in (z, y), laid along x).
  const profile = new Shape();
  const bottom = w.floorY - st.drop;
  profile.moveTo(stepTop, bottom);
  for (let i = 1; i < st.count; i++) {
    const top = w.floorY - i * stepRise;
    const back = stepTop - (i - 1) * st.tread;
    const front = back - st.tread;
    profile.lineTo(back, top);
    profile.lineTo(front + st.nosing, top);
    profile.absarc(
      front + st.nosing,
      top - st.nosing,
      st.nosing,
      Math.PI / 2,
      Math.PI,
      false,
    );
  }
  profile.lineTo(endZ, bottom);
  profile.closePath();
  const steps = new Mesh(
    new ExtrudeGeometry(profile, {
      depth: w.width,
      bevelEnabled: false,
      curveSegments: 6,
    })
      .rotateY(-Math.PI / 2)
      .translate(w.x + half, 0, 0),
    tile,
  );
  steps.name = 'white_corridor_1 steps';
  group.add(steps);
  for (const f of [0.35, 0.8]) {
    const light = new PointLight('#f2f6f4', 1 * metre * metre, 5 * metre, 2);
    light.position.set(w.x, w.floorY + w.height - 0.25, startZ - f * w.length);
    group.add(light);
  }
  return group;
}
