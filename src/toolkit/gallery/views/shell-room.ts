import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
} from 'three';
import type { Material, Object3D } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createServiceCeiling } from '../../components/site-dressing/views/service-ceiling';
import { createIndustrialAccess } from '../../components/architectural/views/industrial-access';
import {
  addConcreteLintel,
  CONCRETE_LINTEL,
} from '../../components/architectural/views/concrete-lintel';
import {
  addWallBatten,
  createWallBattenMaterials,
} from '../../../scene/wall-batten';
import {
  EQUIPMENT_DOORS,
  equipmentDoors,
} from '../../components/architectural/parts/equipment-doors';
import type { EquipmentDoorsPart } from '../../components/architectural/parts/equipment-doors';
import {
  PLANT_DOOR_OPENING,
  plantRoomDoor,
} from '../../components/architectural/parts/plant-door';
import type { DoorWarningSelection } from '../../components/architectural/logic/door-warnings';
import {
  createBreezeBlockTextures,
  mapBlockwork,
} from '../../../scene/breeze-block-texture';
import { createWarehouseConcreteFloor } from '../../../scene/warehouse-concrete-floor';
import { slabAround } from '../logic/slab-openings';
import { computed } from '@preact/signals-core';
import {
  callPoint,
  sounderBeacon,
} from '../../components/fire/parts/fire-parts';
import type { Part } from '../../components/core/parts/parts';
import { roomWorld } from '../../save/world-store';
import { zoneInAlarm } from '../../../game/plant/fire-alarm';
import { wetHallBox } from '../logic/room-equipment';
import { PIT_RAIL } from '../../components/plant/views/backwash-pit';
import { createExtinguisher } from '../../components/fire/views/fire-fittings';
import { createFireActionNotice } from '../../components/general-safety/views/safety-notices';
import { createSafetySign } from '../../components/general-safety/views/safety-signs';
import { createCanvasTexture } from '../../components/core/views/screens';
import { createFloorGully } from '../../components/plant/views/floor-gully';
import { controlBus } from '../logic/control-bus';
import { roomStructure } from '../logic/room-structure';
import type { Rect } from '../logic/slab-openings';
import { createPs1Material } from '../../components/core/parts/ps1-material';
import {
  SHELL_WALL,
  shellDoorPlace,
  shellOpening,
  shellWallPieces,
  WET_HALL,
  WET_HALL_DOORS,
  wetHallEntrances,
  wetHallFloorAt,
  wetHallRampRails,
  wetHallRamp,
  WET_HALL_LAYOUT,
  wetHallPartition,
} from '../logic/shell-rooms';
import type { ShellDoor, ShellWall, ShellAperture } from '../logic/shell-rooms';
import type { Footprint } from '../../controls/logic/walk-collision';
import { DEV_ROOM_NAMES } from '../logic/dev-room-links';
import type { RoomId } from '../logic/dev-room-links';

/** Which warnings a room's doors carry, by what is behind them. */
export function warningsFor(room: string): DoorWarningSelection {
  if (room === 'boiler_house') return 'furnace';
  if (room === 'hypo_store' || room === 'acid_store') return 'chemical';
  if (room === 'switch_room') return 'electrical';
  if (room === 'air_plant') return 'noisy-plant';
  if (room === 'control_room' || room === 'engineers_office')
    return ['authorised'];
  return 'plant';
}

/**
 * A single leaf where a pair would not fit the room beyond: the plant room
 * door's doorset (`plant-door.ts`), pulled open from in here as the pairs
 * are, its nameplate the room beyond's name, its card reader on this side;
 * worked as a pair is.
 */
function singleDoor(kit: PanelKit, to: RoomId): EquipmentDoorsPart {
  const door = plantRoomDoor(kit, [], signTo(to).replace(/^.* · /, ''));
  return {
    ...door,
    open: () => door.angle() > 0.05,
    showLeaves: (on) => door.showLeaf(on),
    readers: [door.reader],
  };
}

/** What a door's sign says: the room beyond's name. */
export function signTo(room: RoomId) {
  const title = DEV_ROOM_NAMES[room] ?? room.toUpperCase();
  return title.replace(/^WET HALL · .*/, 'WET HALL');
}

export interface ShellView {
  /** The room's inside, metres, and its doors. */
  w: number;
  d: number;
  doors: readonly ShellDoor[];
  /** Openings with no door in them (the loading dock's, prompt 073). */
  apertures?: readonly ShellAperture[];
  /** Its floor's level, and its roof's, over the doors' level (0). */
  floor: number;
  roof: number;
  /** Its title card: name, and what it is for; none if `title` is null. */
  title: string | null;
  note: string;
  seed: number;
  /** Plain offices and listening rooms have no exposed overhead services. */
  services?: boolean;
  /** Openings in its floor slab, for what goes down through it (a pit). */
  floorHoles?: readonly Rect[];
  /**
   * Where a partition meets its walls, or a conduit rises up them, each
   * along its wall: no wall batten is hung across one.
   */
  partitionsMeet?: readonly { wall: ShellWall; at: number }[];
}

/**
 * An empty room of the main plant (`logic/shell-rooms.ts`), in the plant
 * rooms' style: painted blockwork walls with a green dado, a concrete
 * floor, LED battens, a generated services ceiling under its roof, its
 * title card on the wall facing its first door, and in each doorway a
 * pair of the standard equipment doors (`equipment-doors.ts`), pulled
 * open from in here, the name of the room beyond over each. Metres, the
 * doors' level at y = 0.
 */
