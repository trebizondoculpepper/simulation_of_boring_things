import { Group, Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import {
  createMicroLabel,
  createSevenSegment,
} from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { createCanvasTexture } from '../../core/views/screens';
import {
  SOURCE_SHAPE,
  SUBSTANCES,
  ratingLines,
} from '../../../../game/plant/experimental-source';
import type { ExperimentalTerminal } from '../../../../game/plant/experimental-source';

/**
 * The source or sink symbol: a ring with an arrow leaving it (a source)
 * or an arrow entering it to a dot (a sink), and the word under it, black
 * on a white plate. `size` is its side, metres.
 */
function terminalSymbol(kit: PanelKit, role: 'source' | 'sink', size: number) {
  const px = 256;
  const { context: c, texture } = createCanvasTexture(px, px);
  kit.textures.push(texture);
  c.fillStyle = '#f4f4ef';
  c.fillRect(0, 0, px, px);
  c.strokeStyle = '#111';
  c.fillStyle = '#111';
  c.lineWidth = 12;
  c.strokeRect(6, 6, px - 12, px - 12);
  const cx = px / 2;
  const cy = 100;
  const ring = 44;
  c.beginPath();
  c.arc(cx, cy, ring, 0, Math.PI * 2);
  c.stroke();
  const arrow = (x0: number, y0: number, x1: number, y1: number) => {
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x1, y1);
    c.stroke();
    const a = Math.atan2(y1 - y0, x1 - x0);
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x1 - 26 * Math.cos(a - 0.45), y1 - 26 * Math.sin(a - 0.45));
    c.lineTo(x1 - 26 * Math.cos(a + 0.45), y1 - 26 * Math.sin(a + 0.45));
    c.closePath();
    c.fill();
  };
  if (role === 'source') {
    // From the middle, out through the ring.
    c.beginPath();
    c.arc(cx, cy, 10, 0, Math.PI * 2);
    c.fill();
    arrow(cx, cy, cx + 96, cy);
  } else {
    // From outside, in through the ring, to its middle.
    arrow(cx - 100, cy, cx - 12, cy);
    c.beginPath();
    c.arc(cx, cy, 10, 0, Math.PI * 2);
    c.fill();
  }
  c.font = 'bold 44px Helvetica, Arial, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(role === 'source' ? 'SOURCE' : 'SINK', cx, 208);
  texture.needsUpdate = true;
  const mesh = new Mesh(
    new PlaneGeometry(size, size),
    new MeshStandardMaterial({ map: texture, roughness: 0.7 }),
  );
  mesh.name = role === 'source' ? 'Source symbol' : 'Sink symbol';
  return mesh;
}

/**
 * An experimental source or sink, always drawn the same way so that it
 * reads as a placeholder (`game/plant/experimental-source.ts`): a cylinder
 * in its substance's basic identification colour (BS 1710; power banded
 * in its IEC 60309 voltage colour), with its code bands round it, a plate
 * naming it, and the source or sink symbol on top of its front. Each port
 * is drawn where the model puts it: a steel stud for each typed output or
 * input, ending at its port, and a cable gland on top for its control
 * port, whose value an LED readout on the front shows (-oo- if infinite).
 * It has no switch: a valve starts and stops what flows. `update`
 * refreshes the readout.
 */
export function createExperimentalSourceView(
  kit: PanelKit,
  terminal: ExperimentalTerminal,
) {
  const t = tools(kit);
  const group = new Group();
  const { colour, bands, label, unit } = SUBSTANCES[terminal.spec.substance];
  const role = terminal.role;
  group.name = `Experimental ${role}: ${label}`;
  const body = t.paint(colour, 0.55);
  const plate = t.paint('#1d2326', 0.6);
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
      0.53 - k * bandH,
      0,
      'y',
      32,
    ),
  );
  // Its name plate, front (+z).
  t.box(group, plate, 0.34, 0.07, 0.006, 0, 0.83, r + 0.003);
  const name = createMicroLabel(
    kit,
    `EXPERIMENTAL ${role.toUpperCase()}\n${label}`,
    { height: 0.022, ink: '#f2f2ec', maxWidth: 0.32 },
  );
  name.position.set(0, 0.83, r + 0.008);
  group.add(name);
  // Its rating plate: substance, maximum flow, resistance, potential.
  t.box(
    group,
    t.paint('#d9dcd6', 0.5, 0.3),
    0.36,
    0.14,
    0.006,
    0,
    0.69,
    r + 0.003,
  );
  const rating = createMicroLabel(kit, ratingLines(terminal).join('\n'), {
    height: 0.016,
    ink: '#1d2326',
    maxWidth: 0.34,
  });
  rating.position.set(0, 0.69, r + 0.008);
  group.add(rating);
  // The source or sink symbol, above it.
  const symbol = terminalSymbol(kit, role, 0.15);
  symbol.position.set(0, 0.97, r + 0.004);
  group.add(symbol);
  for (const p of terminal.ports) {
    const id = `${terminal.spec.id}.${p.name}`;
    const [ox, oy, oz] = p.out;
    if (p.data.medium === 'control') {
      // A cable gland, its top at the port.
      const g = t.cyl(
        group,
        grey,
        0.018,
        gland,
        p.at[0],
        p.at[1] - gland / 2,
        p.at[2],
        'y',
        12,
      );
      g.name = id;
      g.userData.graphPortId = id;
      continue;
    }
    // A stud from the cylinder's skin out to the port, along its facing.
    const stud = t.cyl(
      group,
      steel,
      0.03,
      length,
      p.at[0] - (ox * length) / 2,
      p.at[1] - (oy * length) / 2,
      p.at[2] - (oz * length) / 2,
      'y',
      12,
    );
    // Laid along its facing: tipped onto z, then turned round y.
    stud.rotation.order = 'YXZ';
    stud.rotation.set(Math.PI / 2, Math.atan2(ox, oz), 0);
    stud.name = id;
    stud.userData.graphPortId = id;
    const tag = createMicroLabel(kit, p.name.toUpperCase(), {
      height: 0.012,
      ink: '#ecf1ed',
      plate: '#283237',
      maxWidth: 0.1,
      faceCamera: true,
    });
    tag.position.set(p.at[0], p.at[1] + 0.07, p.at[2]);
    group.add(tag);
  }
  // The control port's value, shown on the front.
  const y = 0.3;
  t.box(group, grey, 0.16, 0.08, 0.03, 0, y, r + 0.012);
  const readout = createSevenSegment(kit, 5, { digitHeight: 0.022 });
  readout.group.position.set(0, y, r + 0.03);
  group.add(readout.group);
  const unitTag = createMicroLabel(
    kit,
    `${role === 'source' ? 'REMAINING' : 'CAPACITY'}  ${unit}`,
    { height: 0.011, ink: '#ecf1ed', plate: '#283237', maxWidth: 0.16 },
  );
  unitTag.position.set(0, y - 0.06, r + 0.03);
  group.add(unitTag);
  let shown = '';
  const update = () => {
    // LED digits have no point: whole units, and infinity as -oo-.
    const text = terminal.endless
      ? '-oo-'
      : String(Math.round(terminal.value()));
    if (text === shown) return;
    shown = text;
    readout.show(text);
  };
  update();
  return { group, update };
}
