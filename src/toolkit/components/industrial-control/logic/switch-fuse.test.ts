import { describe, expect, it } from 'vite-plus/test';
import {
  blowFuse,
  newSwitchFuse,
  switchFuseOutput,
  workSwitchFuse,
} from './switch-fuse';
import type { SwitchFuseAction, SwitchFuseState } from './switch-fuse';

const run = (s: SwitchFuseState, ...actions: SwitchFuseAction[]) =>
  actions.reduce((state, a) => workSwitchFuse(state, a).state, s);

describe('a switch-fuse', () => {
  it('passes its supply on only when ON with every fuse in and whole', () => {
    const s = newSwitchFuse();
    expect(switchFuseOutput(s)).toBe(true);
    expect(switchFuseOutput(s, false)).toBe(false);
    expect(switchFuseOutput(run(s, { kind: 'handle' }))).toBe(false);
    expect(switchFuseOutput(blowFuse(s, 1))).toBe(false);
  });

  it('keeps its door shut while ON, and its handle OFF while the door is open', () => {
    const on = newSwitchFuse();
    const tried = workSwitchFuse(on, { kind: 'door' });
    expect(tried.refused).toMatch(/switch OFF/);
    expect(tried.state.doorOpen).toBe(false);
    const open = run(on, { kind: 'handle' }, { kind: 'door' });
    expect(open.doorOpen).toBe(true);
    const back = workSwitchFuse(open, { kind: 'handle' });
    expect(back.refused).toMatch(/close the door/);
    expect(back.state.on).toBe(false);
  });

  it('will not let a carrier be reached with the door shut', () => {
    const s = workSwitchFuse(newSwitchFuse(false), {
      kind: 'carrier',
      phase: 2,
    });
    expect(s.refused).toBeDefined();
    expect(s.state.carriers[2]).toBe('in');
  });

  it('has a blown fuse changed: OFF, open, carrier out and in, shut, ON', () => {
    const blown = blowFuse(newSwitchFuse(), 0);
    expect(blown.carriers).toEqual(['blown', 'in', 'in']);
    const opened = run(blown, { kind: 'handle' }, { kind: 'door' });
    const out = run(opened, { kind: 'carrier', phase: 0 });
    expect(out.carriers[0]).toBe('out');
    const fixed = run(
      out,
      { kind: 'carrier', phase: 0 },
      { kind: 'door' },
      { kind: 'handle' },
    );
    expect(fixed.carriers).toEqual(['in', 'in', 'in']);
    expect(switchFuseOutput(fixed)).toBe(true);
  });
});
