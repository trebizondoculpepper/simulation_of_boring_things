import { describe, expect, it } from 'vite-plus/test';
import {
  CO2_DOSERS,
  CO2_FAULT_TEXT,
  CO2_PANEL,
  co2Feedback,
  demandToMa,
  maToDemand,
  newCo2Doser,
  openSeconds,
  pressureShare,
  resetCo2Doser,
  setCo2ManualRate,
  setCo2Mode,
  setCo2Power,
  setCo2Stuck,
  stepCo2Doser,
  trioSignal,
} from './co2-dosing';
import type { Co2Doser, Co2DoserInputs } from './co2-dosing';
import {
  ACID_G_PER_M3,
  CO2_PER_HCL,
  channelStatus,
  newController,
  stepController,
} from './aqualis-controller';
import type { ControllerInputs } from './aqualis-controller';
import { CHANNELS, DEFAULT_TARGETS } from './aqualis-types';
import type { AqualisReadings, ChannelFeedback } from './aqualis-types';
import { RIG_DEVICE_MOST } from './aqualis-rig';

const lounge = () => newCo2Doser(CO2_DOSERS.plant_pool_01);
const olympic = () => newCo2Doser(CO2_DOSERS.plant_pool_02);

const GOOD: Co2DoserInputs = {
  ...trioSignal(0.5),
  inletBar: 4,
  waterFlowing: true,
  gasAlarm: false,
};

/** Run a panel on steady inputs for `seconds`, in `dt` steps: its state and the grams it gave. */
function run(d: Co2Doser, i: Co2DoserInputs, seconds: number, dt = 1) {
  let grams = 0;
  for (let t = 0; t < seconds; t += dt) {
    const s = stepCo2Doser(d, i, dt);
    d = s.state;
    grams += s.grams;
  }
  return { d, grams };
}

describe('the Trio’s port: 4–20 mA and release', () => {
  it('sends 4 mA for nothing, 20 for the most, and closes the release while it asks', () => {
    expect(demandToMa(0)).toBe(4);
    expect(demandToMa(1)).toBe(20);
    expect(demandToMa(2)).toBe(20);
    expect(maToDemand(12)).toBe(0.5);
    expect(maToDemand(2)).toBe(0);
    expect(trioSignal(0.25)).toEqual({ ma: 8, release: true });
    expect(trioSignal(0)).toEqual({ ma: 4, release: false });
    expect(trioSignal(0.5, false)).toEqual({ ma: 0, release: false });
  });
});

describe('the panels’ sizes', () => {
  it('match the Trio’s pH channel: the Lounge’s takes all its full scale, the Olympic’s its base load', () => {
    const fullScale = (m3: number) => m3 * ACID_G_PER_M3 * CO2_PER_HCL;
    expect(CO2_DOSERS.plant_pool_01.most).toBeGreaterThan(fullScale(150));
    expect(CO2_DOSERS.plant_pool_01.most).toBe(RIG_DEVICE_MOST.co2);
    expect(CO2_DOSERS.plant_pool_02.most).toBeLessThan(fullScale(2500));
    // Three times the Olympic's estimated average of 15 kg a day.
    expect(CO2_DOSERS.plant_pool_02.most).toBeGreaterThan((3 * 15000) / 24);
    expect(CHANNELS.co2.unit).toBe('g/h');
  });
});

describe('the mass flow controller (the Olympic’s)', () => {
  it('in REMOTE holds demand × its range', () => {
    const { d, grams } = run(olympic(), GOOD, 3600, 10);
    expect(grams).toBeCloseTo(1000, 6);
    expect(d.delivering).toBeCloseTo(1000, 6);
    expect(d.open).toBe(true);
    expect(d.fault).toBeNull();
  });

  it('in REMOTE gives nothing with the release open', () => {
    const { grams, d } = run(olympic(), { ...GOOD, release: false }, 600);
    expect(grams).toBe(0);
    expect(d.fault).toBeNull();
  });

  it('in MANUAL doses its own rate, ignoring the Trio', () => {
    const d = setCo2ManualRate(setCo2Mode(olympic(), 'manual'), 400);
    const { grams } = run(d, { ...GOOD, ...trioSignal(0) }, 3600, 10);
    expect(grams).toBeCloseTo(400, 6);
    expect(setCo2ManualRate(d, 9999).manualRate).toBe(2000);
  });

  it('in OFF gives nothing', () => {
    const { grams, d } = run(setCo2Mode(olympic(), 'off'), GOOD, 600);
    expect(grams).toBe(0);
    expect(d.open).toBe(false);
  });

  it('unpowered gives nothing (its valve normally closed) and names no fault', () => {
    const { grams, d } = run(setCo2Power(olympic(), false), GOOD, 600);
    expect(grams).toBe(0);
    expect(d.fault).toBeNull();
  });

  it('passes less as the inlet falls toward the injection’s back pressure', () => {
    expect(pressureShare(4)).toBe(1);
    expect(pressureShare(2.3)).toBeCloseTo(1, 9);
    expect(pressureShare(1.8)).toBeCloseTo(0.5, 6);
    expect(pressureShare(1.3)).toBe(0);
  });
});

