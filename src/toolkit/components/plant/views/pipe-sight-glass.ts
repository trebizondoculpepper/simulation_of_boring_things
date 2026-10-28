import {
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  CylinderGeometry,
} from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { plantTools } from './plant-tools';

/**
 * An in-line sight glass on a backwash's waste (mission 106; after the
 * flanged tubular sight glasses pool filters' waste lines carry): a
 * borosilicate tube between two flanges and its guard rods, the water in it
 * as murky as the solids it carries make it, from brown to clear. Its look
 * is a material's colour and opacity, set only when the water changes: no
 * texture. Drawn along x through its origin; `placeFitting` turns it into
 * its pipe.
 */
export function createPipeSightGlass(
  kit: PanelKit,
  { od, tag }: { od: number; tag: string },
) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = `Sight glass ${tag}`;
  const r = od / 2;
  const length = 0.32;
  const steel = t.paint('#9ea6a9', 0.35, 0.8);
  for (const x of [-length / 2, length / 2])
    t.cyl(group, steel, r * 1.55, 0.03, x, 0, 0, 'x', 24);
  for (const [y, z] of [
    [r * 1.25, 0],
    [-r * 1.25, 0],
    [0, r * 1.25],
    [0, -r * 1.25],
  ])
    t.cyl(group, steel, 0.008, length, 0, y, z, 'x', 8);
  const water = new MeshStandardMaterial({
    color: '#cfe8ee',
    roughness: 0.2,
    transparent: true,
    opacity: 0.4,
  });
  kit.materials.push(water);
  const tube = new Mesh(
    new CylinderGeometry(r * 1.05, r * 1.05, length - 0.03, 24),
    water,
  );
  tube.rotation.z = Math.PI / 2;
  tube.userData.live = true;
  group.add(tube);
  const label = createMicroLabel(kit, `${tag}  SIGHT GLASS`, {
    height: 0.016,
    ink: '#16191b',
    plate: '#f4f3ee',
    maxWidth: 0.2,
  });
  label.position.set(0, -r * 1.7 - 0.02, r * 1.3);
  group.add(label);
  const clear = new Color('#cfe8ee');
  const murky = new Color('#6b4a22');
  let shown = -1;
  return {
    group,
    /** Show water carrying `dirt` g/m³ of solids (none flowing: the water standing in it). */
    show(dirt: number) {
      // Murk the eye sees: about full brown from 300 g/m³.
      const m =
        Math.round(Math.min(1, Math.sqrt(Math.max(0, dirt) / 300)) * 40) / 40;
      if (m === shown) return;
      shown = m;
      water.color.copy(clear).lerp(murky, m);
      water.opacity = 0.4 + 0.5 * m;
    },
  };
}
