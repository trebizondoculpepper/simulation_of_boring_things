import { describe, expect, it } from 'vite-plus/test';
import { checkMimic } from '../../components/industrial-control/logic/mimic';
import { mimicLayoutProblems } from '../../components/industrial-control/logic/mimic-layout';
import { HALL4_MIMIC, MIMIC_READOUTS, hall4MimicState } from './museum-4-mimic';
import {
  actOnHall4,
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
    expect(MIMIC_READOUTS).toEqual(['fc', 'ph', 'lsi']);
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
});
