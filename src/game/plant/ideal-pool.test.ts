import { describe, expect, it } from 'vite-plus/test';
import {
  createIdealFootSpaDemo,
  idealFootSpaGraphIssues,
  IDEAL_POOL,
} from './ideal-pool';

describe('ideal foot spa trial', () => {
  it('wires each required port with the correct direction and medium', () => {
    expect(idealFootSpaGraphIssues()).toEqual([]);
  });

  it('fills visibly, only runs when wet and powered, heats, and drains', () => {
    const demo = createIdealFootSpaDemo();
    expect(demo.state.litres).toBe(0);
    demo.setPower(true);
    demo.step(0.1);
    expect(demo.state.running).toBe(false);
    demo.setFill(true);
    for (let i = 0; i < 45; i++) demo.step(0.1);
    expect(demo.state.litres).toBeGreaterThan(60);
    expect(demo.state.filling).toBe(true);
    expect(demo.state.running).toBe(true);
    demo.setFill(false);
    const before = demo.state.celsius;
    for (let i = 0; i < 80; i++) demo.step(0.1);
    expect(demo.state.celsius).toBeGreaterThan(before);
    demo.setPower(false);
    expect(demo.state.powerOn).toBe(false);
    demo.setDrain(true);
    for (let i = 0; i < 50; i++) demo.step(0.1);
    expect(demo.state.litres).toBe(0);
    expect(demo.state.litres).toBeLessThan(IDEAL_POOL.capacityLitres);
  });
});
