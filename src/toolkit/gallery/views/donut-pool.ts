import {
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Path,
  PointLight,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
  BoxGeometry,
} from 'three';
import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createPanelKit } from '../../components/core/views/eighties-controls';
import { plantTools } from '../../components/plant/views/plant-tools';
import {
  createDeckGully,
  createFloorInlet,
  createMainDrain,
  createWallInlet,
} from '../../components/pool/views/pool-fittings';
import type { PoolFittingMaterials } from '../../components/pool/views/pool-fittings';
import {
  createPoolUniforms,
  createTileMaterial,
} from '../../components/pool/views/pool-surfaces';
import type { Footprint } from '../../controls/logic/walk-collision';
import { rippleWater } from './round-room-light';
import { createPoolLadder } from './pool-ladder';

/**
 * donut_pool_1: a white-tiled room 15 m square and 7 m high, a round
 * column 2 m across rising from deck to ceiling in its middle, and round
 * the column a ring-shaped pool, 2.75 m across inside and 12 m outside,
 * its water 1.2 m deep. It is a deck-level pool: its water stands at the
 * deck and spills over both edges into gutters under flush gratings; it
 * is drawn off there and through a pair of main drains in the floor, and
 * returned through floor inlets and wall jets. Metres, the room's middle at the origin, the deck
 * at y = 0.
 */
export const DONUT_POOL = {
  side: 15,
  height: 7,
  wall: 0.2,
  column: 1,
  inner: 2.75 / 2,
  outer: 12 / 2,
  waterY: -0.015,
  /** The overflow gutters: round the outer edge, and round the island. */
  gutter: { outer: 0.25, inner: 0.2, depth: 0.2 },
  depth: 1.2,
  /** The sconces on the column, at each cardinal point. */
  sconceY: 4,
} as const;
const d = DONUT_POOL;
/** The pool's floor. */
export const DONUT_POOL_FLOOR = d.waterY - d.depth;

/** The floor under the walker: the pool's floor in the ring, else the deck. */
export function donutPoolFloorAt(x: number, z: number): number {
  const r = Math.hypot(x, z);
  return r > d.inner && r < d.outer ? DONUT_POOL_FLOOR : 0;
}

/** The walls, and the column as a stack of boxes round its circle. */
export function donutPoolSolids(): Footprint[] {
  const h = d.side / 2;
  const w = d.wall;
  const solids: Footprint[] = [
    { minX: -h - w, maxX: h + w, minZ: -h - w, maxZ: -h },
    { minX: -h - w, maxX: h + w, minZ: h, maxZ: h + w },
    { minX: -h - w, maxX: -h, minZ: -h, maxZ: h },
    { minX: h, maxX: h + w, minZ: -h, maxZ: h },
  ];
  // Slices across the column, each as wide as the circle is there.
  const slices = 8;
  for (let i = 0; i < slices; i++) {
    const z0 = -d.column + (2 * d.column * i) / slices;
    const z1 = z0 + (2 * d.column) / slices;
    const near = Math.min(Math.abs(z0), Math.abs(z1));
    const half = Math.sqrt(
      d.column * d.column - (z0 < 0 && z1 > 0 ? 0 : near * near),
    );
    solids.push({ minX: -half, maxX: half, minZ: z0, maxZ: z1 });
  }
  return solids;
}

