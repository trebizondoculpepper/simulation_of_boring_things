import { describe, expect, it } from 'vite-plus/test';
import {
  CO2_CYLINDER,
  CO2_MANIFOLD,
  bankContents,
  bankFlag,
  bankInUse,
  bankPressure,
  co2SupplyAlarms,
  co2Pressures,
  cylinderPressure,
  drawCo2,
  exchangeCylinder,
  newCo2Supply,
  setCylinderValve,
  setIsolation,
  throwLever,
  vapourPressure,
} from './co2-supply';

describe('a CO₂ cylinder', () => {
  it('stands at its vapour pressure while it holds liquid: about 56 bar gauge at 20 °C', () => {
    expect(vapourPressure(20)).toBeCloseTo(56.3, 1);
    expect(cylinderPressure(34, 20)).toBeCloseTo(56.3, 1);
    expect(cylinderPressure(15, 20)).toBeCloseTo(56.3, 1);
  });
  it('falls only once the last liquid has gone, to nothing when empty', () => {
    expect(cylinderPressure(5, 20)).toBeLessThan(35);
    expect(cylinderPressure(1, 20)).toBeLessThan(6);
    expect(cylinderPressure(0, 20)).toBe(0);
  });
  it('reads lower on a cold day', () => {
    expect(cylinderPressure(34, 0)).toBeCloseTo(33.9, 1);
  });
});

describe('the changeover manifold', () => {
  it('starts with both banks full, the left in use and the right standing by', () => {
    const s = newCo2Supply(20);
    expect(bankContents(s, 'left')).toBe(4 * CO2_CYLINDER.contents);
    expect(bankInUse(s)).toBe('left');
    expect(bankFlag(s, 'left')).toBe('in-use');
    expect(bankFlag(s, 'right')).toBe('standby');
  });
  it('regulates down to the low-pressure line’s 4 bar, which the isolation valve shuts off', () => {
    const s = newCo2Supply(20);
    expect(co2Pressures(s)).toEqual({
      inlet: bankPressure(s, 'left'),
      outlet: CO2_MANIFOLD.outlet,
      line: CO2_MANIFOLD.outlet,
    });
    expect(co2Pressures(setIsolation(s, false)).line).toBe(0);
  });
  it('changes over to the reserve when the service bank is spent, its flag red', () => {
    const s = drawCo2(newCo2Supply(20), 4 * 34 - 2);
    expect(bankFlag(s, 'left')).toBe('empty');
    expect(bankInUse(s)).toBe('right');
    expect(bankFlag(s, 'right')).toBe('in-use');
    expect(co2Pressures(s).outlet).toBe(CO2_MANIFOLD.outlet);
    // Drawing on takes from the right.
    const on = drawCo2(s, 10);
    expect(bankContents(s, 'right') - bankContents(on, 'right')).toBeCloseTo(
      10,
      6,
    );
  });
  it('the lever thrown, the reserve becomes the service bank, and the empties are exchanged to stand by', () => {
    let s = throwLever(drawCo2(newCo2Supply(20), 4 * 34 - 2));
    expect(s.service).toBe('right');
    for (let i = 0; i < 4; i++) {
      s = exchangeCylinder(s, 'left', i);
      // A new cylinder's valve is shut until opened.
      expect(bankFlag(s, 'left')).toBe('empty');
    }
    for (let i = 0; i < 4; i++) s = setCylinderValve(s, 'left', i, true);
    expect(bankFlag(s, 'left')).toBe('standby');
    expect(bankInUse(s)).toBe('right');
  });
  it('gives nothing once both banks are spent, and nothing through a shut valve', () => {
    const s = drawCo2(newCo2Supply(20), 1000);
    // What is left is gas at atmospheric pressure, which never comes out.
    expect(bankContents(s, 'left') + bankContents(s, 'right')).toBeLessThan(
      1.5,
    );
    expect(bankInUse(s)).toBeNull();
    expect(co2Pressures(s).line).toBe(0);
    const shut = setIsolation(newCo2Supply(20), false);
    expect(drawCo2(shut, 5)).toBe(shut);
  });
});

describe('the manifold’s alarms', () => {
  it('says nothing with both banks full', () => {
    expect(co2SupplyAlarms(newCo2Supply(20))).toEqual({
      bankEmpty: false,
      exhausted: false,
    });
  });
  it('calls BANK EMPTY, CHANGE CYLINDERS once it has changed over, and EXHAUSTED once both are spent', () => {
    const changed = drawCo2(newCo2Supply(20), 4 * 34 - 2);
    expect(co2SupplyAlarms(changed)).toEqual({
      bankEmpty: true,
      exhausted: false,
    });
    expect(co2SupplyAlarms(drawCo2(changed, 1000))).toEqual({
      bankEmpty: true,
      exhausted: true,
    });
  });
});
