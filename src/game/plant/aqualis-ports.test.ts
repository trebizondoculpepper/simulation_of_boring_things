import { describe, expect, it } from 'vite-plus/test';
import {
  idealPump,
  keyedDiaphragmPump,
  motorPump,
  peristalticPump,
  PERI_30,
} from '../../toolkit/components/plant/logic/metering-pump';
import type {
  KeyedDiaphragmState,
  MeteringKind,
  PeristalticState,
} from '../../toolkit/components/plant/logic/metering-pump';
import { pressKey } from '../../toolkit/components/plant/logic/diaphragm-pump';
import {
  pressMotorKey,
  setRuptured,
} from '../../toolkit/components/plant/logic/motor-dosing-pump';
import type {
  LevelInput,
  MotorPumpState,
} from '../../toolkit/components/plant/logic/motor-dosing-pump';
import {
  DELIVERING_FLOOR,
  pumpFeedback,
  pumpInputs,
  pumpMode,
  signalMa,
} from './aqualis-ports';
import type { PortSignal } from './aqualis-ports';
import { channelStatus } from './aqualis-controller';
import { INJECTION_BAR, stepPump } from './dosing-pumps';
import type { DosingPump, PumpState } from './dosing-pumps';
import type { MeteringPump } from '../../toolkit/components/plant/logic/metering-pump';

/**
 * The Trio's control ports against every kind of metering pump (mission
 * 114, step 2): what each pump wires back as `ChannelFeedback`, and what
 * the Trio's demand and release do to it, kind by kind and state by state.
 */

const MODELS: Record<MeteringKind, MeteringPump<PumpState>> = {
  ideal: idealPump(2) as unknown as MeteringPump<PumpState>,
  solenoid: keyedDiaphragmPump(
    'solenoid',
  ) as unknown as MeteringPump<PumpState>,
  stepper: keyedDiaphragmPump('stepper') as unknown as MeteringPump<PumpState>,
  motor: motorPump as unknown as MeteringPump<PumpState>,
  peristaltic: peristalticPump as unknown as MeteringPump<PumpState>,
};
const KINDS = Object.keys(MODELS) as MeteringKind[];
const MOST: Record<MeteringKind, number> = {
  ideal: 2,
  solenoid: 2.1,
  stepper: 7.5,
  // The DMH at its commissioned stroke dial, 60 %.
  motor: 21 * 0.6,
  peristaltic: 30,
};

const newPump = (kind: MeteringKind): DosingPump => ({
  kind,
  state: MODELS[kind].initial(),
  running: false,
  setLh: 0,
  fault: null,
  meanLh: 0,
  deliveredL: 0,
});

/** The pump `seconds` on in 0.1 s steps, given its port's signal and its plant. */
function run(
  pump: DosingPump,
  signal: PortSignal,
  seconds: number,
  plant: { level?: LevelInput; bar?: number; interlock?: boolean } = {},
): DosingPump {
  let p = pump;
  for (let t = 0; t < seconds - 1e-9; t += 0.1)
    p = stepPump(
      p,
      MODELS[p.kind],
      pumpInputs(
        signal,
        {
          interlock: plant.interlock ?? true,
          powered: true,
          level: plant.level ?? 'ok',
        },
        plant.bar ?? INJECTION_BAR,
      ),
      0.1,
    ).pump;
  return p;
}

const feedback = (p: DosingPump, powered = true) =>
  pumpFeedback(p, MODELS[p.kind], powered);

/** The pump put into its own manual mode at its keys. */
function manual(p: DosingPump): DosingPump {
  switch (p.kind) {
    case 'solenoid':
    case 'stepper': {
      const s = p.state as KeyedDiaphragmState;
      return { ...p, state: { ...s, keys: pressKey(s.keys, 'mode') } };
    }
    case 'motor':
      return {
        ...p,
        state: pressMotorKey(p.state as MotorPumpState, 'mode'),
      };
    case 'peristaltic':
      return {
        ...p,
        state: { ...(p.state as PeristalticState), mode: 'manual' },
      };
    case 'ideal':
      return p;
  }
}

/** The pump stopped at its keys. */
function stopped(p: DosingPump): DosingPump {
  switch (p.kind) {
    case 'solenoid':
    case 'stepper': {
      const s = p.state as KeyedDiaphragmState;
      return { ...p, state: { ...s, keys: pressKey(s.keys, 'stop') } };
    }
    case 'motor':
      return {
        ...p,
        state: pressMotorKey(p.state as MotorPumpState, 'startStop'),
      };
    case 'peristaltic':
      return { ...p, state: { ...(p.state as PeristalticState), on: false } };
    case 'ideal':
      return p;
  }
}

