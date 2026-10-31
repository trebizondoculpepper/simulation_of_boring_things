import { describe, expect, it } from 'vite-plus/test';
import { applyAction, newWorld } from '../world';
import type { World } from '../world';
import { actionEvents } from '../events/describe-action';
import { formatEvent } from '../events/game-event';
import { CONSERVED, readings } from '../water/pool-chemistry';
import type { PoolChemistry } from '../water/pool-chemistry';
import { POOL_CELL_SHARES } from '../water/circuit';
import { advise } from './aqualis-advisor';
import { trioSettings } from './aqualis-world';
import type { AqualisReadings, ChannelView } from './aqualis-types';
import {
  HAND_CHEMICALS,
  amountText,
  chemicalNamed,
  doseVolume,
  handChemical,
  parseAmount,
} from './hand-dose';
import type { HandChemical } from './hand-dose';
import { poolArea, poolVolume } from './pools';
import type { PoolId } from './pools';

type Species = (typeof CONSERVED)[number];

/** A species' mean over a pool's whole circuit, by volume: what it comes to once the circulation has mixed it. */
function mixed(world: World, id: PoolId, k: Species) {
  const c = world.treatment.circuits[id];
  const p = world.pools[id];
  const vTank = doseVolume(id, p, 'balance-tank');
  const vPool = poolVolume(id) + p.level * poolArea(id);
  const total =
    c.tank[k] * vTank +
    c.pool.reduce((t, w, i) => t + w[k] * vPool * POOL_CELL_SHARES[i], 0);
  return total / (vTank + vPool);
}

const dosed = (
  chemical: HandChemical,
  amount: number,
  into?: 'balance-tank' | 'pool',
  id: PoolId = 'pool_01',
) => {
  const before = newWorld();
  const action = {
    type: 'hand/dose' as const,
    pool: id,
    chemical,
    amount,
    into,
  };
  const after = applyAction(before, action);
  return { before, after, action };
};

/** The readings an ideal analyser gives of a water. */
function readingsOf(w: PoolChemistry, T: number): AqualisReadings {
  const r = readings(w, T);
  return {
    freeChlorine: w.freeChlorine,
    combinedChlorine: r.combinedChlorine,
    totalChlorine: r.totalChlorine,
    ph: w.ph,
    alkalinity: w.alkalinity,
    calciumHardness: w.hardness,
    lsi: r.langelier,
    tds: w.tds,
    sulphate: w.sulphate,
    temperature: T,
  };
}

const ONLINE: ChannelView[] = (['hypochlorite', 'acid', 'co2'] as const).map(
  (id) => ({
    id,
    status: { kind: 'online' },
    demand: 0,
    demandRate: 0,
    delivering: 0,
  }),
);

describe('a hand dose, against Dr Aqualis’s Show dose', () => {
  const world = newWorld();
  const tank = world.treatment.circuits.pool_01.tank;
  const T = world.pools.pool_01.temperature;
  const advice = advise(
    readingsOf(tank, T),
    trioSettings('pool_01'),
    ONLINE,
    tank,
  ).find((a) => a.id === 'alkalinity-low');
  const set = trioSettings('pool_01').targets.alkalinity.set;

  it('the Lounge starts with its alkalinity low, and he says how much bicarbonate', () => {
    expect(advice?.dose?.unit).toBe('kg');
    // 50.7 to 120 mg/l in his 150 m³: about 17.4 kg.
    expect(advice?.dose?.amount).toBeCloseTo(17.4, 1);
  });

  it('18 kg of bicarbonate raises the Lounge’s alkalinity by about what he predicts, once mixed', () => {
    const kg = advice!.dose!.amount;
    const predicted = ((set - tank.alkalinity) / kg) * 18;
    const { before, after } = dosed('bicarbonate', 18);
    const rise =
      mixed(after, 'pool_01', 'alkalinity') -
      mixed(before, 'pool_01', 'alkalinity');
    // His volume is the pool and its tank full (150 m³); the circuit holds
    // a little less (the tank two-thirds full), so the rise is a little more.
    expect(rise / predicted).toBeGreaterThan(1);
    expect(rise / predicted).toBeLessThan(1.05);
    // His own dose, mixed, brings it to his set point near enough.
    const own = dosed('bicarbonate', kg);
    expect(mixed(own.after, 'pool_01', 'alkalinity')).toBeCloseTo(set, -1);
  });

  it('goes into the balance tank, not the pool, until the circulation carries it', () => {
    const { before, after } = dosed('bicarbonate', 18);
    const b = before.treatment.circuits.pool_01;
    const a = after.treatment.circuits.pool_01;
    expect(a.tank.alkalinity).toBeGreaterThan(b.tank.alkalinity + 1000);
    expect(a.pool).toBe(b.pool);
    expect(after.pools.pool_01.ph).toBe(before.pools.pool_01.ph);
  });

  it('or into the pool’s return side, its first cell, when told', () => {
    const { before, after } = dosed('bicarbonate', 18, 'pool');
    const b = before.treatment.circuits.pool_01;
    const a = after.treatment.circuits.pool_01;
    expect(a.tank).toBe(b.tank);
    expect(a.pool[0].alkalinity).toBeGreaterThan(b.pool[0].alkalinity + 100);
    expect(a.pool[1]).toBe(b.pool[1]);
    expect(a.pool[2]).toBe(b.pool[2]);
  });
});

