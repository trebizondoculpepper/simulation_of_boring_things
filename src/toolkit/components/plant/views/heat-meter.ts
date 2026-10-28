import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { createCharacterLcd } from '../../industrial-control/views/panel-instruments';
import { createBrandBadge } from '../../core/views/brand-badge';
import { plantTools } from './plant-tools';

/**
 * An ultrasonic heat meter (mission 106; after the Kamstrup MULTICAL 603
 * with its ULTRAFLOW sensor): a brass flow sensor in the line, its two
 * temperature sensors' cables, and the calculator on a bracket above, its
 * LCD showing the heat passed, kWh, and the power now, kW, by Splashonomics.
 * Drawn along x through its origin, its face toward +z. `show` writes the
 * display only when its digits change, and at most a few times a second.
 */
export function createHeatMeter(
  kit: PanelKit,
  { od, tag }: { od: number; tag: string },
) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = `Splashonomics heat meter ${tag}`;
  const brass = t.paint('#b08d3c', 0.35, 0.7);
  const r = od / 2;
  t.cyl(group, brass, r * 1.3, 0.2, 0, 0, 0, 'x', 20);
  for (const x of [-0.1, 0.1])
    t.cyl(group, brass, r * 1.5, 0.02, x, 0, 0, 'x', 20);
  // The calculator on a bracket, its face out.
  const white = t.paint('#eef0ee', 0.5);
  t.box(group, t.paint('#55616a', 0.5), 0.02, 0.16, 0.02, 0, r + 0.08, -0.02);
  t.box(group, white, 0.17, 0.13, 0.05, 0, r + 0.22, 0);
  const lcd = createCharacterLcd(kit, {
    columns: 10,
    rows: 2,
    cell: 0.0042,
    backlight: false,
  });
  lcd.group.position.set(0, r + 0.235, 0.026);
  group.add(lcd.group);
  const badge = createBrandBadge(kit, 'splashonomics', { height: 0.012 });
  badge.position.set(0, r + 0.18, 0.026);
  group.add(badge);
  const label = createMicroLabel(kit, `${tag}  HEAT METER`, {
    height: 0.012,
    ink: '#16191b',
    plate: '#f4f3ee',
    maxWidth: 0.16,
  });
  label.position.set(0, r + 0.305, 0.026);
  group.add(label);
  // Its sensors' cables, down to the flow and return.
  t.box(
    group,
    t.paint('#1e2224', 0.6),
    0.006,
    0.1,
    0.006,
    0.07,
    r + 0.11,
    0.01,
  );
  let shown = '';
  let due = 0;
  return {
    group,
    show(kWh: number, kW: number, delta: number) {
      due -= delta;
      if (due > 0) return;
      due = 0.25;
      const lines = [
        `${kWh.toFixed(kWh < 10000 ? 1 : 0).padStart(7)}kWh`,
        `${kW.toFixed(1).padStart(8)}kW`,
      ];
      const key = lines.join('|');
      if (key === shown) return;
      shown = key;
      lcd.show(lines);
    },
  };
}
