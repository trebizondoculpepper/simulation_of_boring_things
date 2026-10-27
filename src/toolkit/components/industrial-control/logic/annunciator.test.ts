import { describe, expect, it } from 'vite-plus/test';
import { awaitingAccept, createAnnunciator } from './annunciator';

describe('the annunciator', () => {
  it('flashes a new alarm until it is acknowledged, then burns steady', () => {
    const a = createAnnunciator(2);
    a.sense([true, false]);
    expect(a.states).toEqual(['flashing', 'off']);
    a.acknowledge();
    expect(a.states).toEqual(['steady', 'off']);
    a.sense([false, false]);
    expect(a.states).toEqual(['off', 'off']);
  });

  it('keeps flashing an alarm that cleared unacknowledged', () => {
    const a = createAnnunciator(1);
    a.sense([true]);
    a.sense([false]);
    expect(a.states).toEqual(['flashing']);
    a.acknowledge();
    expect(a.states).toEqual(['off']);
  });

  it('blinks a flashing window and holds a steady one', () => {
    const a = createAnnunciator(2);
    a.sense([true, true]);
    a.acknowledge();
    a.sense([true, true]);
    a.sense([true, true]);
    const b = createAnnunciator(1);
    b.sense([true]);
    expect(b.lit(0)).toEqual([true]);
    expect(b.lit(0.25)).toEqual([false]);
    expect(a.lit(0.25)).toEqual([true, true]);
  });

  it('lights every window while TEST is held', () => {
    const a = createAnnunciator(3);
    a.test = true;
    expect(a.lit(0.25)).toEqual([true, true, true]);
    a.test = false;
    expect(a.lit(0.25)).toEqual([false, false, false]);
  });

  it('can acknowledge some windows and leave the rest flashing', () => {
    const a = createAnnunciator(3);
    a.sense([true, true, true]);
    a.acknowledge([0, 2]);
    expect(a.states).toEqual(['steady', 'flashing', 'steady']);
  });

  it('holds a cleared, acknowledged window until RESET under sequence M', () => {
    const a = createAnnunciator(2, { manualReset: true });
    a.sense([true, true]);
    a.acknowledge();
    a.sense([false, true]);
    expect(a.states).toEqual(['steady', 'steady']);
    a.reset();
    // RESET puts out only what has cleared; a standing alarm stays lit.
    expect(a.states).toEqual(['off', 'steady']);
    a.sense([false, false]);
    a.reset();
    expect(a.states).toEqual(['off', 'off']);
  });

  it('leaves a flashing window flashing when RESET is pressed', () => {
    const a = createAnnunciator(1, { manualReset: true });
    a.sense([true]);
    a.sense([false]);
    a.reset();
    expect(a.states).toEqual(['flashing']);
  });
});

describe('ACCEPT shown only when it has something to do', () => {
  it('awaits acceptance while any window flashes, and not after ACCEPT', () => {
    const a = createAnnunciator(3, { manualReset: true });
    const b = createAnnunciator(2);
    expect(awaitingAccept([a, b])).toBe(false);
    a.sense([false, true, false]);
    expect(awaitingAccept([a, b])).toBe(true);
    a.acknowledge();
    expect(a.states[1]).toBe('steady');
    expect(awaitingAccept([a, b])).toBe(false);
    b.sense([true, false]);
    expect(awaitingAccept([a, b])).toBe(true);
  });
});
