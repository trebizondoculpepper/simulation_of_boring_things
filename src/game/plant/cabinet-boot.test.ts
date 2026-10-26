import { describe, expect, it } from 'vite-plus/test';
import {
  BOOT,
  CABINET_SERVOS,
  bootBeep,
  bootLine,
  cabinetReady,
  offCabinet,
  runningCabinet,
  servoCommanded,
  stepCabinetBoot,
} from './cabinet-boot';
import type { CabinetBoot, CabinetBootInputs } from './cabinet-boot';

const run = (
  b: CabinetBoot,
  i: CabinetBootInputs,
  seconds: number,
  dt = 0.1,
) => {
  const seen: CabinetBoot[] = [];
  for (let t = 0; t < seconds - 1e-9; t += dt) {
    b = stepCabinetBoot(b, i, dt);
    seen.push(b);
  }
  return { b, seen };
};
const ON = { powered: true, fault: '' };

describe('a spa cabinet’s controller starting and stopping', () => {
  it('stops at once with its power gone, its servos springing shut', () => {
    const { b } = run(runningCabinet(), { powered: false, fault: '' }, 0.1);
    expect(b.phase).toBe('off');
    expect(cabinetReady(b)).toBe(false);
    const later = run(b, { powered: false, fault: '' }, BOOT.spring).b;
    for (const s of CABINET_SERVOS) expect(later.valves[s]).toBe(0);
  });

  it('boots, checks its inputs, then opens its servos one after another, and only then runs', () => {
    const { b, seen } = run(offCabinet(), ON, 20);
    expect(cabinetReady(b)).toBe(true);
    // Its phases in order.
    const phases = seen.map((s) => s.phase).filter((p, i, a) => p !== a[i - 1]);
    expect(phases).toEqual(['booting', 'checking', 'starting', 'running']);
    // Nothing opens before its check is done.
    const early = run(offCabinet(), ON, BOOT.boot + BOOT.check - 0.2).b;
    for (const s of CABINET_SERVOS) expect(early.valves[s]).toBe(0);
    // Each servo begins to open after the one before it, never together.
    const firstMoving = CABINET_SERVOS.map((s) =>
      seen.findIndex((x) => x.valves[s] > 0),
    );
    for (let i = 1; i < firstMoving.length; i++)
      expect(firstMoving[i]).toBeGreaterThan(firstMoving[i - 1]);
    // Running only with every one open.
    const firstRunning = seen.findIndex((x) => x.phase === 'running');
    for (const s of CABINET_SERVOS)
      expect(seen[firstRunning].valves[s]).toBe(1);
  });

  it('beeps once coming online, and three times for a fault', () => {
    expect(bootBeep('starting', 'running')).toBe('online');
    expect(bootBeep('running', 'fault')).toBe('fault');
    expect(bootBeep('booting', 'checking')).toBeNull();
    expect(bootBeep('running', 'running')).toBeNull();
  });

  it('stops for a fault, shuts its servos, and starts again once it clears', () => {
    let b = run(runningCabinet(), { powered: true, fault: 'TANK LOW' }, 0.1).b;
    expect(b.phase).toBe('fault');
    expect(bootLine(b, 'TANK LOW')).toBe('FAULT TANK LOW');
    b = run(b, { powered: true, fault: 'TANK LOW' }, BOOT.travel + 0.2).b;
    for (const s of CABINET_SERVOS) expect(b.valves[s]).toBe(0);
    b = run(b, ON, 20).b;
    expect(cabinetReady(b)).toBe(true);
  });

  it('says what it is doing while it starts', () => {
    expect(bootLine(run(offCabinet(), ON, 1).b)).toBe('BOOTING...');
    expect(bootLine(run(offCabinet(), ON, BOOT.boot + 1).b)).toBe('SELF TEST');
    expect(bootLine(runningCabinet())).toBeNull();
  });
});

describe('its valves wait for its self test', () => {
  // The owner, 2026-10-25: no valve opens until the self test is complete.
  it('commands none open while booting or checking, then each in its turn', () => {
    const on = { powered: true, fault: '' };
    let b = offCabinet();
    for (let t = 0; t < BOOT.boot + BOOT.check - 0.2; t += 0.1) {
      b = stepCabinetBoot(b, on, 0.1);
      for (let turn = 0; turn < 6; turn++)
        expect(servoCommanded(b, turn), `${b.phase} ${t}`).toBe(false);
      expect(CABINET_SERVOS.every((s) => b.valves[s] === 0)).toBe(true);
    }
    while (b.phase !== 'starting') b = stepCabinetBoot(b, on, 0.1);
    expect(servoCommanded(b, 0)).toBe(true);
    expect(servoCommanded(b, 1)).toBe(false);
    expect(servoCommanded(runningCabinet(), 5)).toBe(true);
  });
});