describe('each chemical moves its own parameter', () => {
  const rise = (chemical: HandChemical, amount: number, k: Species) => {
    const { before, after } = dosed(chemical, amount);
    return mixed(after, 'pool_01', k) - mixed(before, 'pool_01', k);
  };
  const tankPh = (chemical: HandChemical, amount: number, into?: 'pool') => {
    const { before, after } = dosed(chemical, amount, into);
    const zone = (w: World) =>
      into
        ? w.treatment.circuits.pool_01.pool[0]
        : w.treatment.circuits.pool_01.tank;
    return zone(after).ph - zone(before).ph;
  };
  const V = () => {
    const w = newWorld();
    return (
      doseVolume('pool_01', w.pools.pool_01, 'balance-tank') +
      poolVolume('pool_01') +
      w.pools.pool_01.level * poolArea('pool_01')
    );
  };

  it('bicarbonate: alkalinity, 50.04/84.007 mg/l per mg/l', () => {
    expect(rise('bicarbonate', 10, 'alkalinity')).toBeCloseTo(
      ((10000 / V()) * 50.04) / 84.007,
      1,
    );
  });
  it('soda ash: alkalinity at twice the equivalents, and the pH up', () => {
    expect(rise('sodaAsh', 10, 'alkalinity')).toBeCloseTo(
      ((10000 / V()) * 2 * 50.04) / 105.99,
      1,
    );
    expect(tankPh('sodaAsh', 1)).toBeGreaterThan(0.1);
  });
  it('calcium chloride: hardness', () => {
    expect(rise('calciumChloride', 10, 'hardness')).toBeCloseTo(
      ((10000 / V()) * 100.09) / 110.98,
      1,
    );
  });
  it('thiosulphate: thiosulphate in the water', () => {
    expect(rise('thiosulphate', 1, 'thiosulphate')).toBeCloseTo(1000 / V(), 2);
  });
  it('bisulphate: alkalinity down and sulphate up', () => {
    expect(rise('bisulphate', 5, 'alkalinity')).toBeLessThan(-10);
    expect(rise('bisulphate', 5, 'sulphate')).toBeCloseTo(
      ((5000 / V()) * 96.06) / 120.06,
      1,
    );
  });
  it('hypochlorite: 140 g of available chlorine a litre', () => {
    expect(rise('hypochlorite', 10, 'freeChlorine')).toBeCloseTo(1400 / V(), 2);
    expect(rise('hypochlorite', 10, 'chlorate')).toBeGreaterThan(0);
  });
  it('acid: 104.8 g of HCl a litre takes alkalinity away', () => {
    expect(rise('acid', 10, 'alkalinity')).toBeCloseTo(
      ((-1048 / V()) * 50.04) / 36.461,
      1,
    );
    expect(tankPh('acid', 1)).toBeLessThan(-0.1);
  });
  it('CO₂: the pH down, the alkalinity unchanged, at the injection point by default', () => {
    const { before, after } = dosed('co2', 200);
    const b = before.treatment.circuits.pool_01;
    const a = after.treatment.circuits.pool_01;
    expect(a.tank).toBe(b.tank);
    expect(a.pool[0].ph).toBeLessThan(b.pool[0].ph - 0.05);
    expect(a.pool[0].alkalinity).toBeCloseTo(b.pool[0].alkalinity, 6);
    expect(a.pool[0].carbonate).toBeGreaterThan(b.pool[0].carbonate);
  });
  it('nothing, or an unknown chemical, changes nothing', () => {
    const w = newWorld();
    expect(
      applyAction(w, {
        type: 'hand/dose',
        pool: 'pool_01',
        chemical: 'bicarbonate',
        amount: 0,
      }),
    ).toBe(w);
    expect(
      applyAction(w, {
        type: 'hand/dose',
        pool: 'pool_01',
        chemical: 'treacle' as HandChemical,
        amount: 1,
      }),
    ).toBe(w);
  });
});

