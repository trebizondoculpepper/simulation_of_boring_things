import { describe, expect, it } from 'vite-plus/test';
import { THEME_LENGTH, createThemeCue } from './bridge-theme-cue';

/** A fake clock and player. */
function rig() {
  let now = 0;
  let id = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const log: string[] = [];
  const cue = createThemeCue({
    start: () => log.push(`start@${now}`),
    stop: (ending) => log.push(`${ending ? 'end' : 'stop'}@${now}`),
    setTimeout: (fn, ms) => {
      timers.set(++id, { at: now + ms / 1000, fn });
      return id;
    },
    clearTimeout: (t) => void timers.delete(t),
  });
  const advance = (to: number) => {
    for (;;) {
      const due = [...timers.entries()]
        .filter(([, t]) => t.at <= to)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      timers.delete(due[0]);
      now = due[1].at;
      due[1].fn();
    }
    now = to;
  };
  return { cue, log, advance };
}

describe('the bridge’s theme (the owner, 2026-10-27)', () => {
  it('plays to its end while the walker stays, its end counted from its start', () => {
    expect(THEME_LENGTH).toBe(60);
    const { cue, log, advance } = rig();
    cue.cue(1);
    advance(0.5);
    expect(log).toEqual([]);
    advance(1);
    expect(log).toEqual(['start@1']);
    advance(THEME_LENGTH);
    expect(log).toEqual(['start@1']);
    advance(1 + THEME_LENGTH);
    expect(log).toEqual(['start@1', `end@${1 + THEME_LENGTH}`]);
    expect(cue.state).toBe('idle');
  });

  it('is not cut off or restarted by being cued again', () => {
    const { cue, log, advance } = rig();
    cue.cue(1);
    advance(0.5);
    cue.cue(1);
    advance(5);
    cue.cue(1);
    cue.cue(0);
    advance(20);
    expect(log).toEqual(['start@1']);
    advance(1 + THEME_LENGTH);
    expect(log).toEqual(['start@1', `end@${1 + THEME_LENGTH}`]);
  });

  it('fades out when the walker leaves, and never begins if they leave first', () => {
    const a = rig();
    a.cue.cue(1);
    a.advance(10);
    a.cue.leave();
    expect(a.log).toEqual(['start@1', 'stop@10']);
    a.advance(100);
    expect(a.log).toHaveLength(2);
    const b = rig();
    b.cue.cue(1);
    b.advance(0.5);
    b.cue.leave();
    b.advance(100);
    expect(b.log).toEqual([]);
  });

  it('begins afresh, its whole length again, when cued after the walker left (RESET, the owner, 2026-10-30)', () => {
    const { cue, log, advance } = rig();
    cue.cue(0);
    advance(30);
    cue.leave();
    advance(40);
    cue.cue(0);
    expect(log).toEqual(['start@0', 'stop@30', 'start@40']);
    advance(40 + THEME_LENGTH - 1);
    expect(log).toHaveLength(3);
    advance(40 + THEME_LENGTH);
    expect(log.at(-1)).toBe(`end@${40 + THEME_LENGTH}`);
  });
});
