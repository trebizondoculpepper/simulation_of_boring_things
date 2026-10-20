import { describe, expect, it } from 'vite-plus/test';
import { newBoiler, stepBoiler } from './boiler-house';
import type { BoilerState } from './boiler-house';
import {
  CO_ALARM,
  FLUE_HIGH,
  OFF,
  boilersPermitted,
  newCombustion,
  resetCombustion,
  setFan,
  stepCombustion,
} from './combustion';

const firing = (): BoilerState => {
  let b = newBoiler();
  for (let t = 0; t < 40; t += 0.1)
    b = stepBoiler(
      b,
      { demand: true, gas: true, systemReturn: 60, pressure: 2.4 },
      0.1,
    );
  return b;
};

const run = (
  c: ReturnType<typeof newCombustion>,
  boilers: BoilerState[],
  fouling: number[],
  seconds: number,
) => {
  let s = c;
  for (let t = 0; t < seconds; t += 0.1)
    s = stepCombustion(s, boilers, fouling, 0.1);
  return s;
};

describe('the boiler house’s combustion', () => {
  it('runs a firing boiler’s flue a little above its return, and a fouled one hotter', () => {
    const b = firing();
    const s = run(newCombustion(), [b, b], [0, 0.6], 120);
    expect(s.flues[0]).toBeGreaterThan(b.return + 5);
    expect(s.flues[0]).toBeLessThan(FLUE_HIGH);
    expect(s.flues[1]).toBeGreaterThan(FLUE_HIGH);
    expect(s.header).toBeGreaterThan(s.flues[0]);
  });

  it('permits the boilers only while the fan is proven', () => {
    const c = newCombustion();
    expect(boilersPermitted(c)).toBe(true);
    const off = run(setFan(c, OFF), [newBoiler(), newBoiler()], [0, 0], 1);
    expect(boilersPermitted(off)).toBe(false);
  });

  it('builds CO while boilers fire without air, latches the alarm, and resets once clear', () => {
    const b = firing();
    let s = run(setFan(newCombustion(), OFF), [b, b], [0, 0], 10);
    expect(s.co).toBeGreaterThanOrEqual(CO_ALARM);
    expect(s.coAlarm).toBe(true);
    expect(resetCombustion(s).coAlarm).toBe(true);
    s = run(setFan(s, 2), [newBoiler(), newBoiler()], [0, 0], 120);
    expect(boilersPermitted(s)).toBe(false);
    expect(boilersPermitted(resetCombustion(s))).toBe(true);
  });
});
