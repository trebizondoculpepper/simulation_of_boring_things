import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../world';
import type { World } from '../world';
import { runOut } from '../world.test-support';
import { trioAlarms, trioSignals } from './aqualis-world';
import type { TrioAction, TrioPool } from './aqualis-world';
import type { DosingPumpAction } from './dosing-pumps';

/**
 * The Trios on the real world, closed loop (mission 114, step 4): days of
 * each pool with its bathers, against the old controller's numbers; a
 * pump in its own manual mode, a dry day tank, a gas-lock, the knob at
 * OFF, and a crash holding its outputs. Slow: each runs hours to days of
 * the world.
 */

const act = (w: World, pool: TrioPool, action: TrioAction) =>
  applyAction(w, { type: 'aqualis', pool, action });
const pump = (w: World, action: DosingPumpAction) =>
  applyAction(w, { type: 'dosing-pump', action });

/**
 * The old controller's (`water-treatment.ts` `stepControl`) over days 2
 * and 3 of a new world, at the far side of each pool, sampled every ten
 * minutes: measured on main at b087bf6d, before the Trios took over.
 */
const OLD = {
  pool_01: { cl: 1.445, clMin: 1.216, clMax: 1.638, ph: 7.321 },
  pool_02: { cl: 1.048, clMin: 0.733, clMax: 1.405, ph: 7.358 },
} as const;

/** The world run from new, a step of 10 s, each pool's far side sampled every ten minutes after the first day. */
function days(n: number) {
  let w = newWorld();
  const seen = {
    pool_01: { cl: [] as number[], ph: [] as number[] },
    pool_02: { cl: [] as number[], ph: [] as number[] },
  };
  for (let t = 0; t < n * 86400; t += 600) {
    w = advance(w, 600, 10);
    if (t < 86400) continue;
    for (const id of ['pool_01', 'pool_02'] as const) {
      seen[id].cl.push(w.pools[id].freeChlorine);
      seen[id].ph.push(w.pools[id].ph);
    }
  }
  return { w, seen };
}
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe('the Trios in AUTO, three days with bathers', () => {
  const { w, seen } = days(3);

  it('hold the Lounge’s chlorine and pH about as the old controller did', () => {
    const { cl, ph } = seen.pool_01;
    expect(Math.abs(mean(cl) - OLD.pool_01.cl)).toBeLessThan(0.1);
    expect(Math.min(...cl)).toBeGreaterThan(1.0);
    expect(Math.max(...cl)).toBeLessThan(2.0);
    expect(Math.abs(mean(ph) - OLD.pool_01.ph)).toBeLessThan(0.06);
    expect(Math.min(...ph)).toBeGreaterThan(7.2);
    expect(Math.max(...ph)).toBeLessThan(7.45);
  });

  it('hold the Olympic’s as well as its undersized hypochlorite pump lets it', () => {
    const { cl, ph } = seen.pool_02;
    expect(Math.abs(mean(cl) - OLD.pool_02.cl)).toBeLessThan(0.1);
    expect(Math.min(...cl)).toBeGreaterThan(0.6);
    expect(Math.abs(mean(ph) - OLD.pool_02.ph)).toBeLessThan(0.05);
    expect(Math.min(...ph)).toBeGreaterThan(7.2);
    expect(Math.max(...ph)).toBeLessThan(7.45);
  });

  it('keep every channel but CO₂ online, the CO₂ unconnected, and no alarm but what the water calls for', () => {
    for (const id of ['pool_01', 'pool_02'] as const) {
      const t = w.aqualis[id];
      expect(t.channels.hypochlorite.status.kind).toBe('online');
      expect(t.channels.acid.status.kind).toBe('online');
      expect(t.channels.co2.status.kind).toBe('unconnected');
      const on = trioAlarms(t).map((a) => a.id);
      expect(on).not.toContain('dosing-offline');
      expect(on).not.toContain('sample-flow-low');
      expect(on).not.toContain('controller-fault');
    }
  });
});

