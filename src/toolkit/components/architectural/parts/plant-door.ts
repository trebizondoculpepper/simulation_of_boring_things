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
import { cardReader } from './card-reader';
import { createDoorWarningStickers } from '../views/door-warning-stickers';
import type { DoorWarningSelection } from '../logic/door-warnings';
import { doorFrame, kickPlate, pullHandle, pushPlate } from './door-hardware';
import type { Part } from '../../core/parts/parts';
import {
  DOOR_OPEN,
  DOOR_SHUT,
  play,
} from '../../core/parts/building-part-tools';
import {
  holdDoorOpen,
  initialPlantDoor,
  PLANT_DOOR,
  stepPlantDoor,
  workDoor,
} from '../logic/plant-door';

/**
 * The plant room door (`logic/plant-door.ts`), as fitted between every pool
 * hall and its plant room: an Ironside FD60 steel fire doorset, its leaf
 * 926 × 2040 mm, powder-coated a utility green against the hall's
 * chlorinated air, in a steel frame. On the hall side (+z): a stainless pull
 * handle, a stainless kick plate, a working card reader on the wall beside
 * it, and the signs every UK plant room door carries:
 * PLANT ROOM; Authorised Personnel Only (a prohibition sign); Fire Door
 * Keep Shut (a mandatory sign). On the plant side (−z): a lever
 * handle and the overhead closer, whose arm folds as the door swings.
 *
 * Built in the wall's plane: the hall face of the wall at z = 0, the
 * doorway's middle at x = 0, the floor at y = 0. The leaf hangs on its
 * left (seen from the hall) and swings out into the hall, the way of escape
 * from the plant room. Work either handle (or the leaf) to open it; it
 * closes itself.
 *
 * The same doorset serves a staff room off a public space (the engineer's
 * office off the underwater gallery): `plate` is then that room's name.
 */
