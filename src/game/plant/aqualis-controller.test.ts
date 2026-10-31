import { describe, expect, it } from 'vite-plus/test';
import {
  CO2_PER_HCL,
  NOT_DELIVERING_AFTER,
  SAMPLE_LOSS_DELAY,
  newController,
  stepController,
  type ControllerInputs,
  type ControllerState,
} from './aqualis-controller';
import {
  DEFAULT_TARGETS,
  type AqualisReadings,
  type ChannelFeedback,
  type ChannelPorts,
} from './aqualis-types';

const READINGS: AqualisReadings = {
  freeChlorine: 1.3,
  combinedChlorine: 0.2,
  totalChlorine: 1.5,
  ph: 7.3,
  alkalinity: 120,
  calciumHardness: 250,
  lsi: 0,
  tds: 1000,
  sulphate: 100,
  temperature: 29,
};

const pump = (
  most: number,
  over: Partial<ChannelFeedback> = {},
): ChannelFeedback => ({
  mode: 'remote',
  powered: true,
  running: true,
  fault: null,
  delivering: 0,
  most,
  ...over,
});

const PORTS: ChannelPorts = {
  hypochlorite: pump(2.1),
  acid: pump(7.5),
  co2: null,
};

const inputs = (
  over: Partial<ControllerInputs> = {},
  r: Partial<AqualisReadings> = {},
): ControllerInputs => ({
  readings: { ...READINGS, ...r },
  sample: { flowing: true, flowLh: 40, lostFor: 0 },
  selector: 'auto',
  ports: PORTS,
  settings: {
    dynamics: { volumeM3: 500, flowM3h: 500 / 3 },
    targets: DEFAULT_TARGETS,
  },
  hand: { hypochlorite: 0, acid: 0, co2: 0 },
  ...over,
});

const step = (
  inp: ControllerInputs,
  s: ControllerState = newController(),
  dt = 10,
) => stepController(s, inp, dt);

/** Runs `n` steps of `dt`, feeding each port back what it was asked for. */
function run(inp: ControllerInputs, n: number, dt = 10, deliver = true) {
  let s = newController();
  let out = step(inp, s, dt).out;
  for (let i = 0; i < n; i++) {
    const ports = Object.fromEntries(
      Object.entries(inp.ports).map(([id, f]) => [
        id,
        f && {
          ...f,
          delivering:
            deliver && f.mode === 'remote'
              ? s.demands[id as keyof ChannelPorts] * f.most
              : f.delivering,
        },
      ]),
    ) as ChannelPorts;
    const r = stepController(s, { ...inp, ports }, dt);
    s = r.state;
    out = r.out;
  }
  return { state: s, out };
}

