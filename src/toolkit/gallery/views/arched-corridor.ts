import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Path,
  ShapeGeometry,
  PointLight,
  Shape,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import type { Material } from 'three';
import {
  createPoolUniforms,
  createTileMaterial,
} from '../../components/pool/views/pool-surfaces';
import type { TileOptions } from '../../components/pool/views/pool-surfaces';
import { cutOpenings } from '../../controls/logic/walk-collision';
import type { Footprint } from '../../controls/logic/walk-collision';
import { addSkylightSun, rippleWater } from './round-room-light';
import { createPoolLadder } from './pool-ladder';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { diamondOutline } from './diamond-stair-corridor';

/**
 * A barrel-vaulted corridor running south from PR_A's south wall: 1.2 m
 * wide, 3 m to the crown of its semicircular vault, 10 m deep from the
 * hall's wall face. Metres, PR_A's frame.
 */
export const ARCHED_CORRIDOR = {
  /** The corridor's centre line, x. */
  x: -2.66,
  /** The hall's south wall: its inner face and its thickness. */
  mouthZ: 9,
  hallWall: 0.3,
  width: 1.2,
  height: 3,
  depth: 10,
  /** The corridor's own walls' thickness. */
  wall: 0.3,
} as const;

const c = ARCHED_CORRIDOR;
const halfWidth = c.width / 2;
/** Where the vault springs: the crown less its radius. */
export const ARCH_SPRING = c.height - halfWidth;
const endZ = c.mouthZ + c.depth;

/**
 * The room the corridor opens into: 10 m square inside its walls, its
 * floor 1 m below the corridor's and its ceiling level with the arch's
 * crown. The doorway, through its north wall, opens onto a landing at
 * the corridor's level the room's full width, and six steps the full
 * width go down from it to the floor.
 */
export const ARCHED_ROOM = {
  minX: c.x - 5,
  maxX: c.x + 5,
  /** Its north wall's inner face; the wall runs from the corridor's end to here. */
  minZ: endZ + c.wall,
  maxZ: endZ + c.wall + 10,
  floor: -1,
  ceiling: c.height,
  landing: 1,
  steps: 6,
  tread: 0.3,
  /** A single round window in the north wall, west of the doorway: its middle and radius. */
  window: { x: -5.5, y: 1.5, radius: 0.6 },
  /** A round skylight in the ceiling, past the foot of the first flight. */
  skylight: { x: c.x, z: 22.6, radius: 1.2 },
} as const;

const r = ARCHED_ROOM;
export const ARCHED_LINK_Z = 24.54;
export const ARCHED_LINK_HALF = 1;
const rise = -r.floor / r.steps;
const stairTop = r.minZ + r.landing;
const stairFoot = stairTop + r.steps * r.tread;

/**
 * The room's extension west: its north wall shares the same plane as the
 * main room's window wall. A second flight of six steps crosses its full
 * width, descending another metre from the old west wall's line. The
 * ceiling stays level across both parts of the room.
 */
export const ARCHED_EXTENSION = {
  minX: r.minX - 10,
  maxX: r.minX,
  minZ: r.minZ,
  maxZ: r.maxZ,
  floor: r.floor - 1,
} as const;
const e = ARCHED_EXTENSION;
const lowerRise = (r.floor - e.floor) / r.steps;

/**
 * A pool in the extension's lower floor: 1 m deep, with a 1.2 m deck all
 * round, to the walls and to the foot of the second flight; its water
 * just below the deck.
 */
export const ARCHED_POOL = {
  minX: e.minX + 1.2,
  maxX: e.maxX - r.steps * r.tread - 1.2,
  minZ: e.minZ + 1.2,
  maxZ: e.maxZ - 1.2,
  floor: e.floor - 1,
  waterY: e.floor - 0.05,
} as const;
const pool = ARCHED_POOL;
/** The radius of the pool's rounded corners. */
export const ARCHED_POOL_CORNER = 0.6;
/** Its overflow gutter, round it under the grating: width and depth below the deck. */
export const ARCHED_POOL_GUTTER = { width: 0.25, depth: 0.2 } as const;
/** The pool's ladder, on its east side facing the steps: its middle, z. */
const POOL_LADDER_Z = (pool.minZ + pool.maxZ) / 2;

