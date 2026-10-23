import { describe, expect, it } from 'vite-plus/test';
import {
  createTankFillDrainModel,
  fillDrainRuns,
  tankPort,
  teeAt,
} from './tank-fill-drain';

const run = (
  m: ReturnType<typeof createTankFillDrainModel>,
  seconds: number,
) => {
  for (let t = 0; t < seconds; t++) m.step(1);
};

describe('filling and draining a tank through one port', () => {
  it('joins all three legs at the tee, the drain never rising', () => {
    const { tank, fill, drain } = fillDrainRuns();
    expect(tank[0]).toEqual(tankPort());
    for (const run of [tank.at(-1), fill[0], drain[0]])
      expect(run).toEqual(teeAt());
    for (let k = 1; k < drain.length; k++)
      expect(drain[k][1]).toBeLessThanOrEqual(drain[k - 1][1]);
  });

  it('starts half full and still, its fill and drain valves shut', () => {
    const m = createTankFillDrainModel();
    run(m, 60);
    expect(m.readings().level).toBe(0.5);
    expect(m.readings().port).toBe(0);
  });

  it('fills through its port with the fill valve open, the port flowing in', () => {
    const m = createTankFillDrainModel();
    m.setOpen('fill', true);
    run(m, 30);
    expect(m.readings().port).toBeGreaterThan(0);
    expect(m.readings().level).toBeGreaterThan(0.5);
  });

  it('empties through the same port with the drain open, the port flowing out', () => {
    const m = createTankFillDrainModel();
    m.setOpen('drain', true);
    run(m, 30);
    expect(m.readings().port).toBeLessThan(0);
    run(m, 1200);
    expect(m.readings().level).toBe(0);
  });

  it('holds its water with its own outlet valve shut, whatever the others do', () => {
    const m = createTankFillDrainModel();
    m.setOpen('tank', false);
    m.setOpen('drain', true);
    m.setOpen('fill', true);
    run(m, 120);
    expect(m.readings().level).toBe(0.5);
    // The mains runs straight to the drain.
    expect(m.readings().toDrain).toBeCloseTo(m.readings().fromMainsRate, 6);
  });

  it('overflows when filled past full, and says so', () => {
    const m = createTankFillDrainModel();
    m.setOpen('fill', true);
    run(m, 400);
    expect(m.readings().level).toBe(1);
    expect(m.readings().spilling).toBe(true);
    expect(m.readings().spilled).toBeGreaterThan(0);
  });
});
