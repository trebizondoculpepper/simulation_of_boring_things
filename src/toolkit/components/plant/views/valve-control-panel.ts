import { signal } from '@preact/signals-core';
import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { panelMakerMark } from '../../core/views/panel-maker-mark';
import { createPartSet, pilotLight, selector } from '../../core/parts/parts';
import { plantTools } from './plant-tools';

/** One motorised valve on the panel: its tag, what it is, and its state in the world. */
export interface PanelValve {
  tag: string;
  legend: string;
  open(): boolean;
  set(open: boolean): void;
}

/** The enclosure's size, metres: width, height, depth off the wall. */
export const VALVE_PANEL = { w: 0.44, h: 0.16, d: 0.12 } as const;
const ROW = 0.13;

/**
 * A small wall-mounted panel by Penfold Controls working motorised valves
 * (the owner, 2026-10-23: the foot spa's valves made electric, worked from
 * a panel on its room's east wall): a steel enclosure, its title engraved
 * across the top, and a row for each valve, its tag and name, a two-way
 * SHUT / OPEN selector, and its OPEN (green) and SHUT (red) lamps, lit by
 * the actuator's limit switches as the world has the valve. Its back on
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
  const h = VALVE_PANEL.h + valves.length * ROW;
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
    const y = h / 2 - 0.13 - i * ROW;
    const tag = createMicroLabel(kit, `${valve.tag}\n${valve.legend}`, {
      height: 0.012,
      ink: '#19242a',
      plate: '#f0ede3',
      // Wide enough for the longest name, so every plate's text is one size.
      maxWidth: 0.16,
    });
    tag.position.set(-w / 2 + 0.095, y, 0.001);
    front.add(tag);
    const switched = parts.add(
      selector(kit, {
        positions: 2,
        initial: valve.open() ? 1 : 0,
        bound: {
          get value() {
            return valve.open() ? 1 : 0;
          },
          set: (position) => valve.set(position === 1),
        },
        legend: 'SHUT  OPEN',
        name: `${valve.tag} selector`,
      }),
    );
    switched.object.position.set(0.0, y, 0);
    switched.object.scale.setScalar(0.8);
    front.add(switched.object);
    const open = signal(valve.open());
    const shut = signal(!valve.open());
    updates.push(() => {
      open.value = valve.open();
      shut.value = !open.value;
    });
    (
      [
        ['OPEN', 'green', open],
        ['SHUT', 'red', shut],
      ] as const
    ).forEach(([legend, colour, drive], j) => {
      const lamp = parts.add(
        pilotLight(kit, {
          colour,
          legend,
          drive,
          pushToTest: false,
          name: `${valve.tag} ${legend.toLowerCase()} lamp`,
        }),
      );
      lamp.object.position.set(0.1 + j * 0.08, y, 0);
      lamp.object.scale.setScalar(0.8);
      front.add(lamp.object);
    });
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