export function createShellRoom(metre: number, kit: PanelKit, v: ShellView) {
  const group = new Group();
  group.scale.setScalar(metre);
  const paint = (color: string, roughness = 0.85, metalness = 0) => {
    const m = new MeshStandardMaterial({ color, roughness, metalness });
    kit.materials.push(m);
    return m;
  };
  const blocks = createBreezeBlockTextures();
  kit.textures.push(blocks.map, blocks.normalMap, blocks.roughnessMap);
  const block = createPs1Material({
    map: blocks.map,
    normalMap: blocks.normalMap,
    roughnessMap: blocks.roughnessMap,
    roughness: 1,
  });
  kit.materials.push(block);
  const dado = paint('#6d7a6f');
  const concrete = createWarehouseConcreteFloor(Math.max(v.w, v.d));
  kit.materials.push(concrete);
  if (concrete.map) kit.textures.push(concrete.map);
  const dark = paint('#0b0d0d', 1);
  const box = (
    m: Material,
    sx: number,
    sy: number,
    sz: number,
    x: number,
    y: number,
    z: number,
    parent: Object3D = group,
  ) => {
    const mesh = new Mesh(new BoxGeometry(sx, sy, sz), m);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  /** A box of blockwork, its courses 0.4 m tall at any size. */
  const wallBox = (
    sx: number,
    sy: number,
    sz: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const geometry = new BoxGeometry(sx, sy, sz);
    // Its blockwork on the room's one grid (`mapBlockwork`), so the pieces
    // round a doorway and over it line up.
    mapBlockwork(geometry, [x, y, z], v.floor);
    const mesh = new Mesh(geometry, block);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  const t = SHELL_WALL;
  const hw = v.w / 2;
  const hd = v.d / 2;
  const openingH = EQUIPMENT_DOORS.h + 2 * EQUIPMENT_DOORS.frame;
  /** A doorway's head: a pair's, or a single leaf's. */
  const headOf = (d: ShellDoor) =>
    d.kind === 'single' ? PLANT_DOOR_OPENING.h : openingH;
  // The floor, and the roof.
  // Round any openings in it (`slabAround`).
  for (const p of slabAround(v.w, v.d, v.floorHoles ?? []))
    box(
      concrete,
      p.maxX - p.minX,
      0.1,
      p.maxZ - p.minZ,
      (p.minX + p.maxX) / 2,
      v.floor - 0.05,
      (p.minZ + p.maxZ) / 2,
    );
  wallBox(v.w + 2 * t, 0.3, v.d + 2 * t, 0, v.roof + 0.15, 0);
  // The walls, round their doorways, a header over each (and where the
  // floor is below the doors', the wall under each doorway); the dado.
  const lines: Record<
    ShellWall,
    { at: number; alongX: boolean; sign: number }
  > = {
    north: { at: -hd - t / 2, alongX: true, sign: 1 },
    south: { at: hd + t / 2, alongX: true, sign: -1 },
    west: { at: -hw - t / 2, alongX: false, sign: 1 },
    east: { at: hw + t / 2, alongX: false, sign: -1 },
  };
  for (const wall of ['north', 'east', 'south', 'west'] as const) {
    const { at, alongX, sign } = lines[wall];
    const face = at + sign * (t / 2 + 0.005);
    const span = (
      a: number,
      b: number,
      y0: number,
      y1: number,
      m?: Material,
      depth: number = t,
      line = at,
    ) =>
      m
        ? alongX
          ? box(m, b - a, y1 - y0, depth, (a + b) / 2, (y0 + y1) / 2, line)
          : box(m, depth, y1 - y0, b - a, line, (y0 + y1) / 2, (a + b) / 2)
        : alongX
          ? wallBox(b - a, y1 - y0, depth, (a + b) / 2, (y0 + y1) / 2, line)
          : wallBox(depth, y1 - y0, b - a, line, (y0 + y1) / 2, (a + b) / 2);
    const half = alongX ? hw : hd;
    for (const [a, b] of shellWallPieces(v, wall)) {
      span(a, b, v.floor, v.roof);
      span(
        Math.max(a, -half),
        Math.min(b, half),
        v.floor,
        v.floor + 1.2,
        dado,
        0.01,
        face,
      );
    }
    // Over each opening with no door, its lintel and the wall above.
    for (const o of (v.apertures ?? []).filter((o) => o.wall === wall)) {
      span(
        o.at - o.w / 2,
        o.at + o.w / 2,
        o.h + CONCRETE_LINTEL.height,
        v.roof,
      );
      addConcreteLintel(
        group,
        kit,
        o.w,
        t,
        alongX ? o.at : at,
        o.h,
        alongX ? at : o.at,
        alongX,
      );
    }
    for (const d of v.doors.filter((d) => d.wall === wall)) {
      const a = d.at - shellOpening(d) / 2;
      const b = d.at + shellOpening(d) / 2;
      span(a, b, headOf(d) + CONCRETE_LINTEL.height, v.roof);
      addConcreteLintel(
        group,
        kit,
        shellOpening(d),
        t,
        alongX ? d.at : at,
        headOf(d),
        alongX ? at : d.at,
        alongX,
      );
      if (v.floor < 0) {
        span(a, b, v.floor, 0);
        span(a, b, v.floor, v.floor + 1.2, dado, 0.01, face);
      }
    }
  }

  // The doors: pulled open from in here, its pull side (+z) facing the
  // room; beyond each, a dark lobby until the room there is seen; over
  // each, on this side, the name of the room beyond.
  const doors = v.doors.map((door) => {
    const p = shellDoorPlace(v, door);
    const yaw = Math.atan2(p.into[0], p.into[1]);
    const part =
      door.kind === 'single'
        ? singleDoor(kit, door.to)
        : equipmentDoors(kit, signTo(door.to), warningsFor(door.to));
    part.object.position.set(p.inner.x, 0, p.inner.z);
    part.object.rotation.y = yaw;
    group.add(part.object);
    const lobby = new Group();
    lobby.position.set(p.outer.x, 0, p.outer.z);
    lobby.rotation.y = yaw;
    group.add(lobby);
    const h = headOf(door);
    box(dark, shellOpening(door), h, 0.05, 0, h / 2, -0.9, lobby);
    const sign = card(1.8, 0.24, [signTo(door.to)]);
    sign.position.set(
      p.inner.x + p.into[0] * 0.01,
      h + 0.35,
      p.inner.z + p.into[1] * 0.01,
    );
    sign.rotation.y = yaw;
    group.add(sign);
    return { door, part, lobby };
  });

  // The title card, on the wall facing its first door, at eye height.
  // With no doors, on the north wall.
  const first = v.doors[0] ?? { wall: 'south' };
  const facing: ShellWall =
    first.wall === 'south'
      ? 'north'
      : first.wall === 'north'
        ? 'south'
        : first.wall === 'east'
          ? 'west'
          : 'east';
  const title = card(2.4, 0.6, [
    v.title ?? '',
    `${v.w + 2 * t} × ${v.d + 2 * t} m · ${v.note}`,
  ]);
  // Beside the door there, if that wall has one in its middle.
  const besideDoor = v.doors.some(
    (d) => d.wall === facing && Math.abs(d.at) < 2.5,
  );
  const titleAt = shellDoorPlace(v, { wall: facing, at: besideDoor ? 4 : 0 });
  title.position.set(
    titleAt.inner.x + titleAt.into[0] * 0.01,
    Math.max(v.floor + 1.8, 1.8),
    titleAt.inner.z + titleAt.into[1] * 0.01,
  );
  title.rotation.y = Math.atan2(titleAt.into[0], titleAt.into[1]);
  if (v.title !== null) group.add(title);

  // Light: LED battens round the walls, clear of the doors; a point light
  // for every 10 m or so of the room's length, at most three.
  const battens = createWallBattenMaterials();
  kit.materials.push(...Object.values(battens));
  const y = v.floor + 3.1;
  const clear = (wall: ShellWall, s: number) =>
    !v.doors.some((d) => d.wall === wall && Math.abs(d.at - s) < 1.6) &&
    // Half a batten and a partition's half thickness, and a little more.
    !v.partitionsMeet?.some(
      (p) => p.wall === wall && Math.abs(p.at - s) < 1.0,
    ) &&
    !(wall === facing && Math.abs(s - (besideDoor ? 4 : 0)) < 1.6);
  for (const wall of ['north', 'south'] as const) {
    // A wall with openings: one batten over each opening, and no others
    // (the owner, 2026-10-26).
    const over = (v.apertures ?? []).filter((o) => o.wall === wall);
    if (over.length) {
      for (const o of over) {
        const z = wall === 'north' ? -hd + 0.05 : hd - 0.05;
        // Over the shutter's barrel box, which rolls up over the lintel.
        const oy = v.floor + o.h + 1.25;
        addWallBatten(
          group,
          battens,
          o.at,
          oy,
          z,
          'x',
          wall === 'north' ? 1 : -1,
        );
      }
      continue;
    }
    const n = Math.max(1, Math.round(v.w / 5));
    for (let i = 0; i < n; i++) {
      const s = -hw + ((i + 0.5) * v.w) / n;
      if (!clear(wall, s)) continue;
      const z = wall === 'north' ? -hd + 0.05 : hd - 0.05;
      addWallBatten(group, battens, s, y, z, 'x', wall === 'north' ? 1 : -1);
    }
  }
  for (const wall of ['west', 'east'] as const) {
    const n = Math.max(1, Math.round(v.d / 5));
    for (let i = 0; i < n; i++) {
      const s = -hd + ((i + 0.5) * v.d) / n;
      if (!clear(wall, s)) continue;
      const x = wall === 'west' ? -hw + 0.05 : hw - 0.05;
      addWallBatten(group, battens, x, y, s, 'z', wall === 'west' ? 1 : -1);
    }
  }
  const long = Math.max(v.w, v.d);
  const lights = Math.min(3, Math.max(1, Math.round(long / 10)));
  for (let i = 0; i < lights; i++) {
    const s = -long / 2 + ((i + 0.5) * long) / lights;
    const light = new PointLight(
      '#f2f4ee',
      (long > 12 ? 6 : 3) * metre * metre,
      (Math.min(v.w, v.d) + 10) * metre,
      2,
    );
    light.position.set(v.w >= v.d ? s : 0, y - 0.3, v.w >= v.d ? 0 : s);
    group.add(light);
  }
  // Overhead, under the roof, a generated services ceiling.
  if (v.services !== false)
    group.add(
      createServiceCeiling(
        { minX: -hw, maxX: hw, minZ: -hd, maxZ: hd, deckY: v.roof },
        { seed: v.seed, density: 0.85 },
      ).group,
    );

  function card(cw: number, ch: number, text: string[]) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = Math.round((512 * ch) / cw);
    const c = canvas.getContext('2d');
    if (c) {
      c.fillStyle = '#f4f2ea';
      c.fillRect(0, 0, canvas.width, canvas.height);
      c.fillStyle = '#16191a';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const rows = text.length;
      text.forEach((line, i) => {
        const size = i === 0 ? 0.42 / rows + 0.08 : 0.16;
        c.font = `${i === 0 ? 'bold ' : ''}${canvas.height * size}px Arial, Helvetica, sans-serif`;
        c.fillText(
          line,
          canvas.width / 2,
          canvas.height * (rows === 1 ? 0.54 : i === 0 ? 0.4 : 0.74),
          canvas.width * 0.92,
        );
      });
    }
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    kit.textures.push(map);
    // Printed: lit as any surface is, dark in the dark.
    const material = new MeshStandardMaterial({ map, roughness: 0.85 });
    kit.materials.push(material);
    return new Mesh(new PlaneGeometry(cw, ch), material);
  }
  return {
    group,
    doors: doors as {
      door: ShellDoor;
      part: EquipmentDoorsPart;
      lobby: Group;
    }[],
    box,
    paint,
    /** A box of the room's blockwork, on its one grid. */
    wallBox,
    /** Its wall battens' materials, and their height over its floor. */
    battens,
    battenY: y,
    /** A printed card: a sign's plate, with its lines. */
    card,
  };
}

/**
 * The wet hall's shell, and in it its entrances: a steel landing inside
 * each stair door at the corridor's level, its stair of rubber-clad
 * treads with yellow nosings down into the hall; inside the west door,
 * the trolley ramp's landing, its two flights of grooved concrete and the
 * turning landing between them; yellow guard rails on every open edge.
 */
export function createWetHall(metre: number, kit: PanelKit) {
  const inside = WET_HALL.side - 2 * SHELL_WALL;
  const shell = createShellRoom(metre, kit, {
    w: inside,
    d: inside,
    doors: WET_HALL_DOORS,
    floor: -WET_HALL.drop,
    roof: WET_HALL.roof,
    title: 'WET HALL · MAIN PLANT ROOM',
    note: 'make-up water, backwash; half a storey down',
    seed: 53,
    // The backwash pit's opening (prompt 036).
    floorHoles: [WET_HALL_LAYOUT.pit],
    // The make-up bay's partition meets its north and east walls; and
    // the control bus's conduits and riser rise past the battens' height.
    partitionsMeet: [
      ...busCrossings('wet_hall', 3.1),
      {
        wall: 'north',
        at: WET_HALL_LAYOUT.bay.minX - WET_HALL_LAYOUT.partition.thickness / 2,
      },
      {
        wall: 'east',
        at: WET_HALL_LAYOUT.bay.maxZ + WET_HALL_LAYOUT.partition.thickness / 2,
      },
    ],
  });
  const { group, box, paint } = shell;
  const galv = paint('#a9aeae', 0.45, 0.6);
  const yellow = paint('#e3b51f', 0.5);
  const rubber = paint('#2b2e2f', 0.92);
  const ramp = paint('#8b8e88', 0.8);
  const S = WET_HALL.stair;
  for (const e of wetHallEntrances()) {
    // Built as the north entrance, turned to its wall.
    const turned = new Group();
    turned.rotation.y = {
      north: 0,
      east: -Math.PI / 2,
      south: Math.PI,
      west: Math.PI / 2,
    }[e.wall];
    group.add(turned);
    const L = WET_HALL.landing;
    const z0 = -inside / 2;
    const access = createIndustrialAccess({
      deck: rubber,
      steel: galv,
      rail: yellow,
      nosing: yellow,
    });
    access.deck({
      x: 0,
      z: z0 + L.depth / 2,
      width: L.width,
      depth: L.depth,
      topY: 0,
      supportBottom: -WET_HALL.drop,
    });
    access.stair({
      x: 0,
      z: e.stair.top,
      topY: 0,
      bottomY: -WET_HALL.drop,
      width: S.width,
      run: e.stair.bottom - e.stair.top,
      steps: S.risers,
      treads: S.risers - 1,
      direction: 'south',
      openSideEnd: 0.6,
    });
    for (const side of [-1, 1]) {
      const x = (side * L.width) / 2;
      access.rail({ from: [x, 0, z0], to: [x, 0, e.stair.top] });
      access.rail({
        from: [(side * S.width) / 2, 0, e.stair.top],
        to: [x, 0, e.stair.top],
      });
    }
    turned.add(access.group);
  }
  // The trolley ramp: concrete flights and landings on a solid base.
  const r = wetHallRamp();
  const slab = (
    f: { minX: number; maxX: number; minZ: number; maxZ: number },
    y: number,
  ) =>
    box(
      ramp,
      f.maxX - f.minX,
      y + WET_HALL.drop,
      f.maxZ - f.minZ,
      (f.minX + f.maxX) / 2,
      (y - WET_HALL.drop) / 2,
      (f.minZ + f.maxZ) / 2,
    );
  slab(r.top, r.top.y);
  slab(r.turn, r.turn.y);
  for (const f of [r.first, r.second]) {
    // Its sloping deck, and under it a stepped base down to the floor.
    const length = Math.abs(f.z1 - f.z0);
    const fall = f.y0 - f.y1;
    const deck = box(
      ramp,
      f.maxX - f.minX,
      0.12,
      Math.hypot(length, fall),
      (f.minX + f.maxX) / 2,
      (f.y0 + f.y1) / 2 - 0.06,
      (f.z0 + f.z1) / 2,
    );
    deck.rotation.x = Math.atan2(fall, f.z1 - f.z0);
    const steps = Math.ceil(length / 0.25);
    for (let i = 0; i < steps; i++) {
      const a = f.z0 + ((f.z1 - f.z0) * i) / steps;
      const b = f.z0 + ((f.z1 - f.z0) * (i + 1)) / steps;
      const top =
        Math.min(
          f.y0 + ((f.y1 - f.y0) * (i + 1)) / steps,
          f.y0 + ((f.y1 - f.y0) * i) / steps,
        ) - 0.03;
      if (top <= -WET_HALL.drop) continue;
      box(
        ramp,
        f.maxX - f.minX - 0.02,
        top + WET_HALL.drop,
        Math.abs(b - a),
        (f.minX + f.maxX) / 2,
        (top - WET_HALL.drop) / 2,
        (a + b) / 2,
      );
    }
  }
  // Guard rails on every open edge: a top rail at 1.1 m, a knee rail,
  // posts; each sloping as the surface beside it does.
  const surface = (x: number, z: number) =>
    Math.max(
      ...[
        [0.12, 0],
        [-0.12, 0],
        [0, 0.12],
        [0, -0.12],
      ].map(([dx, dz]) => wetHallFloorAt(x + dx, z + dz)),
    );
  for (const f of wetHallRampRails()) guardAlong(f);
  function guardAlong(f: Footprint) {
    const alongX = f.maxX - f.minX > f.maxZ - f.minZ;
    const x = (f.minX + f.maxX) / 2;
    const z = (f.minZ + f.maxZ) / 2;
    const ends = alongX
      ? [
          [f.minX, z],
          [f.maxX, z],
        ]
      : [
          [x, f.minZ],
          [x, f.maxZ],
        ];
    const n = Math.max(
      1,
      Math.round(Math.hypot(f.maxX - f.minX, f.maxZ - f.minZ) / 1.2),
    );
    for (const up of [1.1, 0.55])
      for (let i = 0; i < n; i++) {
        const a = i / n;
        const b = (i + 1) / n;
        const p = [
          ends[0][0] + (ends[1][0] - ends[0][0]) * a,
          ends[0][1] + (ends[1][1] - ends[0][1]) * a,
        ];
        const q = [
          ends[0][0] + (ends[1][0] - ends[0][0]) * b,
          ends[0][1] + (ends[1][1] - ends[0][1]) * b,
        ];
        const yp = surface(p[0], p[1]) + up;
        const yq = surface(q[0], q[1]) + up;
        const len = Math.hypot(q[0] - p[0], yq - yp, q[1] - p[1]);
        // Turned to its far end while detached, so in the group's own units.
        const bar = new Mesh(new BoxGeometry(0.04, 0.04, len), yellow);
        bar.position.set((p[0] + q[0]) / 2, (yp + yq) / 2, (p[1] + q[1]) / 2);
        bar.lookAt(q[0], yq, q[1]);
        group.add(bar);
      }
    for (let i = 0; i <= n; i++) {
      const px = ends[0][0] + ((ends[1][0] - ends[0][0]) * i) / n;
      const pz = ends[0][1] + ((ends[1][1] - ends[0][1]) * i) / n;
      const y = surface(px, pz);
      box(yellow, 0.045, 1.1, 0.045, px, y + 0.55, pz);
    }
  }
  // The protected make-up bay's partition (prompt 036; the owner,
  // 2026-10-26): the hall's own breeze block, as thick as its walls, a
  // green dado both sides, its doors' opening (the standard pair, hung
  // by `wetHallBayDoors`) and the blockwork carried over it; LED battens
  // on both faces at the hall's height, fed along galvanised trunking just
  // above them.
  const L = WET_HALL_LAYOUT;
  const floorY = -WET_HALL.drop;
  const H = L.partition.height;
  const dadoPaint = paint('#6d7a6f', 0.85);
  const trunking = paint('#b9bdbc', 0.45, 0.6);
  const { wallBox, battens, battenY } = shell;
  for (const f of wetHallPartition()) {
    const w = f.maxX - f.minX;
    const d = f.maxZ - f.minZ;
    const x = (f.minX + f.minX + w) / 2;
    const z = (f.minZ + f.minZ + d) / 2;
    wallBox(w, H, d, x, floorY + H / 2, z);
    box(dadoPaint, w + 0.01, 1.2, d + 0.01, x, floorY + 0.6, z);
  }
  {
    const t = L.partition.thickness;
    const z = L.bay.maxZ + t / 2;
    const dw = L.door.maxX - L.door.minX;
    const dx = (L.door.minX + L.door.maxX) / 2;
    wallBox(dw, H - L.door.height, t, dx, floorY + (L.door.height + H) / 2, z);
  }
  {
    // The make-up bay's two connections through the north wall: a sleeve
    // each, its pipe's way through, and a plate naming it (the owner,
    // 2026-10-26: where the town main comes in, and where the boosted
    // make-up goes out to the pool plant rooms).
    const R = WET_HALL.side / 2 - SHELL_WALL;
    const sleeve = paint('#8d9392', 0.45, 0.6);
    const plate = (text: string, x: number, y: number) => {
      const c = shell.card(1.3, 0.2, [text]);
      c.position.set(x, floorY + y, -R + 0.006);
      group.add(c);
    };
    const { townMainIn: tin, makeUpMainOut: out, backwashMainIn: bin } = L;
    for (const [x, y, d] of [
      [tin.x, tin.y, 0.1],
      [out.x, out.y, 0.1],
      [bin.x, bin.y, 0.16],
    ] as const) {
      const ring = new Mesh(new CylinderGeometry(d, d, 0.06, 20), sleeve);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, floorY + y, -R + 0.03);
      group.add(ring);
    }
    // Each main's stub out of its sleeve: a short flanged length of it,
    // for the plumber to join (the owner, 2026-10-26: the outside world's
    // services come in by the north wall).
    const steel = paint('#5f6b73', 0.45, 0.5);
    for (const [x, y, r] of [
      [tin.x, tin.y, 0.04],
      [out.x, out.y, 0.045],
      [bin.x, bin.y, 0.08],
    ] as const) {
      const stub = new Mesh(new CylinderGeometry(r, r, 0.35, 16), steel);
      stub.rotation.x = Math.PI / 2;
      stub.position.set(x, floorY + y, -R + 0.175);
      group.add(stub);
      const flange = new Mesh(
        new CylinderGeometry(r * 2, r * 2, 0.02, 16),
        steel,
      );
      flange.rotation.x = Math.PI / 2;
      flange.position.set(x, floorY + y, -R + 0.36);
      group.add(flange);
    }
    plate('TOWN MAIN IN', tin.x, tin.y + 0.3);
    plate('MAKE-UP MAIN TO POOL PLANT ROOMS', out.x, out.y + 0.3);
    plate('BACKWASH MAIN FROM POOL PLANT ROOMS', bin.x, bin.y + 0.35);
    // The foul sewer's connection in the floor, east of the pit: a
    // gully's cover with the pipe's sleeve in its middle, its name on the
    // floor beside it.
    {
      const s = L.sewerDrop;
      const ring = new Mesh(new CylinderGeometry(0.09, 0.09, 0.03, 20), sleeve);
      ring.position.set(s.x, floorY + 0.018, s.z);
      group.add(ring);
      const cover = new Mesh(
        new BoxGeometry(0.45, 0.012, 0.45),
        paint('#3b3e40', 0.6, 0.5),
      );
      // Centred on the pipe's drop, the pipe through its middle (the
      // owner, 2026-10-26: in line with the pipe).
      cover.position.set(s.x, floorY + 0.006, s.z);
      group.add(cover);
      const name = shell.card(0.7, 0.12, ['FOUL SEWER']);
      name.rotation.x = -Math.PI / 2;
      name.position.set(s.x, floorY + 0.004, s.z + 0.42);
      group.add(name);
    }
  }
  // Its safety (the owner, 2026-10-26): keep-clear hatching on the
  // floor where nothing may be stood (the ramp's and stair's feet, either
  // side of the bay's doors, before the pit's gate), yellow walkway lines
  // along the aisle; fire points by its ways out; signs.
  {
    const R = WET_HALL.side / 2 - SHELL_WALL;
    const hatchArt = createCanvasTexture(128, 128);
    {
      const c = hatchArt.context;
      c.fillStyle = '#e3b51f';
      c.fillRect(0, 0, 128, 128);
      c.strokeStyle = '#151515';
      c.lineWidth = 22;
      for (let k = -128; k < 256; k += 64) {
        c.beginPath();
        c.moveTo(k, 128);
        c.lineTo(k + 128, 0);
        c.stroke();
      }
      hatchArt.texture.wrapS = hatchArt.texture.wrapT = RepeatWrapping;
      hatchArt.texture.needsUpdate = true;
      kit.textures.push(hatchArt.texture);
    }
    const hatched = (f: {
      minX: number;
      maxX: number;
      minZ: number;
      maxZ: number;
    }) => {
      const w = f.maxX - f.minX;
      const d = f.maxZ - f.minZ;
      const texture = hatchArt.texture.clone();
      texture.repeat.set(w / 0.5, d / 0.5);
      texture.needsUpdate = true;
      kit.textures.push(texture);
      const m = new MeshStandardMaterial({ map: texture, roughness: 0.8 });
      kit.materials.push(m);
      const mesh = new Mesh(new PlaneGeometry(w, d), m);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(
        (f.minX + f.maxX) / 2,
        floorY + 0.003,
        (f.minZ + f.maxZ) / 2,
      );
      mesh.name = 'Keep clear: hatched floor marking';
      group.add(mesh);
    };
    for (const k of wetHallBox().keepClear) hatched(k);
    const t = L.partition.thickness;
    hatched({
      minX: L.door.minX,
      maxX: L.door.maxX,
      minZ: L.bay.maxZ + t,
      maxZ: L.bay.maxZ + t + 1.2,
    });
    hatched({
      minX: L.door.minX,
      maxX: L.door.maxX,
      minZ: L.bay.maxZ - 1.2,
      maxZ: L.bay.maxZ,
    });
    // Before the pit's gate, outside its rail on the east by the hatch.
    const pitZ = (L.pit.minZ + L.pit.maxZ) / 2;
    const railX = L.pit.maxX + L.pitWall + PIT_RAIL.off;
    const railZ = L.pit.minZ - L.pitWall - PIT_RAIL.off;
    hatched({
      minX: railX + 0.05,
      maxX: railX + 1.0,
      minZ: pitZ + PIT_RAIL.gate.at - PIT_RAIL.gate.width / 2,
      maxZ: pitZ + PIT_RAIL.gate.at + PIT_RAIL.gate.width / 2,
    });
    // The aisle's walkway lines, from the stair's foot to the ramp's.
    const yellow = paint('#e3b51f', 0.6);
    for (const z of [L.bay.maxZ + t + 1.3, railZ - 1.1])
      box(yellow, 12.4, 0.004, 0.08, -0.4, floorY + 0.003, z);
    // Fire points (BS 5306-8): a CO2 extinguisher for the electrics and a
    // foam one, each pair with its fire action notice: in the make-up
    // bay by its doors; by the stair's foot; and by the ramp's foot.
    const fireAt = (x: number, z: number, yaw: number) => {
      const point = new Group();
      point.position.set(x, floorY + 0.3, z);
      point.rotation.y = yaw;
      for (const [k, dx] of [
        ['co2', -0.22],
        ['foam', 0.22],
      ] as const) {
        const e = createExtinguisher(kit, k);
        e.group.position.x = dx;
        point.add(e.group);
      }
      // The floor before it kept clear (the owner, 2026-10-26).
      const clear = new Group();
      const mark = (w: number, d: number, px: number, pz: number) =>
        box(
          paint('#c4231c', 0.6),
          w,
          0.004,
          d,
          px,
          -0.3 + 0.003 - 0.001,
          pz,
          clear,
        );
      mark(1.0, 0.06, 0, 0.8);
      mark(0.06, 0.8, -0.5, 0.4);
      mark(0.06, 0.8, 0.5, 0.4);
      point.add(clear);
      const notice = createFireActionNotice(kit);
      notice.position.set(0, 1.45, 0.005);
      point.add(notice);
      group.add(point);
    };
    for (const f of wetHallFirePoints()) fireAt(f.x, f.z, f.yaw);
    // Signs: at each way in (the east landing, the west door at the
    // ramp's head) safety footwear, wet floor and no smoking; on the
    // bay's doors no smoking.
    const signs = (x: number, y: number, z: number, yaw: number) => {
      const row = new Group();
      row.position.set(x, y, z);
      row.rotation.y = yaw;
      (
        [
          [['boots'], ['Safety footwear', 'must be worn']],
          [['slippery'], ['Caution', 'Wet floor']],
          [['no-smoking'], ['No smoking']],
        ] as const
      ).forEach(([p, lines], i) => {
        const sign = createSafetySign(kit, p, lines);
        sign.position.x = (i - 1) * 0.42;
        row.add(sign);
      });
      group.add(row);
    };
    signs(R - 0.005, floorY + WET_HALL.drop + 1.6, -2.1, -Math.PI / 2);
    signs(
      -R + 0.005,
      floorY + WET_HALL.drop + 1.6,
      WET_HALL.ramp.door + 1.6,
      Math.PI / 2,
    );
    const noSmoking = createSafetySign(kit, ['no-smoking'], ['No smoking']);
    noSmoking.position.set(
      L.door.maxX + 0.5,
      floorY + 1.6,
      L.bay.maxZ + t + 0.005,
    );
    group.add(noSmoking);
  }
  // Its floor gullies, flush in the floor, each side's apart.
  for (const g of L.gullies) {
    const gully = createFloorGully(kit);
    gully.group.position.set(g.x, floorY + 0.001, g.z);
    group.add(gully.group);
  }
  {
    // Its battens and trunking, on both faces of each length of it.
    const R = WET_HALL.side / 2 - SHELL_WALL;
    const t = L.partition.thickness;
    const trunkY = battenY + 0.22;
    const south = { z: L.bay.maxZ, from: L.bay.minX - t, to: R };
    const west = { x: L.bay.minX - t / 2, from: -R, to: L.bay.maxZ };
    for (const face of [-1, 1] as const) {
      // The south length: its faces into the bay (−z) and onto the aisle (+z).
      const fz = face === -1 ? south.z - 0.05 : south.z + t + 0.05;
      const len = south.to - south.from;
      // Trunking on its aisle face only: inside the bay it would join
      // nothing (the owner, 2026-10-26).
      if (face === 1)
        box(trunking, len, 0.05, 0.1, (south.from + south.to) / 2, trunkY, fz);
      const n = Math.max(1, Math.round(len / 4.5));
      for (let i = 0; i < n; i++) {
        const sx = south.from + ((i + 0.5) * len) / n;
        if (sx > L.door.minX - 0.8 && sx < L.door.maxX + 0.8) continue;
        addWallBatten(
          group,
          battens,
          sx,
          battenY,
          fz,
          'x',
          face === -1 ? -1 : 1,
        );
      }
      // The west length: its faces into the bay (+x) and onto the hall (−x).
      const fx = west.x + face * (t / 2 + 0.05);
      const wl = west.to - west.from;
      if (face === -1)
        box(trunking, 0.1, 0.05, wl, fx, trunkY, (west.from + west.to) / 2);
      const m = Math.max(1, Math.round(wl / 4.5));
      for (let i = 0; i < m; i++) {
        const sz = west.from + ((i + 0.5) * wl) / m;
        addWallBatten(
          group,
          battens,
          fx,
          battenY,
          sz,
          'z',
          face === 1 ? 1 : -1,
        );
      }
    }
  }

  return shell;
}

