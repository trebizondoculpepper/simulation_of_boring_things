import { describe, expect, it } from 'vite-plus/test';
import {
  TRIAL,
  actOnJacuzziTrial,
  newJacuzziTrial,
  runJacuzziTrial,
  trialPanel,
  trialReadings,
  trialRuns,
} from './jacuzzi-trial';
import type { JacuzziTrial, TrialAction, TrialValve } from './jacuzzi-trial';
import { NO_FLOW_TRIP } from './jacuzzi-cabinet';

/**
 * The jacuzzi's cabinet with its ideal spa, ideal balance tank and ideal
 * sources (`jacuzzi-trial.ts`): every behaviour, as its test panel works
 * it.
 */
const act = (t: JacuzziTrial, ...actions: TrialAction[]) =>
  actions.reduce(actOnJacuzziTrial, t);
const valve = (v: TrialValve, open: boolean): TrialAction => ({
  act: 'valve',
  valve: v,
  open,
});
const steady = runJacuzziTrial(newJacuzziTrial(), 120);
const V = TRIAL.tank.volume;

describe('the jacuzzi cabinet on trial, running normally', () => {
  it('holds steady: the spa brimming, the tank at its float, the gutter carrying the flow, nothing lost', () => {
    const t = runJacuzziTrial(steady, 600);
    expect(t.spa).toBeCloseTo(TRIAL.spa, 2);
    expect(t.tank / V).toBeCloseTo(TRIAL.tank.float, 1);
    expect(t.gutter).toBeCloseTo(TRIAL.gutter, 2);
    expect(t.overflowed + t.flooded).toBe(0);
    expect(trialPanel(t)).toMatchObject({
      pumpRun: true,
      flowing: true,
      uv: true,
      dosing: true,
      noFlow: false,
    });
    expect(t.cabinet.trip).toBe('');
  });

  it('takes every seat’s surge into the tank without overflowing, and gives it back when they leave', () => {
    const before = steady.tank;
    let t = runJacuzziTrial(act(steady, { act: 'bathers', in: true }), 120);
    expect(t.tank - before).toBeCloseTo(0.64, 1);
    expect(t.overflowed).toBe(0);
    t = runJacuzziTrial(act(t, { act: 'bathers', in: false }), 300);
    expect(t.tank).toBeCloseTo(before, 1);
    expect(t.spa).toBeCloseTo(TRIAL.spa, 2);
    expect(t.cabinet.trip).toBe('');
  });

  it('holds even the worst: every seat taken and the pump stopped, the gutter draining back', () => {
    let t = runJacuzziTrial(act(steady, { act: 'bathers', in: true }), 120);
    t = act(t, {
      act: 'cabinet',
      action: { act: 'power', on: false },
    });
    t = runJacuzziTrial(t, 300);
    expect(t.gutter).toBeLessThan(0.001);
    expect(t.overflowed).toBe(0);
    expect(t.tank).toBeLessThanOrEqual(V);
  });

  it('runs its jets and air when full, and its display shows its state and its tank', () => {
    const t = act(
      steady,
      { act: 'toggle', what: 'jets' },
      { act: 'toggle', what: 'air' },
    );
    expect(trialRuns(t)).toEqual({ jets: true, air: true });
    expect(trialPanel(t).messages).toEqual([
      'RUNNING  UV ON',
      `TANK ${Math.round(trialReadings(t).tankShare * 100)}%`,
    ]);
  });
});

