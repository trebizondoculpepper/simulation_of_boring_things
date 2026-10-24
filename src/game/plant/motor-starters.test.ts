import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../world';
import type { World } from '../world';
import { deserialiseWorld, serialiseWorld } from '../save';
import type { MotorTag, StarterAction } from './motor-starters';

const act = (w: World, tag: MotorTag, action: StarterAction) =>
  applyAction(w, { type: 'motor/starter', tag, action });
const running = (w: World, tag: MotorTag) => w.motors.starters[tag].running;
const settled = advance(newWorld(), 60, 1);

describe('the motors’ starters', () => {
  it('run each pool’s duty pump in AUTO, the standby waiting', () => {
    expect(running(settled, 'P-101A')).toBe(true);
    expect(running(settled, 'P-101B')).toBe(false);
    expect(running(settled, 'P-201A')).toBe(true);
    expect(running(settled, 'P-201B')).toBe(false);
  });

  it('start the standby when the duty is turned to OFF, and stop the pool only with both off', () => {
    let w = act(settled, 'P-101A', { act: 'mode', mode: 'off' });
    w = advance(w, 30, 1);
    expect(running(w, 'P-101A')).toBe(false);
    expect(running(w, 'P-101B')).toBe(true);
    expect(w.pools.pool_02.flow).toBeGreaterThan(400);
    w = advance(act(w, 'P-101B', { act: 'mode', mode: 'off' }), 120, 1);
    expect(running(w, 'P-101B')).toBe(false);
    expect(w.pools.pool_02.flow).toBeLessThan(10);
  });

  it('take START and STOP in AUTO, and forget them when the selector is turned', () => {
    let w = advance(act(settled, 'P-201A', { act: 'stop' }), 5, 1);
    expect(running(w, 'P-201A')).toBe(false);
    expect(running(w, 'P-201B')).toBe(true);
    w = advance(act(w, 'P-201A', { act: 'start' }), 5, 1);
    expect(running(w, 'P-201A')).toBe(true);
    expect(running(w, 'P-201B')).toBe(false);
    w = advance(act(w, 'P-201A', { act: 'stop' }), 5, 1);
    w = act(w, 'P-201A', { act: 'mode', mode: 'hand' });
    w = advance(act(w, 'P-201A', { act: 'mode', mode: 'auto' }), 5, 1);
    expect(running(w, 'P-201A')).toBe(true);
  });

  it('run in HAND and ignore START and STOP there', () => {
    let w = act(settled, 'P-201B', { act: 'mode', mode: 'hand' });
    w = advance(act(w, 'P-201B', { act: 'stop' }), 5, 1);
    expect(running(w, 'P-201B')).toBe(true);
  });

  it('stop with their local isolator, their room’s power and their panel’s emergency stop', () => {
    const isolated = advance(
      applyAction(settled, {
        type: 'plant/isolator',
        name: 'P-101A isolator',
        on: false,
      }),
      5,
      1,
    );
    expect(running(isolated, 'P-101A')).toBe(false);
    expect(running(isolated, 'P-101B')).toBe(true);
    const dark = advance(
      applyAction(settled, {
        type: 'plant/feeder',
        room: 'plant_pool_01',
        on: false,
      }),
      5,
      1,
    );
    expect(running(dark, 'P-201A') || running(dark, 'P-201B')).toBe(false);
    const struck = advance(
      applyAction(settled, {
        type: 'motor/stop',
        pool: 'pool_02',
        stopped: true,
      }),
      5,
      1,
    );
    expect(running(struck, 'P-101A') || running(struck, 'P-101B')).toBe(false);
    expect(running(struck, 'P-201A')).toBe(true);
  });

  it('trip on running with nothing flowing, and hold the trip until RESET', () => {
    // The lounge's filter path shut: its pumps run against shut valves.
    const shutAll = Object.keys(settled.loungeValvePositions).reduce(
      (w, id) => ({
        ...w,
        loungeValvePositions: { ...w.loungeValvePositions, [id]: 0 },
        installedValves: { ...w.installedValves, [id]: false },
      }),
      settled,
    );
    let w = advance(shutAll, 150, 1);
    expect(w.motors.starters['P-201A'].tripped).toBe(true);
    expect(w.motors.starters['P-201B'].tripped).toBe(true);
    // Its valves reopened, it stays off until RESET.
    w = advance(
      {
        ...w,
        loungeValvePositions: settled.loungeValvePositions,
        installedValves: settled.installedValves,
      },
      30,
      1,
    );
    expect(running(w, 'P-201A')).toBe(false);
    w = advance(act(w, 'P-201A', { act: 'reset' }), 5, 1);
    expect(running(w, 'P-201A')).toBe(true);
  });

  it('show a current: a direct-on-line motor’s inrush, then its running load', () => {
    let w = act(settled, 'P-201A', { act: 'stop' });
    w = advance(w, 10, 1);
    w = advance(act(w, 'P-201A', { act: 'start' }), 0.3, 0.1);
    expect(w.motors.starters['P-201A'].current).toBeGreaterThan(20);
    w = advance(w, 10, 1);
    expect(w.motors.starters['P-201A'].current).toBeCloseTo(0.8 * 14, 0);
  });

  it('are saved and loaded with the world', () => {
    const w = act(settled, 'P-101A', { act: 'mode', mode: 'hand' });
    const loaded = deserialiseWorld(serialiseWorld(w, 0));
    expect(loaded.ok && loaded.world.motors).toEqual(w.motors);
  });
});
