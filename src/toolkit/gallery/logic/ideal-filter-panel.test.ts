import { describe, expect, it } from 'vite-plus/test';
import { checkMimic } from '../../components/industrial-control/logic/mimic';
import { mimicLayoutProblems } from '../../components/industrial-control/logic/mimic-layout';
import {
  RIG_VALVES,
  newFilterRig,
  rigFlows,
  stepFilterRig,
} from '../../../game/plant/ideal-filter';
import type { FilterRig } from '../../../game/plant/ideal-filter';
import {
  IDEAL_FILTER_PANEL,
  actOnRig,
  idealFilterPanelState,
  panelAction,
} from './ideal-filter-panel';

/** The ideal filter rig's panel (dev40). */
const press = (rig: FilterRig, button: string) => {
  const a = panelAction(button);
  return a && !('speed' in a) ? actOnRig(rig, a) : rig;
};
const run = (rig: FilterRig, seconds: number) => {
  let r = rig;
  for (let t = 0; t < seconds; t += 5) r = stepFilterRig(r, 5);
  return r;
};

describe('the ideal filter rig’s panel', () => {
  it('lays out cleanly, and drives every lamp and readout', () => {
    expect(mimicLayoutProblems(IDEAL_FILTER_PANEL)).toEqual([]);
    expect(
      checkMimic(IDEAL_FILTER_PANEL, idealFilterPanelState(newFilterRig(), 1)),
    ).toEqual([]);
  });

  it('works every valve, and every button does something', () => {
    for (const v of RIG_VALVES)
      expect(press(newFilterRig(), `${v}/open`).command[v]).toBe(true);
    for (const b of IDEAL_FILTER_PANEL.buttons!)
      expect(panelAction(b.id), b.id).not.toBeNull();
  });

  it('runs a whole cycle from its buttons: service, backwash, rinse, service', () => {
    let r = run(press(newFilterRig(), 'process/service'), 86400);
    const dirty = r.filter.dirt;
    expect(idealFilterPanelState(r, 1).lamps['process-service']).toBe(true);
    r = run(press(r, 'process/backwash'), 300);
    expect(rigFlows(r).lifted).toBe(true);
    expect(idealFilterPanelState(r, 1).flows?.v4).toBe('forward');
    r = run(press(r, 'process/rinse'), 300);
    r = run(press(r, 'process/service'), 30);
    expect(r.filter.dirt).toBeLessThan(dirty * 0.05);
    expect(rigFlows(r).outletDirt).toBeLessThan(r.dirtySource * 0.1);
  });

  it('sets the dirty source’s dirt and cleans the media', () => {
    expect(press(newFilterRig(), 'dirt/up').dirtySource).toBe(50);
    const loaded = run(press(newFilterRig(), 'process/service'), 86400);
    expect(press(loaded, 'clean-media').filter.dirt).toBe(0);
  });
});
