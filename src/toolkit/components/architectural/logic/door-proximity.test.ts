import { describe, expect, it } from 'vite-plus/test';
import {
  createDoorPresence,
  DOOR_PROXIMITY,
  doorwayClearance,
  nextDoorPresence,
} from './door-proximity';

const R = 0.175;
/** A single plant door, 1.026 m wide, through a 0.2 m wall along x at z = 0. */
const single = { minX: -0.513, maxX: 0.513, minZ: -0.1, maxZ: 0.1 };
/** A pair of equipment doors, 1.92 m wide, through a wall along z (turned a quarter). */
const pair = { minX: 4.9, maxX: 5.1, minZ: -0.96, maxZ: 0.96 };

describe('how near a doorway someone is', () => {
  it('is measured from their body to the opening, the same on either side', () => {
    expect(doorwayClearance(single, { x: 0, z: 1.1, radius: R })).toBeCloseTo(
      1 - R,
    );
    expect(doorwayClearance(single, { x: 0, z: -1.1, radius: R })).toBeCloseTo(
      1 - R,
    );
    // In the doorway itself, and touching it: no distance at all.
    expect(doorwayClearance(single, { x: 0, z: 0, radius: R })).toBe(0);
    expect(doorwayClearance(single, { x: 0, z: 0.2, radius: R })).toBe(0);
  });

  it('allows for the doorway’s width: beside a wide pair, near either end', () => {
    // Off the end of the pair's opening, along its wall, 1 m clear.
    expect(doorwayClearance(pair, { x: 5.6, z: 0.9, radius: R })).toBeCloseTo(
      0.5 - R,
    );
    expect(doorwayClearance(pair, { x: 4.4, z: -0.9, radius: R })).toBeCloseTo(
      0.5 - R,
    );
    // The same distance from the middle of a single door would be nearer
    // the opening's end than a pair's: width counts.
    expect(doorwayClearance(single, { x: 1.5, z: 0, radius: R })).toBeCloseTo(
      1.5 - 0.513 - R,
    );
    expect(doorwayClearance(pair, { x: 5, z: 2.4, radius: R })).toBeCloseTo(
      2.4 - 0.96 - R,
    );
  });

  it('takes in the sweep of the leaf: anywhere it swings is near', () => {
    // The leaf, 0.926 m, swings out 90 degrees: its tip at most that far out.
    for (const [x, z] of [
      [-0.5, 0.95],
      [0, 0.9],
      [0.45, 0.6],
    ])
      expect(
        nextDoorPresence(
          false,
          doorwayClearance(single, { x, z: z + 0.1, radius: R }),
        ),
      ).toBe(true);
  });

  it('is not near a doorway on another level (a pit, a stair below)', () => {
    expect(
      doorwayClearance(
        { ...single, floor: 0 },
        { x: 0, z: 0.5, radius: R, floor: -2.4 },
      ),
    ).toBe(Infinity);
    expect(
      doorwayClearance(
        { ...single, floor: 0.25 },
        { x: 0, z: 0.5, radius: R, floor: 0 },
      ),
    ).toBeLessThan(1);
  });
});

describe('someone near a doorway, frame by frame', () => {
  it('comes near within 1.5 m and stays near until beyond 1.75 m', () => {
    expect(DOOR_PROXIMITY.release).toBeGreaterThan(DOOR_PROXIMITY.enter);
    expect(nextDoorPresence(false, 1.5)).toBe(true);
    expect(nextDoorPresence(false, 1.6)).toBe(false);
    expect(nextDoorPresence(true, 1.7)).toBe(true);
    expect(nextDoorPresence(true, 1.8)).toBe(false);
  });

  it('standing on the edge does not flicker', () => {
    const presence = createDoorPresence(single);
    const z = 0.1 + R + 1.5;
    const seen: (boolean | undefined)[] = [];
    // Swaying a centimetre or two about the edge, each frame.
    for (let i = 0; i < 200; i++)
      seen.push(
        presence.update({ x: 0, z: z + 0.02 * Math.sin(i), radius: R }),
      );
    const changes = seen.filter((v, i) => i > 0 && v !== seen[i - 1]).length;
    expect(changes).toBeLessThanOrEqual(1);
    expect(seen.at(-1)).toBe(true);
  });

  it('looking or not, still or not, only where they stand counts', () => {
    const presence = createDoorPresence(single);
    for (let i = 0; i < 100; i++)
      expect(presence.update({ x: 0.3, z: 1.2, radius: R })).toBe(true);
  });

  it('no one is near a doorway of a room drawn under another', () => {
    const presence = createDoorPresence(() => single);
    expect(presence.update({ x: 0, z: 0, radius: R })).toBe(true);
    // The room left behind: its own walker parked in the doorway counts
    // for nothing, and its doors neither hold for nor hurry from it.
    expect(presence.update(null)).toBeUndefined();
    expect(presence.near).toBe(false);
  });

  it('works in metres: a scene in other units is converted first', () => {
    const metre = 100;
    const scene = { x: 0, z: 1.2 * metre };
    expect(
      doorwayClearance(single, {
        x: scene.x / metre,
        z: scene.z / metre,
        radius: R,
      }),
    ).toBeCloseTo(1.1 - R);
  });
});

import { doorActor } from './door-proximity';

describe('the walker, as doors see it', () => {
  it('is converted from scene units to metres, with its floor', () => {
    expect(
      doorActor(
        { following: false, walker: { x: 150, z: -40 }, floorY: -240 },
        100,
        R,
      ),
    ).toEqual({ x: 1.5, z: -0.4, radius: R, floor: -2.4 });
  });

  it('is no one while its room follows another’s eye', () => {
    expect(
      doorActor({ following: true, walker: { x: 0, z: 0 } }, 1, R),
    ).toBeNull();
  });
});
