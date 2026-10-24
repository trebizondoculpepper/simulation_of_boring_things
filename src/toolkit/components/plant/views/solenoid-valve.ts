import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createBrandBadge } from '../../core/views/brand-badge';
import { FINISH, plantTools } from './plant-tools';

/**
 * A 2/2-way solenoid valve by Grundflow, after the Bürkert 6213: a
 * forged brass body screwed into its line, a servo-assisted diaphragm
 * opened by the black encapsulated coil above it, and on the coil its
 * DIN 43650 plug, whose LED lights while the coil is energised. It opens
 * on power and shuts when the power goes. On the body's side its manual
 * override, a red slotted knob (`overrideButton`), for its owner to bind.
 *
 * Its own frame: its pipe along y through the origin, the coil toward +z.
 */
export function createSolenoidValve(kit: PanelKit, od = 0.054) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = 'Grundflow solenoid valve';
  const brass = t.paint(FINISH.brass, 0.4, 0.7);
  t.box(group, brass, od * 1.6, od * 2.2, od * 1.5, 0, 0, 0);
  for (const y of [-od * 1.3, od * 1.3])
    t.cyl(group, brass, od * 0.62, od * 0.4, 0, y, 0, 'y', 8);
  t.cyl(
    group,
    t.paint('#8c8e90', 0.3, 0.8),
    od * 0.35,
    od * 0.8,
    0,
    0,
    od,
    'z',
    12,
  );
  const coil = t.paint('#1e2022', 0.55);
  t.box(group, coil, od * 1.3, od * 1.3, od * 1.1, 0, 0, od * 1.75);
  // The DIN plug and its LED.
  t.box(
    group,
    t.paint('#2a2c2e', 0.5),
    od * 0.9,
    od * 1.0,
    od * 0.6,
    0,
    0,
    od * 2.6,
  );
  const led = t.led(group, '#ffb020', od * 0.1, 0, od * 0.2, od * 2.92);
  led.mesh.userData.live = true;
  const badge = createBrandBadge(kit, 'grundflow', { height: od * 0.25 });
  badge.position.set(0, -od * 0.35, od * 2.31);
  group.add(badge);
  // Its manual override, on the body's side.
  const overrideButton = t.cyl(
    group,
    t.paint('#c42b23', 0.5),
    od * 0.28,
    od * 0.25,
    od * 0.92,
    -od * 0.3,
    0,
    'x',
    12,
  );
  return {
    group,
    /** Its manual override knob, pressed to work it by hand. */
    overrideButton,
    setOpen(open: boolean) {
      led.set(open);
    },
  };
}