describe('the units', () => {
  const bicarb = handChemical('bicarbonate')!;
  const hypo = handChemical('hypochlorite')!;
  const co2 = handChemical('co2')!;
  it('converts weights and volumes to each chemical’s normal unit', () => {
    expect(parseAmount(bicarb, '18kg')).toEqual({ amount: 18 });
    expect(parseAmount(bicarb, '18 kg')).toEqual({ amount: 18 });
    expect(parseAmount(bicarb, '500g')).toEqual({ amount: 0.5 });
    expect(parseAmount(bicarb, '18')).toEqual({ amount: 18 });
    expect(parseAmount(hypo, '2.5l')).toEqual({ amount: 2.5 });
    expect(parseAmount(hypo, '250ml')).toEqual({ amount: 0.25 });
    expect(parseAmount(hypo, '3 litres')).toEqual({ amount: 3 });
    expect(parseAmount(co2, '200g')).toEqual({ amount: 200 });
    expect(parseAmount(co2, '1.5kg')).toEqual({ amount: 1500 });
    expect(parseAmount(co2, '50')).toEqual({ amount: 50 });
  });
  it('refuses a volume of a solid, a weight of a solution, an unknown unit or nothing', () => {
    expect(parseAmount(bicarb, '2l')).toEqual({
      error: 'sodium bicarbonate is measured by weight: say kg or g',
    });
    expect(parseAmount(hypo, '2kg')).toEqual({
      error: 'sodium hypochlorite (14 %) is measured by volume: say l or ml',
    });
    expect(parseAmount(bicarb, '2 cups')).toEqual({
      error: 'no unit "cups" (say kg, g, l or ml)',
    });
    expect('error' in parseAmount(bicarb, 'lots')).toBe(true);
    expect('error' in parseAmount(bicarb, '0kg')).toBe(true);
    expect('error' in parseAmount(bicarb, '-3kg')).toBe(true);
  });
  it('says small amounts in the smaller unit', () => {
    expect(amountText(bicarb, 18)).toBe('18 kg');
    expect(amountText(bicarb, 0.5)).toBe('500 g');
    expect(amountText(hypo, 0.25)).toBe('250 ml');
    expect(amountText(co2, 200)).toBe('200 g');
  });
});

describe('the aliases', () => {
  it('names each chemical by the words the console knows', () => {
    const cases: [string, HandChemical][] = [
      ['bicarb', 'bicarbonate'],
      ['BICARBONATE', 'bicarbonate'],
      ['sodaash', 'sodaAsh'],
      ['sodaAsh', 'sodaAsh'],
      ['cacl2', 'calciumChloride'],
      ['thio', 'thiosulphate'],
      ['hypo', 'hypochlorite'],
      ['acid', 'acid'],
      ['hcl', 'acid'],
      ['bisulphate', 'bisulphate'],
      ['co2', 'co2'],
    ];
    for (const [word, id] of cases) expect(chemicalNamed(word)?.id).toBe(id);
    expect(chemicalNamed('treacle')).toBeUndefined();
  });
  it('no alias names two chemicals', () => {
    const all = HAND_CHEMICALS.flatMap((c) => c.aliases);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('the log', () => {
  it('says what went in, where, and who', () => {
    const { before, after, action } = dosed('bicarbonate', 18);
    const lines = actionEvents(before, action, after, 'console').map(
      formatEvent,
    );
    expect(lines[0]).toMatch(
      /pool_01 {7}18 kg sodium bicarbonate added to the balance tank \(by console\)$/,
    );
  });
  it('CO₂ at the injection point', () => {
    const { before, after, action } = dosed('co2', 200);
    expect(actionEvents(before, action, after, 'console')[0].text).toBe(
      '200 g CO₂ added to the pool, at the injection point',
    );
  });
});
