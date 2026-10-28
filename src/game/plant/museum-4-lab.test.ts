import { describe, expect, it } from 'vite-plus/test';
import {
  CARDS,
  FITTINGS,
  HALL4_MODEL,
  TAGS,
  actOnHall4,
  balanceTerms,
  hall4Expansion,
  newHall4,
  readWater,
  runHall4,
  vfdLine,
  waterLine,
} from './museum-4-lab';
import type { TankId } from './museum-4-lab';
import { readings } from '../water/pool-chemistry';
import { dosed, quiet } from './museum-4-lab.test-support';

const r0 = readWater(quiet().bench.pool);
const after = (tank: TankId, amount: number) =>
  readWater(dosed(quiet(), tank, amount).bench.pool);

describe('Hall 4’s schematic', () => {
  it('is complete: the plumber adds nothing', () => {
    expect(hall4Expansion().added).toEqual([]);
  });
  it('derives its tags', () => {
    expect(TAGS['hcl.v']).toBe('M4-CT3-V1');
    expect(TAGS['fresh.v']).toBe('M4-FW1-V1');
    expect(TAGS['pump.nrv']).toBe('M4-P1-NRV1');
    expect(TAGS['pump.discharge']).toBe('M4-P1-V2');
    expect(TAGS['flow']).toBe('M4-FT1');
    expect(TAGS['meter.so4']).toBe('M4-AI9');
    expect(FITTINGS.length).toBe(14);
  });
});

describe('Hall 4’s reset water', () => {
  it('is the PHREEQC base water with 1.3 mg/l of chlorine', () => {
    expect(r0.fc).toBe(1.3);
    expect(r0.ph).toBeCloseTo(7.4, 9);
    expect(r0.ta).toBe(120);
    expect(r0.ch).toBe(200);
    expect(r0.cc).toBe(0);
    expect(r0.tdsAbove).toBe(580);
    expect(r0.lsi).toBeCloseTo(-0.148, 3);
  });
  it('RESET and entry are the same', () => {
    const a = HALL4_MODEL.reset(50000);
    const b = newHall4(50000);
    expect(a).toEqual(b);
    expect(a.log[0]).toBe('13:53 NEW SHEET: RESET WATER');
  });
});

describe('Try it, through the station (the model’s numbers)', () => {
  it('1: 10 l of hypochlorite: +2.8 free chlorine, +2.1 alkalinity, +4.7 TDS, pH up', () => {
    const r = after('hypo', 10);
    expect(r.fc - r0.fc).toBeCloseTo(2.8, 3);
    expect(r.ta - r0.ta).toBeCloseTo(2.13, 2);
    expect(r.tdsAbove - r0.tdsAbove).toBeCloseTo(4.74, 2);
    expect(r.ph).toBeCloseTo(7.459, 3);
  });
  it('2: 12.7 l of 10 % acid: pH 7.245, alkalinity −3.65', () => {
    const r = after('hcl', 12.7);
    expect(r.ph).toBeCloseTo(7.245, 3);
    expect(r.ta - r0.ta).toBeCloseTo(-3.65, 2);
  });
  it('3: the same alkalinity from bicarbonate and soda ash, very different pH', () => {
    const b = after('bicarbonate', 8.4);
    const a = after('sodaAsh', 5.3);
    expect(b.ta - r0.ta).toBeCloseTo(10, 1);
    expect(a.ta - r0.ta).toBeCloseTo(10, 1);
    expect(b.ph).toBeCloseTo(7.432, 3);
    expect(a.ph).toBeCloseTo(7.733, 3);
  });
  it('4: 5 kg of CO2: pH 7.054, alkalinity unchanged', () => {
    const r = after('co2', 5);
    expect(r.ph).toBeCloseTo(7.054, 3);
    expect(r.ta).toBeCloseTo(120, 3);
  });
  it('5: 55.5 kg of calcium chloride: hardness +100, pH 7.397, the index up', () => {
    const r = after('calciumChloride', 55.5);
    expect(r.ch - r0.ch).toBeCloseTo(100.1, 1);
    expect(r.ph).toBeCloseTo(7.397, 3);
    expect(r.lsi).toBeGreaterThan(r0.lsi + 0.15);
  });
  it('6: 1 kg of thiosulphate takes 0.4 mg/l of chlorine away', () => {
    expect(after('thiosulphate', 1).fc - r0.fc).toBeCloseTo(-0.4, 2);
  });
  it('11: calcium hypochlorite moves the hardness, sodium does not', () => {
    expect(after('calHypo', 2.15).ch - r0.ch).toBeCloseTo(2.02, 2);
    expect(after('hypo', 10).ch).toBeCloseTo(r0.ch, 3);
  });
  it('dry acid adds sulphate; fresh water takes it away', () => {
    expect(after('bisulphate', 5).so4 - r0.so4).toBeCloseTo(8.0, 2);
    expect(after('fresh', 100).so4).toBeLessThan(r0.so4);
  });
  it('7: twenty swimmers use chlorine and make combined chlorine', () => {
    const s = runHall4(actOnHall4(quiet(), { type: 'group' }), 3600);
    const r = readWater(s.bench.pool);
    expect(r.fc).toBeCloseTo(1.205, 2);
    expect(r.cc).toBeCloseTo(0.016, 3);
    expect(s.log.some((l) => l.endsWith('+20 SWIMMERS ARRIVE'))).toBe(true);
  });
});

