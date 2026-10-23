import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createBrandBadge } from '../../core/views/brand-badge';
import { createCharacterLcd } from '../../industrial-control/views/panel-instruments';
import { plantTools } from './plant-tools';

/**
 * An ultrasonic level transmitter by Trager-Feinstein, after the Siemens
 * SITRANS Probe LU: a two-wire, 4–20 mA instrument that times the echo
 * of a pulse off the water below it. A grey enclosure on a 2" mounting
 * thread, its white transducer face looking down, and its own 8-character
 * LCD showing the level it reports. Clamped to its bracket by the thread.
 *
 * Its own frame: the transducer's face at the origin looking down (−y),
 * the enclosure above it, its display toward +z.
 */
export function createUltrasonicLevel(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = 'Trager-Feinstein ultrasonic level transmitter';
  const grey = t.paint('#9aa2a6', 0.5);
  t.cyl(group, t.paint('#eceae4', 0.6), 0.05, 0.08, 0, 0.04, 0, 'y', 20);
  t.cyl(group, t.paint('#3c4144', 0.5), 0.032, 0.06, 0, 0.11, 0, 'y', 16);
  t.box(group, grey, 0.15, 0.13, 0.13, 0, 0.205, 0);
  t.cyl(group, grey, 0.07, 0.03, 0, 0.285, 0, 'y', 20);
  // Its cable gland.
  t.cyl(group, t.paint('#222', 0.6), 0.012, 0.04, 0.09, 0.2, 0, 'x', 10);
  const lcd = createCharacterLcd(kit, {
    columns: 8,
    rows: 1,
    cell: 0.0045,
    backlight: true,
  });
  lcd.group.position.set(0, 0.22, 0.066);
  group.add(lcd.group);
  const badge = createBrandBadge(kit, 'trager-feinstein', { height: 0.014 });
  badge.position.set(0, 0.17, 0.066);
  group.add(badge);
  let shown = '';
  return {
    group,
    /** Show the level it measures, metres. */
    show(level: number) {
      const text = `${level.toFixed(2)} m`.padStart(8);
      if (text === shown) return;
      shown = text;
      lcd.show([text]);
    },
  };
}
