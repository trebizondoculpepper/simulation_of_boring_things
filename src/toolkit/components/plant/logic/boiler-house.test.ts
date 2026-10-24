import { describe, expect, it } from 'vite-plus/test';
import {
  GAS_LOW_DISPLAY,
  IGNITION_SECONDS,
  LOW_PRESSURE,
  MAX_TRIES,
  PURGE_SECONDS,
  boilerDisplay,
  boilerLamps,
  gasTo,
  meterFlow,
  newBoiler,
  newGasHouse,
  pressBoiler,
  setBoilerSetpoint,
  resetGasHouse,
  settleGasHouse,
  stepBoiler,
} from './boiler-house';
import type { BoilerInputs, BoilerState } from './boiler-house';

const run = (
  boiler: BoilerState,
  inputs: Partial<BoilerInputs>,
  seconds: number,
  step = 0.1,
) => {
  let b = boiler;
  const all: BoilerInputs = {
    demand: true,
    gas: true,
    systemReturn: 60,
    pressure: 2.4,
    ...inputs,
  };
  for (let t = 0; t < seconds; t += step) b = stepBoiler(b, all, step);
  return b;
};

describe('a boiler’s controller', () => {
  it('goes out without power, and fires again once it is back', () => {
    const firing = run(newBoiler(), {}, PURGE_SECONDS + IGNITION_SECONDS + 5);
    expect(firing.rate).toBeGreaterThan(0);
    const dark = run(firing, { powered: false }, 5);
    expect(dark.rate).toBe(0);
    expect(dark.code).toBe(0);
    expect(dark.on).toBe(true);
    expect(
      run(dark, {}, PURGE_SECONDS + IGNITION_SECONDS + 5).rate,
    ).toBeGreaterThan(0);
  });

  it('waits in standby with no demand', () => {
    expect(run(newBoiler(), { demand: false }, 30).code).toBe(0);
  });

  it('purges, ignites and fires when heat is wanted', () => {
    const b = newBoiler();
    expect(run(b, {}, PURGE_SECONDS / 2).code).toBe(1);
    expect(run(b, {}, PURGE_SECONDS + IGNITION_SECONDS / 2).code).toBe(2);
    const firing = run(b, {}, PURGE_SECONDS + IGNITION_SECONDS + 5);
    expect(firing.code).toBe(3);
    expect(firing.rate).toBeGreaterThan(0);
    expect(boilerLamps(firing).burner).toBe(true);
  });

  it('locks out after its last failed ignition with no gas, until RESET', () => {
    const tries = MAX_TRIES * (PURGE_SECONDS + IGNITION_SECONDS) + 2;
    const out = run(newBoiler(), { gas: false }, tries);
    expect(out.lockout).toBe('ignition-failure');
    expect(boilerDisplay(out, 0)).toBe('E 02');
    expect(boilerDisplay(out, 0.5)).toBe('    ');
    // Still locked with the gas back, until reset.
    expect(run(out, {}, 30).lockout).toBe('ignition-failure');
    const reset = pressBoiler(out, 'reset');
    expect(run(reset, {}, PURGE_SECONDS + IGNITION_SECONDS + 3).code).toBe(3);
  });

  it('loses its flame when the gas goes, and retries', () => {
    const firing = run(newBoiler(), {}, 20);
    const lost = run(firing, { gas: false }, 0.2);
    expect(lost.code).toBe(1);
    expect(lost.rate).toBe(0);
  });

  it('blocks on low system pressure and recovers when it returns', () => {
    const blocked = run(newBoiler(), { pressure: LOW_PRESSURE - 0.1 }, 5);
    expect(blocked.code).toBe(9);
    expect(run(blocked, {}, 1).code).not.toBe(9);
  });

  it('runs its pump on after the burner stops', () => {
    const firing = run(newBoiler(), {}, 20);
    const after = run(firing, { demand: false }, 2);
    expect(after.code).toBe(7);
    expect(boilerLamps(after).pump).toBe(true);
  });

  it('shows the status digit and flow temperature, and steps through its modes', () => {
    const firing = run(newBoiler(), {}, 20);
    expect(boilerDisplay(firing, 0)).toMatch(/^3 [ \d]\d$/);
    let b = pressBoiler(firing, 'mode');
    expect(boilerDisplay(b, 0)).toMatch(/^F /);
    b = pressBoiler(
      pressBoiler(pressBoiler(pressBoiler(b, 'mode'), 'mode'), 'mode'),
      'mode',
    );
    expect(b.mode).toBe('setpoint');
    expect(pressBoiler(b, 'plus').setpoint).toBe(b.setpoint + 1);
  });

  it('sets its flow temperature with − and + from any display, between 40 and 90 °C', () => {
    const b = pressBoiler(newBoiler(), 'plus');
    expect(b.setpoint).toBe(81);
    expect(boilerDisplay(b, 0)).toMatch(/^S 81$/);
    let low = newBoiler();
    for (let i = 0; i < 60; i++) low = pressBoiler(low, 'minus');
    expect(low.setpoint).toBe(40);
    expect(setBoilerSetpoint(newBoiler(), 120).setpoint).toBe(90);
  });

  it('fires to the flow temperature it is set to', () => {
    const cool = run(setBoilerSetpoint(newBoiler(), 50), {}, 600);
    const hot = run(setBoilerSetpoint(newBoiler(), 85), {}, 600);
    expect(hot.rate).toBeGreaterThan(cool.rate);
    expect(hot.flow).toBeGreaterThan(cool.flow);
  });

  it('is switched off by its switch and shows nothing', () => {
    const off = pressBoiler(newBoiler(), 'power');
    expect(boilerDisplay(run(off, {}, 5), 0)).toBe('    ');
  });

  it('says GAS on its display, idle or not, while no gas reaches it', () => {
    const idle = newBoiler();
    expect(boilerDisplay(idle, 0, false)).toBe(GAS_LOW_DISPLAY);
    expect(boilerDisplay(idle, 1, false)).toBe(boilerDisplay(idle, 1));
    expect(boilerDisplay(idle, 0)).not.toBe(GAS_LOW_DISPLAY);
  });
});

describe('the gas house', () => {
  it('trips the safety valve shut on the emergency stop, and keeps it shut until reset', () => {
    let house = newGasHouse();
    expect(gasTo(house, 0)).toBe(true);
    house = settleGasHouse({ ...house, stopPressed: true });
    expect(house.ssovOpen).toBe(false);
    house = settleGasHouse({ ...house, stopPressed: false });
    expect(house.ssovOpen).toBe(false);
    house = resetGasHouse(house);
    expect(house.ssovOpen).toBe(true);
  });

  it('will not reset while gas is detected', () => {
    const house = resetGasHouse(
      settleGasHouse({ ...newGasHouse(), gasDetected: true }),
    );
    expect(house.ssovOpen).toBe(false);
  });

  it('gives each boiler gas only through its own isolator', () => {
    const house = { ...newGasHouse(), isolators: [true, false] };
    expect(gasTo(house, 0)).toBe(true);
    expect(gasTo(house, 1)).toBe(false);
  });

  it('meters the gas the firing boilers burn', () => {
    const firing = run(newBoiler(), {}, 30);
    const flow = meterFlow(newGasHouse(), [firing, newBoiler()]);
    expect(flow).toBeGreaterThan(5);
    expect(flow).toBeLessThan(32);
  });
});
