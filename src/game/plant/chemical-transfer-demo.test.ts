import { describe, expect, it } from 'vite-plus/test';
import {
  TRANSFER,
  actOnTransfer,
  describeTank,
  levelOf,
  levelTrend,
  newTransferTrial,
  pumpRunning,
  stepTransfer,
  valveOpen,
} from './chemical-transfer-demo';
import type { TransferTrial } from './chemical-transfer-demo';

const run = (s: TransferTrial, seconds: number, step = 1) => {
  for (let t = 0; t < seconds; t += step) s = stepTransfer(s, step);
  return s;
};
/** A trial with its tanks at these litres, none dosing unless asked. */
const at = (litres: number[], dosing = false): TransferTrial => {
  const s = newTransferTrial(
    litres.map((_, i) => `T${i + 1}`),
    200,
  );
  return {
    ...s,
    tanks: s.tanks.map((t, i) => ({
      ...t,
      litres: litres[i],
      doseLpm: dosing ? t.doseLpm : 0,
    })),
  };
};

describe('the transfer trial: one transfer set, a selector, several day tanks', () => {
  it('fills a low day tank to its high switch through its own valve, then stops', () => {
    let s = stepTransfer(at([30, 150]), 1);
    expect(valveOpen(s, 0)).toBe(true);
    expect(valveOpen(s, 1)).toBe(false);
    expect(pumpRunning(s)).toBe(true);
    s = run(s, 600);
    expect(levelOf(s.tanks[0])).toBeGreaterThanOrEqual(TRANSFER.high - 0.02);
    expect(levelOf(s.tanks[0])).toBeLessThan(TRANSFER.highHigh);
    expect(s.tanks[1].litres).toBe(150);
    expect(s.serving).toBe(null);
    expect(pumpRunning(s)).toBe(false);
    expect(s.delivered).toBeGreaterThan(140);
  });

  it('serves calling tanks one at a time, in turn, never two valves open', () => {
    let s = at([30, 35, 150]);
    const served = new Set<number>();
    for (let t = 0; t < 1200; t++) {
      s = stepTransfer(s, 1);
      expect(
        s.tanks.filter((_, i) => valveOpen(s, i)).length,
      ).toBeLessThanOrEqual(1);
      if (s.serving !== null) served.add(s.serving);
    }
    expect([...served].sort()).toEqual([0, 1]);
    expect(levelOf(s.tanks[0])).toBeGreaterThan(TRANSFER.high - 0.02);
    expect(levelOf(s.tanks[1])).toBeGreaterThan(TRANSFER.high - 0.02);
  });

  it('keeps every day tank between its switches as they dose, round and round', () => {
    const s = run(newTransferTrial(), 4 * 3600, 5);
    for (const t of s.tanks) {
      expect(levelOf(t)).toBeGreaterThan(TRANSFER.low - 0.06);
      expect(levelOf(t)).toBeLessThan(TRANSFER.highHigh);
    }
    expect(s.delivered).toBeGreaterThan(800);
  });

  it('in HAND sends to the tank picked only, even if another calls', () => {
    let s = actOnTransfer(at([30, 100]), { act: 'mode', to: 'hand' });
    s = actOnTransfer(s, { act: 'pick', tank: 1 });
    s = stepTransfer(s, 1);
    expect(valveOpen(s, 1)).toBe(true);
    expect(valveOpen(s, 0)).toBe(false);
  });

  it('stands the pump in OFF, the tank calling regardless', () => {
    let s = actOnTransfer(at([30]), { act: 'hoa', to: 'off' });
    s = stepTransfer(s, 1);
    expect(s.serving).toBe(0);
    expect(pumpRunning(s)).toBe(false);
  });

  it('trips the pumps and shuts the valves at high-high, until reset below it', () => {
    let s = actOnTransfer(at([30, 197]), { act: 'hoa', to: 'hand' });
    s = stepTransfer(s, 1);
    expect(s.tripped).toBe(true);
    expect(s.serving).toBe(null);
    expect(pumpRunning(s)).toBe(false);
    expect(actOnTransfer(s, { act: 'reset' }).tripped).toBe(true);
    s = { ...s, tanks: s.tanks.map((t) => ({ ...t, litres: 100 })) };
    expect(actOnTransfer(s, { act: 'reset' }).tripped).toBe(false);
  });

  it('never overfills or goes below empty', () => {
    let s = at([0, 0, 0], true);
    s = run(s, 5000, 3);
    for (const t of s.tanks) {
      expect(t.litres).toBeGreaterThanOrEqual(0);
      expect(t.litres).toBeLessThanOrEqual(t.capacity);
    }
  });
});

describe('a tank in words', () => {
  it('says what it holds, how full, and which way and how fast it moves', () => {
    expect(describeTank('Hydrochloric acid day tank', 0.62, 2)).toBe(
      'Hydrochloric acid day tank, about 62% full, filling slowly',
    );
    expect(describeTank('Acid tank', 0.98, -12)).toBe(
      'Acid tank, about 98% full, draining quickly',
    );
    expect(describeTank('Acid tank', 0.5, 0.05)).toBe(
      'Acid tank, about 50% full, steady',
    );
    expect(describeTank('Acid tank', 1, 0)).toBe('Acid tank, full, steady');
  });

  it('reads the trend from the level as it changes', () => {
    const trend = levelTrend(2);
    let litres = 100;
    for (let i = 0; i < 100; i++) {
      litres += 20 / 60 / 10;
      trend.sample(litres, 0.1);
    }
    expect(trend.lpm()).toBeCloseTo(20, 0);
  });
});