describe('the solenoid and rotameter (the Lounge’s)', () => {
  it('opens for its share of each cycle, so its average is demand × its needle valve’s setting', () => {
    expect(openSeconds(0, 60, 15, 60)).toBe(15);
    expect(openSeconds(10, 10, 15, 60)).toBe(5);
    expect(openSeconds(50, 20, 15, 60)).toBe(10);
    expect(openSeconds(0, 600, 15, 60)).toBe(150);
    const { grams } = run(lounge(), { ...GOOD, ...trioSignal(0.25) }, 3600);
    expect(grams).toBeCloseTo(75, 6);
  });

  it('gives the same on a coarse step', () => {
    const { grams } = run(lounge(), { ...GOOD, ...trioSignal(0.25) }, 3600, 7);
    expect(grams).toBeCloseTo(75, 0);
  });

  it('is open in the first part of its cycle and shut after', () => {
    let d = lounge();
    const i = { ...GOOD, ...trioSignal(0.5) };
    d = stepCo2Doser(d, i, 10).state;
    expect(d.open).toBe(true);
    expect(d.delivering).toBe(300);
    d = run(d, i, 30).d;
    expect(d.open).toBe(false);
    expect(d.delivering).toBe(0);
  });
});

describe('its faults', () => {
  it('shuts on the room’s gas alarm', () => {
    const { grams, d } = run(olympic(), { ...GOOD, gasAlarm: true }, 600);
    expect(grams).toBe(0);
    expect(d.fault).toBe('gas-alarm');
  });

  it('shuts with no supply pressure, and doses again when it comes back', () => {
    let { d, grams } = run(olympic(), { ...GOOD, inletBar: 0 }, 600);
    expect(grams).toBe(0);
    expect(d.fault).toBe('no-supply-pressure');
    ({ d, grams } = run(d, GOOD, 600));
    expect(d.fault).toBeNull();
    expect(grams).toBeGreaterThan(0);
  });

  it('shuts with no water flowing at the injection point', () => {
    const { grams, d } = run(olympic(), { ...GOOD, waterFlowing: false }, 600);
    expect(grams).toBe(0);
    expect(d.fault).toBe('no-water-flow');
  });

  it('calls a broken 4–20 mA loop in REMOTE, but not in MANUAL', () => {
    const cut = { ...GOOD, ...trioSignal(0.5, false) };
    expect(run(olympic(), cut, 60).d.fault).toBe('signal-lost');
    expect(run(setCo2Mode(olympic(), 'manual'), cut, 60).d.fault).toBeNull();
  });

  it('latches FLOW NOT PROVED with its valve stuck shut, until reset', () => {
    const stuck = setCo2Stuck(olympic(), 'shut');
    let { d } = run(stuck, GOOD, CO2_PANEL.proveAfter - 5);
    expect(d.fault).toBeNull();
    d = run(d, GOOD, 10).d;
    expect(d.fault).toBe('flow-not-proved');
    // Freed and reset, it doses again.
    d = resetCo2Doser(setCo2Stuck(d, null));
    const after = run(d, GOOD, 60);
    expect(after.d.fault).toBeNull();
    expect(after.grams).toBeGreaterThan(0);
  });

  it('doses a little less on a sagging inlet its regulator cannot quite hold, its flow still proved', () => {
    const { d, grams } = run(
      lounge(),
      { ...GOOD, ...trioSignal(1), inletBar: 2.1 },
      3600,
    );
    expect(d.fault).toBeNull();
    expect(grams).toBeCloseTo(300 * pressureShare(2.1), 6);
    expect(grams).toBeLessThan(300);
  });

  it('latches VALVE STUCK when stuck open, and keeps dosing whatever it is told', () => {
    const { d, grams } = run(
      setCo2Mode(setCo2Stuck(olympic(), 'open'), 'off'),
      GOOD,
      600,
    );
    expect(d.fault).toBe('valve-stuck');
    expect(grams).toBeCloseTo((2000 * 600) / 3600, 6);
  });
});

/** The Trio's view of the panel's feedback: what its pump status screen will show. */
const status = (f: ChannelFeedback | null) => channelStatus(f, 0);

