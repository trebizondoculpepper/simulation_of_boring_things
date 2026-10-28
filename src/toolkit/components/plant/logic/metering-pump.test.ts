import { describe, expect, it } from 'vite-plus/test';
import {
  PERI_30,
  PERI_TURN_ML,
  changeTube,
  idealPump,
  keyedDiaphragmPump,
  meteringPump,
  motorPump,
  peristalticPump,
  peristalticTurnMl,
} from './metering-pump';
import type {
  MeteringInputs,
  MeteringKind,
  MeteringPump,
} from './metering-pump';
import { pressKey } from './diaphragm-pump';
import { admitGas } from './motor-dosing-pump';

const inputs = (over: Partial<MeteringInputs> = {}): MeteringInputs => ({
  powered: true,
  release: true,
  demand: 0.5,
  level: 'ok',
  dischargeBar: 2,
  ...over,
});
/** An hour (or `seconds`) of a pump, a second a step: litres delivered and its last step. */
function run<S>(
  pump: MeteringPump<S>,
  s: S,
  i: MeteringInputs,
  seconds = 3600,
) {
  let litres = 0;
  let last = pump.step(s, i, 0);
  for (let t = 0; t < seconds; t++) {
    last = pump.step(last.state, i, 1);
    litres += last.deliveredL;
  }
  return { litres, last };
}

describe('the metering pumps, one family', () => {
  const kinds: MeteringKind[] = [
    'ideal',
    'peristaltic',
    'solenoid',
    'stepper',
    'motor',
  ];

  it('all take the same inputs and stop with their power or their release', () => {
    for (const kind of kinds) {
      const pump = meteringPump(kind, 10) as MeteringPump<unknown>;
      const s = pump.initial();
      expect(pump.step(s, inputs({ powered: false }), 60).deliveredL).toBe(0);
      expect(pump.step(s, inputs({ release: false }), 60).deliveredL).toBe(0);
      expect(run(pump, s, inputs(), 60).litres).toBeGreaterThan(0);
    }
  });

  it('the ideal pump delivers demand × its most, exactly, capped', () => {
    const pump = idealPump(12.5);
    expect(run(pump, null, inputs({ demand: 0.4 })).litres).toBeCloseTo(5);
    expect(run(pump, null, inputs({ demand: 3 })).litres).toBeCloseTo(12.5);
  });

  it('the DMX 1602 gives no more than 2.1 l/h however much is asked: the Olympic’s shortfall', () => {
    const pump = keyedDiaphragmPump('solenoid');
    const r = run(pump, pump.initial(), inputs({ demand: 1 }));
    expect(r.litres).toBeGreaterThan(2.0);
    expect(r.litres).toBeLessThanOrEqual(2.1);
    expect(r.last.setLh).toBeCloseTo(2.1);
  });

  it('a DMX 1602 standing a night on its standard head is gas-locked when called, and trips', () => {
    const pump = keyedDiaphragmPump('solenoid');
    const night = pump.step(
      pump.initial(),
      inputs({ release: false }),
      12 * 3600,
    ).state;
    const r = run(pump, night, inputs({ demand: 1 }), 60);
    expect(r.litres).toBe(0);
    expect(r.last.fault).toBe('flow');
    // Its bleed opened, then acknowledged, it doses again.
    const primed = pump.acknowledge({
      ...r.last.state,
      head: { ...r.last.state.head, bleedOpen: true },
    });
    const bled = run(pump, primed, inputs({ demand: 1 }), 5).last.state;
    const back = run(
      pump,
      { ...bled, head: { ...bled.head, bleedOpen: false } },
      inputs({ demand: 1 }),
      60,
    );
    expect(back.litres).toBeGreaterThan(0.03);
  });

  it('the DDS 7.5-16 deaerates itself standing by, so a night does not lock it', () => {
    const pump = keyedDiaphragmPump('stepper');
    const night = pump.step(
      pump.initial(),
      inputs({ release: false }),
      12 * 3600,
    ).state;
    const r = run(pump, night, inputs({ demand: 1 }), 600);
    expect(r.last.fault).toBe(null);
    expect(r.litres).toBeGreaterThan(1.2);
  });

  it('keyed pumps keep their own keys: STOP stops them, MANUAL doses their own rate', () => {
    const pump = keyedDiaphragmPump('stepper');
    const s = pump.initial();
    const stopped = { ...s, keys: pressKey(s.keys, 'stop') };
    expect(pump.step(stopped, inputs(), 60).deliveredL).toBe(0);
    const manual = { ...s, keys: pressKey(s.keys, 'mode') };
    expect(pump.step(manual, inputs({ demand: 0.1 }), 0).setLh).toBeCloseTo(
      3.75,
    );
  });

  it('the DMH 21-10 at its 60 % dial gives the Olympic its 12.5 l/h', () => {
    const r = run(motorPump, motorPump.initial(), inputs({ demand: 1 }));
    expect(r.last.setLh).toBeCloseTo(12.6);
    expect(r.litres).toBeGreaterThan(11.5);
  });

  it('the DMH gas-locks on a slug of air on a standard head and its flow monitor trips; acknowledged it starts again', () => {
    const s = admitGas(
      { ...motorPump.initial(), head: 'standard' as const },
      5,
    );
    const r = run(motorPump, s, inputs({ demand: 1 }), 60);
    expect(r.litres).toBe(0);
    expect(r.last.fault).toBe('flow');
    expect(motorPump.acknowledge(r.last.state).on).toBe(true);
  });

  it('the PERI 30 never gas-locks; its tube wears, gives less a turn, bursts and is seen leaking', () => {
    const s = peristalticPump.initial();
    expect(PERI_TURN_ML).toBeCloseTo(9.09, 2);
    const fresh = run(peristalticPump, s, inputs({ demand: 1 })).litres;
    expect(fresh).toBeCloseTo(30, 1);
    const worn = { ...s, tubeHours: PERI_30.tubeLifeH };
    expect(peristalticTurnMl(worn) / PERI_TURN_ML).toBeCloseTo(0.85);
    expect(
      run(peristalticPump, worn, inputs({ demand: 1 })).litres,
    ).toBeCloseTo(25.5, 1);
    const old = {
      ...s,
      tubeHours: PERI_30.tubeLifeH * PERI_30.burstLives - 0.5,
    };
    const r = run(peristalticPump, old, inputs({ demand: 1 }));
    expect(r.last.fault).toBe('leak');
    expect(r.last.deliveredL).toBe(0);
    expect(changeTube(r.last.state).error).toBe(null);
  });

  it('the PERI 30 stalls against a closed discharge, and stops on an empty tank', () => {
    expect(
      peristalticPump.step(
        peristalticPump.initial(),
        inputs({ dischargeBar: Infinity }),
        1,
      ).fault,
    ).toBe('stall');
    expect(
      peristalticPump.step(
        peristalticPump.initial(),
        inputs({ level: 'empty' }),
        1,
      ).fault,
    ).toBe('level');
  });
});
