import {
  CatmullRomCurve3,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  PointLight,
  Shape,
  ShapeGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import type { Material } from 'three';
import {
  block,
  column,
  downlight,
  metreUVs,
  plasticChair,
  pool,
  porthole,
  ribbon,
  sign,
  startPoolRoom,
  surface,
  tiles,
  water,
} from './kit';
import type { PoolStage } from './kit';
import { METRE } from '../../toolkit/components/core/logic/units';
import { insidePolygon } from '../../game/pool-styles/geometry';
import type { Point } from '../../game/pool-styles/geometry';
import {
  BOUNDS,
  CEILING,
  CHAIRS,
  CHANNEL,
  COLUMNS,
  DECKS,
  LIFEGUARD_CHAIR,
  LOST_PROPERTY,
  POOLS,
  TREAD,
  WALL_FACE,
  deckAt,
  edge,
  floorAt,
  solids,
  wallOutline,
} from '../../game/pool-styles/municipal-plan';

/**
 * The Municipal Infinite (`doc/design/pool-styles.md`, style 1): a
 * council leisure pool of about 1975, extended without end
 * (`src/game/pool-styles/municipal-plan.ts`). Two-tone walls (dark green
 * mosaic to head height, white tile above), wide rounded corners, three
 * decks stepping down along curved edges, each with its kidney of water,
 * the lowest running on through an arch in the north wall and away down
 * a tunnel lit by portholes; stainless handrails along the pools and the
 * steps; fat round columns standing in the water; a ceiling of small
 * square downlights; warm porthole lamps; and the council's notices, a
 * lost-property box and a lifeguard's chair facing the wall. Lit only by
 * its own fittings, warm and a little too dim.
 */

/** The two-tone wall's change from mosaic to white, metres above the top deck. */
const SPLIT = 1.6;
const WALL_BOTTOM = DECKS[2] - 0.2;

/** Points along a deck edge, west to east, `offset` metres north of it. */
const along = (i: 0 | 1, offset = 0, step = 0.5): Point[] => {
  const points: Point[] = [];
  for (let x = BOUNDS.minX; x <= BOUNDS.maxX + 1e-9; x += step)
    points.push([x, edge(i, x) - offset]);
  return points;
};

export function startMunicipalRoom(canvas: HTMLCanvasElement) {
  return startPoolRoom(
    canvas,
    'pool_municipal',
    {
      bounds: BOUNDS,
      background: '#2c2a21',
      fog: [16, 52],
      sky: ['#fff0d8', '#a39a82', 1.0],
      exposure: 0.95,
    },
    (stage) => {
      const mosaic = tiles(stage, '#1f4d3e', { tile: 0.05, roughness: 0.2 });
      const white = tiles(stage, '#ece7d8', { tile: 0.15 });
      const deck = tiles(stage, '#dcd6c4', { tile: 0.15, roughness: 0.35 });
      const basin = tiles(stage, '#9fcfc4', { tile: 0.125 });
      const ceiling = tiles(stage, '#e6e1d0', { tile: 0.3, roughness: 0.6 });
      const pondWater = water(stage, '#4fae9f', 0.7);

      buildDecks(stage, deck, mosaic);
      for (const p of POOLS)
        pool(stage, p.outline, DECKS[p.deck], p.depth, basin, pondWater);
      buildWalls(stage, mosaic, white);
      buildTunnel(stage, mosaic, white);
      surface(stage, wallOutline(), DECKS[0] + CEILING, ceiling);
      buildLights(stage);
      buildColumns(stage, mosaic, white);
      buildRails(stage);
      buildFittings(stage);
      return {
        floorAt: (x, z) => floorAt(x, z),
        solids: solids(),
        start: { x: 0, z: 12.4, yaw: 0, pitch: -0.08 },
      };
    },
  );
}

/** The three decks, their treads and risers along the curved edges, their pools cut out. */
function buildDecks(stage: PoolStage, deck: Material, mosaic: Material) {
  const holes = (i: number) =>
    POOLS.filter((p) => p.deck === i).map((p) =>
      // A pool running on through the wall is cut only as far as the wall.
      p.outline.map(([x, z]) => [x, Math.max(z, BOUNDS.minZ + 0.05)] as Point),
    );
  const e0 = along(0),
    e0t = along(0, TREAD),
    e1 = along(1),
    e1t = along(1, TREAD);
  const reversed = (p: Point[]) => [...p].reverse();
  // The top deck: from its edge south to the wall.
  surface(
    stage,
    [...e0, [BOUNDS.maxX, BOUNDS.maxZ], [BOUNDS.minX, BOUNDS.maxZ]],
    DECKS[0],
    deck,
    holes(0),
  );
  surface(stage, [...e0t, ...reversed(e0)], (DECKS[0] + DECKS[1]) / 2, deck);
  surface(stage, [...e1, ...reversed(e0t)], DECKS[1], deck, holes(1));
  surface(stage, [...e1t, ...reversed(e1)], (DECKS[1] + DECKS[2]) / 2, deck);
  surface(
    stage,
    [[BOUNDS.minX, BOUNDS.minZ], [BOUNDS.maxX, BOUNDS.minZ], ...reversed(e1t)],
    DECKS[2],
    deck,
    holes(2),
  );
  // The risers, in the dark mosaic, a nosing to every step.
  ribbon(stage, e0, (DECKS[0] + DECKS[1]) / 2, DECKS[0], mosaic);
  ribbon(stage, e0t, DECKS[1], (DECKS[0] + DECKS[1]) / 2, mosaic);
  ribbon(stage, e1, (DECKS[1] + DECKS[2]) / 2, DECKS[1], mosaic);
  ribbon(stage, e1t, DECKS[2], (DECKS[1] + DECKS[2]) / 2, mosaic);
}

/** The walls: two-tone round the room, open over the channel in the north wall, an arch above it. */
function buildWalls(stage: PoolStage, mosaic: Material, white: Material) {
  const face = BOUNDS.minZ + WALL_FACE;
  // From the channel's east side round the room to its west side.
  const line: Point[] = [
    [CHANNEL.to, face],
    ...wallOutline(),
    [CHANNEL.from, face],
  ];
  ribbon(stage, line, WALL_BOTTOM, DECKS[0] + SPLIT, mosaic);
  ribbon(stage, line, DECKS[0] + SPLIT, DECKS[0] + CEILING, white);
  // The arch over the channel: the wall above it, its round head cut out.
  const spring = 0.8;
  const r = (CHANNEL.to - CHANNEL.from) / 2;
  const mid = (CHANNEL.from + CHANNEL.to) / 2;
  const shape = new Shape();
  shape.moveTo(CHANNEL.from, spring);
  shape.lineTo(CHANNEL.from, DECKS[0] + CEILING);
  shape.lineTo(CHANNEL.to, DECKS[0] + CEILING);
  shape.lineTo(CHANNEL.to, spring);
  shape.absarc(mid, spring, r, 0, Math.PI, false);
  const geometry = new ShapeGeometry(shape, 24);
  const uv = geometry.getAttribute('uv');
  const pos = geometry.getAttribute('position');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i), pos.getY(i));
  const head = new Mesh(geometry, white);
  head.position.z = face;
  stage.world.add(head);
}

