import { describe, expect, it } from 'vite-plus/test';
import {
  LIFEBUOY_STICKER,
  PANEL,
  comingSoonPanel,
  hallArches,
  hallFireExitOpening,
  hallLiftOpening,
  hallOrigin,
  hallWalls,
  insideFaceRuns,
} from './museum-plan';
import { safetyLayer } from './museum-safety';

/** Hall 0, the welcome hall: its wall items, its cove and its panel (the audit, 2026-10-31). */
describe('museum Hall 0', () => {
  const id = 'museum0';
  const walls = hallWalls(id);
  const arches = hallArches(id);
  const along = (w: (typeof walls)[number], p: { x: number; z: number }) =>
    w.axis === 'x' ? p.x : p.z;
  const across = (w: (typeof walls)[number], p: { x: number; z: number }) =>
    w.axis === 'x' ? p.z : p.x;
  /** Whether a wall item of half-width `half` at `u` along `wall` reaches into an archway in it. */
  const inArch = (wall: (typeof walls)[number], u: number, half: number) =>
    arches.some(
      (a) =>
        a.axis === wall.axis &&
        Math.abs(across(wall, a.at) - wall.line) < 1e-6 &&
        Math.abs(u - along(wall, a.at)) < a.w / 2 + half,
    );

  it('hangs nothing on a wall across an archway', () => {
    for (const f of safetyLayer(id)) {
      if (f.y === 0 || f.kind === 'exit-hanging') continue;
      for (const wall of walls) {
        if (Math.abs(across(wall, f) - wall.line) > 0.5) continue;
        expect(inArch(wall, along(wall, f), 0.15), f.kind).toBe(false);
      }
    }
  });

  it('keeps the lifebuoy sticker clear of the archways', () => {
    const west = walls.find((w) => w.side === 'west')!;
    const u = (west.from + west.to) / 2 + LIFEBUOY_STICKER.along;
    expect(inArch(west, u, LIFEBUOY_STICKER.size / 2)).toBe(false);
    expect(u + LIFEBUOY_STICKER.size / 2).toBeLessThan(west.to - 0.3);
  });

  it('breaks the tiled cove at the lift and the fire exit', () => {
    const runs = insideFaceRuns(id, 0);
    for (const opening of [hallLiftOpening(id)!, hallFireExitOpening(id)!]) {
      const crossing = runs.filter(
        (r) =>
          r.wall.side === opening.wall.side &&
          r.from < opening.u + opening.w / 2 - 1e-6 &&
          r.to > opening.u - opening.w / 2 + 1e-6,
      );
      expect(crossing).toEqual([]);
    }
  });

  it('stands the welcome panel clear of the medical wall and the archways', () => {
    const p = comingSoonPanel(id)!;
    const o = hallOrigin(id);
    const north = walls.find((w) => w.side === 'north')!;
    // Its ends, across its face (it stands turned by its yaw).
    const ends = [-1, 1].map((s) => ({
      x: o.x + p.x + s * Math.cos(p.yaw) * (PANEL.w / 2),
      z: o.z + p.z - s * Math.sin(p.yaw) * (PANEL.w / 2),
    }));
    for (const f of safetyLayer(id).filter(
      (f) => f.kind === 'aed' || f.kind === 'first-aid',
    ))
      for (const e of ends)
        expect(Math.hypot(e.x - f.x, e.z - f.z), f.kind).toBeGreaterThan(3);
    for (const e of ends) expect(e.z - north.line).toBeGreaterThan(3);
    // Out of every archway's approach: 3 m in front of it, its width and a margin.
    for (const a of arches)
      for (const e of [...ends, { x: o.x + p.x, z: o.z + p.z }]) {
        const dx = e.x - a.at.x;
        const dz = e.z - a.at.z;
        const ahead = dx * a.into[0] + dz * a.into[1];
        const side = Math.abs(dx * a.into[1] - dz * a.into[0]);
        expect(ahead < 3 && side < a.w / 2 + 0.3).toBe(false);
      }
  });

  it('points the exit sign inside the west archway towards the fire exit', () => {
    const signs = safetyLayer(id).filter((f) => f.kind === 'exit-hanging');
    expect(
      signs.map((s) => s.arrow ?? '').sort((p, q) => p.localeCompare(q)),
    ).toEqual(['right', 'up']);
  });
});