export function createDonutPool(metre: number) {
  const group = new Group();
  group.name = 'donut_pool_1';
  group.scale.setScalar(metre);
  const pool = { minX: -d.outer, maxX: d.outer, minZ: -d.outer, maxZ: d.outer };
  const uniforms = createPoolUniforms(metre, d.waterY, [pool]);
  const tile = createTileMaterial(uniforms);
  tile.side = DoubleSide;
  const add = (mesh: Mesh, name: string) => {
    mesh.name = name;
    group.add(mesh);
    return mesh;
  };
  const circle = (r: number, path: Path) => {
    path.absarc(0, 0, r, 0, Math.PI * 2, false);
    return path;
  };
  /** A flat slab of `shape` (in x, z) from `bottom` up to `top`. */
  const flat = (shape: Shape, bottom: number, top: number) =>
    new ExtrudeGeometry(shape, {
      depth: top - bottom,
      bevelEnabled: false,
      curveSegments: 96,
    })
      .rotateX(Math.PI / 2)
      .translate(0, top, 0);
  const h = d.side / 2;
  const bottom = DONUT_POOL_FLOOR - 0.1;

  // The deck, the outer gutter's outline cut out of it; under the
  // grating, a kerb stands to the gutter's floor, its inner face the
  // pool's outer wall. The island likewise, round its own gutter.
  const g = d.gutter;
  const deck = new Shape();
  deck.moveTo(-h, -h);
  deck.lineTo(h, -h);
  deck.lineTo(h, h);
  deck.lineTo(-h, h);
  deck.closePath();
  deck.holes.push(circle(d.outer + g.outer, new Path()));
  add(new Mesh(flat(deck, bottom, 0), tile), 'donut deck');
  const annulus = (from: number, to: number) => {
    const shape = circle(to, new Shape()) as Shape;
    shape.holes.push(circle(from, new Path()));
    return shape;
  };
  add(
    new Mesh(flat(annulus(d.outer, d.outer + g.outer), bottom, -g.depth), tile),
    'donut outer gutter kerb',
  );
  // The island the column stands on, and its gutter's kerb.
  add(
    new Mesh(
      flat(circle(d.inner - g.inner, new Shape()) as Shape, bottom, 0),
      tile,
    ),
    'donut island',
  );
  add(
    new Mesh(flat(annulus(d.inner - g.inner, d.inner), bottom, -g.depth), tile),
    'donut inner gutter kerb',
  );
  add(
    new Mesh(
      flat(
        annulus(d.inner - g.inner, d.outer + g.outer),
        bottom,
        DONUT_POOL_FLOOR,
      ),
      tile,
    ),
    'donut pool floor',
  );

  // The fittings, plain tile-shaded materials so the water tints them.
  const kit = createPanelKit();
  const ft = plantTools(kit);
  const plain = (colour: string, roughness: number, metalness = 0) =>
    createTileMaterial(uniforms, {
      plain: true,
      colour,
      roughness: [roughness, roughness],
      glaze: 0,
      metalness,
    });
  const kinds: PoolFittingMaterials = {
    abs: plain('#f2f3ef', 0.35),
    steel: plain('#c9cdcf', 0.28, 0.9),
    cavity: plain('#0f2a2e', 0.6),
    pvc: plain('#8c9295', 0.55),
    lens: plain('#fbfff8', 0.2),
  };
  // Gratings over both gutters: white bars across each, 8 mm apart.
  const bars: BufferGeometry[] = [];
  for (const [from, width] of [
    [d.outer, g.outer],
    [d.inner - g.inner, g.inner],
  ]) {
    const middle = from + width / 2;
    const count = Math.round((2 * Math.PI * middle) / 0.02);
    for (let k = 0; k < count; k++) {
      const a = (k / count) * Math.PI * 2;
      bars.push(
        new BoxGeometry(width - 0.01, 0.025, 0.012)
          .rotateY(-a)
          .translate(Math.cos(a) * middle, -0.0125, Math.sin(a) * middle),
      );
    }
  }
  add(new Mesh(mergeGeometries(bars), kinds.abs), 'donut gutter gratings');
  for (const bar of bars) bar.dispose();
  const middle = (d.inner + d.outer) / 2;
  const onFloor = (fitting: Group, a: number, r: number, y: number) => {
    fitting.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
    fitting.rotation.y = -a;
    group.add(fitting);
  };
  // A pair of main drains, opposite each other, more than 2 m apart.
  for (const a of [Math.PI / 2, (3 * Math.PI) / 2])
    onFloor(createMainDrain(ft, kinds), a, middle, DONUT_POOL_FLOOR + 0.001);
  // Floor inlets, two rings of eight between the drains.
  for (let k = 0; k < 8; k++)
    for (const r of [middle - 1, middle + 1])
      onFloor(
        createFloorInlet(ft, kinds),
        ((k + 0.5) / 8) * Math.PI * 2,
        r,
        DONUT_POOL_FLOOR + 0.001,
      );
  // Filling jets: eyeball inlets in the outer wall, aimed at the column,
  // and in the island's wall, aimed out; clear of the ladder, east.
  const inWall = (a: number, r: number, inward: boolean) => {
    const jet = createWallInlet(ft, kinds);
    jet.position.set(Math.cos(a) * r, d.waterY - 0.45, Math.sin(a) * r);
    const sign = inward ? -1 : 1;
    jet.rotation.y = Math.atan2(sign * Math.cos(a), sign * Math.sin(a));
    group.add(jet);
  };
  for (let k = 1; k < 12; k++) inWall((k / 12) * Math.PI * 2, d.outer, true);
  for (let k = 0; k < 4; k++)
    inWall(((k + 0.5) / 4) * Math.PI * 2, d.inner, false);
  // Deck gullies in the corners, for splash and wash-down water.
  for (const [x, z] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    const gully = createDeckGully(ft, kinds);
    gully.position.set(x * (h - 0.6), 0.002, z * (h - 0.6));
    group.add(gully);
  }

  // Walls and ceiling.
  const wall = (sx: number, sz: number, x: number, z: number) => {
    const mesh = new Mesh(new BoxGeometry(sx, d.height, sz), tile);
    mesh.position.set(x, d.height / 2, z);
    add(mesh, 'donut wall');
  };
  wall(d.side + 2 * d.wall, d.wall, 0, -h - d.wall / 2);
  wall(d.side + 2 * d.wall, d.wall, 0, h + d.wall / 2);
  wall(d.wall, d.side, -h - d.wall / 2, 0);
  wall(d.wall, d.side, h + d.wall / 2, 0);
  const ceiling = add(
    new Mesh(new BoxGeometry(d.side, 0.2, d.side), tile),
    'donut ceiling',
  );
  ceiling.position.y = d.height + 0.1;

  // The column, deck to ceiling.
  const column = add(
    new Mesh(
      new CylinderGeometry(d.column, d.column, d.height, 96, 1, true),
      tile,
    ),
    'donut column',
  );
  column.position.y = d.height / 2;

  // The water, a ring of it, out over the gutters.
  const waterRing = annulus(d.inner - g.inner, d.outer + g.outer);
  const water = add(
    new Mesh(
      new ShapeGeometry(waterRing, 96).rotateX(Math.PI / 2),
      new MeshPhysicalMaterial({
        color: '#83d7d9',
        transparent: true,
        opacity: 0.6,
        roughness: 0.1,
        depthWrite: false,
        side: DoubleSide,
      }),
    ),
    'donut pool water',
  );
  water.position.y = d.waterY;
  water.renderOrder = 1;
  rippleWater(water, uniforms);

  // A ladder on the outer edge, to the east, facing the column.
  const ladder = createPoolLadder(-DONUT_POOL_FLOOR + 0.05);
  ladder.position.set(d.outer, 0, 0);
  ladder.rotation.y = Math.PI;
  group.add(ladder);

  // Four sconces on the column at the cardinal points: an opal glass
  // half-bowl on a brass bracket, open at the top, throwing light up the
  // column and onto the ceiling.
  const brass = new MeshStandardMaterial({
    color: '#b08a4a',
    metalness: 0.85,
    roughness: 0.35,
  });
  const opal = new MeshStandardMaterial({
    color: '#fff6e8',
    emissive: '#ffd9a0',
    emissiveIntensity: 1.6,
    roughness: 0.6,
    side: DoubleSide,
  });
  for (let k = 0; k < 4; k++) {
    const angle = (k * Math.PI) / 2;
    const sconce = new Group();
    sconce.name = 'donut column sconce';
    sconce.rotation.y = angle;
    // Built facing +x, out from the column's face.
    const plate = new Mesh(new CylinderGeometry(0.09, 0.09, 0.02, 32), brass);
    plate.rotation.z = Math.PI / 2;
    plate.position.set(d.column + 0.01, 0, 0);
    const arm = new Mesh(new CylinderGeometry(0.02, 0.02, 0.2, 12), brass);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(d.column + 0.11, 0, 0);
    const bowl = new Mesh(
      new SphereGeometry(
        0.17,
        32,
        12,
        0,
        Math.PI * 2,
        Math.PI / 2,
        Math.PI / 2,
      ),
      opal,
    );
    bowl.position.set(d.column + 0.24, 0.06, 0);
    const rim = new Mesh(new TorusGeometry(0.17, 0.008, 8, 48), brass);
    rim.rotation.x = Math.PI / 2;
    rim.position.copy(bowl.position);
    const light = new PointLight('#ffd6a0', 2.5 * metre * metre, 14 * metre, 2);
    light.position.set(d.column + 0.6, 0.35, 0);
    sconce.add(plate, arm, bowl, rim, light);
    sconce.position.y = d.sconceY;
    group.add(sconce);
  }
  return group;
}
