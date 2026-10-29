import { describe, expect, it } from 'vite-plus/test';
import {
  landingArrival,
  LIFT_DOOR,
  liftDoorway,
  liftLocal,
  liftWorld,
  lookingOut,
} from './lift-doorway';
import {
  CORRIDOR_LIFT,
  corridorArrival,
  LIFT_OPENING,
  wallPieces,
} from './main-corridor';
import {
  BRIDGE_LIFT,
  entryGaps,
  entryWallPieces,
} from './control-room-prototype';
import { lightSwitchPlace } from './bridge-lighting';

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

describe('the freight lift’s landings (mission 108)', () => {
  it('B2: a gap in the corridor’s north wall, in the free stretch, and the way back out of the car', () => {
    const half = LIFT_OPENING / 2;
    expect(CORRIDOR_LIFT.at - half).toBeGreaterThan(12.2);
    expect(CORRIDOR_LIFT.at + half).toBeLessThan(23.6);
    const pieces = wallPieces('north');
    expect(
      pieces.some(
        ([a, b]) =>
          a < CORRIDOR_LIFT.at + half - 1e-6 &&
          b > CORRIDOR_LIFT.at - half + 1e-6,
      ),
    ).toBe(false);
    const a = corridorArrival('freight_lift')!;
    expect(a.x).toBeCloseTo(CORRIDOR_LIFT.x);
    expect(a.z).toBeCloseTo(1.5);
  });
  it('3: on the bridge’s west wall, clear of the corridor’s doorway and the light switch', () => {
    const gaps = entryGaps();
    expect(gaps).toHaveLength(2);
    expect(gaps[0].to).toBeLessThanOrEqual(gaps[1].from);
    const lift = gaps.find((g) => g.head === BRIDGE_LIFT.top)!;
    const along = lightSwitchPlace().along;
    expect(along < lift.from || along > lift.to).toBe(true);
    // Every piece of wall between the gaps, none across them.
    const pieces = entryWallPieces();
    expect(pieces).toHaveLength(3);
    for (const [p, q] of pieces) expect(q).toBeGreaterThan(p);
  });
});
