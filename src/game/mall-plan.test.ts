import { describe, expect, it } from 'vite-plus/test';
import { ROOMS, openingsOf, roomById } from './facility-plan';
import type { PlanFootprint } from './facility-plan';
import { PORTALS } from './doors';
import { WINDOWS } from './daylight-plan';
import {
  CONCOURSE,
  COURT,
  ENTRANCE,
  LOCKED_PORTALS,
  MALL_SOLIDS,
  SERVICE_BAYS,
  UNITS,
  UNIT_DEPTH,
  dimming,
  splitFrontage,
} from './mall-plan';

const overlaps = (a: PlanFootprint, b: PlanFootprint) =>
  a.minX < b.maxX && b.minX < a.maxX && a.minZ < b.maxZ && b.minZ < a.maxZ;

const inside = (x: number, z: number, f: PlanFootprint) =>
  x >= f.minX && x <= f.maxX && z >= f.minZ && z <= f.maxZ;

describe('mall plan', () => {
  it('keeps the concourse, court and service bays clear of the building', () => {
    for (const space of [CONCOURSE, COURT, ...SERVICE_BAYS])
      for (const room of ROOMS) expect(overlaps(space, room)).toBe(false);
  });

  it('puts the reception street entrance on the concourse', () => {
    expect(ENTRANCE.x).toBe(CONCOURSE.minX);
    expect(ENTRANCE.z).toBeGreaterThan(roomById('reception').minZ);
    expect(ENTRANCE.z).toBeLessThan(roomById('reception').maxZ);
  });

  it('locks the entrance door to the mall', () => {
    for (const id of LOCKED_PORTALS)
      expect(PORTALS.some((portal) => portal.id === id)).toBe(true);
    expect(LOCKED_PORTALS.has('door:entrance')).toBe(true);
  });

  it('seals the whole street opening with a solid outside the door', () => {
    const reception = roomById('reception');
    const seal = MALL_SOLIDS[0];
    for (const opening of openingsOf(reception).east) {
      expect(seal.minZ).toBeLessThanOrEqual(opening.from);
      expect(seal.maxZ).toBeGreaterThanOrEqual(opening.to);
    }
    // It sits outside the building, across the doorway line.
    expect(seal.minX).toBeGreaterThan(reception.maxX);
    expect(seal.minX - reception.maxX).toBeLessThan(0.3);
  });

  it('splits frontages into whole units', () => {
    const units = splitFrontage(0, 30);
    expect(units).toHaveLength(4);
    expect(units[0].from).toBe(0);
    expect(units[3].to).toBe(30);
  });

  it('gives every unit a name and keeps units on one frontage apart', () => {
    for (const unit of UNITS) {
      expect(unit.name.length).toBeGreaterThan(0);
      expect(unit.to).toBeGreaterThan(unit.from);
    }
    for (const a of UNITS)
      for (const b of UNITS)
        if (a !== b && a.frontage === b.frontage)
          expect(a.to <= b.from + 1e-9 || b.to <= a.from + 1e-9).toBe(true);
    expect(UNITS.some((u) => u.state === 'to-let')).toBe(true);
    expect(UNITS.some((u) => u.state === 'dark')).toBe(true);
  });

  it('keeps west-side shop interiors clear of the building', () => {
    for (const unit of UNITS.filter((u) => u.frontage === 'west')) {
      const interior = {
        minX: CONCOURSE.minX - UNIT_DEPTH,
        maxX: CONCOURSE.minX,
        minZ: unit.from,
        maxZ: unit.to,
      };
      for (const room of ROOMS) expect(overlaps(interior, room)).toBe(false);
    }
  });

  it('fades the light away from the entrance', () => {
    expect(dimming(ENTRANCE.z)).toBe(1);
    expect(dimming(ENTRANCE.z + 40)).toBeLessThan(1);
    expect(dimming(ENTRANCE.z - 60)).toBeLessThan(dimming(ENTRANCE.z - 40));
    expect(dimming(CONCOURSE.minZ)).toBeGreaterThan(0);
    expect(dimming(CONCOURSE.maxZ)).toBeLessThan(0.2);
  });

  it('puts a service bay or the mall outside every low window', () => {
    for (const window of WINDOWS.filter((w) => w.top < 5)) {
      const room = roomById(window.room);
      const mid = (window.from + window.to) / 2;
      const [x, z] =
        window.side === 'north'
          ? [mid, room.minZ - 1]
          : window.side === 'south'
            ? [mid, room.maxZ + 1]
            : window.side === 'east'
              ? [room.maxX + 1, mid]
              : [room.minX - 1, mid];
      expect(
        [CONCOURSE, COURT, ...SERVICE_BAYS].some((f) => inside(x, z, f)),
      ).toBe(true);
    }
  });
});