/** Gas let into its head: a gas-lock for a diaphragm pump. */
function gassed(p: DosingPump, ml: number): DosingPump {
  if (p.kind === 'motor') {
    const s = p.state as MotorPumpState;
    return { ...p, state: { ...s, gasMl: s.gasMl + ml } };
  }
  if (p.kind === 'solenoid' || p.kind === 'stepper') {
    const s = p.state as KeyedDiaphragmState;
    return { ...p, state: { ...s, head: { ...s.head, gasMl: ml } } };
  }
  return p;
}

const ON: PortSignal = { release: true, demand: 0.5 };

describe('the Trio’s 4–20 mA signal', () => {
  it('runs from 4 mA at no demand to 20 mA at full, clamped', () => {
    expect(signalMa(0)).toBe(4);
    expect(signalMa(0.5)).toBe(12);
    expect(signalMa(1)).toBe(20);
    expect(signalMa(-1)).toBe(4);
    expect(signalMa(2)).toBe(20);
  });

  it('puts the release in series with the plant’s interlocks', () => {
    const plant = { interlock: false, powered: true, level: 'ok' as const };
    expect(pumpInputs(ON, plant, 2).release).toBe(false);
    expect(pumpInputs(ON, { ...plant, interlock: true }, 2).release).toBe(true);
    expect(
      pumpInputs({ ...ON, release: false }, { ...plant, interlock: true }, 2)
        .release,
    ).toBe(false);
  });
});

