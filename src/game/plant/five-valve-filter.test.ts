import { describe, expect, it } from 'vite-plus/test';
import {
  BIG_FILTER,
  TRAVEL,
  fiveValveFlows,
  newFiveValve,
  setMode,
  stepFiveValve,
  supplyOn,
  valvesSet,
} from './five-valve-filter';
import type { FiveValveState } from './five-valve-filter';

const run = (s: FiveValveState, seconds: number) => {
  let state = s;
  for (let t = 0; t < seconds; t++) state = stepFiveValve(state, 1);
  return state;
};
const cleanService = { ...newFiveValve(), dirt: 0 };

describe('a five-valve filter', () => {
  it('in service: down through the bed, in by V1 and out by V2, about 170 m³/h clean', () => {
    const f = fiveValveFlows(cleanService);
    expect(f.valve.v1).toBeGreaterThan(150);
    expect(f.valve.v2).toBeCloseTo(f.valve.v1, 1);
    expect(f.bed).toBeCloseTo(f.valve.v1, 1);
    expect([f.valve.v3, f.valve.v4, f.valve.v5]).toEqual([0, 0, 0]);
    expect(f.bedBar).toBeCloseTo(0.25, 1);
  });

  it('dirty, it passes less and the difference across the bed is greater', () => {
    const dirty = fiveValveFlows(newFiveValve());
    const clean = fiveValveFlows(cleanService);
    expect(dirty.valve.v1).toBeLessThan(clean.valve.v1);
    expect(dirty.bedBar).toBeGreaterThan(clean.bedBar);
  });

  it('switches all five together: the supply off while they move, on again when set', () => {
    let s = setMode(newFiveValve(), 'backwash');
    s = stepFiveValve(s, 1);
    expect(valvesSet(s)).toBe(false);
    expect(supplyOn(s)).toBe(false);
    expect(fiveValveFlows(s).supply).toBe(0);
    s = run(s, TRAVEL);
    expect(valvesSet(s)).toBe(true);
    expect(supplyOn(s)).toBe(true);
    expect(s.opening).toEqual({ v1: 0, v2: 0, v3: 1, v4: 1, v5: 0 });
  });

  it('shows no flow anywhere while the valves travel with the supply off', () => {
    let s = setMode(newFiveValve(), 'backwash');
    for (let t = 0; t < TRAVEL - 1; t++) {
      s = stepFiveValve(s, 1);
      const f = fiveValveFlows(s);
      expect(Object.values(f.valve)).toEqual([0, 0, 0, 0, 0]);
      expect(f.bed).toBe(0);
    }
  });

  it('backwashes up through the bed, in by V3 and out by V4, washing the dirt out', () => {
    let s = run(setMode(newFiveValve(), 'backwash'), TRAVEL + 1);
    const f = fiveValveFlows(s);
    expect(f.bed).toBeLessThan(0);
    expect(f.valve.v3).toBeGreaterThan(0);
    expect(f.valve.v4).toBeCloseTo(f.valve.v3, 1);
    expect(f.valve.v2).toBe(0);
    const murky = f.wasteDirt;
    s = run(s, 360);
    expect(s.dirt).toBeLessThan(newFiveValve().dirt * 0.02);
    expect(fiveValveFlows(s).wasteDirt).toBeLessThan(murky * 0.05);
  });

  it('rinses down through the bed to waste: V1 in, V5 out', () => {
    const s = run(setMode(cleanService, 'rinse'), TRAVEL + 1);
    const f = fiveValveFlows(s);
    expect(f.bed).toBeGreaterThan(0);
    expect(f.valve.v5).toBeCloseTo(f.valve.v1, 1);
    expect(f.valve.v2).toBe(0);
  });

  it('passes nothing off, or with the supply stopped', () => {
    expect(
      fiveValveFlows(run(setMode(newFiveValve(), 'off'), TRAVEL + 1)).supply,
    ).toBe(0);
    expect(
      fiveValveFlows({ ...newFiveValve(), supplyWanted: false }).supply,
    ).toBe(0);
  });

  it('takes dirt in service', () => {
    expect(run(cleanService, 600).dirt).toBeGreaterThan(0);
    expect(BIG_FILTER.dirtRef).toBeGreaterThan(0);
  });
});
