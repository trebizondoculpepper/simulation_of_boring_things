import { describe, expect, it } from 'vite-plus/test';
import {
  FITTINGS,
  HALL3_MODEL,
  INSTRUMENTS,
  TAGS,
  actOnHall3,
  hall3Expansion,
  hall3Readings,
  newHall3,
  runHall3,
} from './museum-3-dosing';
import { CONSERVED } from '../water/pool-chemistry';
import { hallSession } from '../../toolkit/gallery/logic/museum-time';

describe('Hall 3’s schematic', () => {
  it('derives every tag from the model, room code M3', () => {
    expect(
      Object.fromEntries(
        [...FITTINGS.map((f) => f.id), ...INSTRUMENTS.map((i) => i.id)].map(
          (id) => [id, TAGS[id]],
        ),
      ),
    ).toEqual({
      'poolPump.suction.iso': 'M3-P1-V1',
      'poolPump.nrv': 'M3-P1-NRV1',
      'poolPump.discharge.iso': 'M3-P1-V2',
      'discharge.meter': 'M3-FT1',
      'sample.iso': 'M3-SC1-V1',
      'sample.needle': 'M3-SC1-V2',
      'hypoTank.fill': 'M3-DT1-V1',
      'acidTank.fill': 'M3-DT2-V1',
      'hypoPump.injection': 'M3-DP1-NRV1',
      'hypoPump.bleed': 'M3-DP1-V1',
      'acidPump.injection': 'M3-DP2-NRV1',
      'acidPump.bleed': 'M3-DP2-V1',
      'cell.fs': 'M3-FS1',
      'cell.cl': 'M3-AE1',
      'cell.ph': 'M3-AE2',
      'cell.tap': 'M3-SP1',
      'hypoTank.li': 'M3-LI1',
      'acidTank.li': 'M3-LI2',
      'board.cl': 'M3-QI1',
      'board.ph': 'M3-QI2',
      controller: 'M3-DC1',
      chart: 'M3-QR1',
      testKit: 'M3-TK1',
    });
  });

  it('gives every fitting, so the plumber adds nothing', () => {
    const e = hall3Expansion();
    expect(e.added).toEqual([]);
    const ids = new Set(e.fittings.map((f) => f.id));
    for (const f of FITTINGS) expect(ids.has(f.id), f.id).toBe(true);
  });
});

describe('Hall 3 at reset', () => {
  it('is the same on entry and on RESET, its water at 1.3 mg/l and pH 7.3', () => {
    const entry = hallSession(HALL3_MODEL, 36000).state;
    const used = runHall3(actOnHall3(entry, { type: 'air' }), 600);
    expect(actOnHall3(used, { type: 'reset', now: 36000 })).toEqual(entry);
    const r = hall3Readings(entry);
    expect(r.free).toBeCloseTo(1.3, 6);
    expect(r.ph).toBeCloseTo(7.3, 6);
    expect(r.hypoLitres).toBe(60);
    expect(entry.tank.freeChlorine).toBe(entry.pool[2].freeChlorine);
  });

  it('carries every species round the loop: with no dosing and no swimmers, nothing is made or lost but by reaction', () => {
    let s = actOnHall3(newHall3(0), { type: 'swimmers', swimmers: 'closed' });
    s = runHall3(s, 600);
    for (const k of CONSERVED)
      if (k === 'hardness' || k === 'sulphate' || k === 'cyanuric')
        expect(s.pool[0][k], k).toBeCloseTo(s.tank[k], 0);
  });
});

describe('Hall 3, its controller and its test kit (Try it 3, 6)', () => {
  it('agrees with the DPD test, ideal probes', () => {
    const s = actOnHall3(runHall3(newHall3(36000), 120), { type: 'test' });
    expect(s.test!.dpd1).toBeCloseTo(hall3Readings(s).free, 2);
    expect(s.test!.phenolRed).toBeCloseTo(hall3Readings(s).ph, 1);
    expect(s.test!.dpd3).toBeGreaterThanOrEqual(s.test!.dpd1);
  });

  it('stops dosing two minutes after the sample is lost, and its display falls while the pool does not', () => {
    let s = actOnHall3(newHall3(36000), {
      type: 'valve',
      id: 'sample.iso',
      open: false,
    });
    s = runHall3(s, 60);
    expect(hall3Readings(s).flowSwitch).toBe(false);
    expect(s.controller.release.hypochlorite).toBe(true);
    s = runHall3(s, 90);
    expect(s.controller.release.hypochlorite).toBe(false);
    expect(s.controller.alarms.some((a) => a.code === 'sample-flow')).toBe(
      true,
    );
    s = runHall3(s, 600);
    expect(hall3Readings(s).free).toBeLessThan(0.1);
    expect(s.pool[2].freeChlorine).toBeGreaterThan(1.1);
    s = runHall3(
      actOnHall3(s, { type: 'valve', id: 'sample.iso', open: true }),
      600,
    );
    expect(hall3Readings(s).free).toBeGreaterThan(1.1);
  });

  it('air in the hypochlorite pump: it strokes, delivers nothing, shows its fault, and the controller sees it', () => {
    let s = actOnHall3(newHall3(36000), { type: 'air' });
    s = runHall3(s, 120);
    expect(s.pumps.hypochlorite.fault).toBe('flow');
    expect(s.airFault).toBe(true);
    expect(
      s.controller.alarms.some((a) => a.code === 'pump-hypochlorite'),
    ).toBe(true);
    s = actOnHall3(s, { type: 'pump-ack', channel: 'hypochlorite' });
    s = runHall3(s, 120);
    expect(s.pumps.hypochlorite.fault).toBe(null);
    expect(s.airFault).toBe(false);
  });

  it('opens the controller’s settings to the visitor, and RESET restores the plaque’s', () => {
    let s = actOnHall3(newHall3(0), {
      type: 'controller-act',
      action: { kind: 'set', key: 'chlorineBand', value: 1 },
    });
    expect(s.controller.settings.chlorineBand).toBe(1);
    s = actOnHall3(s, { type: 'reset', now: 0 });
    expect(s.controller.settings.chlorineBand).toBe(0.5);
    expect(s.controller.settings.chlorineIntegral).toBe(6);
  });
});
