import { signal } from '@preact/signals-core';
import type { ScreenLine } from './bbc-micro';
import { BBC_HANDSHAKE_SECONDS, BBC_READ_SECONDS } from './bbc-micro';
import { describe, expect, it } from 'vite-plus/test';
import {
  BBC_LOAD_SECONDS,
  BEWARE_INTERVAL_SECONDS,
  createBbcComputer,
} from './bbc-micro';
import type { UnitHealth } from './bbc-micro';

describe('BBC Micro startup', () => {
  it('starts off, beeps through ROM startup before loading, then shows a standalone diagnostic page', () => {
    const computer = createBbcComputer();
    computer.step(60);
    expect(computer.phase.value).toBe('off');
    expect(computer.lines.value).toEqual([]);
    expect(computer.elapsed.value).toBe(0);
    computer.power.flip();
    computer.step(0.5);
    expect(computer.phase.value).toBe('boot');
    expect(computer.lines.value[0][0]).toBe('BBC Computer 32K');
    computer.step(1.5);
    expect(computer.phase.value).toBe('loading');
    expect(
      computer.lines.value.some(([line]) => line === '>CHAIN "DIAG"'),
    ).toBe(true);
    computer.step(BBC_LOAD_SECONDS);
    expect(computer.phase.value).toBe('ready');
    expect(
      computer.lines.value.some(([line]) => line.includes('NOT CONNECTED')),
    ).toBe(true);
    computer.dispose();
  });

  it('cancels loading and starts fresh after power cycling', () => {
    const computer = createBbcComputer();
    computer.power.flip();
    computer.step(3);
    computer.power.flip();
    computer.step(10);
    expect(computer.lines.value).toEqual([]);
    expect(computer.elapsed.value).toBe(0);
    computer.power.flip();
    expect(computer.phase.value).toBe('boot');
    expect(computer.elapsed.value).toBe(0);
    computer.step(-1);
    expect(computer.elapsed.value).toBe(0);
    computer.dispose();
  });
});

describe('Neumann Link session', () => {
  it.each([false, true])(
    'waits for boot, handshake and first read; endpoint initially %s',
    (initial) => {
      const online = signal(initial);
      const lines = signal<readonly ScreenLine[]>([['LIVE DATA', '#fff']]);
      const bbc = createBbcComputer({ online, lines });
      bbc.power.flip();
      bbc.step(BBC_LOAD_SECONDS);
      expect(bbc.diagnosticsAvailable.value).toBe(false);
      if (!initial) {
        expect(bbc.lines.value.some(([s]) => s === 'NOT CONNECTED')).toBe(true);
        online.value = true;
      }
      bbc.step(BBC_HANDSHAKE_SECONDS);
      expect(bbc.session.value).toBe('reading');
      expect(bbc.diagnosticsAvailable.value).toBe(false);
      bbc.step(BBC_READ_SECONDS);
      expect(bbc.diagnosticsAvailable.value).toBe(true);
      expect(bbc.lines.value.some(([s]) => s === 'LIVE DATA')).toBe(true);
      lines.value = [['UPDATED', '#fff']];
      expect(bbc.diagnosticsAvailable.value).toBe(true);
      expect(bbc.reading.value).toBe(false);
      expect(bbc.lines.value.some(([s]) => s === 'UPDATED')).toBe(true);
      bbc.power.flip();
      expect(bbc.diagnosticsAvailable.value).toBe(false);
      expect(bbc.reading.value).toBe(false);
      expect(bbc.lines.value).toEqual([]);
      bbc.dispose();
    },
  );

  it('invalidates a read or established session immediately; reconnect must read again', () => {
    const online = signal(true);
    const bbc = createBbcComputer({ online, lines: signal([]) });
    bbc.power.flip();
    bbc.step(BBC_LOAD_SECONDS + BBC_HANDSHAKE_SECONDS + 0.2);
    expect(bbc.reading.value).toBe(true);
    online.value = false;
    expect(bbc.reading.value).toBe(false);
    expect(bbc.diagnosticsAvailable.value).toBe(false);
    bbc.step(100);
    online.value = true;
    expect(bbc.session.value).toBe('handshake');
    bbc.step(BBC_HANDSHAKE_SECONDS + BBC_READ_SECONDS);
    expect(bbc.diagnosticsAvailable.value).toBe(true);
    online.value = false;
    online.value = true;
    expect(bbc.diagnosticsAvailable.value).toBe(false);
    bbc.dispose();
  });
});

it('preserves an established session across a silent geometry swap', () => {
  const link = {
    online: signal(true),
    lines: signal<readonly ScreenLine[]>([['LIVE', '#fff']]),
  };
  const original = createBbcComputer(link),
    replacement = createBbcComputer(link);
  original.power.flip();
  original.step(BBC_LOAD_SECONDS + BBC_HANDSHAKE_SECONDS + BBC_READ_SECONDS);
  let events = 0;
  replacement.power.onEvent(() => events++);
  replacement.restore(original.snapshot());
  expect(replacement.diagnosticsAvailable.value).toBe(true);
  expect(replacement.reading.value).toBe(false);
  expect(events).toBe(0);
  original.dispose();
  replacement.dispose();
});

