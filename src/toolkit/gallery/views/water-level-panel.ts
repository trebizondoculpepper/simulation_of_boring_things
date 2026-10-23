import { Group } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import {
  createMicroLabel,
  createSevenSegment,
} from '../../components/core/views/eighties-controls';
import { panelMakerMark } from '../../components/core/views/panel-maker-mark';
import { createDymoLabel } from '../../components/core/views/hand-labels';
import {
  createPartSet,
  potentiometer,
} from '../../components/core/parts/parts';
import { plantTools } from '../../components/plant/views/plant-tools';

/**
 * A development room's water level panel (the owner, 2026-10-24: the
 * footbath cloned, its level set by hand): a small Penfold enclosure, its
 * LEVEL knob from empty to full in twenty steps, and an LED readout of
 * the level in per cent, its unit on Dymo tape. It sets the room's water,
 * not the world's. Its back on the wall at the origin, facing +z.
 */
export function createWaterLevelPanel(kit: PanelKit, title: string) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = `${title} panel`;
  const w = 0.32;
  const h = 0.26;
  const d = 0.1;
  t.box(group, t.paint('#c8ccc4', 0.55), w, h, d, 0, 0, d / 2);
  const front = new Group();
  front.position.z = d + 0.001;
  group.add(front);
  panelMakerMark(kit, front, {
    width: w,
    height: h,
    z: 0,
    corner: 'top-right',
  });
  const name = createMicroLabel(kit, title, {
    height: 0.018,
    ink: '#f2f2ea',
    plate: '#25343a',
    maxWidth: w - 0.1,
  });
  name.position.set(-0.035, h / 2 - 0.035, 0.001);
  front.add(name);
  const parts = createPartSet();
  const knob = parts.add(
    potentiometer(kit, {
      steps: 20,
      initial: 1,
      legend: 'LEVEL',
      name: 'Water level knob',
    }),
  );
  knob.object.position.set(-0.07, -0.02, 0);
  front.add(knob.object);
  const readout = createSevenSegment(kit, 3, { digitHeight: 0.03 });
  readout.group.position.set(0.065, 0.0, 0.002);
  readout.group.traverse((o) => (o.userData.live = true));
  front.add(readout.group);
  const unit = createDymoLabel(kit, 'LEVEL %', { seed: 33 });
  unit.position.set(0.065, -0.055, 0.003);
  front.add(unit);
  return {
    group,
    parts,
    /** The level set, 0 empty to 1 full. */
    share: knob.share,
    update(delta: number) {
      readout.show(String(Math.round(knob.share.value * 100)));
      parts.update(delta);
    },
    dispose() {
      parts.dispose();
    },
  };
}
