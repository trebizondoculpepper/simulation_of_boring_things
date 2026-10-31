import { describe, expect, it } from 'vite-plus/test';
import { TANKS, VOLUME } from './museum-4-lab';
import {
  DOSES,
  SIZES,
  UNIT_OF_FORM,
  amountText,
  doseAmount,
  doseOf,
  doseText,
  doseWords,
  sizeShare,
} from './museum-4-doses';

describe("Hall 4's dose table", () => {
  it('has one entry for each tank, in its unit', () => {
    expect(DOSES.map((d) => d.tank).sort()).toEqual(
      TANKS.map((t) => t.id).sort(),
    );
    for (const t of TANKS) expect(doseOf(t.id).unit).toBe(t.unit);
  });

  it('gives each chemical the unit of its physical form', () => {
    for (const d of DOSES) expect(d.unit).toBe(UNIT_OF_FORM[d.form]);
    expect(doseOf('hcl').form).toBe('liquid');
    expect(doseOf('sodaAsh').form).toBe('solid');
  });

  it('is for the hall’s 500 m³ pool, each with a source and both texts', () => {
    expect(VOLUME).toBe(500);
    for (const d of DOSES) {
      expect(d.max).toBeGreaterThan(0);
      expect(d.source.length).toBeGreaterThan(20);
      expect(d.does.length).toBeGreaterThan(20);
      expect(d.use.length).toBeGreaterThan(20);
    }
  });

  it('makes Huge the maximum and each size √10 the one before', () => {
    expect(SIZES).toEqual(['TINY', 'SMALL', 'MEDIUM', 'LARGE', 'HUGE']);
    for (const d of DOSES) {
      expect(doseAmount(d.tank, 4)).toBeCloseTo(d.max);
      expect(doseAmount(d.tank, 0)).toBeCloseTo(d.max / 100);
      for (let i = 1; i < 5; i++)
        expect(doseAmount(d.tank, i) / doseAmount(d.tank, i - 1)).toBeCloseTo(
          Math.sqrt(10),
        );
    }
    expect(sizeShare(2)).toBeCloseTo(0.1);
  });

  it('rounds amounts sensibly for the screen and the words', () => {
    expect(doseText('bicarbonate', 2)).toBe('MEDIUM · 4.0 kg');
    expect(amountText('hcl', 4)).toBe('180 l');
    expect(amountText('fresh', 4)).toBe('100 m³');
    expect(amountText('hcl', 3)).toBe('57 l');
    expect(amountText('thiosulphate', 0)).toBe('0.25 kg');
    expect(doseWords('bicarbonate', 2)).toBe('Medium sodium bicarbonate');
  });
});