export function plantRoomDoor(
  kit: PanelKit,
  warnings: DoorWarningSelection = 'plant',
  plate = 'PLANT ROOM',
): Part & {
  angle: () => number;
  /** Stand it open at `angle` (handed over from the other side of its doorway). */
  swingTo: (angle: number) => void;
  /** Hide its leaf: the room beyond draws the one leaf of the doorway. */
  showLeaf: (on: boolean) => void;
  /** Hold it open while someone stands in its doorway. */
  holdOpen: () => void;
  /** Its card reader, which the room may light (any door of its open). */
  reader: ReturnType<typeof cardReader>;
} {
  const t = tools(kit);
  const a = beginPart(kit, 'plant room door');
  const D = PLANT_DOOR;
  const { w, h, thick } = D.leaf;
  const f = D.frame;
  const green = kitPaint(kit, '#5d6b5e', 0.35);
  const frame = kitPaint(kit, '#3e4543', 0.4);
  const steel = t.paint('#c9cdcf', 0.28, 0.9);
  const dark = t.paint('#1f2324', 0.6);
  // The frame, all round the opening, through the wall: two jambs, a head,
  // and a sill under the leaf, which it closes onto.
  doorFrame(t, a.object, frame, w, h, f);

  // The leaf, on its hinges at the left jamb.
  const hinge = new Group();
  hinge.position.set(-w / 2, f, 0);
  a.object.add(hinge);
  const leaf = t.box(hinge, green, w, h, thick, w / 2, h / 2, -thick / 2);
  for (const y of [0.25, h / 2, h - 0.25])
    t.cyl(hinge, steel, 0.012, 0.1, 0, y, 0.004, 'y', 10);
  // Hall side: pull handle, kick plate, keypad, signs.
  const pull = new Group();
  pull.position.set(w - 0.09, 1.05, 0);
  hinge.add(pull);
  pullHandle(t, pull, steel, 0, 0);
  kickPlate(t, hinge, steel, w, w / 2);
  const signs = new Group();
  signs.position.set(w / 2, 0, 0.002);
  hinge.add(signs);
  const nameplate = sign(0.42, 0.11, (c, cw, ch) => {
    c.fillStyle = '#f4f2ea';
    c.fillRect(0, 0, cw, ch);
    c.fillStyle = '#16191a';
    c.font = `bold ${ch * 0.55}px Arial, Helvetica, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(plate, cw / 2, ch * 0.54, cw * 0.92);
  });
  nameplate.position.set(0, 1.72, 0);
  signs.add(nameplate);
  const stickers = createDoorWarningStickers(kit, warnings);
  stickers.position.set(0, 1.45, 0.004);
  signs.add(stickers);
  const keepShut = sign(0.2, 0.2, (c, cw, ch) => {
    // A mandatory sign: white words in a blue disc.
    c.fillStyle = '#1e5aa8';
    c.beginPath();
    c.arc(cw / 2, ch / 2, cw / 2 - 2, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffffff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `bold ${ch * 0.14}px Arial, Helvetica, sans-serif`;
    c.fillText('FIRE DOOR', cw / 2, ch * 0.38);
    c.fillText('KEEP', cw / 2, ch * 0.54);
    c.fillText('SHUT', cw / 2, ch * 0.7);
  });
  keepShut.position.set(0, 1.12, 0);
  signs.add(keepShut);
  const badge = createBrandBadge(kit, 'ironside', { height: 0.03 });
  badge.position.set(0.14, h - 0.12, 0.003);
  hinge.add(badge);

  // On the wall beside the latch side, a proximity card reader, as staff
  // doors have (`card-reader.ts`): it reads a card, though the door is not
  // locked.
  const reader = cardReader(kit);
  reader.object.position.set(w / 2 + f + 0.16, 1.1, 0);
  a.object.add(reader.object);
  for (const [target, use] of reader.uses) a.uses.set(target, use);
  a.updates.push((delta) => reader.update(delta));

  // Plant side: a lever handle, and the overhead closer on the leaf's top
  // rail, its arm to the frame's head folding as the leaf swings.
  // Above the lever, a push plate, where the door is pushed out; and a
  // kick plate on this face too.
  pushPlate(t, hinge, steel, w - 0.09, 1.38, -thick, -1);
  kickPlate(t, hinge, steel, w, w / 2, -thick, -1);
  const shoeWarning = createDoorWarningStickers(kit, ['shoe-coverings'], 0.42);
  shoeWarning.name = 'plant side shoe covering warning';
  shoeWarning.position.set(w / 2, 1.75, -thick - 0.006);
  shoeWarning.rotation.y = Math.PI;
  hinge.add(shoeWarning);
  const lever = new Group();
  lever.position.set(w - 0.09, 1.05, -thick);
  hinge.add(lever);
  t.cyl(lever, steel, 0.026, 0.008, 0, 0, -0.004, 'z', 16);
  t.cyl(lever, steel, 0.009, 0.06, 0, 0, -0.03, 'z', 10);
  t.box(lever, steel, 0.13, 0.018, 0.018, -0.06, 0, -0.06);
  t.box(hinge, dark, 0.3, 0.06, 0.05, 0.3, h - 0.07, -thick - 0.025);
  const armPivot = new Group();
  armPivot.position.set(0.42, h - 0.04, -thick - 0.06);
  hinge.add(armPivot);
  const arm = t.box(armPivot, dark, 0.24, 0.014, 0.025, 0.12, 0, 0);

  let state = initialPlantDoor();
  const work = () => {
    const was = state.phase;
    state = workDoor(state);
    if (was !== 'opening' && was !== 'held') reader.doorOpened();
    if (was === 'shut') play(DOOR_OPEN(), a.object);
  };
  // The whole leaf and all on it (handles, push and kick plates) work it.
  for (const target of [hinge, leaf, pull, lever]) a.uses.set(target, work);
  a.updates.push((delta) => {
    const r = stepPlantDoor(state, delta);
    state = r.state;
    if (r.latchedNow) play(DOOR_SHUT(), a.object);
    hinge.rotation.y = -state.angle;
    // The closer's arm folds back along the leaf as it opens.
    arm.parent!.rotation.y = state.angle * 0.9;
  });
  hinge.traverse((o) => (o.userData.live = true));

  function sign(
    sw: number,
    sh: number,
    draw: (c: CanvasRenderingContext2D, cw: number, ch: number) => void,
  ) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = Math.round((512 * sh) / sw);
    const c = canvas.getContext('2d');
    if (c) draw(c, canvas.width, canvas.height);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    kit.textures.push(texture);
    // Clear where it is not drawn: a round sign is round.
    const material = new MeshBasicMaterial({ map: texture, transparent: true });
    kit.materials.push(material);
    return new Mesh(new PlaneGeometry(sw, sh), material);
  }
  return {
    ...a.part(),
    angle: () => state.angle,
    holdOpen: () => {
      state = holdDoorOpen(state);
    },
    reader,
    swingTo(angle) {
      const open = Math.min(D.open, Math.abs(angle));
      if (open > 0 && state.angle === 0) reader.doorOpened(false);
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
    showLeaf(on) {
      hinge.visible = on;
    },
  };
}

export const PLANT_DOOR_OPENING = {
  w: PLANT_DOOR.leaf.w + 2 * PLANT_DOOR.frame,
  h: PLANT_DOOR.leaf.h + 2 * PLANT_DOOR.frame,
};
