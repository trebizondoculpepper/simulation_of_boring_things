import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, jacuzziRuns, newWorld } from '../world';
import type { World } from '../world';
import type { JacuzziAction } from './jacuzzi';

const act = (w: World, action: JacuzziAction) =>
  applyAction(w, { type: 'jacuzzi', action });
const start = advance(newWorld(), 10, 1);

describe('the jacuzzi’s jets and air', () => {
  it('start and stop from the cabinet’s buttons, each on its own', () => {
    let w = act(start, { act: 'toggle', what: 'jets' });
    expect(jacuzziRuns(w)).toEqual({ jets: true, air: false });
    w = act(w, { act: 'toggle', what: 'air' });
    expect(jacuzziRuns(w)).toEqual({ jets: true, air: true });
    w = act(w, { act: 'toggle', what: 'jets' });
    expect(jacuzziRuns(w)).toEqual({ jets: false, air: true });
  });

  it('run ten minutes from the wall plate’s START, and the cabinet’s lamps follow', () => {
    let w = act(start, { act: 'start' });
    expect(jacuzziRuns(w)).toEqual({ jets: true, air: true });
    w = advance(w, 590, 1);
    expect(jacuzziRuns(w).jets).toBe(true);
    w = advance(w, 20, 1);
    expect(jacuzziRuns(w)).toEqual({ jets: false, air: false });
  });

  it('stop at once on the wall plate’s STOP, however they were started', () => {
    let w = act(start, { act: 'toggle', what: 'air' });
    w = act(w, { act: 'stop' });
    expect(jacuzziRuns(w)).toEqual({ jets: false, air: false });
  });

  it('run only while the jacuzzi circulates: not with its cabinet isolated', () => {
    let w = act(start, { act: 'start' });
    w = applyAction(w, {
      type: 'plant/isolator',
      name: 'Jacuzzi cabinet isolator',
      on: false,
    });
    expect(jacuzziRuns(w)).toEqual({ jets: false, air: false });
  });
});
