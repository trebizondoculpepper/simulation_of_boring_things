import { describe, expect, it } from 'vite-plus/test';
import { HIDDEN_MARGIN, hiddenSpot, offSight } from './hidden-spot';

const grid = () => {
  const spots = [];
  for (let x = -4.5; x <= 4.5; x += 0.5)
    for (let z = -3.5; z <= 3.5; z += 0.5) spots.push({ x, z });
  return spots;
};
const skip = { x: 1.83, z: 1.22 };
const halfView = 0.75;

describe('putting something where it was not seen to appear', () => {
  it('measures how far off the line of sight a point is, either way round', () => {
    const eye = { x: 0, z: 0 };
    const north = { x: 0, z: -1 };
    expect(offSight(eye, north, { x: 0, z: -2 })).toBeCloseTo(0);
    expect(offSight(eye, north, { x: 0, z: 2 })).toBeCloseTo(Math.PI);
    expect(offSight(eye, north, { x: 2, z: 0 })).toBeCloseTo(Math.PI / 2);
    expect(offSight(eye, north, { x: -2, z: 0 })).toBeCloseTo(Math.PI / 2);
  });

  it('puts it behind whoever is looking, wholly out of view', () => {
    const eye = { x: 0, z: -2 };
    const facing = { x: 0, z: -1 };
    const spot = hiddenSpot({
      eye,
      facing,
      halfView,
      size: skip,
      candidates: grid(),
    })!;
    expect(spot.z).toBeGreaterThan(eye.z);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        expect(
          offSight(eye, facing, {
            x: spot.x + (sx * skip.x) / 2,
            z: spot.z + (sz * skip.z) / 2,
          }),
        ).toBeGreaterThan(halfView + HIDDEN_MARGIN);
  });

  it('keeps it near enough to find by turning round, and not on top of them', () => {
    const eye = { x: 1, z: 0 };
    const spot = hiddenSpot({
      eye,
      facing: { x: 1, z: 0 },
      halfView,
      size: skip,
      candidates: grid(),
    })!;
    const distance = Math.hypot(spot.x - eye.x, spot.z - eye.z);
    expect(distance).toBeGreaterThanOrEqual(1.8);
    expect(distance).toBeLessThan(4);
    expect(spot.x).toBeLessThan(eye.x);
  });

  it('finds nowhere when every place is in view', () => {
    expect(
      hiddenSpot({
        eye: { x: 0, z: 5 },
        facing: { x: 0, z: -1 },
        halfView,
        size: skip,
        candidates: [{ x: 0, z: 0 }],
      }),
    ).toBeNull();
  });
});
