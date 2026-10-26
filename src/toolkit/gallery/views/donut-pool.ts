import {
  CatmullRomCurve3,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  LatheGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Path,
  PlaneGeometry,
  PointLight,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
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
  createLightShaft,
  createPoolUniforms,
  createTileMaterial,
} from '../../components/pool/views/pool-surfaces';
import type { Footprint } from '../../controls/logic/walk-collision';
import {
  addBoxRoomCoves,
  addColumnFootCove,
  addColumnTileTrim,
  addCornerCoves,
  addTileEdgeTrim,
  tileTrimSteel,
  COVE_RADIUS,
} from '../../components/architectural/views/room-coves';
import {
  boardMarkedConcrete,
  inMetres,
} from '../../components/architectural/views/board-marked-concrete';
import { rippleWater } from './round-room-light';
import { createHumanLadder } from '../../components/architectural/views/human-ladder';

/**
 * donut_pool_1: a white-tiled room 15 m square and 7 m high, a round
 * column 2 m across rising from deck to ceiling in its middle, and round
 * the column a ring-shaped pool, 2.75 m across inside and 10 m outside,
 * its water 1.2 m deep at the outer wall, falling to 2 m at the island. It is a deck-level pool: its water stands at the
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
  outer: 10 / 2,
  waterY: -0.015,
  /** The overflow gutters: round the outer edge, and round the island. */
  gutter: { outer: 0.25, inner: 0.2, depth: 0.2 },
  /**
   * The water's depth: shallowest at the outer wall, deepest at the
   * island, the floor falling evenly between, so there is no deep end,
   * only a deep inside.
   */
  depth: { outer: 1.2, inner: 2 },
  /** Tiles up to here; above, the walls, column and roof are bare concrete. */
  tileTop: 4,
  /** The bulkhead lights on the column, at each cardinal point. */
  sconceY: 3.5,
  /**
   * Four square skylights in the roof, over the water at the cardinal
   * points: their middles' distance from the room's middle, their size,
   * and the depth of the roof they are let into.
   */
  skylights: { at: 3.7, size: 2.2, roof: 0.35 },
  /** The cross beams: the middle of their depth, and their section. */
  beam: { y: 3.5, depth: 0.457, flange: 0.19, flangeT: 0.016, web: 0.009 },
} as const;
const d = DONUT_POOL;
/** The pool's floor at the outer wall (shallowest) and at the island. */
export const DONUT_POOL_FLOOR = d.waterY - d.depth.outer;
export const DONUT_POOL_DEEP = d.waterY - d.depth.inner;
/** The floor's fall, metres down per metre in toward the island. */
const FALL = (d.depth.inner - d.depth.outer) / (d.outer - d.inner);

/** The pool's floor at `r` from the middle, in the ring. */
export function donutPoolFloorY(r: number): number {
  return DONUT_POOL_FLOOR - (d.outer - r) * FALL;
}

