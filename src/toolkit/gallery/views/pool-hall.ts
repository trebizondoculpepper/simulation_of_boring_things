import {
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  BackSide,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  Matrix4,
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
  SRGBColorSpace,
  Vector3,
} from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createPanelKit } from '../../components/core/views/eighties-controls';
import { plantTools } from '../../components/plant/views/plant-tools';
import {
  createDeckGully,
  createFloorInlet,
  createMainDrain,
  createPoolLight,
  createWallInlet,
  fittingMaterials,
} from '../../components/pool/views/pool-fittings';
import type { PoolFittingMaterials } from '../../components/pool/views/pool-fittings';
import {
  createCausticPatch,
  createLightShaft,
  createPoolUniforms,
  createTileMaterial,
} from '../../components/pool/views/pool-surfaces';
import {
  addBoxRoomCoves,
  addColumnFootCove,
  addColumnTileTrim,
  COVE_RADIUS,
  coveStrip,
  addTileEdgeTrim,
  tileTrimSteel,
} from '../../components/architectural/views/room-coves';
import {
  boardMarkedConcrete,
  inMetres,
} from '../../components/architectural/views/board-marked-concrete';
import { rippleWater } from './round-room-light';
import { laneRopeSway } from '../logic/lane-rope';
import {
  createCornerFillet,
  createCorridor,
  createCorridorRun,
} from '../../components/architectural/views/corridor';
import { pieceLength } from '../../components/architectural/logic/corridor-path';
import { roomCorridors } from '../logic/pool-loop';
import { PLANT_DOORWAY, PLANT_SILL } from '../logic/plant-rooms';

/** The plant room door's frame head over the deck, metres. */
const PLANT_DOOR_HEAD = 2.04 + 2 * 0.05;
import type { LoopRoom } from '../logic/pool-loop';
import { createPoolLadder } from './pool-ladder';
import { createMetalGlobeLight } from '../../components/architectural/views/metal-globe-light';
import {
  archSpan,
  CORRIDOR_SECTION,
  freeOutline,
  galleryOfficeDoor,
  galleryPlan,
  hallFloorAt,
  insideOutline,
  laneMiddles,
  offsetOutline,
  rectDepth,
  startingBlocks,
  roofAt,
  stepTop,
  SUN,
  WALL,
  WATER_Y,
} from '../logic/pool-halls';
import type {
  FreeBasin,
  PoolHallSpec,
  RectBasin,
  RoundBasin,
} from '../logic/pool-halls';
import { zoneOfRoom } from '../../../game/plant/lighting';

/**
 * A version-one pool hall (`logic/pool-halls.ts`): a tiled hall, coved at
 * every junction, bare board-marked concrete above the tiles where the
 * hall is tall, and its deck-level pools, each with its gutter and
 * grating, main drains, floor and wall inlets, underwater lights, deck
 * gullies and ladders, and what makes it the pool it is: the lounge
 * pool's ledge and steps, the Olympic pool's lanes, ropes and blocks, the
 * jacuzzi's seat, jets and air bubbles, the footbath's channel from
 * wall to wall. Any columns stand in the deck,
 * coved at their feet. The hall's
 * middle at the origin, the deck at y = 0, in metres scaled by `metre`.
 */
