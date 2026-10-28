import { describe, expect, it } from 'vite-plus/test';
import { loadingBayLines } from './loading-bay-plumbing';
import { SHELL_ROOMS } from './shell-rooms';
import { pipeClashes } from '../../components/core/logic/pipe-route';

/**
 * The loading bay's chemical lines on the plumber (prompt 085, gap 2):
 * routed from its schematic between their sleeves, never across the
 * lorries' bays below the shutters' boxes, each fill port's valves in its
 * riser within reach.
 */
describe('the loading bay’s chemical lines, plumbed', () => {
  const { runs, problems } = loadingBayLines();
  const bay = SHELL_ROOMS.loading_bay;

  it('lays every chemical link with no problems', () => {
    expect(problems).toEqual([]);
    expect(runs.map((r) => r.name).sort()).toEqual([
      'Acid delivery line',
      'Acid main through the bay',
      'Hypochlorite delivery line',
      'Hypochlorite main through the bay',
    ]);
  });

  it('crosses no lorry’s bay below its shutter’s box, and no line another', () => {
    const lorries = (bay.apertures ?? []).filter((a) => !('door' in a));
    for (const r of runs)
      for (let i = 1; i < r.points.length; i++) {
        const [a, b] = [r.points[i - 1], r.points[i]];
        for (const l of lorries) {
          const lo = Math.min(a[0], b[0]);
          const hi = Math.max(a[0], b[0]);
          if (hi < l.at - l.w / 2 || lo > l.at + l.w / 2) continue;
          // Over a lorry's body (the dock's north half), above its opening;
          // anywhere, clear of its tail lift and the pallets.
          const north = Math.min(a[2], b[2]) < -0.5;
          expect(Math.min(a[1], b[1]), r.name).toBeGreaterThan(
            north ? l.h : 3.5,
          );
        }
      }
    expect(
      pipeClashes(
        runs.map((r) => ({
          name: r.name,
          points: r.points,
          od: r.od,
          joint: 'socket' as const,
        })),
      ),
    ).toEqual([]);
  });

  it('sets each fill port’s isolating and non-return valves in its line, within reach', () => {
    for (const name of ['Acid delivery line', 'Hypochlorite delivery line']) {
      const r = runs.find((x) => x.name === name)!;
      expect(r.valves, name).toHaveLength(1);
      expect(r.checks, name).toHaveLength(1);
      expect(r.valves[0].at[1], name).toBeLessThan(2.2);
    }
  });

  it('leaves each main through the corridor wall where the corridor’s services take it on', () => {
    for (const [name, x] of [
      ['Hypochlorite main through the bay', 1.6],
      ['Acid main through the bay', -1.6],
    ] as const) {
      const end = runs.find((r) => r.name === name)!.points.at(-1)!;
      expect(end[0]).toBeCloseTo(x, 6);
      expect(end[1]).toBeCloseTo(3.6, 6);
      expect(end[2]).toBeGreaterThan(bay.d / 2);
    }
  });
});
