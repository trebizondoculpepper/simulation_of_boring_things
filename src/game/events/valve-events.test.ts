import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../world';
import type { World, WorldAction } from '../world';
import type { GameEvent } from './game-event';
import { formatEvent } from './game-event';
import { actionEvents } from './describe-action';
import { collectEvents, diffWorld } from './event-sources';
import { allDue } from '../plant/wash-o-tron.test-support';

/** A world and its log, as the world store keeps them: actions and steps. */
function logged(start: World = newWorld()) {
  let world = start;
  const log: GameEvent[] = [];
  return {
    get world() {
      return world;
    },
    log,
    dispatch(action: WorldAction, by: 'you' | 'console' = 'you') {
      const before = world;
      world = applyAction(before, action);
      log.push(...actionEvents(before, action, world, by));
    },
    run(seconds: number, step = 0.1) {
      world = advance(world, seconds, step, (before, after) =>
        collectEvents(before, after, undefined, log),
      );
    },
  };
}

const about = (log: readonly GameEvent[], tag: string) =>
  log.filter((e) => e.subject === tag);

describe('the valve log', () => {
  it('logs a hand valve opened and closed: two lines, its tag, its name, who', () => {
    const t = logged();
    t.dispatch({ type: 'plant/valve', id: 'PL2-F1-V3', open: true });
    t.dispatch({ type: 'plant/valve', id: 'PL2-F1-V3', open: false });
    expect(t.log).toHaveLength(2);
    expect(t.log.map(formatEvent)).toEqual([
      '00:00:00  PL2-F1-V3     F1 backwash in valve: OPENED (by you)',
      '00:00:00  PL2-F1-V3     F1 backwash in valve: CLOSED (by you)',
    ]);
    expect(t.log.every((e) => e.kind === 'plant')).toBe(true);
  });

  it('keeps the action’s line when the valve was already so', () => {
    const t = logged();
    t.dispatch({ type: 'plant/valve', id: 'PL2-F1-V3', open: false });
    expect(t.log).toHaveLength(1);
    expect(t.log[0].text).toMatch(/no change$/);
  });

  it('says the console worked a valve, when it did', () => {
    const t = logged();
    t.dispatch({ type: 'plant/valve', id: 'WH-T1-DV1', open: true }, 'console');
    expect(t.log).toEqual([
      expect.objectContaining({
        subject: 'WH-T1-DV1',
        text: 'Break tank drain valve: OPENED',
        by: 'console',
      }),
    ]);
  });

  it('logs nothing when nothing changes', () => {
    const w = newWorld();
    expect(diffWorld(w, w)).toEqual([]);
    const t = logged();
    t.run(30);
    expect(t.log).toEqual([]);
  });

  it('logs a Wash-O-Tron state change’s valves, attributed to it', () => {
    const t = logged();
    t.dispatch({
      type: 'wash-o-tron',
      action: { act: 'mode', filter: 1, mode: 'backwash' },
    });
    t.run(40, 1);
    const valves = t.log.filter((e) => e.subject.startsWith('PL2-F2-'));
    // Its service path shut (V1, V2), its backwash path opened (V3, V4).
    expect(valves.map((e) => `${e.subject} ${e.text.split(': ')[1]}`)).toEqual(
      expect.arrayContaining([
        'PL2-F2-V1 CLOSED',
        'PL2-F2-V2 CLOSED',
        'PL2-F2-V3 OPENED',
        'PL2-F2-V4 OPENED',
      ]),
    );
    expect(valves.every((e) => /Wash-O-Tron/.test(e.by ?? ''))).toBe(true);
    // Each valve said once for each change, not each step.
    expect(about(valves, 'PL2-F2-V3')).toHaveLength(1);
  });

  it('says an automatic wash is the Wash-O-Tron’s AUTO', () => {
    const t = logged(allDue(newWorld()));
    t.run(60, 1);
    const n = t.world.washOTron.washing;
    expect(n).not.toBe(null);
    const valves = t.log.filter((e) => e.subject.startsWith(`PL2-F${n! + 1}-`));
    expect(valves.length).toBeGreaterThan(0);
    expect(valves.every((e) => e.by === 'AUTO, Wash-O-Tron wash')).toBe(true);
  });

  it('logs an actuated valve once as it starts and once as it arrives, not each step', () => {
    const t = logged();
    t.dispatch({ type: 'plant/valve', id: 'PL1-F1-IV1', open: false });
    t.run(60, 0.05);
    expect(about(t.log, 'PL1-F1-IV1').map((e) => e.text)).toEqual([
      'F1 inlet valve: SHUT commanded',
      'F1 inlet valve: closing',
      'F1 inlet valve: CLOSED',
    ]);
    expect(about(t.log, 'PL1-F1-IV1')[0].by).toBe('you');
  });

  it('says an actuated valve sprung shut when its room lost power', () => {
    const t = logged();
    t.dispatch({ type: 'plant/feeder', room: 'plant_pool_01', on: false });
    t.run(60, 0.05);
    const inlet = about(t.log, 'PL1-F1-IV1');
    expect(inlet.map((e) => e.text)).toEqual([
      'F1 inlet valve: closing',
      'F1 inlet valve: CLOSED',
    ]);
    expect(
      inlet.every((e) => e.by === 'spring return, actuator unpowered'),
    ).toBe(true);
  });
});
