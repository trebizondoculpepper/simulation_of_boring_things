import { Group, Mesh, SphereGeometry } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createBrandBadge } from '../../core/views/brand-badge';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { plantTools } from './plant-tools';

/**
 * A tethered float level switch by Trager-Feinstein, after the Flygt
 * ENM-10: a pear-shaped polypropylene float on its own cable, a weight
 * clamped to the cable setting the level it switches at. Hanging free it
 * points down and its contact is open; when the water reaches it, the
 * float rises and tips over, and its tilt switch closes. Hung from a
 * bracket by its cable gland, its tag on the bracket.
 *
 * Its own frame: the cable gland at the origin, the weight `drop` below;
 * the float on its 150 mm tether under the weight. `setWater` takes the
 * water's height in this frame; `update` swings the float to it.
 */
export function createFloatSwitch(
  kit: PanelKit,
  { drop, tag }: { drop: number; tag: string },
) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = `Float switch ${tag}`;
  const cable = t.paint('#1c1c1c', 0.7);
  t.rod(group, cable, [0, 0, 0], [0, -drop, 0], 0.005, 8);
  t.cyl(group, t.paint('#3a3a3a', 0.5), 0.018, 0.05, 0, -drop, 0, 'y', 10);
  t.cyl(group, t.paint('#555a5c', 0.4, 0.5), 0.014, 0.04, 0, 0, 0, 'y', 10);
  // The float on its tether, swinging about the weight.
  const swing = new Group();
  swing.position.y = -drop;
  swing.userData.live = true;
  group.add(swing);
  t.rod(swing, cable, [0, 0, 0], [0, -0.15, 0], 0.005, 8);
  const body = new Mesh(
    new SphereGeometry(0.05, 18, 12),
    t.paint('#2b2e30', 0.45),
  );
  body.scale.set(1, 1.7, 1);
  body.position.y = -0.21;
  swing.add(body);
  const label = createMicroLabel(kit, tag, {
    height: 0.03,
    ink: '#111',
    plate: '#f2d64b',
  });
  label.position.set(0, 0.06, 0.02);
  group.add(label);
  const badge = createBrandBadge(kit, 'trager-feinstein', { height: 0.012 });
  badge.position.set(0, 0.1, 0.02);
  group.add(badge);
  let water = -Infinity;
  let tilt = 0;
  return {
    group,
    /** The water's height in its frame. */
    setWater(y: number) {
      water = y;
    },
    /** Whether its contact is made: the float tipped up. */
    tripped: () => tilt > Math.PI / 2,
    update(delta: number) {
      // Up and over (150°) once the water is over its weight; down below.
      const target = water > -drop ? (Math.PI * 5) / 6 : 0;
      tilt += (target - tilt) * Math.min(1, delta * 2);
      swing.rotation.x = tilt;
    },
  };
}
