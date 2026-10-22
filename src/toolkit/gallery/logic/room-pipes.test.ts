import { describe, expect, it } from 'vite-plus/test';
import { layoutRoom } from './room-equipment';
import { machinePorts, placedPort } from './machine-ports';
import { plantRoomPlan } from './plant-rooms';
import { CEILING_ZONE, CHAIN_TO, poolPlantPipework, REACH } from './room-pipes';
import type { PipeRun, Vec3 } from './room-pipes';

/** The lagging round a heating pipe. */
const pad = (r: PipeRun) => r.od / 2 + (r.kind === 'lagged-heating' ? 0.04 : 0);

/** Each straight length of a run as a box, its pipe's thickness round it. */
const lengths = (r: PipeRun) =>
  r.points.slice(1).map((b, i) => {
    const a = r.points[i];
    return {
      a,
      b,
      min: [0, 1, 2].map((k) => Math.min(a[k], b[k]) - pad(r)),
      max: [0, 1, 2].map((k) => Math.max(a[k], b[k]) + pad(r)),
    };
  });
const meet = (
  p: { min: number[]; max: number[] },
  q: { min: number[]; max: number[] },
) =>
  [0, 1, 2].every(
    (k) => p.min[k] < q.max[k] - 1e-6 && p.max[k] > q.min[k] + 1e-6,
  );
const near = (a: Vec3, b: Vec3) =>
  [0, 1, 2].every((k) => Math.abs(a[k] - b[k]) < 1e-3);

