import { CylinderGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { createCanvasTexture } from '../../core/views/screens';
import {
  SOURCE_SHAPE,
  SUBSTANCES,
  lcdLines,
  ratingLines,
} from '../../../../game/plant/experimental-source';
import { createCharacterLcd } from '../../industrial-control/views/panel-instruments';
import type { ExperimentalTerminal } from '../../../../game/plant/experimental-source';

/**
 * Arc and heights of the lettering, set below the display near the top
 * (the owner, 2026-10-23); the positions in `paintedLettering` are given
 * as before and dropped by `drop`.
 */
const LETTERING = { arc: 1.7, bottom: 0.45, top: 0.93, drop: 0.13 } as const;

/** Ink that reads on `body`: near-black on a light colour, near-white on a dark one. */
function inkFor(body: string) {
  const n = parseInt(body.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((c) => c / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? '#141414' : '#f4f4ef';
}

/**
 * The lettering painted straight onto the cylinder's front, as a stencil
 * would put it: the source or sink symbol (a ring with an arrow leaving it,
 * or an arrow entering it to a dot) and its word, EXPERIMENTAL SOURCE (or
 * SINK) and the substance, and the rating lines. One transparent texture
 * on a curved skin a hair off the body, so it follows the curve.
 */
function paintedLettering(
  kit: PanelKit,
  terminal: ExperimentalTerminal,
  radius: number,
  ink: string,
) {
  const { arc, bottom, top } = LETTERING;
  const width = radius * arc;
  const height = top - bottom;
  const scale = 1400; // pixels a metre
  const W = Math.round(width * scale);
  const H = Math.round(height * scale);
  const { context: c, texture } = createCanvasTexture(W, H);
  kit.textures.push(texture);
  c.clearRect(0, 0, W, H);
  c.strokeStyle = ink;
  c.fillStyle = ink;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const yAt = (metres: number) => (top - (metres - LETTERING.drop)) * scale;
  const cx = W / 2;
  // The symbol.
  const role = terminal.role;
  const sy = yAt(0.985);
  const ring = 0.03 * scale;
  c.lineWidth = 0.006 * scale;
  c.beginPath();
  c.arc(cx, sy, ring, 0, Math.PI * 2);
  c.stroke();
  const dot = () => {
    c.beginPath();
    c.arc(cx, sy, 0.007 * scale, 0, Math.PI * 2);
    c.fill();
  };
  const arrow = (x0: number, x1: number) => {
    c.beginPath();
    c.moveTo(x0, sy);
    c.lineTo(x1, sy);
    c.stroke();
    const head = 0.017 * scale;
    const d = Math.sign(x1 - x0);
    c.beginPath();
    c.moveTo(x1, sy);
    c.lineTo(x1 - d * head, sy - head * 0.5);
    c.lineTo(x1 - d * head, sy + head * 0.5);
    c.closePath();
    c.fill();
  };
  dot();
  if (role === 'source') arrow(cx, cx + 0.065 * scale);
  else arrow(cx - 0.07 * scale, cx - 0.009 * scale);
  const font = (metres: number, weight = 'bold') =>
    `${weight} ${Math.round(metres * scale)}px Helvetica, Arial, sans-serif`;
  c.font = font(0.019);
  c.fillText(role === 'source' ? 'SOURCE' : 'SINK', cx, yAt(0.935));
  // Its name.
  const { label } = SUBSTANCES[terminal.spec.substance];
  c.font = font(0.024);
  c.fillText(`EXPERIMENTAL ${role.toUpperCase()}`, cx, yAt(0.875));
  c.fillText(label, cx, yAt(0.845));
  // Its rating.
  c.font = font(0.021, 'normal');
  ratingLines(terminal).forEach((line, k) =>
    c.fillText(line, cx, yAt(0.795 - k * 0.03)),
  );
  texture.needsUpdate = true;
  const skin = new Mesh(
    new CylinderGeometry(
      radius + 0.0015,
      radius + 0.0015,
      height,
      32,
      1,
      true,
      -arc / 2,
      arc,
    ),
    new MeshStandardMaterial({
      map: texture,
      transparent: true,
      roughness: 0.6,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    }),
  );
  skin.position.y = bottom + height / 2;
  skin.name = `Lettering: experimental ${role}, ${label}`;
  return skin;
}

/**
 * An experimental source or sink, always drawn the same way so that it
 * reads as a placeholder (`game/plant/experimental-source.ts`): a cylinder
 * in its substance's basic identification colour (BS 1710; power banded
 * in its IEC 60309 voltage colour), with its code bands round it, and
 * its symbol, name and rating lettered straight onto its front. Each port
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
  t.cyl(group, body, r * 0.98, 0.02, 0, h + 0.01, 0, 'y', 32);
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
  const front = paintedLettering(kit, terminal, r, inkFor(colour));
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
      faceCamera: true,
    });
    tag.position.set(p.at[0], p.at[1] + 0.05, p.at[2] + 0.05);
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
    lcd.group.position.set(0, y, r + 0.027);
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
