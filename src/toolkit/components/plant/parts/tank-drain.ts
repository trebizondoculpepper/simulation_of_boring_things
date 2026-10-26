import { Group, Mesh, TorusGeometry } from 'three';
import { beginPart } from '../../core/parts/parts';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { createBrandBadge } from '../../core/views/brand-badge';
import { createEngravedPlate } from '../../core/views/plant-signs';

/** Floor sump with a manual penstock and an extended spindle worked from the gantry. */
export function tankDrain(
  kit: PanelKit,
  depth: number,
  binding: { get(): boolean; set(open: boolean): void },
) {
  const a = beginPart(kit, 'Balance tank drain');
  const t = tools(kit);
  const steel = t.paint('#858f91', 0.4, 0.7);
  const dark = t.paint('#161d20', 0.8);
  // Origin on the gantry; sump on the tank floor, outlet through the east wall (+x).
  t.box(a.object, dark, 0.45, 0.008, 0.45, -0.2, -depth + 0.006, 0);
  for (const z of [-0.225, 0.225])
    t.box(a.object, steel, 0.47, 0.025, 0.025, -0.2, -depth + 0.025, z);
  for (let x = -0.425; x <= 0.026; x += 0.05)
    t.box(a.object, steel, 0.012, 0.025, 0.45, x, -depth + 0.025, 0);
  // The penstock's guides and rising gate lie at its outlet, below the floor grate.
  for (const z of [-0.09, 0.09])
    t.box(a.object, steel, 0.035, 0.35, 0.025, 0.02, -depth - 0.1, z);
  const slide = t.box(
    a.object,
    steel,
    0.02,
    0.18,
    0.18,
    0.02,
    -depth - 0.16,
    0,
  );
  t.cyl(a.object, steel, 0.014, depth + 0.95, 0.02, (0.95 - depth) / 2, 0);
  // Bearings keep the long spindle against the tank wall and above its drain.
  for (const y of [-depth + 0.2, -2, 0.65])
    t.box(a.object, steel, 0.16, 0.06, 0.09, 0.06, y, 0);
  const wheel = new Group();
  wheel.position.set(0.02, 1, 0);
  const rim = new Mesh(new TorusGeometry(0.13, 0.013, 8, 24), steel);
  rim.rotation.x = Math.PI / 2;
  wheel.add(rim);
  t.box(wheel, steel, 0.25, 0.02, 0.02);
  t.box(wheel, steel, 0.02, 0.02, 0.25);
  a.object.add(wheel);
  const plate = createEngravedPlate(
    kit,
    ['PL2-T1-DV1', 'TANK DRAIN', 'SHUT IN SERVICE'],
    { width: 0.3, height: 0.15, colour: 'white' },
  );
  plate.position.set(0.02, 0.78, 0.05);
  a.object.add(plate);
  const badge = createBrandBadge(kit, 'grundflow', { height: 0.018 });
  badge.position.set(0.02, 0.66, 0.051);
  a.object.add(badge);
  a.uses.set(wheel, () => binding.set(!binding.get()));
  a.shows(() => (binding.get() ? 'Open' : 'Closed'));
  a.updates.push(() => {
    const open = binding.get();
    wheel.rotation.y = open ? Math.PI / 3 : 0;
    slide.position.y = -depth - 0.16 + (open ? 0.18 : 0);
  });
  return a.part();
}
