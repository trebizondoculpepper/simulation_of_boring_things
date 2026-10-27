import {
  BoxGeometry,
  BufferGeometry,
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
  createEngravedSign,
  cutLines,
} from '../../components/general-safety/views/engraved-sign';
import {
  CONFERENCE,
  CONTROL_ROOM,
  PLACEHOLDERS,
  PLATFORM,
  RING_LIGHT,
  STAIR,
  STOREY,
  chairPlace,
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
} from '../logic/control-room-prototype';
import type { Point } from '../logic/control-room-prototype';

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
) {
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

  // Materials.
  const gloss = paint('#2b2520', 0.22, 0.15);
  const stone = paint('#3b3631', 0.55, 0.05);
  const darkWall = paint('#2a2c30', 0.7, 0.1);
  const fin = paint('#2b2e33', 0.45, 0.4);
  const ceilingMat = paint('#121315', 0.9);
  const beam = paint('#1c1d20', 0.6, 0.2);
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
  const woodDark = paint('#4f2e19', 0.5, 0.05);
  const beige = paint('#cbbd9f', 0.75, 0);
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
  // Its floor.
  box(stone, hw, 0.1, hd, hcx, -0.05, hcz, hallGroup);
  // Its walls, the south round the door.
  box(hallWall, t, STOREY, hd, hall.minX + t / 2, STOREY / 2, hcz, hallGroup);
  box(hallWall, t, STOREY, hd, hall.maxX - t / 2, STOREY / 2, hcz, hallGroup);
  box(hallWall, hw, STOREY, t, hcx, STOREY / 2, hall.minZ + t / 2, hallGroup);
  const dw = door.width;
  const left = door.x - dw / 2 - hall.minX;
  const right = hall.maxX - (door.x + dw / 2);
  box(
    hallWall,
    left,
    STOREY,
    t,
    hall.minX + left / 2,
    STOREY / 2,
    door.z,
    hallGroup,
  );
  box(
    hallWall,
    right,
    STOREY,
    t,
    hall.maxX - right / 2,
    STOREY / 2,
    door.z,
    hallGroup,
  );
  box(
    hallWall,
    dw,
    STOREY - door.height,
    t,
    door.x,
    (STOREY + door.height) / 2,
    door.z,
    hallGroup,
  );
  // The door: standing in for the corridor's, shut (no way through yet).
  const doorSet = decor(
    new Group(),
    'Doorway (stands in for the corridor door)',
  );
  hallGroup.add(doorSet);
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
    STOREY,
    sp.maxZ - sp.minZ,
    (sp.minX + sp.maxX) / 2,
    STOREY / 2,
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
    `${CONTROL_ROOM.front} m big wall · ${STOREY} m up · placeholders only`,
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
  roomGroup.add(slab(flatShape(room), top, 0.3, ceilingMat));
  const xs = room.map((p) => p.x);
  const zs = room.map((p) => p.z);
  const [minX, maxX, minZ, maxZ] = [
    Math.min(...xs),
    Math.max(...xs),
    Math.min(...zs),
    Math.max(...zs),
  ];
  const bay = 3;
  for (let x = Math.ceil(minX / bay) * bay; x <= maxX; x += bay)
    box(
      beam,
      0.35,
      0.9,
      maxZ - minZ,
      x,
      top - 0.45,
      (minZ + maxZ) / 2,
      roomGroup,
    );
  for (let z = minZ + bay; z < maxZ; z += bay)
    box(
      beam,
      maxX - minX,
      0.9,
      0.35,
      (minX + maxX) / 2,
      top - 0.45,
      z,
      roomGroup,
    );
  for (let x = Math.ceil(minX / bay) * bay + bay / 2; x < maxX; x += bay)
    for (let z = minZ + bay / 2; z < maxZ; z += bay)
      if (insideRoom(x, z, 0.6)) {
        const d = new Mesh(
          new CylinderGeometry(0.12, 0.12, 0.02, 16),
          downlight,
        );
        d.position.set(x, top - 0.01, z);
        roomGroup.add(d);
      }
  // The walls: dark, with raked fins between the consoles.
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
      brass,
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
        0.12,
        H,
        0.35,
        px + n.x * 0.17,
        STOREY + H / 2,
        pz + n.z * 0.17,
        roomGroup,
      );
      f.rotation.y = -yaw;
      f.rotateX(0.04);
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
  stage.add(slab(flatShape([room[3], room[4], room[5]]), STOREY, ph, gloss));
  box(
    brass,
    room[3].x - room[5].x,
    0.04,
    0.03,
    0,
    STOREY + ph - 0.02,
    edge - 0.015,
    stage,
  );
  const half = PLATFORM.stepWidth / 2;
  const rr = ph / PLATFORM.risers;
  for (let k = 1; k < PLATFORM.risers; k++) {
    const z0 = edge - (PLATFORM.risers - k) * PLATFORM.going;
    box(
      gloss,
      PLATFORM.stepWidth,
      k * rr,
      PLATFORM.going,
      0,
      STOREY + (k * rr) / 2,
      z0 + PLATFORM.going / 2,
      stage,
    );
    box(
      brass,
      PLATFORM.stepWidth,
      0.012,
      0.03,
      0,
      STOREY + k * rr + 0.004,
      z0 + 0.015,
      stage,
    );
  }
  // The stage's guard rail along its open front (a drop over 600 mm), and
  // handrails both sides of its steps.
  // After the Enterprise's bridge (a style cue only): a solid parapet,
  // beige, capped with a wood rail, wood panelling down the stage's
  // face, and flat rounded colour bars along it.
  parapet({ x: room[5].x + 0.3, z: edge }, { x: -half, z: edge });
  parapet({ x: half, z: edge }, { x: room[3].x - 0.3, z: edge });
  const foot = edge - (PLATFORM.risers - 1) * PLATFORM.going;
  for (const x of [-half, half]) {
    const dz = edge - foot;
    const rail = new Mesh(
      new CylinderGeometry(0.025, 0.025, Math.hypot(dz, ph - rr), 10),
      steel,
    );
    rail.position.set(x, STOREY + (rr + ph) / 2 + 0.9, (edge + foot) / 2);
    rail.rotation.x = Math.PI / 2 - Math.atan2(ph - rr, dz);
    rail.name = 'Handrail';
    stage.add(rail);
    for (const [z, y] of [
      [foot, rr],
      [(foot + edge) / 2, (rr + ph) / 2],
      [edge, ph],
    ] as const)
      box(steel, 0.04, 0.9, 0.04, x, STOREY + y + 0.45, z, stage);
  }
  // The conference table, long and black, and its chairs.
  const tbl = conferenceTable();
  const table = decor(new Group(), 'Conference table');
  stage.add(table);
  const ty = STOREY + ph;
  box(
    paint('#0d0d0e', 0.15, 0.2),
    tbl.maxX - tbl.minX,
    0.06,
    tbl.maxZ - tbl.minZ,
    0,
    ty + 0.74,
    CONFERENCE.z,
    table,
  );
  box(
    brass,
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
  const leather = paint('#2a1712', 0.45, 0.05);
  for (const c of conferenceChairs()) table.add(chair(leather, c, ty));

  // ------------------------------------------------------------- the desk
  const desk = decor(new Group(), 'Operator desk (placeholder)');
  roomGroup.add(desk);
  const cream = paint('#d9d2bd', 0.55, 0.05);
  const charcoal = paint('#1d1d1f', 0.6, 0.1);
  const insetScreen = glow('#3ab0a0', 0.55, '#071312');
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
      desk.add(inset(c, n, insetScreen));
      // A blank control panel in the top below it.
      const tp = (u: number, v: number): [Point, number] => {
        const outer = at(U0, U1, u);
        const inner = at(Q0, Q1, u);
        return [at(outer, inner, v), y0 + 0.9 + (0.76 - 0.9) * v];
      };
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
    ),
  );

  // ------------------------------------------------------ the ring light
  const ring = decor(new Group(), 'Ring light (Strangelove)');
  roomGroup.add(ring);
  const rc = ringLightCentre();
  const ry = STOREY + RING_LIGHT.height;
  const R = RING_LIGHT.diameter / 2;
  const tube = new Mesh(
    new TorusGeometry(R, 0.09, 12, 96),
    glow('#fff1d6', 3.2, '#fff6e6'),
  );
  tube.rotation.x = Math.PI / 2;
  tube.position.set(rc.x, ry, rc.z);
  ring.add(tube);
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
  for (const p of PLACEHOLDERS) {
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
        glow(look.face, look.glow, '#0a0a0a'),
      ),
    );
    // Its label, at eye height or on its top.
    const label = sign(Math.min(3.2, p.width * 0.8), 0.5, [p.label, p.note]);
    const mid = {
      x: (corners[2].x + corners[3].x) / 2,
      z: (corners[2].z + corners[3].z) / 2,
    };
    const ly =
      p.height > 1.6
        ? y0 + Math.min(p.height - 0.4, 1.7 - p.bottom + 0.4)
        : y1 + 0.4;
    label.position.set(mid.x + n.x * 0.04, ly, mid.z + n.z * 0.04);
    label.rotation.y = Math.atan2(n.x, n.z);
    holder.add(label);
  }
  // A low warm wash from the coffers, over the whole floor and the stage.
  for (const [x, z] of [
    [-8, room[0].z + 3],
    [8, room[0].z + 3],
    [-9, -1],
    [9, -1],
    [-4, (edge + room[4].z) / 2],
    [4, (edge + room[4].z) / 2],
  ] as const) {
    const light = new PointLight('#ffc98f', 14 * metre * metre, 22 * metre, 2);
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
  /** The stage's front: wood-panelled face, beige parapet, wood cap rail, colour bars. */
  function parapet(a: Point, b: Point) {
    const len = Math.hypot(b.x - a.x, b.z - a.z);
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
    // The stage's face, wood, in panels.
    piece(wood, ph, 0.04, STOREY + ph / 2, -0.02);
    const panels = Math.max(1, Math.round(len / 1.2));
    for (let k = 1; k < panels; k++) {
      const x = a.x + ((b.x - a.x) * k) / panels;
      box(woodDark, 0.03, ph, 0.05, x, STOREY + ph / 2, edge - 0.03, stage);
    }
    // The parapet, beige, 1.1 m over the stage, and its wood cap rail.
    piece(beige, 1.05, 0.12, STOREY + ph + 0.525, 0.06);
    piece(wood, 0.07, 0.24, STOREY + ph + 1.08, 0.06).name = 'Guard rail';
    // Rounded colour bars along the parapet's face.
    const colours = ['#e49a4c', '#c890c8', '#9aa6e0', '#e2b77a'];
    let x = 0.3;
    let k = 0;
    while (x < len - 0.6) {
      const w = Math.min(len - 0.3 - x, 0.6 + ((k * 7) % 5) * 0.35);
      const m = colourBar[colours[k % colours.length]];
      const s0 = x / len;
      const s1 = (x + w) / len;
      const cx = a.x + (b.x - a.x) * ((s0 + s1) / 2);
      const bar = box(
        m,
        w - 0.12,
        0.12,
        0.01,
        cx,
        STOREY + ph + 0.75,
        edge - 0.005,
        stage,
      );
      bar.rotation.y = yaw;
      for (const e of [-1, 1]) {
        const cap = new Mesh(new CylinderGeometry(0.06, 0.06, 0.01, 16), m);
        cap.rotation.x = Math.PI / 2;
        cap.position.set(
          cx + (e * (w - 0.12)) / 2,
          STOREY + ph + 0.75,
          edge - 0.005,
        );
        stage.add(cap);
      }
      x += w + 0.12;
      k++;
    }
  }
  /** A swivel chair facing `yaw` (0 faces south, π north). */
  function chair(
    m: Material,
    at: { x: number; z: number; yaw: number },
    y: number,
    name = 'Chair',
  ) {
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
