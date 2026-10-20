import { describe, expect, it } from 'vite-plus/test';
import { createSoftStarter } from './soft-starter';

const run = (
  starter: ReturnType<typeof createSoftStarter>,
  seconds: number,
  on: boolean,
  fault = false,
) => {
  let lamps = starter.step(0, on, fault);
  for (let t = 0; t < seconds - 1e-9; t += 0.05)
    lamps = starter.step(0.05, on, fault);
  return lamps;
};

describe('a soft starter', () => {
  it('starts with its bar dark and fills it block by block before UP TO SPEED', () => {
    const starter = createSoftStarter({ rampUp: 4 });
    const start = starter.step(0, true, false);
    expect(start.blocks).toBe(0);
    expect(start.upToSpeed).toBe(false);
    const halfway = run(starter, 2, true);
    expect(halfway.blocks).toBe(5);
    expect(halfway.upToSpeed).toBe(false);
    const there = run(starter, 2.1, true);
    expect(there.blocks).toBe(10);
    expect(there.upToSpeed).toBe(true);
  });

  it('runs down to a stop in a fault, its FAULT lamp flashing', () => {
    const starter = createSoftStarter({ rampUp: 1, rampDown: 2 });
    run(starter, 1.5, true);
    const seen = new Set<boolean>();
    let lamps = starter.step(0, true, true);
    for (let t = 0; t < 2.5; t += 0.05) {
      lamps = starter.step(0.05, true, true);
      seen.add(lamps.fault);
      expect(lamps.upToSpeed).toBe(false);
    }
    expect(lamps.speed).toBe(0);
    expect(lamps.blocks).toBe(0);
    expect(seen).toEqual(new Set([true, false]));
  });

  it('ramps from rest again each time it is started', () => {
    const starter = createSoftStarter({ rampUp: 2, rampDown: 1 });
    run(starter, 3, true);
    run(starter, 2, false);
    expect(starter.step(0, true, false).blocks).toBe(0);
  });
});
