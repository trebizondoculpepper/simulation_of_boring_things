import { describe, expect, it } from 'vite-plus/test';
import {
  BOOT_GAPS,
  BOOT_SOUNDS,
  CHATTER_SOUNDS,
  LEVELS,
  LOUDNESS,
  REFERENCE_DB,
  TOUCH_SOUNDS,
  USED_SOUNDS,
  balanced,
  bootCue,
  createCueGate,
  createPicker,
} from './console-sounds';
import { seeded } from './console-chatter';

const ALARM_LIKE = [
  'amber_alert',
  'urgent_alert',
  'component_failure',
  'small_fault',
  'enemy_launch_detected',
  'system_crash_failure',
  'inbound_call',
  'transporter_activating',
];

describe('the bridge’s console sounds', () => {
  it('uses none of the alarm-like files yet', () => {
    for (const name of USED_SOUNDS) expect(ALARM_LIKE).not.toContain(name);
    for (const name of CHATTER_SOUNDS) expect(USED_SOUNDS).toContain(name);
  });

  it('answers each touch sensibly: presses vary, refusals lock out, alarms accepted trill', () => {
    expect(TOUCH_SOUNDS.confirm.length).toBeGreaterThan(1);
    expect(TOUCH_SOUNDS.deny).toEqual(['lock_out']);
    expect(TOUCH_SOUNDS.ack).toEqual(['ack_trill']);
    expect(TOUCH_SOUNDS.done).toEqual(['correct_entry']);
    expect(TOUCH_SOUNDS.page).toEqual(['look_here']);
  });

  it('brings every file to one loudness, never past full scale', () => {
    for (const name of USED_SOUNDS) {
      const gain = balanced(name, 1);
      const { mean, peak } = LOUDNESS[name];
      expect(peak + 20 * Math.log10(gain)).toBeLessThanOrEqual(1e-9);
      // At the reference unless its peak forbids it.
      if (peak + REFERENCE_DB - mean < 0)
        expect(mean + 20 * Math.log10(gain)).toBeCloseTo(REFERENCE_DB, 6);
    }
    // The quietest file is raised, the loudest lowered.
    expect(balanced('correct_entry', 1)).toBeGreaterThan(1);
    expect(balanced('lock_out', 1)).toBeLessThan(1);
    // Each display's boot cues quieter than the main screen's and a touch.
    expect(LEVELS.bootEach).toBeLessThan(LEVELS.bootMain);
    expect(LEVELS.bootEach).toBeLessThan(LEVELS.touch);
  });

  it('never picks the same file twice running from a list of several', () => {
    const pick = createPicker(seeded(2));
    let last = '';
    for (let i = 0; i < 500; i++) {
      const p = pick(TOUCH_SOUNDS.confirm);
      expect(p).not.toBe(last);
      last = p;
    }
    // A list of one always gives its one.
    expect(pick(TOUCH_SOUNDS.deny)).toBe('lock_out');
    expect(pick(TOUCH_SOUNDS.deny)).toBe('lock_out');
  });

  it('cues a display’s emblem and its coming on; the main viewscreen engines online', () => {
    expect(bootCue('emblem', false)).toEqual(BOOT_SOUNDS.emblem);
    expect(bootCue('on', false)).toEqual(BOOT_SOUNDS.running);
    expect(bootCue('on', true)).toEqual(['engines_online']);
    expect(bootCue('emblem', true)).toBeNull();
    for (const phase of ['black', 'fade', 'draw'] as const) {
      expect(bootCue(phase, false)).toBeNull();
      expect(bootCue(phase, true)).toBeNull();
    }
  });

  it('keeps a room of booting displays from stacking its cues', () => {
    const gate = createCueGate();
    // 25 displays' emblems within 2.5 s, each wanting one of two files.
    const pick = createPicker(seeded(9));
    const random = seeded(4);
    const times = Array.from({ length: 25 }, () => random() * 2.5).sort(
      (a, b) => a - b,
    );
    const heard: { t: number; name: string }[] = [];
    for (const t of times) {
      const name = pick(BOOT_SOUNDS.emblem);
      if (gate(name, t)) heard.push({ t, name });
    }
    expect(heard.length).toBeGreaterThan(2);
    expect(heard.length).toBeLessThan(25);
    for (let i = 1; i < heard.length; i++)
      expect(heard[i].t - heard[i - 1].t).toBeGreaterThanOrEqual(BOOT_GAPS.any);
    for (const a of heard)
      for (const b of heard)
        if (a !== b && a.name === b.name)
          expect(Math.abs(a.t - b.t)).toBeGreaterThanOrEqual(BOOT_GAPS.same);
    // The main screen's always passes.
    expect(gate('engines_online', times[times.length - 1], true)).toBe(true);
  });
});
