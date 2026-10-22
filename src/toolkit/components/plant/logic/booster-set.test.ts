import { describe, expect, it } from 'vite-plus/test';
import {
  SET_PRESSURE,
  boosterDisplay,
  boosterLamps,
  boosterPressure,
} from './booster-set';
import type { BoosterReading } from './booster-set';

const running: BoosterReading = {
  powered: true,
  tripped: false,
  running: true,
  flow: 12.5,
  breakTank: 0.85,
};

describe('the booster set’s controller', () => {
  it('holds the main’s pressure and lights its duty pump while it delivers', () => {
    expect(boosterPressure(running)).toBe(SET_PRESSURE);
    expect(boosterLamps(running)).toEqual({
      power: true,
      run1: true,
      run2: false,
      lowWater: false,
    });
    const [a, b] = boosterDisplay(running);
    expect(a).toBe('PRESS  4.0 BAR  ');
    expect(b).toBe('P1 RUN 12.5M3/H ');
  });

  it('shows LOW WATER, loses its pressure and asks for a reset once tripped', () => {
    const tripped = {
      ...running,
      tripped: true,
      running: false,
      breakTank: 0.12,
    };
    expect(boosterLamps(tripped).lowWater).toBe(true);
    expect(boosterLamps(tripped).run1).toBe(false);
    expect(boosterPressure(tripped)).toBeLessThan(1);
    expect(boosterDisplay(tripped)).toEqual([
      'ALARM: LOW WATER',
      'TANK 12% RESET  ',
    ]);
  });

  it('goes dark without power', () => {
    const dead = { ...running, powered: false };
    expect(boosterLamps(dead).power).toBe(false);
    expect(boosterDisplay(dead)[0].trim()).toBe('');
  });

  it('keeps every line to sixteen characters', () => {
    for (const r of [
      running,
      { ...running, running: false },
      { ...running, tripped: true },
      { ...running, flow: 999.9 },
    ])
      for (const line of boosterDisplay(r)) expect(line).toHaveLength(16);
  });
});