describe('AUTO', () => {
  it('doses hypochlorite when chlorine is low, more the lower it is', () => {
    const a = step(inputs({}, { freeChlorine: 1.0 })).out.demands.hypochlorite;
    const b = step(inputs({}, { freeChlorine: 0.6 })).out.demands.hypochlorite;
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(a);
    expect(step(inputs({}, { freeChlorine: 2 })).out.demands.hypochlorite).toBe(
      0,
    );
  });

  it('sizes the chlorine dose: u = 1 lifts the volume one band in an hour', () => {
    // 1.3 − 0.8 = 0.5, less the dead band (0.075): u = 0.85 → 0.85 × 250 g/h.
    const d = step(
      inputs(
        { ports: { ...PORTS, hypochlorite: pump(10) } },
        { freeChlorine: 0.8 },
      ),
    ).out;
    expect(d.channels.hypochlorite.demandRate).toBeCloseTo(
      (0.85 * 250) / 140,
      3,
    );
  });

  it('doses acid when pH is high, none when it is low', () => {
    const hi = step(inputs({}, { ph: 7.5 })).out.demands.acid;
    const higher = step(inputs({}, { ph: 7.6 })).out.demands.acid;
    expect(hi).toBeGreaterThan(0);
    expect(higher).toBeGreaterThan(hi);
    expect(step(inputs({}, { ph: 7.0 })).out.demands.acid).toBe(0);
  });

  it('caps demands at 1', () => {
    // 500 m³ at full scale wants 750 g/h of HCl, about 7.2 l/h: more than a 5 l/h pump.
    const ports = { ...PORTS, acid: pump(5) };
    const out = step(inputs({ ports }, { freeChlorine: 0, ph: 7.65 })).out;
    expect(out.demands.hypochlorite).toBe(1);
    expect(out.demands.acid).toBe(1);
  });

  it('stops inside the dead band', () => {
    const out = step(inputs({}, { freeChlorine: 1.25, ph: 7.32 })).out;
    expect(out.demands.hypochlorite).toBe(0);
    expect(out.demands.acid).toBe(0);
    // Just beyond it, it doses.
    expect(
      step(inputs({}, { freeChlorine: 1.2 })).out.demands.hypochlorite,
    ).toBeGreaterThan(0);
    expect(step(inputs({}, { ph: 7.34 })).out.demands.acid).toBeGreaterThan(0);
  });

  it('does not integrate inside the dead band', () => {
    expect(run(inputs({}, { freeChlorine: 1.27 }), 100).state.integral).toBe(0);
  });

  it('builds its integral against a lasting deficit, which keeps dosing in the dead band', () => {
    const { state } = run(inputs({}, { freeChlorine: 1.15 }), 360);
    expect(state.integral).toBeGreaterThan(0);
    const after = stepController(
      state,
      inputs({}, { freeChlorine: 1.3 }),
      10,
    ).out;
    expect(after.demands.hypochlorite).toBeGreaterThan(0);
  });

  it('locks out chlorine with pH more than 0.4 from its set point', () => {
    const out = step(inputs({}, { freeChlorine: 0.5, ph: 7.8 })).out;
    expect(out.lockout).toBe(true);
    expect(out.demands.hypochlorite).toBe(0);
    expect(out.demands.acid).toBeGreaterThan(0.9);
    expect(
      run(inputs({}, { freeChlorine: 0.5, ph: 7.8 }), 100).state.integral,
    ).toBe(0);
  });

  it('scales its doses with the entered volume', () => {
    const at = (volumeM3: number) =>
      step(
        inputs(
          {
            ports: { hypochlorite: pump(100), acid: pump(100), co2: null },
            settings: {
              dynamics: { volumeM3, flowM3h: volumeM3 / 3 },
              targets: DEFAULT_TARGETS,
            },
          },
          { freeChlorine: 1.0, ph: 7.45 },
        ),
      ).out.channels;
    expect(at(1000).hypochlorite.demandRate).toBeCloseTo(
      2 * at(500).hypochlorite.demandRate,
      6,
    );
    expect(at(1000).acid.demandRate).toBeCloseTo(
      2 * at(500).acid.demandRate,
      6,
    );
  });

  it('integrates more slowly at a longer turnover', () => {
    const at = (flowM3h: number) =>
      run(
        inputs(
          {
            settings: {
              dynamics: { volumeM3: 500, flowM3h },
              targets: DEFAULT_TARGETS,
            },
          },
          { freeChlorine: 1.15 },
        ),
        30,
      ).state.integral;
    expect(at(500 / 6)).toBeCloseTo(at(500 / 3) / 2, 6);
  });
});

describe('anti-windup', () => {
  it('holds the integral while chlorine’s channel is offline or unconnected', () => {
    for (const hypochlorite of [
      pump(2.1, { mode: 'off' }),
      pump(2.1, { mode: 'manual' }),
      pump(2.1, { powered: false }),
      null,
    ]) {
      const { state } = run(
        inputs({ ports: { ...PORTS, hypochlorite } }, { freeChlorine: 0.8 }),
        100,
      );
      expect(state.integral).toBe(0);
    }
  });

  it('holds the integral while the demand is pinned at 1', () => {
    const { state, out } = run(
      inputs(
        { ports: { ...PORTS, hypochlorite: pump(0.5) } },
        { freeChlorine: 0.5 },
      ),
      200,
    );
    expect(out.demands.hypochlorite).toBe(1);
    expect(state.integral).toBe(0);
  });

  it('bounds the integral by the band', () => {
    const { state } = run(
      inputs(
        { ports: { ...PORTS, hypochlorite: pump(1000) } },
        { freeChlorine: 1.0 },
      ),
      20000,
      60,
    );
    expect(state.integral).toBeCloseTo(0.5, 6);
  });

  it('holds the integral outside AUTO', () => {
    for (const selector of ['hand', 'off'] as const) {
      expect(
        run(inputs({ selector }, { freeChlorine: 0.8 }), 100).state.integral,
      ).toBe(0);
    }
  });
});

describe('acid and CO₂', () => {
  const both = (co2: ChannelFeedback | null) =>
    inputs(
      { ports: { hypochlorite: PORTS.hypochlorite, acid: pump(100), co2 } },
      { ph: 7.5 },
    );

  it('gives CO₂ the work first while it can take it', () => {
    const out = step(both(pump(10000))).out;
    expect(out.demands.co2).toBeGreaterThan(0);
    expect(out.demands.acid).toBe(0);
  });

  it('gives acid the remainder beyond CO₂’s most', () => {
    const alone = step(both(null)).out.channels.acid.demandRate * 104.8;
    const out = step(both(pump(200))).out;
    expect(out.demands.co2).toBe(1);
    expect(out.channels.acid.demandRate * 104.8).toBeCloseTo(
      alone - 200 / CO2_PER_HCL,
      3,
    );
  });

  it('gives acid all of it while CO₂ is offline, CO₂ still asked', () => {
    const alone = step(both(null)).out.demands.acid;
    const out = step(both(pump(10000, { mode: 'off' }))).out;
    expect(out.demands.acid).toBeCloseTo(alone, 9);
    expect(out.channels.co2.status).toEqual({
      kind: 'offline',
      reason: 'switched-off',
      fault: null,
    });
    expect(out.channels.co2.demand).toBeGreaterThan(0);
  });
});