describe('BBC steady-state fanfare', () => {
  it('celebrates each genuine green transition once, only when powered', () => {
    const steady = signal(false);
    const bbc = createBbcComputer({
      online: signal(true),
      lines: signal([]),
      steady,
    });
    steady.value = true;
    expect(bbc.fanfare.value).toBe(0);
    bbc.power.flip();
    expect(bbc.fanfare.value).toBe(0); // No queued celebration on late power-on.
    steady.value = false;
    bbc.step(1);
    steady.value = true;
    expect(bbc.fanfare.value).toBe(1);
    bbc.step(10);
    expect(bbc.fanfare.value).toBe(1);
    steady.value = false;
    bbc.step(0.1);
    steady.value = true;
    expect(bbc.fanfare.value).toBe(1); // Ignore a brief readiness flicker.
    steady.value = false;
    bbc.step(1);
    steady.value = true;
    expect(bbc.fanfare.value).toBe(2);
    bbc.dispose();
  });

  it('does not celebrate or re-arm during a silent geometry swap', () => {
    const steady = signal(false);
    const link = { online: signal(true), lines: signal([]), steady };
    const original = createBbcComputer(link);
    original.power.flip();
    steady.value = true;
    expect(original.fanfare.value).toBe(1);
    const replacement = createBbcComputer(link);
    replacement.restore(original.snapshot());
    expect(replacement.fanfare.value).toBe(0);
    steady.value = false;
    replacement.step(0.1);
    steady.value = true;
    expect(replacement.fanfare.value).toBe(0);
    original.dispose();
    replacement.dispose();
  });
});

describe('BBC BEWARE', () => {
  /** A machine of three units, all green and steady, the computer on. */
  const machine = ({ on = true } = {}) => {
    const steady = signal(false);
    const powered = signal(true);
    const units = signal<Record<string, UnitHealth>>({
      LUBE: 'green',
      FAN: 'green',
      VFD: 'green',
    });
    const bbc = createBbcComputer({
      online: signal(true),
      lines: signal([]),
      steady,
      powered,
      units,
    });
    if (on) bbc.power.flip();
    /** Set some units, as the machine would. */
    const set = (changes: Record<string, UnitHealth>) =>
      (units.value = { ...units.value, ...changes });
    return { bbc, steady, powered, units, set };
  };

  it('sounds when a unit goes from green to failed after the steady state', () => {
    const { bbc, steady, set } = machine();
    steady.value = true;
    expect(bbc.beware.value).toBe(0);
    // The failure ends the steady state as it happens; it still sounds.
    steady.value = false;
    set({ LUBE: 'failed' });
    expect(bbc.beware.value).toBe(1);
    bbc.dispose();
  });

  it('is silent before the steady state is reached, and once the mains goes off', () => {
    const { bbc, steady, powered, set } = machine();
    set({ LUBE: 'failed' });
    expect(bbc.beware.value).toBe(0);
    set({ LUBE: 'green' });
    steady.value = true;
    steady.value = false;
    powered.value = false;
    powered.value = true;
    set({ FAN: 'failed' });
    expect(bbc.beware.value).toBe(0);
    bbc.dispose();
  });

  it('sounds only while the computer is on, and queues nothing for later', () => {
    const { bbc, steady, set } = machine({ on: false });
    steady.value = true;
    set({ LUBE: 'failed' });
    bbc.power.flip();
    bbc.step(BEWARE_INTERVAL_SECONDS);
    expect(bbc.beware.value).toBe(0);
    set({ FAN: 'failed' });
    expect(bbc.beware.value).toBe(1);
    bbc.dispose();
  });

  it('sounds for the change, not the standing failure, and once in 30 s', () => {
    const { bbc, steady, set } = machine();
    steady.value = true;
    // Two units failing together sound it once.
    set({ LUBE: 'failed', FAN: 'failed' });
    expect(bbc.beware.value).toBe(1);
    // Standing failures, and units going anywhere else, do not sound it.
    bbc.step(BEWARE_INTERVAL_SECONDS);
    set({ VFD: 'other' });
    expect(bbc.beware.value).toBe(1);
    // A failure from anything but green does not either.
    set({ VFD: 'failed' });
    expect(bbc.beware.value).toBe(1);
    // 30 s on, a unit recovering and failing again sounds it...
    set({ LUBE: 'green' });
    set({ LUBE: 'failed' });
    expect(bbc.beware.value).toBe(2);
    // ...but not again within 30 s...
    bbc.step(BEWARE_INTERVAL_SECONDS - 1);
    set({ LUBE: 'green' });
    set({ LUBE: 'failed' });
    expect(bbc.beware.value).toBe(2);
    // ...and sounds again once 30 s have passed.
    bbc.step(1);
    set({ FAN: 'green' });
    set({ FAN: 'failed' });
    expect(bbc.beware.value).toBe(3);
    bbc.dispose();
  });
});
