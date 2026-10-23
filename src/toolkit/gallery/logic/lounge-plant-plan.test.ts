import { describe, expect, it } from 'vite-plus/test';
import { layoutRoom } from './room-equipment';
import { LOUNGE_ROOM, loungeShellPlan } from './lounge-plant-plan';

describe('lounge plant trial', () => {
  const shell = loungeShellPlan();
  const layout = layoutRoom('plant_pool_01')!;

  it('uses the same 12 × 11 × 8 m envelope for the shell and machine layout', () => {
    expect([shell.hx * 2, shell.hz * 2, shell.roof - shell.floor]).toEqual([
      LOUNGE_ROOM.w,
      LOUNGE_ROOM.d,
      LOUNGE_ROOM.h,
    ]);
    expect([layout.box.w, layout.box.d]).toEqual([
      LOUNGE_ROOM.w,
      LOUNGE_ROOM.d,
    ]);
  });

  it('keeps the pool door north, the hall doors south and the stair heading away from the pool', () => {
    expect(shell.door.wall).toBe('north');
    expect(shell.equipment.wall).toBe('south');
    expect(shell.stair?.heading).toBe('south');
    expect(shell.stair!.top).toBeGreaterThanOrEqual(-shell.hz);
    expect(shell.stair!.bottom).toBeLessThan(shell.hz);
  });
});