describe.each([
  ['plant_pool_01', 'medium'],
  ['plant_pool_02', 'large'],
] as const)('%s’s pipework', (room, size) => {
  const layout = layoutRoom(room)!;
  const { runs, channels, tees } = poolPlantPipework(room);
  const plan = plantRoomPlan(size);
  const filterCount = layout.placed.filter((p) =>
    p.item.key.startsWith('sand-filter'),
  ).length;

  it('fits each filter header branch with a tee at the shared centreline', () => {
    const headers = runs.filter(
      (r) => r.name.startsWith('Filter ') && r.name.includes('header'),
    );
    expect(tees.length).toBeGreaterThan(0);
    for (const tee of tees.filter(
      (t) => / header tee$/.test(t.name) && t.name.startsWith('Filter '),
    )) {
      // The inlet header may run both ways from its junction.
      const onIt = headers.filter((r) =>
        r.name.startsWith(
          tee.name.includes('inlet')
            ? 'Filter inlet header'
            : 'Filter outlet header',
        ),
      );
      expect(onIt.length, tee.name).toBeGreaterThan(0);
      const header = onIt.find(
        (r) =>
          r.points.some((p) => near(p, tee.at)) ||
          lengths(r).some(({ a, b }) =>
            [0, 1, 2].every(
              (k) =>
                tee.at[k] >= Math.min(a[k], b[k]) - 1e-3 &&
                tee.at[k] <= Math.max(a[k], b[k]) + 1e-3,
            ),
          ),
      );
      expect(
        !!header ||
          lengths(onIt[0]).some(({ a, b }) =>
            [0, 1, 2].every(
              (k) =>
                tee.at[k] >= Math.min(a[k], b[k]) - 1e-3 &&
                tee.at[k] <= Math.max(a[k], b[k]) + 1e-3,
            ),
          ),
        tee.name,
      ).toBe(true);
      expect(
        tee.mainDirection[0] * tee.branchDirection[0] +
          tee.mainDirection[1] * tee.branchDirection[1] +
          tee.mainDirection[2] * tee.branchDirection[2],
      ).toBe(0);
    }
  });
  it('runs square', () => {
    for (const r of runs)
      for (const { a, b } of lengths(r))
        expect(
          [0, 1, 2].filter((k) => Math.abs(a[k] - b[k]) > 1e-6).length,
          r.name,
        ).toBeLessThanOrEqual(1);
  });

  it('connects every nozzle of every machine on the water’s loop, exactly at it', () => {
    const ends = runs.flatMap((r) => [
      r.points[0],
      r.points[r.points.length - 1],
    ]);
    for (const p of layout.placed) {
      if (p.item.mount === 'wall' && !machinePorts(p.item).length) continue;
      for (const port of machinePorts(p.item)) {
        const at = placedPort(p, port.name).at;
        expect(
          ends.some((e) => near(e, at)),
          `${p.item.label}: ${port.name}`,
        ).toBe(true);
      }
    }
  });

  it('meets no other run but at its tees', () => {
    for (const r of runs)
      for (const q of runs) {
        if (q === r || r.joins.includes(q.name) || q.joins.includes(r.name))
          continue;
        for (const p of lengths(r))
          for (const o of lengths(q))
            expect(meet(p, o), `${r.name} meets ${q.name}`).toBe(false);
      }
  });

  it('passes through no machine', () => {
    for (const r of runs)
      for (const [i, p] of lengths(r).entries()) {
        for (const m of layout.placed) {
          if (m.item.mount !== 'floor') continue;
          // Its own machines' nozzles: its first and last lengths touch them.
          const own = r.joins.includes(m.item.label);
          if (own && (i === 0 || i === r.points.length - 2)) continue;
          const f = m.footprint;
          const body = {
            min: [f.minX, 0, f.minZ],
            max: [f.maxX, m.item.h, f.maxZ],
          };
          expect(meet(p, body), `${r.name} through ${m.item.label}`).toBe(
            false,
          );
        }
      }
  });

  it('runs under the services ceiling, or up into it', () => {
    const top = plan.roof - plan.floor - CEILING_ZONE;
    // Every level length under it; a run may end by rising into it, on
    // out of sight to the central plant.
    for (const r of runs) {
      for (const { a, b } of lengths(r))
        if (Math.abs(a[1] - b[1]) < 1e-9)
          expect(a[1] + pad(r), r.name).toBeLessThanOrEqual(top);
      for (const p of r.points)
        expect(p[1], r.name).toBeLessThanOrEqual(top + 1e-9);
    }
  });

  it('takes only the pool’s water through the north wall, and the central services through the south', () => {
    for (const r of runs)
      for (const t of r.through) {
        if (t.at[2] < 0) expect(r.service, r.name).toBe('pool water');
        else expect(r.service, r.name).not.toBe('pool water');
        const plastic = r.kind === 'pvc-pressure' || r.kind === 'pvc-drain';
        expect(t.kind, r.name).toBe(plastic ? 'fire-collar' : 'sleeve');
      }
  });

  it('runs its floor channels clear of every machine and of the doorway', () => {
    for (const c of channels) {
      const box = {
        min: [
          Math.min(c.from[0], c.to[0]) - c.width / 2,
          0,
          Math.min(c.from[2], c.to[2]) - c.width / 2,
        ],
        max: [
          Math.max(c.from[0], c.to[0]) + c.width / 2,
          0.05,
          Math.max(c.from[2], c.to[2]) + c.width / 2,
        ],
      };
      for (const m of layout.placed.filter((p) => p.item.mount === 'floor')) {
        const f = m.footprint;
        expect(
          meet(box, { min: [f.minX, 0, f.minZ], max: [f.maxX, 1, f.maxZ] }),
          m.item.label,
        ).toBe(false);
      }
      for (const k of layout.box.keepClear)
        expect(
          meet(box, { min: [k.minX, 0, k.minZ], max: [k.maxX, 1, k.maxZ] }),
          'a doorway',
        ).toBe(false);
    }
  });

  it('gives every filter its inlet, outlet, backwash and drain valves, each worked from the floor', () => {
    const valves = runs.flatMap((r) => r.valves);
    for (let n = 1; n <= filterCount; n++)
      for (const kind of ['inlet', 'outlet', 'backwash', 'drain'])
        expect(
          valves.some((v) => v.name === `F${n} ${kind} valve`),
          `F${n} ${kind}`,
        ).toBe(true);
    // Its lever within reach, or a chain wheel's chain hanging to it.
    for (const v of valves)
      expect(
        v.operator === 'chain' ? CHAIN_TO : v.at[1],
        v.name,
      ).toBeLessThanOrEqual(REACH);
    for (const v of valves.filter((v) => v.at[1] > REACH))
      expect(v.operator, v.name).toBe('chain');
  });

  it('puts every tee where three of its runs meet: two along its main, one along its branch', () => {
    const on = (t: Vec3, r: PipeRun) =>
      r.points.some((p) => near(p, t)) ||
      lengths(r).some(({ a, b }) =>
        [0, 1, 2].every(
          (k) =>
            t[k] >= Math.min(a[k], b[k]) - 1e-3 &&
            t[k] <= Math.max(a[k], b[k]) + 1e-3,
        ),
      );
    for (const tee of tees) {
      const meeting = runs.filter((r) => on(tee.at, r));
      expect(meeting.length, tee.name).toBeGreaterThanOrEqual(2);
      expect(
        tee.mainDirection[0] * tee.branchDirection[0] +
          tee.mainDirection[1] * tee.branchDirection[1] +
          tee.mainDirection[2] * tee.branchDirection[2],
        tee.name,
      ).toBe(0);
    }
  });
});
