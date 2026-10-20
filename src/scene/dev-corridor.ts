import {
  BackSide,
  BoxGeometry,
  CanvasTexture,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  NoBlending,
  PlaneGeometry,
  RepeatWrapping,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
} from 'three';
import type { Material, Object3D } from 'three';
import {
  LANDMARK_AT,
  LOOP_CEILING,
  LOOP_CORNERS,
  LOOP_DOORS,
  LOOP_END,
  LOOP_FIRE_POINTS,
  LOOP_FITTINGS,
  LOOP_HALF,
  LOOP_INNER,
  LOOP_LANDMARKS,
  LOOP_OUTER,
  LOOP_SIDES,
  LOOP_SIDE_IDS,
  LOOP_ZONES,
  zoneAt,
} from '../game/dev-corridor-plan';
import type { LoopDoor, LoopSide, LoopZone } from '../game/dev-corridor-plan';
import {
  DEV_ROOM_COLOURS,
  DEV_ROOM_NAMES,
  ROOMS,
} from '../toolkit/gallery/logic/dev-room-links';
import type { RoomId } from '../toolkit/gallery/logic/dev-room-links';
import {
  createMicroLabel,
  kitGlow,
  kitPaint,
} from '../toolkit/components/core/views/eighties-controls';
import type { PanelKit } from '../toolkit/components/core/views/eighties-controls';
import { createPs1Material } from '../toolkit/components/core/parts/ps1-material';
import { createPartSet } from '../toolkit/components/core/parts/parts';
import { mergeStatic } from '../toolkit/components/core/views/merge-static';
import { architecturalPart } from '../toolkit/components/architectural/parts/architectural-parts';
import { springDoor } from '../toolkit/components/architectural/parts/building-parts';
import { SPRING_OPENING } from '../toolkit/components/architectural/views/spring-door';
import {
  createBinTrolley,
  createCleaningShelves,
  createMopBucket,
  createRotaryScrubber,
  createWetFloorSign,
} from '../toolkit/components/site-dressing/views/cleaning-props';

/**
 * Each side's stripe, so the player knows which side they are on: north
 * grey, east purple, south blue, west orange.
 */
export const LOOP_STRIPES: Record<LoopSide, string> = {
  north: '#8a8f93',
  east: '#6a3fa0',
  south: '#2f5fb8',
  west: '#e27532',
};

/** How deep the dark lobby behind each door is, metres. */
const LOBBY = 1.6;
const WALL = 0.18;

/**
 * Every room on the loop, in order round it from the north side's west
 * end, clockwise: the training room, the dev rooms, the Rhombus, the Hall
 * and the levels; the doors left over are stores.
 */
export const LOOP_ROOMS: readonly (RoomId | null)[] = LOOP_DOORS.filter(
  (d) => d.wall === 'outer',
).map(
  (_, i) =>
    ROOMS.filter((id) => id !== 'dev_corridor' && id !== 'dev_courtyard')[i] ??
    null,
);

/**
 * dev_corridor: the corridor that loops round a 50 m square
 * (`dev-corridor-plan.ts`), in the look of the old underground service
 * corridor (dev7): painted breeze block, blue, purple and teal triangles
 * at the turns, orange marking, industrial signage, a concrete floor and
 * fluorescent battens. Spring doors on its outer walls, each under its
 * room's name in its colour, open onto a dark lobby for now; one in the
 * middle of each side's inner wall leads to the courtyard. Fire points, and on each side a
 * landmark of the cleaners' (a mop and bucket, a rotary scrubber, a bin
 * trolley, a cleaning store's shelving) and its own letter, A to D, so
 * nobody gets lost.
 *
 * Built in zones (`LOOP_ZONES`), each merged on its own, so that a zone
 * that cannot be seen is hidden whole. In metres; the room scales it.
 */
