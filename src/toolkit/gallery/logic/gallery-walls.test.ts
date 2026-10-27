import { describe, expect, it } from 'vite-plus/test';
import { galleryWallLayout } from './gallery-walls';

describe('a gallery of wall exhibits round four walls', () => {
  const sizes = Array.from({ length: 40 }, () => ({
    w: 1.7,
    d: 0.06,
    h: 1.1,
    mount: 'wall' as const,
  }));
  const layout = galleryWallLayout(sizes);

  it('hangs every exhibit on a wall, facing into the room', () => {
    expect(layout.places).toHaveLength(40);
    for (const p of layout.places) {
      const onWall =
        Math.abs(Math.abs(p.x) - layout.halfX) < 0.2 ||
        Math.abs(Math.abs(p.z) - layout.halfZ) < 0.2;
      expect(onWall).toBe(true);
    }
  });

  it('keeps exhibits on one wall and tier from overlapping', () => {
    const key = (p: (typeof layout.places)[number]) =>
      `${p.yaw.toFixed(2)}|${p.y}`;
    const groups = new Map<string, number[]>();
    for (const p of layout.places) {
      const along = Math.abs(Math.sin(p.yaw)) > 0.5 ? p.z : p.x;
      groups.set(key(p), [...(groups.get(key(p)) ?? []), along]);
    }
    for (const list of groups.values()) {
      const sorted = [...list].sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i++)
        expect(sorted[i] - sorted[i - 1]).toBeGreaterThanOrEqual(1.7);
    }
  });

  it('keeps the door at the west wall’s south end clear, and the room tall enough', () => {
    for (const p of layout.places)
      if (Math.abs(p.yaw - Math.PI / 2) < 1e-6)
        expect(p.z + 0.85).toBeLessThanOrEqual(layout.halfZ - 2.4 + 1e-6);
    expect(layout.height).toBeGreaterThanOrEqual(2.6 + 0.55);
  });
});
