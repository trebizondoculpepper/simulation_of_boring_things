import { describe, expect, it } from 'vite-plus/test';
import {
  landingArrival,
  LIFT_DOOR,
  liftDoorway,
  liftLocal,
  liftWorld,
  lookingOut,
} from './lift-doorway';

const ahead = (yaw: number) => ({ x: Math.sin(yaw), z: -Math.cos(yaw) });

describe('a lift doorway (mission 108)', () => {
  it('turns local and room points back and forth', () => {
    const place = { x: 17.9, z: 0, yaw: 0 };
    expect(liftWorld(place, 0, 1)).toEqual({ x: 17.9, z: 1 });
    const turned = { x: 3, z: 4, yaw: Math.PI / 2 };
    const p = liftWorld(turned, 0.5, 1.2);
    const back = liftLocal(turned, p.x, p.z);
    expect(back.u).toBeCloseTo(0.5);
    expect(back.v).toBeCloseTo(1.2);
  });
  it('a north-wall landing: its leaves behind the face, through means north of it', () => {
    const d = liftDoorway({ x: 17.9, z: 0, yaw: 0 });
    expect(d.leaf.maxZ).toBeCloseTo(0);
    expect(d.leaf.minZ).toBeCloseTo(-LIFT_DOOR.depth);
    expect(d.leaf.maxX - d.leaf.minX).toBeCloseTo(LIFT_DOOR.clear);
    expect(d.through(17.9, -0.2)).toBe(true);
    expect(d.through(17.9, 0.2)).toBe(false);
    expect(d.through(20, -0.2)).toBe(false);
    expect(d.inDoorway(17.9, 0.2)).toBe(true);
    expect(d.inDoorway(17.9, 1.5)).toBe(false);
  });
  it('arrives facing into the room, and looks out the other way', () => {
    for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const place = { x: 1, z: 2, yaw };
      const a = landingArrival(place);
      const into = liftLocal(place, a.x, a.z);
      expect(into.v).toBeCloseTo(1.5);
      const f = ahead(a.yaw);
      const step = liftLocal(place, a.x + f.x, a.z + f.z);
      expect(step.v).toBeCloseTo(2.5);
      const o = ahead(lookingOut(place));
      expect(liftLocal(place, place.x + o.x, place.z + o.z).v).toBeCloseTo(-1);
    }
  });
});