export function createDevCorridor(
  kit: PanelKit,
  // Every door opens away from the corridor, into its room or the
  // courtyard (as a room door should, never into an escape route): pushed
  // from the corridor, pulled from the other side.
) {
  const group = new Group();
  group.name = 'dev_corridor';
  const parts = createPartSet();
  const zones = new Map<LoopZone, { group: Group; still: Group }>();
  for (const id of LOOP_ZONES) {
    const zone = new Group();
    zone.name = `zone ${id}`;
    const still = new Group();
    zone.add(still);
    group.add(zone);
    zones.set(id, { group: zone, still });
  }
  const zoneOf = (x: number, z: number) =>
    zones.get(
      zoneAt(
        Math.max(-LOOP_OUTER + 0.01, Math.min(LOOP_OUTER - 0.01, x)),
        Math.max(-LOOP_OUTER + 0.01, Math.min(LOOP_OUTER - 0.01, z)),
      ) ?? 'north.middle',
    )!;

  // ---- Materials --------------------------------------------------------
  const mat = {
    concrete: kitPaint(kit, '#777b7b'),
    ceiling: kitPaint(kit, '#bbbdbb'),
    base: kitPaint(kit, '#5f6262'),
    teal: kitPaint(kit, '#138c91'),
    magenta: kitPaint(kit, '#a53b83'),
    purple: kitPaint(kit, '#343a80'),
    blue: kitPaint(kit, '#345282'),
    orange: kitPaint(kit, '#e27532'),
    yellow: kitPaint(kit, '#d6af24'),
    dark: kitPaint(kit, '#141617'),
    steel: kitPaint(kit, '#989e9e', 0.55),
    tray: kitPaint(kit, '#b8bfbd', 0.48),
    housing: kitPaint(kit, '#e3e3dc', 0.5),
    tube: kitGlow(kit, '#f5f7ee'),
    /** The inside of a door's lobby box. */
    lobby: kitPaint(kit, '#141617').clone(),
    /** Nothing, not even the background: the room underneath shows. */
    hole: new MeshBasicMaterial({
      color: '#000000',
      opacity: 0,
      blending: NoBlending,
      toneMapped: false,
      depthWrite: false,
    }),
  };
  mat.lobby.side = BackSide;
  kit.materials.push(mat.lobby, mat.hole);
  for (const m of [mat.teal, mat.magenta, mat.purple, mat.blue])
    m.side = DoubleSide;
  // Mortar joints painted on a small repeating canvas, not one mesh a block.
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#d8d9d2';
  c.fillRect(0, 0, 128, 64);
  c.strokeStyle = '#b9bdb7';
  c.lineWidth = 2;
  for (const y of [0, 32, 63]) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(128, y);
    c.stroke();
  }
  for (const [x, y1, y2] of [
    [0, 0, 32],
    [64, 0, 32],
    [32, 32, 64],
    [96, 32, 64],
  ]) {
    c.beginPath();
    c.moveTo(x, y1);
    c.lineTo(x, y2);
    c.stroke();
  }
  const blocks = new CanvasTexture(canvas);
  blocks.colorSpace = SRGBColorSpace;
  blocks.wrapS = blocks.wrapT = RepeatWrapping;
  kit.textures.push(blocks);
  const blockwork = createPs1Material({ map: blocks, roughness: 0.88 });
  kit.materials.push(blockwork);

  const box = (
    parent: Object3D,
    material: Material,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const label = (
    parent: Object3D,
    text: string,
    x: number,
    y: number,
    z: number,
    yaw: number,
    height: number,
    ink: string,
    plate: string | null,
  ) => {
    const mark = createMicroLabel(kit, text, { height, ink, plate });
    mark.position.set(x, y, z);
    mark.rotation.y = yaw;
    parent.add(mark);
    return mark;
  };
  /** A run of painted blockwork wall along x or z, its UVs at block size. */
  const wall = (
    parent: Object3D,
    along: 'x' | 'z',
    at: number,
    from: number,
    to: number,
    bottom = 0,
    top = LOOP_CEILING,
  ) => {
    const length = to - from;
    if (length <= 0.001) return;
    const height = top - bottom;
    const geometry = new BoxGeometry(
      along === 'x' ? length : WALL,
      height,
      along === 'x' ? WALL : length,
    );
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++)
      uv.setXY(i, uv.getX(i) * length, uv.getY(i) * (height / 0.4));
    const mesh = new Mesh(geometry, blockwork);
    const middle = (from + to) / 2;
    mesh.position.set(
      along === 'x' ? middle : at,
      (bottom + top) / 2,
      along === 'x' ? at : middle,
    );
    parent.add(mesh);
    if (bottom === 0)
      box(
        parent,
        mat.base,
        along === 'x' ? length : WALL + 0.02,
        0.16,
        along === 'x' ? WALL + 0.02 : length,
        mesh.position.x,
        0.08,
        mesh.position.z,
      );
  };
  /** A right-angled painted triangle on a wall, its foot on the skirting. */
  const triangle = (
    parent: Object3D,
    x: number,
    z: number,
    yaw: number,
    width: number,
    height: number,
    material: Material,
  ) => {
    const shape = new Shape();
    shape.moveTo(-width / 2, 0);
    shape.lineTo(width / 2, 0);
    shape.lineTo(width / 2, height);
    shape.closePath();
    const mesh = new Mesh(new ShapeGeometry(shape), material);
    mesh.position.set(x, 0.16, z);
    mesh.rotation.y = yaw;
    parent.add(mesh);
  };

  // ---- Floors, ceilings and walls, zone by zone --------------------------
  /** A side's span along its axis, from a to b, for a zone of it. */
  const spans: Record<'a' | 'middle' | 'b', [number, number]> = {
    a: [-LOOP_INNER, -LOOP_INNER + LOOP_END],
    middle: [-LOOP_INNER + LOOP_END, LOOP_INNER - LOOP_END],
    b: [LOOP_INNER - LOOP_END, LOOP_INNER],
  };
  /** Where along each side's outer wall the doors open, as gaps. */
  const doorGaps = (side: LoopSide, wallOf: LoopDoor['wall']) =>
    LOOP_DOORS.filter((d) => d.side === side && d.wall === wallOf).map((d) => [
      d.t - SPRING_OPENING.width / 2 - 0.06,
      d.t + SPRING_OPENING.width / 2 + 0.06,
    ]);
  /** A wall from `from` to `to`, leaving gaps for doors, lintels over them. */
  const wallWithGaps = (
    parent: Object3D,
    along: 'x' | 'z',
    at: number,
    from: number,
    to: number,
    gaps: number[][],
  ) => {
    let start = from;
    for (const [g0, g1] of gaps
      .filter(([g0, g1]) => g1 > from && g0 < to)
      .sort((p, q) => p[0] - q[0])) {
      wall(parent, along, at, start, Math.max(start, g0));
      wall(parent, along, at, g0, g1, SPRING_OPENING.height + 0.06);
      start = g1;
    }
    wall(parent, along, at, start, to);
  };
  for (const side of LOOP_SIDE_IDS) {
    const s = LOOP_SIDES[side];
    const outward = Math.sign(s.at);
    for (const part of ['a', 'middle', 'b'] as const) {
      const { still } = zones.get(`${side}.${part}`)!;
      const [t0, t1] = spans[part];
      const length = t1 - t0;
      const mid = (t0 + t1) / 2;
      const cx = s.along === 'x' ? mid : s.at;
      const cz = s.along === 'x' ? s.at : mid;
      const w = s.along === 'x' ? length : LOOP_OUTER - LOOP_INNER;
      const d = s.along === 'x' ? LOOP_OUTER - LOOP_INNER : length;
      box(still, mat.concrete, w, 0.12, d, cx, -0.06, cz);
      box(still, mat.ceiling, w, 0.12, d, cx, LOOP_CEILING + 0.06, cz);
      const outerAt = s.at + outward * (LOOP_OUTER - LOOP_HALF);
      const innerAt = s.at - outward * (LOOP_HALF - LOOP_INNER);
      wallWithGaps(still, s.along, outerAt, t0, t1, doorGaps(side, 'outer'));
      wallWithGaps(still, s.along, innerAt, t0, t1, doorGaps(side, 'inner'));
      // A cable tray along the inner wall, high up.
      const trayAt = s.at - outward * (LOOP_HALF - LOOP_INNER - 0.35);
      box(
        still,
        mat.tray,
        s.along === 'x' ? length : 0.3,
        0.06,
        s.along === 'x' ? 0.3 : length,
        s.along === 'x' ? mid : trayAt,
        LOOP_CEILING - 0.35,
        s.along === 'x' ? trayAt : mid,
      );
    }
  }
  for (const [corner, { x, z }] of Object.entries(LOOP_CORNERS)) {
    const { still } = zones.get(corner as LoopZone)!;
    const width = LOOP_OUTER - LOOP_INNER;
    const sx = Math.sign(x);
    const sz = Math.sign(z);
    box(still, mat.concrete, width, 0.12, width, x, -0.06, z);
    box(still, mat.ceiling, width, 0.12, width, x, LOOP_CEILING + 0.06, z);
    // The corner's two outer walls; its inner side is open to both sides.
    const [x0, x1] =
      sx < 0 ? [-LOOP_OUTER, -LOOP_INNER] : [LOOP_INNER, LOOP_OUTER];
    const [z0, z1] =
      sz < 0 ? [-LOOP_OUTER, -LOOP_INNER] : [LOOP_INNER, LOOP_OUTER];
    wall(still, 'x', sz * LOOP_OUTER, x0, x1);
    wall(still, 'z', sx * LOOP_OUTER, z0, z1);
  }

  // ---- Each side's character: triangles at its turns, its letter ---------
  const colours: Record<LoopSide, [Material, Material]> = {
    north: [mat.teal, mat.purple],
    east: [mat.blue, mat.magenta],
    south: [mat.purple, mat.orange],
    west: [mat.blue, mat.teal],
  };
  for (const side of LOOP_SIDE_IDS) {
    const s = LOOP_SIDES[side];
    const outward = Math.sign(s.at);
    const innerFace =
      s.at - outward * (LOOP_HALF - LOOP_INNER - WALL / 2 - 0.004);
    const outerFace =
      s.at + outward * (LOOP_OUTER - LOOP_HALF - WALL / 2 - 0.004);
    // Facing into the corridor from the inner wall, and from the outer.
    const innerYaw =
      s.along === 'x'
        ? outward < 0
          ? Math.PI
          : 0
        : outward < 0
          ? -Math.PI / 2
          : Math.PI / 2;
    const outerYaw = innerYaw + Math.PI;
    for (const [end, t] of [
      ['a', -LOOP_INNER + 2.2],
      ['b', LOOP_INNER - 2.2],
    ] as const) {
      const zone = zones.get(`${side}.${end}`)!.still;
      const at = (face: number) =>
        s.along === 'x' ? { x: t, z: face } : { x: face, z: t };
      // Bold triangles on the inner wall mark each turn, in the side's colours.
      const p = at(innerFace);
      triangle(
        zone,
        p.x,
        p.z,
        innerYaw,
        2.4,
        2.55,
        colours[side][end === 'a' ? 0 : 1],
      );
      // The side's letter, high on the outer wall near the turn, clear of
      // the first door's sign.
      const tl = Math.sign(t) * (LOOP_INNER - 0.75);
      const q =
        s.along === 'x' ? { x: tl, z: outerFace } : { x: outerFace, z: tl };
      label(
        zone,
        `CORRIDOR ${s.letter}`,
        q.x,
        2.55,
        q.z,
        outerYaw,
        0.11,
        '#f0f2ec',
        '#2a3a44',
      );
    }
    // A stripe along the inner wall at waist height, its whole length, in
    // the side's own colour, so the player knows which side they are on.
    const stripe = kitPaint(kit, LOOP_STRIPES[side]);
    // It stops either side of the courtyard door, so it never crosses it.
    const gaps = doorGaps(side, 'inner');
    for (const part of ['a', 'middle', 'b'] as const) {
      const [p0, p1] = spans[part];
      let pieces: [number, number][] = [[p0, p1]];
      for (const [g0, g1] of gaps)
        pieces = pieces.flatMap(([t0, t1]): [number, number][] =>
          g1 <= t0 || g0 >= t1
            ? [[t0, t1]]
            : ([
                [t0, Math.max(t0, g0)],
                [Math.min(t1, g1), t1],
              ].filter(([u0, u1]) => u1 - u0 > 0.01) as [number, number][]),
        );
      for (const [t0, t1] of pieces) {
        const mid = (t0 + t1) / 2;
        box(
          zones.get(`${side}.${part}`)!.still,
          stripe,
          s.along === 'x' ? t1 - t0 : 0.012,
          0.12,
          s.along === 'x' ? 0.012 : t1 - t0,
          s.along === 'x' ? mid : innerFace,
          0.95,
          s.along === 'x' ? innerFace : mid,
        );
      }
    }
  }

  // ---- Fluorescent battens down the middle ------------------------------
  for (const f of LOOP_FITTINGS) {
    const zone = zoneOf(f.x, f.z).still;
    const s = LOOP_SIDES[f.side];
    const [w, d] = s.along === 'x' ? [1.5, 0.12] : [0.12, 1.5];
    box(zone, mat.housing, w, 0.07, d, f.x, LOOP_CEILING - 0.04, f.z);
    box(
      zone,
      mat.tube,
      w * 0.96 || 0.1,
      0.012,
      d * 0.96 || 0.1,
      f.x,
      LOOP_CEILING - 0.08,
      f.z,
    );
  }

  // ---- Doors -------------------------------------------------------------
  const doors: {
    door: LoopDoor;
    room: RoomId | null;
    part: ReturnType<typeof springDoor>;
    /** Where its leaf hangs, metres, for holding it while someone passes. */
    x: number;
    z: number;
    /** Its turn, its face (+z) into the corridor. */
    yaw: number;
    /** An outer door's dark lobby, and the doorway seen through instead. */
    lobby: Mesh | null;
    hole: Mesh | null;
  }[] = [];
  let outerIndex = 0;
  for (const door of LOOP_DOORS) {
    const s = LOOP_SIDES[door.side];
    const outward = Math.sign(s.at) * (door.wall === 'outer' ? 1 : -1);
    const faceAt =
      door.wall === 'outer'
        ? s.at + Math.sign(s.at) * (LOOP_OUTER - LOOP_HALF)
        : s.at - Math.sign(s.at) * (LOOP_HALF - LOOP_INNER);
    const x = s.along === 'x' ? door.t : faceAt;
    const z = s.along === 'x' ? faceAt : door.t;
    const zone = zoneOf(
      s.along === 'x' ? door.t : s.at,
      s.along === 'x' ? s.at : door.t,
    );
    const room = door.wall === 'outer' ? LOOP_ROOMS[outerIndex++] : null;
    const name =
      door.wall === 'inner'
        ? 'COURTYARD'
        : room
          ? DEV_ROOM_NAMES[room]
          : 'STORE';
    const part = parts.add(
      springDoor(kit, {
        name: `${name} door`,
      }),
    );
    // Its face to the corridor: the part faces +z, turned to face inward.
    const yaw =
      s.along === 'x'
        ? outward > 0
          ? Math.PI
          : 0
        : outward > 0
          ? -Math.PI / 2
          : Math.PI / 2;
    part.object.position.set(x, 0, z);
    part.object.rotation.y = yaw;
    zone.group.add(part.object);
    // The dark lobby behind an outer door, one inside-out box: what is
    // behind it is a room of its own, not drawn here. Seen through (the
    // room drawn underneath, by the app), the lobby goes and the doorway
    // shows nothing at all (`hole`), so the room below shows through; the
    // leaf is drawn after it, so it is seen swinging into that room.
    // Behind an inner door is the courtyard, drawn there while it is open.
    let lobby: Mesh | null = null;
    let hole: Mesh | null = null;
    if (door.wall === 'outer') {
      lobby = new Mesh(
        new BoxGeometry(
          SPRING_OPENING.width + 0.2,
          SPRING_OPENING.height + 0.1,
          LOBBY,
        ),
        mat.lobby,
      );
      lobby.position.set(0, (SPRING_OPENING.height + 0.1) / 2, -LOBBY / 2);
      lobby.raycast = () => {};
      part.object.add(lobby);
      hole = new Mesh(
        new PlaneGeometry(SPRING_OPENING.width, SPRING_OPENING.height),
        mat.hole,
      );
      hole.position.set(0, SPRING_OPENING.height / 2, -0.03);
      hole.renderOrder = 10;
      hole.raycast = () => {};
      hole.visible = false;
      part.object.add(hole);
      part.object.traverse((o) => {
        if (!o.userData.live) return;
        o.traverse((m) => {
          if (m instanceof Mesh) m.renderOrder = 11;
        });
      });
    }
    // Its room's name over it, on its colour.
    const colour = room
      ? DEV_ROOM_COLOURS[room]
      : door.wall === 'inner'
        ? '#8d9194'
        : '#5a6064';
    const sign = createMicroLabel(kit, name, {
      height: 0.075,
      ink: '#101214',
      plate: colour,
      maxWidth: 1.6,
    });
    sign.position.set(0, SPRING_OPENING.height + 0.32, 0.1);
    part.object.add(sign);
    doors.push({ door, room, part, x, z, yaw, lobby, hole });
  }

  // ---- Fire points -------------------------------------------------------
  for (const { side, t } of LOOP_FIRE_POINTS) {
    const s = LOOP_SIDES[side];
    const face =
      s.at + Math.sign(s.at) * (LOOP_OUTER - LOOP_HALF - WALL / 2 - 0.02);
    const x = s.along === 'x' ? t : face;
    const z = s.along === 'x' ? face : t;
    const zone = zoneOf(s.along === 'x' ? t : s.at, s.along === 'x' ? s.at : t);
    const point = new Group();
    point.position.set(x, 0, z);
    point.rotation.y =
      s.along === 'x'
        ? Math.sign(s.at) > 0
          ? Math.PI
          : 0
        : Math.sign(s.at) > 0
          ? -Math.PI / 2
          : Math.PI / 2;
    zone.group.add(point);
    for (const [kind, dx] of [
      ['water', -0.25],
      ['co2', 0.25],
    ] as const) {
      const extinguisher = parts.add(architecturalPart(kit, kind));
      extinguisher.object.position.set(dx, 0, 0.12);
      point.add(extinguisher.object);
    }
    const sign = createMicroLabel(kit, 'FIRE POINT', {
      height: 0.07,
      ink: '#ffffff',
      plate: '#b8241c',
    });
    sign.position.set(0, 1.75, 0.02);
    point.add(sign);
  }

  // ---- Landmarks, one a side, against the inner wall ---------------------
  for (const side of LOOP_SIDE_IDS) {
    const s = LOOP_SIDES[side];
    const inward = -Math.sign(s.at);
    const face = s.at + inward * (LOOP_HALF - LOOP_INNER - WALL / 2 - 0.5);
    const x = s.along === 'x' ? LANDMARK_AT : face;
    const z = s.along === 'x' ? face : LANDMARK_AT;
    const zone = zoneOf(
      s.along === 'x' ? LANDMARK_AT : s.at,
      s.along === 'x' ? s.at : LANDMARK_AT,
    ).still;
    const spot = new Group();
    spot.position.set(x, 0, z);
    // Its front to the corridor: away from the inner wall.
    spot.rotation.y =
      s.along === 'x'
        ? inward > 0
          ? Math.PI
          : 0
        : inward > 0
          ? -Math.PI / 2
          : Math.PI / 2;
    zone.add(spot);
    const kind = LOOP_LANDMARKS[side];
    if (kind === 'mop') {
      spot.add(createMopBucket(kit));
      const sign = createWetFloorSign(kit);
      sign.position.set(0.9, 0, 0.6);
      spot.add(sign);
    } else if (kind === 'scrubber') spot.add(createRotaryScrubber(kit));
    else if (kind === 'trolley') {
      const trolley = createBinTrolley(kit);
      trolley.position.z = 0.15;
      spot.add(trolley);
    } else spot.add(createCleaningShelves(kit));
  }

  // ---- Merging: each zone's still things, on their own -------------------
  const batches: Mesh[] = [];
  for (const { still } of zones.values())
    batches.push(...mergeStatic(still, Infinity, new Set(), { share: true }));

  return {
    group,
    parts,
    zones,
    doors,
    batches,
    /** The battens, for the room to put its few real lights by. */
    fittings: LOOP_FITTINGS,
  };
}
