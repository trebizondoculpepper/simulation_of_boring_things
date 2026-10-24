import { describe, expect, it } from 'vite-plus/test';
import {
  ROLL_DEGREES_PER_SECOND,
  flyCamera,
  flightHelp,
  rollCamera,
  wrapAngle,
} from './noclip';

const bounds = { minX: -5, maxX: 5, minY: -3, maxY: 8, minZ: -5, maxZ: 5 };
const pose = { x: 0, y: 2, z: 0, yaw: 0, pitch: 0 };
describe('noclip flight', () => {
  it('holds height without input, and flies along the camera pitch', () => {
    expect(flyCamera(pose, { forward: 0, right: 0, up: 0 }, 2, bounds)).toEqual(
      { x: 0, y: 2, z: 0 },
    );
    const next = flyCamera(
      { ...pose, pitch: Math.PI / 4 },
      { forward: 1, right: 0, up: 0 },
      2,
      bounds,
    );
    expect(next.y).toBeCloseTo(2 + Math.SQRT2);
    expect(next.z).toBeCloseTo(-Math.SQRT2);
  });
  it('rises and descends independently of the view, with consistent diagonal speed', () => {
    expect(flyCamera(pose, { forward: 0, right: 0, up: -1 }, 2, bounds).y).toBe(
      0,
    );
    const next = flyCamera(pose, { forward: 1, right: 1, up: 1 }, 2, bounds);
    expect(Math.hypot(next.x, next.y - 2, next.z)).toBeCloseTo(2);
  });
  it('passes through internal obstacles without leaving any face of the room envelope', () => {
    expect(
      flyCamera(pose, { forward: -1, right: 1, up: 1 }, 100, bounds),
    ).toEqual({ x: 5, y: 8, z: 5 });
    expect(
      flyCamera(pose, { forward: 1, right: -1, up: -1 }, 100, bounds),
    ).toEqual({ x: -5, y: -3, z: -5 });
  });
  it('explains flight for all input schemes', () => {
    expect(flightHelp('mouse')).toContain('Ctrl');
    expect(flightHelp('touch')).toContain('UP / DOWN');
    expect(flightHelp('gamepad')).toContain('A: rise');
  });
  it('explains rolling and levelling for all input schemes', () => {
    expect(flightHelp('mouse')).toContain('Q / E: roll');
    expect(flightHelp('mouse')).toContain('R: level');
    expect(flightHelp('touch')).toContain('LEVEL');
    expect(flightHelp('gamepad')).toContain('LB / RB: roll');
  });
});

describe('noclip roll', () => {
  const degrees = (r: number) => (r * 180) / Math.PI;
  it('rolls at a steady rate while held, either way, and holds when let go', () => {
    expect(degrees(rollCamera(0, 1, 1))).toBeCloseTo(ROLL_DEGREES_PER_SECOND);
    expect(degrees(rollCamera(0, -1, 0.5))).toBeCloseTo(
      -ROLL_DEGREES_PER_SECOND / 2,
    );
    expect(rollCamera(0.3, 0, 5)).toBeCloseTo(0.3);
  });
  it('takes a trigger’s part-pull as a slower roll, and never more than full', () => {
    expect(degrees(rollCamera(0, 0.25, 1))).toBeCloseTo(
      ROLL_DEGREES_PER_SECOND / 4,
    );
    expect(rollCamera(0, 3, 1)).toBeCloseTo(rollCamera(0, 1, 1));
  });
  it('goes all the way round, kept within a half turn either way', () => {
    let roll = 0;
    for (let i = 0; i < 100; i++) roll = rollCamera(roll, 1, 0.1);
    expect(Math.abs(roll)).toBeLessThanOrEqual(Math.PI);
    expect(degrees(roll)).toBeCloseTo(
      ((ROLL_DEGREES_PER_SECOND * 10 + 180) % 360) - 180,
    );
    expect(wrapAngle(-Math.PI)).toBe(Math.PI);
    expect(wrapAngle(Math.PI * 3)).toBeCloseTo(Math.PI);
    expect(wrapAngle(-0.5)).toBeCloseTo(-0.5);
  });
});
