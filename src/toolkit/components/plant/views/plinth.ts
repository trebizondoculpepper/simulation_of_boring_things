import { Group } from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { plantTools } from './plant-tools';

/** A display plinth's top, metres above the floor. */
export const PLINTH_TOP = 1.0;

/**
 * A grey display plinth for a development room (the owner, 2026-10-27:
 * repeatable components shown on plinths to be styled and tried): a
 * square column `w` wide, `item` stood on its top at `PLINTH_TOP`.
 */
export function onPlinth(kit: PanelKit, item: Object3D, w = 0.45): Group {
  const t = plantTools(kit);
  const group = new Group();
  t.box(
    group,
    t.paint('#8d9290', 0.7),
    w,
    PLINTH_TOP - 0.04,
    w,
    0,
    (PLINTH_TOP - 0.04) / 2,
    0,
  );
  t.box(
    group,
    t.paint('#6f7472', 0.6),
    w + 0.04,
    0.04,
    w + 0.04,
    0,
    PLINTH_TOP - 0.02,
    0,
  );
  item.position.y += PLINTH_TOP;
  group.add(item);
  return group;
}
