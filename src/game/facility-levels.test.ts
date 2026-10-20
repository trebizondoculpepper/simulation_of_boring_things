import { describe, expect, it } from 'vite-plus/test';
import {
  LOWER_STAIR_GUARDS,
  LOWER_Y,
  STAIR,
  STAIR_GOING,
  STAIR_RISE,
  STAIR_RISERS,
  UPPER_STAIR_GUARDS,
  floorAt,
  nearbyRooms,
} from './facility-levels';
import { roomAt } from './facility-plan';

const z = (STAIR.minZ + STAIR.maxZ) / 2;
const inside = (guards: typeof UPPER_STAIR_GUARDS, x: number, zz: number) =>
  guards.some((g) => x > g.minX && x < g.maxX && zz > g.minZ && zz < g.maxZ);

describe('the stair between the corridors', () => {
  it('is a utility stair within Approved Document K', () => {
    expect(STAIR_RISE * STAIR_RISERS).toBeCloseTo(-LOWER_Y);
    expect(STAIR_RISE).toBeLessThanOrEqual(0.19);
    expect(STAIR_GOING).toBeGreaterThanOrEqual(0.25);
    expect(Math.atan2(STAIR_RISE, STAIR_GOING)).toBeLessThanOrEqual(
      (42 * Math.PI) / 180,
    );
    expect(STAIR.maxX - STAIR.minX).toBeCloseTo(
      (STAIR_RISERS - 1) * STAIR_GOING,
    );
  });

  it('runs from the ground floor at its top to the lower floor at its foot', () => {
    expect(floorAt(STAIR.maxX, z, 0)).toBeCloseTo(0);
    expect(floorAt((STAIR.minX + STAIR.maxX) / 2, z, -1.5)).toBeCloseTo(-1.5);
    expect(floorAt(STAIR.minX, z, -3)).toBeCloseTo(LOWER_Y);
  });

  it('keeps both corridors walkable, one above the other', () => {
    expect(floorAt(60, -2, 0)).toBe(0);
    expect(floorAt(60, -2, LOWER_Y)).toBe(LOWER_Y);
    expect(roomAt(60, -2, undefined, 0)?.id).toBe('corridor');
    expect(roomAt(60, -2, undefined, LOWER_Y)?.id).toBe('lower-corridor');
  });

  it('guards the opening upstairs but leaves its top end open', () => {
    expect(inside(UPPER_STAIR_GUARDS, STAIR.minX - 0.04, z)).toBe(true);
    expect(
      inside(
        UPPER_STAIR_GUARDS,
        (STAIR.minX + STAIR.maxX) / 2,
        STAIR.maxZ + 0.04,
      ),
    ).toBe(true);
    expect(inside(UPPER_STAIR_GUARDS, STAIR.maxX - 0.1, z)).toBe(false);
  });

  it('lets the walker onto its foot downstairs but not under its upper half', () => {
    expect(inside(LOWER_STAIR_GUARDS, STAIR.minX + 0.1, z)).toBe(false);
    expect(inside(LOWER_STAIR_GUARDS, STAIR.maxX - 0.2, z)).toBe(true);
  });

  it('loads each corridor as the other’s neighbour, and the lower plant rooms', () => {
    expect(nearbyRooms('corridor').has('lower-corridor')).toBe(true);
    expect(nearbyRooms('lower-corridor').has('pumps')).toBe(true);
    expect(nearbyRooms('lower-corridor').has('balance-tank')).toBe(true);
  });
});
