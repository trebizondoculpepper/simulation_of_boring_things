import type { Object3D } from 'three';
import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createFallingWater } from './falling-water';
import { createDisturbedWater } from './disturbed-water';

/**
 * The backwash pit's water in motion (the owner, 2026-10-26: as the main
 * balance tank's): the backwash pouring from its inlet's open end down
 * into the pit, heard as it pours, and the pit's surface stirred white
 * where it lands, calm further off. Laid over the pit's own still water,
 * which it hides, following its level. Its own frame: the pit's.
 */
export function createBackwashPitWater(
  kit: PanelKit,
  {
    length,
    width,
    inlet,
    inletOd,
    fullFlow,
  }: {
    length: number;
    width: number;
    /** The inlet's open end, in the pit's frame. */
    inlet: readonly [number, number, number];
    inletOd: number;
    /** The flow, m³/h, that fills the inlet's pipe. */
    fullFlow: number;
  },
) {
  const group = new Group();
  group.name = 'Backwash pit water in motion';
  const surface = createDisturbedWater(kit, {
    w: length,
    d: width,
    color: '#5c5a3c',
    opacity: 0.88,
  });
  group.add(surface.mesh);
  const fall = createFallingWater(kit, inletOd / 2 - 0.01);
  fall.group.position.set(...inlet);
  group.add(fall.group);
  let still: Object3D | null = null;
  return {
    group,
    /** The pit's own still water, which this stands for. */
    replace(water: Object3D) {
      still = water;
    },
    /** Its inflow, m³/h, this step. */
    update(inflow: number, delta: number) {
      // Shown where the still water would be (the pit sets its level and
      // whether it holds any each step), the still water hidden.
      if (still) {
        surface.mesh.visible = still.visible;
        surface.mesh.position.y = still.position.y + 0.002;
        still.visible = false;
      }
      const share = Math.min(1.2, inflow / fullFlow);
      fall.set(share, inlet[1] - surface.mesh.position.y);
      fall.update(delta);
      surface.setSource(0, fall.foot, fall.share(), 5);
      surface.update(delta);
    },
    dispose() {
      fall.dispose();
    },
  };
}
