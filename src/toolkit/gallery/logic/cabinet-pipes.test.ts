import {
  POWER_ISOLATOR,
  glandTop,
} from '../../components/industrial-control/logic/enclosures';
import { describe, expect, it } from 'vite-plus/test';
import {
  cabinetBodyIn,
  cabinetGully,
  cabinetIsolator,
  cabinetPipes,
  cabinetPorts,
} from './cabinet-pipes';
import type { CabinetRun, Vec3 } from './cabinet-pipes';
import { layoutRoom } from './room-equipment';

/** Every straight length of a run, as a box (its pipe's thickness round it). */
const lengths = (r: CabinetRun) =>
  r.points.slice(1).map((b, i) => {
    const a = r.points[i];
    const pad = r.od / 2 + (r.kind === 'lagged-heating' ? 0.04 : 0);
    return {
      a,
      b,
      min: [0, 1, 2].map((k) => Math.min(a[k], b[k]) - pad) as unknown as Vec3,
      max: [0, 1, 2].map((k) => Math.max(a[k], b[k]) + pad) as unknown as Vec3,
    };
  });
const meet = (p: { min: Vec3; max: Vec3 }, q: { min: Vec3; max: Vec3 }) =>
  [0, 1, 2].every((k) => p.min[k] < q.max[k] && p.max[k] > q.min[k]);
const near = (a: Vec3, b: Vec3) =>
  [0, 1, 2].every((k) => Math.abs(a[k] - b[k]) < 1e-6);