/** The tunnel the deep pool runs away down, through the north wall: vaulted, two-tone, lit by portholes. */
function buildTunnel(stage: PoolStage, mosaic: Material, white: Material) {
  const face = BOUNDS.minZ + WALL_FACE;
  const spring = 0.8;
  const water = DECKS[2];
  for (const x of [CHANNEL.from, CHANNEL.to]) {
    const line: Point[] = [
      [x, face],
      [x, CHANNEL.end],
    ];
    ribbon(stage, line, water, water + 0.9, mosaic);
    ribbon(stage, line, water + 0.9, spring, white);
  }
  const r = (CHANNEL.to - CHANNEL.from) / 2;
  const length = face - CHANNEL.end;
  const vault = new Mesh(
    metreUVs(
      new CylinderGeometry(r, r, length, 24, 1, true, Math.PI / 2, Math.PI),
      Math.PI * r,
      length,
    ),
    white,
  );
  vault.rotation.x = Math.PI / 2;
  vault.position.set(
    (CHANNEL.from + CHANNEL.to) / 2,
    spring,
    (face + CHANNEL.end) / 2,
  );
  stage.world.add(vault);
  // Its far end, lost in the dark.
  block(
    stage,
    CHANNEL.to - CHANNEL.from,
    4,
    0.1,
    (CHANNEL.from + CHANNEL.to) / 2,
    water + 1,
    CHANNEL.end,
    stage.keep(new MeshStandardMaterial({ color: '#141410' })),
  );
  for (let z = face - 3; z > CHANNEL.end + 2; z -= 4.5) {
    porthole(stage, CHANNEL.from + 0.03, water + 0.75, z, Math.PI / 2, {
      w: 0.3,
      h: 0.42,
    });
    porthole(stage, CHANNEL.to - 0.03, water + 0.75, z - 2.25, -Math.PI / 2, {
      w: 0.3,
      h: 0.42,
    });
  }
}

