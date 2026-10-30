import { describe, expect, it } from 'vite-plus/test';
import { checkMimic } from '../../components/industrial-control/logic/mimic';
import { mimicLayoutProblems } from '../../components/industrial-control/logic/mimic-layout';
import { HALL6_MIMIC, hall6Flows, hall6MimicState } from './museum-6-mimic';
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
    const s = runHall6(actOnHall6(newHall6(), { type: 'run', no: 2 }), 3);
    const m = hall6MimicState(s);
    expect(m.lamps['run-2']).toBe(true);
    expect(m.lamps['level-1']).toBe(true);
    expect(m.lamps.locked).toBe(false);
    const full = hall6MimicState(runHall6(s, 30));
    expect(full.lamps['run-2']).toBe(false);
    expect(full.lamps.locked).toBe(true);
    expect(full.lamps.lsh).toBe(true);
    expect(full.readouts['tank.lt'].live.value).toBe(1000);
  });

  it('chases only the running pump’s path into the tank, and the drain while it drains', () => {
    expect(
      Object.values(hall6Flows(newHall6())).every((f) => f === 'still'),
    ).toBe(true);
    const f = hall6Flows(actOnHall6(newHall6(), { type: 'run', no: 1 }));
    expect(f.main0).toBe('forward');
    expect(f.main1).toBe('still');
    expect(f.suction1).toBe('forward');
    expect(f.delivery1).toBe('forward');
    expect(f.delivery2).toBe('still');
    expect(f.header1).toBe('forward');
    expect(f.fill).toBe('forward');
    expect(f.drain).toBe('still');
    const g = hall6Flows(actOnHall6(newHall6(), { type: 'run', no: 2 }));
    expect([g.main0, g.main1, g.suction1, g.delivery2]).toEqual([
      'forward',
      'forward',
      'still',
      'forward',
    ]);
    expect(g.header1).toBe('still');
    // Run a while, then drain.
    const full = runHall6(actOnHall6(newHall6(), { type: 'run', no: 2 }), 4);
    const d = hall6Flows(actOnHall6(full, { type: 'reset' }));
    expect(d.drain).toBe('forward');
    expect(d.fill).toBe('still');
  });
});