describe.each([
  ['plant_pool_03', true],
  ['plant_pool_04', false],
] as const)('%s’s services', (room, jets) => {
  const runs = cabinetPipes(room);
  const layout = layoutRoom(room)!;
  const h = layout.box.d / 2;
  const cabinet = layout.placed.find((p) => p.item.key.endsWith('-pack'))!;
  const named = (name: string) => runs.find((r) => r.name === name)!;

  it('connects every one of the cabinet’s ports: water, heating, drain and electricity', () => {
    const ports = cabinetPorts(jets);
    expect(ports.length).toBe(jets ? 9 : 6);
    // Each port's run, and the supply to the isolator besides; and in the
    // footbath's room its make-up main, passing through.
    expect(runs.length).toBe(
      ports.length + 1 + (room === 'plant_pool_04' ? 1 : 0),
    );
    for (const kind of [
      'pool water',
      'heating flow',
      'heating return',
      'drainage',
      'electrical',
    ])
      expect(
        runs.some((r) => r.service === kind),
        kind,
      ).toBe(true);
  });

  it('runs square', () => {
    for (const r of runs)
      for (const { a, b } of lengths(r))
        expect(
          [0, 1, 2].filter((k) => Math.abs(a[k] - b[k]) > 1e-9).length,
          r.name,
        ).toBeLessThanOrEqual(1);
  });

  it('takes the spa’s water out north, and the heating and the supply in from the south, each through the wall in its fitting', () => {
    for (const r of runs) {
      const end = r.points[r.points.length - 1];
      const out = r.service === 'pool water' || r.service === 'air';
      const south =
        r.service.startsWith('heating') || r.name === 'Supply to the isolator';
      if (!out && !south) continue;
      // Through the wall to its outer face, 0.2 m beyond the inner.
      expect(end[2], r.name).toBeCloseTo(out ? -(h + 0.2) : h + 0.2);
      expect(r.through.length, r.name).toBe(1);
      const plastic = r.kind === 'pvc-pressure' || r.kind === 'pvc-drain';
      expect(r.through[0].kind, r.name).toBe(
        plastic ? 'fire-collar' : 'sleeve',
      );
    }
  });

  it('lags the heating', () => {
    for (const r of runs.filter((r) => r.service.startsWith('heating')))
      expect(r.kind).toBe('lagged-heating');
  });

  it('drops the drain into its tundish over a floor gully', () => {
    const drain = runs.find((r) => r.service === 'drainage')!;
    const end = drain.points[drain.points.length - 1];
    const gully = cabinetGully(room)!;
    expect(end[0]).toBeCloseTo(gully[0]);
    expect(end[2]).toBeCloseTo(gully[2]);
    expect(end[1]).toBeLessThan(0.25);
  });

  it('feeds the cabinet through an isolator on the wall at its left', () => {
    const iso = cabinetIsolator(room)!;
    // On the wall the cabinet backs onto, beyond its left end as you face it.
    const left = (x: number, z: number) => {
      const c = Math.cos(cabinet.yaw);
      const s = Math.sin(cabinet.yaw);
      // Back into the cabinet's frame.
      const dx = x - cabinet.x;
      const dz = z - cabinet.z;
      return dx * c - dz * s;
    };
    expect(left(iso.x, iso.z)).toBeLessThan(-cabinet.item.w / 2);
    // In the room, on a wall's face.
    const half = layout.box.w / 2;
    expect(Math.abs(iso.x)).toBeLessThanOrEqual(half + 1e-6);
    expect(Math.abs(iso.z)).toBeLessThanOrEqual(half + 1e-6);
    expect(
      Math.abs(Math.abs(iso.x) - half) < 1e-6 ||
        Math.abs(Math.abs(iso.z) - half) < 1e-6,
    ).toBe(true);
    // Within reach.
    expect(iso.y).toBeGreaterThan(1.2);
    expect(iso.y).toBeLessThan(1.8);
    const supply = named('Supply to the isolator');
    const feed = named('Isolator to the cabinet');
    expect(near(supply.points[0], iso.supplyIn)).toBe(true);
    expect(near(feed.points[0], iso.feedOut)).toBe(true);
    // Both on its glands' tops, so no gap between conduit and box; as far
    // apart as its glands.
    for (const at of [iso.supplyIn, iso.feedOut])
      expect(at[1]).toBeCloseTo(iso.y + glandTop(POWER_ISOLATOR), 6);
    const [g0, g1] = POWER_ISOLATOR.glands.x;
    expect(
      Math.hypot(
        iso.supplyIn[0] - iso.feedOut[0],
        iso.supplyIn[2] - iso.feedOut[2],
      ),
    ).toBeCloseTo(g1 - g0, 6);
    const gland = cabinetPorts(jets).find((p) => p.to === 'isolator')!;
    const end = feed.points[feed.points.length - 1];
    expect(end[1]).toBeCloseTo(gland.at[1]);
  });

  it('crosses no other run', () => {
    for (const r of runs)
      for (const q of runs) {
        if (q === r) continue;
        for (const p of lengths(r))
          for (const o of lengths(q))
            expect(meet(p, o), `${r.name} meets ${q.name}`).toBe(false);
      }
  });

  it('passes over the cabinet, not through it', () => {
    const body = cabinetBodyIn(cabinet, jets);
    for (const r of runs) {
      // A stub's own first length, out of its panel, and the feed's last,
      // down into its gland on the roof, are the cabinet's own.
      const all = lengths(r);
      const checked =
        r.name === 'Isolator to the cabinet' ? all.slice(0, -1) : all.slice(1);
      for (const p of checked) expect(meet(p, body), r.name).toBe(false);
    }
  });

  it('passes through no doorway below the doors’ head', () => {
    for (const r of runs)
      for (const { a, b } of lengths(r))
        for (const door of layout.box.keepClear) {
          const inPlan =
            Math.max(a[0], b[0]) > door.minX &&
            Math.min(a[0], b[0]) < door.maxX &&
            Math.max(a[2], b[2]) > door.minZ &&
            Math.min(a[2], b[2]) < door.maxZ;
          if (!inPlan) continue;
          expect(Math.min(a[1], b[1]) - r.od / 2, r.name).toBeGreaterThan(2.6);
        }
  });

  it('keeps every run’s level lengths over head height', () => {
    for (const r of runs)
      for (const { a, b } of lengths(r)) {
        if (Math.abs(a[1] - b[1]) > 1e-9) continue;
        // But for a stub's first length, out of its panel at its port.
        if (near(a, r.points[0])) continue;
        expect(a[1], r.name).toBeGreaterThanOrEqual(2.2);
      }
  });
});
