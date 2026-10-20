import { describe, expect, it } from 'vite-plus/test';
import { createSystem, output, run, setInput, stepSystem } from '../sim/system';
import type { System } from '../sim/system';
import { BOILER, LOAD, PUMP, WATER_HEAT } from './heat-loop';
import type { LoadParams } from './heat-loop';

/** A closed heating loop: pump → boiler → load → back to the boiler. */
function loop(load: Partial<LoadParams> = {}): System {
  return createSystem(
    {
      pump: { kind: PUMP, params: { flow: 15 } },
      boiler: { kind: BOILER },
      load: { kind: LOAD, params: load },
    },
    {
      'boiler.flowIn': 'pump.flow',
      'boiler.returnTemp': 'load.returnTemp',
      'load.flowIn': 'pump.flow',
      'load.flowTemp': 'boiler.flowTemp',
    },
    {
      'pump.running': true,
      'boiler.demand': true,
      'boiler.gas': true,
      'boiler.reset': false,
    },
  );
}

const temp = (s: System) => output(s, 'load.returnTemp') as number;
const status = (s: System) => output(s, 'boiler.status') as string;

/** Each tick's state, a second apart. */
function history(start: System, seconds: number, sleeping = true) {
  const out: System[] = [];
  let s = start;
  for (let i = 0; i < seconds; i++) {
    s = stepSystem(s, 1, { sleeping });
    out.push(s);
  }
  return out;
}

describe('a block shows the world only its ports', () => {
  it('refuses a wire to a port a block does not declare', () => {
    expect(() =>
      createSystem(
        { pump: { kind: PUMP }, boiler: { kind: BOILER } },
        { 'boiler.mode': 'pump.flow' },
      ),
    ).toThrow(/no input "mode"/);
  });

  it('keeps its insides to itself: the boiler’s outputs are only what it declares', () => {
    const s = run(loop(), 60);
    expect(Object.keys(s.blocks.boiler.outputs).sort()).toEqual(
      BOILER.outputs.map((o) => o.name).sort(),
    );
    // Its controller's mode and timers are in its state, not on its ports.
    expect(s.blocks.boiler.outputs).not.toHaveProperty('timer');
  });
});

describe('a boiler heating a load through a pump, block by block', () => {
  it('warms the load and settles where the boiler’s heat equals the load’s loss', () => {
    // Holding its flow at 80 °C into 15 m³/h, against a loss of 4 kW/K above
    // 20 °C: the load settles at T where 1.163·15·(80 − T) = 4·(T − 20).
    const carry = WATER_HEAT * 15;
    const s = run(loop(), 4 * 3600);
    expect(temp(s)).toBeCloseTo((carry * 80 + 4 * 20) / (carry + 4), 0);
    expect(output(s, 'boiler.flowTemp')).toBeCloseTo(80, 0);
    const heat = output(s, 'boiler.heat') as number;
    const lost = output(s, 'load.heatLost') as number;
    expect(Math.abs(heat - lost) / lost).toBeLessThan(0.03);
  });

  it('stops stepping blocks that are steady, and saves almost all the work', () => {
    const warm = run(loop(), 4 * 3600);
    const before = warm.stats;
    const after = run(warm, 3600).stats;
    const stepped = after.stepped - before.stepped,
      slept = after.slept - before.slept;
    expect(slept / (stepped + slept)).toBeGreaterThan(0.95);
  });

  it('loses almost nothing for it: sleeping and stepping everything agree within half a kelvin', () => {
    const asleep = history(loop(), 4 * 3600, true);
    const awake = history(loop(), 4 * 3600, false);
    let worst = 0;
    for (let i = 59; i < asleep.length; i += 60)
      worst = Math.max(worst, Math.abs(temp(asleep[i]) - temp(awake[i])));
    expect(worst).toBeLessThan(0.6);
    // And it did much less work.
    expect(asleep.at(-1)!.stats.stepped).toBeLessThan(
      awake.at(-1)!.stats.stepped / 3,
    );
  });

  it('wakes a sleeping boiler the moment its flow fails, and fires again when it returns', () => {
    const steady = run(loop(), 4 * 3600);
    expect(steady.blocks.boiler.slept).not.toBeNull();
    const stopped = stepSystem(setInput(steady, 'pump.running', false), 1);
    // The pump stepped first this tick, so the boiler saw no flow at once.
    expect(status(stopped)).toBe('blocked: no flow');
    expect(output(stopped, 'boiler.heat')).toBe(0);
    const restarted = run(
      setInput(stopped, 'pump.running', true),
      BOILER.params.purge + BOILER.params.ignition + 3,
    );
    expect(status(restarted)).toBe('firing');
  });

  it('locks out on a failed ignition, and only RESET clears it', () => {
    let s = run(setInput(loop(), 'boiler.gas', false), 30);
    expect(output(s, 'boiler.fault')).toBe('ignition failure');
    s = run(setInput(s, 'boiler.gas', true), 60);
    expect(output(s, 'boiler.fault')).toBe('ignition failure');
    s = run(setInput(s, 'boiler.reset', true), 1);
    s = run(setInput(s, 'boiler.reset', false), 30);
    expect(status(s)).toBe('firing');
  });
});