describe('the jacuzzi cabinet on trial, its valves worked', () => {
  it('trips on no flow with its return shut, latched until RESET with it open', () => {
    let t = runJacuzziTrial(
      act(steady, valve('return', false)),
      NO_FLOW_TRIP + 1,
    );
    expect(t.cabinet.trip).toBe('no-flow');
    expect(trialPanel(t)).toMatchObject({ pumpRun: false, noFlow: true });
    expect(trialPanel(t).messages[0]).toBe('TRIP: NO FLOW');
    t = act(t, { act: 'cabinet', action: { act: 'reset' } });
    expect(t.cabinet.trip).toBe('no-flow');
    t = act(t, valve('return', true), {
      act: 'cabinet',
      action: { act: 'reset' },
    });
    t = runJacuzziTrial(t, 60);
    expect(trialPanel(t).flowing).toBe(true);
  });

  it('trips on no flow with its suction from the tank shut', () => {
    const t = runJacuzziTrial(
      act(steady, valve('suction', false)),
      NO_FLOW_TRIP + 1,
    );
    expect(t.cabinet.trip).toBe('no-flow');
  });

  it('with its overflow shut, backs the gutter up over the deck while the pump runs the tank down to TANK LOW', () => {
    let t = act(steady, valve('overflow', false), {
      act: 'source',
      source: 'water',
      on: false,
    });
    t = runJacuzziTrial(t, 120);
    expect(t.flooded).toBeGreaterThan(0.05);
    expect(t.tankLow).toBe(true);
    expect(trialPanel(t).messages[0]).toBe('TRIP: TANK LOW');
    // Not the latched no-flow trip: its suction and return are open.
    expect(t.cabinet.trip).toBe('');
    // Reopened, the gutter drains back, the tank recovers, and it runs again.
    t = runJacuzziTrial(
      act(t, valve('overflow', true), {
        act: 'source',
        source: 'water',
        on: true,
      }),
      600,
    );
    expect(t.tankLow).toBe(false);
    expect(trialPanel(t).flowing).toBe(true);
  });

  it('keeps the jets off with their own valves shut, the cabinet running on', () => {
    const t = act(
      steady,
      valve('jetsSuction', false),
      valve('air', false),
      { act: 'toggle', what: 'jets' },
      { act: 'toggle', what: 'air' },
    );
    expect(trialRuns(t)).toEqual({ jets: false, air: false });
    expect(trialPanel(t).flowing).toBe(true);
  });

  it('drains the spa by gravity, cutting the jets out as it falls, the cabinet running on', () => {
    let t = act(
      steady,
      { act: 'toggle', what: 'jets' },
      { act: 'source', source: 'water', on: false },
    );
    t = act(t, valve('drain', true), {
      act: 'source',
      source: 'power',
      on: false,
    });
    t = runJacuzziTrial(t, 60);
    expect(t.jets).toBe(false);
    expect(trialReadings(t).spaShare).toBeLessThan(0.95);
    expect(trialPanel(t).lines).toBeNull();
  });

  it('warns NO HEAT with a heating valve shut, then TEMP LOW, never tripping', () => {
    let t = act(steady, valve('heatingFlow', false));
    t = runJacuzziTrial(t, 30);
    expect(trialPanel(t).messages).toContain('NO HEAT');
    t = runJacuzziTrial(t, 300);
    expect(t.celsius).toBeLessThan(35);
    expect(trialPanel(t).messages).toEqual(
      expect.arrayContaining(['NO HEAT', 'TEMP LOW']),
    );
    expect(t.cabinet.trip).toBe('');
    t = runJacuzziTrial(act(t, valve('heatingFlow', true)), 600);
    expect(t.celsius).toBeCloseTo(37, 1);
  });
});

describe('the jacuzzi cabinet on trial, its sources cut', () => {
  it('trips on TANK LOW with its water cut off and the spa draining, and restarts as the water comes back', () => {
    let t = act(
      steady,
      { act: 'source', source: 'water', on: false },
      valve('drain', true),
    );
    t = runJacuzziTrial(t, 180);
    expect(t.tankLow).toBe(true);
    expect(trialPanel(t)).toMatchObject({ pumpRun: false, noFlow: true });
    expect(trialPanel(t).messages[0]).toBe('TRIP: TANK LOW');
    expect(t.cabinet.trip).toBe('');
    t = act(t, valve('drain', false), {
      act: 'source',
      source: 'water',
      on: true,
    });
    t = runJacuzziTrial(t, 600);
    expect(t.tankLow).toBe(false);
    expect(trialPanel(t).flowing).toBe(true);
    expect(trialReadings(t).spaShare).toBeGreaterThan(0.99);
  });

  it('goes dark with its power cut, nothing tripped, and starts again when it returns', () => {
    let t = runJacuzziTrial(
      act(steady, { act: 'source', source: 'power', on: false }),
      60,
    );
    expect(trialPanel(t)).toMatchObject({
      supplied: false,
      pumpRun: false,
      lines: null,
      noFlow: false,
    });
    expect(t.overflowed).toBe(0);
    t = runJacuzziTrial(
      act(t, { act: 'source', source: 'power', on: true }),
      60,
    );
    expect(trialPanel(t).flowing).toBe(true);
  });

  it('cools with its heat source cut, warning NO HEAT', () => {
    const t = runJacuzziTrial(
      act(steady, { act: 'source', source: 'heat', on: false }),
      300,
    );
    expect(t.celsius).toBeLessThan(35);
    expect(trialPanel(t).messages).toContain('NO HEAT');
  });
});
