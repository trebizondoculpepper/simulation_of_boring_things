import { describe, expect, it } from 'vite-plus/test';
import { checkMimic } from '../../components/industrial-control/logic/mimic';
import { mimicLayoutProblems } from '../../components/industrial-control/logic/mimic-layout';
import {
  HALL1_MIMIC,
  MIMIC_READOUTS,
  hall1MimicState,
  hall1Reading,
  mimicSpeed,
} from './museum-1-mimic';
import {
  INSTRUMENTS,
  actOnHall1,
  hall1Readings,
  newHall1,
  runHall1,
} from '../../../game/plant/museum-1-heating';

describe('Hall 1’s mimic', () => {
  const s = runHall1(newHall1(), 120);
  const state = hall1MimicState(s, 1);

  it('is a sound board, laid out with nothing overlapping', () => {
    expect(checkMimic(HALL1_MIMIC, state)).toEqual([]);
    expect(mimicLayoutProblems(HALL1_MIMIC)).toEqual([]);
  });

  it('repeats every thermometer, the meters, the losses and the cost, each as its instrument reads', () => {
    for (const i of INSTRUMENTS.filter((i) => i.kind === 'temperature'))
      expect(MIMIC_READOUTS).toContain(i.id);
    const r = hall1Readings(s);
    expect(state.readouts['poolDischarge.meter'].live.value).toBe(r.flow);
    expect(hall1Reading('loss.total', s)!.value).toBe(r.losses.total);
    expect(hall1Reading('gas.meter', s)!.value).toBe(r.gasFlow);
  });

  it('lights FIRING and both pumps while heating, and the speed it runs at', () => {
    expect(state.lamps.firing).toBe(true);
    expect(state.lamps['p1-run']).toBe(true);
    expect(state.lamps['p2-run']).toBe(true);
    expect(state.lamps['speed-1']).toBe(true);
    expect(hall1MimicState(s, 3600).lamps['speed-3600']).toBe(true);
    const stopped = runHall1(actOnHall1(s, { type: 'pump', run: false }), 1);
    const off = hall1MimicState(stopped, 1);
    expect(off.lamps['p2-run']).toBe(false);
    expect(off.lamps.fs1).toBe(false);
  });

  it('has only TIME buttons', () => {
    expect(HALL1_MIMIC.buttons!.map((b) => mimicSpeed(b.id))).toEqual([
      1, 60, 600, 3600,
    ]);
  });
});