/** Porthole lamps round the walls, a grid of downlights, and a few warm lights that cast. */
function buildLights(stage: PoolStage) {
  const f = WALL_FACE + 0.03;
  const y = DECKS[0] + 2.55;
  for (let x = -14; x <= 14; x += 4)
    porthole(stage, x, y, BOUNDS.maxZ - f, Math.PI);
  for (let x = -11; x <= 11; x += 4)
    if (x < CHANNEL.from - 1.5 || x > CHANNEL.to + 1.5)
      porthole(stage, x, y, BOUNDS.minZ + f, 0);
  for (let z = -8; z <= 9; z += 4.25) {
    porthole(stage, BOUNDS.minX + f, y, z, Math.PI / 2);
    porthole(stage, BOUNDS.maxX - f, y, z, -Math.PI / 2);
  }
  const outline = wallOutline();
  for (let x = -14; x <= 14; x += 4)
    for (let z = -11; z <= 12; z += 4)
      if (insidePolygon(outline, x, z))
        downlight(stage, x, DECKS[0] + CEILING, z, 0.24, true);
  for (const [x, z] of [
    [-6, 8.5],
    [5, -1],
    [-3, -10],
    [12, 9],
  ] as const) {
    const light = new PointLight('#ffd9a0', 30, 20 * METRE, 1.4);
    light.position.set(x, DECKS[0] + CEILING - 0.6, z);
    stage.world.add(light);
  }
}

/** The fat columns standing in the water: dark mosaic to the split, white above. */
function buildColumns(stage: PoolStage, mosaic: Material, white: Material) {
  for (const [x, z, r] of COLUMNS) {
    const pool = POOLS.find((p) => insidePolygon(p.outline, x, z))!;
    const bed = DECKS[pool.deck] - pool.depth;
    column(stage, x, z, r, bed, DECKS[0] + SPLIT, mosaic);
    column(stage, x, z, r, DECKS[0] + SPLIT, DECKS[0] + CEILING, white);
  }
}

/**
 * A stainless handrail along points (x, deck y, z): brushed, pale enough
 * to read without anything to reflect; its posts every `pitch` metres.
 */
function handrail(
  stage: PoolStage,
  points: readonly (readonly [number, number, number])[],
  { height = 0.95, pitch = 1.5 } = {},
) {
  const steel = stage.keep(
    new MeshStandardMaterial({
      color: '#d9dddc',
      metalness: 0.25,
      roughness: 0.3,
    }),
  );
  const curve = new CatmullRomCurve3(
    points.map(([x, y, z]) => new Vector3(x, y + height, z)),
  );
  stage.world.add(
    new Mesh(
      new TubeGeometry(curve, Math.max(8, points.length * 6), 0.025, 8),
      steel,
    ),
  );
  const n = Math.max(1, Math.round(curve.getLength() / pitch));
  for (let i = 0; i <= n; i++) {
    const p = curve.getPointAt(i / n);
    const post = new Mesh(new CylinderGeometry(0.02, 0.02, height, 8), steel);
    post.position.set(p.x, p.y - height / 2, p.z);
    stage.world.add(post);
  }
}

/** Stainless rails along part of each pool's edge, and along the steps. */
function buildRails(stage: PoolStage) {
  for (const p of POOLS) {
    const pts = p.outline.filter(([, z]) => z > BOUNDS.minZ + 0.5);
    const cx = pts.reduce((s, [x]) => s + x, 0) / pts.length;
    const cz = pts.reduce((s, [, z]) => s + z, 0) / pts.length;
    // A run round its eastern end, a little back from the water.
    const run = pts.filter(([x]) => x > cx + (p.id === 'learner' ? 2 : 4));
    if (run.length < 3) continue;
    const y = DECKS[p.deck];
    // Ordered round the outline, from its north side to its south.
    const ordered = [...run].sort(
      (a, b) =>
        Math.atan2(a[1] - cz, a[0] - cx) - Math.atan2(b[1] - cz, b[0] - cx),
    );
    handrail(
      stage,
      ordered.map(([x, z]) => {
        const d = Math.hypot(x - cx, z - cz) || 1;
        return [x + ((x - cx) / d) * 0.35, y, z + ((z - cz) / d) * 0.35];
      }),
    );
  }
  // Grab rails down the steps, here and there.
  for (const i of [0, 1] as const)
    for (const x of i === 0 ? [-14.5, 13.5] : [-13.5, 15]) {
      const points: [number, number, number][] = [];
      for (let k = -1; k <= 3; k++) {
        const z = edge(i, x) + 0.6 - k * 0.45;
        points.push([x, deckAt(x, z), z]);
      }
      handrail(stage, points, { pitch: 0.9 });
    }
}

