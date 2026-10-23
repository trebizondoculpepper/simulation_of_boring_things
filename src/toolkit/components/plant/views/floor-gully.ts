import { Group, MeshStandardMaterial } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { plantTools } from './plant-tools';

/**
 * A stainless steel floor gully, set flush in the floor (after a 300 mm
 * square heavy-duty gully of the plant-room sort), by Certikind: its
 * frame, slotted grating and dark trap below. `pour` draws water falling
 * into it from a pipe's open end `drop` above, thicker the more flows
 * (`setFlow`, litres a second; nothing hides it). Its own frame: its
 * grating at the floor, y = 0, centred on its origin.
 */
export function createFloorGully(
  kit: PanelKit,
  { size = 0.3, drop = 0.1 } = {},
) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = 'Certikind floor gully';
  const steel = t.paint('#c9cfcf', 0.35, 0.7);
  const dark = t.paint('#151718', 0.8);
  t.box(group, dark, size - 0.02, 0.004, size - 0.02, 0, 0.001, 0);
  for (const s of [-1, 1]) {
    t.box(group, steel, size, 0.006, 0.02, 0, 0.003, (s * (size - 0.02)) / 2);
    t.box(group, steel, 0.02, 0.006, size, (s * (size - 0.02)) / 2, 0.003, 0);
  }
  for (let k = 0; k < 9; k++)
    t.box(
      group,
      steel,
      size - 0.04,
      0.006,
      0.008,
      0,
      0.003,
      -size / 2 + 0.04 + k * 0.028,
    );
  const mark = createMicroLabel(kit, 'CERTIKIND', {
    height: 0.008,
    ink: '#6f7476',
    maxWidth: 0.08,
  });
  mark.rotation.x = -Math.PI / 2;
  mark.position.set(0, 0.0065, size / 2 - 0.01);
  group.add(mark);
  // The water falling from the pipe's end into it.
  const water = new MeshStandardMaterial({
    color: '#9fc6dc',
    transparent: true,
    opacity: 0.55,
    roughness: 0.1,
  });
  kit.materials.push(water);
  const stream = t.cyl(group, water, 0.012, drop, 0, drop / 2, 0, 'y', 12);
  stream.userData.live = true;
  stream.visible = false;
  return {
    group,
    /** How dirty the water falling into it is, 0 (clear) to 1 (brown with backwash). */
    setTint(dirt: number) {
      const d = Math.min(1, Math.max(0, dirt));
      water.color.setRGB(
        0.62 + (0.45 - 0.62) * d,
        0.78 + (0.36 - 0.78) * d,
        0.86 + (0.22 - 0.86) * d,
      );
    },
    /** The flow falling into it, litres a second. */
    setFlow(litres: number) {
      stream.visible = litres > 0.01;
      // A jet's radius grows as the root of its flow; 12 mm at 4 l/s.
      stream.scale.set(Math.sqrt(litres / 4), 1, Math.sqrt(litres / 4));
    },
  };
}
