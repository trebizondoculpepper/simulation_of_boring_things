import { describe, expect, it } from 'vite-plus/test';
import {
  MOTOR_RADIUS,
  PUMP_SET_LENGTH,
  endSuctionPumpClashes,
  endSuctionPumpLayout,
} from './end-suction-pump';
import { PAIR_DISCHARGE_X, PUMP_ALONG } from './pump-pair';

describe('the end-suction pump set along its shaft', () => {
  const p = endSuctionPumpLayout();

  it('has nothing cutting into anything else', () => {
    expect(endSuctionPumpClashes(p)).toEqual([]);
  });

  it('puts the coupling guard between the bearing bracket and the motor’s smooth drive-end shield', () => {
    expect(p.guard.x0).toBeCloseTo(p.bracket.x1, 9);
    expect(p.guard.x1).toBeCloseTo(p.shield.x0, 9);
    // The fins start on the frame, behind the shield: none inside the guard.
    expect(p.fins.x0).toBeGreaterThan(p.guard.x1);
    expect(p.guardHalf).toBeLessThan(MOTOR_RADIUS);
  });

  it('keeps the volute (and so the discharge nozzle) where the pipework expects it', () => {
    const vx = (p.volute.x0 + p.volute.x1) / 2;
    expect(PUMP_ALONG + vx).toBeCloseTo(PAIR_DISCHARGE_X, 9);
    expect(p.volute.x0).toBeCloseTo(-0.7, 9);
    expect(p.cowl.x1).toBeCloseTo(0.92, 9);
    expect(p.cowl.x1).toBeLessThanOrEqual(PUMP_SET_LENGTH / 2);
  });

  it('finds a guard pushed into the motor', () => {
    const bad = { ...p, guard: { ...p.guard, x1: p.guard.x1 + 0.08 } };
    bad.spans = [p.volute, p.bracket, bad.guard, p.shield, p.frame, p.cowl];
    expect(endSuctionPumpClashes(bad)).toContain(
      'the drive-end shield cuts into the coupling guard',
    );
  });

  it('finds a guard wider than the motor', () => {
    expect(endSuctionPumpClashes({ ...p, guardHalf: 0.21 })).toContain(
      'the coupling guard overhangs the drive-end shield',
    );
  });
});
