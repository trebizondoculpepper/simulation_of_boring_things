import { describe, expect, it } from 'vite-plus/test';
import { createSystem, output, run, setInput, stepSystem } from '../sim/system';
import { HALL, POOL, hallHoldingHeat, poolHoldingHeat } from './pool-hall';
import { evaporationRate } from './evaporation';
import {
  ATTRACTIONS,
  CIRCUITS,
  WATER_BODIES,
  hallLoss,
  hallParams,
  poolParams,
} from './inventory';
import { OUTSIDE } from './heat-loss';

const reservoirWater = WATER_BODIES.find((b) => b.id === 'reservoir-water')!;
const reservoirHall = ATTRACTIONS.find((a) => a.id === 'reservoir')!;

/** The Reservoir: its water and its hall, heated as the plant would heat them. */
function reservoir(poolHeat: number, hallHeat: number, makeUp = 0) {
  return createSystem(
    {
      pool: { kind: POOL, params: poolParams(reservoirWater) },
      hall: { kind: HALL, params: hallParams(reservoirHall) },
    },
    { 'hall.evaporation': 'pool.evaporation' },
    { 'pool.heat': poolHeat, 'pool.makeUp': makeUp, 'hall.heat': hallHeat },
  );
}

const HOUR = 3600;

describe('a pool and its hall, as black boxes', () => {
  it('hold their temperatures given the heat the inventory sized for them', () => {
    const circuit = CIRCUITS.find((c) => c.id === 'reservoir')!;
    const pool = poolParams(reservoirWater);
    // The heat that holds it is the heat the inventory found it loses.
    expect(poolHoldingHeat(pool, pool.start)).toBeCloseTo(circuit.heat, 6);
    expect(
      hallHoldingHeat(
        hallParams(reservoirHall),
        hallParams(reservoirHall).start,
      ),
    ).toBeCloseTo(hallLoss(reservoirHall).total, 6);
    const s = run(
      reservoir(circuit.heat, hallLoss(reservoirHall).total),
      24 * HOUR,
      60,
    );
    expect(output(s, 'pool.temperature')).toBeCloseTo(pool.start, 6);
    expect(output(s, 'hall.temperature')).toBeCloseTo(
      hallParams(reservoirHall).start,
      6,
    );
  });

  it('evaporates as `evaporation.ts` says, and loses level without make-up', () => {
    const pool = poolParams(reservoirWater);
    const held = run(
      reservoir(poolHoldingHeat(pool, pool.start), 144),
      10 * HOUR,
      60,
    );
    const kgPerHour = output(held, 'pool.evaporation') as number;
    expect(kgPerHour).toBeCloseTo(
      evaporationRate(pool.area, pool.start, pool.activity),
      6,
    );
    // Ten hours' evaporation, spread over its surface.
    expect(output(held, 'pool.level')).toBeCloseTo(
      -(kgPerHour * 10) / 1000 / pool.area,
      6,
    );
    // Made up as fast as it evaporates, it stays brim full.
    const madeUp = run(
      reservoir(poolHoldingHeat(pool, pool.start), 144, kgPerHour / 1000),
      10 * HOUR,
      60,
    );
    expect(output(madeUp, 'pool.level')).toBeCloseTo(0, 6);
    // And its hall is asked to take that moisture out.
    expect(output(held, 'hall.dehumidify')).toBeCloseTo(kgPerHour, 6);
  });

  it('cools towards the cold world when the boilers lock out: the hall within a day, the water only slowly', () => {
    const circuit = CIRCUITS.find((c) => c.id === 'reservoir')!;
    let s = run(
      reservoir(circuit.heat, hallLoss(reservoirHall).total),
      HOUR,
      60,
    );
    s = setInput(setInput(s, 'pool.heat', 0), 'hall.heat', 0);
    const day = run(s, 24 * HOUR, 60);
    const pool = output(day, 'pool.temperature') as number;
    const hall = output(day, 'hall.temperature') as number;
    // The hall has lost much of its warmth (its concrete and tile give some
    // back as it goes); 1,600 m³ of water, only half a degree or so.
    expect(hall).toBeLessThan(
      (hallParams(reservoirHall).start + OUTSIDE) / 2 + 2,
    );
    expect(pool).toBeLessThan(reservoirWater.temperature - 0.2);
    expect(pool).toBeGreaterThan(reservoirWater.temperature - 2);
    // Left for a month, it has lost several degrees, and is still going.
    const month = run(day, 30 * 24 * HOUR, 600);
    expect(output(month, 'pool.temperature') as number).toBeLessThan(
      reservoirWater.temperature - 5,
    );
  });

  it('reads exactly while it sleeps, as stepping it second by second would', () => {
    const awake = (() => {
      let s = reservoir(0, 0);
      for (let i = 0; i < (6 * HOUR) / 10; i++)
        s = stepSystem(s, 10, { sleeping: false });
      return s;
    })();
    const asleep = run(reservoir(0, 0), 6 * HOUR, 10);
    expect(output(asleep, 'pool.temperature')).toBeCloseTo(
      output(awake, 'pool.temperature') as number,
      6,
    );
    expect(output(asleep, 'hall.temperature')).toBeCloseTo(
      output(awake, 'hall.temperature') as number,
      6,
    );
    expect(asleep.stats.stepped).toBeLessThan(awake.stats.stepped / 10);
  });

  it('makes a pool and a hall for every body of water and every attraction', () => {
    for (const b of WATER_BODIES) {
      const s = run(
        createSystem(
          { pool: { kind: POOL, params: poolParams(b) } },
          {},
          {
            'pool.heat': poolHoldingHeat(poolParams(b), b.temperature),
            'pool.makeUp': 0,
          },
        ),
        HOUR,
        60,
      );
      expect(output(s, 'pool.temperature')).toBeCloseTo(b.temperature, 6);
    }
    for (const a of ATTRACTIONS) {
      const s = run(
        createSystem(
          { hall: { kind: HALL, params: hallParams(a) } },
          {},
          {
            'hall.heat': hallLoss(a).total,
            'hall.evaporation': 0,
          },
        ),
        HOUR,
        60,
      );
      expect(output(s, 'hall.temperature')).toBeCloseTo(hallParams(a).start, 6);
    }
  });
});