/** The opening's edges, x. */
export const corridorJambs = () => [c.x - halfWidth, c.x + halfWidth] as const;

/**
 * A wall's face with the corridor's arched opening notched out of its
 * bottom edge, from `a` to `b` along x and `top` high: a shape in (x, y).
 */
export function archedWallShape(a: number, b: number, top: number) {
  const [left, right] = corridorJambs();
  const s = new Shape();
  s.moveTo(a, 0);
  s.lineTo(left, 0);
  s.lineTo(left, ARCH_SPRING);
  // Over the crown, from the west springing to the east.
  s.absarc(c.x, ARCH_SPRING, halfWidth, Math.PI, 0, true);
  s.lineTo(right, 0);
  s.lineTo(b, 0);
  s.lineTo(b, top);
  s.lineTo(a, top);
  s.closePath();
  return s;
}

/** The corridor's and the room's walls, for the walker. */
export function archedCorridorSolids(): Footprint[] {
  const [left, right] = corridorJambs();
  const start = c.mouthZ + c.hallWall;
  const w = c.wall;
  return [
    // The corridor's sides, through the room's north wall.
    { minX: left - w, maxX: left, minZ: start, maxZ: r.minZ },
    { minX: right, maxX: right + w, minZ: start, maxZ: r.minZ },
    // The room's north wall either side of the doorway, and the others.
    { minX: r.minX - w, maxX: left, minZ: endZ, maxZ: r.minZ },
    { minX: right, maxX: r.maxX + w, minZ: endZ, maxZ: r.minZ },
    { minX: e.minX - w, maxX: r.maxX + w, minZ: r.maxZ, maxZ: r.maxZ + w },
    // The extension's north wall lines up with the window wall. The tiled
    // structure below the upper landing and stair remains solid; passage
    // into the extension starts at the foot of that stair.
    { minX: r.minX - w, maxX: r.minX, minZ: endZ, maxZ: stairFoot },
    { minX: e.minX - w, maxX: r.minX - w, minZ: e.minZ - w, maxZ: e.minZ },
    { minX: e.minX - w, maxX: e.minX, minZ: e.minZ - w, maxZ: e.maxZ + w },
    {
      minX: r.maxX,
      maxX: r.maxX + w,
      minZ: endZ,
      maxZ: ARCHED_LINK_Z - ARCHED_LINK_HALF,
    },
    {
      minX: r.maxX,
      maxX: r.maxX + w,
      minZ: ARCHED_LINK_Z + ARCHED_LINK_HALF,
      maxZ: r.maxZ + w,
    },
    {
      minX: r.maxX,
      maxX: r.maxX + 1.1,
      minZ: ARCHED_LINK_Z - ARCHED_LINK_HALF - 0.2,
      maxZ: ARCHED_LINK_Z - ARCHED_LINK_HALF,
    },
    {
      minX: r.maxX,
      maxX: r.maxX + 1.1,
      minZ: ARCHED_LINK_Z + ARCHED_LINK_HALF,
      maxZ: ARCHED_LINK_Z + ARCHED_LINK_HALF + 0.2,
    },
    // The pool's edge, open at the ladder: the way in, and out.
    ...cutOpenings(
      [
        {
          minX: pool.minX - 0.05,
          maxX: pool.maxX + 0.05,
          minZ: pool.minZ - 0.05,
          maxZ: pool.minZ + 0.05,
        },
        {
          minX: pool.minX - 0.05,
          maxX: pool.maxX + 0.05,
          minZ: pool.maxZ - 0.05,
          maxZ: pool.maxZ + 0.05,
        },
        {
          minX: pool.minX - 0.05,
          maxX: pool.minX + 0.05,
          minZ: pool.minZ,
          maxZ: pool.maxZ,
        },
        {
          minX: pool.maxX - 0.05,
          maxX: pool.maxX + 0.05,
          minZ: pool.minZ,
          maxZ: pool.maxZ,
        },
      ],
      [
        {
          minX: pool.maxX - 0.3,
          maxX: pool.maxX + 0.3,
          minZ: POOL_LADDER_Z - 0.35,
          maxZ: POOL_LADDER_Z + 0.35,
        },
      ],
    ),
  ];
}

