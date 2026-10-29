import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { createWrappedLettering } from '../../core/views/wrapped-lettering';
import {
  SOURCE_SHAPE,
  SUBSTANCES,
  lcdLines,
  letteringLines,
} from '../../../../game/plant/experimental-source';
import { createCharacterLcd } from '../../industrial-control/views/panel-instruments';
import type { ExperimentalTerminal } from '../../../../game/plant/experimental-source';

/**
 * Where the lettering wraps round the front: 160° of the curve, between
 * the code bands and the display (the owner, 2026-10-29).
 */
const LETTERING = {
  arc: (160 * Math.PI) / 180,
  bottom: 0.5,
  top: 0.88,
} as const;

/** Ink that reads on `body`: near-black on a light colour, near-white on a dark one. */
function inkFor(body: string) {
  const n = parseInt(body.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((c) => c / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? '#141414' : '#f4f4ef';
}

/**
 * An experimental source or sink, always drawn the same way so that it
 * reads as a placeholder (`game/plant/experimental-source.ts`): a cylinder
 * in its substance's basic identification colour (BS 1710; power banded
 * in its IEC 60309 voltage colour), with its code bands round it, and
 * its substance, role and maximum flow lettered round its front in two
 * lines. Each port
 * is drawn where the model puts it: an upright steel stud across its top
 * for each typed output or input, ending at its port, and a cable gland on
 * its back for its control
 * port, whose value, with its unit, a backlit dot-matrix display on the front (and back) shows (-oo- if infinite).
 * It has no switch: a valve starts and stops what flows. `update`
 * refreshes the readout.
 */
export function createExperimentalSourceView(
  kit: PanelKit,
  terminal: ExperimentalTerminal,
) {
  const t = tools(kit);
  const group = new Group();
  const { colour, bands, label } = SUBSTANCES[terminal.spec.substance];
  const role = terminal.role;
  group.name = `Experimental ${role}: ${label}`;
  const body = t.paint(colour, 0.55);
  const grey = t.paint('#3a3f42', 0.6);
  const steel = t.paint('#c9cfcf', 0.4, 0.5);
  const { radius: r, height: h, stud: length, gland } = SOURCE_SHAPE;
  t.cyl(group, body, r, h, 0, h / 2, 0, 'y', 32);
  // Its lid, sunk 2 cm into the body so no face of it lies on the body's
  // top (the owner, 2026-10-29: it z-fought when it sat on it).
  t.cyl(group, body, r * 0.98, 0.03, 0, h - 0.005, 0, 'y', 32);
  // Its code bands, round it, top to bottom (BS 1710).
  const bandH = 0.05;
  bands.forEach((band, k) =>
    t.cyl(
      group,
      t.paint(band, 0.55),
      r + 0.002,
      bandH,
      0,
      0.4 - k * bandH,
      0,
      'y',
      32,
    ),
  );
  // Its lettering, painted on its front and again on its back.
  const front = createWrappedLettering(kit, {
    radius: r,
    arc: LETTERING.arc,
    bottom: LETTERING.bottom,
    height: LETTERING.top - LETTERING.bottom,
    lines: letteringLines(terminal),
    ink: inkFor(colour),
    name: `Lettering: experimental ${role}, ${label}`,
  });
  const back = front.clone();
  back.rotation.y = Math.PI;
  group.add(front, back);
  for (const p of terminal.ports) {
    const id = `${terminal.spec.id}.${p.name}`;
    if (p.data.medium === 'control') {
      // A cable gland on the back, its end at the port.
      const g = t.cyl(
        group,
        grey,
        0.018,
        gland,
        p.at[0],
        p.at[1],
        p.at[2] + gland / 2,
        'z',
        12,
      );
      g.name = id;
      g.userData.graphPortId = id;
      continue;
    }
    // An upright stud on the top, its end at the port.
    const stud = t.cyl(
      group,
      steel,
      0.03,
      length,
      p.at[0],
      p.at[1] - length / 2,
      p.at[2],
      'y',
      12,
    );
    stud.name = id;
    stud.userData.graphPortId = id;
    const tag = createMicroLabel(kit, p.name.toUpperCase(), {
      height: 0.012,
      ink: '#ecf1ed',
      plate: '#283237',
      maxWidth: 0.1,
    });
    // Printed on its side under the stud, flush with the cylinder (the
    // owner, 2026-10-28: a label on the bottle, not a sign on a post).
    const along = Math.max(-r * 0.6, Math.min(r * 0.6, p.at[0]));
    const z = Math.sqrt(Math.max(0, r * r - along * along));
    tag.position.set(along, SOURCE_SHAPE.height - 0.03, z + 0.002);
    tag.rotation.y = Math.atan2(along, z);
    group.add(tag);
  }
  // The control port's value, with its unit, on a backlit dot-matrix
  // display (a 16 × 2 character LCD), front and back.
  // Near the top of the cylinder, where it is read standing.
  const y = 1.0;
  const displays = [0, Math.PI].map((turn) => {
    const face = new Group();
    face.rotation.y = turn;
    group.add(face);
    t.box(face, grey, 0.27, 0.085, 0.04, 0, y, r + 0.006);
    const lcd = createCharacterLcd(kit, {
      columns: 16,
      rows: 2,
      cell: 0.0092,
      backlight: true,
    });
    // 2 mm proud of its bezel's face (r + 0.026), not 1: closer, it
    // flickered against it (the owner, 2026-10-26).
    lcd.group.position.set(0, y, r + 0.028);
    face.add(lcd.group);
    return lcd;
  });
  let shown = '';
  const update = () => {
    const lines = lcdLines(terminal);
    const key = lines.join('|');
    if (key === shown) return;
    shown = key;
    for (const lcd of displays) lcd.show(lines);
  };
  update();
  return { group, update };
}
