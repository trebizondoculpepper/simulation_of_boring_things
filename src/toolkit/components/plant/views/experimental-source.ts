import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import {
  createMicroLabel,
  createSevenSegment,
} from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { SUBSTANCES } from '../../../../game/plant/experimental-source';
import type { ExperimentalSource } from '../../../../game/plant/experimental-source';

/** An experimental source's cylinder: radius, height, and where its outputs stand, metres. */
export const SOURCE_SHAPE = {
  radius: 0.25,
  height: 1.1,
  outputs: 0.85,
} as const;

/**
 * An experimental source, always drawn the same way so that it reads as a
 * placeholder (`game/plant/experimental-source.ts`): a cylinder in its
 * substance's colour with a white band reading EXPERIMENTAL and what it
 * holds, a stud for each typed output round its side, and its `remaining`
 * control port: a small box with an LED readout of what is left (∞ for an
 * endless supply). `update` refreshes the readout. Its own frame: standing
 * on the floor, its outputs toward −z and round.
 */
export function createExperimentalSourceView(
  kit: PanelKit,
  source: ExperimentalSource,
) {
  const t = tools(kit);
  const group = new Group();
  const { colour, label, unit } = SUBSTANCES[source.spec.substance];
  group.name = `Experimental source: ${label}`;
  const body = t.paint(colour, 0.55);
  const white = t.paint('#f2f2ec', 0.6);
  const grey = t.paint('#3a3f42', 0.6);
  const steel = t.paint('#c9cfcf', 0.4, 0.5);
  const { radius: r, height: h } = SOURCE_SHAPE;
  t.cyl(group, body, r, h, 0, h / 2, 0, 'y', 32);
  t.cyl(group, body, r * 0.98, 0.02, 0, h + 0.01, 0, 'y', 32);
  // Its band, front (+z).
  t.cyl(group, white, r + 0.002, 0.16, 0, h * 0.62, 0, 'y', 32);
  const band = createMicroLabel(kit, `EXPERIMENTAL\n${label}`, {
    height: 0.03,
    ink: '#1d2326',
    maxWidth: 0.4,
  });
  band.position.set(0, h * 0.62, r + 0.004);
  group.add(band);
  // Its outputs, round the back half of the cylinder.
  const n = source.spec.outputs;
  source.ports
    .filter((p) => p.name.startsWith('out-'))
    .forEach((p, k) => {
      const a = Math.PI + (n === 1 ? 0 : (k / (n - 1) - 0.5) * Math.PI * 0.8);
      const x = Math.sin(a) * (r + 0.04);
      const z = Math.cos(a) * (r + 0.04);
      const stud = t.cyl(
        group,
        steel,
        0.03,
        0.08,
        x,
        SOURCE_SHAPE.outputs,
        z,
        'y',
        12,
      );
      // Pointing straight out from the cylinder: tipped onto z, then turned to `a`.
      stud.rotation.order = 'YXZ';
      stud.rotation.set(Math.PI / 2, a, 0);
      stud.name = `${source.spec.id}.${p.name}`;
      stud.userData.graphPortId = `${source.spec.id}.${p.name}`;
      const tag = createMicroLabel(kit, p.name.toUpperCase(), {
        height: 0.012,
        ink: '#ecf1ed',
        plate: '#283237',
        maxWidth: 0.1,
        faceCamera: true,
      });
      tag.position.set(x, SOURCE_SHAPE.outputs + 0.07, z);
      group.add(tag);
    });
  // Its control port, `remaining`: a box on the front with its readout.
  t.box(group, grey, 0.16, 0.08, 0.03, 0, h * 0.4, r + 0.012);
  const readout = createSevenSegment(kit, 5, { digitHeight: 0.022 });
  readout.group.position.set(0, h * 0.4, r + 0.03);
  group.add(readout.group);
  const unitTag = createMicroLabel(kit, `REMAINING  ${unit}`, {
    height: 0.011,
    ink: '#ecf1ed',
    plate: '#283237',
    maxWidth: 0.16,
  });
  unitTag.position.set(0, h * 0.4 - 0.06, r + 0.03);
  group.add(unitTag);
  let shown = '';
  const update = () => {
    // LED digits have no point: whole units, and an endless supply's
    // infinity as -oo-.
    const text = source.endless
      ? '-oo-'
      : String(Math.round(source.remaining()));
    if (text === shown) return;
    shown = text;
    readout.show(text);
  };
  update();
  return { group, update };
}
