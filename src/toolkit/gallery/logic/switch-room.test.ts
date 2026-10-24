import { describe, expect, it } from 'vite-plus/test';
import { FED_ROOMS, SWITCHBOARD_FEEDS, wayName } from './switch-room';

describe('the main switchboard’s ways', () => {
  it('feed every room once, but the switch room, which is the supply', () => {
    const fed = Object.values(SWITCHBOARD_FEEDS).flat();
    expect([...fed].sort()).toEqual([...FED_ROOMS].sort());
    expect(new Set(fed).size).toBe(fed.length);
  });

  it('are named as their legends begin', () => {
    expect(wayName('DB-OLYMPIC 160 A')).toBe('DB-OLYMPIC');
    expect(wayName('DB-AIR PLANT 250 A')).toBe('DB-AIR PLANT');
    expect(wayName('DB-WET HALL 100 A')).toBe('DB-WET HALL');
  });
});
