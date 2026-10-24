import { describe, expect, it } from 'vite-plus/test';
import {
  SEAL,
  createValveTestRig,
  rigLcdLines,
  valveFlow,
} from './valve-test-rig';

/** Step `rig` for `seconds` at 60 frames a second, as the room does. */
const run = (rig: ReturnType<typeof createValveTestRig>, seconds: number) => {
  for (let k = 0; k < Math.round(seconds * 60); k++) rig.step(1 / 60);
};

describe('valve test rig', () => {
  it('flows in proportion to the opening, and not at all shut', () => {
    expect(valveFlow(0, 20)).toBe(0);
    expect(valveFlow(SEAL, 20)).toBe(0);
    expect(valveFlow(0.5, 20)).toBeCloseTo(10);
    expect(valveFlow(1, 20)).toBeCloseTo(20);
  });

  it('starts shut, with nothing flowing', () => {
    const rig = createValveTestRig();
    run(rig, 1);
    const r = rig.readings();
    expect(r.shut).toBe(true);
    expect(r.flow).toBe(0);
    expect(r.received).toBe(0);
  });

  it('opens on its command in its stroke, and passes its full flow', () => {
    const rig = createValveTestRig();
    rig.setCommand(true);
    run(rig, rig.stroke / 2);
    const half = rig.readings();
    expect(half.moving).toBe(true);
    expect(half.position).toBeCloseTo(0.5, 1);
    expect(half.flow).toBeCloseTo(rig.fullFlow() * half.position, 3);
    run(rig, rig.stroke);
    const open = rig.readings();
    expect(open.open).toBe(true);
    expect(open.moving).toBe(false);
    expect(open.flow).toBeCloseTo(20, 3);
    expect(open.received).toBeGreaterThan(0);
  });

  it('springs shut when its power is thrown off, and obeys the panel again when it is back', () => {
    const rig = createValveTestRig();
    rig.setCommand(true);
    run(rig, rig.stroke + 1);
    rig.setSupply(false);
    expect(rig.readings().energised).toBe(false);
    run(rig, rig.stroke + 1);
    expect(rig.readings().shut).toBe(true);
    expect(rig.readings().flow).toBe(0);
    // Its command held by the panel: power back, it drives open again.
    rig.setSupply(true);
    run(rig, rig.stroke + 1);
    expect(rig.readings().open).toBe(true);
    rig.setCommand(false);
    run(rig, rig.stroke + 1);
    expect(rig.readings().shut).toBe(true);
  });

  it('cannot be opened without power', () => {
    const rig = createValveTestRig();
    rig.setSupply(false);
    rig.setCommand(true);
    run(rig, rig.stroke + 1);
    expect(rig.readings().shut).toBe(true);
  });

  it('reads out its flow and its travel', () => {
    const rig = createValveTestRig();
    expect(rigLcdLines(rig.readings())).toEqual([
      'FLOW    0.0 m3/h',
      '  0%        SHUT',
    ]);
    rig.setCommand(true);
    run(rig, 1);
    expect(rigLcdLines(rig.readings())[1]).toMatch(/OPENING$/);
    for (const line of rigLcdLines(rig.readings()))
      expect(line.length).toBeLessThanOrEqual(16);
  });
});
