import { expect, it } from 'vite-plus/test';
import { signal } from '@preact/signals-core';
import { SCREEN_BOOT_SECONDS, bootPace, createScreenBoot } from './screen-boot';

it('scrolls diagnostics for its own boot time and restarts when its supply is interrupted', () => {
  const supply = signal(false);
  const boot = createScreenBoot(supply, 'TEST CRT');
  boot.step(30);
  expect(boot.booting).toBe(false);
  expect(boot.ready.value).toBe(false);
  supply.value = true;
  expect(boot.booting).toBe(true);
  expect(boot.ready.value).toBe(false);
  const first = boot.lines();
  boot.step(boot.seconds / 2);
  expect(boot.lines()).not.toEqual(first);
  expect(boot.lines(2, 16)).toHaveLength(2);
  expect(boot.lines(2, 16).every((line) => line.length <= 16)).toBe(true);
  boot.step(boot.seconds / 2 - 0.01);
  expect(boot.booting).toBe(true);
  boot.step(0.01);
  expect(boot.booting).toBe(false);
  expect(boot.ready.value).toBe(true);
  supply.value = false;
  expect(boot.ready.value).toBe(false);
  boot.step(0.1);
  supply.value = true;
  expect(boot.booting).toBe(true);
  expect(boot.lines()).toEqual(first);
});

it('gives each new screen a different boot time', () => {
  const a = createScreenBoot(signal(true), 'A');
  const b = createScreenBoot(signal(true), 'B');
  expect(Math.abs(a.seconds - b.seconds)).toBeGreaterThan(0.5);
});

it('finishes the Automation Control PLC self-test in a few seconds', () => {
  const supply = signal(true);
  const boot = createScreenBoot(supply, 'AUTOMATION CONTROL', 'controller');
  expect(boot.ready.value).toBe(false);
  expect(boot.lines()).toEqual(['AUTOMATION CONTROL']);
  boot.step(2.2);
  expect(boot.lines()).toContain('I/O CONFIG OK');
  expect(boot.ready.value).toBe(false);
  boot.step(1.3);
  expect(boot.lines()).toContain('PROCESSOR READY');
  expect(boot.ready.value).toBe(true);
  supply.value = false;
  expect(boot.ready.value).toBe(false);
  boot.step(0);
  supply.value = true;
  expect(boot.lines()).toEqual(['AUTOMATION CONTROL']);
});

it('boots each screen at its own pace, so they do not finish together', () => {
  // The encabulator's screens (dev6).
  const names = [
    'DATALINE',
    'ENCABULATOR SYSTEMS',
    'PHASE REFERENCE SCOPE',
    'DINGLE ARM LOGGER',
    'VFD-601 PROCESS',
    'AUX DRIVE',
    'PANELVIEW',
    'VFD-601 HIM',
  ];
  const paces = names.map((name, slot) => bootPace(name, slot));
  const finishes = paces.map((p) => p.seconds);
  for (const seconds of finishes) {
    expect(seconds).toBeGreaterThanOrEqual(SCREEN_BOOT_SECONDS * 0.8);
    expect(seconds).toBeLessThanOrEqual(SCREEN_BOOT_SECONDS * 1.25);
  }
  // No two within half a second of each other.
  const sorted = [...finishes].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++)
    expect(sorted[i] - sorted[i - 1]).toBeGreaterThan(0.5);
  // The same screen always boots the same way, its lines in order, each
  // before it is ready, and the gaps between them uneven.
  expect(bootPace('PANELVIEW', 6)).toEqual(paces[6]);
  for (const { seconds, at } of paces) {
    for (let i = 1; i < at.length; i++)
      expect(at[i]).toBeGreaterThan(at[i - 1]);
    expect(at.at(-1)!).toBeLessThan(seconds);
    const gaps = at.slice(1).map((t, i) => t - at[i]);
    expect(Math.max(...gaps) / Math.min(...gaps)).toBeGreaterThan(1.5);
  }
});
