import { describe, expect, it } from 'vite-plus/test';
import {
  ALARM_TEXT,
  ANNUNCIATOR_ALARMS,
  CHLORINE_LOW,
  DEMO_LOOP,
  FILTER_DP_LIMIT,
  gasAlarmIds,
  plantAt,
} from './control-room-demo';
import { advance, applyAction, newWorld } from '../../../game/world';

describe('the control room demonstration', () => {
  it('repeats every loop', () => {
    expect(plantAt(10)).toEqual(plantAt(10 + DEMO_LOOP));
  });

  it('starts healthy and raises each scripted alarm during the loop', () => {
    expect(plantAt(5).alarms).not.toContain('filter-dp');
    expect(plantAt(5).alarms).not.toContain('cl-low');
    const seen = new Set<string>();
    for (let s = 0; s < DEMO_LOOP; s += 1)
      for (const alarm of plantAt(s).alarms) seen.add(alarm);
    expect(seen).toContain('filter-dp');
    expect(seen).toContain('cl-low');
    expect(seen).toContain('rh-high');
  });

  it('raises an alarm exactly when its reading crosses its limit', () => {
    for (let s = 0; s < DEMO_LOOP; s += 0.5) {
      const r = plantAt(s);
      expect(r.alarms.includes('filter-dp')).toBe(
        r.filterDp[1] > FILTER_DP_LIMIT,
      );
      expect(r.alarms.includes('cl-low')).toBe(r.chlorine < CHLORINE_LOW);
    }
  });

  it('names a window and a room for every alarm', () => {
    for (const alarm of ANNUNCIATOR_ALARMS) {
      expect(ALARM_TEXT[alarm].window.length).toBeGreaterThan(0);
      expect(ALARM_TEXT[alarm].room.length).toBeGreaterThan(0);
    }
    // Thirty, and six for the Olympic's filters and Wash-O-Tron (2026-10-28).
    expect(ANNUNCIATOR_ALARMS).toHaveLength(36);
  });

  it('keeps readings in their instruments’ ranges', () => {
    for (let s = 0; s < DEMO_LOOP; s += 2) {
      const r = plantAt(s);
      expect(r.balance).toBeGreaterThan(0);
      expect(r.balance).toBeLessThan(1);
      expect(r.flow).toBeGreaterThan(500);
      expect(r.ph).toBeGreaterThan(7);
      expect(r.ph).toBeLessThan(7.6);
    }
  });
});

describe('the annunciator’s gas windows', () => {
  it('come from the world’s gas detection', () => {
    expect(gasAlarmIds(newWorld())).toEqual([]);
    let w = applyAction(newWorld(), {
      type: 'gas/act',
      zone: 'hypo_store',
      act: 'misdeliver',
    });
    w = advance(w, 300, 1);
    expect(gasAlarmIds(w)).toEqual([
      'chlorine-gas',
      'chlorine-high',
      'gas-purge',
    ]);
    w = applyAction(w, {
      type: 'gas/leak',
      zone: 'plant_pool_01',
      gramsPerHour: 2,
    });
    w = applyAction(w, {
      type: 'plant/feeder',
      room: 'plant_pool_01',
      on: false,
    });
    expect(gasAlarmIds(w)).toContain('extract-fail');
  });
});

it('lights a window for each Olympic filter over its DP limit, and the Wash-O-Tron out of AUTO', async () => {
  const { newWorld } = await import('../../../game/world');
  const { plantReadingOf } = await import('./world-reading');
  const w = newWorld();
  const manual = {
    ...w,
    washOTron: {
      ...w.washOTron,
      filters: w.washOTron.filters.map((f, i) =>
        i === 2 ? { ...f, auto: false } : f,
      ),
    },
  };
  expect(plantReadingOf(manual, 'pool_02').alarms).toContain('wot-not-auto');
  expect(plantReadingOf(w, 'pool_02').alarms).not.toContain('wot-not-auto');
  // A bed loaded well past its reference: its own window, and the summary.
  const dirty = {
    ...w,
    olympic: {
      ...w.olympic,
      dirt: w.olympic.dirt.map((d, i) => (i === 3 ? d * 6 : d)),
    },
  };
  const alarms = plantReadingOf(dirty, 'pool_02').alarms;
  expect(alarms).toContain('f4-dp');
  expect(alarms).toContain('filter-dp');
  expect(alarms).not.toContain('f1-dp');
});