/** The floor under the walker: the pool's floor in the ring, else the deck. */
export function donutPoolFloorAt(x: number, z: number): number {
  const r = Math.hypot(x, z);
  return r > d.inner && r < d.outer ? donutPoolFloorY(r) : 0;
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
  // The sun through the skylights makes a feature of the caustics: strong
  // on the pool's floor and walls, and thrown up onto the roof.
  uniforms.caustics.value = 2.8;
  uniforms.reflected.value = 0.28;
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
  const bottom = DONUT_POOL_DEEP - 0.1;

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
  // The pool's floor: a shallow cone, falling from the outer wall in to
  // the island.
  add(
    new Mesh(
      new LatheGeometry(
        [d.inner, d.outer].map((r) => new Vector2(r, donutPoolFloorY(r))),
        160,
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
  /** A floor fitting at angle `a` and radius `r`, laid to the floor's fall. */
  const onFloor = (fitting: Group, a: number, r: number) => {
    const seat = new Group();
    seat.position.set(
      Math.cos(a) * r,
      donutPoolFloorY(r) + 0.001,
      Math.sin(a) * r,
    );
    seat.rotation.y = -a;
    // Local x points out from the middle, up the slope.
    fitting.rotation.z = Math.atan(FALL);
    seat.add(fitting);
    group.add(seat);
  };
  // A pair of main drains, opposite each other, at the deepest, by the
  // island, where the floor falls to them.
  for (const a of [Math.PI / 2, (3 * Math.PI) / 2])
    onFloor(createMainDrain(ft, kinds), a, d.inner + 0.45);
  // Floor inlets, two rings of eight between the drains.
  for (let k = 0; k < 8; k++)
    for (const r of [middle - 1, middle + 1])
      onFloor(createFloorInlet(ft, kinds), ((k + 0.5) / 8) * Math.PI * 2, r);
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

  // Walls and ceiling: tiled to 4 m, bare board-marked concrete above,
  // as cast, like the South Bank's.
  const concrete = boardMarkedConcrete(uniforms);
  const bare = d.height - d.tileTop;
  const wall = (sx: number, sz: number, x: number, z: number) => {
    const tiled = new Mesh(new BoxGeometry(sx, d.tileTop, sz), tile);
    tiled.position.set(x, d.tileTop / 2, z);
    add(tiled, 'donut wall');
    const cast = new Mesh(
      inMetres(new BoxGeometry(sx, bare, sz), Math.max(sx, sz), bare),
      concrete,
    );
    cast.position.set(x, d.tileTop + bare / 2, z);
    add(cast, 'donut wall concrete');
  };
  wall(d.side + 2 * d.wall, d.wall, 0, -h - d.wall / 2);
  wall(d.side + 2 * d.wall, d.wall, 0, h + d.wall / 2);
  wall(d.wall, d.side, -h - d.wall / 2, 0);
  wall(d.wall, d.side, h + d.wall / 2, 0);
  // The roof, the four skylights' wells cut through it.
  const sky = d.skylights;
  const lights = [0, 1, 2, 3].map((k) => {
    const a = (k * Math.PI) / 2;
    return { x: Math.cos(a) * sky.at, z: Math.sin(a) * sky.at };
  });
  const roof = new Shape();
  roof.moveTo(-h, -h);
  roof.lineTo(h, -h);
  roof.lineTo(h, h);
  roof.lineTo(-h, h);
  roof.closePath();
  for (const { x, z } of lights) {
    const hole = new Path();
    const q = sky.size / 2;
    hole.moveTo(x - q, z - q);
    hole.lineTo(x - q, z + q);
    hole.lineTo(x + q, z + q);
    hole.lineTo(x + q, z - q);
    hole.closePath();
    roof.holes.push(hole);
  }
  const ceiling = add(
    new Mesh(
      inMetres(flat(roof, d.height, d.height + sky.roof), 1, 1),
      concrete,
    ),
    'donut roof with skylights',
  );
  ceiling.castShadow = true;
  // The glazing at the top of each well, bright with the sky, on a frame.
  const skyGlass = new MeshBasicMaterial({
    color: '#f4f8ff',
    side: DoubleSide,
  });
  const frame = new MeshStandardMaterial({
    color: '#d9dcd8',
    metalness: 0.4,
    roughness: 0.4,
  });
  for (const { x, z } of lights) {
    const pane = new Mesh(new PlaneGeometry(sky.size, sky.size), skyGlass);
    pane.rotation.x = Math.PI / 2;
    pane.position.set(x, d.height + sky.roof - 0.02, z);
    group.add(pane);
    for (const [w, dd, ox, oz] of [
      [sky.size, 0.06, 0, 0],
      [0.06, sky.size, 0, 0],
    ] as const) {
      const bar = new Mesh(new BoxGeometry(w, 0.05, dd), frame);
      bar.position.set(x + ox, d.height + sky.roof - 0.05, z + oz);
      bar.castShadow = true;
      group.add(bar);
    }
  }
  // A low sun, 33 degrees up, a little south of east: the light through
  // the skylights crosses the beams on its way down, so a beam's shadow
  // falls across the sunlit patches on the west wall, at eye level, where
  // it is seen from all over the room. Shadow-casting, so the roof keeps
  // the sun out but for the skylights.
  const toward = new Vector3(0.81, 0.545, 0.217).normalize();
  const sun = new DirectionalLight('#fff3dc', 5.5);
  sun.position.copy(toward).multiplyScalar(30);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const reach = 16 * metre;
  Object.assign(sun.shadow.camera, {
    left: -reach,
    right: reach,
    top: reach,
    bottom: -reach,
    near: 1 * metre,
    far: 60 * metre,
  });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02 * metre;
  group.add(sun, sun.target);
  // The sunbeams in the air, slanting down from each skylight.
  for (const { x, z } of lights)
    group.add(
      createLightShaft(
        { x, z, w: sky.size, d: sky.size },
        d.height,
        toward,
        '#fff1d2',
        0.16,
      ),
    );
  // Every upright junction coved, as in all the new pool rooms: the walls'
  // feet, the corners, and the column's foot (a tighter fillet there, to
  // stay on the island, clear of its gutter).
  addBoxRoomCoves(group, tile, {
    minX: -h,
    maxX: h,
    minZ: -h,
    maxZ: h,
    floorY: 0,
    height: d.tileTop,
  });
  addCornerCoves(
    group,
    concrete,
    { minX: -h, maxX: h, minZ: -h, maxZ: h, floorY: 0, height: d.height },
    d.tileTop,
    d.height,
  );
  // A stainless trim where the tiles stop and the concrete starts: along
  // the walls, round the corner coves, and round the column.
  const steelTrim = tileTrimSteel();
  addTileEdgeTrim(
    group,
    steelTrim,
    { minX: -h, maxX: h, minZ: -h, maxZ: h, floorY: 0, height: d.height },
    d.tileTop,
  );
  addColumnTileTrim(group, steelTrim, d.column, d.tileTop);
  addColumnFootCove(
    group,
    tile,
    d.column,
    0,
    Math.min(COVE_RADIUS, d.inner - g.inner - d.column - 0.02),
  );

  // The column, deck to ceiling: tiled, then bare concrete.
  const column = add(
    new Mesh(
      new CylinderGeometry(d.column, d.column, d.tileTop, 96, 1, true),
      tile,
    ),
    'donut column',
  );
  column.position.y = d.tileTop / 2;
  const columnTop = add(
    new Mesh(
      inMetres(
        new CylinderGeometry(d.column, d.column, bare, 96, 1, true),
        2 * Math.PI * d.column,
        bare,
      ),
      concrete,
    ),
    'donut column concrete',
  );
  columnTop.position.y = d.tileTop + bare / 2;

  // Two steel beams corner to corner, north-west to south-east and
  // north-east to south-west, crossing through the column at 3.5 m: each
  // a 457 × 191 universal beam, painted, its ends bearing into the
  // corners on plates.
  const beam = d.beam;
  const paint = new MeshStandardMaterial({
    color: '#8e9aa1',
    metalness: 0.25,
    roughness: 0.6,
  });
  const span = Math.SQRT2 * d.side + 0.4;
  for (const angle of [Math.PI / 4, -Math.PI / 4]) {
    const girder = new Group();
    girder.name = 'donut cross beam';
    girder.rotation.y = angle;
    girder.position.y = beam.y;
    const part = (w: number, h: number, y: number) => {
      const mesh = new Mesh(new BoxGeometry(span, h, w), paint);
      mesh.position.y = y;
      girder.add(mesh);
    };
    part(beam.flange, beam.flangeT, beam.depth / 2 - beam.flangeT / 2);
    part(beam.flange, beam.flangeT, -beam.depth / 2 + beam.flangeT / 2);
    part(beam.web, beam.depth - 2 * beam.flangeT, 0);
    // Web stiffeners either side of the column, where the beam is carried.
    for (const x of [-1.15, 1.15])
      for (const z of [-1, 1]) {
        const plate = new Mesh(
          new BoxGeometry(
            0.012,
            beam.depth - 2 * beam.flangeT,
            beam.flange / 2 - beam.web / 2,
          ),
          paint,
        );
        plate.position.set(x, 0, z * (beam.flange / 4 + beam.web / 4));
        girder.add(plate);
      }
    // Bearing plates where it meets the corners.
    for (const x of [-1, 1]) {
      const bearing = new Mesh(new BoxGeometry(0.02, 0.6, 0.4), paint);
      bearing.position.set(x * (Math.SQRT2 * (d.side / 2) - 0.3), 0, 0);
      girder.add(bearing);
    }
    group.add(girder);
  }

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
  const ladder = createHumanLadder('pool', -DONUT_POOL_FLOOR + 0.05).group;
  ladder.position.set(d.outer, 0, 0);
  ladder.rotation.y = Math.PI;
  group.add(ladder);

  // Four bulkhead lights on the column at the cardinal points, level with
  // the cross beams: the familiar round cast-aluminium bulkhead, a body
  // fixed to the column, an opal glass dome held in by a rim, and a
  // cross-bar guard over the glass.
  const body = new MeshStandardMaterial({
    color: '#3c4246',
    metalness: 0.55,
    roughness: 0.5,
  });
  const opal = new MeshStandardMaterial({
    color: '#fff6e8',
    emissive: '#ffe2b8',
    emissiveIntensity: 1.4,
    roughness: 0.5,
  });
  const bow = new CatmullRomCurve3(
    Array.from({ length: 13 }, (_, i) => {
      const t = (i / 12) * Math.PI;
      return new Vector3(0.09 * Math.sin(t), 0.15 * Math.cos(t), 0);
    }),
  );
  for (let k = 0; k < 4; k++) {
    const fitting = new Group();
    fitting.name = 'donut column bulkhead';
    fitting.rotation.y = (k * Math.PI) / 2;
    // Built facing +x, out from the column's face.
    const part = (mesh: Mesh, at: number) => {
      mesh.position.x = d.column + at;
      fitting.add(mesh);
    };
    part(
      new Mesh(
        new CylinderGeometry(0.18, 0.185, 0.06, 40).rotateZ(Math.PI / 2),
        body,
      ),
      0.03,
    );
    part(
      new Mesh(
        new SphereGeometry(0.14, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2)
          .rotateZ(-Math.PI / 2)
          .scale(0.6, 1, 1),
        opal,
      ),
      0.06,
    );
    part(
      new Mesh(
        new TorusGeometry(0.15, 0.014, 8, 40).rotateY(Math.PI / 2),
        body,
      ),
      0.066,
    );
    for (const turn of [0, Math.PI / 2])
      part(
        new Mesh(new TubeGeometry(bow, 24, 0.009, 6).rotateX(turn), body),
        0.06,
      );
    const light = new PointLight('#ffe0b8', 2.5 * metre * metre, 14 * metre, 2);
    light.position.set(d.column + 0.3, 0, 0);
    fitting.add(light);
    fitting.position.y = d.sconceY;
    group.add(fitting);
  }
  // Everything solid takes the sun's shadows and casts its own, but the
  // water, the glazing and the sunbeams, which are light, not things.
  group.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const light =
      /water/.test(o.name) ||
      o.material === skyGlass ||
      (o.material as { name?: string }).name === 'LightShaft';
    o.castShadow = !light;
    o.receiveShadow = !light;
  });
  return group;
}
