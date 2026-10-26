import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../world';
import type { World } from '../world';
import { serviceAvailable } from './services';
import {
  siteLoadKw,
  stepIntakeMeters,
  newSiteIntake,
  withIntake,
} from './site-intake';
import type { IntakeService } from './site-intake';

const set = (w: World, service: IntakeService, open: boolean) =>
  applyAction(w, { type: 'intake', action: { act: 'set', service, open } });

describe('the site’s intake in the goods yard', () => {
  it('starts with every outside device open and the meters at plausible readings', () => {
    const w = newWorld();
    expect(w.intake.open).toEqual({ water: true, gas: true, power: true });
    expect(w.intake.meters.power).toBeGreaterThan(1000);
  });

  it('cuts the power to the whole site at the outside isolator, the main switch inside untouched', () => {
    let w = set(newWorld(), 'power', false);
    w = advance(w, 10, 1);
    expect(w.plant.sources.power).toBe(true);
    expect(
      serviceAvailable(withIntake(w.plant, w.intake), 'plant_pool_02', 'power'),
    ).toBe(false);
    // And on again, the site's power back.
    w = advance(set(w, 'power', true), 10, 1);
    expect(
      serviceAvailable(withIntake(w.plant, w.intake), 'plant_pool_02', 'power'),
    ).toBe(true);
  });

  it('holds either of a pair shut without moving the other', () => {
    let w = applyAction(newWorld(), {
      type: 'boiler-gas',
      action: { act: 'ecv', open: false },
    } as never);
    w = set(w, 'gas', false);
    w = advance(w, 5, 1);
    expect(w.intake.open.gas).toBe(false);
    w = set(w, 'gas', true);
    w = advance(w, 5, 1);
    expect(w.intake.open.gas).toBe(true);
  });

  it('stops the break tank filling with the water shut, its stored water still there', () => {
    let w = newWorld();
    // Draw the tank down a little first, so it would call for water.
    w = {
      ...w,
      wetHall: { ...w.wetHall, breakTank: w.wetHall.breakTank * 0.5 },
    };
    const shut = advance(set(w, 'water', false), 600, 1);
    const open = advance(w, 600, 1);
    expect(shut.wetHall.breakTank).toBeLessThanOrEqual(
      w.wetHall.breakTank + 1e-9,
    );
    expect(open.wetHall.breakTank).toBeGreaterThan(w.wetHall.breakTank);
    expect(shut.wetHall.breakTank).toBeGreaterThan(0);
    // Its meter counts nothing while shut.
    expect(shut.intake.meters.water).toBeCloseTo(w.intake.meters.water);
  });

  it('counts the site’s electricity while it runs, and none with the power off', () => {
    const w = newWorld();
    const load = siteLoadKw(w);
    expect(load).toBeGreaterThan(20);
    const on = advance(w, 3600, 10);
    expect(on.intake.meters.power - w.intake.meters.power).toBeGreaterThan(
      load * 0.5,
    );
    const off = advance(set(w, 'power', false), 3600, 10);
    expect(off.intake.meters.power).toBeCloseTo(w.intake.meters.power);
  });

  it('integrates a known load into kWh, additively and never backwards', () => {
    const s = newSiteIntake();
    const one = stepIntakeMeters(s, { water: 0, gas: 0, power: 36 }, 3600);
    expect(one.meters.power - s.meters.power).toBeCloseTo(36);
    const neg = stepIntakeMeters(s, { water: -5, gas: -1, power: -9 }, 3600);
    expect(neg.meters).toEqual(s.meters);
  });
});
