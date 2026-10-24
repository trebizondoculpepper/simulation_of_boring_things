import { describe, expect, it } from 'vite-plus/test';
import { flyCamera, flightHelp } from './noclip';

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
});
