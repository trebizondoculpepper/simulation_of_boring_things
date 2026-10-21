import { describe, expect, it } from 'vite-plus/test';
import { atHead, climbPose, climbTime, LADDER } from './ladder-climb';
import type { FixedLadder } from './ladder-climb';

// A ladder on an east wall, climbed facing east.
const ladder: FixedLadder = {
  x: 2.1,
  z: 0.9,
  yaw: Math.PI / 2,
  bottom: -3.5,
  top: 0,
  foot: { x: 1.2, z: 0.9, yaw: Math.PI / 2 },
  head: { x: 2.1, z: 1.6, yaw: Math.PI },
};

describe('climbing a ladder', () => {
  it('takes the walker from the floor to the landing, and back', () => {
    const up = climbPose(ladder, true, climbTime(ladder));
    expect(up).toMatchObject({ x: 2.1, z: 1.6, y: 0, done: true });
    const down = climbPose(ladder, false, climbTime(ladder));
    expect(down).toMatchObject({ x: 1.2, z: 0.9, y: -3.5, done: true });
    expect(climbPose(ladder, true, 0)).toMatchObject({
      x: 1.2,
      y: -3.5,
      done: false,
    });
  });

  it('climbs facing the rungs, close in front of them, never passing through', () => {
    const total = climbTime(ladder);
    for (let t = LADDER.step + 0.1; t < total - LADDER.step; t += 0.1) {
      const p = climbPose(ladder, true, t);
      expect(p.x).toBeCloseTo(ladder.x - LADDER.stand);
      expect(p.yaw).toBeCloseTo(Math.PI / 2);
      expect(p.y).toBeGreaterThan(-3.6);
      expect(p.y).toBeLessThan(0.1);
    }
  });

  it('rises steadily, a rung at a time, without leaping', () => {
    let last = -3.5;
    for (let t = 0; t <= climbTime(ladder); t += 1 / 60) {
      const y = climbPose(ladder, true, t).y;
      expect(Math.abs(y - last)).toBeLessThan(0.05);
      last = y;
    }
  });

  it('knows which end the walker is at', () => {
    expect(atHead(ladder, 0)).toBe(true);
    expect(atHead(ladder, -3.5)).toBe(false);
  });
});
