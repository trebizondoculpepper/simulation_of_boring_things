import { describe, expect, it } from 'vite-plus/test';
import {
  COMPLETE_LINES,
  DUMP_LINES,
  STEP_MAX,
  STEP_MIN,
  STOP_COLUMNS,
  STOP_DRIVERS,
  STOP_OS,
  STOP_ROWS,
  stopKey,
  stopMoment,
  stopScreen,
} from './stop-screen';

const SEEDS = Array.from({ length: 200 }, (_, i) => i * 7 + 1);
const end = (seed: number) => {
  const s = stopScreen(seed);
  return (s.rebootAt ?? s.steps[s.steps.length - 1].at) + 5;
};

describe('the stop screen', () => {
  it('replays the same crash from the same seed', () => {
    expect(stopScreen(42)).toEqual(stopScreen(42));
    expect(stopMoment(stopScreen(42), 17)).toEqual(
      stopMoment(stopScreen(42), 17),
    );
  });

  it('varies its STOP code, driver and parameters with the seed', () => {
    const screens = SEEDS.map((s) => stopScreen(s));
    expect(new Set(screens.map((s) => s.stop.name)).size).toBeGreaterThan(6);
    expect(new Set(screens.map((s) => s.driver)).size).toBe(
      STOP_DRIVERS.length,
    );
    expect(new Set(screens.map((s) => s.params.join())).size).toBe(
      SEEDS.length,
    );
  });

  it('names its own parody system, never the one it parodies', () => {
    for (const seed of SEEDS.slice(0, 40)) {
      const text = stopScreen(seed).body.join('\n');
      expect(text).toContain(STOP_OS.name);
      expect(text).not.toMatch(/windows|microsoft/i);
    }
  });

  it('fits the text grid at every moment', () => {
    for (const seed of SEEDS) {
      const s = stopScreen(seed);
      for (const step of s.steps) {
        const m = stopMoment(s, step.at);
        expect(m.lines.length).toBeLessThanOrEqual(STOP_ROWS);
        for (const line of m.lines)
          expect(line.length).toBeLessThanOrEqual(STOP_COLUMNS - 1);
      }
    }
  });

  it('prints a STOP line and the faulting driver', () => {
    const s = stopScreen(3);
    const text = s.body.join('\n');
    expect(text).toMatch(
      /\*\*\* STOP: 0x[0-9A-F]{8} \(0x[0-9A-F]{8},0x[0-9A-F]{8},0x[0-9A-F]{8},0x[0-9A-F]{8}\)/,
    );
    expect(text).toContain(`following file: ${s.driver}`);
    expect(text).toContain(s.stop.name);
  });

  it('begins collecting, then counts its dump up in steps', () => {
    const s = stopScreen(11, { outcome: 'reboot' });
    const first = stopMoment(s, 0);
    expect(first.lines.at(-1)).toBe(DUMP_LINES[0]);
    expect(first.phase).toBe('collecting');
    expect(first.percent).toBeNull();
    const percents = s.steps
      .map((step) => step.percent)
      .filter((p) => p !== null);
    expect(percents[0]).toBe(0);
    expect(percents.at(-1)).toBe(100);
    for (let i = 1; i < percents.length; i++)
      expect(percents[i]).toBeGreaterThanOrEqual(percents[i - 1]);
    const middle = stopMoment(s, s.steps[6].at + 0.1);
    expect(middle.phase).toBe('dumping');
    expect(middle.lines.at(-1)).toMatch(
      /^Dumping physical memory to disk: {1,3}\d{1,3}$/,
    );
  });

  it('steps no faster than the bench allows', () => {
    for (const seed of SEEDS) {
      const { steps } = stopScreen(seed);
      for (let i = 1; i < steps.length; i++) {
        const gap = steps[i].at - steps[i - 1].at;
        expect(gap).toBeGreaterThanOrEqual(STEP_MIN);
        expect(gap).toBeLessThanOrEqual(STEP_MAX);
      }
    }
  });

  it('reboots after a completed dump, when it reboots', () => {
    const s = stopScreen(5, { outcome: 'reboot' });
    expect(s.rebootAt).not.toBeNull();
    const done = s.steps.at(-1)!;
    const before = stopMoment(s, s.rebootAt! - 0.01);
    expect(before.reboot).toBe(false);
    expect(before.phase).toBe('complete');
    expect(before.lines.slice(-COMPLETE_LINES.length)).toEqual([
      ...COMPLETE_LINES,
    ]);
    expect(s.rebootAt!).toBeGreaterThan(done.at);
    expect(stopMoment(s, s.rebootAt!).reboot).toBe(true);
  });

  it('hangs for good, at the disk, in the dump or after it', () => {
    const hangs = SEEDS.map((seed) => stopScreen(seed, { outcome: 'hang' }));
    const where = new Set(
      hangs.map((s) => (s.outcome.kind === 'hang' ? s.outcome.at : '')),
    );
    expect(where).toEqual(new Set(['disk', 'dump', 'complete']));
    for (const s of hangs) {
      expect(s.rebootAt).toBeNull();
      const late = stopMoment(s, 1e6);
      expect(late.reboot).toBe(false);
      if (s.outcome.kind === 'hang' && s.outcome.at === 'dump') {
        expect(late.phase).toBe('hung');
        expect(late.percent).toBeLessThan(100);
      }
      if (s.outcome.kind === 'hang' && s.outcome.at === 'disk')
        expect(late.lines.at(-1)).toBe(DUMP_LINES[1]);
    }
  });

  it('mostly reboots, left to its seed', () => {
    const reboots = SEEDS.filter(
      (seed) => stopScreen(seed).outcome.kind === 'reboot',
    ).length;
    expect(reboots / SEEDS.length).toBeGreaterThan(0.45);
    expect(reboots / SEEDS.length).toBeLessThan(0.75);
  });

  it('keys change exactly when what it shows changes', () => {
    for (const seed of SEEDS.slice(0, 30)) {
      const s = stopScreen(seed);
      let key = '';
      let lines = '';
      let changes = 0;
      for (let t = 0; t < end(seed); t += 0.05) {
        const m = stopMoment(s, t);
        expect(stopKey(s, t)).toBe(m.key);
        const shown = m.lines.join('\n') + m.reboot;
        expect(m.key !== key).toBe(shown !== lines);
        if (m.key !== key) changes++;
        key = m.key;
        lines = shown;
      }
      // Under one change a second on average, so under the bench's budget.
      expect(changes / end(seed)).toBeLessThan(1 / STEP_MIN);
    }
  });
});
