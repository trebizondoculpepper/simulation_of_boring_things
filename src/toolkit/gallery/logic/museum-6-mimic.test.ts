import { describe, expect, it } from 'vite-plus/test';
import { checkMimic } from '../../components/industrial-control/logic/mimic';
import { mimicLayoutProblems } from '../../components/industrial-control/logic/mimic-layout';
import { HALL6_MIMIC, hall6MimicState } from './museum-6-mimic';
import {
  actOnHall6,
  newHall6,
  runHall6,
} from '../../../game/plant/museum-6-pumps';

describe('Hall 6’s mimic', () => {
  it('is a sound board, nothing overlapping', () => {
    const s = hall6MimicState(newHall6());
    expect(checkMimic(HALL6_MIMIC, s)).toEqual([]);
    expect(mimicLayoutProblems(HALL6_MIMIC)).toEqual([]);
  });

  it('lights a running pump, the level, and the lock-out at full', () => {
    const s = runHall6(actOnHall6(newHall6(), { type: 'run', no: 9 }), 10);
    const m = hall6MimicState(s);
    expect(m.lamps['run-9']).toBe(true);
    expect(m.lamps['level-1']).toBe(true);
    expect(m.lamps.locked).toBe(false);
    const full = hall6MimicState(runHall6(s, 30));
    expect(full.lamps['run-9']).toBe(false);
    expect(full.lamps.locked).toBe(true);
    expect(full.lamps.lsh).toBe(true);
    expect(full.readouts['tank.lt'].live.value).toBe(1000);
  });
});
