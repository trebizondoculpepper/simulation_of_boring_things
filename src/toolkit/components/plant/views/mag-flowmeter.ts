import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { plantTools } from './plant-tools';
import { createCharacterLcd } from '../../industrial-control/views/panel-instruments';

/**
 * An electromagnetic flowmeter, by Kessler-Moody: a flanged spool the
 * size of its pipe, and on a short neck its converter's head, its LCD
 * showing its tag and the flow, m³/h, with an arrow for its direction
 * (→ along its own positive way, ← back). Drawn along x through its
 * origin, its head up and its display toward +z (`placeFitting` turns it
 * into its pipe); or, `onEnd`, its display on the head's end, as one on
 * an upright pipe is turned to face the room, its text up the pipe.
 */
export function createMagFlowmeter(
  kit: PanelKit,
  { od, tag, onEnd = false }: { od: number; tag: string; onEnd?: boolean },
) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = `Kessler-Moody flowmeter ${tag}`;
  const body = t.paint('#2f5f8f', 0.5, 0.2);
  const grey = t.paint('#c9cbc6', 0.6, 0.2);
  const r = od / 2;
  const length = Math.max(0.3, 1.5 * od);
  t.cyl(group, body, r * 1.12, length * 0.8, 0, 0, 0, 'x', 24);
  for (const x of [-length / 2, length / 2])
    t.cyl(group, body, r * 1.45, 0.03, x * 0.92, 0, 0, 'x', 24);
  // Its converter on a neck.
  t.cyl(group, grey, 0.025, 0.08, 0, r * 1.12 + 0.04, 0, 'y', 12);
  const headY = r * 1.12 + 0.16;
  // Its long side under its display: along the pipe, or, with the display
  // on its end, across it.
  if (onEnd) t.box(group, grey, 0.1, 0.14, 0.22, 0, headY, 0);
  else t.box(group, grey, 0.22, 0.14, 0.1, 0, headY, 0);
  const lcd = createCharacterLcd(kit, {
    columns: 16,
    rows: 2,
    cell: 0.0072,
    backlight: true,
  });
  if (onEnd) {
    // Face up out of the head's end, its text running up the pipe (+x).
    lcd.group.position.set(0, headY + 0.071, 0);
    lcd.group.rotation.set(-Math.PI / 2, -Math.PI / 2, 0, 'YXZ');
  } else lcd.group.position.set(0, headY + 0.01, 0.052);
  group.add(lcd.group);
  const mark = createMicroLabel(kit, 'KESSLER-MOODY', {
    height: 0.009,
    ink: '#2d3438',
    maxWidth: 0.15,
  });
  if (onEnd) {
    // Under the display on the end, across the head.
    mark.position.set(-0.035, headY + 0.071, 0);
    mark.rotation.set(-Math.PI / 2, -Math.PI / 2, 0, 'YXZ');
  } else mark.position.set(0, headY - 0.055, 0.052);
  group.add(mark);
  let shown = '';
  return {
    group,
    /** Show `flow`, m³/h, signed along its own way. */
    show(flow: number, role: string) {
      const arrow = flow > 0.05 ? '->' : flow < -0.05 ? '<-' : '  ';
      const lines = [
        `${tag} ${role}`.slice(0, 16),
        `${Math.abs(flow).toFixed(1).padStart(7)} m3/h ${arrow}`,
      ];
      const key = lines.join('|');
      if (key === shown) return;
      shown = key;
      lcd.show(lines);
    },
  };
}
