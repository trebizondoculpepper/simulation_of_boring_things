import { signal } from '@preact/signals-core';
import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { panelMakerMark } from '../../core/views/panel-maker-mark';
import { createPartSet, pushButton } from '../../core/parts/parts';
import { plantTools } from './plant-tools';

/** One motorised valve on the panel: its tag, what it is, and its state in the world. */
export interface PanelValve {
  tag: string;
  legend: string;
  open(): boolean;
  set(open: boolean): void;
}

/** The enclosure's size, metres: width, height, depth off the wall. */
export const VALVE_PANEL = { w: 0.82, h: 0.16, d: 0.12 } as const;
const ROW = 0.16;

/**
 * A small wall-mounted panel by Penfold Controls working motorised valves
 * (the owner, 2026-10-23: the foot spa's valves made electric, worked from
 * a panel on its room's east wall): a steel enclosure, its title engraved
 * across the top, and a row for each valve, its tag and name, a two-way
 * separate illuminated SHUT (red) and OPEN (green) buttons. Two valves
 * share each row; their lenses follow the actuator's state in the world. Its back on
 * the wall at the origin, facing +z, its middle at the origin's height.
 */
export function createValveControlPanel(
  kit: PanelKit,
  title: string,
  valves: readonly PanelValve[],
) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = `${title} panel`;
  const { w, d } = VALVE_PANEL;
  const h = VALVE_PANEL.h + Math.ceil(valves.length / 2) * ROW;
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
    height: 0.02,
    ink: '#f2f2ea',
    plate: '#25343a',
    maxWidth: w - 0.12,
  });
  name.position.set(-0.04, h / 2 - 0.045, 0.001);
  front.add(name);
  const parts = createPartSet();
  const updates: (() => void)[] = [];
  valves.forEach((valve, i) => {
    const y = h / 2 - 0.16 - Math.floor(i / 2) * ROW;
    const x = i % 2 === 0 ? -w / 4 : w / 4;
    const tag = createMicroLabel(kit, `${valve.tag}\n${valve.legend}`, {
      height: 0.012,
      ink: '#19242a',
      plate: '#f0ede3',
      // Wide enough for the longest name, so every plate's text is one size.
      maxWidth: 0.16,
    });
    tag.position.set(x - 0.1, y, 0.001);
    front.add(tag);
    const open = signal(valve.open());
    const shut = signal(!valve.open());
    updates.push(() => {
      open.value = valve.open();
      shut.value = !open.value;
    });
    for (const [legend, colour, offset, command, drive] of [
      ['SHUT', 'red', 0.015, false, shut],
      ['OPEN', 'green', 0.125, true, open],
    ] as const) {
      const button = parts.add(
        pushButton(kit, {
          colour,
          head: 'illuminated',
          legend,
          lamp: drive,
          name: `${valve.tag} ${legend.toLowerCase()} button`,
          action: () => valve.set(command),
        }),
      );
      button.object.position.set(x + offset, y, 0);
      button.object.scale.setScalar(0.75);
      front.add(button.object);
    }
  });
  return {
    group,
    parts,
    /** Its height, metres, for the room's keep-clear. */
    height: h,
    update(delta: number) {
      for (const update of updates) update();
      parts.update(delta);
    },
  };
}
