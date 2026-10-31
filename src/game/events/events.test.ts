import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../world';
import type { World, WorldAction } from '../world';
import {
  appendEvents,
  formatDump,
  formatEvent,
  worldClock,
} from './game-event';
import type { GameEvent } from './game-event';
import { describeAction } from './describe-action';
import { WATCHER_COUNT } from './watchers';
import { diffWorld } from './event-sources';

const line = (text: string, time = 0): GameEvent => ({
  time,
  kind: 'system',
  severity: 'info',
  subject: '',
  text,
});

describe('the event log', () => {
  it('keeps its newest lines, and no more than its limit', () => {
    let log: readonly GameEvent[] = [];
    for (let i = 0; i < 7; i++) log = appendEvents(log, [line(`l${i}`)], 5);
    expect(log.map((e) => e.text)).toEqual(['l2', 'l3', 'l4', 'l5', 'l6']);
    expect(appendEvents(log, [])).toBe(log);
  });

  it('reads as a logbook: the world clock, the subject, the text, who', () => {
    expect(worldClock(0)).toBe('00:00:00');
    expect(worldClock(3725.9)).toBe('01:02:05');
    expect(worldClock(90000)).toBe('25:00:00');
    expect(
      formatEvent({
        time: 61,
        kind: 'action',
        severity: 'info',
        subject: 'PL1-F1-IV1',
        text: 'valve shut',
        by: 'you',
      }),
    ).toBe('00:01:01  PL1-F1-IV1    valve shut (by you)');
    expect(formatDump([line('a')], ['HEADER'])).toBe('HEADER\n\n00:00:00  a\n');
  });
});

describe('describing actions', () => {
  const w = newWorld();
  const say = (world: World, action: WorldAction) =>
    describeAction(world, action, applyAction(world, action));

  it('names an installed valve by its tag, and says what was done', () => {
    const e = say(w, { type: 'plant/valve', id: 'PL1-F1-IV1', open: false });
    expect(e.subject).toBe('PL1-F1-IV1');
    expect(e.text).toContain('F1 inlet valve');
    expect(e.text).toContain('valve shut');
    expect(e.by).toBe('you');
    expect(e.kind).toBe('action');
  });

  it('says "no change" when an action changed nothing', () => {
    const e = say(w, { type: 'plant/valve', id: 'PL1-F1-IV1', open: true });
    expect(e.text).toMatch(/no change$/);
    expect(say(w, { type: 'lighting/supply', on: true }).text).toMatch(
      /no change$/,
    );
  });

  it('says what a starter did as well as what was pressed', () => {
    const hand = applyAction(w, {
      type: 'motor/starter',
      tag: 'P-101B',
      action: { act: 'mode', mode: 'hand' },
    });
    const e = say(hand, {
      type: 'motor/starter',
      tag: 'P-101B',
      action: { act: 'start' },
    });
    expect(e.subject).toBe('P-101B');
    expect(e.text).toContain('START pressed');
  });

  it('gives every kind of action a line', () => {
    const actions: WorldAction[] = [
      { type: 'demo/set', on: true },
      { type: 'demo/reset' },
      { type: 'plant/source', utility: 'power', on: false },
      { type: 'plant/feeder', room: 'plant_pool_01', on: false },
      { type: 'plant/isolator', name: 'P-101A isolator', on: false },
      { type: 'plant/delivery', chemical: 'hypochlorite', litres: 100 },
      { type: 'plant/booster-reset' },
      { type: 'plant/full-off' },
      { type: 'plant/full-on' },
      { type: 'plant/slow-start' },
      { type: 'weather/ambient', celsius: 3 },
      { type: 'lighting/supply', on: false },
      { type: 'lighting/zone', zone: 'lounge', on: false },
      { type: 'gas/leak', zone: 'hypo_store', gramsPerHour: 10 },
      { type: 'gas/act', zone: 'hypo_store', act: 'accept' },
      { type: 'plant/valve', id: 'PL1-F1-IV1', open: false },
      { type: 'olympic/makeup', mode: 'hand' },
      { type: 'pool/drain-down', pool: 'pool_01', open: true },
      { type: 'pool/make-up', pool: 'pool_01', open: true },
      { type: 'pool/setpoint', pool: 'pool_01', celsius: 30 },
      { type: 'time/skip', seconds: 5 },
      { type: 'motor/starter', tag: 'P-201A', action: { act: 'stop' } },
      { type: 'motor/stop', pool: 'pool_01', stopped: true },
      { type: 'jacuzzi', action: { act: 'stop' } },
      { type: 'jacuzzi/cabinet', action: { act: 'power', on: false } },
      { type: 'boiler-gas', action: { act: 'stop', pressed: true } },
    ];
    for (const a of actions) {
      const e = say(w, a);
      expect(e.text.length, a.type).toBeGreaterThan(3);
      expect(e.subject.length, a.type).toBeGreaterThan(0);
    }
  });
});

describe('watching the plant', () => {
  it('has watchers, and says nothing of a steady world', () => {
    expect(WATCHER_COUNT).toBeGreaterThan(10);
    const w = newWorld();
    expect(diffWorld(w, w)).toEqual([]);
    expect(diffWorld(w, advance(w, 1))).toEqual([]);
  });

  it('logs the lights going out once, when they go', () => {
    const w = newWorld();
    const dark = applyAction(w, { type: 'lighting/supply', on: false });
    const said = diffWorld(w, dark);
    expect(said.length).toBeGreaterThan(0);
    expect(said.every((e) => e.text === 'lights out')).toBe(true);
    expect(diffWorld(dark, advance(dark, 1))).toEqual([]);
  });

  it('logs a pump stopping when its panel’s emergency stop is struck', () => {
    const w = newWorld();
    const stopped = advance(
      applyAction(w, { type: 'motor/stop', pool: 'pool_02', stopped: true }),
      0.5,
    );
    const said = diffWorld(w, stopped);
    expect(
      said.some((e) => e.subject === 'P-101A' && /stopped/.test(e.text)),
    ).toBe(true);
  });

  it('sees every step through advance, so nothing nets out', () => {
    const w = newWorld();
    let steps = 0;
    const same = advance(w, 1, 0.1, () => steps++);
    expect(steps).toBe(10);
    expect(same.time).toBeCloseTo(advance(w, 1).time);
  });
});
