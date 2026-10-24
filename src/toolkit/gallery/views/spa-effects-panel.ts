import { signal } from '@preact/signals-core';
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
  pushButton,
} from '../../components/core/parts/parts';
import { plantTools } from '../../components/plant/views/plant-tools';

/**
 * A development room's direct effects panel for a spa tub (the owner,
 * 2026-10-24: dev35's): a Penfold enclosure with its LEVEL knob from
 * empty to full in 5 % steps and an LED readout of it, and an illuminated
 * button each for the JETS, the LIGHT and the BUBBLES, pressed on and
 * pressed off, lit while on. It sets the room's tub, past its controller,
 * not the world. Its back on the wall at the origin, facing +z.
 */
export function createSpaEffectsPanel(kit: PanelKit, title: string) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = `${title} panel`;
  const w = 0.5;
  const h = 0.28;
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
    maxWidth: w - 0.12,
  });
  name.position.set(-0.05, h / 2 - 0.035, 0.001);
  front.add(name);
  const parts = createPartSet();
  // Its level: twenty steps of 5 %, full to start.
  const knob = parts.add(
    potentiometer(kit, {
      steps: 20,
      initial: 1,
      legend: 'LEVEL',
      name: 'Tub water level knob',
    }),
  );
  knob.object.position.set(-0.18, -0.03, 0);
  front.add(knob.object);
  const readout = createSevenSegment(kit, 3, { digitHeight: 0.026 });
  readout.group.position.set(-0.07, -0.01, 0.002);
  readout.group.traverse((o) => (o.userData.live = true));
  front.add(readout.group);
  const unit = createDymoLabel(kit, 'LEVEL %', { seed: 35 });
  unit.position.set(-0.07, -0.06, 0.003);
  front.add(unit);
  // Its effects: each an illuminated button, a press toggling it.
  const toggle = (
    legend: string,
    colour: 'green' | 'white' | 'blue',
    x: number,
  ) => {
    const on = signal(false);
    const button = parts.add(
      pushButton(kit, {
        colour,
        head: 'illuminated',
        lamp: on,
        legend,
        name: `Tub ${legend.toLowerCase()} button`,
        action: () => (on.value = !on.value),
      }),
    );
    button.object.position.set(x, -0.03, 0);
    front.add(button.object);
    return on;
  };
  const jets = toggle('JETS', 'green', 0.04);
  const light = toggle('LIGHT', 'white', 0.11);
  const bubbles = toggle('BUBBLES', 'blue', 0.18);
  return {
    group,
    parts,
    /** The tub's effects, as `SpaEffects` wants them. */
    effects: { level: knob.share, jets, bubbles, light },
    update(delta: number) {
      readout.show(String(Math.round(knob.share.value * 100)));
      parts.update(delta);
    },
    dispose() {
      parts.dispose();
    },
  };
}

/** A waist-high pedestal leaves the water visible over the effects controls. */
export function mountSpaEffectsOnPost(kit: PanelKit, panel: Group) {
  const t = plantTools(kit);
  const stand = new Group();
  stand.name = 'Tub effects control post';
  const steel = t.paint('#88979a', 0.42);
  t.box(stand, steel, 0.24, 0.035, 0.24, 0, 0.018, 0);
  t.box(stand, steel, 0.065, 1.03, 0.065, 0, 0.53, -0.04);
  t.box(stand, steel, 0.34, 0.035, 0.16, 0, 1.065, -0.035);
  panel.position.set(0, 1.15, -0.08);
  stand.add(panel);
  return stand;
}
