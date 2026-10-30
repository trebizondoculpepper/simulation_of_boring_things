import { describe, expect, it } from 'vite-plus/test';
import {
  CYLINDER_SIZES,
  GASES,
  GAS_IDS,
  RAL,
  contentsFrom,
  cylinderKind,
  cylinderName,
  cylinderStatus,
  isFlammable,
  seamlessProfile,
  stampLines,
  testDates,
  weldedProfile,
} from './gas-cylinders';

describe('gas cylinders', () => {
  it('covers the gases the owner asked for, each with a size', () => {
    expect(GAS_IDS).toHaveLength(12);
    for (const gas of GAS_IDS) {
      expect(GASES[gas].fills.length).toBeGreaterThan(0);
      expect(GASES[gas].un).toMatch(/^\d{4}$/);
    }
  });

  it('colours shoulders to BS EN 1089-3', () => {
    expect(GASES.oxygen.shoulder).toBe(RAL.white);
    expect(GASES.nitrogen.shoulder).toBe(RAL.black);
    expect(GASES.argon.shoulder).toBe(RAL.darkGreen);
    expect(GASES.co2.shoulder).toBe(RAL.grey);
    expect(GASES.helium.shoulder).toBe(RAL.brown);
    expect(GASES.acetylene.shoulder).toBe(RAL.maroon);
    expect(GASES.hydrogen.shoulder).toBe(RAL.red);
    expect(GASES.chlorine.shoulder).toBe(RAL.yellow);
    expect(GASES.air.shoulder).toBe(RAL.brightGreen);
  });

  it('gives flammable gases left-hand outlets and the rest right-hand', () => {
    for (const gas of GAS_IDS)
      expect(GASES[gas].thread.hand).toBe(isFlammable(gas) ? 'left' : 'right');
    expect(isFlammable('propane')).toBe(true);
    expect(isFlammable('oxygen')).toBe(false);
  });

  it('labels each gas with its ADR classes', () => {
    expect(GASES.oxygen.adr).toEqual(['5.1', '2.2']);
    expect(GASES.chlorine.adr).toEqual(['2.3', '5.1', '8']);
    expect(GASES.propane.adr).toEqual(['2.1']);
    expect(GASES.nitrogen.adr).toEqual(['2.2']);
  });

  it('fits residual pressure valves to industrial compressed gases, not to LPG or acetylene', () => {
    expect(GASES.argon.rpv).toBe(true);
    expect(GASES.acetylene.rpv).toBe(false);
    expect(GASES.propane.rpv).toBe(false);
  });

  it('resolves a kind, defaulting to the largest size', () => {
    const co2 = cylinderKind('co2');
    expect(co2.size.litres).toBe(50);
    expect(co2.fill.contents).toBe(34);
    expect(cylinderName(co2)).toBe('Carbon dioxide cylinder, 50 l (34 kg)');
    expect(cylinderKind('propane', 'P47').fill.contents).toBe(47);
    expect(() => cylinderKind('chlorine', 'X2')).toThrow();
  });

  it('says only what the tag says', () => {
    const k = cylinderKind('oxygen', 'Z10');
    expect(cylinderStatus(k, 'empty')).toBe('2.1 m³ when full; tag EMPTY');
  });

  it('reads the tag from the contents', () => {
    expect(contentsFrom(34, 34)).toBe('full');
    expect(contentsFrom(12, 34)).toBe('in-use');
    expect(contentsFrom(0, 34)).toBe('empty');
  });

  it('stamps serial, pressures, tare and test date; the test is not yet due', () => {
    const k = cylinderKind('nitrogen');
    const lines = stampLines(k).join(' ');
    expect(lines).toMatch(/AG\d{6}/);
    expect(lines).toContain('TARE 62 kg');
    expect(lines).toContain('PW 230 BAR');
    const due = Number(testDates(k).due.split('/')[1]);
    expect(due).toBeGreaterThan(2026);
  });

  it('turns profiles that rise to the cylinder height', () => {
    for (const size of Object.values(CYLINDER_SIZES)) {
      if (size.build === 'seamless') {
        const p = seamlessProfile(size);
        expect(p.shoulder.at(-1)![1]).toBeCloseTo(size.h);
        expect(p.shoulderFrom).toBeLessThan(size.h);
        expect(Math.max(...p.body.map(([r]) => r))).toBeCloseTo(size.dia / 2);
      } else {
        const p = weldedProfile(size);
        expect(p.domeTop).toBeLessThan(size.h);
        expect(p.domeTop).toBeGreaterThan(p.foot);
      }
    }
  });
});
