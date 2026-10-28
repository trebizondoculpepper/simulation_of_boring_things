import { describe, expect, it } from 'vite-plus/test';
import {
  ALARMS,
  FITTINGS,
  INSTRUMENTS,
  LINKS,
  NODES,
  TAGS,
  WINDOWS,
  actOnHall9Plant,
  hall9Alarms,
  hall9Expansion,
  hall9Readings,
  newHall9Plant,
  runHall9Plant,
} from './museum-9-plant';
import { DRIFTED_AE1 } from './museum-9-plant';

describe('Hall 9’s schematic', () => {
  it('derives its tags, room code M9', () => {
    expect(TAGS['pump.suction.iso']).toBe('M9-P1-V1');
    expect(TAGS['pump.discharge.nrv']).toBe('M9-P1-NRV1');
    expect(TAGS['pump.discharge.iso']).toBe('M9-P1-V2');
    expect(
      [
        'filter.inlet.iso',
        'filter.outlet.iso',
        'filter.backwash-in.iso',
        'filter.backwash-out.iso',
        'filter.rinse.iso',
      ].map((id) => TAGS[id]),
    ).toEqual(['M9-F1-V1', 'M9-F1-V2', 'M9-F1-V3', 'M9-F1-V4', 'M9-F1-V5']);
    expect(TAGS['hx.bypass']).toBe('M9-HX1-V1');
    expect(TAGS['hx.primary.mv']).toBe('M9-HX1-V2');
    expect(TAGS['gas.ecv']).toBe('M9-GS1-V1');
    expect(TAGS['gas.meter']).toBe('M9-FQ1');
    expect(TAGS['filtered.meter']).toBe('M9-FT1');
    expect(TAGS['hx.primary.heat']).toBe('M9-HM1');
    expect(TAGS['sample.needle']).toBe('M9-SC1-V2');
    expect(TAGS['pump.suction.pi']).toBe('M9-PI1');
    expect(TAGS['gas.pi']).toBe('M9-PI3');
    expect(TAGS['filter.pdi']).toBe('M9-PDI1');
    expect(TAGS['pool.ti']).toBe('M9-TI5');
    expect(TAGS['hx.fs']).toBe('M9-FS1');
    expect(TAGS['cell.fs']).toBe('M9-FS2');
    expect(TAGS['cell.cl']).toBe('M9-AE1');
    expect(TAGS['controller']).toBe('M9-DC1');
    expect(TAGS['testKit']).toBe('M9-TK1');
    for (const id of [
      ...FITTINGS.map((f) => f.id),
      ...INSTRUMENTS.map((i) => i.id),
      ...NODES.map((n) => n.id),
    ])
      expect(TAGS[id], id).toMatch(/^M9-/);
    expect(new Set(Object.values(TAGS)).size).toBe(Object.values(TAGS).length);
  });

  it('gives every fitting, so the plumber adds nothing', () => {
    const e = hall9Expansion();
    expect(e.added).toEqual([]);
    const ids = new Set(e.fittings.map((f) => f.id));
    for (const f of FITTINGS) expect(ids.has(f.id), f.id).toBe(true);
    for (const f of FITTINGS)
      expect(
        LINKS.some((l) => l.id === f.edge),
        f.id,
      ).toBe(true);
  });

  it('has a window for every alarm, and spares to 24', () => {
    expect(WINDOWS).toHaveLength(24);
    for (const a of ALARMS) expect(WINDOWS).toContain(a);
  });
});

describe('Hall 9’s steady plant (Try it 1)', () => {
  const s = runHall9Plant(newHall9Plant(36000), 600);
  const r = hall9Readings(s);

  it('runs at the joined models’ duty, every window dark', () => {
    expect(r.flow).toBeCloseTo(183.2, 0);
    expect(r.pi2).toBeCloseTo(2.02, 1);
    expect(r.pdi1).toBeCloseTo(0.43, 1);
    expect(r.ti.ti5).toBeCloseTo(28, 1);
    expect(r.free).toBeCloseTo(1.3, 1);
    expect(r.ph).toBeCloseTo(7.3, 1);
    expect(r.fs1 && r.fs2 && r.p1Running).toBe(true);
    expect(hall9Alarms(s)).toEqual([]);
  });

  it('is the same at entry and at RESET', () => {
    expect(newHall9Plant(36000)).toEqual(newHall9Plant(36000));
  });

  it('reads the drifted probe, never the true water: DC1 low, the kit high', () => {
    const d = runHall9Plant(
      {
        ...s,
        chem: {
          ...s.chem,
          cell: {
            ...s.chem.cell,
            probes: { ...s.chem.cell.probes, ...DRIFTED_AE1 },
          },
        },
      },
      2,
    );
    const rd = hall9Readings(d);
    expect(rd.free).toBeLessThan(d.chem.cell.water.free - 0.25);
    const tested = actOnHall9Plant(d, {
      type: 'chem',
      action: { type: 'test' },
    });
    expect(tested.chem.test!.dpd1).toBeCloseTo(d.chem.cell.water.free, 1);
  });

  it('the desk works only what its mimic carries: P1 stops from it in AUTO, not in HAND', () => {
    const stop = actOnHall9Plant(s, { type: 'desk-p1', run: false });
    expect(hall9Readings(stop).p1Running).toBe(false);
    const hand = actOnHall9Plant(stop, { type: 'starter-mode', mode: 'hand' });
    expect(hall9Readings(hand).p1Running).toBe(true);
  });

  it('will not open the strainer’s lid until P1 is stopped and both its valves shut', () => {
    expect(actOnHall9Plant(s, { type: 'lid', open: true }).lidOpen).toBe(false);
  });
});
