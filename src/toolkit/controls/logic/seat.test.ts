import { describe, expect, it } from 'vite-plus/test';
import {
  SEATED_EYE_ABOVE_SEAT,
  SEATED_PITCH,
  SEATED_PITCH_RANGE,
  seatPose,
  standsUp,
  yawAlong,
} from './seat';

describe('seat pose', () => {
  it('puts the eye about 1.2 m up on a low chair, over its seat', () => {
    const pose = seatPose({ x: 2, y: 0.48, z: 3 }, { x: 0, z: -1 }, 0.72, 0);
    expect(pose.eyeY).toBeCloseTo(1.2);
    expect(pose.x).toBe(2);
    expect(pose.z).toBe(3);
    expect(0.48 + SEATED_EYE_ABOVE_SEAT).toBeCloseTo(1.2);
  });

  it("faces the chair's way, a little down, with no console", () => {
    // Facing north (-z): yaw 0; facing south: π; facing east (+x): π/2.
    expect(
      seatPose({ x: 0, y: 0, z: 0 }, { x: 0, z: -1 }, 1, 0).yaw,
    ).toBeCloseTo(0);
    expect(
      Math.abs(seatPose({ x: 0, y: 0, z: 0 }, { x: 0, z: 1 }, 1, 0).yaw),
    ).toBeCloseTo(Math.PI);
    expect(
      seatPose({ x: 0, y: 0, z: 0 }, { x: 1, z: 0 }, 1, 0).yaw,
    ).toBeCloseTo(Math.PI / 2);
    expect(seatPose({ x: 0, y: 0, z: 0 }, { x: 1, z: 0 }, 1, 0).pitch).toBe(
      SEATED_PITCH,
    );
  });

  it('leans the eye forward of the seat the way the chair faces', () => {
    const pose = seatPose({ x: 0, y: 0, z: 0 }, { x: 3, z: 0 }, 1, 0.1);
    expect(pose.x).toBeCloseTo(0.1);
    expect(pose.z).toBeCloseTo(0);
  });

  it('turns and looks down at its console', () => {
    // A panel 0.9 m ahead (north) and a little east, 0.5 m below the eye.
    const pose = seatPose({ x: 0, y: 0.62, z: 0 }, { x: 0, z: -1 }, 0.72, 0, {
      x: 0.3,
      y: 0.84,
      z: -0.9,
    });
    expect(pose.yaw).toBeCloseTo(yawAlong(0.3, -0.9));
    expect(pose.yaw).toBeGreaterThan(0);
    expect(pose.pitch).toBeCloseTo(
      Math.atan2(0.84 - 1.34, Math.hypot(0.3, 0.9)),
    );
    expect(pose.pitch).toBeLessThan(0);
  });

  it('never looks steeply down or up at a console', () => {
    const under = seatPose({ x: 0, y: 0.5, z: 0 }, { x: 0, z: -1 }, 0.7, 0, {
      x: 0,
      y: -5,
      z: -0.1,
    });
    expect(under.pitch).toBe(SEATED_PITCH_RANGE.min);
    const over = seatPose({ x: 0, y: 0.5, z: 0 }, { x: 0, z: -1 }, 0.7, 0, {
      x: 0,
      y: 9,
      z: -0.1,
    });
    expect(over.pitch).toBe(SEATED_PITCH_RANGE.max);
  });

  it("faces the chair's way when its console is right over the eye", () => {
    const pose = seatPose({ x: 1, y: 0, z: 1 }, { x: 0, z: 1 }, 1, 0, {
      x: 1,
      y: 3,
      z: 1,
    });
    expect(Math.abs(pose.yaw)).toBeCloseTo(Math.PI);
  });

  it('works in scaled units alike', () => {
    const k = 9;
    const a = seatPose({ x: 1, y: 0.5, z: 2 }, { x: 0, z: -1 }, 0.72, 0.06, {
      x: 1.2,
      y: 0.9,
      z: 1,
    });
    const b = seatPose(
      { x: k, y: 0.5 * k, z: 2 * k },
      { x: 0, z: -1 },
      0.72 * k,
      0.06 * k,
      {
        x: 1.2 * k,
        y: 0.9 * k,
        z: k,
      },
    );
    expect(b.x).toBeCloseTo(a.x * k);
    expect(b.eyeY).toBeCloseTo(a.eyeY * k);
    expect(b.yaw).toBeCloseTo(a.yaw);
    expect(b.pitch).toBeCloseTo(a.pitch);
  });
});

describe('standing up', () => {
  it('stands on a change of stance or any step, not on looking or using', () => {
    expect(standsUp({ moving: false, stance: false })).toBe(false);
    expect(standsUp({ moving: true, stance: false })).toBe(true);
    expect(standsUp({ moving: false, stance: true })).toBe(true);
  });
});
