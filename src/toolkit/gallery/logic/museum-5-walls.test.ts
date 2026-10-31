import { describe, expect, it } from 'vite-plus/test';
import {
  BAY,
  BAY_HANG,
  ENTRANCE_PANEL,
  GALLERY_RUNS,
  POOLSIDE,
  RAIL,
  RESET_POINT,
  SKIMMER_LECTERN,
  WALL,
  bayPlaces,
  futureBayPlace,
  galleryGaps,
  hall5Openings,
  railRuns,
  southSigns,
} from './museum-5-gallery';
import type { GalleryWall } from './museum-5-gallery';
import { hallOrigin, hallWalls, wallWindows } from './museum-plan';
import { safetyLayer } from './museum-safety';

/**
 * Hall 5's walls (the owner's audit, 2026-10-31): photographs spread over
 * every wall and evenly spaced, nothing hung across a doorway or a
 * window, nothing over anything else, and the rail broken at the doorways.
 */

/** A thing on a wall: its span along it (x or z, the hall's frame) and its height. */
interface OnWall {
  name: string;
  wall: GalleryWall;
  u0: number;
  u1: number;
  y0: number;
  y1: number;
}

const along = (wall: GalleryWall, x: number, z: number) =>
  wall === 'north' || wall === 'south' ? x : z;

function wallItems(): OnWall[] {
  // A bay's print, and its picture lights over it.
  const bays = [...bayPlaces(), futureBayPlace()].map((b) => {
    const u = along(b.wall, b.x, b.z);
    return {
      name: b.decade.decade,
      wall: b.wall,
      u0: u - BAY.w / 2 - 0.02,
      u1: u + BAY.w / 2 + 0.02,
      y0: BAY_HANG.y - BAY_HANG.h / 2 - 0.02,
      y1: BAY_HANG.y + BAY_HANG.h / 2 + 0.075,
    };
  });
  const s = southSigns();
  const sign = (name: string, q: typeof s.checks) => ({
    name,
    wall: 'south' as const,
    u0: q.x - q.w / 2 - 0.025,
    u1: q.x + q.w / 2 + 0.025,
    y0: q.y - q.h / 2 - 0.025,
    y1: q.y + q.h / 2 + 0.025,
  });
  const e = ENTRANCE_PANEL;
  return [
    ...bays,
    sign('Opening checks', s.checks),
    sign('No running', s.noRunning),
    {
      name: 'Entrance panel',
      wall: 'north',
      u0: e.x - e.w / 2 - 0.025,
      u1: e.x + e.w / 2 + 0.025,
      y0: e.y - e.h / 2 - 0.025,
      y1: e.y + e.h / 2 + 0.025,
    },
  ];
}

/** The hall's openings in its walls: its doorways, full height, and its windows. */
function openings(): OnWall[] {
  const o = hallOrigin('museum5');
  const out: OnWall[] = hall5Openings().map((d) => ({
    name: `doorway (${d.wall})`,
    ...d,
    u0: d.from,
    u1: d.to,
    y0: 0,
    y1: 5.2,
  }));
  for (const w of hallWalls('museum5'))
    for (const win of wallWindows('museum5', w)) {
      const u = win.u - (w.axis === 'x' ? o.x : o.z);
      out.push({
        name: `window (${w.side})`,
        wall: w.side,
        u0: u - win.w / 2,
        u1: u + win.w / 2,
        y0: win.sill,
        y1: win.head,
      });
    }
  return out;
}

/** The safety layer's fittings on the walls (`museum-safety.ts`), each taken as 0.3 m square. */
function fittings(): OnWall[] {
  const o = hallOrigin('museum5');
  const out: OnWall[] = [];
  for (const f of safetyLayer('museum5')) {
    const x = f.x - o.x;
    const z = f.z - o.z;
    const wall: GalleryWall | null =
      Math.abs(z - WALL.north) < 0.1
        ? 'north'
        : Math.abs(z - WALL.south) < 0.1
          ? 'south'
          : Math.abs(x - WALL.west) < 0.1
            ? 'west'
            : Math.abs(x - WALL.east) < 0.1
              ? 'east'
              : null;
    if (!wall || f.y === 0) continue;
    const u = along(wall, x, z);
    out.push({
      name: f.kind,
      wall,
      u0: u - 0.15,
      u1: u + 0.15,
      y0: f.y - 0.15,
      y1: f.y + 0.15,
    });
  }
  return out;
}

