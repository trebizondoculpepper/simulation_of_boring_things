import {
  CanvasTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { kitPaint } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { createBrandBadge } from '../../core/views/brand-badge';
import { beginPart } from '../../core/parts/parts';
import type { Part } from '../../core/parts/parts';
import {
  DOOR_OPEN,
  DOOR_SHUT,
  play,
} from '../../core/parts/building-part-tools';
import {
  holdDoorOpen,
  initialPlantDoor,
  stepPlantDoor,
  workDoor,
} from '../logic/plant-door';
import type { PlantDoorState } from '../logic/plant-door';
import { doorFrame, kickPlate, pullHandle, pushPlate } from './door-hardware';
import { cardReader } from './card-reader';
import { createDoorWarningStickers } from '../views/door-warning-stickers';
import type { DoorWarningSelection } from '../logic/door-warnings';

/**
 * The equipment doors between plant rooms (Ironside): a pair of FD60
 * steel leaves, 1800 × 2400 mm between them, wide and tall enough to
 * bring a pump or a filter's parts through on a trolley, in the same
 * frame all round as the plant room door. Each leaf works as that door
 * does (`logic/plant-door.ts`): opened, held, and shut again by its own
 * overhead closer. On the side they are pulled from (+z), a pull handle
 * on each; on the other, a push plate; kick plates both sides; a card
 * reader to the right of the pair on each side; a sign
 * over them, its words given. Built in the wall's plane, its +z face at
 * z = 0, the opening's middle at x = 0, on the floor.
 */
export const EQUIPMENT_DOORS = {
  w: 1.8,
  h: 2.4,
  thick: 0.054,
  frame: 0.06,
} as const;

export interface EquipmentDoorsPart extends Part {
  /** Whether either leaf stands open. */
  open: () => boolean;
  /** How far open the more open leaf is, radians. */
  angle: () => number;
  /** Stand both leaves open at `angle` (handed over through the doorway). */
  swingTo: (angle: number) => void;
  /** Hold both leaves open while someone stands in the doorway. */
  holdOpen: () => void;
  /** Hide the leaves: the room beyond draws the doorway's one pair. */
  showLeaves: (on: boolean) => void;
  /** Its card readers, which the room may light. */
  readers: ReturnType<typeof cardReader>[];
}

export function equipmentDoors(
  kit: PanelKit,
  label = 'MAIN PLANT',
  warnings: DoorWarningSelection = 'plant',
): EquipmentDoorsPart {
  const t = tools(kit);
  const a = beginPart(kit, 'equipment doors');
  const { w, h, thick, frame: f } = EQUIPMENT_DOORS;
  const green = kitPaint(kit, '#5d6b5e', 0.35);
  const frameSteel = kitPaint(kit, '#3e4543', 0.4);
  const steel = t.paint('#c9cdcf', 0.28, 0.9);
  const dark = t.paint('#1f2324', 0.6);
  doorFrame(t, a.object, frameSteel, w, h, f, 0.14);
  const leafW = w / 2;
  const controls: {
    angle: () => number;
    swingTo: (angle: number) => void;
    hinge: Group;
    hold: () => void;
  }[] = [];
  const readers: ReturnType<typeof cardReader>[] = [];
  const stickerTemplate = createDoorWarningStickers(kit, warnings);
  const leaves = ([-1, 1] as const).map((side) => {
    // Hung on its outer jamb, meeting its pair in the middle.
    const hinge = new Group();
    hinge.position.set((side * w) / 2, f, 0);
    a.object.add(hinge);
    const toward = -side;
    const leaf = t.box(
      hinge,
      green,
      leafW - 0.004,
      h,
      thick,
      (toward * leafW) / 2,
      h / 2,
      -thick / 2,
    );
    for (const y of [0.3, h / 2, h - 0.3])
      t.cyl(hinge, steel, 0.012, 0.11, 0, y, 0.004, 'y', 10);
    const meeting = toward * (leafW - 0.09);
    const pull = new Group();
    pull.position.set(meeting, 1.05, 0);
    hinge.add(pull);
    pullHandle(t, pull, steel, 0, 0);
    kickPlate(t, hinge, steel, leafW, (toward * leafW) / 2);
    pushPlate(t, hinge, steel, meeting, 1.2, -thick, -1);
    kickPlate(t, hinge, steel, leafW, (toward * leafW) / 2, -thick, -1);
    for (const back of [false, true]) {
      const stickers = stickerTemplate.clone(true);
      stickers.position.set(
        (toward * leafW) / 2,
        1.65,
        back ? -thick - 0.005 : 0.005,
      );
      if (back) stickers.rotation.y = Math.PI;
      hinge.add(stickers);
    }
    // Its closer on the push side's head rail.
    t.box(hinge, dark, 0.3, 0.06, 0.05, toward * 0.3, h - 0.07, -thick - 0.025);
    let state: PlantDoorState = initialPlantDoor();
    controls.push({
      angle: () => state.angle,
      swingTo: (angle: number) => {
        const open = Math.min(Math.PI / 2, Math.abs(angle));
        state =
          open > 0
            ? {
                ...state,
                angle: open,
                latched: false,
                phase: 'closing',
                timer: 0,
                closeFrom: open,
                closeElapsed: 0,
              }
            : initialPlantDoor();
      },
      hinge,
      hold: () => {
        state = holdDoorOpen(state);
      },
    });
    const work = () => {
      const was = state.phase;
      state = workDoor(state);
      if (was === 'shut') play(DOOR_OPEN(), a.object);
    };
    // The whole leaf and all on it (handle, push and kick plates) work it.
    for (const target of [hinge, leaf, pull]) a.uses.set(target, work);
    a.updates.push((delta) => {
      const was = state.phase;
      const r = stepPlantDoor(state, delta);
      state = r.state;
      // The last leaf opened sets the pair's closing time. An older leaf
      // waits through this leaf's full hold, even if its own hold was
      // nearly over or its closer had begun to sweep.
      if (was === 'opening' && state.phase === 'held')
        for (const other of controls) if (other.hinge !== hinge) other.hold();
      if (r.latchedNow) play(DOOR_SHUT(), a.object);
      // Each swings out toward +z, the pull side, about its own hinge.
      hinge.rotation.y = side * state.angle;
    });
    hinge.traverse((o) => (o.userData.live = true));
    return hinge;
  });
  void leaves;
  // A card reader on the wall to the right of the pair, as seen from each
  // side: on the pull side at +x; on the push side, the main corridor's,
  // at −x, its face toward the corridor.
  for (const [x, z, turn] of [
    [w / 2 + f + 0.2, 0, 0],
    [-(w / 2 + f + 0.2), -0.2, Math.PI],
  ] as const) {
    const reader = cardReader(kit);
    readers.push(reader);
    reader.object.position.set(x, 1.1, z);
    reader.object.rotation.y = turn;
    a.object.add(reader.object);
    for (const [target, use] of reader.uses) a.uses.set(target, use);
    a.updates.push((delta) => reader.update(delta));
  }
  // The sign over them, and the maker's badge on the head.
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 102;
  const c = canvas.getContext('2d');
  if (c) {
    c.fillStyle = '#f4f2ea';
    c.fillRect(0, 0, 512, 102);
    c.fillStyle = '#16191a';
    c.font = 'bold 54px Arial, Helvetica, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(label, 256, 54, 480);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  kit.textures.push(texture);
  const material = new MeshBasicMaterial({ map: texture });
  kit.materials.push(material);
  const sign = new Mesh(new PlaneGeometry(0.9, 0.18), material);
  sign.position.set(0, h + 2 * f + 0.25, 0.003);
  a.object.add(sign);
  const badge = createBrandBadge(kit, 'ironside', { height: 0.03 });
  badge.position.set(0, h + f * 1.5, 0.002);
  a.object.add(badge);
  const angle = () => Math.max(...controls.map((c) => c.angle()));
  return {
    ...a.part(),
    open: () => angle() > 0.05,
    angle,
    swingTo: (value) => {
      for (const c of controls) c.swingTo(value);
    },
    holdOpen: () => {
      for (const c of controls) c.hold();
    },
    showLeaves: (on) => {
      for (const c of controls) c.hinge.visible = on;
    },
    readers,
  };
}
