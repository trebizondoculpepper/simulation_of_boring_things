import { describe, expect, it } from 'vite-plus/test';
import { checkMimic } from '../../components/industrial-control/logic/mimic';
import { mimicLayoutProblems } from '../../components/industrial-control/logic/mimic-layout';
import {
  HALL2_MIMIC,
  MIMIC_READOUTS,
  hall2MimicState,
  hall2Reading,
  mimicSpeed,
} from './museum-2-mimic';
import {
  INSTRUMENTS,
  actOnHall2,
  backwashLineUp,
  hall2Readings,
  newHall2,
  runHall2,
} from '../../../game/plant/museum-2-clean-water';

describe('Hall 2’s mimic', () => {
  const s = runHall2(newHall2(), 60);
  const state = hall2MimicState(s);

  it('is a sound board, laid out with nothing overlapping', () => {
    expect(checkMimic(HALL2_MIMIC, state)).toEqual([]);
    expect(mimicLayoutProblems(HALL2_MIMIC)).toEqual([]);
  });

  it('repeats every gauge and analyser of the process, each as it reads', () => {
    for (const i of INSTRUMENTS.filter(
      (i) => i.kind !== 'pressure' || i.on === 'pump',
    ).filter(
      (i) =>
        ![
          'filter.inlet.pi',
          'filter.outlet.pi',
          'injector.pi',
          'hall.ai',
        ].includes(i.id),
    ))
      expect(MIMIC_READOUTS).toContain(i.id);
    const r = hall2Readings(s);
    expect(state.readouts['returnMain.meter'].live.value).toBe(r.flows.toPool);
    expect(hall2Reading('toCarbon.ai', s)!.value).toBe(r.ozone.contactResidual);
  });

  it('shows no energy and no chlorine', () => {
    const units = MIMIC_READOUTS.map((id) => hall2Reading(id, s)!.unit);
    expect(units).not.toContain('kW');
    expect(units).not.toContain('kWh');
    expect(MIMIC_READOUTS.join(' ')).not.toMatch(/chlor|cl2|heat/i);
  });

  it('lights the pump, the ozone and the UV lamp in service, BED LIFTED in a backwash', () => {
    expect(state.lamps['p1-run']).toBe(true);
    expect(state.lamps['oz1-run']).toBe(true);
    expect(state.lamps['uv1-lamp']).toBe(true);
    expect(state.lamps['bed-lifted']).toBe(false);
    const wash = hall2MimicState(backwashLineUp(newHall2()));
    expect(wash.lamps['bed-lifted']).toBe(true);
    const off = hall2MimicState(
      runHall2(actOnHall2(s, { type: 'pump', run: false }), 2),
    );
    expect(off.lamps['p1-run']).toBe(false);
    expect(off.lamps['uv1-lamp']).toBe(false);
  });

  it('has only TIME buttons', () => {
    expect(HALL2_MIMIC.buttons!.map((b) => mimicSpeed(b.id))).toEqual([
      1, 60, 600, 3600,
    ]);
    expect(hall2MimicState({ ...s, speed: 3600 }).lamps['speed-3600']).toBe(
      true,
    );
  });
});