describe('the station', () => {
  it('shows its choice on the VFD and logs the dose', () => {
    let s = actOnHall4(quiet(), { type: 'select', tank: 'hcl' });
    s = actOnHall4(s, { type: 'wheel', digit: 1, by: 1 });
    s = actOnHall4(s, { type: 'wheel', digit: 2, by: 1 });
    s = actOnHall4(s, { type: 'wheel', digit: 2, by: 1 });
    expect(vfdLine(s)).toBe('HCl 10% 012.0 l READY');
    s = actOnHall4(s, { type: 'dose' });
    expect(vfdLine(s)).toContain('DOSING');
    s = runHall4(s, 5);
    expect(s.used.hcl).toBeCloseTo(12, 9);
    expect(s.log.some((l) => l.endsWith('DOSE CT3 HCl 10% 12.0 l'))).toBe(true);
  });
  it('wraps a thumbwheel both ways', () => {
    const s = actOnHall4(quiet(), { type: 'wheel', digit: 0, by: -1 });
    expect(s.dial).toBe(9000);
  });
  it('prints the water every hour of plant time', () => {
    const s = runHall4(quiet(), 3 * 3600, 10);
    expect(s.log.filter((l) => / FC /.test(l)).length).toBe(4);
    expect(waterLine(s.bench.pool)).toMatch(
      /^FC \d\.\d\d CC .* SO4 \d+ LSI [+-]\d\.\d\d$/,
    );
  });
});

describe('the Balance Beam', () => {
  it('its four terms sum to the model’s index', () => {
    for (const c of CARDS) {
      const w = c.water();
      const t = balanceTerms(w);
      expect(t.ph + t.hardness + t.alkalinity + t.temperatureTds).toBeCloseTo(
        readings(w, 28).langelier,
        3,
      );
    }
  });
});

describe('the challenge cards', () => {
  it('each starts with its problem', () => {
    const r = (id: string) =>
      readWater(CARDS.find((c) => c.id === id)!.water());
    expect(r('combined-chlorine').cc).toBeGreaterThan(1);
    expect(r('low-alkalinity').ta).toBeLessThan(80);
    expect(r('high-ph').ph).toBeGreaterThan(7.6);
    expect(r('acid-overdose').ph).toBeLessThan(7.0);
    expect(r('low-hardness').ch).toBeLessThan(60);
    expect(r('high-tds').tdsAbove).toBeGreaterThan(1500);
    expect(r('dechlorination').fc).toBeGreaterThan(18);
    expect(r('stabiliser').hoclShare).toBeLessThan(5);
    expect(r('hard-water').lsi).toBeGreaterThan(0.5);
    expect(r('sulphate').so4).toBeCloseTo(400, 6);
    expect(r('sulphate').ph).toBeCloseTo(7.4, 6);
  });
  it('START puts the card’s water in and logs its symptom', () => {
    let s = actOnHall4(quiet(), { type: 'card', by: 2 });
    s = actOnHall4(s, { type: 'start-card' });
    expect(s.active).toBe('high-ph');
    expect(s.log.at(-3)).toContain('CARD 3 HIGH PH');
  });
});
