import { describe, expect, it } from 'vite-plus/test';
import { Group, Mesh } from 'three';
import { touchPoint, touchingAt } from './touch-point';

describe('a touch on a surface', () => {
  it('is known to the surface struck, inside the use only', () => {
    const surface = new Group();
    const screen = new Mesh();
    surface.add(screen);
    const other = new Mesh();
    let seen: ReturnType<typeof touchPoint> = null;
    let elsewhere: ReturnType<typeof touchPoint> = null;
    touchingAt({ object: screen, uv: { x: 0.25, y: 0.75 } }, () => {
      seen = touchPoint(surface);
      elsewhere = touchPoint(other);
    });
    expect(seen).toEqual({ u: 0.25, v: 0.75, point: null });
    expect(elsewhere).toBeNull();
    expect(touchPoint(surface)).toBeNull();
  });

  it('gives nothing for a hit with neither texture coordinates nor a point', () => {
    const screen = new Mesh();
    let seen: ReturnType<typeof touchPoint> = { u: 0, v: 0, point: null };
    touchingAt({ object: screen }, () => (seen = touchPoint(screen)));
    expect(seen).toBeNull();
    touchingAt(
      { object: screen, point: { x: 1, y: 2, z: 3 } },
      () => (seen = touchPoint(screen)),
    );
    expect(seen).toEqual({
      u: Number.NaN,
      v: Number.NaN,
      point: { x: 1, y: 2, z: 3 },
    });
  });
});
