import { describe, expect, it } from 'vite-plus/test';
import { pipeClashes } from '../../components/core/logic/pipe-route';
import { FAIL_DELAY, RECIRCULATION } from '../../../game/plant/duty-standby';
import {
  DUTY_PIPES,
  createDutyStandbyModel,
  plumbDutyStandbyRig,
} from './duty-standby-rig';

const rig = plumbDutyStandbyRig();
const run = (m: ReturnType<typeof createDutyStandbyModel>, seconds: number) => {
  for (let t = 0; t < seconds; t += 0.5) m.step(0.5);
};
const isolatorOf = (pump: 1 | 2) =>
  rig.fittings.find(
    (f) => f.edge === `pump-${pump}-feed` && f.kind === 'power-isolator',
  )!.id;

describe('the duty/standby rig, plumbed', () => {
  it('routes every line, none through another', () => {
    expect(rig.problems).toEqual([]);
    expect(rig.lines).toHaveLength(9);
    expect(
      pipeClashes(
        rig.lines.map((l) => ({
          name: l.id,
          points: l.points,
          od: DUTY_PIPES[l.medium].od,
          joint: DUTY_PIPES[l.medium].joint,
        })),
      ),
    ).toEqual([]);
  });

  it('gives each pump its suction valve, its discharge non-return and isolating valves, and a local isolator', () => {
    for (const p of [1, 2]) {
      expect(
        rig.fittings
          .filter((f) => f.edge === `pump-${p}-suction`)
          .map((f) => f.kind),
      ).toEqual(['isolating-valve']);
      expect(
        rig.fittings
          .filter((f) => f.edge === `pump-${p}-delivery`)
          .map((f) => f.kind),
      ).toEqual(['non-return-valve', 'isolating-valve']);
      expect(
        rig.fittings
          .filter((f) => f.edge === `pump-${p}-feed`)
          .map((f) => f.kind),
      ).toEqual(['power-isolator']);
    }
    // None between the supply and the panel, which has its own main switch.
    expect(rig.fittings.filter((f) => f.edge === 'supply-feed')).toEqual([]);
  });

  it('puts every fitting where a person can reach it', () => {
    for (const f of rig.fittings) {
      expect(f.at[1], f.id).toBeGreaterThanOrEqual(0.3);
      expect(f.at[1], f.id).toBeLessThanOrEqual(1.8);
    }
  });
});

describe('the duty/standby rig, working', () => {
  it('runs the duty pump and delivers its flow', () => {
    const m = createDutyStandbyModel(rig);
    run(m, 10);
    expect(m.readings().running).toEqual([true, false]);
    expect(m.readings().delivered).toBe(300);
  });

  it('starts the standby when the duty’s isolator is switched off, and latches DUTY FAIL', () => {
    const m = createDutyStandbyModel(rig);
    run(m, 10);
    m.setOpen(isolatorOf(1), false);
    run(m, FAIL_DELAY + 1);
    const r = m.readings();
    expect(r.running).toEqual([false, true]);
    expect(r.controller.dutyFail).toBe(true);
    expect(r.delivered).toBe(300);
  });

  it('goes back to the duty after reset once its isolator is on again', () => {
    const m = createDutyStandbyModel(rig);
    m.setOpen(isolatorOf(1), false);
    run(m, 10);
    m.setOpen(isolatorOf(1), true);
    m.press({ type: 'reset' });
    run(m, 2);
    expect(m.readings().running).toEqual([true, false]);
    expect(m.readings().controller.dutyFail).toBe(false);
  });

  it('shows water coming back through the idle pump when its non-return valve jams open', () => {
    const m = createDutyStandbyModel(rig);
    m.setJammed(1, true);
    run(m, 10);
    const r = m.readings();
    expect(r.through[1]).toBeCloseTo(-RECIRCULATION * 300, 9);
    expect(r.delivered).toBeCloseTo(300 * (1 - RECIRCULATION), 9);
  });
});
