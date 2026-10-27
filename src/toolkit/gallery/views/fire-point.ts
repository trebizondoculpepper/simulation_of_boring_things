import { Group } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { tools } from '../../components/core/views/fitting-tools';
import { createExtinguisher } from '../../components/fire/views/fire-fittings';
import { createFireActionNotice } from '../../components/general-safety/views/safety-notices';
import { extinguisherOffsets, firePointOutline } from '../logic/fire-point';
import type { FirePointExtinguisher } from '../logic/fire-point';

/**
 * A fire point (`logic/fire-point.ts`; prompt 089, item 5): its
 * extinguishers on their wall brackets, the fire action notice over them,
 * a FIRE POINT sign above, and the red keep-clear outline on the floor
 * before them. Its own frame: the wall at z = 0, the floor at y = 0, the
 * room at +z. Set decoration.
 */
export function createFirePoint(
  kit: PanelKit,
  kinds: readonly FirePointExtinguisher[],
): Group {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Fire point';
  const offsets = extinguisherOffsets(kinds.length);
  kinds.forEach((kind, i) => {
    const e = createExtinguisher(kit, kind);
    e.group.position.set(offsets[i], 0.3, 0);
    group.add(e.group);
  });
  const notice = createFireActionNotice(kit);
  notice.position.set(0, 1.6, 0.005);
  group.add(notice);
  // Its sign, white on red (BS 5499 / ISO 7010 fire equipment colours).
  t.label(group, 'FIRE POINT', 0, 1.98, 0.004, 0.07, '#ffffff', '#c4231c');
  // The floor before it kept clear (the owner, 2026-10-26): a red line,
  // painted 3 mm proud of the floor, along its front and down each side.
  const paint = t.paint('#c4231c', 0.6);
  for (const r of firePointOutline(kinds.length))
    t.box(group, paint, r.w, 0.003, r.d, r.x, 0.003, r.z);
  return group;
}
