import { describe, expect, it } from 'vite-plus/test';
import { MAIN, plumbOlympic, scoreOlympic } from './olympic-plumbing';
import { olympicRoomPlan } from './olympic-plan';

describe('the Olympic plant room, plumbed and routed', () => {
  const plumbed = plumbOlympic();
  const room = olympicRoomPlan();
  const hx = room.halfX;
  const hz = room.halfZ;
  const run = (name: string) => plumbed.runs.find((r) => r.name === name)!;

  it('routes every line and leaves nothing unplumbed', () => {
    expect(plumbed.problems).toEqual([]);
    expect(plumbed.runs.filter((r) => r.by === 'router')).toHaveLength(10);
  });

  it('never runs acid or hypochlorite over a walkway: they stay against the south wall, where they come in', () => {
    const chemical = plumbed.runs.filter(
      (r) => r.line.startsWith('acid') || r.line.startsWith('hypo'),
    );
    expect(chemical.map((r) => r.line).sort()).toEqual([
      'acid-dose',
      'acid-supply',
      'hypo-dose',
      'hypo-supply',
    ]);
    for (const r of chemical)
      for (const p of r.points) expect(p[2], r.name).toBeGreaterThan(hz - 0.8);
  });

  it('doses onto the return main’s spool along the wall by quills on its top, and samples the water off the pump manifold before the filters', () => {
    const spool = run('Dosing spool');
    const along = spool.points.at(-1)!;
    for (const id of ['Hypochlorite dose line', 'Acid dose line']) {
      const quill = run(id).points.at(-1)!;
      expect(quill[2]).toBeCloseTo(along[2], 6);
      expect(quill[1]).toBeGreaterThan(along[1] + spool.od / 2);
    }
    // Off pump B's discharge, before the filters.
    const discharge = run('Discharge B');
    expect(run('Sample line').points[0][2]).toBeCloseTo(
      discharge.points[1][2],
      6,
    );
  });

  it('passes every gate of the scorer', () => {
    const score = scoreOlympic(plumbed);
    expect(score.gates).toEqual([]);
    expect(score.passes).toBe(true);
    expect(score.total).toBeGreaterThan(75);
  });

  it('draws the pumps’ suctions short and straight through the west wall from the balance tank', () => {
    for (const s of ['A', 'B']) {
      const r = run(`Suction ${s}`);
      expect(r.points).toHaveLength(2);
      expect(r.points[0][0]).toBeLessThan(-hx);
      // Through the wall and across the maintenance gap behind the pumps.
      expect(Math.abs(r.points[1][0] - r.points[0][0])).toBeLessThan(2);
    }
  });

  it('carries the pool’s overflow and main drain across the north-west corner, falling all the way into the balance tank hall', () => {
    for (const name of ['Pool overflow main', 'Pool main drain']) {
      const r = run(name);
      expect(r.od).toBe(MAIN);
      expect(r.points[0][2]).toBeLessThan(-hz);
      expect(r.points.at(-1)![0]).toBeLessThan(-hx);
      for (let k = 1; k < r.points.length; k++)
        expect(r.points[k][1]).toBeLessThanOrEqual(r.points[k - 1][1]);
    }
  });

  it('falls the backwash to its floor channel and on to the main plant in the south', () => {
    const drop = run('Backwash drop and floor channel');
    expect(drop.points.at(-1)![2]).toBeGreaterThan(hz);
    for (let k = 1; k < drop.points.length; k++)
      expect(drop.points[k][1]).toBeLessThanOrEqual(drop.points[k - 1][1]);
  });

  it('sends each routed line out by its wall’s role: the pool north, the main plant south, the tank west, power east', () => {
    const end = (id: string) => plumbed.runs.find((r) => r.name === id)!.points;
    expect(end('uv-to-pool').at(-1)![2]).toBeLessThan(-hz + 0.2);
    expect(end('heating-flow')[0][2]).toBeGreaterThan(hz - 0.2);
    expect(end('make-up')[0][2]).toBeGreaterThan(hz - 0.2);
    expect(end('make-up').at(-1)![0]).toBeLessThan(-hx + 0.2);
    // Power: the busbar fed through the east wall.
    expect(end('Busbar feed')[0][0]).toBeGreaterThan(hx);
  });

  it('works every valve by its solenoid from the panel, every local isolator by hand within reach, every tap-off by its pole', () => {
    for (const f of plumbed.fittings) {
      expect(f.operator).toBe(
        f.kind === 'power-isolator'
          ? 'hand'
          : f.kind === 'fused-tap-off'
            ? 'pole'
            : 'solenoid',
      );
      expect(f.reachable, f.id).toBe(true);
    }
  });

  it('feeds every machine by a short drop from the busbar ring round the walls, each drop behind a fused tap-off', () => {
    const ring = run('Busbar ring');
    expect(ring.points[0]).toEqual(ring.points.at(-1));
    for (const p of ring.points) expect(p[1]).toBeGreaterThan(5.6);
    const drops = plumbed.runs.filter(
      (r) => r.medium === 'power' && r.line.startsWith('power-'),
    );
    expect(drops.map((r) => r.line).sort()).toEqual([
      'power-generator',
      'power-panel',
      'power-pump-A',
      'power-pump-B',
      'power-uv',
    ]);
    const length = (pts: readonly (readonly number[])[]) =>
      pts
        .slice(1)
        .reduce(
          (a, q, k) =>
            a +
            Math.hypot(q[0] - pts[k][0], q[1] - pts[k][1], q[2] - pts[k][2]),
          0,
        );
    for (const d of drops) {
      expect(length(d.points), d.line).toBeLessThan(11);
      expect(
        plumbed.fittings.some(
          (f) => f.kind === 'fused-tap-off' && f.line === d.line,
        ),
        d.line,
      ).toBe(true);
    }
  });
});
