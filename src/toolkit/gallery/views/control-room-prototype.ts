import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  HemisphereLight,
  SRGBColorSpace,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  Path,
  PointLight,
  Shape,
  SpotLight,
  TorusGeometry,
  Vector3,
} from 'three';
import type { Material, Object3D } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { markComponent } from '../../components/core/views/component-identity';
import {
  bridgeCeiling,
  bridgeMaterials,
  carpetRing,
  chaserLights,
  idleScreen,
  upholsteredChair,
} from './bridge-dressing';
import type { ChairKind } from './bridge-dressing';
import {
  createEngravedSign,
  cutLines,
} from '../../components/general-safety/views/engraved-sign';
import {
  CONFERENCE,
  CONTROL_ROOM,
  PLACEHOLDERS,
  PLATFORM,
  RAMP,
  RING_LIGHT,
  STAIR,
  STATION,
  STOREY,
  bridgeDoor,
  chairPlace,
  edgeAt,
  horseshoePoints,
  rampHeightAt,
  conferenceChairs,
  conferenceTable,
  deskSegments,
  inward,
  lanes,
  placeholderCorners,
  placeholderFloor,
  platformEdge,
  riserHeight,
  ringLightCentre,
  roomPolygon,
  sides,
  spine,
  stairPlan,
  stationPlaces,
} from '../logic/control-room-prototype';
import type { Point, Theme } from '../logic/control-room-prototype';

/**
 * The control room's prototype (mission 092, stage 0; dev45), drawn from
 * `logic/control-room-prototype.ts`: the stair hall and its switchback
 * stair, the grand heptagonal room over it with its segmented desk, the
 * Strangelove ring light, the raised stage and its conference table, and
 * a labelled placeholder on every wall for the consoles to come. Ken
 * Adam's Bond sets for the finish (a polished dark floor, dark faceted
 * walls, a deep coffered ceiling, the displays and the desk glowing in
 * the gloom); EPCOT Computer Central (1982) for the desk (cream sloping
 * tops, raised angled upstands with their screens set in, charcoal
 * fronts and cheeks, a red chair). Everything here is set decoration or
 * a placeholder, marked decorative: no engineering item yet.
 */
