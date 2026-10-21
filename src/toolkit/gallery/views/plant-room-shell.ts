import {
  BoxGeometry,
  CanvasTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
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
  addWallBatten,
  createWallBattenMaterials,
} from '../../../scene/wall-batten';
import { plantRoomDoor } from '../../components/architectural/parts/plant-door';
import {
  EQUIPMENT_DOORS,
  equipmentDoors,
} from '../../components/architectural/parts/equipment-doors';
import type { EquipmentDoorsPart } from '../../components/architectural/parts/equipment-doors';
import { createBreezeBlockTextures } from '../../../scene/breeze-block-texture';
import { createWarehouseConcreteFloor } from '../../../scene/warehouse-concrete-floor';
import { createPs1Material } from '../../components/core/parts/ps1-material';
import { PLANT_DOORWAY, PLANT_ROOM, plantRoomPlan } from '../logic/plant-rooms';
import type { PlantRoomSize } from '../logic/plant-rooms';

/**
 * A per-attraction plant room's shell (`logic/plant-rooms.ts`): painted
 * blockwork walls two storeys high, a concrete plant floor a storey
 * below the deck, the plant room door in the south wall at deck level
 * onto a landing of studded rubber, a steep steel stair with yellow
 * nosings and handrails down the east wall, and in the south wall at the
 * plant floor, the double equipment doors through to the central plant.
 * Bare, for now: its machinery, west wall first, comes later. Metres;
 * the deck at y = 0.
 */
