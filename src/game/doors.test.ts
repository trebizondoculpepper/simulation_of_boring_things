import { describe, expect, it } from 'vite-plus/test';
import { PORTALS, advanceDoor, doorFootprint, visibleRooms } from './doors';

describe('self-closing room doors', () => {
  it('places a door at every planned connection and the street entrance', () => {
    expect(PORTALS.length).toBeGreaterThan(20);
    expect(PORTALS.some((portal) => portal.rooms.includes('outside'))).toBe(
      true,
    );
    for (const portal of PORTALS) {
      const footprint = doorFootprint(portal);
      expect(footprint.maxX).toBeGreaterThan(footprint.minX);
      expect(footprint.maxZ).toBeGreaterThan(footprint.minZ);
    }
  });

  it('opens on approach, holds, then closes after leaving', () => {
    const portal = PORTALS.find((item) => item.rooms.includes('changing'))!;
    let state = { open: 0, hold: 0 };
    state = advanceDoor(portal, state, portal.x, portal.z, portal.floorY, 0.5);
    expect(state.open).toBe(1);
    state = advanceDoor(portal, state, -100, -100, portal.floorY, 1);
    expect(state.open).toBe(1);
    state = advanceDoor(portal, state, -100, -100, portal.floorY, 0.5);
    expect(state.open).toBeLessThan(1);
  });

  it('keeps the frosted-glass view while hiding rooms behind opaque doors', () => {
    const glass = PORTALS.find((item) => item.kind === 'frosted-slide')!;
    const opaque = PORTALS.find(
      (item) => item.rooms.includes('changing') && item.kind === 'swing',
    )!;
    const states = new Map([
      [glass.id, { open: 0, hold: 0 }],
      [opaque.id, { open: 0, hold: 0 }],
    ]);
    expect(visibleRooms('reception', states).has('changing')).toBe(true);
    expect(visibleRooms('changing', states).has('hall')).toBe(false);
    states.set(opaque.id, { open: 0.5, hold: 1 });
    expect(visibleRooms('changing', states).has('hall')).toBe(true);
  });
});