/**
 * The wet hall's make-up bay's doors (prompt 036; the owner, 2026-10-26):
 * the same pair of equipment doors as every plant room's, in the bay's
 * partition, pulled open from the aisle; for its room's parts.
 */
/**
 * The wet hall's fire points (the owner, 2026-10-26): in the make-up bay
 * by its doors, by the stair's foot, and by the ramp's foot (clear of its
 * rail); each a CO2 and a foam extinguisher, its fire action notice and a
 * manual call point, faces into the room. Room frame, on its walls.
 */
export function wetHallFirePoints() {
  const L = WET_HALL_LAYOUT;
  const R = WET_HALL.side / 2 - SHELL_WALL;
  return [
    { id: 'wh-mcp-1', x: -1.5, z: L.bay.maxZ - 0.005, yaw: Math.PI },
    { id: 'wh-mcp-2', x: R - 0.005, z: 2.6, yaw: -Math.PI / 2 },
    { id: 'wh-mcp-3', x: -4.0, z: R - 0.005, yaw: Math.PI },
  ] as const;
}

/**
 * The wet hall's fire alarm (the owner, 2026-10-26): a manual call point
 * at each fire point, 1.4 m up beside its extinguishers, latching the
 * world's alarm until reset with its key; a sounder-beacon high on the
 * hall's east wall past its stair and another in the make-up bay, sounding and flashing
 * while any is latched.
 */
