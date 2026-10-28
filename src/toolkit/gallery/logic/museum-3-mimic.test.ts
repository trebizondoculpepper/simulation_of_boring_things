import { describe, expect, it } from 'vite-plus/test';
import { checkMimic } from '../../components/industrial-control/logic/mimic';
import { mimicLayoutProblems } from '../../components/industrial-control/logic/mimic-layout';
import {
  HALL3_MIMIC,
  hall3MimicState,
  hall3Reading,
  mimicSpeed,
} from './museum-3-mimic';
import {
  actOnHall3,
  hall3Readings,
  newHall3,
  runHall3,
} from '../../../game/plant/museum-3-dosing';

describe('Hall 3’s mimic', () => {
  const s = runHall3(newHall3(36000), 120);
  const state = hall3MimicState(s, 1);

  it('is a sound board, laid out with nothing overlapping', () => {
    expect(checkMimic(HALL3_MIMIC, state)).toEqual([]);
    expect(mimicLayoutProblems(HALL3_MIMIC)).toEqual([]);
  });

  it('shows the controller’s measurements, not the water’s truth', () => {
    expect(hall3Reading('dc.cl', s)!.value).toBe(s.controller.measured.free);
    expect(hall3Reading('dc.cl', s)!.value).toBe(hall3Readings(s).free);
  });

  it('lights a pump’s FAULT when it gas-locks, and the flow switch goes out with the sample', () => {
    const air = runHall3(actOnHall3(s, { type: 'air' }), 60);
    expect(hall3MimicState(air, 1).lamps['dp1-fault']).toBe(true);
    const shut = runHall3(
      actOnHall3(s, { type: 'valve', id: 'sample.iso', open: false }),
      2,
    );
    expect(hall3MimicState(shut, 1).lamps.fs1).toBe(false);
  });

  it('has only TIME buttons', () => {
    expect(HALL3_MIMIC.buttons!.map((b) => mimicSpeed(b.id))).toEqual([
      1, 60, 600, 3600,
    ]);
  });
});