export function createControlRoomPrototype(
  metre: number,
  kit: PanelKit,
  title: string,
  theme: Theme = 'lair',
  options: {
    /**
     * The game's bridge (mission 095): the stair hall's door is the main
     * corridor's doorway (`bridgeDoor`), open, its doors hung by the
     * room; and no placeholders, the room's own consoles standing there.
     */
    game?: boolean;
  } = {},
) {
  const bridge = theme === 'bridge';
  const game = options.game ?? false;
  const group = new Group();
  group.name = 'control room prototype';
  group.scale.setScalar(metre);
  const paint = (
    color: string,
    roughness = 0.8,
    metalness = 0,
    extra: Partial<MeshStandardMaterial> = {},
  ) => {
    const m = new MeshStandardMaterial({ color, roughness, metalness });
    Object.assign(m, extra);
    kit.materials.push(m);
    return m;
  };
  const glow = (color: string, intensity: number, base = '#050607') =>
    paint(base, 0.4, 0, {
      emissive: new MeshStandardMaterial({ color }).color,
      emissiveIntensity: intensity,
    } as Partial<MeshStandardMaterial>);
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
  const decor = <T extends Object3D>(o: T, name: string) => {
    o.name = name;
    return markComponent(o, { name, decorative: true });
  };

  // Materials: the lair's black lacquer, brushed steel and glossy black
  // floor; the bridge's carpet, beige and light grey panels and wood.
  // The bridge's dressing (mission 095): carpet, oak, coves, fabric.
  const dressing = bridge ? bridgeMaterials(kit) : null;
  const gloss = dressing ? dressing.carpet : paint('#141215', 0.08, 0.4);
  const commandFabric = dressing ? paint('#7d6458', 0.96, 0) : null;
  const seatFabric = dressing ? paint('#9a8676', 0.96, 0) : null;
  const stone = paint('#3b3631', 0.55, 0.05);
  const darkWall = bridge
    ? paint('#d3cab8', 0.85)
    : paint('#232528', 0.6, 0.15);
  const fin = bridge
    ? paint('#b9b7b1', 0.7, 0.05)
    : paint('#4a4f55', 0.35, 0.6);
  const ceilingMat = bridge ? paint('#c9c4ba', 0.9) : paint('#2a2a2b', 0.95);
  const beam = bridge ? paint('#bdb6a8', 0.85) : paint('#333336', 0.9);
  const lacquer = paint('#0b0b0c', 0.12, 0.1);
  const hallWall = paint('#4a4640', 0.85);
  const brass = paint('#b08a45', 0.3, 0.8);
  const steel = paint('#c7cbce', 0.25, 0.6);
  const glass = paint('#9fb4b8', 0.05, 0.1, {
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  } as Partial<MeshStandardMaterial>);
  const downlight = glow('#ffd9a0', 2.2, '#fff3dc');
  // The Enterprise's bridge's palette (a style cue only): wood, beige,
  // flat rounded colour bars.
  const wood = paint('#7a4a2a', 0.45, 0.05);
  const trim = bridge ? wood : steel;
  const colourBar: Record<string, MeshStandardMaterial> = Object.fromEntries(
    ['#e49a4c', '#c890c8', '#9aa6e0', '#e2b77a'].map((c) => [
      c,
      glow(c, 0.6, c),
    ]),
  );

  // ------------------------------------------------------------ stair hall
  const plan = stairPlan();
  const { hall, flights, landings, opening, door } = plan;
  const hallGroup = decor(new Group(), 'Stair hall');
  group.add(hallGroup);
  const hw = hall.maxX - hall.minX;
  const hd = hall.maxZ - hall.minZ;
  const hcx = (hall.minX + hall.maxX) / 2;
  const hcz = (hall.minZ + hall.maxZ) / 2;
  const t = STAIR.wall;
  // Its walls stop under the room's floor slab, so their tops never
  // show through it (they flickered round the stair's opening).
  const WALL_H = STOREY - 0.32;
  // Its floor.
  box(stone, hw, 0.1, hd, hcx, -0.05, hcz, hallGroup);
  // Its walls, the south round the door.
  box(hallWall, t, WALL_H, hd, hall.minX + t / 2, WALL_H / 2, hcz, hallGroup);
  box(hallWall, t, WALL_H, hd, hall.maxX - t / 2, WALL_H / 2, hcz, hallGroup);
  box(hallWall, hw, WALL_H, t, hcx, WALL_H / 2, hall.minZ + t / 2, hallGroup);
  // The game's doorway, or the prototypes' stand-in door.
  const way = game ? bridgeDoor() : door;
  const dw = way.width;
  const left = way.x - dw / 2 - hall.minX;
  const right = hall.maxX - (way.x + dw / 2);
  box(
    hallWall,
    left,
    WALL_H,
    t,
    hall.minX + left / 2,
    WALL_H / 2,
    door.z,
    hallGroup,
  );
  box(
    hallWall,
    right,
    WALL_H,
    t,
    hall.maxX - right / 2,
    WALL_H / 2,
    door.z,
    hallGroup,
  );
  box(
    hallWall,
    dw,
    WALL_H - way.height,
    t,
    way.x,
    (WALL_H + way.height) / 2,
    door.z,
    hallGroup,
  );
  // The door: standing in for the corridor's, shut (no way through), in
  // the prototypes; in the game the room hangs the corridor's doors.
  const doorSet = decor(
    new Group(),
    'Doorway (stands in for the corridor door)',
  );
  if (!game) hallGroup.add(doorSet);
  box(
    paint('#2a2522', 0.5, 0.3),
    dw - 0.06,
    door.height - 0.03,
    0.05,
    door.x,
    door.height / 2,
    door.z,
    doorSet,
  );
  box(
    brass,
    0.3,
    0.08,
    0.02,
    door.x - dw / 2 + 0.2,
    1.05,
    door.z - 0.04,
    doorSet,
  );
  for (const s of [-1, 1])
    box(
      fin,
      0.06,
      door.height,
      t + 0.04,
      door.x + (s * (dw + 0.06)) / 2,
      door.height / 2,
      door.z,
      doorSet,
    );
  // The spine between the lanes, full height.
  const sp = spine();
  box(
    hallWall,
    sp.maxX - sp.minX,
    WALL_H,
    sp.maxZ - sp.minZ,
    (sp.minX + sp.maxX) / 2,
    WALL_H / 2,
    (sp.minZ + sp.maxZ) / 2,
    hallGroup,
  );
  // The space under the second flight and the north landing, closed off.
  const { side } = lanes();
  box(
    hallWall,
    side.maxX - side.minX,
    2.3,
    STAIR.topZ + plan.south - (STAIR.topZ - STAIR.landing) - STAIR.topZ,
    (side.minX + side.maxX) / 2,
    1.15,
    (STAIR.topZ - STAIR.landing + plan.south) / 2,
    hallGroup,
  );

  // The flights: each step a solid riser block, a brass nosing, and a
  // sloping waist under them; a handrail each side at 0.9 m over the
  // nosings' line, on brackets.
  const r = riserHeight();
  const g = STAIR.going;
  for (const f of flights) {
    const y = f.surface.y;
    const a = f.surface.area;
    const dir = Math.sign(y.at1 - y.at0);
    const w = a.maxX - a.minX;
    const cx = (a.minX + a.maxX) / 2;
    const flight = decor(new Group(), f.name);
    hallGroup.add(flight);
    for (let k = 1; k < f.risers; k++) {
      const z0 = y.at0 + dir * (k - 1) * g;
      const top = y.y0 + k * r;
      box(
        stone,
        w,
        r + 0.02,
        g,
        cx,
        top - r / 2 - 0.01,
        z0 + (dir * g) / 2,
        flight,
      );
      box(brass, w, 0.015, 0.03, cx, top + 0.002, z0 + dir * 0.015, flight);
    }
    // The waist.
    const run = Math.abs(y.at1 - y.at0);
    const rise = (f.risers - 1) * r;
    const len = Math.hypot(run, rise);
    const waist = box(
      stone,
      w,
      0.2,
      len,
      cx,
      y.y0 + r / 2 + rise / 2 - 0.2,
      (y.at0 + y.at1) / 2,
      flight,
    );
    waist.rotation.x = Math.atan2(-rise, dir * run);
    // Handrails, each side, sloping with the nosings, and level stubs at each end.
    const n0 = { z: y.at0, y: y.y0 + r };
    const n1 = { z: y.at1, y: y.y0 + f.risers * r };
    for (const x of [a.minX + 0.06, a.maxX - 0.06]) {
      const dz = n1.z - n0.z;
      const dy = n1.y - n0.y;
      const l = Math.hypot(dz, dy);
      const rail = new Mesh(new CylinderGeometry(0.025, 0.025, l, 10), steel);
      rail.position.set(x, (n0.y + n1.y) / 2 + 0.9, (n0.z + n1.z) / 2);
      rail.rotation.x = Math.PI / 2 - Math.atan2(dy, dz);
      rail.name = 'Handrail';
      flight.add(rail);
      for (let k = 0; k <= 4; k++) {
        const s = k / 4;
        box(
          steel,
          0.02,
          0.08,
          0.02,
          x + (x < cx ? -0.04 : 0.04),
          n0.y + dy * s + 0.86,
          n0.z + dz * s,
          flight,
        );
      }
    }
  }
  // The landings.
  for (const l of landings) {
    const a = l.area;
    const y = l.y as number;
    decor(
      box(
        stone,
        a.maxX - a.minX,
        0.25,
        a.maxZ - a.minZ,
        (a.minX + a.maxX) / 2,
        y - 0.125,
        (a.minZ + a.maxZ) / 2,
        hallGroup,
      ),
      l.name,
    );
    // Handrails round its walls, level, at 0.9 m.
    const lr = new Mesh(
      new CylinderGeometry(0.025, 0.025, a.maxX - a.minX - 0.1, 10),
      steel,
    );
    lr.rotation.z = Math.PI / 2;
    const backZ = l.name.startsWith('North') ? a.minZ + 0.06 : a.maxZ - 0.06;
    lr.position.set((a.minX + a.maxX) / 2, y + 0.9, backZ);
    hallGroup.add(lr);
  }
  // The south landing's open edge over the approach: a balustrade, 1.1 m.
  const south = landings[1].area;
  balustrade(
    { x: south.minX, z: south.maxZ },
    { x: south.maxX, z: south.maxZ },
    landings[1].y as number,
    hallGroup,
  );
  // Its light: warm wall lights at each landing and over the door.
  for (const [x, y, z] of [
    [hall.maxX - t - 0.05, 2.4, door.z - 1.2],
    [
      hall.minX + t + 0.05,
      (landings[0].y as number) + 2.2,
      (landings[0].area.minZ + landings[0].area.maxZ) / 2,
    ],
    [
      hall.minX + t + 0.05,
      (landings[1].y as number) + 1.8,
      (landings[1].area.minZ + landings[1].area.maxZ) / 2,
    ],
  ] as const) {
    box(downlight, 0.06, 0.12, 0.4, x, y, z, hallGroup);
    const light = new PointLight('#ffd7a8', 5 * metre * metre, 10 * metre, 2);
    light.position.set(x + (x < hcx ? 0.4 : -0.4), y, z);
    hallGroup.add(light);
  }
  // The title card, on the approach's east wall, at eye height.
  const card = sign(1.6, 0.42, [
    title,
    game
      ? `the plant's control room · ${STOREY} m up`
      : `${CONTROL_ROOM.front} m big wall · ${STOREY} m up · placeholders only`,
  ]);
  card.position.set(hall.maxX - t - 0.005, 1.7, door.z - 1.6);
  card.rotation.y = -Math.PI / 2;
  hallGroup.add(card);

  // ------------------------------------------------------------- the room
  const room = roomPolygon();
  const roomGroup = decor(new Group(), 'Control room shell');
  group.add(roomGroup);
  const H = CONTROL_ROOM.ceiling;
  const top = STOREY + H;
  // The floor, round the opening: polished, dark, reflective.
  const floorShape = flatShape(room);
  floorShape.holes.push(
    flatPath([
      { x: opening.minX, z: opening.minZ },
      { x: opening.maxX, z: opening.minZ },
      { x: opening.maxX, z: opening.maxZ },
      { x: opening.minX, z: opening.maxZ },
    ]),
  );
  roomGroup.add(slab(floorShape, STOREY - 0.3, 0.3, gloss));
  // The ceiling, and its deep coffers: a grid of dark beams, a warm
  // downlight in each coffer.
  const ceilingShape = flatShape(room);
  // On the bridge, an oval opening over the command area for its dome.
  if (bridge) {
    const c0 = chairPlace();
    const hole = new Path();
    hole.absellipse(c0.x, -c0.z, 4.5, 3.5, 0, Math.PI * 2, false, 0);
    ceilingShape.holes.push(hole);
  }
  roomGroup.add(slab(ceilingShape, top, 0.3, ceilingMat));
  const xs = room.map((p) => p.x);
  const zs = room.map((p) => p.z);
  const [minX, maxX, minZ, maxZ] = [
    Math.min(...xs),
    Math.max(...xs),
    Math.min(...zs),
    Math.max(...zs),
  ];
  if (bridge) {
    // The bridge's ceiling: a lit dome over the command area, glossy black
    // panels round it, ribs fanning forward, coves (`bridge-dressing.ts`).
    roomGroup.add(
      bridgeCeiling(dressing!, {
        room,
        centre: chairPlace(),
        top,
        floor: STOREY,
        metre,
      }),
    );
  } else {
    // The lair's: deep triangular coffers in dark concrete (after the War
    // Room's), beams three ways, a warm downlight in some.
    const bay = 3.6;
    const span = Math.hypot(maxX - minX, maxZ - minZ) + 4;
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    for (const angle of [0, Math.PI / 3, (2 * Math.PI) / 3]) {
      const nx = -Math.sin(angle);
      const nz = Math.cos(angle);
      for (let k = -Math.ceil(span / 2 / bay); k <= span / 2 / bay; k++) {
        const b = box(
          beam,
          span,
          1.4,
          0.3,
          cx + nx * k * bay,
          top - 0.7,
          cz + nz * k * bay,
          roomGroup,
        );
        b.rotation.y = -angle;
      }
    }
    for (let x = Math.ceil(minX / bay) * bay + bay / 2; x < maxX; x += bay * 2)
      for (let z = minZ + bay / 2; z < maxZ; z += bay * 2)
        if (insideRoom(x, z, 0.6)) {
          const d = new Mesh(
            new CylinderGeometry(0.1, 0.1, 0.02, 16),
            downlight,
          );
          d.position.set(x, top - 0.01, z);
          roomGroup.add(d);
        }
  }
  // The walls: the lair's dark, with raked steel fins between the
  // consoles; the bridge's beige, in light grey panels.
  const T = CONTROL_ROOM.wall;
  for (const [a, b] of sides(room)) {
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const n = inward(a, b);
    const yaw = Math.atan2(b.z - a.z, b.x - a.x);
    const wall = box(
      darkWall,
      len + T * 2,
      H + 0.3,
      T,
      (a.x + b.x) / 2 - (n.x * T) / 2,
      STOREY + H / 2,
      (a.z + b.z) / 2 - (n.z * T) / 2,
      roomGroup,
    );
    wall.rotation.y = -yaw;
    // A skirting of brass, and a fin every 2.4 m raked back toward the top.
    const sk = box(
      trim,
      len,
      0.06,
      0.02,
      (a.x + b.x) / 2 + n.x * 0.01,
      STOREY + 0.03,
      (a.z + b.z) / 2 + n.z * 0.01,
      roomGroup,
    );
    sk.rotation.y = -yaw;
    const count = Math.floor(len / 2.4);
    for (let k = 1; k < count; k++) {
      const s = k / count;
      const px = a.x + (b.x - a.x) * s;
      const pz = a.z + (b.z - a.z) * s;
      const f = box(
        fin,
        bridge ? 0.06 : 0.12,
        H,
        bridge ? 0.04 : 0.35,
        px + n.x * (bridge ? 0.02 : 0.17),
        STOREY + H / 2,
        pz + n.z * (bridge ? 0.02 : 0.17),
        roomGroup,
      );
      f.rotation.y = -yaw;
      if (!bridge) f.rotateX(0.04);
    }
  }
  // The guard round the opening: glass in a stainless frame, 1.1 m.
  const guard = decor(new Group(), 'Guard round the stair opening');
  roomGroup.add(guard);
  balustrade(
    { x: opening.minX, z: opening.minZ },
    { x: opening.minX, z: opening.maxZ },
    STOREY,
    guard,
  );
  balustrade(
    { x: opening.maxX, z: opening.minZ },
    { x: opening.maxX, z: opening.maxZ },
    STOREY,
    guard,
  );
  balustrade(
    { x: opening.minX, z: opening.maxZ },
    { x: opening.maxX, z: opening.maxZ },
    STOREY,
    guard,
  );
  // The opening's edges, brass.
  for (const x of [opening.minX, opening.maxX])
    box(
      brass,
      0.03,
      0.3,
      opening.maxZ - opening.minZ,
      x,
      STOREY - 0.15,
      (opening.minZ + opening.maxZ) / 2,
      guard,
    );

  // ------------------------------------------------------------- the stage
  const edge = platformEdge();
  const stage = decor(new Group(), 'Raised stage');
  roomGroup.add(stage);
  const ph = PLATFORM.height;
  // Its front a horseshoe round the command area (mission 095).
  const arc = horseshoePoints(room[5].x, room[3].x, 0.3);
  stage.add(
    slab(flatShape([room[3], room[4], room[5], ...arc]), STOREY, ph, gloss),
  );
  const half = PLATFORM.stepWidth / 2;
  const rr = ph / PLATFORM.risers;
  const e0 = edgeAt(0);
  for (let k = 1; k < PLATFORM.risers; k++) {
    const z0 = e0 - (PLATFORM.risers - k) * PLATFORM.going;
    box(
      gloss,
      PLATFORM.stepWidth,
      k * rr,
      PLATFORM.going + 0.08,
      0,
      STOREY + (k * rr) / 2,
      z0 + PLATFORM.going / 2 + 0.04,
      stage,
    );
    box(
      bridge ? dressing!.silver : trim,
      PLATFORM.stepWidth,
      0.012,
      0.03,
      0,
      STOREY + k * rr + 0.004,
      z0 + 0.015,
      stage,
    );
  }
  // The stage's guard along its open front (a drop over 600 mm), and
  // handrails both sides of its steps, along the horseshoe.
  // After the starship bridge (a style cue only): a solid parapet on a
  // beige plinth, capped with a light oak rail with black and silver
  // accents, burgundy carpet down the stage's face.
  // The lair's the same in black lacquer and brushed steel, plain.
  const { top: rampTop, end: rampEnd } = RAMP;
  for (const [a, b] of bridge
    ? [
        [room[5].x + 0.3, -rampTop],
        [-rampEnd, -half],
        [half, rampEnd],
        [rampTop, room[3].x - 0.3],
      ]
    : [
        [room[5].x + 0.3, -half],
        [half, room[3].x - 0.3],
      ])
    parapet(horseshoePoints(a, b, 0.3));
  // The stage's face where no parapet stands on it: the steps' sides and
  // the ramps' landings.
  if (bridge) for (const s2 of [-1, 1]) ramp(s2);
  const foot = edgeAt(half) - (PLATFORM.risers - 1) * PLATFORM.going;
  for (const x of [-half, half]) {
    const top0 = edgeAt(half);
    const dz = top0 - foot;
    const rail = new Mesh(
      new CylinderGeometry(0.025, 0.025, Math.hypot(dz, ph - rr), 10),
      bridge ? dressing!.oak(1) : steel,
    );
    rail.position.set(x, STOREY + (rr + ph) / 2 + 0.9, (top0 + foot) / 2);
    rail.rotation.x = Math.PI / 2 - Math.atan2(ph - rr, dz);
    rail.name = 'Handrail';
    stage.add(rail);
    for (const [z, y] of [
      [foot, rr],
      [(foot + top0) / 2, (rr + ph) / 2],
      [top0, ph],
    ] as const)
      box(steel, 0.04, 0.9, 0.04, x, STOREY + y + 0.45, z, stage);
  }
  // The conference table, long and black, and its chairs.
  const tbl = conferenceTable();
  const table = decor(new Group(), 'Conference table');
  stage.add(table);
  const ty = STOREY + ph;
  box(
    bridge ? wood : lacquer,
    tbl.maxX - tbl.minX,
    0.06,
    tbl.maxZ - tbl.minZ,
    0,
    ty + 0.74,
    CONFERENCE.z,
    table,
  );
  box(
    trim,
    tbl.maxX - tbl.minX + 0.01,
    0.02,
    tbl.maxZ - tbl.minZ + 0.01,
    0,
    ty + 0.71,
    CONFERENCE.z,
    table,
  );
  for (const x of [tbl.minX + 0.8, tbl.maxX - 0.8])
    box(fin, 0.5, 0.7, 0.6, x, ty + 0.35, CONFERENCE.z, table);
  const leather = bridge
    ? paint('#8a7f72', 0.8, 0)
    : paint('#2a1712', 0.45, 0.05);
  for (const c of conferenceChairs())
    table.add(chair(leather, c, ty, 'Chair', 'conference'));

  // ------------------------------------------------------------- the desk
  const desk = decor(new Group(), 'Operator desk (placeholder)');
  roomGroup.add(desk);
  const cream = bridge
    ? paint('#d9d2bd', 0.55, 0.05)
    : paint('#8d949a', 0.3, 0.7);
  const charcoal = bridge ? paint('#55504a', 0.7, 0.05) : lacquer;
  // On the bridge an idle screen in its style (the owner asked what the flat
  // teal ones were: placeholders); the lair's keep their teal glow.
  const insetScreen = dressing
    ? idleScreen(kit)
    : glow('#3ab0a0', 0.55, '#071312');
  const insetPanel = paint('#8f8b80', 0.6, 0.15);
  for (const s of deskSegments()) {
    const [P0, P1] = s.outer;
    const [Q0, Q1] = s.inner;
    const at = (p: Point, q: Point, f: number): Point => ({
      x: p.x + (q.x - p.x) * f,
      z: p.z + (q.z - p.z) * f,
    });
    const U0 = at(P0, Q0, 0.3);
    const U1 = at(P1, Q1, 0.3);
    const K0 = at(P0, Q0, 0.6);
    const K1 = at(P1, Q1, 0.6);
    const y0 = STOREY;
    // The body, charcoal, to the knee space; a black kick plinth.
    desk.add(
      hexa(
        [P0, P1, K1, K0],
        [y0, y0, y0, y0],
        [y0 + 0.72, y0 + 0.72, y0 + 0.72, y0 + 0.72],
        charcoal,
      ),
    );
    // The sloping top, cream, from the upstand to the operator's edge.
    desk.add(
      hexa(
        [U0, U1, Q1, Q0],
        [y0 + 0.72, y0 + 0.72, y0 + 0.7, y0 + 0.7],
        [y0 + 0.9, y0 + 0.9, y0 + 0.76, y0 + 0.76],
        cream,
      ),
    );
    // The raised upstand behind, its face raked back toward the top.
    const R0 = at(P0, Q0, 0.18);
    const R1 = at(P1, Q1, 0.18);
    desk.add(
      hexa(
        [P0, P1, U1, U0],
        [y0 + 0.72, y0 + 0.72, y0 + 0.72, y0 + 0.72],
        [y0 + 1.45, y0 + 1.45, y0 + 0.9, y0 + 0.9],
        cream,
        [P0, P1, R1, R0],
      ),
    );
    // Its screens, set into the raked face, and panel insets in the top.
    const face = (u: number, v: number): [Point, number] => {
      const bottom = at(U0, U1, u);
      const tp = at(R0, R1, u);
      return [at(bottom, tp, v), y0 + 0.9 + (1.45 - 0.9) * v];
    };
    const len = Math.hypot(P1.x - P0.x, P1.z - P0.z);
    const screens = Math.max(1, Math.round(len / 1.4));
    const n = inward(P0, P1);
    for (let k = 0; k < screens; k++) {
      const u0 = (k + 0.18) / screens;
      const u1 = (k + 0.82) / screens;
      const c = [face(u0, 0.2), face(u1, 0.2), face(u1, 0.85), face(u0, 0.85)];
      desk.add(
        dressing ? screenQuad(c, n, insetScreen) : inset(c, n, insetScreen),
      );
      // A blank control panel in the top below it.
      const tp = (u: number, v: number): [Point, number] => {
        const outer = at(U0, U1, u);
        const inner = at(Q0, Q1, u);
        return [at(outer, inner, v), y0 + 0.9 + (0.76 - 0.9) * v];
      };
      // In the game, the front segment's top is Central Control's.
      if (!(game && s.side === 0))
        desk.add(
          inset(
            [tp(u0, 0.15), tp(u1, 0.15), tp(u1, 0.6), tp(u0, 0.6)],
            { x: 0, z: 0 },
            insetPanel,
            true,
          ),
        );
    }
  }
  // Dark cheeks at the two open ends.
  const segs = deskSegments();
  for (const [s, end] of [
    [segs.find((x) => x.side === 2)!, 1],
    [segs.find((x) => x.side === 5)!, 0],
  ] as const) {
    const P = s.outer[end];
    const Q = s.inner[end];
    const along = end === 1 ? -1 : 1;
    const dx = (s.outer[1].x - s.outer[0].x) * 0.02 * along;
    const dz = (s.outer[1].z - s.outer[0].z) * 0.02 * along;
    const P2 = { x: P.x + dx, z: P.z + dz };
    const Q2 = { x: Q.x + dx, z: Q.z + dz };
    desk.add(
      hexa(
        [P, P2, Q2, Q],
        [STOREY, STOREY, STOREY, STOREY],
        [STOREY + 1.47, STOREY + 1.47, STOREY + 0.78, STOREY + 0.78],
        charcoal,
      ),
    );
  }
  // The operator's red swivel chair.
  const c = chairPlace();
  desk.add(
    chair(
      paint('#a32a22', 0.5, 0.05),
      { x: c.x, z: c.z, yaw: Math.PI },
      STOREY,
      'Operator chair',
      'command',
    ),
  );
  // On the bridge, a pair of chairs either side of the operator's.
  if (bridge)
    for (const dx of [-1.3, 1.3])
      desk.add(
        chair(
          paint('#6f6458', 0.8, 0),
          { x: c.x + dx * 1.15, z: c.z + 0.5, yaw: Math.PI },
          STOREY,
          'Chair',
          'beside',
        ),
      );
  if (bridge) stations();

  // ------------------------------------------------------ the ring light
  // The lair's alone: a ring of photo-flood lamps on a dark steel hoop,
  // low over the desk, lighting it in a pool while the rest falls dark.
  const ring = decor(new Group(), 'Ring light (Strangelove)');
  if (!bridge) roomGroup.add(ring);
  const rc = ringLightCentre();
  const ry = STOREY + RING_LIGHT.height;
  const R = RING_LIGHT.diameter / 2;
  const tube = new Mesh(
    new TorusGeometry(R, 0.09, 12, 96),
    glow('#fff1d6', 0.7, '#3a352c'),
  );
  tube.rotation.x = Math.PI / 2;
  tube.position.set(rc.x, ry, rc.z);
  ring.add(tube);
  const lamp = glow('#fff4e0', 1.1, '#d8d0c0');
  for (let k = 0; k < 48; k++) {
    const a = (k / 48) * Math.PI * 2;
    const bulb = new Mesh(new CylinderGeometry(0.11, 0.07, 0.12, 12), lamp);
    bulb.position.set(rc.x + Math.cos(a) * R, ry - 0.1, rc.z + Math.sin(a) * R);
    ring.add(bulb);
  }
  const housing = new Mesh(new TorusGeometry(R, 0.16, 8, 96, Math.PI * 2), fin);
  housing.rotation.x = Math.PI / 2;
  housing.scale.set(1, 1, 0.5);
  housing.position.set(rc.x, ry + 0.12, rc.z);
  ring.add(housing);
  for (let k = 0; k < RING_LIGHT.hangers; k++) {
    const a = (k / RING_LIGHT.hangers) * Math.PI * 2;
    const rod = new Mesh(
      new CylinderGeometry(0.015, 0.015, top - ry, 6),
      steel,
    );
    rod.position.set(
      rc.x + Math.cos(a) * R,
      (top + ry) / 2,
      rc.z + Math.sin(a) * R,
    );
    ring.add(rod);
  }
  // Its pool of light on the desk: lights round the ring, and one down.
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const light = new PointLight('#ffe9c8', 9 * metre * metre, 14 * metre, 2);
    light.position.set(
      rc.x + Math.cos(a) * R,
      ry - 0.25,
      rc.z + Math.sin(a) * R,
    );
    ring.add(light);
  }
  const spot = new SpotLight(
    '#fff0d8',
    60 * metre * metre,
    20 * metre,
    0.55,
    0.6,
    2,
  );
  spot.position.set(rc.x, top - 0.6, rc.z);
  spot.target.position.set(rc.x, STOREY, rc.z);
  ring.add(spot, spot.target);

  // ------------------------------------------------------ the placeholders
  const eras: Record<string, { body: string; face: string; glow: number }> = {
    '1980s': { body: '#8c8370', face: '#c8642f', glow: 0.25 },
    '1990s': { body: '#bdbab1', face: '#3f8f6a', glow: 0.35 },
    '2010s': { body: '#0c0d0f', face: '#2f63c0', glow: 0.38 },
  };
  for (const p0 of PLACEHOLDERS) {
    // The bridge's big wall is one full-height viewscreen.
    const screen = bridge && p0.side === 0;
    // In the game, the room's own consoles stand where the placeholders were.
    if (game && !screen) continue;
    const p = screen
      ? {
          ...p0,
          label: 'VIEWSCREEN',
          note: 'the main display, full height: the plant, animated',
          bottom: 0.5,
          height: H - 1.2,
        }
      : p0;
    const look = eras[p.era];
    const holder = decor(new Group(), `${p.label} (placeholder)`);
    roomGroup.add(holder);
    const corners = placeholderCorners(p);
    const fy = STOREY + placeholderFloor(p.side);
    const y0 = fy + p.bottom;
    const y1 = y0 + p.height;
    holder.add(
      hexa(
        corners,
        [y0, y0, y0, y0],
        [y1, y1, y1, y1],
        paint(look.body, 0.6, 0.2),
      ),
    );
    // Its face, glowing faintly in its era's colour.
    const [a, b] = sides(room)[p.side];
    const n = inward(a, b);
    const f = (s: number, v: number): [Point, number] => {
      const front0 = corners[3];
      const front1 = corners[2];
      return [
        {
          x: front0.x + (front1.x - front0.x) * s,
          z: front0.z + (front1.z - front0.z) * s,
        },
        y0 + p.height * v,
      ];
    };
    holder.add(
      inset(
        [f(0.03, 0.08), f(0.97, 0.08), f(0.97, 0.92), f(0.03, 0.92)],
        n,
        screen ? starfield() : glow(look.face, look.glow, '#0a0a0a'),
      ),
    );
    // Its label, at eye height or on its top.
    const label = sign(Math.min(3.2, p.width * 0.8), 0.5, [p.label, p.note]);
    const mid = {
      x: (corners[2].x + corners[3].x) / 2,
      z: (corners[2].z + corners[3].z) / 2,
    };
    const ly = screen
      ? y0 + 0.5
      : p.height > 1.6
        ? y0 + Math.min(p.height - 0.4, 1.7 - p.bottom + 0.4)
        : y1 + 0.4;
    label.position.set(mid.x + n.x * 0.04, ly, mid.z + n.z * 0.04);
    label.rotation.y = Math.atan2(n.x, n.z);
    holder.add(label);
  }
  // A low warm wash from the coffers, over the whole floor and the
  // stage: dim in the lair, where the desk's pool and the displays are
  // the light; soft and even on the bridge.
  if (bridge) {
    const sky = new HemisphereLight('#ffeedd', '#7a5a48', 0.75);
    roomGroup.add(sky);
    const d = dressing!;
    // The carpet's darker ring round the command area.
    roomGroup.add(carpetRing(d, chairPlace(), STOREY, 7.2));
    // The chaser lights along the viewscreen's foot, out from the middle.
    roomGroup.add(
      chaserLights(
        kit,
        { x: -10, z: room[0].z + 0.18 },
        { x: 10, z: room[0].z + 0.18 },
        STOREY + 0.3,
      ),
    );
    // A light strip along the back walls, over the aft consoles, to light faces.
    for (const side of [3, 4]) {
      const [a, b] = sides(room)[side];
      const n = inward(a, b);
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      const strip = box(
        d.cove,
        len - 1.2,
        0.04,
        0.06,
        (a.x + b.x) / 2 + n.x * 0.25,
        STOREY + PLATFORM.height + 2.55,
        (a.z + b.z) / 2 + n.z * 0.25,
        roomGroup,
      );
      strip.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
      const hood = box(
        d.beige,
        len - 1.0,
        0.1,
        0.3,
        (a.x + b.x) / 2 + n.x * 0.15,
        STOREY + PLATFORM.height + 2.62,
        (a.z + b.z) / 2 + n.z * 0.15,
        roomGroup,
      );
      hood.rotation.y = strip.rotation.y;
    }
  }
  // The lair's: a dim warm wash from the coffers (the bridge's lights are its ceiling's).
  if (!bridge)
    for (const [x, z] of [
      [-8, room[0].z + 3],
      [8, room[0].z + 3],
      [-9, -1],
      [9, -1],
      [-4, (edge + room[4].z) / 2],
      [4, (edge + room[4].z) / 2],
    ] as const) {
      const light = new PointLight(
        bridge ? '#fff0dc' : '#ffc98f',
        (bridge ? 22 : 3.5) * metre * metre,
        22 * metre,
        2,
      );
      light.position.set(x, STOREY + 7.4, z);
      roomGroup.add(light);
    }

  return group;

  // ---------------------------------------------------------- helpers
  function insideRoom(x: number, z: number, margin: number) {
    return sides(room).every(([a, b]) => {
      const n = inward(a, b);
      return (x - a.x) * n.x + (z - a.z) * n.z > margin;
    });
  }
  /** A plan polygon as a shape whose y is −z, for a slab turned flat. */
  function flatShape(points: readonly Point[]) {
    const s = new Shape();
    points.forEach((p, i) => (i ? s.lineTo(p.x, -p.z) : s.moveTo(p.x, -p.z)));
    s.closePath();
    return s;
  }
  function flatPath(points: readonly Point[]) {
    const s = new Path();
    points.forEach((p, i) => (i ? s.lineTo(p.x, -p.z) : s.moveTo(p.x, -p.z)));
    s.closePath();
    return s;
  }
  /** A flat slab of `shape`, `depth` thick, its underside at `y`. */
  function slab(shape: Shape, y: number, depth: number, m: Material) {
    const mesh = new Mesh(
      new ExtrudeGeometry(shape, { depth, bevelEnabled: false }),
      m,
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = y;
    return mesh;
  }
  /**
   * A solid on plan quadrilateral `foot` (its top over `head`, if
   * given), each corner's bottom and top heights its own.
   */
  function hexa(
    foot: readonly Point[],
    bottom: readonly number[],
    tops: readonly number[],
    m: Material,
    head: readonly Point[] = foot,
  ) {
    const b = foot.map((p, i) => new Vector3(p.x, bottom[i], p.z));
    const u = head.map((p, i) => new Vector3(p.x, tops[i], p.z));
    const faces = [
      [b[0], b[1], b[2], b[3]],
      [u[0], u[1], u[2], u[3]],
      [b[0], b[1], u[1], u[0]],
      [b[1], b[2], u[2], u[1]],
      [b[2], b[3], u[3], u[2]],
      [b[3], b[0], u[0], u[3]],
    ];
    const centre = [...b, ...u]
      .reduce((s, v) => s.add(v), new Vector3())
      .multiplyScalar(1 / 8);
    const pos: number[] = [];
    for (const [p, q, r2, s] of faces)
      for (const tri of [
        [p, q, r2],
        [p, r2, s],
      ]) {
        const normal = new Vector3()
          .subVectors(tri[1], tri[0])
          .cross(new Vector3().subVectors(tri[2], tri[0]));
        const mid = new Vector3()
          .add(tri[0])
          .add(tri[1])
          .add(tri[2])
          .multiplyScalar(1 / 3);
        const out = normal.dot(mid.sub(centre)) >= 0;
        for (const v of out ? tri : [tri[0], tri[2], tri[1]])
          pos.push(v.x, v.y, v.z);
      }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(pos, 3));
    geometry.computeVertexNormals();
    return new Mesh(geometry, m);
  }
  /** A flat screen on a face given by its corners (left foot, right foot, right head, left head), `n` off it, mapped for its picture. */
  function screenQuad(corners: [Point, number][], n: Point, m: Material) {
    const p = corners.map(([q, y]) => [
      q.x + n.x * 0.016,
      y,
      q.z + n.z * 0.016,
    ]);
    const g = new BufferGeometry();
    g.setAttribute(
      'position',
      new Float32BufferAttribute(
        [0, 1, 2, 0, 2, 3].flatMap((i) => p[i]),
        3,
      ),
    );
    const uv = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ];
    g.setAttribute(
      'uv',
      new Float32BufferAttribute(
        [0, 1, 2, 0, 2, 3].flatMap((i) => uv[i]),
        2,
      ),
    );
    g.computeVertexNormals();
    const mesh = new Mesh(g, m);
    (m as MeshStandardMaterial).side = 2;
    return mesh;
  }
  /** A thin inset on a face given by its corners, standing `n` (or up) off it. */
  function inset(
    corners: [Point, number][],
    n: Point,
    m: Material,
    up = false,
  ) {
    const off = (d: number) =>
      corners.map(([p]) => ({
        x: p.x + (up ? 0 : n.x * d),
        z: p.z + (up ? 0 : n.z * d),
      }));
    const ys = corners.map(([, y]) => y);
    if (up)
      return hexa(
        off(0),
        ys.map((y) => y + 0.002),
        ys.map((y) => y + 0.012),
        m,
      );
    return hexa(off(0.004), ys, ys, m, off(0.014));
  }
  /** A glass balustrade from a to b on a floor at `y`: stainless posts and top rail, 1.1 m. */
  function balustrade(a: Point, b: Point, y: number, parent: Object3D) {
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const yaw = -Math.atan2(b.z - a.z, b.x - a.x);
    const mid = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
    const rail = box(steel, len, 0.05, 0.06, mid.x, y + 1.1, mid.z, parent);
    rail.rotation.y = yaw;
    rail.name = 'Guard rail';
    const pane = box(
      glass,
      len - 0.05,
      0.95,
      0.015,
      mid.x,
      y + 0.6,
      mid.z,
      parent,
    );
    pane.rotation.y = yaw;
    const posts = Math.max(1, Math.ceil(len / 1.2));
    for (let k = 0; k <= posts; k++) {
      const s = k / posts;
      box(
        steel,
        0.05,
        1.1,
        0.05,
        a.x + (b.x - a.x) * s,
        y + 0.55,
        a.z + (b.z - a.z) * s,
        parent,
      );
    }
  }
  /**
   * The stage's front along a polyline of the horseshoe: on the bridge a
   * burgundy carpeted face, a beige parapet on it, a light oak cap rail
   * with a black and a silver line under it, and rounded colour bars
   * along its face; the lair's black lacquer and a steel cap.
   */
  function parapet(points: readonly Point[]) {
    const lengths: number[] = [0];
    for (let i = 1; i < points.length; i++)
      lengths.push(
        lengths[i - 1] +
          Math.hypot(
            points[i].x - points[i - 1].x,
            points[i].z - points[i - 1].z,
          ),
      );
    const oak = bridge ? dressing!.oak(1) : null;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      const len = Math.hypot(b.x - a.x, b.z - a.z) + 0.02;
      const yaw = -Math.atan2(b.z - a.z, b.x - a.x);
      const mid = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
      const piece = (
        m: Material,
        h: number,
        d: number,
        y: number,
        dz: number,
      ) => {
        const p = box(m, len, h, d, mid.x, y, mid.z + dz, stage);
        p.rotation.y = yaw;
        return p;
      };
      if (!bridge) {
        piece(lacquer, ph + 1.05, 0.12, STOREY + (ph + 1.05) / 2, 0.06);
        piece(steel, 0.05, 0.2, STOREY + ph + 1.08, 0.06).name = 'Guard rail';
        continue;
      }
      const d = dressing!;
      // The stage's face, burgundy carpet; the parapet's beige plinth.
      piece(d.burgundy, ph, 0.04, STOREY + ph / 2, -0.02);
      piece(d.beige, 1.0, 0.14, STOREY + ph + 0.5, 0.06);
      // Its cap: light oak, wide and rounded, a black line and a silver one under it.
      piece(d.black, 0.03, 0.18, STOREY + ph + 1.015, 0.06);
      piece(d.silver, 0.012, 0.16, STOREY + ph + 0.99, 0.06);
      const cap = piece(oak!, 0.08, 0.3, STOREY + ph + 1.07, 0.06);
      cap.name = 'Guard rail';
    }
    if (!bridge) return;
    // Rounded colour bars along the parapet's face, by length along it.
    const colours = ['#e49a4c', '#c890c8', '#9aa6e0', '#e2b77a'];
    const total = lengths[lengths.length - 1];
    const at = (d: number) => {
      let i = 1;
      while (i < lengths.length - 1 && lengths[i] < d) i++;
      const t = (d - lengths[i - 1]) / (lengths[i] - lengths[i - 1] || 1);
      const a = points[i - 1];
      const b = points[i];
      return {
        x: a.x + (b.x - a.x) * t,
        z: a.z + (b.z - a.z) * t,
        yaw: -Math.atan2(b.z - a.z, b.x - a.x),
      };
    };
    let x = 0.3;
    let k = 0;
    while (x < total - 0.6) {
      const w = Math.min(total - 0.3 - x, 0.6 + ((k * 7) % 5) * 0.35);
      const m = colourBar[colours[k % colours.length]];
      // In short pieces, so each follows the curve.
      const pieces = Math.max(1, Math.ceil(w / 0.3));
      for (let j = 0; j < pieces; j++) {
        const s0 = x + 0.06 + ((w - 0.12) * j) / pieces;
        const s1 = x + 0.06 + ((w - 0.12) * (j + 1)) / pieces;
        const p = at((s0 + s1) / 2);
        const bar = box(
          m,
          s1 - s0 + 0.01,
          0.12,
          0.01,
          p.x,
          STOREY + ph + 0.75,
          p.z - 0.015,
          stage,
        );
        bar.rotation.y = p.yaw;
      }
      for (const e of [x + 0.06, x + w - 0.06]) {
        const p = at(e);
        const cap = new Mesh(new CylinderGeometry(0.06, 0.06, 0.01, 16), m);
        cap.rotation.x = Math.PI / 2;
        cap.position.set(p.x, STOREY + ph + 0.75, p.z - 0.015);
        stage.add(cap);
      }
      x += w + 0.12;
      k++;
    }
  }
  /** The bridge's ramp on side `s` (−1 west, 1 east): along the horseshoe, sloping, its landing, handrails both sides. */
  function ramp(s: number) {
    const { low, end, depth, open } = RAMP;
    const steps = 40;
    const oak = dressing!.oak(1);
    const heightAt = (x: number) =>
      rampHeightAt(s * x, edgeAt(s * x) - depth / 2) ?? STOREY;
    for (let k = 0; k < steps; k++) {
      const x0 = low + ((end - low) * k) / steps;
      const x1 = low + ((end - low) * (k + 1)) / steps;
      const p = (x: number, back: number) => ({
        x: s * x,
        z: edgeAt(s * x) - back,
      });
      const quad = [p(x0, depth), p(x1, depth), p(x1, -0.02), p(x0, -0.02)];
      const y0 = heightAt(x0);
      const y1 = heightAt(x1);
      stage.add(
        hexa(
          quad,
          [STOREY, STOREY, STOREY, STOREY],
          [y0 + 0.01, y1 + 0.01, y1 + 0.01, y0 + 0.01],
          gloss,
        ),
      );
      // A handrail along its open side, 0.9 m over it: oak; a burgundy
      // carpeted kerb under it where it stands high.
      const a = p(x0, depth - 0.05);
      const b = p(x1, depth - 0.05);
      const seg = new Mesh(
        new CylinderGeometry(
          0.03,
          0.03,
          Math.hypot(b.x - a.x, b.z - a.z, y1 - y0) + 0.01,
          8,
        ),
        oak,
      );
      seg.position.set((a.x + b.x) / 2, (y0 + y1) / 2 + 0.9, (a.z + b.z) / 2);
      seg.lookAt(b.x, y1 + 0.9, b.z);
      seg.rotateX(Math.PI / 2);
      stage.add(seg);
      if (x0 <= open + 1e-6 && Math.round(x0 * 2) !== Math.round(x1 * 2))
        box(steel, 0.04, 0.9, 0.04, a.x, y0 + 0.45, a.z, stage);
    }
    // And a glass guard along its open side, where it is high enough to fall from.
    const guardPts = horseshoePoints(s * open, s * end, 0.6).map((q) => ({
      x: q.x,
      z: q.z - depth,
    }));
    for (let i = 1; i < guardPts.length; i++)
      balustrade(
        guardPts[i - 1],
        guardPts[i],
        heightAt(Math.abs(guardPts[i].x)) - 0.0,
        stage,
      );
  }
  /** The bridge's operator stations, one per pool system. */
  function stations() {
    const black = lacquer;
    for (const st of stationPlaces()) {
      const g = decor(new Group(), `${st.system} station (placeholder)`);
      roomGroup.add(g);
      const [a, b, c2, d] = st.corners;
      // A black pedestal, its top sloping up away from the operator.
      g.add(
        hexa(
          [a, b, c2, d],
          [STOREY, STOREY, STOREY, STOREY],
          [
            STOREY + STATION.low,
            STOREY + STATION.low,
            STOREY + STATION.high,
            STOREY + STATION.high,
          ],
          black,
        ),
      );
      // Rounded colour bars across its flat touch face.
      const colours = ['#e49a4c', '#c890c8', '#9aa6e0', '#e2b77a', '#d9735a'];
      const lerp = (p: Point, q: Point, t: number) => ({
        x: p.x + (q.x - p.x) * t,
        z: p.z + (q.z - p.z) * t,
      });
      // In the game its touch panel lies there instead (mission 095).
      for (let row = 0; row < (game ? 0 : 3); row++) {
        const v0 = 0.15 + row * 0.25;
        const v1 = v0 + 0.14;
        let u = 0.06;
        let k = row;
        while (u < 0.9) {
          const w = Math.min(0.94 - u, 0.14 + ((k * 5) % 4) * 0.08);
          const pt = (uu: number, vv: number): [Point, number] => [
            lerp(lerp(b, a, uu), lerp(c2, d, uu), vv),
            STOREY + STATION.low + (STATION.high - STATION.low) * vv,
          ];
          g.add(
            inset(
              [pt(u, v0), pt(u + w, v0), pt(u + w, v1), pt(u, v1)],
              { x: 0, z: 0 },
              colourBar[colours[k % 4]],
              true,
            ),
          );
          u += w + 0.03;
          k++;
        }
      }
      // Its label, standing at its far edge, facing the operator.
      const label = sign(1.6, 0.3, [st.system]);
      const mid = lerp(c2, d, 0.5);
      label.position.set(mid.x, STOREY + STATION.high + 0.2, mid.z);
      label.rotation.y = -st.yaw;
      g.add(label);
      // Its chair.
      const f = { x: Math.sin(st.yaw), z: -Math.cos(st.yaw) };
      g.add(
        chair(
          paint('#6f6458', 0.8, 0),
          { x: st.x - f.x * 0.9, z: st.z - f.z * 0.9, yaw: st.yaw + Math.PI },
          STOREY,
          'Chair',
          'station',
        ),
      );
    }
  }
  /** A dark field of stars, the viewscreen's placeholder picture. */
  function starfield() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const g = canvas.getContext('2d')!;
    const sky = g.createLinearGradient(0, 0, 0, 1024);
    sky.addColorStop(0, '#02040b');
    sky.addColorStop(1, '#0a1a2e');
    g.fillStyle = sky;
    g.fillRect(0, 0, 2048, 1024);
    let seed = 92;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < 900; k++) {
      const r = rand() < 0.9 ? 1 : 2.2;
      g.fillStyle = `rgba(255,255,255,${0.35 + rand() * 0.65})`;
      g.beginPath();
      g.arc(rand() * 2048, rand() * 1024, r, 0, Math.PI * 2);
      g.fill();
    }
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    kit.textures.push(map);
    const m = new MeshStandardMaterial({
      color: '#000000',
      emissive: '#ffffff',
      emissiveMap: map,
      emissiveIntensity: 0.9,
      roughness: 0.6,
    });
    kit.materials.push(m);
    return m;
  }
  /** A swivel chair facing `yaw` (0 faces south, π north). */
  function chair(
    m: Material,
    at: { x: number; z: number; yaw: number },
    y: number,
    name = 'Chair',
    kind: ChairKind = 'station',
  ) {
    // The bridge's are upholstered (mission 095), in warm fabrics.
    if (dressing)
      return upholsteredChair(
        dressing,
        kind === 'command' ? commandFabric! : seatFabric!,
        kind,
        at,
        y,
        name,
      );
    const c = new Group();
    c.name = name;
    c.position.set(at.x, y, at.z);
    c.rotation.y = at.yaw;
    for (let k = 0; k < 5; k++) {
      const leg = box(fin, 0.32, 0.03, 0.05, 0, 0.06, 0, c);
      leg.rotation.y = (k / 5) * Math.PI * 2;
      leg.translateX(0.16);
    }
    const post = new Mesh(new CylinderGeometry(0.03, 0.03, 0.4, 8), steel);
    post.position.y = 0.26;
    c.add(post);
    box(m, 0.5, 0.1, 0.48, 0, 0.48, 0, c);
    const back = box(m, 0.48, 0.62, 0.08, 0, 0.84, -0.24, c);
    back.rotation.x = -0.12;
    return c;
  }
  /** An engraved sign (the owner, 2026-10-26: engraved laminate, white over black). */
  function sign(cw: number, ch: number, text: string[]) {
    const rows = text.length;
    return createEngravedSign(
      kit,
      cw,
      ch,
      cutLines(
        text.map((line, i) => ({
          text: line,
          size: i === 0 ? 0.42 / rows + 0.04 : 0.13,
          y: rows === 1 ? 0.53 : i === 0 ? 0.38 : 0.72,
          bold: i === 0,
        })),
      ),
    );
  }
}
