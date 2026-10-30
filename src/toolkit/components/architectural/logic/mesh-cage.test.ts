import { describe, expect, it } from 'vite-plus/test';
import {
  cageLayout,
  doorLeafAngle,
  easeDoor,
  evenPosts,
  meshWires,
} from './mesh-cage';
import type { MeshCageSpec } from './mesh-cage';

const co2: MeshCageSpec = {
  w: 5.7,
  d: 1.2,
  h: 2.2,
  door: { side: 'front', at: 0.95, width: 1.0, hinge: 'left', opens: 'out' },
  partitions: [-1.7, 1.7],
};

describe('a mesh cage’s posts', () => {
  it('are evenly spaced, both ends included, no bay over the spacing', () => {
    expect(evenPosts(2.4, 1.2)).toEqual([-1.2, 0, 1.2]);
    const ps = evenPosts(5.7, 1.2);
    expect(ps).toHaveLength(6);
    for (let i = 1; i < ps.length; i++)
      expect(ps[i] - ps[i - 1]).toBeLessThanOrEqual(1.2);
  });
  it('stand at every corner, each once, and at the partitions front and back', () => {
    const l = cageLayout(co2);
    for (const c of [
      [-2.85, -0.6],
      [2.85, -0.6],
      [2.85, 0.6],
      [-2.85, 0.6],
    ])
      expect(
        l.posts.some((p) => Math.hypot(p[0] - c[0], p[1] - c[1]) < 1e-6),
      ).toBe(true);
    const keys = l.posts.map((p) => p.map((v) => v.toFixed(3)).join());
    expect(new Set(keys).size).toBe(keys.length);
    for (const x of [-1.7, 1.7]) {
      expect(l.sidePosts.front).toContain(x);
      expect(l.sidePosts.back).toContain(x);
    }
  });
  it('frame the door with jambs, no regular post in or close beside its opening', () => {
    const l = cageLayout(co2);
    expect(l.door.from).toBeCloseTo(0.45);
    expect(l.door.to).toBeCloseTo(1.45);
    for (const p of l.sidePosts.front)
      if (p > 0.45 + 1e-6 && p < 1.45 - 1e-6)
        throw new Error(`post ${p} in the doorway`);
  });
});

describe('its panels', () => {
  it('fill every side between posts but the doorway', () => {
    const l = cageLayout(co2);
    for (const side of ['back', 'left', 'right'] as const) {
      const span = l.panels
        .filter((p) => p.side === side)
        .reduce((s, p) => s + p.to - p.from, 0);
      expect(span).toBeCloseTo(side === 'back' ? 5.7 : 1.2, 6);
    }
    const front = l.panels
      .filter((p) => p.side === 'front')
      .reduce((s, p) => s + p.to - p.from, 0);
    expect(front).toBeCloseTo(5.7 - 1.0, 6);
  });
  it('carry wires every 50 mm', () => {
    const w = meshWires(1.0, 0.05);
    expect(w).toHaveLength(21);
    expect(w[1] - w[0]).toBeCloseTo(0.05);
    expect(w[0]).toBeCloseTo(-0.5);
  });
});

describe('its door', () => {
  it('hangs from its hinge side as seen from outside, and swings out', () => {
    const l = cageLayout(co2);
    // Seen from the front, its left is −x: hinged at the doorway's −x jamb.
    expect(l.door.hingeAlong).toBeCloseTo(0.45);
    expect(l.door.toward).toBe(1);
    // Turning by the angle takes the leaf's free end (+x of the hinge) out, toward +z.
    const a = doorLeafAngle(co2, 1);
    const z = -1 * Math.sin(a);
    expect(z).toBeGreaterThan(0.99);
    expect(
      doorLeafAngle({ ...co2, door: { ...co2.door, opens: 'in' } }, 1),
    ).toBeCloseTo(-a);
  });
  it('refuses a door that leaves its side or meets a partition', () => {
    expect(() =>
      cageLayout({ ...co2, door: { ...co2.door, at: 2.6 } }),
    ).toThrow();
    expect(() =>
      cageLayout({ ...co2, door: { ...co2.door, at: 1.7 } }),
    ).toThrow();
  });
  it('eases open and shut', () => {
    expect(easeDoor(0, 1, 0.2)).toBeCloseTo(0.3);
    expect(easeDoor(0.9, 1, 1)).toBe(1);
    expect(easeDoor(0.1, 0, 1)).toBe(0);
  });
  it('hangs on a side wall too', () => {
    const l = cageLayout({
      w: 2,
      d: 2,
      h: 2,
      door: { side: 'right', at: 0, width: 0.8, hinge: 'left', opens: 'out' },
    });
    expect(l.door.hinge[0]).toBeCloseTo(1);
    expect(l.door.hingeAlong).toBeCloseTo(0.4);
  });
});
