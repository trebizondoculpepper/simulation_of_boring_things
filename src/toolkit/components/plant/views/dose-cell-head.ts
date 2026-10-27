import { Group, Mesh, MeshStandardMaterial } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { plantTools } from './plant-tools';
import { chlorellaPlate } from './chlorella-plate';
import {
  bottleLcd,
  bottleReadout,
  newDoseBottle,
  stepDoseBottle,
} from '../../../../game/plant/dose-bottle';
import { onPlinth } from './plinth';
import type { DoseBottle } from '../../../../game/plant/dose-bottle';
import { createCharacterLcd } from '../../industrial-control/views/panel-instruments';

type Readout = ReturnType<typeof bottleReadout>;

/** The head's housing, metres: the same unit on every bottle. */
export const DOSE_CELL_HEAD = { w: 0.2, h: 0.12, d: 0.15 } as const;

/**
 * Chlorella's DoseCell head (the owner, 2026-10-27): the one powered unit
 * that sits on every dose bottle's lid, the hypochlorite's and the acid's
 * alike but for its band (yellow, red). A rounded grey moulding holding
 * the ultrasonic sensor (looking down through the lid), the high and low
 * switches and the motorised dosing pump (its motor's dome on top); on its
 * front a 16 × 2 character LCD (its tag and litres, and a bar of blocks), a row of four small lamps
 * beneath it (HI, LO, CALL, PUMP) and DOSECELL; Chlorella's plate on its
 * right side; the pump's discharge gland on its left side and the power
 * gland at its back.
 *
 * Metres, its base's middle at the origin (on the lid), its front toward +z.
 */
export function createDoseCellHead(
  kit: PanelKit,
  { tag, acid }: { tag: string; acid: boolean },
) {
  const group = new Group();
  const t = plantTools(kit);
  const f = tools(kit);
  const { w, h, d } = DOSE_CELL_HEAD;
  const grey = t.paint('#c9ccc8', 0.45);
  const dark = t.paint('#2a2f31', 0.6);
  const band = t.paint(acid ? '#b92b24' : '#d2ae20', 0.5);
  const front = d / 2;

  // The housing, its band round its top, the motor's dome.
  const shell = new Mesh(new RoundedBoxGeometry(w, h, d, 3, 0.012), grey);
  shell.position.set(0, h / 2, 0);
  group.add(shell);
  t.box(group, band, w + 0.002, 0.014, d + 0.002, 0, h - 0.022, 0);
  t.cyl(group, dark, 0.048, 0.012, -0.045, h + 0.006, -0.02, 'y', 24);
  t.cyl(
    group,
    t.paint('#3e4a57', 0.4, 0.3),
    0.044,
    0.06,
    -0.045,
    h + 0.042,
    -0.02,
    'y',
    24,
  );
  t.cyl(
    group,
    t.paint('#3e4a57', 0.4, 0.3),
    0.03,
    0.014,
    -0.045,
    h + 0.079,
    -0.02,
    'y',
    20,
  );

  // The display in its dark bezel.
  t.box(group, dark, 0.15, 0.072, 0.004, 0, h * 0.62, front + 0.001);
  const lcd = createCharacterLcd(kit, {
    columns: 16,
    rows: 2,
    cell: 0.0048,
    backlight: true,
  });
  lcd.group.position.set(0, h * 0.62, front + 0.001);
  group.add(lcd.group);

  // The lamps in a row under the display, each with its legend below it.
  const lamps = (
    [
      ['HI', '#ff4a2e'],
      ['LO', '#ffb21c'],
      ['CALL', '#4aa8ff'],
      ['PUMP', '#3ee05a'],
    ] as const
  ).map(([name, colour], i) => {
    const mat = new MeshStandardMaterial({
      color: '#2b2f2e',
      emissive: colour,
      emissiveIntensity: 0,
      roughness: 0.4,
    });
    kit.materials.push(mat);
    const x = -0.045 + i * 0.03;
    const lamp = t.cyl(
      group,
      mat,
      0.0035,
      0.004,
      x,
      h * 0.27,
      front + 0.002,
      'z',
      12,
    );
    lamp.userData.live = true;
    f.label(group, name, x, h * 0.18, front + 0.001, 0.006, '#1b1b1b');
    return mat;
  });
  f.label(group, 'DOSECELL', 0, h * 0.08, front + 0.001, 0.008, '#2a2f31');

  // Chlorella's plate on its right side.
  const plate = chlorellaPlate(kit, d * 0.8, 'CHEMICAL HANDLING');
  plate.position.set(w / 2 + 0.001, h * 0.5, 0);
  plate.rotation.y = Math.PI / 2;
  group.add(plate);

  // The discharge gland (left side) and the power gland (back).
  t.cyl(group, dark, 0.009, 0.016, -w / 2 - 0.008, h * 0.5, 0, 'x', 10);
  t.cyl(group, dark, 0.01, 0.016, 0.06, h * 0.5, -d / 2 - 0.008, 'z', 10);

  return {
    object: group,
    /** Where the dosing tube leaves it, in its own frame. */
    dischargeAt: [-w / 2 - 0.016, h * 0.5, 0] as const,
    /** Where the power cable leaves it, in its own frame. */
    powerAt: [0.06, h * 0.5, -d / 2 - 0.016] as const,
    /** Its lamps from `o`, its display from the bottle `b` it heads. */
    show(o: Readout, b: DoseBottle) {
      const { lines, on: lit } = bottleLcd(tag, b, o.powered);
      lcd.show(lines, lit);
      const on = [o.high, o.low, o.calling, o.pumping];
      lamps.forEach((m, i) => (m.emissiveIntensity = on[i] ? 1.6 : 0));
    },
  };
}

/**
 * A DoseCell head alone on a plinth, for trying it: an ideal bottle of
 * `litres` beneath it (unseen) dosing down and refilled when it calls, so
 * its display counts and its lamps work.
 */
export function createDoseCellDemo(
  kit: PanelKit,
  { acid, litres = 30 }: { acid: boolean; litres?: number },
) {
  const head = createDoseCellHead(kit, {
    tag: acid ? 'DEMO-DT2' : 'DEMO-DT1',
    acid,
  });
  const object = onPlinth(kit, head.object, 0.32);
  let b = newDoseBottle(litres, acid ? 0.35 : 0.8);
  return {
    object,
    update(delta: number) {
      b = stepDoseBottle(
        b,
        { fillLpm: b.calling ? litres * 0.6 : 0, doseLpm: litres * 0.25 },
        delta,
      );
      head.show(bottleReadout(b), b);
    },
    status: () =>
      `DoseCell head (${acid ? 'acid' : 'hypochlorite'}): ${b.litres.toFixed(1)} L of ${litres} L${b.calling ? ', calling' : ''}${b.pumping ? ', pumping' : ''}`,
  };
}
