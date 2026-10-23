import { describe, expect, it } from 'vite-plus/test';
import { BALANCE_TANK, volumeOf } from '../../../game/plant/balance-tank';
import {
  HALL,
  HALL_INLET_LABELS,
  PARTITION,
  SPOTS,
  START,
  TANK,
  hallPipes,
  heightOf,
} from './balance-tank-hall';

describe('the balance tank hall', () => {
  it('is the Olympic tank: 9 × 6 m inside, 216 m³ to its weir, its walls the hall’s', () => {
    expect(TANK.maxX - TANK.minX).toBeCloseTo(9, 9);
    expect(TANK.maxZ - TANK.minZ).toBe(6);
    expect(volumeOf(BALANCE_TANK.weir)).toBe(216);
    expect(HALL.halfZ * 2 - (TANK.maxZ - TANK.minZ)).toBeCloseTo(0.3, 9);
  });

  it('keeps its water below the gantry and the pool overflows into it from above its weir', () => {
    expect(heightOf(BALANCE_TANK.depth)).toBe(0);
    for (const r of hallPipes().returns)
      expect(r.at(-1)![1]).toBeGreaterThan(heightOf(BALANCE_TANK.weir));
  });

  it('identifies both pool overflow drops and the mains make-up at their actual pipes', () => {
    const runs = hallPipes();
    expect(HALL_INLET_LABELS.map((label) => label.lines[0])).toEqual([
      'POOL OVERFLOW 1',
      'POOL OVERFLOW 2',
      'MAINS MAKE-UP',
    ]);
    for (const [index, label] of HALL_INLET_LABELS.entries()) {
      const run = index < 2 ? runs.returns[index] : runs.makeup;
      expect(label.at[0]).toBe(run.at(-1)![0]);
      expect(label.at[2]).toBe(run.at(-1)![2]);
    }
  });

  it('feeds its make-up through an air gap above the weir (Type AA: at least 20 mm)', () => {
    expect(
      hallPipes().makeup.at(-1)![1] - heightOf(BALANCE_TANK.weir),
    ).toBeGreaterThan(0.02);
  });

  it('draws its suctions below LOW LOW, so a trip comes before they take air', () => {
    for (const s of SPOTS.suctions)
      expect(s.y + 0.3).toBeLessThan(heightOf(BALANCE_TANK.lowLow));
  });

  it('starts the walker in the plant bay, behind the partition', () => {
    expect(START.x).toBeLessThan(TANK.minX - PARTITION);
    expect(START.x).toBeGreaterThan(-HALL.halfX);
  });

  it('keeps the machinery out of the hall: the panel and the make-up valve in the bay', () => {
    expect(SPOTS.panel.x).toBeLessThan(TANK.minX - PARTITION);
    expect(SPOTS.makeup.bayX).toBeLessThan(TANK.minX - PARTITION);
  });

  it('takes the suctions west through the partition to the plant room', () => {
    for (const r of hallPipes().suctions)
      expect(r.at(-1)![0]).toBeLessThan(TANK.minX - PARTITION);
  });
});
