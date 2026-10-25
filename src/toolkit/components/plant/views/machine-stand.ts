import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { markComponent } from '../../core/views/component-identity';
import { plantTools } from './plant-tools';

/**
 * A machine's stand: a galvanised steel frame that raises it off the
 * floor, so its low connections, and the pipes to them, stay clear of the
 * floor (the owner, 2026-10-25, for the Olympic's heat exchanger: "just a
 * metal frame"). Four 50 mm box-section legs on base plates bolted down, a
 * 50 mm angle frame round the top for the machine's feet, and a rail round
 * the legs low down. `w` along its front, `d` front to back, `h` to the
 * top of the frame, metres; standing on the floor at its middle. Set
 * decoration: it holds the machine up and does nothing else.
 */
export function createMachineStand(
  kit: PanelKit,
  w: number,
  d: number,
  h: number,
) {
  const t = plantTools(kit);
  const steel = t.paint('#a3a9ab', 0.45, 0.6);
  const group = new Group();
  group.name = 'Machine stand';
  const leg = 0.05;
  const x = w / 2 - leg / 2;
  const z = d / 2 - leg / 2;
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      t.box(group, steel, leg, h, leg, sx * x, h / 2, sz * z);
      // Its base plate, bolted to the floor.
      t.box(group, steel, 0.12, 0.008, 0.12, sx * x, 0.004, sz * z);
    }
  // The top frame and a rail low down, round all four sides.
  for (const y of [h - 0.025, 0.15]) {
    for (const sz of [-1, 1])
      t.box(group, steel, w, 0.05, 0.005, 0, y, sz * (d / 2 - 0.0025));
    for (const sx of [-1, 1])
      t.box(group, steel, 0.005, 0.05, d, sx * (w / 2 - 0.0025), y, 0);
  }
  // Its top's flat, under the machine's feet.
  for (const sz of [-1, 1])
    t.box(group, steel, w, 0.005, 0.05, 0, h - 0.0025, sz * (d / 2 - 0.025));
  return markComponent(group, { decorative: true });
}