export function createPlantRoomShell(
  size: PlantRoomSize,
  metre: number,
  kit: PanelKit,
  /** Its title: "PLANT ROOM 4 – FOOTBATH"; the size's, for a template. */
  name = `PLANT ROOM · ${size.toUpperCase()}`,
): {
  group: Group;
  door: ReturnType<typeof plantRoomDoor>;
  equipment: EquipmentDoorsPart;
} {
  const plan = plantRoomPlan(size);
  const { h, floor, roof, landing, stair } = plan;
  const P = PLANT_ROOM;
  const t = P.wall;
  const group = new Group();
  group.name = `plant room (${size})`;
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
  const concrete = createWarehouseConcreteFloor(2 * h);
  kit.materials.push(concrete);
  if (concrete.map) kit.textures.push(concrete.map);
  const galvanised = paint('#a9aeae', 0.45, 0.6);
  const yellow = paint('#e3b51f', 0.5);
  // Studded rubber safety flooring on the landing and the treads: raised
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
    const uv = geometry.attributes.uv;
    // BoxGeometry writes four vertices per face: ±x, ±y, ±z.
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
  const height = roof - floor;
  // The plant floor, and the roof.
  box(concrete, 2 * h, 0.1, 2 * h, 0, floor - 0.05, 0);
  wallBox(2 * h + 2 * t, 0.3, 2 * h + 2 * t, 0, roof + 0.15, 0);
  // The walls: east and west whole, north and south round their doors.
  wallBox(t, height, 2 * h, -h - t / 2, (floor + roof) / 2, 0);
  wallBox(t, height, 2 * h, h + t / 2, (floor + roof) / 2, 0);
  const wallWithDoor = (
    z: number,
    doorX: number,
    doorW: number,
    doorBottom: number,
    doorTop: number,
  ) => {
    const x0 = -h - t;
    const x1 = h + t;
    const left = doorX - doorW / 2 - x0;
    const right = x1 - (doorX + doorW / 2);
    wallBox(left, height, t, x0 + left / 2, (floor + roof) / 2, z);
    wallBox(right, height, t, x1 - right / 2, (floor + roof) / 2, z);
    wallBox(doorW, roof - doorTop, t, doorX, (doorTop + roof) / 2, z);
    if (doorBottom > floor)
      wallBox(doorW, doorBottom - floor, t, doorX, (floor + doorBottom) / 2, z);
  };
  const doorW = 0.926 + 0.1;
  wallWithDoor(-h - t / 2, plan.door.x, doorW, 0, 2.14);
  wallWithDoor(
    h + t / 2,
    plan.equipment.x,
    EQUIPMENT_DOORS.w + 2 * EQUIPMENT_DOORS.frame,
    floor,
    floor + EQUIPMENT_DOORS.h + 2 * EQUIPMENT_DOORS.frame,
  );
  // A painted dado round the plant floor, interrupted by the equipment
  // doorway so the stripe cannot cover its lower half.
  const equipmentLeft =
    plan.equipment.x - EQUIPMENT_DOORS.w / 2 - EQUIPMENT_DOORS.frame;
  const equipmentRight =
    plan.equipment.x + EQUIPMENT_DOORS.w / 2 + EQUIPMENT_DOORS.frame;
  for (const [x0, x1] of [
    [-h, equipmentLeft],
    [equipmentRight, h],
  ])
    if (x1 > x0)
      box(dado, x1 - x0, 1.2, 0.01, (x0 + x1) / 2, floor + 0.6, h - 0.005);
  // The north wall's, broken round the plant room door too where that
  // door is on the plant floor (the tiny room's).
  const doorLeft = plan.door.x - PLANT_DOORWAY / 2;
  const doorRight = plan.door.x + PLANT_DOORWAY / 2;
  for (const [x0, x1] of plan.stepFree
    ? [
        [-h, doorLeft],
        [doorRight, h],
      ]
    : [[-h, h]])
    if (x1 > x0)
      box(dado, x1 - x0, 1.2, 0.01, (x0 + x1) / 2, floor + 0.6, -h + 0.005);
  for (const [sx, sz, x, z] of [
    [0.01, 2 * h, -h + 0.005, 0],
    [0.01, 2 * h, h - 0.005, 0],
  ])
    box(dado, sx, 1.2, sz, x, floor + 0.6, z);

  // The plant room door, at deck level in the south wall: its hall face
  // outward (+z), its leaf swinging out into the hall.
  const door = plantRoomDoor(kit);
  // Its hall face out, north.
  door.object.position.set(plan.door.x, 0, -h - t);
  door.object.rotation.y = Math.PI;
  group.add(door.object);
  // Beyond it, until its pool hall is seen through it, a dark lobby.
  const lobby = box(
    paint('#0b0d0d', 1),
    doorW,
    2.2,
    0.05,
    plan.door.x,
    1.1,
    -h - t - 0.9,
  );
  lobby.name = 'plant door lobby';

  if (!plan.stepFree) {
    const access = createIndustrialAccess({
      deck: rubber,
      steel: galvanised,
      rail: yellow,
      nosing: yellow,
      deckTile: STUD_TILE,
    });
    access.deck({
      x: (landing.minX + landing.maxX) / 2,
      z: (landing.minZ + landing.maxZ) / 2,
      width: landing.maxX - landing.minX,
      depth: landing.maxZ - landing.minZ,
      topY: 0,
      supportBottom: floor,
    });
    const sw = stair.maxX - stair.minX;
    access.stair({
      x: (stair.minX + stair.maxX) / 2,
      z: stair.top,
      topY: 0,
      bottomY: floor,
      width: sw,
      run: stair.bottom - stair.top,
      steps: stair.steps,
      treads: stair.steps - 1,
      direction: 'south',
      openSideEnd: P.stair.offAt,
    });
    access.rail({
      from: [landing.minX, 0, landing.minZ + 0.05],
      to: [landing.minX, 0, landing.maxZ],
    });
    access.rail({
      from: [landing.minX, 0, landing.maxZ],
      to: [stair.minX, 0, landing.maxZ],
    });
    group.add(access.group);
  }

  // The equipment doors in the south wall, through to the main plant: the
  // standard pair (`equipment-doors.ts`), pulled open from in here.
  const equipment = equipmentDoors(kit, 'MAIN PLANT');
  equipment.object.position.set(plan.equipment.x, floor, h);
  equipment.object.rotation.y = Math.PI;
  group.add(equipment.object);
  // Beyond them, until the main corridor is seen through them, a dark lobby.
  const equipmentLobby = box(
    paint('#0b0d0d', 1),
    EQUIPMENT_DOORS.w + 2 * EQUIPMENT_DOORS.frame,
    EQUIPMENT_DOORS.h + 2 * EQUIPMENT_DOORS.frame,
    0.05,
    plan.equipment.x,
    floor + (EQUIPMENT_DOORS.h + 2 * EQUIPMENT_DOORS.frame) / 2,
    h + t + 0.9,
  );
  equipmentLobby.name = 'equipment lobby';
  const title = card(1.6, 0.36, (c, w, hh) => {
    c.fillStyle = '#f4f2ea';
    c.fillRect(0, 0, w, hh);
    c.fillStyle = '#4e5a52';
    c.font = `bold ${hh * 0.3}px Arial, Helvetica, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(name, w / 2, hh * 0.38, w * 0.94);
    c.font = `${hh * 0.2}px Arial, Helvetica, sans-serif`;
    c.fillText(
      `${plan.side} × ${plan.side} m · ${plan.stepFree ? 'one storey' : 'two storeys'}`,
      w / 2,
      hh * 0.72,
      w * 0.94,
    );
  });
  title.position.set(
    plan.stepFree ? -h + 1.1 : Math.min(0, plan.equipment.x - 2),
    1.8,
    -h + 0.002,
  );
  group.add(title);

  // Light: LED battens high on the walls of each storey; the room lit by
  // a few point lights only, one a storey (two in the large room), each
  // costing every pixel.
  const battens = createWallBattenMaterials();
  kit.materials.push(...Object.values(battens));
  const along = Math.max(1, Math.round((2 * h) / 5));
  // Keep the upper row below the service ceiling's beams and pipework.
  for (const y of plan.stepFree ? [floor + 3.1] : [floor + 3.1, roof - 1.0])
    for (let i = 0; i < along; i++) {
      const at = -h + ((i + 0.5) * 2 * h) / along;
      const lowerSideLights = size === 'large' && y === floor + 3.1;
      // The large room's lower row runs along the west and east walls;
      // its upper row stays on the north and south walls.
      if (lowerSideLights) {
        addWallBatten(group, battens, -h + 0.05, y, at, 'z', 1);
        // The northmost east-wall fitting crowds the stair in the large room.
        if (i > 0) addWallBatten(group, battens, h - 0.05, y, at, 'z', -1);
      } else {
        addWallBatten(group, battens, at, y, -h + 0.05, 'x', 1);
        addWallBatten(group, battens, at, y, h - 0.05, 'x', -1);
      }
      // One light a storey, two in the large room's.
      if (i % Math.max(1, Math.round(along / (size === 'large' ? 2 : 1))) !== 0)
        continue;
      const light = new PointLight(
        '#f2f4ee',
        (size === 'large' ? 6 : 3) * metre * metre,
        (plan.side + 4) * metre,
        2,
      );
      light.position.set(
        lowerSideLights ? 0 : at,
        y - 0.3,
        lowerSideLights ? at : 0,
      );
      group.add(light);
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
    const material = new MeshBasicMaterial({ map: texture });
    kit.materials.push(material);
    return new Mesh(new PlaneGeometry(w, hh), material);
  }
  // Overhead, under the roof, a generated services ceiling.
  group.add(
    createServiceCeiling(
      { minX: -h, maxX: h, minZ: -h, maxZ: h, deckY: roof },
      {
        seed: { tiny: 5, small: 11, medium: 23, large: 37 }[size],
        density: 0.85,
      },
    ).group,
  );
  return {
    group,
    door,
    equipment,
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
