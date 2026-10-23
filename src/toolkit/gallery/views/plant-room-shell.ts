import {
  BoxGeometry,
  CanvasTexture,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  RepeatWrapping,
  SRGBColorSpace,
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
import { plantRoomDoor } from '../../components/architectural/parts/plant-door';
import { createShoeCoverDispenser } from '../../components/architectural/views/shoe-cover-dispenser';
import {
  EQUIPMENT_DOORS,
  equipmentDoors,
} from '../../components/architectural/parts/equipment-doors';
import type { EquipmentDoorsPart } from '../../components/architectural/parts/equipment-doors';
import {
  createBreezeBlockTextures,
  mapBlockwork,
} from '../../../scene/breeze-block-texture';
import { createWarehouseConcreteFloor } from '../../../scene/warehouse-concrete-floor';
import { createPs1Material } from '../../components/core/parts/ps1-material';
import { PLANT_ROOM } from '../logic/plant-rooms';
import { wallFrame, yawToward } from '../logic/shell-plan';
import type { ShellDoorway, ShellPlan } from '../logic/shell-plan';

/**
 * A plant room's shell, drawn from its plan (`logic/shell-plan.ts`):
 * painted blockwork walls two storeys high, a concrete plant floor a
 * storey below the deck, the plant room door at deck level onto its decks
 * of studded rubber (a landing, a gantry; carried on posts, or hung from
 * the walls), a steep steel stair with yellow nosings and handrails down
 * to the plant floor, and on the plant floor the double equipment doors
 * through to the central plant (and, if it has one, to its balance tank
 * hall). Metres; the deck at y = 0.
 */
export function createPlantRoomShell(
  plan: ShellPlan,
  metre: number,
  kit: PanelKit,
  /** Its title: "PLANT ROOM 4 – FOOTBATH". */
  name: string,
): {
  group: Group;
  door: ReturnType<typeof plantRoomDoor>;
  equipment: EquipmentDoorsPart;
  /** The doors to the balance tank hall, if it has them. */
  tankDoors: EquipmentDoorsPart | null;
} {
  const { hx, hz, floor, roof, stair } = plan;
  const P = PLANT_ROOM;
  const t = P.wall;
  const group = new Group();
  group.name = `plant room (${plan.label})`;
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
  const concrete = createWarehouseConcreteFloor(2 * Math.max(hx, hz));
  kit.materials.push(concrete);
  if (concrete.map) kit.textures.push(concrete.map);
  const galvanised = paint('#a9aeae', 0.45, 0.6);
  const yellow = paint('#e3b51f', 0.5);
  // Studded rubber safety flooring on the decks and the treads: raised
  // round studs on a dark rubber sheet, for grip when wet.
  const rubber = studdedRubber(kit);
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
  const wallBox = (
    sx: number,
    sy: number,
    sz: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const geometry = new BoxGeometry(sx, sy, sz);
    // Its blockwork on the room's one grid (`mapBlockwork`).
    mapBlockwork(geometry, [x, y, z], floor);
    const mesh = new Mesh(geometry, block);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  // The plant floor, and the roof.
  box(concrete, 2 * hx, 0.1, 2 * hz, 0, floor - 0.05, 0);
  wallBox(2 * hx + 2 * t, 0.3, 2 * hz + 2 * t, 0, roof + 0.15, 0);

  // The walls, each round its doorways: the plant room door at deck level
  // (on the floor in a step-free room); the equipment doors on the floor.
  const eqTop = floor + EQUIPMENT_DOORS.h + 2 * EQUIPMENT_DOORS.frame;
  const doorW = 0.926 + 0.1;
  const openings: {
    d: ShellDoorway;
    width: number;
    bottom: number;
    top: number;
    lintel: boolean;
  }[] = [
    { d: plan.door, width: doorW, bottom: 0, top: 2.14, lintel: true },
    {
      d: plan.equipment,
      width: plan.equipment.width,
      bottom: floor,
      top: eqTop,
      lintel: true,
    },
    ...(plan.tankDoor
      ? [
          {
            d: plan.tankDoor,
            width: plan.tankDoor.width,
            bottom: floor,
            top: eqTop,
            lintel: false,
          },
        ]
      : []),
  ];
  for (const wall of ['north', 'south', 'east', 'west'] as const) {
    const across = wall === 'north' || wall === 'south';
    const half = across ? hx : hz;
    const line =
      wall === 'north'
        ? -hz - t / 2
        : wall === 'south'
          ? hz + t / 2
          : wall === 'west'
            ? -hx - t / 2
            : hx + t / 2;
    // A piece of this wall from a to b along it, from y0 to y1.
    const piece = (a: number, b: number, y0: number, y1: number) => {
      if (b - a <= 1e-6 || y1 - y0 <= 1e-6) return;
      const mid = (a + b) / 2;
      if (across) wallBox(b - a, y1 - y0, t, mid, (y0 + y1) / 2, line);
      else wallBox(t, y1 - y0, b - a, line, (y0 + y1) / 2, mid);
    };
    const here = openings
      .filter((o) => o.d.wall === wall)
      .sort((a, b) => a.d.at - b.d.at);
    let from = -half - t;
    for (const o of here) {
      const a = o.d.at - o.width / 2;
      const b = o.d.at + o.width / 2;
      piece(from, a, floor, roof);
      const headerBottom = o.top + CONCRETE_LINTEL.height;
      piece(a, b, headerBottom, roof);
      if (o.lintel)
        addConcreteLintel(
          group,
          kit,
          o.width,
          t,
          across ? o.d.at : line,
          o.top,
          across ? line : o.d.at,
          across,
        );
      else piece(a, b, o.top, headerBottom);
      if (o.bottom > floor) piece(a, b, floor, o.bottom);
      from = b;
    }
    piece(from, half + t, floor, roof);
    // A painted dado round the plant floor, broken by its floor-level doorways.
    const breaks = here
      .filter((o) => o.bottom <= floor + 1e-6)
      .map((o) => [o.d.at - o.width / 2, o.d.at + o.width / 2] as const);
    let d0 = -half;
    const face =
      wall === 'north'
        ? -hz + 0.005
        : wall === 'south'
          ? hz - 0.005
          : wall === 'west'
            ? -hx + 0.005
            : hx - 0.005;
    for (const [a, b] of [...breaks, [half, half] as const]) {
      if (a > d0) {
        if (across)
          box(dado, a - d0, 1.2, 0.01, (a + d0) / 2, floor + 0.6, face);
        else box(dado, 0.01, 1.2, a - d0, face, floor + 0.6, (a + d0) / 2);
      }
      d0 = b;
    }
  }

  // A dark lobby beyond a doorway, until the room there is seen through it.
  const lobbyBeyond = (
    d: ShellDoorway,
    width: number,
    h: number,
    y: number,
    name: string,
  ) => {
    const f = wallFrame(plan, d.wall, d.at);
    const across = d.wall === 'north' || d.wall === 'south';
    const mesh = box(
      paint('#0b0d0d', 1),
      across ? width : 0.05,
      h,
      across ? 0.05 : width,
      f.x + f.out[0] * (t + 0.9),
      y,
      f.z + f.out[1] * (t + 0.9),
    );
    mesh.name = name;
  };

  // The plant room door, at deck level: its hall face outward, its leaf
  // swinging out into the hall.
  const door = plantRoomDoor(kit);
  const df = wallFrame(plan, plan.door.wall, plan.door.at);
  const inward = [-df.out[0], -df.out[1]] as const;
  const doorYaw = yawToward(df.out);
  door.object.position.set(df.x + df.out[0] * t, 0, df.z + df.out[1] * t);
  door.object.rotation.y = doorYaw;
  group.add(door.object);
  // Beside it inside, the shoe covers, on the side its leaf hangs.
  const shoeCovers = createShoeCoverDispenser(kit);
  shoeCovers.position.set(
    df.x + Math.cos(doorYaw) * 0.69 + inward[0] * 0.09,
    1.35,
    df.z - Math.sin(doorYaw) * 0.69 + inward[1] * 0.09,
  );
  shoeCovers.rotation.y = yawToward(inward);
  group.add(shoeCovers);
  lobbyBeyond(plan.door, doorW, 2.2, 1.1, 'plant door lobby');

  if (!plan.stepFree) {
    const access = createIndustrialAccess({
      deck: rubber,
      steel: galvanised,
      rail: yellow,
      nosing: yellow,
      deckTile: STUD_TILE,
    });
    for (const deck of plan.decks)
      access.deck({
        x: (deck.minX + deck.maxX) / 2,
        z: (deck.minZ + deck.maxZ) / 2,
        width: deck.maxX - deck.minX,
        depth: deck.maxZ - deck.minZ,
        topY: 0,
        // Hung from the walls: no posts down to the plant floor.
        ...(plan.cantilevered ? {} : { supportBottom: floor }),
      });
    if (stair) {
      const southward = stair.heading === 'south' || stair.heading === 'north';
      access.stair({
        x: southward ? (stair.minX + stair.maxX) / 2 : stair.top,
        z: southward ? stair.top : (stair.minZ + stair.maxZ) / 2,
        topY: 0,
        bottomY: floor,
        width: southward ? stair.maxX - stair.minX : stair.maxZ - stair.minZ,
        run: Math.abs(stair.bottom - stair.top),
        steps: stair.steps,
        treads: stair.steps - 1,
        direction: stair.heading,
        openSideEnd: stair.offAt,
      });
    }
    for (const [[x0, z0], [x1, z1]] of plan.rails)
      access.rail({ from: [x0, 0, z0], to: [x1, 0, z1] });
    group.add(access.group);
  }

  // The equipment doors through to the main plant: the standard pair
  // (`equipment-doors.ts`), pulled open from in here.
  const placeDoors = (d: ShellDoorway, label: string, lobby: string) => {
    const f = wallFrame(plan, d.wall, d.at);
    const part = equipmentDoors(kit, label);
    part.object.position.set(f.x, floor, f.z);
    part.object.rotation.y = yawToward([-f.out[0], -f.out[1]]);
    group.add(part.object);
    lobbyBeyond(d, d.width, eqTop - floor, (floor + eqTop) / 2, lobby);
    return part;
  };
  const equipment = placeDoors(plan.equipment, 'MAIN PLANT', 'equipment lobby');
  // The balance tank hall's doors, the same pair; beyond them, until the hall is built, a dark lobby.
  const tankDoors = plan.tankDoor
    ? placeDoors(plan.tankDoor, 'BALANCE TANK', 'balance tank lobby')
    : null;

  const title = card(1.6, 0.36, (c, w, hh) => {
    c.fillStyle = '#f4f2ea';
    c.fillRect(0, 0, w, hh);
    c.fillStyle = '#4e5a52';
    c.font = `bold ${hh * 0.3}px Arial, Helvetica, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(name, w / 2, hh * 0.38, w * 0.94);
    c.font = `${hh * 0.2}px Arial, Helvetica, sans-serif`;
    c.fillText(plan.label, w / 2, hh * 0.72, w * 0.94);
  });
  const tf = wallFrame(plan, plan.title.wall, plan.title.at);
  title.position.set(
    tf.x - tf.out[0] * 0.002,
    plan.title.y,
    tf.z - tf.out[1] * 0.002,
  );
  title.rotation.y = yawToward([-tf.out[0], -tf.out[1]]);
  group.add(title);

  // Light: LED battens high on the walls of each storey; the room lit by
  // a few point lights only, `lamps` a storey, each costing every pixel.
  const battens = createWallBattenMaterials();
  kit.materials.push(...Object.values(battens));
  const alongX = Math.max(1, Math.round((2 * hx) / 5));
  const alongZ = Math.max(1, Math.round((2 * hz) / 5));
  // By the stair, a fitting on its wall would crowd it.
  const byStair = (wall: 'east' | 'west', z: number) =>
    !!stair &&
    (wall === 'east' ? stair.maxX >= hx - 0.05 : stair.minX <= -hx + 0.05) &&
    z >= stair.minZ - 1 &&
    z <= stair.maxZ + 1;
  for (const y of plan.stepFree ? [floor + 3.1] : [floor + 3.1, roof - 1.0]) {
    // The lower row of a room lit by two lamps a storey runs along the west and east walls.
    const sides = plan.lamps > 1 && y === floor + 3.1;
    const along = sides ? alongZ : alongX;
    for (let i = 0; i < along; i++) {
      if (sides) {
        const at = -hz + ((i + 0.5) * 2 * hz) / along;
        addWallBatten(group, battens, -hx + 0.05, y, at, 'z', 1);
        if (!byStair('east', at))
          addWallBatten(group, battens, hx - 0.05, y, at, 'z', -1);
      } else {
        const at = -hx + ((i + 0.5) * 2 * hx) / along;
        addWallBatten(group, battens, at, y, -hz + 0.05, 'x', 1);
        addWallBatten(group, battens, at, y, hz - 0.05, 'x', -1);
      }
      if (i % Math.max(1, Math.round(along / plan.lamps)) !== 0) continue;
      const at = sides
        ? -hz + ((i + 0.5) * 2 * hz) / along
        : -hx + ((i + 0.5) * 2 * hx) / along;
      const light = new PointLight(
        '#f2f4ee',
        (plan.lamps > 1 ? 6 : 3) * metre * metre,
        (2 * Math.max(hx, hz) + 4) * metre,
        2,
      );
      light.position.set(sides ? 0 : at, y - 0.3, sides ? at : 0);
      group.add(light);
    }
  }

  function card(
    w: number,
    hh: number,
    draw: (c: CanvasRenderingContext2D, cw: number, ch: number) => void,
  ) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = Math.round((512 * hh) / w);
    const c = canvas.getContext('2d');
    if (c) draw(c, canvas.width, canvas.height);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    kit.textures.push(texture);
    // Printed: lit as any surface is, dark in the dark.
    const material = new MeshStandardMaterial({
      map: texture,
      roughness: 0.85,
    });
    kit.materials.push(material);
    return new Mesh(new PlaneGeometry(w, hh), material);
  }
  // Overhead, under the roof, a generated services ceiling.
  group.add(
    createServiceCeiling(
      { minX: -hx, maxX: hx, minZ: -hz, maxZ: hz, deckY: roof },
      { seed: plan.seed, density: 0.85 },
    ).group,
  );
  return {
    group,
    door,
    equipment,
    tankDoors,
  };
}

/** The studded rubber's texture covers this much floor, metres. */
const STUD_TILE = 0.3;

/**
 * Studded rubber safety flooring (raised round studs, "coin" pattern):
 * a dark grey sheet, each stud lit from above, shaded below; a little
 * rough, for grip.
 */
function studdedRubber(kit: PanelKit) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const c = canvas.getContext('2d');
  if (c) {
    c.fillStyle = '#2b2e2f';
    c.fillRect(0, 0, size, size);
    const studs = 6;
    const step = size / studs;
    const r = step * 0.3;
    for (let i = 0; i < studs; i++)
      for (let j = 0; j < studs; j++) {
        const x = (i + 0.5) * step;
        const y = (j + 0.5) * step;
        c.fillStyle = '#1c1e1f';
        c.beginPath();
        c.arc(x + 2, y + 3, r, 0, Math.PI * 2);
        c.fill();
        const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
        g.addColorStop(0, '#4b5052');
        g.addColorStop(1, '#303436');
        c.fillStyle = g;
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fill();
      }
  }
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  map.wrapS = map.wrapT = RepeatWrapping;
  map.anisotropy = 8;
  kit.textures.push(map);
  const material = new MeshStandardMaterial({ map, roughness: 0.92 });
  kit.materials.push(material);
  return material;
}
