import { describe, expect, it } from 'vite-plus/test';
import { climb, holdOnRungs, ladderAt, onRungs } from './ladder-zone';

const zone = {
  minX: 1.75,
  maxX: 2.35,
  minZ: 0.5,
  maxZ: 1.3,
  bottom: -3.5,
  top: 0,
};

describe('ladder zones', () => {
  it('climbs up looking up and down looking down, and not looking level', () => {
    expect(climb(zone, -2, 1, 0.4, 1, 1)).toBeCloseTo(-1.1);
    expect(climb(zone, -2, 1, -0.4, 1, 1)).toBeCloseTo(-2.9);
    expect(climb(zone, -2, -1, 0.4, 1, 1)).toBeCloseTo(-2.9);
    expect(climb(zone, -2, 1, 0, 1, 1)).toBe(-2);
  });

  it('never goes below the floor or above the gantry', () => {
    expect(climb(zone, -0.2, 1, 0.5, 10, 1)).toBe(0);
    expect(climb(zone, -3.3, 1, -0.5, 10, 1)).toBe(-3.5);
  });

  it('holds a climber part way up inside the cage', () => {
    expect(onRungs(zone, -2, 1)).toBe(true);
    expect(onRungs(zone, 0, 1)).toBe(false);
    expect(onRungs(zone, -3.5, 1)).toBe(false);
    const held = holdOnRungs(zone, 0.5, 2, 0.25);
    expect(held.x).toBeCloseTo(2.0);
    expect(held.z).toBeCloseTo(1.05);
    expect(ladderAt([zone], 2, 1)).toBe(zone);
    expect(ladderAt([zone], 0, 0)).toBe(null);
  });
});