describe('HAND and OFF', () => {
  it('passes HAND’s demands through, capped, none to an unconnected port', () => {
    const out = step(
      inputs({
        selector: 'hand',
        hand: { hypochlorite: 0.4, acid: 1.5, co2: 0.7 },
      }),
    ).out;
    expect(out.demands).toEqual({ hypochlorite: 0.4, acid: 1, co2: 0 });
    expect(out.inhibit).toBeNull();
    expect(out.channels.hypochlorite.demandRate).toBeCloseTo(0.84, 9);
  });

  it('runs HAND with no readings', () => {
    const out = step(
      inputs({
        selector: 'hand',
        readings: null,
        hand: { hypochlorite: 0.4, acid: 0, co2: 0 },
      }),
    ).out;
    expect(out.demands.hypochlorite).toBe(0.4);
  });

  it('doses nothing in OFF', () => {
    const out = step(
      inputs({ selector: 'off' }, { freeChlorine: 0.2, ph: 7.7 }),
    ).out;
    expect(out.inhibit).toBe('selector-off');
    expect(out.demands).toEqual({ hypochlorite: 0, acid: 0, co2: 0 });
  });

  it('doses nothing in AUTO with no readings', () => {
    const out = step(inputs({ readings: null })).out;
    expect(out.inhibit).toBe('no-readings');
    expect(out.demands).toEqual({ hypochlorite: 0, acid: 0, co2: 0 });
  });
});

describe('sample flow', () => {
  const lost = (lostFor: number, selector: 'auto' | 'hand' = 'auto') =>
    step(
      inputs(
        {
          selector,
          sample: { flowing: false, flowLh: 0, lostFor },
          hand: { hypochlorite: 1, acid: 1, co2: 0 },
        },
        { freeChlorine: 0.5 },
      ),
    ).out;

  it('keeps dosing through a short loss', () => {
    expect(lost(SAMPLE_LOSS_DELAY - 10).inhibit).toBeNull();
    expect(lost(SAMPLE_LOSS_DELAY - 10).demands.hypochlorite).toBeGreaterThan(
      0,
    );
  });

  it('stops all dosing, HAND too, after the delay', () => {
    for (const sel of ['auto', 'hand'] as const) {
      const out = lost(SAMPLE_LOSS_DELAY + 10, sel);
      expect(out.inhibit).toBe('sample-flow-lost');
      expect(out.demands).toEqual({ hypochlorite: 0, acid: 0, co2: 0 });
    }
  });
});

describe('channel status', () => {
  const statusOf = (hypochlorite: ChannelFeedback | null) =>
    step(inputs({ ports: { ...PORTS, hypochlorite } }, { freeChlorine: 0.8 }))
      .out.channels.hypochlorite;

  it('reads each reason', () => {
    expect(statusOf(null).status).toEqual({ kind: 'unconnected' });
    expect(statusOf(pump(2.1)).status).toEqual({ kind: 'online' });
    expect(statusOf(pump(2.1, { mode: 'off' })).status).toEqual({
      kind: 'offline',
      reason: 'switched-off',
      fault: null,
    });
    expect(statusOf(pump(2.1, { mode: 'manual' })).status).toEqual({
      kind: 'offline',
      reason: 'manual',
      fault: null,
    });
    expect(statusOf(pump(2.1, { powered: false })).status).toEqual({
      kind: 'offline',
      reason: 'no-power',
      fault: null,
    });
    expect(statusOf(pump(2.1, { fault: 'Low level' })).status).toEqual({
      kind: 'offline',
      reason: 'fault',
      fault: 'Low level',
    });
  });

  it('keeps an offline channel’s demand and rate; none for an unconnected one', () => {
    const off = statusOf(pump(2.1, { mode: 'manual', delivering: 1.2 }));
    expect(off.demand).toBeGreaterThan(0);
    expect(off.demandRate).toBeCloseTo(off.demand * 2.1, 9);
    expect(off.delivering).toBe(1.2);
    const none = statusOf(null);
    expect(none).toEqual({
      id: 'hypochlorite',
      status: { kind: 'unconnected' },
      demand: 0,
      demandRate: 0,
      delivering: 0,
    });
  });

  it('calls a channel asked for a dose and delivering nothing for minutes not delivering', () => {
    const inp = inputs({}, { freeChlorine: 0.8 });
    const n = NOT_DELIVERING_AFTER / 10;
    expect(
      run(inp, n - 2, 10, false).out.channels.hypochlorite.status.kind,
    ).toBe('online');
    expect(run(inp, n + 1, 10, false).out.channels.hypochlorite.status).toEqual(
      {
        kind: 'offline',
        reason: 'not-delivering',
        fault: null,
      },
    );
    expect(
      run(inp, n + 1, 10, true).out.channels.hypochlorite.status.kind,
    ).toBe('online');
  });
});