export function wetHallFireAlarm(kit: PanelKit): Part[] {
  const L = WET_HALL_LAYOUT;
  const R = WET_HALL.side / 2 - SHELL_WALL;
  const floorY = -WET_HALL.drop;
  const store = roomWorld();
  const alarm = computed(() =>
    zoneInAlarm(store.world.value.fireAlarm, 'wet_hall'),
  );
  const parts: Part[] = [];
  for (const f of wetHallFirePoints()) {
    const latched = computed(() => store.world.value.fireAlarm.latched[f.id]);
    const p = callPoint(kit, {
      latched,
      press: () =>
        store.dispatch({
          type: 'fire-alarm',
          action: { act: 'press', point: f.id },
        }),
      reset: () =>
        store.dispatch({
          type: 'fire-alarm',
          action: { act: 'reset', point: f.id },
        }),
    });
    // Beside the extinguishers, 1.4 m up (BS 5839-1).
    const at = new Vector3(0.62, 0, 0).applyAxisAngle(
      new Vector3(0, 1, 0),
      f.yaw,
    );
    p.object.position.set(f.x + at.x, floorY + 1.4, f.z + at.z);
    p.object.rotation.y = f.yaw;
    parts.push(p);
  }
  for (const [x, z, yaw] of [
    [R - 0.005, 4.0, -Math.PI / 2],
    [3.0, L.bay.maxZ - 0.005, Math.PI],
  ] as const) {
    const s = sounderBeacon(kit, { sounding: alarm });
    s.object.position.set(x, floorY + 3.2, z);
    s.object.rotation.y = yaw;
    parts.push(s);
  }
  return parts;
}

