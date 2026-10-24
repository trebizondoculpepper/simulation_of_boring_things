import { describe, expect, it } from 'vite-plus/test';
import { DOOR_FULL_AT, doorGain } from './door-attenuation';

describe('a sound heard past a door', () => {
  it('is at full volume while the door is open more than about 20 degrees', () => {
    expect(doorGain(DOOR_FULL_AT)).toBeCloseTo(1, 6);
    expect(doorGain(45)).toBeCloseTo(1, 6);
    expect(doorGain(110)).toBeCloseTo(1, 6);
  });

  it('is 15 dB down with the door shut, so its machines are still heard', () => {
    expect(20 * Math.log10(doorGain(0))).toBeCloseTo(-15, 6);
  });

  it('fades evenly in decibels over the last 20 degrees', () => {
    // Half way: 7.5 dB down.
    expect(20 * Math.log10(doorGain(10))).toBeCloseTo(-7.5, 6);
    for (let a = 0; a < 20; a += 1)
      expect(doorGain(a + 1)).toBeGreaterThan(doorGain(a));
  });
});