/**
 * The floor at (x, z) in the corridor or the room, metres, or null
 * elsewhere: the corridor and landing at 0, the steps, the room's floor.
 */
export function archedFloorAt(x: number, z: number): number | null {
  const [left, right] = corridorJambs();
  if (x >= left && x <= right && z >= c.mouthZ && z < r.minZ) return 0;
  if (
    x >= r.maxX &&
    x <= r.maxX + 1.1 &&
    Math.abs(z - ARCHED_LINK_Z) <= ARCHED_LINK_HALF
  )
    return r.floor;
  // In the pool, wading on its floor.
  if (x > pool.minX && x < pool.maxX && z > pool.minZ && z < pool.maxZ)
    return pool.floor;
  if (x >= e.minX && x < e.maxX && z >= e.minZ && z <= e.maxZ) {
    // The second flight, down from the old west wall's line.
    const step = Math.ceil((e.maxX - x) / r.tread);
    return step >= r.steps ? e.floor : r.floor - step * lowerRise;
  }
  if (x < r.minX || x > r.maxX || z < r.minZ || z > r.maxZ) return null;
  if (z <= stairTop) return 0;
  if (z >= stairFoot) return r.floor;
  return -Math.ceil((z - stairTop) / r.tread) * rise;
}

/** Which of the two rooms (x, z) is in, metres, or null outside both. */
export function archedZoneAt(
  x: number,
  z: number,
): 'CR_A_ARCH' | 'CR_A_STEPS' | null {
  if (archedFloorAt(x, z) === null) return null;
  return z < r.minZ ? 'CR_A_ARCH' : 'CR_A_STEPS';
}

/** A rectangle from (x, z), `w` by `d`, its corners rounded `r`, drawn on `path` in (x, z). */
function roundedRect<P extends Path>(
  path: P,
  x: number,
  z: number,
  w: number,
  d: number,
  r: number,
) {
  path.moveTo(x + r, z);
  path.lineTo(x + w - r, z);
  path.absarc(x + w - r, z + r, r, -Math.PI / 2, 0, false);
  path.lineTo(x + w, z + d - r);
  path.absarc(x + w - r, z + d - r, r, 0, Math.PI / 2, false);
  path.lineTo(x + r, z + d);
  path.absarc(x + r, z + d - r, r, Math.PI / 2, Math.PI, false);
  path.lineTo(x, z + r);
  path.absarc(x + r, z + r, r, Math.PI, (3 * Math.PI) / 2, false);
  return path;
}

/**
 * The corridor and its room, scaled to `metre`, tiled as the hall:
 * `walls` and `floor` are the hall's tile looks. Their tiles have no
 * water above them, so the pool's tint and caustics, which colour any
 * tile below its water line, do not reach the room's sunken floor.
 */
