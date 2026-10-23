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
    expect(plumbed.runs.filter((r) => r.by === 'router')).toHaveLength(16);
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
      expect(Math.abs(r.points[1][0] - r.points[0][0])).toBeLessThan(1);
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
    for (const id of [
      'power-panel',
      'power-pump-A',
      'power-pump-B',
      'power-uv',
      'power-generator',
    ])
      expect(end(id)[0][0]).toBeGreaterThan(hx - 0.2);
  });

  it('works every valve by its solenoid from the panel, and every power isolator by hand within reach', () => {
    for (const f of plumbed.fittings) {
      expect(f.operator).toBe(
        f.kind === 'power-isolator' ? 'hand' : 'solenoid',
      );
      expect(f.reachable, f.id).toBe(true);
    }
  });
});