/** The council's notices, the lost-property box, the chairs and the lifeguard's chair facing the wall. */
function buildFittings(stage: PoolStage) {
  const f = WALL_FACE + 0.02;
  const onWall = (mesh: Mesh, x: number, y: number, z: number, yaw: number) => {
    mesh.position.set(x, y, z);
    mesh.rotation.y = yaw;
    stage.world.add(mesh);
  };
  const rules = () =>
    sign(stage, ['NO BOMBING', 'NO PETTING', 'NO RUNNING'], 1.2, 0.9, {
      background: '#f6f3ea',
      ink: '#b3261e',
    });
  onWall(rules(), BOUNDS.minX + f, 1.95, 2.6, Math.PI / 2);
  onWall(rules(), BOUNDS.maxX - f, 1.95, -1.6, -Math.PI / 2);
  onWall(rules(), 9, 1.95, BOUNDS.minZ + f, 0);
  onWall(
    sign(stage, ['DEEP WATER', 'NO DIVING FROM THE SIDE'], 1.6, 0.5, {
      background: '#b3261e',
      ink: '#ffffff',
    }),
    -8,
    1.9,
    BOUNDS.minZ + f,
    0,
  );
  onWall(
    sign(
      stage,
      [
        'SESSION TIMES',
        'EARLY SWIM  7.00 – 9.00',
        'PARENT & TODDLER  10.00 – 11.00',
        'AQUA AEROBICS  TUE 18.00',
        'LADIES ONLY  19.00 – 20.00',
        'LANE SWIMMING  ALWAYS',
        'CLOSING TIME  —',
      ],
      1.3,
      1.6,
      { background: '#22406e', ink: '#ffffff' },
    ),
    -5,
    2.2,
    BOUNDS.maxZ - f,
    Math.PI,
  );
  // The lost-property box, by the south wall.
  {
    const crate = stage.keep(
      new MeshStandardMaterial({ color: '#2f5fa8', roughness: 0.5 }),
    );
    const { x, z } = LOST_PROPERTY;
    block(stage, 1.0, 0.6, 0.6, x, 0.3, z, crate);
    const label = sign(stage, ['LOST PROPERTY'], 0.8, 0.16, {
      background: '#ffffff',
      ink: '#22406e',
    });
    label.position.set(x, 0.42, z - 0.31);
    label.rotation.y = Math.PI;
    stage.world.add(label);
    // Unclaimed: an armband and a towel.
    const band = new Mesh(
      new TorusGeometry(0.1, 0.045, 8, 20),
      stage.keep(new MeshStandardMaterial({ color: '#f27a12' })),
    );
    band.rotation.x = Math.PI / 2;
    band.position.set(x - 0.2, 0.65, z);
    stage.world.add(band);
    block(
      stage,
      0.45,
      0.05,
      0.3,
      x + 0.2,
      0.63,
      z,
      stage.keep(new MeshStandardMaterial({ color: '#d84c6f' })),
    );
  }
  for (const [x, z, yaw] of CHAIRS)
    plasticChair(stage, x, deckAt(x, z), z, yaw);
  buildLifeguardChair(stage);
}

/** A lifeguard's high chair, its ladder in front, set facing the wall. */
function buildLifeguardChair(stage: PoolStage) {
  const white = stage.keep(
    new MeshStandardMaterial({ color: '#f1f0ea', roughness: 0.4 }),
  );
  const { x, z, yaw } = LIFEGUARD_CHAIR;
  const chair = new Group();
  chair.position.set(x, deckAt(x, z), z);
  chair.rotation.y = yaw;
  const post = (px: number, pz: number, h: number) => {
    const leg = new Mesh(new CylinderGeometry(0.035, 0.035, h, 10), white);
    leg.position.set(px, h / 2, pz);
    chair.add(leg);
  };
  for (const px of [-0.4, 0.4]) {
    post(px, -0.4, 2.6);
    post(px, 0.45, 2.1);
  }
  block(stage, 0.95, 0.06, 0.9, 0, 2.1, 0, white, chair);
  block(stage, 0.95, 0.5, 0.05, 0, 2.4, -0.42, white, chair);
  // Its ladder's rungs, up the front.
  for (let y = 0.3; y < 2.05; y += 0.35)
    block(stage, 0.82, 0.04, 0.05, 0, y, 0.45, white, chair);
  const sun = new Mesh(
    new CylinderGeometry(0.6, 0.6, 0.02, 24, 1, false),
    stage.keep(
      new MeshStandardMaterial({ color: '#d33b2c', side: DoubleSide }),
    ),
  );
  sun.position.set(0, 3.0, -0.1);
  chair.add(sun);
  const umbrella = new Mesh(new CylinderGeometry(0.015, 0.015, 0.6, 6), white);
  umbrella.position.set(0, 2.7, -0.1);
  chair.add(umbrella);
  stage.world.add(chair);
}
