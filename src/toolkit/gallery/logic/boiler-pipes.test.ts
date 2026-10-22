import { describe, expect, it } from 'vite-plus/test';
import { layoutRoom } from './room-equipment';
import {
  BOILER_ROOF,
  boilerHousePipework,
  pipeObstacles,
  REACH,
} from './room-pipes';
import type { PipeRun } from './room-pipes';

const { runs, tees } = boilerHousePipework();
const layout = layoutRoom('boiler_house')!;
const cascades = layout.placed.filter((p) =>
  p.item.key.startsWith('boiler-cascade'),
);

/** A pipe's outside radius, its lagging included. */
const pad = (r: PipeRun) => r.od / 2 + (r.kind === 'lagged-heating' ? 0.04 : 0);
/** Each straight length of a run, as a box its pipe's thickness round it. */
const boxes = (r: PipeRun) =>
  r.points.slice(1).map((b, i) => {
    const a = r.points[i];
    return [0, 1, 2].map((k) => [
      Math.min(a[k], b[k]) - pad(r),
      Math.max(a[k], b[k]) + pad(r),
    ]);
  });
const overlap = (p: number[][], q: number[][]) =>
  [0, 1, 2].every((k) => p[k][0] < q[k][1] - 1e-6 && q[k][0] < p[k][1] - 1e-6);

describe('the boiler house’s flues and gas', () => {
  it('runs square', () => {
    for (const r of runs)
      for (let i = 1; i < r.points.length; i++) {
        const moved = [0, 1, 2].filter(
          (k) => Math.abs(r.points[i][k] - r.points[i - 1][k]) > 1e-9,
        );
        expect(moved.length, r.name).toBeLessThanOrEqual(1);
      }
  });

  it('gives each cascade one flue, straight up through the roof', () => {
    const stacks = runs.filter((r) => r.name.endsWith('flue stack'));
    expect(stacks).toHaveLength(cascades.length);
    for (const s of stacks) {
      const [a, b] = s.points;
      expect(a[0]).toBe(b[0]);
      expect(a[2]).toBe(b[2]);
      expect(b[1], s.name).toBe(BOILER_ROOF);
      expect(s.through[0]?.normal).toEqual([0, 1, 0]);
    }
  });

  it('isolates every boiler’s gas with a valve on its own drop, within reach', () => {
    const drops = runs.filter((r) => r.name.endsWith('gas drop'));
    expect(drops).toHaveLength(cascades.length * 2);
    for (const d of drops) {
      expect(d.valves).toHaveLength(1);
      expect(d.valves[0].style).toBe('gas-ball');
      expect(d.valves[0].at[1], d.name).toBeLessThanOrEqual(REACH);
    }
  });

  it('fits a tee wherever a branch leaves the gas header or a flue stack leaves its collector', () => {
    expect(tees.filter((t) => t.name.endsWith('gas header tee'))).toHaveLength(
      cascades.length * 2,
    );
    expect(tees.filter((t) => t.name.endsWith('flue tee'))).toHaveLength(
      cascades.length,
    );
  });

  it('crosses no other run but where they join', () => {
    for (const r of runs)
      for (const q of runs) {
        // Runs meet where they join, or where both join a third (the
        // two connectors of a flue at its stack's tee).
        const shared = r.joins.some(
          (j) => q.joins.includes(j) && runs.some((x) => x.name === j),
        );
        if (
          r === q ||
          shared ||
          r.joins.includes(q.name) ||
          q.joins.includes(r.name)
        )
          continue;
        const clash = boxes(r).some((p) => boxes(q).some((b) => overlap(p, b)));
        expect(clash, `${r.name} meets ${q.name}`).toBe(false);
      }
  });

  it('keeps everything overhead, but where it comes down to a machine', () => {
    // The flue spigots and gas cocks stand on the boilers' tops, the gas
    // train's outlet on its frame, and the heating comes down to the
    // header, the circulator and the calorifier, beside them.
    const machines = layout.placed.map((p) => p.footprint);
    for (const o of pipeObstacles(runs.filter((r) => r.name !== 'Gas service')))
      expect(
        machines.some(
          (m) =>
            o.minX >= m.minX - 0.8 &&
            o.maxX <= m.maxX + 0.8 &&
            o.minZ >= m.minZ - 0.8 &&
            o.maxZ <= m.maxZ + 0.8,
        ),
        JSON.stringify(o),
      ).toBe(true);
  });
});
