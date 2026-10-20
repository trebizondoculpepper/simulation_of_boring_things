import { describe, expect, it } from 'vite-plus/test';
import {
  AUTO,
  HAND,
  OFF,
  command,
  newPumpControls,
  pumpState,
  setHoa,
} from './pump-control';

describe('the filter pumps’ controls', () => {
  it('in AUTO, run as the plant schedules them', () => {
    const c = newPumpControls();
    expect(pumpState(c, 'p1', true, false)).toBe(0);
    expect(pumpState(c, 'p1', false, false)).toBe(1);
  });

  it('run in HAND and stop at OFF, whatever the schedule', () => {
    expect(
      pumpState(setHoa(newPumpControls(), 'p1', HAND), 'p1', false, false),
    ).toBe(0);
    expect(
      pumpState(setHoa(newPumpControls(), 'p1', OFF), 'p1', true, false),
    ).toBe(1);
  });

  it('take START and STOP from the control room only in REMOTE', () => {
    const remote = command(newPumpControls(), 'p2', false, 'remote');
    expect(pumpState(remote, 'p2', true, false)).toBe(1);
    const local = { ...newPumpControls(), remote: false };
    expect(command(local, 'p2', false, 'remote')).toBe(local);
    expect(
      pumpState(command(local, 'p2', false, 'local'), 'p2', true, false),
    ).toBe(1);
  });

  it('refuse START and STOP out of AUTO, and forget them when the selector turns', () => {
    const hand = setHoa(newPumpControls(), 'p1', HAND);
    expect(command(hand, 'p1', false, 'local')).toBe(hand);
    const stopped = command(newPumpControls(), 'p1', false, 'local');
    const back = setHoa(setHoa(stopped, 'p1', OFF), 'p1', AUTO);
    expect(back.pumps.p1.command).toBeNull();
    expect(pumpState(back, 'p1', true, false)).toBe(0);
  });

  it('show a tripped pump as faulted', () => {
    expect(
      pumpState(setHoa(newPumpControls(), 'p1', HAND), 'p1', true, true),
    ).toBe(2);
  });
});