export function createPoolHall(
  s: PoolHallSpec,
  metre: number,
  {
    underwater = false,
    loopRoom,
  }: {
    /**
     * Seen from under the water (from the viewing gallery): the pool's
     * water drawn as a volume, and the gallery lit.
     */
    underwater?: boolean;
    /** Its place in the pool loop, whose corridors it draws. */
    loopRoom?: LoopRoom;
  } = {},
) {
  const gallery = galleryPlan(s);
  const group = new Group();
  group.name = s.id;
  group.scale.setScalar(metre);
  const hx = s.w / 2;
  const hz = s.d / 2;
  const g = s.gutter;
  // Each free basin's outline, sampled once.
  const lines = s.basins.map((b) => (b.shape === 'free' ? freeOutline(b) : []));
  const bounds = s.basins.map((b, k) => {
    if (b.shape === 'rect')
      return {
        minX: b.x - b.w / 2,
        maxX: b.x + b.w / 2,
        minZ: b.z - b.d / 2,
        maxZ: b.z + b.d / 2,
      };
    if (b.shape === 'round')
      return {
        minX: b.x - b.r,
        maxX: b.x + b.r,
        minZ: b.z - b.r,
        maxZ: b.z + b.r,
      };
    const xs = lines[k].map(([x]) => x);
    const zs = lines[k].map(([, z]) => z);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minZ: Math.min(...zs),
      maxZ: Math.max(...zs),
    };
  });
  const uniforms = createPoolUniforms(metre, WATER_Y, bounds);
  // For the room, to dim the pool with the hall's lights (`room-lights.ts`).
  group.userData.poolUniforms = uniforms;
  const tile = createTileMaterial(uniforms, {
    colour: s.tile.colour,
    tile: s.tile.size,
  });
  tile.side = DoubleSide;
  // The corridors are dry rooms: their tile is the hall's, but with no
  // water to tint it or throw caustics on it, however low they go.
  const dryUniforms = createPoolUniforms(metre, -100, []);
  dryUniforms.caustics.value = dryUniforms.reflected.value = 0;
  const dry = createTileMaterial(dryUniforms, {
    colour: s.tile.colour,
    tile: s.tile.size,
  });
  dry.side = DoubleSide;
  const add = (mesh: Mesh, name: string) => {
    mesh.name = name;
    group.add(mesh);
    return mesh;
  };
  /** A flat slab of `shape` (in x, z) from `bottom` up to `top`. */
  const flat = (shape: Shape, bottom: number, top: number) =>
    new ExtrudeGeometry(shape, {
      depth: top - bottom,
      bevelEnabled: false,
      curveSegments: 64,
    })
      .rotateX(Math.PI / 2)
      .translate(0, top, 0);
  const rect = <P extends Path>(
    path: P,
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
  ) => {
    path.moveTo(minX, minZ);
    path.lineTo(maxX, minZ);
    path.lineTo(maxX, maxZ);
    path.lineTo(minX, maxZ);
    path.closePath();
    return path;
  };
  const circle = <P extends Path>(path: P, x: number, z: number, r: number) => {
    path.absarc(x, z, r, 0, Math.PI * 2, false);
    return path;
  };
  /** A basin's outline, grown by `grow` all round. */
  const outline = <P extends Path>(path: P, k: number, grow: number) => {
    const b = s.basins[k];
    if (b.shape === 'round') return circle(path, b.x, b.z, b.r + grow);
    if (b.shape === 'free') {
      const line = grow ? offsetOutline(lines[k], grow) : lines[k];
      path.moveTo(...line[0]);
      for (const p of line.slice(1)) path.lineTo(...p);
      path.closePath();
      return path;
    }
    const o = bounds[k];
    return rect(
      path,
      o.minX - grow,
      o.maxX + grow,
      o.minZ - grow,
      o.maxZ + grow,
    );
  };
  const deepest = Math.max(
    ...s.basins.map((b) => (b.shape === 'rect' ? b.deep : b.depth)),
    0.2,
  );
  const bottom = WATER_Y - deepest - 0.1;
  let underwaterVolume: { mesh: Mesh; deep: number } | null = null;
  // What floats on the water (lane ropes), moved with its surface.
  const floats: Object3D[] = [];

  // The deck, each basin's gutter cut out of it; under each grating a
  // kerb stands to the gutter's floor, its inner face the pool's wall.
  // A channel from wall to wall cuts the deck in two instead.
  const span = s.basins.find(
    (b): b is RectBasin => b.shape === 'rect' && Boolean(b.spans),
  );
  if (span) {
    const n = span.z - span.d / 2;
    const so = span.z + span.d / 2;
    const slab = (z0: number, z1: number, top: number, name: string) =>
      add(
        new Mesh(flat(rect(new Shape(), -hx, hx, z0, z1), bottom, top), tile),
        name,
      );
    slab(-hz, n - g.width, 0, 'deck');
    slab(so + g.width, hz, 0, 'deck');
    slab(n - g.width, n, -g.depth, 'gutter kerb');
    slab(so, so + g.width, -g.depth, 'gutter kerb');
    // The walls go down past the deck where the channel meets them.
    for (const x of [-hx - WALL / 2, hx + WALL / 2])
      add(
        new Mesh(new BoxGeometry(WALL, -bottom, span.d + 2 * g.width), tile),
        'channel end wall',
      ).position.set(x, bottom / 2, span.z);
  } else {
    const deck = rect(new Shape(), -hx, hx, -hz, hz);
    s.basins.forEach((_, k) =>
      deck.holes.push(outline(new Path(), k, g.width)),
    );
    // Over a gallery the deck is a slab, the corridor under it: its
    // underside kept inside the corridor's ceiling (0.35 m down to 0.15),
    // not level with its face, where the pool's wet tile would show.
    add(new Mesh(flat(deck, gallery ? -0.3 : bottom, 0), tile), 'deck');
    s.basins.forEach((_, k) => {
      if (gallery && k === 0) {
        // The gutter's kerb but for its north side, which is the
        // gallery's windowed wall (and a strip on its top).
        const o = bounds[0];
        const w = g.width;
        const strip = (
          x0: number,
          x1: number,
          z0: number,
          z1: number,
          y0: number,
        ) =>
          add(
            new Mesh(new BoxGeometry(x1 - x0, -g.depth - y0, z1 - z0), tile),
            'gutter kerb',
          ).position.set((x0 + x1) / 2, (y0 - g.depth) / 2, (z0 + z1) / 2);
        strip(o.minX - w, o.maxX + w, o.maxZ, o.maxZ + w, bottom);
        // The ends stop at the windowed wall, not in its face.
        strip(o.minX - w, o.minX, o.minZ, o.maxZ, bottom);
        strip(o.maxX, o.maxX + w, o.minZ, o.maxZ, bottom);
        strip(o.minX, o.maxX, o.minZ - w, o.minZ, gallery.floor + 2.5);
        return;
      }
      const kerb = outline(new Shape(), k, g.width);
      kerb.holes.push(outline(new Path(), k, 0));
      add(new Mesh(flat(kerb, bottom, -g.depth), tile), 'gutter kerb');
    });
  }

  // The fittings, in plain tile-shaded materials so the water tints them.
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
  // Gratings: white bars across each gutter, 20 mm apart.
  const bars: BufferGeometry[] = [];
  const pitch = 0.02;
  const barAt = (x: number, z: number, along: number, length: number) =>
    bars.push(
      new BoxGeometry(length, 0.025, 0.012)
        .rotateY(along)
        .translate(x, -0.0125, z),
    );

  s.basins.forEach((b, k) => {
    if (b.shape === 'rect') rectBasin(b, k);
    else if (b.shape === 'round') roundBasin(b);
    else freeBasin(b, k);
  });

  /** Grating bars across a gutter whose middle runs along `line`. */
  function barsAlong(
    line: readonly (readonly [number, number])[],
    width: number,
  ) {
    const n = line.length;
    let carry = 0;
    for (let i = 0; i < n; i++) {
      const [ax, az] = line[i];
      const [bx, bz] = line[(i + 1) % n];
      const len = Math.hypot(bx - ax, bz - az);
      if (!len) continue;
      // Across the gutter: the segment's normal.
      const nx = (bz - az) / len;
      const nz = -(bx - ax) / len;
      const along = Math.atan2(-nz, nx);
      let d = carry;
      for (; d < len; d += pitch)
        barAt(
          ax + ((bx - ax) * d) / len,
          az + ((bz - az) * d) / len,
          along,
          width - 0.01,
        );
      carry = d - len;
    }
  }

  /**
   * A free-form basin: its flat floor, its shelves, its islands (each
   * with its gutter and grating), the grating round its outline, and its
   * fittings laid out over it.
   */
  function freeBasin(b: FreeBasin, k: number) {
    const line = lines[k];
    const inWater = (x: number, z: number, margin = 0.4) =>
      insideOutline(offsetOutline(line, -margin), x, z) &&
      !b.islands.some((i) => Math.hypot(x - i.x, z - i.z) < i.r + margin);
    const offShelf = (x: number, z: number, margin: number) =>
      !b.shelves.some((h) => Math.hypot(x - h.x, z - h.z) < h.r + margin) &&
      !(b.wells ?? []).some(
        (w) => Math.hypot(x - w.x, z - w.z) < w.r + margin,
      ) &&
      !s.columns.some((c) => Math.hypot(x - c.x, z - c.z) < c.r + margin);
    const floorShape = outline(new Shape(), k, 0);
    for (const i of b.islands)
      floorShape.holes.push(circle(new Path(), i.x, i.z, i.r));
    for (const w of b.wells ?? []) {
      floorShape.holes.push(circle(new Path(), w.x, w.z, w.r));
      // Its wall, straight down from the floor, and its far floor.
      const drop = w.depth - b.depth;
      const shaft = add(
        new Mesh(new CylinderGeometry(w.r, w.r, drop, 48, 1, true), tile),
        'well',
      );
      shaft.position.set(w.x, WATER_Y - b.depth - drop / 2, w.z);
      add(
        new Mesh(new CircleGeometry(w.r, 48).rotateX(-Math.PI / 2), tile),
        'well floor',
      ).position.set(w.x, WATER_Y - w.depth, w.z);
    }
    const floor = new ShapeGeometry(floorShape, 64).rotateX(Math.PI / 2);
    floor.translate(0, WATER_Y - b.depth, 0);
    add(new Mesh(floor, tile), `${b.name} floor`);
    barsAlong(offsetOutline(line, g.width / 2), g.width);
    // The shelves, raised from the floor to a lounging depth.
    for (const h of b.shelves)
      add(
        new Mesh(
          flat(circle(new Shape(), h.x, h.z, h.r), bottom, WATER_Y - h.below),
          tile,
        ),
        'shelf',
      );
    // The islands: a round of deck, a gutter round it under a grating.
    for (const i of b.islands) {
      const top = circle(new Shape(), i.x, i.z, i.r - g.width);
      add(new Mesh(flat(top, bottom, 0), tile), 'island');
      const kerb = circle(new Shape(), i.x, i.z, i.r);
      kerb.holes.push(circle(new Path(), i.x, i.z, i.r - g.width));
      add(new Mesh(flat(kerb, bottom, -g.depth), tile), 'island gutter kerb');
      const middle = i.r - g.width / 2;
      const count = Math.round((2 * Math.PI * middle) / pitch);
      for (let n = 0; n < count; n++) {
        const a = (n / count) * Math.PI * 2;
        barAt(
          i.x + Math.cos(a) * middle,
          i.z + Math.sin(a) * middle,
          -a,
          g.width - 0.01,
        );
      }
    }
    // Two main drains in the open water, floor inlets on a 3 m grid.
    const onFloor = (fitting: Group, x: number, z: number) => {
      fitting.position.set(x, WATER_Y - b.depth + 0.001, z);
      group.add(fitting);
    };
    const o = bounds[k];
    const spots: [number, number][] = [];
    for (let x = o.minX + 1.5; x < o.maxX; x += 3)
      for (let z = o.minZ + 1.5; z < o.maxZ; z += 3)
        if (inWater(x, z, 0.6) && offShelf(x, z, 0.3)) spots.push([x, z]);
    const mid = { x: (o.minX + o.maxX) / 2, z: (o.minZ + o.maxZ) / 2 };
    spots.sort(
      (p, q) =>
        Math.hypot(p[0] - mid.x, p[1] - mid.z) -
        Math.hypot(q[0] - mid.x, q[1] - mid.z),
    );
    spots.forEach(([x, z], n) =>
      onFloor(
        n < 2 ? createMainDrain(ft, kinds) : createFloorInlet(ft, kinds),
        x,
        z,
      ),
    );
    // Wall inlets every 2.5 m round the outline, lights between, facing in.
    const inward = offsetOutline(line, -1);
    let next = 0;
    let travelled = 0;
    let lamp = false;
    for (let n = 0; n < line.length; n++) {
      const [ax, az] = line[n];
      const [bx, bz] = line[(n + 1) % line.length];
      travelled += Math.hypot(bx - ax, bz - az);
      if (travelled < next) continue;
      next = travelled + 2.5;
      const [ix, iz] = inward[n];
      const fitting = lamp
        ? createPoolLight(ft, kinds)
        : createWallInlet(ft, kinds);
      fitting.position.set(ax, WATER_Y - (lamp ? 0.6 : 0.4), az);
      fitting.rotation.y = Math.atan2(ix - ax, iz - az);
      group.add(fitting);
      lamp = !lamp;
    }
    // So shallow a pool needs no steps: a ladder by each shelf.
    for (const h of b.shelves) {
      let best = 0;
      let near = Infinity;
      line.forEach(([x, z], n) => {
        const d = Math.hypot(x - h.x, z - h.z);
        if (d < near) [near, best] = [d, n];
      });
      const [x, z] = line[best];
      const [ix, iz] = inward[best];
      const ladder = createPoolLadder(h.below + 0.05);
      ladder.position.set(x, 0, z);
      // Its water side (+x) toward the pool.
      ladder.rotation.y = Math.atan2(-(iz - z), ix - x);
      group.add(ladder);
    }
  }

  function rectBasin(b: RectBasin, k: number) {
    const o = bounds[k];
    const fall = (b.deep - b.shallow) / b.w;
    // The floor, falling from west to east.
    const floor = new PlaneGeometry(b.w, b.d, 1, 1).rotateX(-Math.PI / 2);
    const p = floor.getAttribute('position');
    for (let i = 0; i < p.count; i++)
      p.setY(i, WATER_Y - rectDepth(b, b.x + p.getX(i)));
    floor.translate(b.x, 0, b.z);
    floor.computeVertexNormals();
    add(new Mesh(floor, tile), `${b.name} floor`);
    // Gratings round all four sides, the corners squared off; a channel
    // from wall to wall has them only along its two edges.
    const w = g.width;
    const reach = b.spans ? 0 : w;
    for (const [z, x0, x1] of [
      [o.minZ - w / 2, o.minX - reach, o.maxX + reach],
      [o.maxZ + w / 2, o.minX - reach, o.maxX + reach],
    ])
      for (let x = x0 + pitch / 2; x < x1; x += pitch)
        barAt(x, z, Math.PI / 2, w - 0.01);
    if (!b.spans)
      for (const [x, z0, z1] of [
        [o.minX - w / 2, o.minZ, o.maxZ],
        [o.maxX + w / 2, o.minZ, o.maxZ],
      ])
        for (let z = z0 + pitch / 2; z < z1; z += pitch)
          barAt(x, z, 0, w - 0.01);

    // A sitting ledge along the north wall.
    if (b.ledge) {
      const l = b.ledge;
      const top = WATER_Y - l.below;
      const len = l.to - l.from;
      add(
        new Mesh(new BoxGeometry(len, top - bottom, l.width), tile),
        'ledge',
      ).position.set(
        b.x + (l.from + l.to) / 2,
        (top + bottom) / 2,
        o.minZ + l.width / 2,
      );
    }
    // Steps down at the west end, in the south-west corner.
    if (b.steps) {
      const st = b.steps;
      for (let n = 0; n < st.count; n++) {
        const top = stepTop(b, n);
        add(
          new Mesh(new BoxGeometry(st.going, top - bottom, st.width), tile),
          'step',
        ).position.set(
          o.minX + (n + 0.5) * st.going,
          (top + bottom) / 2,
          o.maxZ - st.width / 2,
        );
      }
      // A handrail down the steps' open side.
      const rail = createPoolLadder(rectDepth(b, o.minX) * 0.6, 0.01);
      rail.position.set(o.minX, 0, o.maxZ - st.width - 0.05);
      group.add(rail);
    }

    // A pair of main drains at the deepest, 2 m apart, floor inlets in a
    // grid between, laid to the floor's fall.
    const onFloor = (fitting: Group, x: number, z: number) => {
      const seat = new Group();
      seat.position.set(x, WATER_Y - rectDepth(b, x) + 0.001, z);
      // Local x up the slope, toward the shallow end.
      seat.rotation.y = Math.PI;
      fitting.rotation.z = Math.atan(fall);
      seat.add(fitting);
      group.add(seat);
    };
    // Too shallow for lights, ladders or a grid of inlets.
    const small = b.deep < 0.4;
    if (small) {
      const drain = createMainDrain(ft, kinds);
      drain.scale.setScalar(0.5);
      onFloor(drain, b.x, b.z);
    } else {
      const dx = b.lanes ? 0 : o.maxX - 1.5;
      for (const dz of [-1, 1])
        onFloor(createMainDrain(ft, kinds), b.x + dx, b.z + dz);
      const step = b.w > 30 ? 5 : 3;
      for (let x = o.minX + step; x < o.maxX - step / 2; x += step)
        for (let z = o.minZ + step / 2; z < o.maxZ; z += step) {
          if (Math.abs(x - (b.x + dx)) < 1.2 && Math.abs(z - b.z) < 2) continue;
          if (b.ledge && z < o.minZ + b.ledge.width + 0.3) continue;
          if (
            b.steps &&
            x < o.minX + b.steps.count * b.steps.going + 0.3 &&
            z > o.maxZ - b.steps.width - 0.3
          )
            continue;
          onFloor(createFloorInlet(ft, kinds), x, z);
        }
    }
    // Wall inlets along the long walls, and underwater lights between,
    // each facing into the water.
    const jetY = WATER_Y - Math.min(0.45, b.shallow / 2);
    const lightY = WATER_Y - Math.min(0.8, b.shallow * 0.6);
    const spacing = small ? 0.6 : b.w > 30 ? 5 : 2.5;
    for (const [z, yaw, ledgeSide] of [
      // The north wall is the gallery's windows, where it has one.
      ...(gallery ? [] : ([[o.minZ, 0, true]] as const)),
      [o.maxZ, Math.PI, false],
    ] as const) {
      for (let x = o.minX + spacing / 2; x < o.maxX; x += spacing) {
        if (small && ledgeSide) continue;
        const onLedge =
          ledgeSide &&
          b.ledge &&
          x - b.x > b.ledge.from &&
          x - b.x < b.ledge.to;
        const inSteps =
          !ledgeSide && b.steps && x < o.minX + b.steps.count * b.steps.going;
        if (inSteps) continue;
        const jet = createWallInlet(ft, kinds);
        if (small) jet.scale.setScalar(0.6);
        jet.position.set(
          x,
          onLedge ? WATER_Y - b.ledge!.below * 0.5 : jetY,
          z + (onLedge ? b.ledge!.width : 0) * (ledgeSide ? 1 : -1),
        );
        jet.rotation.y = yaw;
        group.add(jet);
        if (!small && x + spacing / 2 < o.maxX && !onLedge) {
          const lamp = createPoolLight(ft, kinds);
          lamp.position.set(x + spacing / 2, lightY, z);
          lamp.rotation.y = yaw;
          group.add(lamp);
        }
      }
    }
    // Ladders near the deep end, on both long sides.
    if (!small) {
      const depth = -(WATER_Y - b.deep) + 0.05;
      for (const [x, z, yaw] of [
        [o.maxX - 1.5, o.minZ, -Math.PI / 2],
        [o.maxX - 1.5, o.maxZ, Math.PI / 2],
        ...(b.lanes
          ? ([
              [o.minX + 1.5, o.minZ, -Math.PI / 2],
              [o.minX + 1.5, o.maxZ, Math.PI / 2],
            ] as const)
          : []),
      ] as const) {
        const ladder = createPoolLadder(depth);
        ladder.position.set(x, 0, z);
        ladder.rotation.y = yaw;
        group.add(ladder);
      }
    }
    if (b.lanes) racing(b, k);
  }

  /** An Olympic pool's lane lines, targets, ropes and starting blocks. */
  function racing(b: RectBasin, k: number) {
    const o = bounds[k];
    const mark = plain('#1d2b4a', 0.3);
    const lines: BufferGeometry[] = [];
    const y = WATER_Y - b.deep + 0.004;
    for (const z of laneMiddles(b)) {
      // The line stops 2 m short of each end in a T, 1 m across.
      lines.push(
        new BoxGeometry(b.w - 4, 0.005, 0.25).translate(b.x, y, z),
        new BoxGeometry(0.25, 0.005, 1).translate(o.minX + 2, y, z),
        new BoxGeometry(0.25, 0.005, 1).translate(o.maxX - 2, y, z),
      );
      // A target on each end wall, 0.3 m under the water.
      for (const x of [o.minX + 0.004, o.maxX - 0.004]) {
        // A cross 0.5 m across, 0.3 m under the water, and the lane's line
        // down the wall from it to the floor.
        const drop = b.deep - 0.55;
        lines.push(
          new BoxGeometry(0.005, 0.25, 0.5).translate(x, WATER_Y - 0.3, z),
          new BoxGeometry(0.005, drop + 0.5, 0.25).translate(
            x,
            WATER_Y - 0.05 - (drop + 0.5) / 2,
            z,
          ),
        );
      }
    }
    add(new Mesh(mergeGeometries(lines), mark), 'lane markings');
    for (const l of lines) l.dispose();

    // Lane ropes: wave-breaking discs on a wire between each pair of lanes,
    // green at the sides, yellow in the middle, blue between, and red for
    // the last 5 m at each end.
    // Only one rope is strung, the middle one (yellow), between the lanes
    // either side of the pool's middle; the others are off.
    const ropes = (b.lanes ?? 0) - 1;
    const strung = [Math.ceil(ropes / 2)];
    const disc = 0.11;
    const perRope = Math.floor(b.w / disc);
    const beads = new InstancedMesh(
      new CylinderGeometry(0.06, 0.06, 0.09, 12).rotateZ(Math.PI / 2),
      new MeshStandardMaterial({ roughness: 0.45 }),
      strung.length * perRope,
    );
    beads.name = 'lane ropes';
    const m = new Matrix4();
    const colour = new Color();
    let n = 0;
    // Each float's place at rest, and how far along its rope it is.
    const rest: { x: number; z: number; u: number }[] = [];
    for (const r of strung) {
      const z = o.minZ + (r * b.d) / (ropes + 1);
      const base =
        r === 1 || r === ropes
          ? '#2e9a4a'
          : r === Math.ceil(ropes / 2)
            ? '#e8c21e'
            : '#2459b8';
      for (let i = 0; i < perRope; i++) {
        const x = o.minX + (i + 0.5) * disc;
        m.makeTranslation(x, WATER_Y + 0.01, z);
        beads.setMatrixAt(n, m);
        rest.push({ x, z, u: (x - o.minX) / (o.maxX - o.minX) });
        const end = x - o.minX < 5 || o.maxX - x < 5;
        beads.setColorAt(n, colour.set(end ? '#d0302a' : base));
        n++;
      }
    }
    group.add(beads);
    // They float: as the pool is drained they go down with its water.
    floats.push(beads);
    // And sway, slowly, as a plucked string (`lane-rope.ts`): each float
    // moved across the pool by the standing wave at its place on the rope.
    beads.userData.live = true;
    beads.frustumCulled = false;
    beads.onBeforeRender = () => {
      const t = performance.now() / 1000;
      rest.forEach((p, k) => {
        m.makeTranslation(p.x, WATER_Y + 0.01, p.z + laneRopeSway(p.u, t));
        beads.setMatrixAt(k, m);
      });
      beads.instanceMatrix.needsUpdate = true;
    };

    // Starting blocks at the west end, behind the gutter: a white
    // platform tilted toward the water on a post, its lane's number on
    // its face.
    const white = new MeshStandardMaterial({
      color: '#eef0ec',
      roughness: 0.4,
    });
    const grip = new MeshStandardMaterial({ color: '#3b4a5c', roughness: 0.9 });
    const steel = new MeshStandardMaterial({
      color: '#c9cdcf',
      metalness: 0.9,
      roughness: 0.25,
    });
    startingBlocks(b, g.width).forEach(({ x, z }, lane) => {
      const block = new Group();
      block.name = `starting block ${lane + 1}`;
      block.position.set(x, 0, z);
      const post = new Mesh(new BoxGeometry(0.5, 0.62, 0.45), white);
      post.position.y = 0.31;
      block.add(post);
      const top = new Mesh(new BoxGeometry(0.6, 0.05, 0.52), white);
      top.position.set(0.04, 0.7, 0);
      top.rotation.z = -0.17;
      block.add(top);
      const pad = new Mesh(new BoxGeometry(0.56, 0.006, 0.48), grip);
      pad.position.set(0.04, 0.728, 0);
      pad.rotation.z = -0.17;
      block.add(pad);
      // The backstroke grips under the front edge.
      const bar = new Mesh(
        new CylinderGeometry(0.014, 0.014, 0.44, 10).rotateX(Math.PI / 2),
        steel,
      );
      bar.position.set(0.3, 0.52, 0);
      block.add(bar);
      const number = laneNumber(lane);
      number.position.set(0.252, 0.38, 0);
      number.rotation.y = Math.PI / 2;
      block.add(number);
      group.add(block);
    });
  }

  function roundBasin(b: RoundBasin) {
    // The floor, the seat round the wall, and a grating ring over the gutter.
    const floor = new CircleGeometry(b.r - b.seat.width, 64).rotateX(
      -Math.PI / 2,
    );
    floor.translate(b.x, WATER_Y - b.depth, b.z);
    add(new Mesh(floor, tile), `${b.name} floor`);
    const seat = circle(new Shape(), b.x, b.z, b.r);
    seat.holes.push(circle(new Path(), b.x, b.z, b.r - b.seat.width));
    add(new Mesh(flat(seat, bottom, WATER_Y - b.seat.below), tile), 'seat');
    const middle = b.r + g.width / 2;
    const count = Math.round((2 * Math.PI * middle) / pitch);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      barAt(
        b.x + Math.cos(a) * middle,
        b.z + Math.sin(a) * middle,
        -a,
        g.width - 0.01,
      );
    }
    // Jets in the wall behind each of the eight places, at the small of
    // the back; air bubbles rise out of the seat's edge and the floor.
    for (let i = 0; i < 8; i++) {
      const a = ((i + 0.5) / 8) * Math.PI * 2;
      const jet = createWallInlet(ft, kinds);
      jet.position.set(
        b.x + Math.cos(a) * b.r,
        WATER_Y - b.seat.below + 0.2,
        b.z + Math.sin(a) * b.r,
      );
      jet.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));
      group.add(jet);
    }
    for (const dz of [-0.3, 0.3]) {
      const drain = createMainDrain(ft, kinds);
      drain.scale.setScalar(0.6);
      drain.position.set(b.x, WATER_Y - b.depth + 0.001, b.z + dz);
      group.add(drain);
    }
    const lamp = createPoolLight(ft, kinds);
    lamp.position.set(
      b.x - (b.r - b.seat.width),
      WATER_Y - (b.depth + b.seat.below) / 2,
      b.z,
    );
    lamp.rotation.y = Math.PI / 2;
    group.add(lamp);
    group.add(bubbles(b));
    // A grab rail down onto the seat, at the east.
    const rail = createPoolLadder(b.seat.below + 0.05, 0.4);
    rail.position.set(b.x + b.r, 0, b.z);
    rail.rotation.y = Math.PI;
    group.add(rail);
  }

  /** Air bubbles rising through a hot tub's water, over and over. */
  function bubbles(b: RoundBasin) {
    const count = 360;
    const mesh = new InstancedMesh(
      new SphereGeometry(0.012, 6, 4),
      new MeshStandardMaterial({
        color: '#f4fbfb',
        transparent: true,
        opacity: 0.75,
        roughness: 0.2,
      }),
      count,
    );
    mesh.name = 'jacuzzi air';
    const seeds = Array.from({ length: count }, (_, i) => {
      // Half from the seat's front edge, half from the floor's ring.
      const onSeat = i % 2 === 0;
      const r = onSeat ? b.r - 0.1 : b.r - b.seat.width - 0.08;
      return {
        a: Math.random() * Math.PI * 2,
        r: r + (Math.random() - 0.5) * 0.06,
        from: WATER_Y - (onSeat ? b.seat.below : b.depth),
        phase: Math.random(),
        speed: 0.9 + Math.random() * 0.6,
      };
    });
    const m = new Matrix4();
    const update = () => {
      const t = performance.now() / 1000;
      seeds.forEach((q, i) => {
        const rise = (q.phase + (t * q.speed) / -q.from) % 1;
        const y = q.from + rise * (WATER_Y - q.from);
        const wobble = Math.sin(t * 9 + i) * 0.01;
        const scale = 0.6 + rise * 1.2;
        m.makeScale(scale, scale, scale).setPosition(
          b.x + Math.cos(q.a) * (q.r + wobble),
          y,
          b.z + Math.sin(q.a) * (q.r + wobble),
        );
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };
    update();
    mesh.onBeforeRender = update;
    mesh.frustumCulled = false;
    return mesh;
  }

  if (bars.length) {
    add(new Mesh(mergeGeometries(bars), kinds.abs), 'gutter gratings');
    for (const bar of bars) bar.dispose();
  }

  // Deck gullies in the corners, for splash and wash-down water.
  for (const [x, z] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    const gully = createDeckGully(ft, kinds);
    gully.position.set(x * (hx - 0.6), 0.002, z * (hz - 0.6));
    group.add(gully);
  }

  // The water over each basin, out over its gutter.
  const waterMaterial = new MeshPhysicalMaterial({
    color: '#83d7d9',
    transparent: true,
    opacity: 0.6,
    roughness: 0.1,
    depthWrite: false,
    side: DoubleSide,
  });
  // Each basin's water surface, to follow the pool's level (`setWaterDrop`).
  const waters: Mesh[] = [];
  s.basins.forEach((b, k) => {
    const shape =
      b === span
        ? rect(
            new Shape(),
            -hx,
            hx,
            b.z - b.d / 2 - g.width,
            b.z + b.d / 2 + g.width,
          )
        : outline(new Shape(), k, g.width);
    if (b.shape === 'free')
      for (const i of b.islands)
        shape.holes.push(circle(new Path(), i.x, i.z, i.r - g.width));
    const water = add(
      new Mesh(
        new ShapeGeometry(shape, 64).rotateX(Math.PI / 2),
        waterMaterial.clone(),
      ),
      `${b.name} water`,
    );
    water.position.y = WATER_Y;
    water.renderOrder = 1;
    waters.push(water);
    rippleWater(water, uniforms);
    // A hot tub's water churns with its air.
    if (b.shape === 'round') {
      const mat = water.material as MeshPhysicalMaterial;
      mat.normalScale.set(2.2, 2.2);
      mat.opacity = 0.5;
    }
  });

  // Walls and roof: tiled to the tile line, bare concrete above, up to a
  // roof that is flat or slopes up to the south (`roofAt`).
  const concrete = boardMarkedConcrete(uniforms);
  const roofT = 0.35;
  const top = (z: number) => roofAt(s, z);
  const lowH = top(-hz);
  const highH = top(hz);
  const tiled = Math.min(s.tileTop, lowH);
  const bare = highH - tiled;
  // The north and south walls, each to its own height.
  // Each with its doorway, the corridors' section, through its tiles.
  const door = s.doorX ?? 0;
  const gap = CORRIDOR_SECTION.width / 2;
  const endWall = (z: number, height: number) => {
    const left = door - gap - (-hx - WALL);
    const right = hx + WALL - (door + gap);
    add(
      new Mesh(new BoxGeometry(left, tiled, WALL), tile),
      'wall',
    ).position.set(-hx - WALL + left / 2, tiled / 2, z);
    add(
      new Mesh(new BoxGeometry(right, tiled, WALL), tile),
      'wall',
    ).position.set(door + gap + right / 2, tiled / 2, z);
    const head = tiled - CORRIDOR_SECTION.height;
    add(
      new Mesh(new BoxGeometry(2 * gap, head, WALL), tile),
      'door head',
    ).position.set(door, CORRIDOR_SECTION.height + head / 2, z);
    const up = height + roofT - tiled;
    if (height > tiled)
      add(
        new Mesh(
          inMetres(new BoxGeometry(s.w + 2 * WALL, up, WALL), s.w, up),
          concrete,
        ),
        'wall concrete',
      ).position.set(0, tiled + up / 2, z);
  };
  endWall(-hz - WALL / 2, lowH);
  endWall(hz + WALL / 2, highH);
  // The east and west walls, drawn in their own plane (along z, up y)
  // and turned into place: their tops follow the roof, and the east, where
  // the sun comes from, has any high windows cut through it.
  const win = s.highWindows;
  const sideWall = (east: boolean, upper: boolean) => {
    const from = upper ? tiled : 0;
    const face = new Shape();
    face.moveTo(-hz, from);
    face.lineTo(hz, from);
    if (upper) {
      face.lineTo(hz, highH + roofT);
      face.lineTo(-hz, lowH + roofT);
    } else {
      face.lineTo(hz, tiled);
      face.lineTo(-hz, tiled);
    }
    face.closePath();
    // The west wall's lower part, cut for its plant room door.
    if (!upper && s.plantDoor && (s.plantDoor.wall === 'east') === east)
      face.holes.push(
        rect(
          new Path(),
          s.plantDoor.z - PLANT_DOORWAY / 2,
          s.plantDoor.z + PLANT_DOORWAY / 2,
          PLANT_SILL,
          PLANT_SILL + PLANT_DOOR_HEAD,
        ),
      );
    if (east && win)
      for (const z of win.at)
        if (win.from >= from && win.to <= (upper ? lowH : tiled))
          face.holes.push(
            rect(
              new Path(),
              z - win.width / 2,
              z + win.width / 2,
              win.from,
              win.to,
            ),
          );
    const geometry = new ExtrudeGeometry(face, {
      depth: WALL,
      bevelEnabled: false,
    })
      .rotateY(-Math.PI / 2)
      .translate(east ? hx + WALL : -hx, 0, 0);
    add(
      new Mesh(
        // ExtrudeGeometry already writes the shape's metre coordinates to
        // UV; multiplying by wall dimensions here made the map shimmer.
        upper ? inMetres(geometry, 1, 1) : geometry,
        upper ? concrete : tile,
      ),
      upper ? 'wall concrete' : 'wall',
    );
  };
  for (const east of [false, true]) {
    sideWall(east, false);
    if (bare > 0) sideWall(east, true);
  }
  // The roof: a slab laid in its own frame, along its slope from the north
  // wall, its skylights' wells cut through it and their glazing in it.
  const slope = s.roof ? (s.roof.pitch * Math.PI) / 180 : 0;
  const stretch = 1 / Math.cos(slope);
  const along = (z: number) => (z + hz) * stretch;
  const roofFrame = new Group();
  roofFrame.name = 'roof';
  roofFrame.position.set(0, lowH, -hz);
  roofFrame.rotation.x = -slope;
  group.add(roofFrame);
  const roofShape = rect(
    new Shape(),
    -hx - WALL,
    hx + WALL,
    -WALL * stretch,
    along(hz) + WALL * stretch,
  );
  for (const k of s.skylights)
    roofShape.holes.push(
      rect(
        new Path(),
        k.x - k.size / 2,
        k.x + k.size / 2,
        along(k.z) - (k.size / 2) * stretch,
        along(k.z) + (k.size / 2) * stretch,
      ),
    );
  const slab = new Mesh(
    inMetres(flat(roofShape, 0, roofT), 1, 1),
    bare > 0 ? concrete : tile,
  );
  slab.name = 'roof slab';
  roofFrame.add(slab);
  // The glazing, bright with the sky, the sun itself never seen.
  const skyGlass = new MeshBasicMaterial({
    color: '#f4f8ff',
    side: DoubleSide,
  });
  // Daylight: never dimmed with the power or the lights (`room-power.ts`).
  skyGlass.userData.daylight = true;
  const mullion = new MeshStandardMaterial({
    color: '#d9dcd8',
    metalness: 0.4,
    roughness: 0.4,
  });
  for (const k of s.skylights) {
    const depth = k.size * stretch;
    const pane = new Mesh(new PlaneGeometry(k.size, depth), skyGlass);
    pane.rotation.x = Math.PI / 2;
    pane.position.set(k.x, roofT - 0.02, along(k.z));
    roofFrame.add(pane);
    for (const [w, d] of [
      [k.size, 0.06],
      [0.06, depth],
    ]) {
      const bar = new Mesh(new BoxGeometry(w, 0.05, d), mullion);
      bar.position.set(k.x, roofT - 0.05, along(k.z));
      roofFrame.add(bar);
    }
  }
  if (win)
    for (const z of win.at) {
      const pane = new Mesh(
        new PlaneGeometry(win.width, win.to - win.from),
        skyGlass,
      );
      pane.rotation.y = -Math.PI / 2;
      pane.position.set(hx + WALL - 0.02, (win.from + win.to) / 2, z);
      group.add(pane);
      const bar = new Mesh(
        new BoxGeometry(0.05, win.to - win.from, 0.06),
        mullion,
      );
      bar.position.set(hx + WALL - 0.05, (win.from + win.to) / 2, z);
      group.add(bar);
    }
  // The sun: hard, low, shadow-casting, so the roof and walls keep it out
  // but for the skylights and windows; and its beams in the air.
  const toward = new Vector3(SUN.x, SUN.y, SUN.z);
  const reach = Math.hypot(s.w, s.d) * 0.6;
  const sun = new DirectionalLight('#fff3dc', 5.5);
  // Daylight: never switched with the lights (`room-lights.ts`).
  sun.userData.daylight = true;
  sun.position.copy(toward).multiplyScalar(reach * 1.5);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(s.w > 40 ? 4096 : 2048, s.w > 40 ? 4096 : 2048);
  Object.assign(sun.shadow.camera, {
    left: -reach * metre,
    right: reach * metre,
    top: reach * metre,
    bottom: -reach * metre,
    near: 0.5 * metre,
    far: reach * 3.2 * metre,
  });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02 * metre;
  // Only where it has a way in: a hall with no skylights or high windows
  // (the jacuzzi) has no sun at all.
  if (s.skylights.length || s.highWindows) group.add(sun, sun.target);
  for (const k of s.skylights)
    group.add(
      createLightShaft(
        { x: k.x, z: k.z, w: k.size, d: k.size },
        top(k.z),
        toward,
        '#fff1d2',
        0.16,
      ),
    );
  // Caustics strong in the sun, as in the ring pool.
  uniforms.caustics.value = 2.8;
  uniforms.reflected.value = 0.28;
  const box = { minX: -hx, maxX: hx, minZ: -hz, maxZ: hz, floorY: 0 };
  addBoxRoomCoves(group, tile, { ...box, height: tiled });
  // At each doorway's jambs, where the wall's fillet and the corridor's
  // meet round an outside corner, a fillet turned round the corner.
  for (const [z, starts] of [
    [-hz, [0, -Math.PI / 2]],
    [hz, [Math.PI / 2, Math.PI]],
  ] as const)
    starts.forEach((phi, i) => {
      const corner = createCornerFillet(tile, phi);
      corner.position.set(door + (i === 0 ? -gap : gap), 0, z);
      group.add(corner);
    });
  // The west wall's fillet stops either side of its plant room door.
  // Its doorway is raised on a sill over the cove, which runs on under it.
  if (s.plantDoor) {
    // A dark lobby beyond it, the plant room's own scene being separate.
    add(
      new Mesh(
        new BoxGeometry(0.05, PLANT_DOOR_HEAD, PLANT_DOORWAY),
        new MeshBasicMaterial({ color: '#0b0d0d' }),
      ),
      'plant door lobby',
    ).position.set(
      (s.plantDoor.wall === 'west' ? -1 : 1) * (hx + WALL + 0.6),
      PLANT_SILL + PLANT_DOOR_HEAD / 2,
      s.plantDoor.z,
    );
  }
  // The fillets along the north and south walls' feet stop at the doors.
  for (const [name, z, turnY] of [
    ['cove north wall', -hz, -Math.PI / 2],
    ['cove south wall', hz, Math.PI / 2],
  ] as const) {
    group.remove(group.getObjectByName(name)!);
    for (const [x0, x1] of [
      [-hx + COVE_RADIUS, door - gap],
      [door + gap, hx - COVE_RADIUS],
    ])
      add(
        new Mesh(
          coveStrip(x1 - x0)
            .rotateY(turnY)
            .translate((x0 + x1) / 2, 0, z),
          tile,
        ),
        name,
      );
  }
  if (span) {
    // The fillets along the east and west walls' feet stop at the channel.
    for (const name of ['cove west wall', 'cove east wall'])
      group.remove(group.getObjectByName(name)!);
    const n = span.z - span.d / 2 - g.width;
    const so = span.z + span.d / 2 + g.width;
    for (const [z0, z1] of [
      [-hz + COVE_RADIUS, n],
      [so, hz - COVE_RADIUS],
    ]) {
      const mid = (z0 + z1) / 2;
      add(
        new Mesh(coveStrip(z1 - z0).translate(-hx, 0, mid), tile),
        'cove west wall',
      );
      add(
        new Mesh(
          coveStrip(z1 - z0)
            .rotateY(Math.PI)
            .translate(hx, 0, mid),
          tile,
        ),
        'cove east wall',
      );
    }
  }
  // Arches: tiled walls across the hall up to the roof, each with a round
  // arch through it that the water and the deck run under; drawn in their
  // own plane (along z, up y) and turned into place.
  for (const a of s.arches ?? []) {
    const { left, right } = archSpan(a);
    const r = (right - left) / 2;
    const face = new Shape();
    face.moveTo(a.z0, 0);
    face.lineTo(left, 0);
    face.lineTo(left, a.spring);
    face.absarc(left + r, a.spring, r, Math.PI, 0, true);
    face.lineTo(right, 0);
    face.lineTo(a.z1, 0);
    face.lineTo(a.z1, top(a.z1));
    face.lineTo(a.z0, top(a.z0));
    face.closePath();
    add(
      new Mesh(
        new ExtrudeGeometry(face, {
          depth: a.thick,
          bevelEnabled: false,
          curveSegments: 48,
        })
          .rotateY(-Math.PI / 2)
          .translate(a.x + a.thick / 2, 0, 0),
        tile,
      ),
      'arch',
    );
  }
  // The columns: tiled, then bare concrete, coved at the deck.
  for (const c of s.columns) {
    const at = new Group();
    at.name = 'column';
    at.position.set(c.x, 0, c.z);
    group.add(at);
    // From the deck, or from the pool's floor where it stands in the water.
    const base = hallFloorAt(s, c.x, c.z);
    const shaft = new Mesh(
      new CylinderGeometry(c.r, c.r, tiled - base, 48, 1, true),
      tile,
    );
    shaft.position.y = (tiled + base) / 2;
    at.add(shaft);
    const rise = top(c.z) - tiled;
    if (rise > 0) {
      const upper = new Mesh(
        inMetres(
          new CylinderGeometry(c.r, c.r, rise, 48, 1, true),
          2 * Math.PI * c.r,
          rise,
        ),
        concrete,
      );
      upper.position.y = tiled + rise / 2;
      at.add(upper);
      addColumnTileTrim(at, tileTrimSteel(), c.r, tiled);
    }
    addColumnFootCove(at, tile, c.r, base);
  }
  if (bare > 0) {
    // Fillets up the corners to the roof, each to its own height.
    for (const [x, z, turn] of [
      [-hx, -hz, 0],
      [hx, -hz, -Math.PI / 2],
      [hx, hz, Math.PI],
      [-hx, hz, Math.PI / 2],
    ] as const) {
      const rise = top(z) - tiled;
      add(
        new Mesh(
          coveStrip(rise)
            .rotateX(Math.PI / 2)
            .rotateY(turn)
            .translate(x, tiled + rise / 2, z),
          concrete,
        ),
        'cove corner',
      );
    }
    addTileEdgeTrim(group, tileTrimSteel(), { ...box, height: highH }, tiled);
  }

  // The Olympic and jacuzzi halls use the same 3 m globe shade.
  const glow = new MeshStandardMaterial({
    color: '#fff6e8',
    emissive: '#ffe9c8',
    emissiveIntensity: 1.6,
  });
  // The hall's own lights, on its own lighting zone (`room-lights.ts`).
  const hallZone = zoneOfRoom(s.id);
  glow.userData.lightFitting = true;
  glow.userData.lightZone = hallZone;
  const body = new MeshStandardMaterial({
    color: '#3c4246',
    metalness: 0.5,
    roughness: 0.5,
  });
  const [cols, rows] =
    s.id === 'pool_03'
      ? [1, 1]
      : s.w > 40
        ? [4, 2]
        : s.w > 15
          ? [3, 2]
          : [2, 1];
  // Under a sloping roof they hang on longer wires, to the same height.
  const hang = s.h > 6 ? Math.min(lowH, 12) - 1.5 : s.h - 0.05;
  const power =
    (hang * hang * 0.5 * (s.w > 40 ? 1.6 : 1)) / (s.h > 6 ? 1 : 2.5);
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      const x = -hx + ((i + 0.5) * s.w) / cols;
      const z = rows === 1 ? 0 : -hz + ((j + 0.5) * s.d) / rows;
      const ceiling = top(z);
      const size = s.h > 6 ? 0.35 : 0.15;
      const globe = s.id === 'pool_02' || s.id === 'pool_03';
      if (globe) {
        const fixture = createMetalGlobeLight();
        fixture.position.set(x, hang, z);
        group.add(fixture);
      } else {
        const fitting = new Mesh(
          new CylinderGeometry(size, size * 1.15, 0.12, 32),
          body,
        );
        fitting.position.set(x, hang + 0.06, z);
        group.add(fitting);
        const lens = new Mesh(
          new CircleGeometry(size * 1.05, 32).rotateX(Math.PI / 2),
          glow,
        );
        lens.position.set(x, hang - 0.001, z);
        group.add(lens);
      }
      if (s.h > 6) {
        const bottom = hang + (globe ? 1.5 : 0.12);
        const wire = new Mesh(
          new CylinderGeometry(
            0.006,
            0.006,
            Math.max(0.01, ceiling - bottom),
            6,
          ),
          body,
        );
        wire.position.set(x, (ceiling + bottom) / 2, z);
        group.add(wire);
      }
      const light = new PointLight(
        '#ffe8c8',
        power * metre * metre,
        s.w * 1.2 * metre,
        2,
      );
      light.position.set(x, hang - 0.3, z);
      light.userData.lightZone = hallZone;
      // Not seen from under the water, where, casting no shadows, they
      // would shine through the deck into the gallery.
      if (!underwater) group.add(light);
    }

  // The underwater viewing gallery, under the north deck: a corridor of
  // the game's section, its south wall the pool's, windowed; its ends
  // closed until corridors join it; in the middle of its north wall, the
  // doorway to the engineer's office, a dark lobby beyond it until the
  // office is seen through it.
  if (gallery) {
    const office = galleryOfficeDoor(gallery);
    add(
      new Mesh(
        new BoxGeometry(office.opening, PLANT_DOOR_HEAD, 0.05),
        new MeshBasicMaterial({ color: '#0b0d0d' }),
      ),
      'office door lobby',
    ).position.set(
      office.x,
      gallery.floor + PLANT_SILL + PLANT_DOOR_HEAD / 2,
      office.line - office.wall - 0.6,
    );
    const corridor = createCorridor(s.w, dry, {
      // On its sill over the fillet, which runs on unbroken beneath it.
      doorways: [
        {
          at: office.x + hx,
          w: office.opening,
          h: PLANT_SILL + PLANT_DOOR_HEAD,
          sill: PLANT_SILL,
        },
      ],
      windows: {
        // The pool's side of the windowed wall is the pool's wall, wet.
        farFace: tile,
        at: gallery.windows.map((x) => x + hx),
        r: gallery.r,
        y: gallery.windowY - gallery.floor,
        thick: gallery.thick,
      },
    });
    corridor.position.set(-hx, gallery.floor, gallery.z);
    group.add(corridor);
    // Closed at its ends, but where the loop's corridors join it.
    if (loopRoom !== 'pool_02_gallery')
      for (const x of [-hx - WALL / 2, hx + WALL / 2])
        add(
          new Mesh(new BoxGeometry(WALL, 2.9, 1.6), dry),
          'gallery end',
        ).position.set(x, gallery.floor + 1.25, gallery.z);
    if (underwater) {
      // The water, seen from under it: a volume filling the pool.
      const b = s.basins[0] as RectBasin;
      const volume = new Mesh(
        new BoxGeometry(b.w - 0.02, b.deep - 0.02, b.d - 0.02),
        new MeshBasicMaterial({
          color: '#2fa3ad',
          transparent: true,
          opacity: 0.32,
          side: BackSide,
          depthWrite: false,
        }),
      );
      volume.name = 'underwater volume';
      volume.position.set(b.x, WATER_Y - b.deep / 2, b.z);
      group.add(volume);
      // Drained, the volume shrinks to the water left in the pool.
      underwaterVolume = { mesh: volume, deep: b.deep };
      // The sunlit water's caustics, thrown through each window onto the
      // wall facing it: there only, not on the window wall or round the
      // windows, which the light through them never reaches.
      for (const x of gallery.windows) {
        const patch = createCausticPatch(uniforms, 1.7, 1.3);
        patch.name = 'gallery caustics';
        patch.position.set(x, gallery.windowY - 0.25, gallery.z - 0.6 + 0.004);
        group.add(patch);
      }
      // Small floor drains down its middle, and small round lights in its
      // ceiling, in dry fittings: the corridor is a dry room.
      const dryFittings = fittingMaterials(kit);
      const downlight = new MeshStandardMaterial({
        color: '#fff6e8',
        emissive: '#fff1dc',
        emissiveIntensity: 1.5,
      });
      // The gallery is a corridor: its lights the corridors' zone.
      downlight.userData.lightFitting = true;
      downlight.userData.lightZone = 'corridors';
      const rim = new MeshStandardMaterial({
        color: '#c9cdcf',
        metalness: 0.8,
        roughness: 0.3,
      });
      for (let x = -hx + 2; x < hx - 1; x += 4) {
        if (Math.round((x + hx) / 4) % 2 === 0) {
          const drain = createDeckGully(ft, dryFittings);
          drain.position.set(x, gallery.floor + 0.002, gallery.z);
          group.add(drain);
        }
        const ring = new Mesh(new CylinderGeometry(0.09, 0.09, 0.02, 24), rim);
        ring.position.set(x, gallery.floor + 2.49, gallery.z);
        group.add(ring);
        const lens = new Mesh(
          new CircleGeometry(0.07, 24).rotateX(Math.PI / 2),
          downlight,
        );
        lens.position.set(x, gallery.floor + 2.479, gallery.z);
        group.add(lens);
      }
      // Keep each light source directly under one of the ceiling lenses.
      // Three sources cover the run without a point light for every fitting.
      for (const i of [3, 8, 13]) {
        const x = -hx + 2 + 4 * i;
        const lamp = new PointLight(
          '#d8f0ff',
          0.6 * metre * metre,
          14 * metre,
          2,
        );
        lamp.position.set(x, gallery.floor + 2.3, gallery.z);
        lamp.userData.lightZone = 'corridors';
        group.add(lamp);
      }
    }
  }

  // The loop's corridors from this room's way in and out (`pool-loop.ts`),
  // each with a lamp in its middle piece.
  if (loopRoom) {
    const { leaving, arriving } = roomCorridors(loopRoom);
    const panel = new MeshStandardMaterial({
      color: '#fff6e8',
      emissive: '#ffefd6',
      emissiveIntensity: 1.4,
    });
    // The loop's corridors: the corridors' zone.
    panel.userData.lightFitting = true;
    panel.userData.lightZone = 'corridors';
    for (const copy of [leaving, arriving]) {
      group.add(createCorridorRun(copy.placed, dry));
      for (const p of copy.placed) {
        // A lamp in each piece but the turns and the short straights.
        if (
          p.piece.kind === 'left' ||
          p.piece.kind === 'right' ||
          // The rotunda is lit by its own cove.
          p.piece.kind === 'rotunda' ||
          // Nor the short straights at the doors (1 m): unlit.
          (p.piece.kind === 'straight' && p.piece.length <= 1)
        )
          continue;
        const along = pieceLength(p.piece) / 2;
        const y = p.y + (p.piece.kind === 'stairs' ? p.piece.rise / 2 : 0);
        const x = p.x + Math.cos(p.yaw) * along;
        const z = p.z - Math.sin(p.yaw) * along;
        const lamp = new Mesh(new BoxGeometry(0.5, 0.03, 0.5), panel);
        lamp.position.set(x, y + 2.485, z);
        group.add(lamp);
        const light = new PointLight(
          '#ffe8c8',
          1.2 * metre * metre,
          8 * metre,
          2,
        );
        light.position.set(x, y + 2.3, z);
        light.userData.lightZone = 'corridors';
        group.add(light);
      }
    }
  }

  // The title card.
  const card = titleCard(s.ticket, s.title);
  // On the west wall, clear of the doors.
  card.position.set(-hx + 0.01, Math.min(2.2, s.h - 0.6), 0);
  card.rotation.y = Math.PI / 2;
  group.add(card);
  // Everything solid takes the sun's shadows and casts its own, but the
  // water, the glazing and the beams, which are light, not things.
  group.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const light =
      /water|glass|caustics/.test(o.name) ||
      o.material === skyGlass ||
      (o.material as { name?: string }).name === 'LightShaft';
    o.castShadow = !light;
    o.receiveShadow = !light;
  });
  /**
   * The water's surface `drop` metres below brimming (0 brimming, the
   * hall's deepest, `waterDepth`, empty): each basin's surface, the
   * shaders' waterline (the tiles' tint and caustics below it) and, from
   * the gallery, the water's volume. A basin's surface below its own floor
   * is hidden by the floor; at the bottom it goes.
   */
  // Empty is the bottom of the deepest well, if a basin has one.
  const empty = Math.max(
    deepest,
    ...s.basins.flatMap((b) =>
      ('wells' in b ? (b.wells ?? []) : []).map((w) => w.depth),
    ),
  );
  group.userData.waterDepth = empty;
  // How wet the hall is: 1 with water in it, fading to 0 over its last
  // 30 cm, for the light the water throws about (caustics, reflections).
  group.userData.waterWet = 1;
  group.userData.setWaterDrop = (drop: number) => {
    const d = Math.min(Math.max(drop, 0), empty);
    group.userData.waterWet = Math.min(1, Math.max(0, (empty - d) / 0.3));
    const y = WATER_Y - d;
    for (const water of waters) {
      water.position.y = y;
      water.visible = d < empty - 0.005;
    }
    uniforms.waterY.value = y;
    for (const f of floats) f.position.y = y - WATER_Y;
    if (underwaterVolume) {
      const { mesh, deep } = underwaterVolume;
      const left = Math.max(0.001, deep - d);
      mesh.scale.y = left / deep;
      mesh.position.y = WATER_Y - deep + left / 2;
      mesh.visible = d < deep - 0.005;
    }
  };
  return group;
}

