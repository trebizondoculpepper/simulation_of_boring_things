import { describe, expect, it } from 'vite-plus/test';
import { layoutRoom } from './room-equipment';
import type { Footprint } from '../../controls/logic/walk-collision';
import {
  MARK_LINE,
  WORKING_SPACE,
  infront,
  switchRoomFloor,
} from './switch-room-floor';

const overlap = (a: Footprint, b: Footprint) =>
  a.minX < b.maxX - 1e-9 &&
  a.maxX > b.minX + 1e-9 &&
  a.minZ < b.maxZ - 1e-9 &&
  a.maxZ > b.minZ + 1e-9;
const inside = (a: Footprint, b: Footprint) =>
  a.minX >= b.minX - 1e-9 &&
  a.maxX <= b.maxX + 1e-9 &&
  a.minZ >= b.minZ - 1e-9 &&
  a.maxZ <= b.maxZ + 1e-9;

describe('the switch room’s floor markings', () => {
  const { box, placed } = layoutRoom('switch_room')!;
  const room = {
    minX: -box.w / 2,
    maxX: box.w / 2,
    minZ: -box.d / 2,
    maxZ: box.d / 2,
  };
  const floor = switchRoomFloor(placed);

  it('marks a metre’s working space before the switchboard, the main switch and the changeover switch', () => {
    expect(floor.lines).toHaveLength(9);
    for (const key of ['lv-switchboard', 'main-switch', 'changeover-switch']) {
      const p = placed.find((q) => q.item.key === key)!;
      const space = infront(p, WORKING_SPACE)!;
      expect(inside(space, room)).toBe(true);
      // Its far line a metre out from its front.
      expect(
        floor.lines.some(
          (l) =>
            inside(l, {
              ...space,
              minX: space.minX - MARK_LINE,
              maxX: space.maxX + MARK_LINE,
            }) && Math.abs(l.maxX - l.minX - MARK_LINE) < 1e-9,
        ),
      ).toBe(true);
    }
  });

  it('crosses no machine, and stays in the room', () => {
    for (const l of floor.lines) {
      expect(inside(l, room)).toBe(true);
      for (const p of placed)
        if (p.item.mount === 'floor' && !p.item.walkable)
          expect(overlap(l, p.footprint)).toBe(false);
    }
  });

  it('lays rubber matting along the switchboard’s front, inside its working space, clear of the lines', () => {
    expect(floor.mats).toHaveLength(1);
    const board = placed.find((q) => q.item.key === 'lv-switchboard')!;
    const mat = floor.mats[0];
    expect(inside(mat, infront(board, WORKING_SPACE)!)).toBe(true);
    for (const l of floor.lines) expect(overlap(l, mat)).toBe(false);
  });
});
