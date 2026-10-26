import type { PanelKit } from '../../components/core/views/eighties-controls';
import { beginPart } from '../../components/core/parts/parts';
import type { Part } from '../../components/core/parts/parts';
import { createFireExitDoor } from '../../components/fire/views/detection-and-exits';
import type { Group } from 'three';

/**
 * The loading dock's pier door (the owner, 2026-10-26): a fire exit door
 * from the collection, its push bar on the dock's side, opening outward
 * onto the landing and the yard's steps. Use opens it, or shuts it. Its
 * origin on the dock's floor at the middle of the opening, in the wall's
 * inside face; the dock's frame, x east, z south.
 */
export function dockDoor(
  kit: PanelKit,
  at: { x: number; wallZ: number },
  width = 1.0,
): { part: Part; open: () => boolean } {
  const a = beginPart(kit, 'Fire exit door to the goods yard');
  const door = createFireExitDoor(kit, width);
  // Its frame 5 mm proud of the wall's face, so the two never fight.
  door.position.set(at.x, 0, at.wallZ + 0.005);
  a.object.add(door);
  const leaves = door.userData.leaves as Group[];
  let target = 0;
  let angle = 0;
  door.traverse((o) => a.uses.set(o, () => (target = target > 0 ? 0 : 1)));
  a.updates.push((delta) => {
    const step = delta * 1.6;
    angle =
      angle < target
        ? Math.min(target, angle + step)
        : Math.max(target, angle - step);
    // Outward, toward the yard.
    for (const leaf of leaves) leaf.rotation.y = ((angle * Math.PI) / 2) * 0.95;
  });
  a.shows(() => (angle > 0.05 ? 'open' : 'shut'));
  return { part: a.part(), open: () => angle > 0.6 };
}