describe('a Trio’s channels going offline in the world', () => {
  // A morning's settling first.
  const settled = advance(newWorld(), 8 * 3600, 10);

  it('shows a pump put into its own manual mode as OFFLINE (manual), and the water drifts', () => {
    let w = pump(settled, {
      act: 'key',
      pool: 'pool_01',
      chemical: 'hypochlorite',
      key: 'mode',
    });
    w = advance(w, 30, 10);
    const t = w.aqualis.pool_01;
    expect(t.channels.hypochlorite.status).toEqual({
      kind: 'offline',
      reason: 'manual',
      fault: null,
    });
    expect(trioAlarms(t).map((a) => a.id)).toContain('dosing-offline');
    // Its own rate, half its most, whatever the Trio asks: the chlorine climbs.
    const before = w.pools.pool_01.freeChlorine;
    w = advance(w, 6 * 3600, 10);
    expect(w.dosingPumps.pool_01.hypochlorite.meanLh).toBeCloseTo(1.05, 1);
    expect(w.pools.pool_01.freeChlorine).toBeGreaterThan(before + 0.5);
    expect(w.aqualis.pool_01.channels.hypochlorite.status.kind).toBe('offline');
  });

  it('shows a dry day tank as OFFLINE (fault: tank empty), and the chlorine falls', () => {
    let w = runOut(settled, 'hypochlorite');
    w = advance(w, 30, 10);
    for (const id of ['pool_01', 'pool_02'] as const)
      expect(w.aqualis[id].channels.hypochlorite.status, id).toEqual({
        kind: 'offline',
        reason: 'fault',
        fault: 'tank empty',
      });
    const before = w.pools.pool_01.freeChlorine;
    w = advance(w, 3 * 3600, 10);
    expect(w.pools.pool_01.freeChlorine).toBeLessThan(before - 0.2);
    expect(w.dosingPumps.pool_01.hypochlorite.meanLh).toBeLessThan(1e-6);
  });

  it('shows a gas-locked pump as OFFLINE (fault: flow monitor tripped) until acknowledged', () => {
    let w = pump(settled, {
      act: 'gas',
      pool: 'pool_02',
      chemical: 'hypochlorite',
      ml: 50,
    });
    w = advance(w, 120, 10);
    expect(w.aqualis.pool_02.channels.hypochlorite.status).toEqual({
      kind: 'offline',
      reason: 'fault',
      fault: 'flow monitor tripped',
    });
    // Its demand kept while it is offline.
    expect(w.aqualis.pool_02.channels.hypochlorite.demand).toBeGreaterThan(0);
    w = pump(w, {
      act: 'bleed',
      pool: 'pool_02',
      chemical: 'hypochlorite',
      open: true,
    });
    // Primed again as its manual says: acknowledged with its bleed open,
    // its strokes clearing the gas to the return, then its bleed shut.
    w = pump(w, {
      act: 'acknowledge',
      pool: 'pool_02',
      chemical: 'hypochlorite',
    });
    w = advance(w, 120, 10);
    w = pump(w, {
      act: 'bleed',
      pool: 'pool_02',
      chemical: 'hypochlorite',
      open: false,
    });
    w = advance(w, 120, 10);
    expect(w.dosingPumps.pool_02.hypochlorite.fault).toBeNull();
    expect(w.aqualis.pool_02.channels.hypochlorite.status).toEqual({
      kind: 'online',
    });
  });

  it('shows a pump that stopped delivering as OFFLINE (not delivering): its day tank’s outlet valve shut', () => {
    // The Olympic's hypochlorite is asked for most of its most, so the Trio watches it.
    let w = applyAction(settled, {
      type: 'plant/valve',
      id: 'PL2.hypochlorite-day.out.iso',
      open: false,
    });
    w = advance(w, 10 * 60, 10);
    expect(w.aqualis.pool_02.channels.hypochlorite.status).toEqual({
      kind: 'offline',
      reason: 'not-delivering',
      fault: null,
    });
  });
});

describe('a Trio stopping or crashing in the world', () => {
  const settled = advance(newWorld(), 8 * 3600, 10);

  it('at OFF doses nothing: its pumps stand, and the chlorine falls', () => {
    let w = act(settled, 'pool_01', { act: 'selector', selector: 'off' });
    w = advance(w, 60, 10);
    const delivered = {
      hypochlorite: w.dosingPumps.pool_01.hypochlorite.deliveredL,
      acid: w.dosingPumps.pool_01.acid.deliveredL,
    };
    const before = w.pools.pool_01.freeChlorine;
    w = advance(w, 4 * 3600, 10);
    expect(w.dosingPumps.pool_01.hypochlorite.deliveredL).toBe(
      delivered.hypochlorite,
    );
    expect(w.dosingPumps.pool_01.acid.deliveredL).toBe(delivered.acid);
    expect(w.pools.pool_01.freeChlorine).toBeLessThan(before - 0.2);
    expect(trioAlarms(w.aqualis.pool_01).map((a) => a.id)).not.toContain(
      'dosing-offline',
    );
  });

  it('crashed with its outputs held drives its pump at the held rate, whatever the water', () => {
    // HAND at 80 %, then a blue screen with the watchdog failing.
    let w = act(settled, 'pool_01', { act: 'selector', selector: 'hand' });
    w = act(w, 'pool_01', {
      act: 'hand',
      channel: 'hypochlorite',
      demand: 0.8,
    });
    w = advance(w, 20, 10);
    w = act(w, 'pool_01', { act: 'watchdog', works: false });
    w = act(w, 'pool_01', { act: 'crash', kind: 'stop', seed: 9 });
    expect(w.aqualis.pool_01.os.phase).toBe('crashed');
    const held = trioSignals(w.aqualis.pool_01).hypochlorite;
    expect(held).toEqual({ release: true, demand: 0.8 });
    const before = w.pools.pool_01.freeChlorine;
    w = advance(w, 4 * 3600, 10);
    // A blue screen that hangs (seed 9) or reboots: either way the pump was driven at 80 %.
    if (w.aqualis.pool_01.os.phase === 'crashed') {
      expect(trioSignals(w.aqualis.pool_01).hypochlorite).toEqual(held);
      expect(w.dosingPumps.pool_01.hypochlorite.meanLh).toBeCloseTo(
        0.8 * 2.1,
        1,
      );
      expect(trioAlarms(w.aqualis.pool_01)).toEqual([]);
    }
    expect(w.pools.pool_01.freeChlorine).toBeGreaterThan(before + 0.5);
  });
});
