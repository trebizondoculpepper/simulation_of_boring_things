import { describe, expect, it } from 'vite-plus/test';
import {
  FED_ROOMS,
  SWITCHBOARD_FEEDS,
  mainSwitchShows,
  wayName,
} from './switch-room';

describe('the main switchboard’s ways', () => {
  it('feed every room once, but the switch room, which is the supply', () => {
    const fed = Object.values(SWITCHBOARD_FEEDS).flat();
    expect([...fed].sort()).toEqual([...FED_ROOMS].sort());
    expect(new Set(fed).size).toBe(fed.length);
  });

  it('are named as their legends begin', () => {
    expect(wayName('DB-OLYMPIC 160 A')).toBe('DB-OLYMPIC');
    expect(wayName('DB-AIR PLANT 250 A')).toBe('DB-AIR PLANT');
    expect(wayName('MCC-1 400 A')).toBe('MCC-1');
  });
});

describe('the main incoming switch', () => {
  it('lights red when closed and green when open, and reads 400 V out only when closed', () => {
    expect(mainSwitchShows(true)).toEqual({
      supply: true,
      on: true,
      off: false,
      volts: 400,
    });
    expect(mainSwitchShows(false)).toEqual({
      supply: true,
      on: false,
      off: true,
      volts: 0,
    });
  });
});