const overlap = (a: OnWall, b: OnWall, margin: number) =>
  a.wall === b.wall &&
  a.u0 < b.u1 + margin &&
  b.u0 < a.u1 + margin &&
  a.y0 < b.y1 + margin &&
  b.y0 < a.y1 + margin;

describe('Hall 5’s walls', () => {
  it('hangs nothing over a doorway or a window, with 0.25 m to spare', () => {
    for (const item of wallItems())
      for (const gap of openings())
        expect(overlap(item, gap, 0.25), `${item.name} over ${gap.name}`).toBe(
          false,
        );
  });

  it('hangs nothing over a fitting of the safety layer', () => {
    for (const item of wallItems())
      for (const f of fittings())
        expect(overlap(item, f, 0.02), `${item.name} over ${f.name}`).toBe(
          false,
        );
  });

  it('hangs no two things over each other', () => {
    const items = wallItems();
    for (let a = 0; a < items.length; a++)
      for (let b = a + 1; b < items.length; b++)
        expect(
          overlap(items[a], items[b], 0.1),
          `${items[a].name} over ${items[b].name}`,
        ).toBe(false);
  });

  it('keeps every item on its wall, clear of the corners', () => {
    for (const item of wallItems()) {
      const half =
        item.wall === 'north' || item.wall === 'south' ? WALL.east : WALL.south;
      expect(item.u0, item.name).toBeGreaterThan(-half + 0.15);
      expect(item.u1, item.name).toBeLessThan(half - 0.15);
    }
  });

  it('carries photographs on every wall of the walk, evenly spaced', () => {
    const walls = new Set(
      [...bayPlaces(), futureBayPlace()].map((b) => b.wall),
    );
    expect([...walls].sort()).toEqual(['east', 'north', 'south', 'west']);
    expect(GALLERY_RUNS.map((r) => r.wall)).toEqual([
      'north',
      'east',
      'south',
      'west',
    ]);
    const gaps = Object.values(galleryGaps());
    const mean = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    for (const g of gaps) {
      expect(g).toBeGreaterThan(0.9);
      expect(Math.abs(g - mean)).toBeLessThan(0.25);
    }
    // Every place taken: ten decades and the future.
    expect(GALLERY_RUNS.reduce((s, r) => s + r.bays, 0)).toBe(
      bayPlaces().length + 1,
    );
  });

  it('runs the timeline rail round the walls, never across a doorway', () => {
    const runs = railRuns(hall5Openings());
    for (const run of runs)
      for (const d of hall5Openings())
        if (d.wall === run.wall)
          expect(run.to <= d.from || run.from >= d.to, run.wall).toBe(true);
    // Under the bays, clear of them.
    expect(RAIL.y + RAIL.size / 2).toBeLessThan(BAY_HANG.y - BAY_HANG.h / 2);
    // Every wall has a run.
    expect(new Set(runs.map((r) => r.wall)).size).toBe(4);
  });
});

describe('Hall 5’s poolside', () => {
  it('stands the skimmer’s lectern at the water’s edge, near the skimmer, facing into the room', () => {
    const { skimmer, water, coping } = POOLSIDE;
    const l = SKIMMER_LECTERN;
    expect(Math.hypot(l.x - skimmer.x, l.z - skimmer.z)).toBeLessThan(1.2);
    // On the deck, off the coping, within a metre of the water's edge.
    expect(l.z + 0.25).toBeLessThan(water.minZ - coping);
    expect(water.minZ - coping - l.z).toBeLessThan(1);
    // Its front faces the room (north, −z) and turns towards the skimmer.
    const front = [Math.sin(l.yaw), Math.cos(l.yaw)];
    expect(front[1]).toBeLessThan(-0.8);
    expect(front[0] * (skimmer.x - l.x)).toBeGreaterThan(0);
  });

  it('puts the RESET button beside the bin', () => {
    const { skip } = POOLSIDE;
    const d = Math.hypot(RESET_POINT.x - skip.x, RESET_POINT.z - skip.z);
    expect(d).toBeLessThan(1.2);
    expect(d).toBeGreaterThan(0.3 + 0.25);
    // Facing the bin.
    const front = [Math.sin(RESET_POINT.yaw), Math.cos(RESET_POINT.yaw)];
    expect(
      front[0] * (skip.x - RESET_POINT.x) + front[1] * (skip.z - RESET_POINT.z),
    ).toBeGreaterThan(0);
  });
});
