import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import {
  createMicroLabel,
  createSevenSegment,
} from '../../core/views/eighties-controls';
import { plantTools } from './plant-tools';

/**
 * A digital thermometer, by Kessler-Moody: a platinum resistance probe in
 * a stainless thermowell set into its pipe, and on its neck a transmitter
 * head with a four-digit red LED readout of the temperature, °C, its tag
 * beneath (it also sends the reading to the mimic board). In its own
 * frame the pipe runs along x through its origin, `pipeOd` across; the
 * thermowell goes in from the pipe's front (+z) and the head faces +z.
 */
export function createDigitalThermometer(
  kit: PanelKit,
  { tag, pipeOd }: { tag: string; pipeOd: number },
) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = `Kessler-Moody thermometer ${tag}`;
  const steel = t.paint('#c9cfcf', 0.35, 0.7);
  const head = t.paint('#c9cbc6', 0.6, 0.2);
  const r = pipeOd / 2;
  // The thermowell's boss on the pipe, and the neck out to the head.
  t.cyl(group, steel, 0.014, 0.03, 0, 0, r + 0.012, 'z', 12);
  t.cyl(group, steel, 0.009, 0.06, 0, 0, r + 0.055, 'z', 10);
  const z = r + 0.1;
  t.box(group, head, 0.11, 0.08, 0.05, 0, 0, z);
  const readout = createSevenSegment(kit, 4, { digitHeight: 0.016 });
  readout.group.position.set(0, 0.008, z + 0.026);
  group.add(readout.group);
  const label = createMicroLabel(kit, `${tag}  °C`, {
    height: 0.009,
    ink: '#1d2326',
    maxWidth: 0.1,
  });
  label.position.set(0, -0.026, z + 0.026);
  group.add(label);
  let shown = '';
  return {
    group,
    show(celsius: number) {
      const text = celsius.toFixed(1);
      if (text === shown) return;
      shown = text;
      readout.show(text);
    },
  };
}
