import { describe, expect, it } from 'vite-plus/test';
import { checkMimic } from '../../components/industrial-control/logic/mimic';
import { mimicLayoutProblems } from '../../components/industrial-control/logic/mimic-layout';
import {
  HALL4_MIMIC,
  MIMIC_READOUTS,
  dosedSoFar,
  hall4MimicState,
} from './museum-4-mimic';
import {
  DOSE_SECONDS,
  actOnHall4,
  stepHall4,
  newHall4,
  readWater,
} from '../../../game/plant/museum-4-lab';

describe('Hall 4’s mimic', () => {
  const s = newHall4(36000);
  it('is a sound board, nothing overlapping', () => {
    expect(checkMimic(HALL4_MIMIC, hall4MimicState(s))).toEqual([]);
    expect(mimicLayoutProblems(HALL4_MIMIC)).toEqual([]);
  });
  it('repeats free chlorine, pH and the balance index as the analyser reads them', () => {
    expect(MIMIC_READOUTS).toEqual(['dose', 'fc', 'ph', 'lsi']);
    expect(hall4MimicState(s).readouts.ph.live.value).toBe(
      readWater(s.bench.pool).ph,
    );
  });
  it('lights a valve’s lens while it doses, and no buttons', () => {
    let d = actOnHall4(s, { type: 'select', tank: 'hcl' });
    d = actOnHall4(d, { type: 'wheel', digit: 2, by: 1 });
    d = actOnHall4(d, { type: 'dose' });
    const m = hall4MimicState(d);
    expect(m.lamps['hcl-open']).toBe(true);
    expect(m.lamps['hypo-open']).toBe(false);
    expect(HALL4_MIMIC.buttons ?? []).toEqual([]);
  });
  it('animates the dose from the model: tank lamp, chasers to the pool, DOSED counting, then still', () => {
    const quiet = hall4MimicState(s);
    expect(quiet.flows?.['dose.hcl']).toBe('still');
    expect(quiet.flows?.header).toBe('still');
    expect(quiet.lamps['pot-dosing']).toBe(false);
    expect(quiet.readouts.dose.live.value).toBe(0);
    let d = actOnHall4(s, { type: 'select', tank: 'hcl' });
    d = actOnHall4(d, { type: 'wheel', digit: 1, by: 1 });
    // Selected and dialled but not started: nothing moves.
    expect(hall4MimicState(d).flows?.['dose.hcl']).toBe('still');
    d = actOnHall4(d, { type: 'dose' });
    d = { ...d, delivering: { ...d.delivering!, left: DOSE_SECONDS / 2 } };
    const m = hall4MimicState(d);
    expect(m.flows?.['dose.hcl']).toBe('forward');
    expect(m.flows?.['dose.hypo']).toBe('still');
    expect(m.flows?.header).toBe('forward');
    expect(m.flows?.injection).toBe('forward');
    expect(m.lamps['hcl-dosing']).toBe(true);
    expect(m.lamps['hypo-dosing']).toBe(false);
    expect(m.lamps['pot-dosing']).toBe(true);
    expect(dosedSoFar(d)).toBeCloseTo(5, 6);
    expect(m.readouts.dose.live).toMatchObject({ value: 5, unit: 'l' });
    const after = hall4MimicState(stepHall4(d, DOSE_SECONDS));
    expect(after.flows?.['dose.hcl']).toBe('still');
    expect(after.lamps['hcl-dosing']).toBe(false);
    expect(after.readouts.dose.live.value).toBe(0);
  });
});
