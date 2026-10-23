import { describe, expect, it } from 'vite-plus/test';
import { DOOR_FULL_AT, doorGain } from './door-attenuation';

describe('a sound heard past a door', () => {
  it('is at full volume while the door is open more than about 20 degrees', () => {
    expect(doorGain(DOOR_FULL_AT)).toBeCloseTo(1, 6);
    expect(doorGain(45)).toBeCloseTo(1, 6);
    expect(doorGain(110)).toBeCloseTo(1, 6);
  });

  it('is 20 dB down with the door shut', () => {
    expect(doorGain(0)).toBeCloseTo(0.1, 6);
  });

  it('fades evenly in decibels over the last 20 degrees', () => {
    // Half way: 10 dB down.
    expect(20 * Math.log10(doorGain(10))).toBeCloseTo(-10, 6);
    for (let a = 0; a < 20; a += 1)
      expect(doorGain(a + 1)).toBeGreaterThan(doorGain(a));
  });
});
