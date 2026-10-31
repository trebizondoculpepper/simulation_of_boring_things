import { describe, expect, it } from 'vite-plus/test';
import {
  CO2_LINE,
  co2DistributionAlarms,
  linePressure,
  lineKgAt,
  masterOpen,
  newCo2Distribution,
  portLeak,
  portPressure,
  resetMaster,
  setManifoldLeak,
  setMaster,
  setMasterPower,
  setPortLeak,
  setPortOpen,
  stepCo2Distribution,
  tripMaster,
  withSupply,
} from './co2-distribution';
import type { Co2Distribution, Co2PortId } from './co2-distribution';
import {
  CO2_MANIFOLD,
  bankContents,
  bankInUse,
  setIsolation,
  throwLever,
} from '../../toolkit/components/plant/logic/co2-supply';

/** Run the distribution with steady draws, g/h, for `seconds` in `dt` steps. */
function run(
  d: Co2Distribution,
  draws: Partial<Record<Co2PortId, number>>,
  seconds: number,
  dt = 10,
) {
  const delivered = { plant_pool_01: 0, plant_pool_02: 0 };
  for (let t = 0; t < seconds; t += dt) {
    const s = stepCo2Distribution(d, draws, dt);
    d = s.state;
    delivered.plant_pool_01 += s.delivered.plant_pool_01;
    delivered.plant_pool_02 += s.delivered.plant_pool_02;
  }
  return { d, delivered };
}

describe('the CO₂ building line', () => {
  it('starts at the regulator’s 4 bar, about 88 g of gas in its 12 litres', () => {
    const d = newCo2Distribution(20);
    expect(linePressure(d)).toBeCloseTo(CO2_MANIFOLD.outlet, 6);
    expect(lineKgAt(4)).toBeCloseTo(0.088, 3);
    expect(portPressure(d, 'plant_pool_02')).toBeCloseTo(4, 6);
    expect(masterOpen(d)).toBe(true);
  });

  it('gives each port what it draws, at its pressure, from the bank in use', () => {
    const { d, delivered } = run(
      newCo2Distribution(20),
      { plant_pool_01: 300, plant_pool_02: 1200 },
      3600,
    );
    expect(delivered.plant_pool_01).toBeCloseTo(300, 3);
    expect(delivered.plant_pool_02).toBeCloseTo(1200, 3);
    expect(linePressure(d)).toBeCloseTo(4, 3);
    expect(bankContents(d.supply, 'left')).toBeCloseTo(4 * 34 - 1.5, 3);
    expect(bankContents(d.supply, 'right')).toBe(4 * 34);
  });

  it('holds its pressure with the master valve shut while nothing is drawn', () => {
    const { d } = run(setMaster(newCo2Distribution(20), false), {}, 3600);
    expect(linePressure(d)).toBeCloseTo(4, 6);
    expect(co2DistributionAlarms(d).lineLow).toBe(false);
  });

  it('falls within a couple of minutes when the master valve shuts and the dosing goes on drawing', () => {
    let d = setMaster(newCo2Distribution(20), false);
    const at = (s: number) => {
      d = run(d, { plant_pool_02: 2000 }, s, 1).d;
      return linePressure(d);
    };
    const p30 = at(30);
    expect(p30).toBeLessThan(4);
    expect(p30).toBeGreaterThan(CO2_LINE.lowAlarm);
    expect(at(90)).toBeLessThan(CO2_LINE.lowAlarm);
    expect(at(120)).toBe(0);
    // The master switched off: no LINE PRESSURE LOW (it is meant to be empty).
    expect(co2DistributionAlarms(d).lineLow).toBe(false);
    // Switched back on, it fills again.
    d = run(setMaster(d, true), { plant_pool_02: 2000 }, 60, 1).d;
    expect(linePressure(d)).toBeCloseTo(4, 3);
  });

  it('falls the same with the emergency isolation valve shut, the master unpowered, or the master tripped', () => {
    const base = newCo2Distribution(20);
    for (const d of [
      withSupply(base, (s) => setIsolation(s, false)),
      setMasterPower(base, false),
      tripMaster(base),
    ]) {
      const { d: after, delivered } = run(d, { plant_pool_01: 300 }, 3600);
      expect(linePressure(after)).toBe(0);
      // Only what was in the line came out.
      expect(delivered.plant_pool_01).toBeLessThan(lineKgAt(4) * 1000 + 1e-6);
      expect(co2DistributionAlarms(after).lineLow).toBe(true);
    }
  });

  it('keeps its trip until reset, and not while the detection still holds it', () => {
    const tripped = tripMaster(newCo2Distribution(20));
    expect(masterOpen(tripped)).toBe(false);
    expect(co2DistributionAlarms(tripped).masterTripped).toBe(true);
    expect(resetMaster(tripped, true)).toBe(tripped);
    expect(masterOpen(resetMaster(tripped))).toBe(true);
  });

  it('shows nothing at a shut wall port, and gives it nothing', () => {
    const d = setPortOpen(newCo2Distribution(20), 'plant_pool_01', false);
    expect(portPressure(d, 'plant_pool_01')).toBe(0);
    const s = stepCo2Distribution(d, { plant_pool_01: 300 }, 60);
    expect(s.delivered.plant_pool_01).toBe(0);
  });
});