export function wetHallBayDoors(kit: PanelKit) {
  const L = WET_HALL_LAYOUT;
  const part = equipmentDoors(kit, 'MAKE-UP WATER', ['authorised']);
  part.object.position.set(
    (L.door.minX + L.door.maxX) / 2,
    -WET_HALL.drop,
    L.bay.maxZ + L.partition.thickness,
  );
  return part;
}

/**
 * Where the control bus's conduits and riser rise up a room's walls past
 * `height` over its floor (its wall battens'), each along its wall: no
 * batten is hung across one (the owner, 2026-10-26: a riser went through
 * a light).
 */
function busCrossings(room: string, height: number) {
  const bus = controlBus(room);
  const structure = roomStructure(room);
  if (!bus || !structure) return [];
  const { walls } = structure;
  const runs = [
    ...bus.stubs.flatMap((s) =>
      s.points.slice(1).map((b, i) => [s.points[i], b] as const),
    ),
    ...bus.trunking.map((t) => [t.from, t.to] as const),
  ];
  const near = (a: number, b: number) => Math.abs(a - b) < 0.2;
  const out: { wall: ShellWall; at: number }[] = [];
  for (const [a, b] of runs) {
    if (Math.abs(a[0] - b[0]) > 1e-6 || Math.abs(a[2] - b[2]) > 1e-6) continue;
    if (Math.min(a[1], b[1]) > height || Math.max(a[1], b[1]) < height)
      continue;
    const [x, , z] = a;
    if (near(x, walls.west)) out.push({ wall: 'west', at: z });
    else if (near(x, walls.east)) out.push({ wall: 'east', at: z });
    else if (near(z, walls.north)) out.push({ wall: 'north', at: x });
    else if (near(z, walls.south)) out.push({ wall: 'south', at: x });
  }
  return out;
}