describe.each(KINDS)('a %s pump on the Trio’s port', (kind) => {
  const most = MOST[kind];

  it('is new in remote, healthy, its most its rating', () => {
    const f = feedback(newPump(kind));
    expect(f).toEqual({
      mode: 'remote',
      powered: true,
      running: false,
      fault: null,
      delivering: 0,
      most: expect.closeTo(most, 6) as number,
    });
    expect(channelStatus(f, 0)).toEqual({ kind: 'online' });
  });

  it('delivers the demand’s share of its most in remote, and reports it', () => {
    const p = run(newPump(kind), ON, 120);
    const f = feedback(p);
    expect(f.running).toBe(true);
    expect(f.delivering).toBeGreaterThan(0.4 * most);
    expect(f.delivering).toBeLessThan(0.6 * most);
    // Twice the demand, about twice the dose.
    const full = feedback(
      run(newPump(kind), { release: true, demand: 1 }, 120),
    );
    expect(full.delivering / f.delivering).toBeGreaterThan(1.6);
  });

  it('doses nothing with its release open, however high the demand', () => {
    const p = run(newPump(kind), { release: false, demand: 1 }, 60);
    expect(feedback(p).running).toBe(false);
    expect(p.deliveredL).toBe(0);
    // Nor with a plant interlock open.
    const q = run(newPump(kind), { release: true, demand: 1 }, 60, {
      interlock: false,
    });
    expect(q.deliveredL).toBe(0);
  });

  it('reads as delivering nothing within a few minutes of stopping', () => {
    const p = run(
      run(newPump(kind), ON, 60),
      { release: false, demand: 0 },
      150,
    );
    expect(p.meanLh).toBeGreaterThan(0);
    expect(p.meanLh).toBeLessThan(most * DELIVERING_FLOOR);
    expect(feedback(p).delivering).toBe(0);
  });

  it('reports no power as unpowered and not running', () => {
    const f = feedback(run(newPump(kind), ON, 30), false);
    expect(f.powered).toBe(false);
    expect(f.running).toBe(false);
    expect(channelStatus(f, 0)).toMatchObject({
      kind: 'offline',
      reason: 'no-power',
    });
  });

  if (kind === 'ideal') {
    it('has no keys: always remote, never manual or off (a mismatch: the Trio cannot see it switched)', () => {
      expect(pumpMode(kind, manual(newPump(kind)).state)).toBe('remote');
      expect(pumpMode(kind, stopped(newPump(kind)).state)).toBe('remote');
    });

    it('has no level switch: it doses from a dry tank (a mismatch)', () => {
      const p = run(newPump(kind), ON, 30, { level: 'empty' });
      expect(p.deliveredL).toBeGreaterThan(0);
      expect(feedback(p).fault).toBeNull();
    });
    return;
  }

  it('in its own manual mode shows manual and ignores the demand, but obeys its release', () => {
    const m = manual(newPump(kind));
    expect(feedback(m).mode).toBe('manual');
    expect(channelStatus(feedback(m), 0)).toEqual({
      kind: 'offline',
      reason: 'manual',
      fault: null,
    });
    const low = run(m, { release: true, demand: 0 }, 120);
    const high = run(m, { release: true, demand: 1 }, 120);
    expect(low.deliveredL).toBeGreaterThan(0);
    expect(high.deliveredL).toBeCloseTo(low.deliveredL, 6);
    expect(run(m, { release: false, demand: 1 }, 60).deliveredL).toBe(0);
  });

  it('stopped at its keys shows off and doses nothing', () => {
    const s = stopped(newPump(kind));
    expect(feedback(s).mode).toBe('off');
    expect(channelStatus(feedback(s), 0)).toMatchObject({
      kind: 'offline',
      reason: 'switched-off',
    });
    expect(run(s, ON, 60).deliveredL).toBe(0);
  });

  it('latches its level switch’s fault with its tank dry, and clears it as the tank is filled', () => {
    const dry = run(newPump(kind), ON, 10, { level: 'empty' });
    expect(feedback(dry).fault).toBe('tank empty');
    expect(dry.deliveredL).toBe(0);
    expect(channelStatus(feedback(dry), 0)).toEqual({
      kind: 'offline',
      reason: 'fault',
      fault: 'tank empty',
    });
    const filled = run(dry, ON, 30);
    expect(feedback(filled).fault).toBeNull();
    expect(filled.deliveredL).toBeGreaterThan(0);
  });

  if (kind === 'peristaltic') {
    it('never gas-locks: gas passes through with the liquid', () => {
      const p = run(gassed(newPump(kind), 50), ON, 120);
      expect(feedback(p).fault).toBeNull();
      expect(feedback(p).delivering).toBeGreaterThan(0.4 * most);
    });

    it('stalls against a closed discharge, latched until reset at its keys', () => {
      const p = run(newPump(kind), ON, 5, { bar: Infinity });
      expect(feedback(p).fault).toBe('overpressure stall');
      expect(feedback(run(p, ON, 10)).fault).toBe('overpressure stall');
      const reset = { ...p, state: MODELS[kind].acknowledge(p.state) };
      expect(feedback(run(reset, ON, 10)).fault).toBeNull();
    });

    it('stops for a leak when its tube bursts, until the tube is changed', () => {
      const worn = {
        ...newPump(kind),
        state: {
          ...(newPump(kind).state as PeristalticState),
          tubeHours: PERI_30.tubeLifeH * PERI_30.burstLives,
        },
      };
      const p = run(worn, ON, 5);
      expect(feedback(p).fault).toBe('tube leak');
      expect(channelStatus(feedback(p), 0)).toMatchObject({
        reason: 'fault',
      });
    });
    return;
  }

  it('gas-locks: its flow monitor trips and latches until acknowledged at its keys', () => {
    // Stroking against gas: nothing delivered, then its flow monitor trips.
    const locked = run(
      gassed(newPump(kind), 50),
      { release: true, demand: 1 },
      60,
    );
    const f = feedback(locked);
    expect(f.fault).toBe('flow monitor tripped');
    // A flow trip is the fault, not OFF (the DMH's stops it as well).
    expect(f.mode).toBe('remote');
    expect(channelStatus(f, 0)).toEqual({
      kind: 'offline',
      reason: 'fault',
      fault: 'flow monitor tripped',
    });
    // It stays tripped, released and asked, until acknowledged.
    const still = run(locked, { release: true, demand: 1 }, 30);
    expect(feedback(still).fault).toBe('flow monitor tripped');
    expect(still.deliveredL).toBe(locked.deliveredL);
    // Acknowledged at its keys, as the world does it (`actOnDosingPumps`).
    const reset = {
      ...still,
      state: MODELS[kind].acknowledge(still.state),
      fault: null,
    };
    expect(feedback(reset).fault).toBeNull();
    expect(feedback(reset).mode).toBe('remote');
  });

  if (kind === 'motor') {
    it('takes its most from its stroke dial, and a ruptured diaphragm as a fault', () => {
      const p = newPump(kind);
      const half = {
        ...p,
        state: { ...(p.state as MotorPumpState), strokeLength: 0.5 },
      };
      expect(feedback(half).most).toBeCloseTo(10.5, 6);
      const torn = run(
        { ...p, state: setRuptured(p.state as MotorPumpState, true) },
        ON,
        2,
      );
      expect(feedback(torn).fault).toBe('diaphragm ruptured');
    });
  }
});
