import { describe, expect, it } from 'vite-plus/test';
import { floorAt, nearbyRooms } from './facility-levels';

describe('stacked facility levels', () => {
  it('descends continuously along the service stair', () => {
    expect(floorAt(44, -3.2, 0)).toBe(0);
    expect(floorAt(38, -3.2, -1)).toBe(-1.5);
    expect(floorAt(32, -3.2, -3)).toBe(-3);
  });
  it('keeps both floors available at the same plan position', () => {
    expect(floorAt(26, -2, 0)).toBe(0);
    expect(floorAt(26, -2, -3)).toBe(-3);
  });
  it('loads both ends of the stair as neighbours', () => {
    expect(nearbyRooms('corridor').has('lower-landing')).toBe(true);
    expect(nearbyRooms('lower-landing').has('balance-tank')).toBe(true);
  });
});