describe('the experiment: a boiler heating a tank on a closed loop', () => {
  // Two tonnes of water losing 0.8 kW per kelvin: even at the boiler's
  // lowest fire (60 kW) it would settle at 95 °C, so its temperature, and
  // the boiler's return, climb past the boiler's 85 °C limit.
  const tank = { capacity: 4186 * 2, loss: 0.8 };
  const seconds = 4 * 3600;
  const crossing = (h: System[]) =>
    h.findIndex((s) => temp(s) > BOILER.params.returnLimit);
  const shutdown = (h: System[]) =>
    h.findIndex((s) => status(s) === 'standby: return too hot');

  it('switches the boiler off once its return has been over its limit for its confirmation time', () => {
    const h = history(loop(tank), seconds, false);
    const over = crossing(h),
      off = shutdown(h);
    expect(over).toBeGreaterThan(0);
    // Off after `confirm` seconds over the limit, give or take the tick.
    expect(off - over).toBeGreaterThanOrEqual(BOILER.params.confirm - 1);
    expect(off - over).toBeLessThanOrEqual(BOILER.params.confirm + 1);
    expect(output(h[off], 'boiler.heat')).toBe(0);
  });

  it('switches off asleep too, woken by the limit, within a few percent of stepping everything', () => {
    const awake = history(loop(tank), seconds, false);
    const asleep = history(loop(tank), seconds, true);
    // Asleep, the boiler is woken as soon as it sees its return over the
    // limit, and is off its confirmation time later.
    const seen = crossing(asleep),
      off = shutdown(asleep);
    expect(off - seen).toBeGreaterThanOrEqual(BOILER.params.confirm - 1);
    expect(off - seen).toBeLessThanOrEqual(BOILER.params.confirm + 1);
    // Sleeping lets the tank drift a twentieth of a kelvin unseen; on a
    // climb this shallow (about 0.0006 K/s at 85 °C) that, and small
    // differences earlier in the warm-up, add up to a few minutes: within
    // five percent of the time stepping everything.
    expect(Math.abs(off - shutdown(awake)) / shutdown(awake)).toBeLessThan(
      0.05,
    );
    // For a fraction of the work.
    expect(asleep.at(-1)!.stats.stepped).toBeLessThan(
      awake.at(-1)!.stats.stepped / 3,
    );
  });

  it('starts again once the tank has cooled its differential below the limit', () => {
    const h = history(loop(tank), 4 * 3600, true);
    const off = shutdown(h);
    expect(off).toBeGreaterThan(0);
    const again = h.findIndex((s, i) => i > off && status(s) === 'firing');
    expect(again).toBeGreaterThan(off);
    expect(temp(h[again - 1])).toBeLessThanOrEqual(
      BOILER.params.returnLimit - BOILER.params.differential + 0.6,
    );
  });
});
