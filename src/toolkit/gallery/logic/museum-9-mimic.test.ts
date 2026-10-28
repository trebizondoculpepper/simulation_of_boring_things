import { describe, expect, it } from 'vite-plus/test';
import { checkMimic } from '../../components/industrial-control/logic/mimic';
import { mimicLayoutProblems } from '../../components/industrial-control/logic/mimic-layout';
import {
  HALL9_MIMIC,
  hall9MimicState,
  hall9Reading,
  mimicCommand,
} from './museum-9-mimic';
import {
  actOnHall9Plant,
  hall9Readings,
  newHall9Plant,
  runHall9Plant,
} from '../../../game/plant/museum-9-plant';

describe('Hall 9’s mimic, the map of the whole plant', () => {
  const s = runHall9Plant(newHall9Plant(36000), 120);

  it('is a sound board, laid out with nothing overlapping', () => {
    expect(checkMimic(HALL9_MIMIC, hall9MimicState(s))).toEqual([]);
    expect(mimicLayoutProblems(HALL9_MIMIC)).toEqual([]);
  });

  it('repeats the instruments, DC1’s reading not the water’s', () => {
    expect(hall9Reading('cl', s)!.value).toBe(hall9Readings(s).free);
    expect(hall9Reading('ft1', s)!.value).toBeGreaterThan(180);
  });

  it('carries only P1 and P2 START and STOP and HX1-V2 OPEN and SHUT', () => {
    expect(
      HALL9_MIMIC.buttons!.map((b) => mimicCommand(b.id)?.type ?? '').sort(
        (a, b) => a.localeCompare(b),
      ),
    ).toEqual([
      'desk-mv',
      'desk-mv',
      'desk-p1',
      'desk-p1',
      'desk-p2',
      'desk-p2',
    ]);
    const stopped = actOnHall9Plant(s, mimicCommand('p1/stop')! as never);
    expect(hall9MimicState(stopped).lamps['p1-run']).toBe(false);
  });
});
