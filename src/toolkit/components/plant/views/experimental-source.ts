import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import {
  createMicroLabel,
  createSevenSegment,
} from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import {
  SOURCE_SHAPE,
  SUBSTANCES,
} from '../../../../game/plant/experimental-source';
import type { ExperimentalSource } from '../../../../game/plant/experimental-source';

/**
 * An experimental source, always drawn the same way so that it reads as a
 * placeholder (`game/plant/experimental-source.ts`): a cylinder in its
 * substance's colour with a white band reading EXPERIMENTAL and what it
 * holds. Each port is drawn where the model puts it: a steel stud for each
 * typed output, ending at its port, and a cable gland on top for its
 * `remaining` control port, whose value an LED readout on the front shows
 * (-oo- for an endless supply). It has no switch: a valve downstream
 * starts and stops its supply. `update` refreshes the readout.
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
  const { radius: r, height: h, stud: length, gland } = SOURCE_SHAPE;
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
  for (const p of source.ports) {
    const id = `${source.spec.id}.${p.name}`;
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
  // The `remaining` port's value, shown on the front.
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