describe('the cylinders behind it', () => {
  it('empty as the line is drawn, change over to the standby bank and call BANK EMPTY', () => {
    // Four 34 kg cylinders at 2 kg/h: some 64 hours before the bank falls to
    // the changeover pressure (about 2 kg a cylinder left as gas).
    let { d } = run(
      newCo2Distribution(20),
      { plant_pool_02: 2000 },
      60 * 3600,
      60,
    );
    expect(bankInUse(d.supply)).toBe('left');
    expect(co2DistributionAlarms(d).bankEmpty).toBe(false);
    d = run(d, { plant_pool_02: 2000 }, 8 * 3600, 60).d;
    expect(bankInUse(d.supply)).toBe('right');
    expect(co2DistributionAlarms(d).bankEmpty).toBe(true);
    // The line never noticed.
    expect(linePressure(d)).toBeCloseTo(4, 3);
    // The lever thrown makes the right the service bank; the left still wants changing.
    d = withSupply(d, throwLever);
    expect(d.supply.service).toBe('right');
    expect(co2DistributionAlarms(d).bankEmpty).toBe(true);
  });

  it('let the line fall when both banks are spent: SUPPLY EXHAUSTED', () => {
    const { d, delivered } = run(
      newCo2Distribution(20),
      { plant_pool_02: 2000 },
      140 * 3600,
      60,
    );
    const a = co2DistributionAlarms(d);
    expect(a.exhausted).toBe(true);
    expect(a.lineLow).toBe(true);
    expect(linePressure(d)).toBeLessThan(CO2_LINE.lowAlarm);
    expect(delivered.plant_pool_02 / 1000).toBeLessThan(8 * 34);
    expect(delivered.plant_pool_02 / 1000).toBeGreaterThan(8 * 34 - 3);
  });
});

describe('leaks', () => {
  it('a port’s leaking joint gives gas into its room, in proportion to the pressure', () => {
    let d = setPortLeak(newCo2Distribution(20), 'plant_pool_01', 500);
    expect(portLeak(d, 'plant_pool_01')).toBeCloseTo(500, 6);
    const s = stepCo2Distribution(d, {}, 3600);
    expect(s.leaked.plant_pool_01).toBeCloseTo(500, 3);
    expect(s.leaked.plant_pool_02).toBe(0);
    d = setPortOpen(d, 'plant_pool_01', false);
    expect(portLeak(d, 'plant_pool_01')).toBe(0);
  });

  it('a leaking pigtail gives the cylinders’ gas into the loading bay, master valve or no', () => {
    const d = setMaster(setManifoldLeak(newCo2Distribution(20), 1000), false);
    const s = stepCo2Distribution(d, {}, 3600);
    expect(s.leaked.loading_bay).toBeCloseTo(1000, 3);
    expect(bankContents(s.state.supply, 'left')).toBeCloseTo(4 * 34 - 1, 3);
  });
});