describe('its feedback to the Trio', () => {
  it('is exactly a ChannelFeedback, in g/h', () => {
    const { d } = run(olympic(), GOOD, 60);
    const f: ChannelFeedback | null = co2Feedback(d);
    expect(f).toEqual({
      mode: 'remote',
      powered: true,
      running: true,
      fault: null,
      delivering: 1000,
      most: 2000,
    });
    expect(status(f)).toEqual({ kind: 'online' });
  });

  it('is nothing with its control cable not connected: unconnected', () => {
    expect(co2Feedback(olympic(), false)).toBeNull();
    expect(status(co2Feedback(olympic(), false))).toEqual({
      kind: 'unconnected',
    });
  });

  it('shows OFFLINE with each reason the Trio can tell', () => {
    const cases: [Co2Doser, Co2DoserInputs, object][] = [
      [setCo2Mode(olympic(), 'off'), GOOD, { reason: 'switched-off' }],
      [setCo2Mode(olympic(), 'manual'), GOOD, { reason: 'manual' }],
      [setCo2Power(olympic(), false), GOOD, { reason: 'no-power' }],
      [
        olympic(),
        { ...GOOD, gasAlarm: true },
        { reason: 'fault', fault: CO2_FAULT_TEXT['gas-alarm'] },
      ],
      [
        olympic(),
        { ...GOOD, inletBar: 0 },
        { reason: 'fault', fault: 'NO SUPPLY PRESSURE' },
      ],
      [
        olympic(),
        { ...GOOD, waterFlowing: false },
        { reason: 'fault', fault: 'NO WATER FLOW' },
      ],
      [
        olympic(),
        { ...GOOD, ...trioSignal(0.5, false) },
        { reason: 'fault', fault: 'SIGNAL LOST' },
      ],
      [
        setCo2Stuck(olympic(), 'shut'),
        GOOD,
        { reason: 'fault', fault: 'FLOW NOT PROVED' },
      ],
    ];
    for (const [d, i, want] of cases) {
      const after = run(d, i, 60).d;
      expect(status(co2Feedback(after)), JSON.stringify(want)).toMatchObject({
        kind: 'offline',
        ...want,
      });
    }
  });

  it('shows running only while gas is flowing', () => {
    expect(co2Feedback(run(olympic(), GOOD, 10).d)!.running).toBe(true);
    expect(
      co2Feedback(run(olympic(), { ...GOOD, ...trioSignal(0) }, 10).d)!.running,
    ).toBe(false);
  });
});

describe('with the Trio’s controller', () => {
  const READINGS: AqualisReadings = {
    freeChlorine: 1.3,
    combinedChlorine: 0.1,
    totalChlorine: 1.4,
    ph: 7.6,
    alkalinity: 120,
    calciumHardness: 250,
    lsi: 0.1,
    tds: 800,
    sulphate: 80,
    temperature: 28,
  };
  const inputs = (co2: ChannelFeedback | null): ControllerInputs => ({
    readings: READINGS,
    sample: { flowing: true, flowLh: 30, lostFor: 0 },
    selector: 'auto',
    ports: { hypochlorite: null, acid: null, co2 },
    settings: {
      dynamics: { volumeM3: 150, flowM3h: 37.5 },
      targets: DEFAULT_TARGETS,
    },
    hand: { hypochlorite: 0, acid: 0, co2: 0 },
  });

  it('takes its demand on ports.co2 and doses what the Trio asks, in g/h', () => {
    let control = newController();
    let doser = lounge();
    let asked = 0;
    let grams = 0;
    for (let t = 0; t < 600; t += 1) {
      const c = stepController(control, inputs(co2Feedback(doser)), 1);
      control = c.state;
      asked = c.out.channels.co2.demandRate;
      const s = stepCo2Doser(
        doser,
        { ...GOOD, ...trioSignal(c.out.demands.co2) },
        1,
      );
      doser = s.state;
      grams += s.grams;
      expect(c.out.channels.co2.status).toEqual({ kind: 'online' });
    }
    // pH 0.3 over its set point less its dead band: about two thirds of the 270 g/h full scale.
    expect(asked).toBeGreaterThan(100);
    expect(asked).toBeLessThan(300);
    // Ten minutes at that rate, give or take a part cycle.
    expect(grams).toBeGreaterThan((asked * 9) / 60);
    expect(grams).toBeLessThan((asked * 11) / 60);
  });

  it('goes OFFLINE on the Trio’s screen when the panel is switched off, still asking', () => {
    const doser = run(setCo2Mode(lounge(), 'off'), GOOD, 10).d;
    const c = stepController(newController(), inputs(co2Feedback(doser)), 1);
    expect(c.out.channels.co2.status).toMatchObject({
      kind: 'offline',
      reason: 'switched-off',
    });
    expect(c.out.channels.co2.demand).toBeGreaterThan(0);
  });
});