function canvasCard(
  w: number,
  h: number,
  draw: (c: CanvasRenderingContext2D, cw: number, ch: number) => void,
) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = Math.round((512 * h) / w);
  const c = canvas.getContext('2d')!;
  draw(c, canvas.width, canvas.height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return new Mesh(
    new PlaneGeometry(w, h),
    // Printed: lit as any surface is, dark in the dark.
    new MeshStandardMaterial({
      map: texture,
      transparent: true,
      roughness: 0.85,
    }),
  );
}

function titleCard(ticket: string, title: string) {
  return canvasCard(1.8, 0.5, (c, w, h) => {
    c.fillStyle = '#f4f6f2';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#5d7a7e';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `bold ${h * 0.24}px Arial, Helvetica, sans-serif`;
    c.fillText(ticket, w / 2, h * 0.36);
    c.font = `${h * 0.2}px Arial, Helvetica, sans-serif`;
    c.fillText(title.toUpperCase(), w / 2, h * 0.7);
  });
}

function laneNumber(lane: number) {
  return canvasCard(0.4, 0.3, (c, w, h) => {
    c.fillStyle = '#1d2b4a';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `bold ${h * 0.8}px Arial, Helvetica, sans-serif`;
    c.fillText(String(lane), w / 2, h * 0.55);
  });
}
