import {
  BoxGeometry,
  CanvasTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  SRGBColorSpace,
} from 'three';
import type { Material, Object3D } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createServiceCeiling } from '../../components/site-dressing/views/service-ceiling';
import { createIndustrialAccess } from '../../components/architectural/views/industrial-access';
import {
  addWallBatten,
  createWallBattenMaterials,
} from '../../../scene/wall-batten';
import {
  EQUIPMENT_DOORS,
  equipmentDoors,
} from '../../components/architectural/parts/equipment-doors';
import type { EquipmentDoorsPart } from '../../components/architectural/parts/equipment-doors';
import type { DoorWarningSelection } from '../../components/architectural/logic/door-warnings';
import { createBreezeBlockTextures } from '../../../scene/breeze-block-texture';
import { createWarehouseConcreteFloor } from '../../../scene/warehouse-concrete-floor';
import { createPs1Material } from '../../components/core/parts/ps1-material';
import {
  SHELL_OPENING,
  SHELL_WALL,
  shellDoorPlace,
  shellWallPieces,
  WET_HALL,
  WET_HALL_DOORS,
  wetHallEntrances,
  wetHallFloorAt,
  wetHallRails,
  wetHallRamp,
} from '../logic/shell-rooms';
import type { ShellDoor, ShellWall } from '../logic/shell-rooms';
import type { Footprint } from '../../controls/logic/walk-collision';
import { DEV_ROOM_NAMES } from '../logic/dev-room-links';
import type { RoomId } from '../logic/dev-room-links';

/** Which warnings a room's doors carry, by what is behind them. */
export function warningsFor(room: string): DoorWarningSelection {
  if (room === 'boiler_house') return 'furnace';
  if (room === 'hypo_store' || room === 'acid_store') return 'chemical';
  if (room === 'switch_room') return 'electrical';
  if (room === 'control_room' || room === 'engineers_office')
    return ['authorised'];
  return 'plant';
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
  /** Its floor's level, and its roof's, over the doors' level (0). */
  floor: number;
  roof: number;
  /** Its title card: name, and what it is for. */
  title: string;
  note: string;
  seed: number;
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
    const uv = geometry.attributes.uv;
    for (let face = 0; face < 6; face++) {
      const horizontal = face < 2 ? sz : sx;
      const vertical = face < 2 || face >= 4 ? sy : sz;
      for (let corner = 0; corner < 4; corner++) {
        const i = face * 4 + corner;
        uv.setXY(i, uv.getX(i) * horizontal, uv.getY(i) * (vertical / 0.4));
      }
    }
    const mesh = new Mesh(geometry, block);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  const t = SHELL_WALL;
  const hw = v.w / 2;
  const hd = v.d / 2;
  const openingH = EQUIPMENT_DOORS.h + 2 * EQUIPMENT_DOORS.frame;
  // The floor, and the roof.
  box(concrete, v.w, 0.1, v.d, 0, v.floor - 0.05, 0);
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
    for (const d of v.doors.filter((d) => d.wall === wall)) {
      const a = d.at - SHELL_OPENING / 2;
      const b = d.at + SHELL_OPENING / 2;
      span(a, b, openingH, v.roof);
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
    const part = equipmentDoors(kit, signTo(door.to), warningsFor(door.to));
    part.object.position.set(p.inner.x, 0, p.inner.z);
    part.object.rotation.y = yaw;
    group.add(part.object);
    const lobby = new Group();
    lobby.position.set(p.outer.x, 0, p.outer.z);
    lobby.rotation.y = yaw;
    group.add(lobby);
    box(dark, SHELL_OPENING, openingH, 0.05, 0, openingH / 2, -0.9, lobby);
    const sign = card(1.8, 0.24, [signTo(door.to)]);
    sign.position.set(
      p.inner.x + p.into[0] * 0.01,
      openingH + 0.35,
      p.inner.z + p.into[1] * 0.01,
    );
    sign.rotation.y = yaw;
    group.add(sign);
    return { door, part, lobby };
  });

  // The title card, on the wall facing its first door, at eye height.
  const first = v.doors[0];
  const facing: ShellWall =
    first.wall === 'south'
      ? 'north'
      : first.wall === 'north'
        ? 'south'
        : first.wall === 'east'
          ? 'west'
          : 'east';
  const title = card(2.4, 0.6, [
    v.title,
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
  group.add(title);

  // Light: LED battens round the walls, clear of the doors; a point light
  // for every 10 m or so of the room's length, at most three.
  const battens = createWallBattenMaterials();
  kit.materials.push(...Object.values(battens));
  const y = v.floor + 3.1;
  const clear = (wall: ShellWall, s: number) =>
    !v.doors.some((d) => d.wall === wall && Math.abs(d.at - s) < 1.6) &&
    !(wall === facing && Math.abs(s - (besideDoor ? 4 : 0)) < 1.6);
  for (const wall of ['north', 'south'] as const) {
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
    const material = new MeshBasicMaterial({ map });
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
  for (const f of wetHallRails().slice(-2)) guardAlong(f);
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
  return shell;
}