export function createArchedCorridor(
  metre: number,
  walls: TileOptions,
  floor: TileOptions,
) {
  const group = new Group();
  group.name = 'Arched corridor';
  group.scale.setScalar(metre);
  // Only the pool's tiles are below its water: tinted, with caustics.
  const uniforms = createPoolUniforms(metre, pool.waterY, [pool]);
  const roomWall = createTileMaterial(uniforms, walls);
  roomWall.side = DoubleSide;
  const roomFloor = createTileMaterial(uniforms, floor);
  const [left, right] = corridorJambs();
  const start = c.mouthZ + c.hallWall;
  const run = endZ - start;
  const add = (mesh: Mesh, name: string) => {
    mesh.name = name;
    group.add(mesh);
    return mesh;
  };
  // Walls and vault in one: the cross-section, its opening notched out,
  // drawn along the corridor.
  add(
    new Mesh(
      new ExtrudeGeometry(
        archedWallShape(left - c.wall, right + c.wall, c.height + c.wall),
        { depth: run, bevelEnabled: false, curveSegments: 32 },
      ).translate(0, 0, start),
      roomWall,
    ),
    'arched corridor vault',
  );
  // The floor, its top at the deck's level, from the hall's wall face.
  add(
    new Mesh(new BoxGeometry(c.width, 0.1, c.depth), roomFloor),
    'arched corridor floor',
  ).position.set(c.x, -0.05, c.mouthZ + c.depth / 2);

  const box = (
    material: Material,
    name: string,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    minZ: number,
    maxZ: number,
  ) =>
    add(
      new Mesh(
        new BoxGeometry(maxX - minX, maxY - minY, maxZ - minZ),
        material,
      ),
      name,
    ).position.set((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
  const w = c.wall;
  // The north wall, the doorway in its own plane; below the landing's
  // level it is hidden behind the landing.
  const north = archedWallShape(r.minX - w, r.maxX + w, r.ceiling);
  const pane = r.window;
  north.holes.push(
    new Path().absarc(pane.x, pane.y, pane.radius, 0, Math.PI * 2, false),
  );
  add(
    new Mesh(
      new ExtrudeGeometry(north, {
        depth: w,
        bevelEnabled: false,
        curveSegments: 48,
      }).translate(0, 0, endZ),
      roomWall,
    ),
    'arched room north wall',
  );
  box(
    roomWall,
    'arched room south wall',
    e.minX - w,
    r.maxX + w,
    e.floor,
    r.ceiling,
    r.maxZ,
    r.maxZ + w,
  );
  // Close the side of the upper landing and each descending tread. Without
  // this lining the extended lower room exposes a dark void under the stair.
  box(
    roomWall,
    'arched landing side',
    r.minX - w,
    r.minX,
    e.floor,
    0,
    endZ,
    stairTop,
  );
  for (let i = 1; i <= r.steps; i++)
    box(
      roomWall,
      'arched stair side',
      r.minX - w,
      r.minX,
      e.floor,
      -i * rise,
      stairTop + (i - 1) * r.tread,
      stairTop + i * r.tread,
    );
  // The extension west: its walls, its ceiling level with the room's, its
  // floor, and the second flight down to it.
  box(
    roomWall,
    'arched extension north wall',
    e.minX - w,
    r.minX - w,
    e.floor,
    r.ceiling,
    e.minZ - w,
    e.minZ,
  );
  box(
    roomWall,
    'arched extension west wall',
    e.minX - w,
    e.minX,
    e.floor,
    r.ceiling,
    e.minZ - w,
    e.maxZ,
  );
  box(
    roomWall,
    'arched extension ceiling',
    e.minX - w,
    r.minX - w,
    r.ceiling,
    r.ceiling + 0.2,
    e.minZ - w,
    e.maxZ + w,
  );
  // The pool: its corners rounded, deck-level, its water up to an overflow
  // gutter round it under a flush grating. The deck is a slab with the
  // gutter's outline cut out of it; under the grating, a kerb with the
  // pool's own outline cut out of it stands to the gutter's floor, its
  // inner face the pool's walls; and the water spills over it into the
  // gutter.
  const g = ARCHED_POOL_GUTTER;
  const outline = (grow: number, path: Path) =>
    roundedRect(
      path,
      pool.minX - grow,
      pool.minZ - grow,
      pool.maxX - pool.minX + 2 * grow,
      pool.maxZ - pool.minZ + 2 * grow,
      ARCHED_POOL_CORNER + grow,
    );
  /** A flat slab of `shape` (in x, z) from `bottom` up to `top`. */
  const flat = (shape: Shape, bottom: number, top: number) =>
    new ExtrudeGeometry(shape, {
      depth: top - bottom,
      bevelEnabled: false,
      curveSegments: 16,
    })
      .rotateX(Math.PI / 2)
      .translate(0, top, 0);
  const deckShape = new Shape();
  deckShape.moveTo(e.minX, e.minZ);
  deckShape.lineTo(e.maxX, e.minZ);
  deckShape.lineTo(e.maxX, e.maxZ);
  deckShape.lineTo(e.minX, e.maxZ);
  deckShape.closePath();
  deckShape.holes.push(outline(g.width, new Path()));
  add(
    new Mesh(flat(deckShape, pool.floor - 0.1, e.floor), roomFloor),
    'arched extension deck',
  );
  const kerb = outline(g.width, new Shape()) as Shape;
  kerb.holes.push(outline(0, new Path()));
  add(
    new Mesh(flat(kerb, pool.floor - 0.1, e.floor - g.depth), roomFloor),
    'arched pool kerb',
  );
  add(
    new Mesh(
      flat(
        outline(g.width, new Shape()) as Shape,
        pool.floor - 0.1,
        pool.floor,
      ),
      roomFloor,
    ),
    'arched pool floor',
  );
  // The grating: bars across the gutter, a little apart, flush with the deck.
  const middle = outline(g.width / 2, new Path());
  const length = middle.getLength();
  const count = Math.round(length / 0.04);
  const points = middle.getSpacedPoints(count);
  const bars: BufferGeometry[] = [];
  for (let k = 0; k < count; k++) {
    const [a, c] = [points[k], points[(k + 1) % count]];
    const angle = Math.atan2(c.y - a.y, c.x - a.x);
    bars.push(
      new BoxGeometry(0.014, 0.02, g.width - 0.01)
        .rotateY(-angle)
        .translate(a.x, e.floor - 0.01, a.y),
    );
  }
  add(
    new Mesh(
      mergeGeometries(bars),
      new MeshStandardMaterial({
        color: '#b7c4c5',
        metalness: 0.65,
        roughness: 0.38,
      }),
    ),
    'arched pool gutter grating',
  );
  for (const bar of bars) bar.dispose();
  const water = add(
    new Mesh(
      new ShapeGeometry(outline(g.width, new Shape()) as Shape, 16).rotateX(
        Math.PI / 2,
      ),
      new MeshPhysicalMaterial({
        color: '#83d7d9',
        transparent: true,
        opacity: 0.6,
        roughness: 0.1,
        depthWrite: false,
        side: DoubleSide,
      }),
    ),
    'arched pool water',
  );
  water.position.y = pool.waterY;
  water.renderOrder = 1;
  rippleWater(water, uniforms);
  // A ladder on the pool's east side, facing the steps.
  const ladder = createPoolLadder(pool.waterY - pool.floor + 0.05);
  ladder.position.set(pool.maxX, e.floor, POOL_LADDER_Z);
  ladder.rotation.y = Math.PI;
  group.add(ladder);
  for (let i = 1; i < r.steps; i++)
    box(
      roomFloor,
      'arched extension step',
      e.maxX - i * r.tread,
      e.maxX - (i - 1) * r.tread,
      e.floor,
      r.floor - i * lowerRise,
      e.minZ,
      e.maxZ,
    );
  const holeHalf = 1.53;
  box(
    roomWall,
    'arched east wall north of diamond',
    r.maxX,
    r.maxX + w,
    r.floor,
    r.ceiling,
    endZ,
    ARCHED_LINK_Z - holeHalf,
  );
  box(
    roomWall,
    'arched east wall south of diamond',
    r.maxX,
    r.maxX + w,
    r.floor,
    r.ceiling,
    ARCHED_LINK_Z + holeHalf,
    r.maxZ,
  );
  box(
    roomWall,
    'arched east wall diamond lintel',
    r.maxX,
    r.maxX + w,
    r.floor + 3.68,
    r.ceiling,
    ARCHED_LINK_Z - holeHalf,
    ARCHED_LINK_Z + holeHalf,
  );
  for (const side of [-1, 1]) {
    for (const points of [
      [
        [1.0, 0],
        [1.53, 0],
        [1.53, 1.4],
      ],
      [
        [1.53, 1.4],
        [1.53, 3.68],
        [0.46, 3.68],
      ],
    ]) {
      const patch = new Shape();
      patch.moveTo(side * points[0][0], points[0][1]);
      for (const [u, v] of points.slice(1)) patch.lineTo(side * u, v);
      patch.closePath();
      add(
        new Mesh(
          new ShapeGeometry(patch)
            .rotateY(Math.PI / 2)
            .translate(r.maxX - 0.006, r.floor, ARCHED_LINK_Z),
          roomWall,
        ),
        'diamond opening tile infill',
      );
    }
  }
  const stubShape = diamondOutline(new Shape(), 0.18) as Shape;
  stubShape.holes.push(diamondOutline(new Path()) as Path);
  add(
    new Mesh(
      new ExtrudeGeometry(stubShape, { depth: 1.05, bevelEnabled: false })
        .rotateY(Math.PI / 2)
        .translate(r.maxX, r.floor, ARCHED_LINK_Z),
      roomWall,
    ),
    'diamond corridor landing toward green room',
  );
  for (const side of [-1, 1])
    for (const [[u0, y0], [u1, y1]] of [
      [
        [1, 0],
        [1.35, 1.4],
      ],
      [
        [1.35, 1.4],
        [0.28, 3.5],
      ],
    ]) {
      const geometry = new BufferGeometry();
      const x0 = r.maxX - 0.01,
        x1 = r.maxX + 1.05;
      const z0 = ARCHED_LINK_Z + side * u0,
        z1 = ARCHED_LINK_Z + side * u1;
      geometry.setAttribute(
        'position',
        new Float32BufferAttribute(
          [
            x0,
            r.floor + y0,
            z0,
            x1,
            r.floor + y0,
            z0,
            x0,
            r.floor + y1,
            z1,
            x1,
            r.floor + y1,
            z1,
          ],
          3,
        ),
      );
      geometry.setIndex([0, 1, 2, 2, 1, 3]);
      geometry.computeVertexNormals();
      add(new Mesh(geometry, roomWall), 'diamond landing inner tile');
    }
  // The rectangular opening leaves triangular reveals beside the lower
  // diamond slopes. Give those reveals depth so the exterior cannot show
  // through at grazing angles from the room or the landing.
  for (const side of [-1, 1]) {
    const z0 =
      side < 0 ? ARCHED_LINK_Z - holeHalf : ARCHED_LINK_Z + ARCHED_LINK_HALF;
    const z1 =
      side < 0 ? ARCHED_LINK_Z - ARCHED_LINK_HALF : ARCHED_LINK_Z + holeHalf;
    box(
      roomWall,
      'diamond landing solid lower reveal',
      r.maxX + 0.015,
      r.maxX + 1.035,
      r.floor,
      r.floor + 1.4,
      z0,
      z1,
    );
  }
  box(
    roomFloor,
    'diamond return landing floor',
    r.maxX,
    r.maxX + 1.05,
    r.floor - 0.12,
    r.floor,
    ARCHED_LINK_Z - ARCHED_LINK_HALF,
    ARCHED_LINK_Z + ARCHED_LINK_HALF,
  );
  // A small, cheap view of the green room makes the doorway read as open.
  // The scene handoff occurs inside the landing, before this preview can be
  // entered, so both rooms retain their own coordinates and render budgets.
  const previewUniforms = createPoolUniforms(metre, -100, []);
  previewUniforms.caustics.value = 0;
  previewUniforms.reflected.value = 0;
  const previewTile = createTileMaterial(previewUniforms, {
    colour: '#5b9a7e',
    grout: '#2c634e',
    roughness: [0.24, 0.42],
    glaze: 0.26,
  });
  previewTile.side = DoubleSide;
  const previewNear = r.maxX + 1.05;
  const previewFar = previewNear + 4;
  box(
    previewTile,
    'green room glimpse floor',
    previewNear,
    previewFar,
    r.floor - 0.12,
    r.floor,
    ARCHED_LINK_Z - 3,
    ARCHED_LINK_Z + 3,
  );
  box(
    previewTile,
    'green room glimpse north wall',
    previewNear,
    previewFar,
    r.floor,
    r.floor + 4,
    ARCHED_LINK_Z - 3.1,
    ARCHED_LINK_Z - 3,
  );
  box(
    previewTile,
    'green room glimpse south wall',
    previewNear,
    previewFar,
    r.floor,
    r.floor + 4,
    ARCHED_LINK_Z + 3,
    ARCHED_LINK_Z + 3.1,
  );
  box(
    previewTile,
    'green room glimpse far wall',
    previewFar,
    previewFar + 0.1,
    r.floor,
    r.floor + 4,
    ARCHED_LINK_Z - 3,
    ARCHED_LINK_Z + 3,
  );
  box(
    previewTile,
    'green room glimpse ceiling',
    previewNear,
    previewFar,
    r.floor + 4,
    r.floor + 4.1,
    ARCHED_LINK_Z - 3,
    ARCHED_LINK_Z + 3,
  );
  const previewLight = new PointLight(
    '#dcf3e8',
    8 * metre * metre,
    7 * metre,
    2,
  );
  previewLight.position.set(previewNear + 2, r.floor + 3.5, ARCHED_LINK_Z);
  group.add(previewLight);
  // The ceiling, a slab with the skylight's round opening through it: a
  // shape in (x, z), laid flat and 0.2 m thick.
  const sky = r.skylight;
  const slab = new Shape();
  slab.moveTo(r.minX - w, endZ);
  slab.lineTo(r.maxX + w, endZ);
  slab.lineTo(r.maxX + w, r.maxZ + w);
  slab.lineTo(r.minX - w, r.maxZ + w);
  slab.closePath();
  slab.holes.push(
    new Path().absarc(sky.x, sky.z, sky.radius, 0, Math.PI * 2, false),
  );
  add(
    new Mesh(
      new ExtrudeGeometry(slab, {
        depth: 0.2,
        bevelEnabled: false,
        curveSegments: 64,
      })
        .rotateX(Math.PI / 2)
        .translate(0, r.ceiling + 0.2, 0),
      roomWall,
    ),
    'arched room ceiling',
  );
  // The skylight's glass, bright with daylight, at the top of its well,
  // a frame round the opening, and the sun through it.
  add(
    new Mesh(
      new CircleGeometry(sky.radius, 64).rotateX(Math.PI / 2),
      new MeshBasicMaterial({
        // Above white, as the hall's glazing, so tone mapping leaves it bright.
        color: new Color('#eef7f8').multiplyScalar(2),
        side: DoubleSide,
        fog: false,
      }),
    ),
    'arched room skylight glass',
  ).position.set(sky.x, r.ceiling + 0.18, sky.z);
  add(
    new Mesh(
      new TorusGeometry(sky.radius, 0.05, 8, 64).rotateX(Math.PI / 2),
      new MeshStandardMaterial({ color: '#d9e0de', roughness: 0.45 }),
    ),
    'arched room skylight frame',
  ).position.set(sky.x, r.ceiling - 0.01, sky.z);
  addSkylightSun(group, {
    centreX: sky.x,
    centreZ: sky.z,
    floorY: r.floor,
    height: r.ceiling - r.floor,
    skylightRadius: sky.radius,
  });
  box(
    roomFloor,
    'arched room floor',
    r.minX,
    r.maxX,
    // Down to the extension's floor: its face is the second flight's top riser.
    e.floor,
    r.floor,
    stairTop,
    r.maxZ,
  );
  // The landing, from the corridor's end through the doorway, and the steps.
  box(
    roomFloor,
    'arched room landing',
    r.minX,
    r.maxX,
    r.floor,
    0,
    endZ,
    stairTop,
  );
  // The last riser comes down onto the floor itself.
  for (let i = 1; i < r.steps; i++)
    box(
      roomFloor,
      'arched room step',
      r.minX,
      r.maxX,
      r.floor,
      -i * rise,
      stairTop + (i - 1) * r.tread,
      stairTop + i * r.tread,
    );

  // Bulkhead lights on the corridor's walls, with red bulbs; the room
  // has none, only its window. Each is the familiar round cast-aluminium
  // bulkhead: a shallow body screwed to the wall, a glass dome held in by
  // a rim, and a cross-bar guard over the glass.
  const body = new MeshStandardMaterial({
    color: '#3c4246',
    metalness: 0.55,
    roughness: 0.5,
  });
  const redGlass = new MeshStandardMaterial({
    color: '#5a1410',
    emissive: '#ff2a1a',
    emissiveIntensity: 1.0,
    roughness: 0.3,
  });
  /** A bulkhead on the wall at x (its face), facing `facing` (±1 in x). */
  const bulkhead = (x: number, y: number, z: number, facing: 1 | -1) => {
    const fitting = new Group();
    fitting.name = 'bulkhead light';
    // Built facing +x, from the wall's face outward.
    const part = (mesh: Mesh, name: string, at: number) => {
      mesh.name = name;
      mesh.position.x = at;
      fitting.add(mesh);
      return mesh;
    };
    part(
      new Mesh(
        new CylinderGeometry(0.13, 0.135, 0.045, 32).rotateZ(Math.PI / 2),
        body,
      ),
      'bulkhead body',
      0.0225,
    );
    part(
      new Mesh(
        new SphereGeometry(0.1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2)
          .rotateZ(-Math.PI / 2)
          .scale(0.55, 1, 1),
        redGlass,
      ),
      'bulkhead red glass',
      0.045,
    );
    part(
      new Mesh(
        new TorusGeometry(0.108, 0.011, 8, 32).rotateY(Math.PI / 2),
        body,
      ),
      'bulkhead rim',
      0.05,
    );
    // The guard: two bars bowed over the dome, crossing at its crown,
    // their ends in the rim.
    const bow = new CatmullRomCurve3(
      Array.from({ length: 13 }, (_, i) => {
        const t = (i / 12) * Math.PI;
        return new Vector3(0.063 * Math.sin(t), 0.108 * Math.cos(t), 0);
      }),
    );
    for (const turn of [0, Math.PI / 2])
      part(
        new Mesh(new TubeGeometry(bow, 24, 0.007, 6).rotateX(turn), body),
        'bulkhead guard bar',
        0.045,
      );
    fitting.position.set(x, y, z);
    fitting.rotation.y = facing === 1 ? 0 : Math.PI;
    group.add(fitting);
    // Close to glazed tiles on every side: a little goes a long way. The
    // group is scaled to metres; a light's reach and strength are not.
    const bulb = new PointLight('#ff2a1a', 0.2 * metre * metre, 5 * metre, 2);
    bulb.position.set(x + facing * 0.16, y, z);
    group.add(bulb);
  };
  // Alternate walls, below the vault's springing.
  bulkhead(left, 2.1, start + run * 0.3, 1);
  bulkhead(right, 2.1, start + run * 0.75, -1);
  // The window: frosted glass in the middle of the wall's thickness,
  // bright with daylight, and the light it lets in.
  const glass = add(
    new Mesh(
      new CircleGeometry(pane.radius, 48),
      new MeshBasicMaterial({
        // Above white, as the hall's glazing, so tone mapping leaves it bright.
        color: new Color('#eef7f8').multiplyScalar(2),
        side: DoubleSide,
        fog: false,
      }),
    ),
    'arched room round window',
  );
  glass.position.set(pane.x, pane.y, endZ + w / 2);
  const daylight = new PointLight('#eef6f6', 6 * metre * metre, 10 * metre, 2);
  daylight.position.set(pane.x, pane.y, r.minZ + 0.4);
  group.add(daylight);
  return group;
}
