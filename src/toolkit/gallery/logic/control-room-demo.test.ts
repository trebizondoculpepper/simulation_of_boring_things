import { describe, expect, it } from 'vite-plus/test';
import {
  ALARM_TEXT,
  ANNUNCIATOR_ALARMS,
  CHLORINE_LOW,
  DEMO_LOOP,
  FILTER_DP_LIMIT,
  plantAt,
} from './control-room-demo';

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
    expect(ANNUNCIATOR_ALARMS).toHaveLength(24);
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
