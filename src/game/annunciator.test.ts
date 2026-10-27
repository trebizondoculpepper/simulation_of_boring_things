import { describe, expect, it } from 'vite-plus/test';
import {
  acceptAlarms,
  newAnnunciator,
  resetAlarms,
  senseAlarms,
  unacceptedAlarms,
} from './annunciator';
import { advance, applyAction, newWorld } from './world';
import { deserialiseWorld, serialiseWorld } from './save';
import { plantReadingOf } from '../toolkit/gallery/logic/world-reading';

describe('the annunciator in the world (ISA sequence M)', () => {
  it('flashes an alarm coming in until it is accepted, then burns steady', () => {
    let a = senseAlarms(newAnnunciator(), ['p1-trip']);
    expect(a.windows['p1-trip']).toBe('flashing');
    expect(unacceptedAlarms(a)).toEqual(['p1-trip']);
    a = acceptAlarms(a);
    expect(a.windows['p1-trip']).toBe('steady');
    expect(unacceptedAlarms(a)).toEqual([]);
    // Still in: steady, and RESET does nothing to it.
    a = resetAlarms(senseAlarms(a, ['p1-trip']));
    expect(a.windows['p1-trip']).toBe('steady');
  });

  it('keeps an accepted window lit after its alarm clears, until RESET', () => {
    let a = acceptAlarms(senseAlarms(newAnnunciator(), ['cl-low']));
    a = senseAlarms(a, []);
    expect(a.windows['cl-low']).toBe('steady');
    a = resetAlarms(a);
    expect(a.windows['cl-low']).toBe('off');
    // In again: flashing anew.
    expect(senseAlarms(a, ['cl-low']).windows['cl-low']).toBe('flashing');
  });

  it('keeps flashing an alarm that cleared before it was accepted', () => {
    const a = senseAlarms(senseAlarms(newAnnunciator(), ['bal-low']), []);
    expect(a.windows['bal-low']).toBe('flashing');
    expect(resetAlarms(a).windows['bal-low']).toBe('flashing');
  });

  it('accepts only the alarms asked, when asked', () => {
    const a = acceptAlarms(
      senseAlarms(newAnnunciator(), ['p1-trip', 'p2-trip']),
      ['p2-trip'],
    );
    expect(unacceptedAlarms(a)).toEqual(['p1-trip']);
  });

  it('gives the same state back when nothing changes', () => {
    const a = senseAlarms(newAnnunciator(), ['p1-trip']);
    expect(senseAlarms(a, ['p1-trip'])).toBe(a);
    expect(resetAlarms(a)).toBe(a);
    expect(acceptAlarms(acceptAlarms(a))).toEqual(acceptAlarms(a));
  });
});

describe('the world’s annunciator', () => {
  /** The Olympic's plant room without its feeder: its circulation stops. */
  const fault = () =>
    advance(
      applyAction(newWorld(), {
        type: 'plant/feeder',
        room: 'plant_pool_02',
        on: false,
      }),
      120,
      1,
    );

  it('senses the plant’s alarms as the world runs, whichever room is shown', () => {
    const w = fault();
    expect(plantReadingOf(w).alarms).toContain('flow-low');
    expect(w.annunciator.windows['flow-low']).toBe('flashing');
  });

  it('is accepted for every console by one ACCEPT, and stays accepted', () => {
    const accepted = applyAction(fault(), { type: 'alarms/accept' });
    expect(unacceptedAlarms(accepted.annunciator)).toEqual([]);
    expect(accepted.annunciator.windows['flow-low']).toBe('steady');
    const later = advance(accepted, 30, 1);
    expect(later.annunciator.windows['flow-low']).toBe('steady');
  });

  it('keeps what was accepted across a save and a reload', () => {
    const accepted = applyAction(fault(), { type: 'alarms/accept' });
    const loaded = deserialiseWorld(serialiseWorld(accepted, 0));
    expect(loaded.ok && loaded.world.annunciator).toEqual(accepted.annunciator);
  });

  it('puts out a cleared alarm on RESET, and leaves the world alone with nothing to do', () => {
    const accepted = applyAction(fault(), { type: 'alarms/accept' });
    const restored = advance(
      applyAction(accepted, {
        type: 'plant/feeder',
        room: 'plant_pool_02',
        on: true,
      }),
      600,
      1,
    );
    expect(plantReadingOf(restored).alarms).not.toContain('flow-low');
    expect(restored.annunciator.windows['flow-low']).toBe('steady');
    const reset = applyAction(restored, { type: 'alarms/reset' });
    expect(reset.annunciator.windows['flow-low']).toBe('off');
    expect(applyAction(reset, { type: 'alarms/accept' })).toBe(reset);
  });
});
