import { Group, Mesh, MeshStandardMaterial } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { plantTools } from './plant-tools';
import { describe } from './describe';
import { roundedSlab } from './rounded-slab';
import { chlorellaPlate } from './chlorella-plate';
import {
  bottleReadout,
  newDoseBottle,
  stepDoseBottle,
} from '../../../../game/plant/dose-bottle';
import { onPlinth } from './plinth';
import { hose } from './hose';
import type { DoseBottle } from '../../../../game/plant/dose-bottle';
import { createPartSet, pushButton } from '../../core/parts/parts';
import { partAudio } from '../../core/audio/part-audio';
import { SUBMERGED_PUMP } from '../audio/dosing-pump-sounds';
import {
  box,
  dotFrame,
  fillBox,
  isLit,
  text,
  textWidth,
} from '../../industrial-control/logic/dot-matrix';

/** Chlorella's colours (`brands.ts`). */
const CHLORELLA = { green: '#3f9b3a', pale: '#cfe9b0', dark: '#16301a' };

type Readout = ReturnType<typeof bottleReadout>;

/** The head's housing, metres: the same unit on every bottle. */
export const DOSE_CELL_HEAD = { w: 0.2, h: 0.13, d: 0.15 } as const;

/**
 * Chlorella's DoseCell head (the owner, 2026-10-27): the one powered unit
 * that sits on every dose bottle's lid, the hypochlorite's and the acid's
 * alike but for its band (yellow, red). A rounded grey moulding holding
 * the ultrasonic sensor (looking down through the lid), the high and low
 * switches and the motorised dosing pump (its motor's dome on top); on its
 * front, in Chlorella's green, a 96 × 40 dot graphic LCD of three pages
 * (contents, switches, pump), HI, LO, CALL and PUMP lamps, ◄ ► and TEST
 * keys that work, and DOSECELL; Chlorella's plate on its
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

  // A clamshell of cast polycarbonate: front and back halves, their edges
  // well rounded, the gasket between them in the chemical's colour; the
  // front's face flat, where the fascia sits. The motor's dome on top.
  const R = 0.012;
  const shell = new Mesh(new RoundedBoxGeometry(w, h, d, 3, R), grey);
  shell.position.set(0, h / 2, 0);
  group.add(shell);
  const gasket = new Mesh(
    roundedSlab(w + 0.002, h + 0.002, 0.006, R + 0.001),
    band,
  );
  gasket.position.set(0, h / 2, -d * 0.15);
  group.add(gasket);
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

  // The front, in Chlorella's livery: a green surround round a dark
  // membrane panel; a 96 × 40 dot graphic LCD (pale green dots on dark
  // green); HI, LO, CALL and PUMP lamps; three keys that work: ◄ and ►
  // turn its pages (contents, switches, pump), TEST lights every lamp.
  const green = t.paint(CHLORELLA.green, 0.45);
  t.box(
    group,
    green,
    w - 2 * R - 0.008,
    h - 2 * R - 0.008,
    0.003,
    0,
    h * 0.5,
    front + 0.0005,
  );
  t.box(
    group,
    t.paint('#1b211d', 0.3),
    w - 2 * R - 0.016,
    h - 2 * R - 0.016,
    0.003,
    0,
    h * 0.5,
    front + 0.003,
  );
  const GW = 96;
  const GH = 40;
  const lcd = f.printed(0.104, 0.044, () => {}, GW * 4, true);
  lcd.mesh.position.set(0, h * 0.645, front + 0.0048);
  lcd.mesh.userData.live = true;
  group.add(lcd.mesh);
  let page = 0;
  let testing = 0;
  let last: { o: Readout; b: DoseBottle } | null = null;
  let shown = '';
  let heard = false;
  // What the display shows, from its inputs: checked before the dots are
  // rasterised, so an unchanged display costs a string, not a 96 × 40
  // frame and its 3,840-dot key, each frame (mission 094).
  let inputs = '';
  const draw = () => {
    if (!last) return;
    const { o, b } = last;
    const on = o.powered;
    const wanted = on
      ? [
          page,
          testing > 0,
          page === 0
            ? `${b.litres.toFixed(b.capacity < 100 ? 1 : 0)}|${Math.round(Math.max(0, Math.min(1, b.litres / b.capacity)) * 1000)}`
            : page === 1
              ? `${o.high}${o.low}${o.calling}`
              : o.pumping,
        ].join('|')
      : 'off';
    if (wanted === inputs) return;
    inputs = wanted;
    const fr = dotFrame(GW, GH);
    if (on) {
      const level = Math.max(0, Math.min(1, b.litres / b.capacity));
      fillBox(fr, 0, 0, GW, 9);
      text(fr, 2, 1, tag.slice(0, 9), 1, false);
      text(
        fr,
        GW - 2 - textWidth(`${page + 1}/3`),
        1,
        `${page + 1}/3`,
        1,
        false,
      );
      if (testing > 0) fillBox(fr, 0, 10, GW, GH - 10);
      else if (page === 0) {
        const v = b.litres.toFixed(b.capacity < 100 ? 1 : 0);
        text(fr, GW - 14 - textWidth(v, 2), 13, v, 2);
        text(fr, GW - 12, 20, 'L');
        text(fr, 2, 13, `${Math.round(level * 100)}%`);
        box(fr, 2, 31, GW - 4, 8);
        fillBox(fr, 4, 33, Math.round((GW - 8) * level), 4);
      } else if (page === 1) {
        text(fr, 2, 13, `HIGH ${o.high ? 'ON ' : 'OFF'}`);
        text(fr, 2, 22, `LOW  ${o.low ? 'ON ' : 'OFF'}`);
        text(fr, 2, 31, o.calling ? 'CALLING FILL' : 'NOT CALLING');
      } else {
        text(fr, 2, 13, 'DOSING PUMP');
        text(fr, 2, 24, o.pumping ? 'RUNNING' : 'STANDING', 2);
      }
    }
    const key = `${on}${[...fr.dots].join('')}`;
    if (key === shown) return;
    shown = key;
    const c = lcd.context;
    const cw = c.canvas.width;
    const ch = c.canvas.height;
    const px = cw / GW;
    const py = ch / GH;
    c.fillStyle = on ? CHLORELLA.dark : '#070a08';
    c.fillRect(0, 0, cw, ch);
    if (on)
      for (let y = 0; y < GH; y++)
        for (let x = 0; x < GW; x++) {
          c.fillStyle = isLit(fr, x, y) ? CHLORELLA.pale : '#1f3a22';
          c.fillRect(x * px, y * py, px - 1, py - 1);
        }
    lcd.texture.needsUpdate = true;
  };

  // The lamps in a row under the display, each with its legend beside it.
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
    const x = -0.068 + i * 0.026;
    t.cyl(
      group,
      mat,
      0.0022,
      0.004,
      x,
      h * 0.4,
      front + 0.005,
      'z',
      12,
    ).userData.live = true;
    f.label(
      group,
      name,
      x + 0.0105,
      h * 0.4,
      front + 0.0047,
      0.0036,
      '#cfd6db',
    );
    return mat;
  });
  // The keys, small membrane domes, their legends beneath.
  const parts = createPartSet();
  (
    [
      ['◄', () => (page = (page + 2) % 3)],
      ['►', () => (page = (page + 1) % 3)],
      ['TEST', () => (testing = 2)],
    ] as const
  ).forEach(([legend, action], i) => {
    const x = 0.034 + i * 0.019;
    const b = pushButton(kit, {
      colour: 'black',
      legend,
      action: () => {
        action();
        draw();
      },
    });
    b.object.position.set(x, h * 0.27, front + 0.005);
    b.object.scale.setScalar(0.2);
    group.add(b.object);
    parts.add(b);
    f.label(group, legend, x, h * 0.175, front + 0.0047, 0.0034, '#cfd6db');
  });
  f.label(
    group,
    'DOSECELL',
    -0.045,
    h * 0.2,
    front + 0.0047,
    0.0055,
    CHLORELLA.pale,
  );

  // Chlorella's plate on its right side.
  const plate = chlorellaPlate(kit, d * 0.8, 'CHEMICAL HANDLING');
  plate.position.set(w / 2 + 0.001, h * 0.5, 0);
  plate.rotation.y = Math.PI / 2;
  group.add(plate);

  // The discharge gland (left side) and the power gland (back).
  t.cyl(group, dark, 0.009, 0.016, -w / 2 - 0.008, h * 0.5, 0, 'x', 10);
  t.cyl(group, dark, 0.01, 0.016, 0.06, h * 0.5, -d / 2 - 0.008, 'z', 10);

  describe(group, `DoseCell head ${tag}`, () => {
    if (!last) return undefined;
    const { o, b } = last;
    return `${b.litres.toFixed(1)} L; ${o.calling ? 'calling for a fill' : 'not calling'}; pump ${o.pumping ? 'running' : 'standing'}`;
  });
  return {
    object: group,
    /** Where the dosing tube leaves it, in its own frame. */
    dischargeAt: [-w / 2 - 0.016, h * 0.5, 0] as const,
    /** Where the power cable leaves it, in its own frame. */
    powerAt: [0.06, h * 0.5, -d / 2 - 0.016] as const,
    /** Its lamps from `o`, its display from the bottle `b` it heads. */
    parts,
    show(o: Readout, b: DoseBottle, delta = 0) {
      testing = Math.max(0, testing - delta);
      parts.update(delta);
      last = { o, b };
      if (o.pumping !== heard) {
        heard = o.pumping;
        partAudio.hold(group, heard ? SUBMERGED_PUMP : null, group);
      }
      draw();
      const t2 = testing > 0;
      const on = [o.high, o.low, o.calling, o.pumping];
      lamps.forEach((m, i) => (m.emissiveIntensity = t2 || on[i] ? 1.6 : 0));
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
  // Its dosing tube and power lead down the plinth to the floor.
  const tp = plantTools(kit);
  const [dx, dy, dz] = head.dischargeAt;
  hose(
    object,
    tp.paint('#ece9dc', 0.5),
    [
      [dx, 1.0 + dy, dz],
      [dx - 0.04, 0.95, dz],
      [-0.18, 0.5, dz],
      [-0.18, 0.01, dz + 0.1],
    ],
    0.004,
    0.01,
  );
  const [ex, ey, ez] = head.powerAt;
  hose(
    object,
    tp.paint('#2a2f31', 0.6),
    [
      [ex, 1.0 + ey, ez],
      [ex, 0.98, -0.18],
      [ex, 0.01, -0.22],
    ],
    0.005,
    0.01,
  );
  let b = newDoseBottle(litres, acid ? 0.35 : 0.8);
  return {
    object,
    parts: head.parts,
    update(delta: number) {
      b = stepDoseBottle(
        b,
        { fillLpm: b.calling ? litres * 0.6 : 0, doseLpm: litres * 0.25 },
        delta,
      );
      head.show(bottleReadout(b), b, delta);
    },
    status: () =>
      `DoseCell head (${acid ? 'acid' : 'hypochlorite'}): ${b.litres.toFixed(1)} L of ${litres} L${b.calling ? ', calling' : ''}${b.pumping ? ', pumping' : ''}`,
  };
}
