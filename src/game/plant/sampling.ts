import type {
  BlockKind,
  PortValue,
  PortValues,
  Sleep,
} from '../sim/block-kind';
import { compose } from '../sim/composite';

/**
 * The sampling bypass and the water-quality controller, as blocks, and the
 * dosing room's panel (flow cell, probes and controller) as one block made
 * of them (`sim/composite.ts`). Pure. Units: sample flow l/h, pressure bar,
 * free chlorine mg/l, pH, temperature °C, time s.
 *
 * After Wallace & Tiernan's Depolox pool cell and ProMinent's DULCOMETER
 * and DULCOMARIN controllers (`doc/research/water-sampling.md`). A tapping
 * on the pump outlet main, before the filters and any dosing point, feeds
 * a small sample line (with a booster pump where the main's pressure is
 * low) to a flow cell holding about 33 l/h, whose flow switch alarms below
 * about 21 l/h. In the cell sit the free-chlorine probe (a grit-cleaned
 * bare-electrode amperometric cell, the period's choice), the pH glass
 * electrode and a temperature probe. Each probe drifts and fouls with age,
 * and is trimmed by the daily check against the manual DPD test.
 *
 * The probes read the water in the cell, not the pool's. With sample flow,
 * the cell's water is the sample's, a minute or so behind. Without it, the
 * water stands: its chlorine is slowly consumed and its pH and temperature
 * hold, so the readings look frozen while the pool drifts away from them.
 * That is why the controller stops dosing once sample flow has been lost
 * for its delay, and why the flow input must never be bridged.
 *
 * The controller doses hypochlorite and acid in proportion to how far each
 * reading is from its setpoint, and inhibits dosing on lost sample flow
 * (after its delay), on circulation failure, on an empty chemical tank, or
 * when a pump has dosed at full for too long without effect (latched until
 * reset). Its touch screen is a small state machine: a page and what it
 * shows, paged by the buttons pressed.
 */

const num = (v: PortValue | undefined): number | null =>
  typeof v === 'number' ? v : null;
const clamp = (x: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, x));

// ---- The tapping and the sample line --------------------------------------------

export interface TapParams {
  /** The needle valve's flow fully open at 1 bar, l/h (it goes as √pressure). */
  k: number;
  /** The flow control valve's setting, l/h: the most the line passes. */
  regulated: number;
}

/**
 * The sample tapping on the pump outlet main and its line to the flow
 * cell: a needle valve passing flow as the square root of the main's
 * pressure, capped by the cell's flow control valve. Blocked (a strainer
 * choked, a ball valve left shut, an air lock), it passes nothing.
 */
export const SAMPLE_TAP: BlockKind<TapParams, null> = {
  kind: 'sample-tap',
  inputs: [
    { name: 'pressure', unit: 'bar', about: 'the outlet main, gauge' },
    { name: 'opening', about: 'needle valve, 0 to 1' },
    { name: 'blocked' },
  ],
  outputs: [{ name: 'flow', unit: 'l/h' }],
  // 45 l/h at 1 bar fully open: 33 l/h needs about 0.55 bar, and below
  // about 0.22 bar the flow switch drops out.
  params: { k: 45, regulated: 33 },
  init: () => null,
  read(p, _s, i) {
    const pressure = Math.max(0, num(i.pressure) ?? 0);
    const opening = clamp(num(i.opening) ?? 1, 0, 1);
    const flow =
      i.blocked === true
        ? 0
        : Math.min(p.regulated, p.k * opening * Math.sqrt(pressure));
    return { flow };
  },
  // Stateless: its flow follows its inputs through `read`, asleep or not.
  step: (p, s, i, _dt, t) => ({
    state: s,
    outputs: SAMPLE_TAP.read!(p, s, i, t),
    sleep: { until: Infinity, hold: {} },
  }),
};

/** The sample booster pump: adds its head to the line while it runs. */
export const SAMPLE_BOOSTER: BlockKind<{ boost: number }, null> = {
  kind: 'sample-booster',
  inputs: [{ name: 'pressure', unit: 'bar' }, { name: 'running' }],
  outputs: [{ name: 'pressure', unit: 'bar' }],
  params: { boost: 1.5 },
  init: () => null,
  read: (p, _s, i) => ({
    pressure: (num(i.pressure) ?? 0) + (i.running === true ? p.boost : 0),
  }),
  step: (p, s, i, _dt, t) => ({
    state: s,
    outputs: SAMPLE_BOOSTER.read!(p, s, i, t),
    sleep: { until: Infinity, hold: {} },
  }),
};

// ---- The flow cell --------------------------------------------------------------

export interface CellParams {
  /** The water the cell holds, l. */
  volume: number;
  /** Its flow switch: sample flow below this is lost, l/h. */
  switchAt: number;
  /** How fast standing water's chlorine is consumed: its time constant, s. */
  stagnant: number;
}

export interface CellWater {
  chlorine: number;
  pH: number;
  temperature: number;
  /** When it was last stepped, s. */
  at: number;
}

/** The cell's water `dt` seconds on, the sample arriving at `flow` l/h (exactly). */
function cellAfter(
  p: CellParams,
  s: CellWater,
  i: PortValues,
  dt: number,
): Omit<CellWater, 'at'> {
  const flow = Math.max(0, num(i.flow) ?? 0);
  // Turnover: the sample replaces the cell's water at flow / volume.
  const k = flow / 3600 / p.volume;
  const towards = (now: number, arriving: number | null) =>
    arriving === null || k === 0
      ? now
      : arriving + (now - arriving) * Math.exp(-k * dt);
  // Chlorine: mixed in by the flow and consumed all the while, so it
  // settles a little below the sample's and, standing, decays.
  const c = 1 / p.stagnant;
  const arriving = num(i.chlorine);
  const settle = arriving === null || k === 0 ? 0 : (arriving * k) / (k + c);
  const chlorine = settle + (s.chlorine - settle) * Math.exp(-(k + c) * dt);
  return {
    chlorine,
    pH: towards(s.pH, num(i.pH)),
    temperature: towards(s.temperature, num(i.temperature)),
  };
}

/**
 * The flow cell and its flow switch: holds the water the probes read.
 * Its flow switch can be fooled (stuck, or a magnet left on it) into
 * showing flow that is not there.
 */
export const FLOW_CELL: BlockKind<CellParams, CellWater> = {
  kind: 'flow-cell',
  inputs: [
    { name: 'flow', unit: 'l/h' },
    { name: 'chlorine', unit: 'mg/l', about: 'free chlorine in the sample' },
    { name: 'pH' },
    { name: 'temperature', unit: '°C' },
    { name: 'fooled', about: 'flow switch stuck showing flow' },
  ],
  outputs: [
    { name: 'flowOk', about: 'its flow switch' },
    { name: 'chlorine', unit: 'mg/l', about: 'in the cell' },
    { name: 'pH' },
    { name: 'temperature', unit: '°C' },
  ],
  // About half a litre: at 33 l/h, turned over in under a minute; standing
  // water's chlorine lasts hours, so a stopped cell's readings look frozen.
  params: { volume: 0.5, switchAt: 21, stagnant: 3 * 3600 },
  init: () => ({ chlorine: 0, pH: 7, temperature: 20, at: 0 }),
  // Its water now, carried on exactly from when it last stepped, so the
  // probes never read it stale.
  read(p, s, i, t) {
    const water = cellAfter(p, s, i, t - s.at);
    return {
      flowOk: i.fooled === true || (num(i.flow) ?? 0) >= p.switchAt,
      ...water,
    };
  },
  step(p, s, i, dt, t) {
    const water = cellAfter(p, s, i, dt);
    const state = { ...water, at: t };
    const outputs = FLOW_CELL.read!(p, state, i, t);
    const flow = num(i.flow) ?? 0;
    // Asleep once its water has caught up with the sample's (its readings
    // follow the sample through `read` meanwhile), or while it stands.
    const near = (a: number, b: number | null, tol: number) =>
      b === null || Math.abs(a - b) <= tol;
    const steady =
      flow <= 0 ||
      (near(water.chlorine, num(i.chlorine), 0.01) &&
        near(water.pH, num(i.pH), 0.005) &&
        near(water.temperature, num(i.temperature), 0.05));
    const hold: Sleep['hold'] =
      flow <= 0
        ? { flow: 0 }
        : { flow: 1, chlorine: 0.01, pH: 0.005, temperature: 0.05 };
    return {
      state,
      outputs,
      sleep: steady ? { until: Infinity, hold } : undefined,
    };
  },
};

// ---- The probes -----------------------------------------------------------------

export interface ProbeParams {
  /** Zero drift: how far its reading creeps, units an hour. */
  drift: number;
  /** Fouling: the fraction of its sensitivity lost an hour. */
  fouling: number;
  /** What the daily check trims: the span (chlorine) or the offset (pH, temperature). */
  trim: 'span' | 'offset';
  /** Its range: readings are clipped to it. */
  min: number;
  max: number;
}

export interface ProbeState {
  span: number;
  offset: number;
  /** The calibrate button as it was, to act on its press. */
  calibrate: boolean;
}

/** What the electrode gives for `value`, aged `t` seconds since it was fitted. */
const raw = (p: ProbeParams, value: number, t: number) => {
  const hours = t / 3600;
  return value * Math.max(0, 1 - p.fouling * hours) + p.drift * hours;
};

/**
 * A probe in the flow cell: reads the cell's water through its drift and
 * fouling and its trims. The daily check (the calibrate button, with the
 * manual test's value) trims it so it reads that value now; it goes on
 * drifting from there, until the next check catches it.
 */
export function probe(
  kind: string,
  params: ProbeParams,
): BlockKind<ProbeParams, ProbeState> {
  const self: BlockKind<ProbeParams, ProbeState> = {
    kind,
    inputs: [
      { name: 'value', about: 'the cell water' },
      { name: 'calibrate', about: 'the daily check, pressed' },
      { name: 'test', about: 'the manual test’s value' },
    ],
    outputs: [{ name: 'reading' }],
    params,
    init: () => ({ span: 1, offset: 0, calibrate: false }),
    // Its drift is a matter of time, so its reading follows the clock and
    // the cell, asleep or not.
    read(p, s, i, t) {
      const value = num(i.value);
      return {
        reading:
          value === null
            ? null
            : clamp(raw(p, value, t) * s.span + s.offset, p.min, p.max),
      };
    },
    step(p, s, i, _dt, t) {
      let { span, offset } = s;
      const pressed = i.calibrate === true;
      const value = num(i.value);
      const test = num(i.test);
      if (pressed && !s.calibrate && value !== null && test !== null) {
        const r = raw(p, value, t);
        if (p.trim === 'span' && r > 0) span = (test - offset) / r;
        else if (p.trim === 'offset') offset = test - r * span;
      }
      const state = { span, offset, calibrate: pressed };
      return {
        state,
        outputs: self.read!(p, state, i, t),
        // Only the calibrate button changes its trims.
        sleep: { until: Infinity, hold: { calibrate: 0 } },
      };
    },
  };
  return self;
}

/** Free chlorine: zero drift and a sensitivity lost to fouling, trimmed on span. */
export const CHLORINE_PROBE = probe('chlorine-probe', {
  drift: 0.002,
  fouling: 0.002,
  trim: 'span',
  min: 0,
  max: 10,
});
/** pH: a glass electrode drifting slowly, trimmed on offset. */
export const PH_PROBE = probe('ph-probe', {
  drift: 0.001,
  fouling: 0,
  trim: 'offset',
  min: 0,
  max: 14,
});
/** Temperature: a resistance thermometer, all but steady. */
export const TEMPERATURE_PROBE = probe('temperature-probe', {
  drift: 0,
  fouling: 0,
  trim: 'offset',
  min: -10,
  max: 60,
});

// ---- The controller -------------------------------------------------------------

export interface ControllerParams {
  /** Free chlorine's setpoint and proportional band, mg/l. */
  chlorineSet: number;
  chlorineBand: number;
  /** pH's setpoint and proportional band. */
  pHSet: number;
  pHBand: number;
  /** Measured-value alarms. */
  chlorineLow: number;
  chlorineHigh: number;
  pHLow: number;
  pHHigh: number;
  /** How long sample flow may be lost before dosing stops, s (0 to 600). */
  flowDelay: number;
  /** How long a pump may dose at full before it is stopped, s. */
  doseLimit: number;
}

/** The touch screen's pages, in the order its NEXT button steps through them. */
export const SCREENS = ['measure', 'chlorine', 'ph', 'alarms'] as const;

export interface ControllerState {
  /** How long sample flow has been lost, s. */
  flowLost: number;
  /** How long each pump has dosed at full, s, and whether it was stopped for it. */
  chlorineFull: number;
  acidFull: number;
  chlorineTimedOut: boolean;
  acidTimedOut: boolean;
  /** The page shown. */
  screen: number;
  /** The button and the reset as they were, to act on a press. */
  touch: PortValue;
  reset: boolean;
}

const fixed = (v: number | null, places: number) =>
  v === null ? '--' : v.toFixed(places);

/** Everything the controller shows and drives, from its state and its present inputs. */
function present(p: ControllerParams, s: ControllerState, i: PortValues) {
  const chlorine = num(i.chlorine);
  const pH = num(i.pH);
  const temperature = num(i.temperature);
  const sampleFlow = i.flowOk === true;
  const sampleFlowLow = !sampleFlow && s.flowLost >= p.flowDelay;
  const circulationFailed = i.circulating === false;
  const chlorineTankLow = i.chlorineTankLow === true;
  const acidTankLow = i.acidTankLow === true;
  const stopped = sampleFlowLow || circulationFailed;
  const chlorineCall =
    chlorine === null
      ? 0
      : clamp((p.chlorineSet - chlorine) / p.chlorineBand, 0, 1);
  const acidCall = pH === null ? 0 : clamp((pH - p.pHSet) / p.pHBand, 0, 1);
  // Inhibited for any reason but its own dosing timer, which counts only
  // while it is free to dose.
  const chlorineHeld = stopped || chlorineTankLow;
  const acidHeld = stopped || acidTankLow;
  const chlorineDemand = chlorineHeld || s.chlorineTimedOut ? 0 : chlorineCall;
  const acidDemand = acidHeld || s.acidTimedOut ? 0 : acidCall;
  const alarms = {
    sampleFlowLow,
    chlorineLow: chlorine !== null && chlorine < p.chlorineLow,
    chlorineHigh: chlorine !== null && chlorine > p.chlorineHigh,
    pHLow: pH !== null && pH < p.pHLow,
    pHHigh: pH !== null && pH > p.pHHigh,
    chlorineTankLow,
    acidTankLow,
    chlorineDoseTimeout: s.chlorineTimedOut,
    acidDoseTimeout: s.acidTimedOut,
  };
  const dosingInhibited =
    chlorineHeld || acidHeld || s.chlorineTimedOut || s.acidTimedOut;
  const screen = SCREENS[s.screen];
  const percent = (d: number) => `${Math.round(d * 100)}%`;
  const display =
    screen === 'measure'
      ? `Cl ${fixed(chlorine, 2)} mg/l  pH ${fixed(pH, 2)}  ${fixed(temperature, 1)} °C`
      : screen === 'chlorine'
        ? `Free chlorine ${fixed(chlorine, 2)} mg/l  set ${p.chlorineSet.toFixed(2)}  dose ${percent(chlorineDemand)}`
        : screen === 'ph'
          ? `pH ${fixed(pH, 2)}  set ${p.pHSet.toFixed(2)}  acid ${percent(acidDemand)}`
          : Object.entries(alarms)
              .filter(([, on]) => on)
              .map(([name]) => name)
              .join(', ') || 'No alarms';
  return {
    outputs: {
      chlorine,
      pH,
      temperature,
      sampleFlow,
      ...alarms,
      dosingInhibited,
      chlorineDemand,
      acidDemand,
      screen,
      display,
    } satisfies PortValues,
    chlorineFull: !chlorineHeld && !s.chlorineTimedOut && chlorineCall >= 1,
    acidFull: !acidHeld && !s.acidTimedOut && acidCall >= 1,
    sampleFlow,
  };
}

/**
 * The water-quality controller (after ProMinent's DULCOMARIN, its touch
 * screen kept as a deliberate anachronism): proportional dosing demands,
 * 0 to 1, for the hypochlorite and acid pumps, its alarms, the inhibit,
 * and its screen.
 */
export const WATER_QUALITY_CONTROLLER: BlockKind<
  ControllerParams,
  ControllerState
> = {
  kind: 'water-quality-controller',
  inputs: [
    { name: 'chlorine', unit: 'mg/l' },
    { name: 'pH' },
    { name: 'temperature', unit: '°C' },
    { name: 'flowOk', about: 'the flow cell’s switch' },
    { name: 'circulating', about: 'the circulation pumps running' },
    { name: 'chlorineTankLow' },
    { name: 'acidTankLow' },
    { name: 'reset', about: 'clears a dosing-time stop' },
    { name: 'touch', about: 'the screen button pressed: next, back or home' },
  ],
  outputs: [
    { name: 'chlorine', unit: 'mg/l' },
    { name: 'pH' },
    { name: 'temperature', unit: '°C' },
    { name: 'sampleFlow' },
    { name: 'sampleFlowLow' },
    { name: 'chlorineLow' },
    { name: 'chlorineHigh' },
    { name: 'pHLow' },
    { name: 'pHHigh' },
    { name: 'chlorineTankLow' },
    { name: 'acidTankLow' },
    { name: 'chlorineDoseTimeout' },
    { name: 'acidDoseTimeout' },
    { name: 'dosingInhibited' },
    { name: 'chlorineDemand', about: '0 to 1' },
    { name: 'acidDemand', about: '0 to 1' },
    { name: 'screen' },
    { name: 'display' },
  ],
  params: {
    chlorineSet: 1.0,
    chlorineBand: 0.2,
    pHSet: 7.4,
    pHBand: 0.2,
    chlorineLow: 0.5,
    chlorineHigh: 3.0,
    pHLow: 7.0,
    pHHigh: 7.8,
    flowDelay: 120,
    doseLimit: 1800,
  },
  init: () => ({
    flowLost: 0,
    chlorineFull: 0,
    acidFull: 0,
    chlorineTimedOut: false,
    acidTimedOut: false,
    screen: 0,
    touch: null,
    reset: false,
  }),
  // Its demands, alarms and screen follow its readings at once.
  read: (p, s, i) => present(p, s, i).outputs,
  step(p, s, i, dt, t) {
    let { screen, chlorineTimedOut, acidTimedOut } = s;
    let { chlorineFull, acidFull } = s;
    // A button pressed on the screen.
    if (typeof i.touch === 'string' && i.touch !== s.touch) {
      const n = SCREENS.length;
      if (i.touch === 'next') screen = (screen + 1) % n;
      else if (i.touch === 'back') screen = (screen - 1 + n) % n;
      else if (i.touch === 'home') screen = 0;
    }
    // The reset pressed: dosing-time stops cleared, their timers too.
    if (i.reset === true && !s.reset) {
      chlorineTimedOut = acidTimedOut = false;
      chlorineFull = acidFull = 0;
    }
    const before = present(
      p,
      { ...s, screen, chlorineTimedOut, acidTimedOut },
      i,
    );
    const flowLost = before.sampleFlow ? 0 : s.flowLost + dt;
    chlorineFull = before.chlorineFull ? chlorineFull + dt : 0;
    acidFull = before.acidFull ? acidFull + dt : 0;
    chlorineTimedOut ||= chlorineFull >= p.doseLimit;
    acidTimedOut ||= acidFull >= p.doseLimit;
    const state: ControllerState = {
      flowLost,
      chlorineFull,
      acidFull,
      chlorineTimedOut,
      acidTimedOut,
      screen,
      touch: i.touch ?? null,
      reset: i.reset === true,
    };
    const now = present(p, state, i);
    // Asleep unless a timer is counting toward its limit, and then until
    // it would reach it; woken by any switch, or by a reading crossing
    // into or out of full dosing.
    const due = [
      !now.sampleFlow && flowLost < p.flowDelay
        ? p.flowDelay - flowLost
        : Infinity,
      now.chlorineFull ? p.doseLimit - chlorineFull : Infinity,
      now.acidFull ? p.doseLimit - acidFull : Infinity,
    ];
    const chlorineEdge = p.chlorineSet - p.chlorineBand;
    const acidEdge = p.pHSet + p.pHBand;
    const sleep: Sleep = {
      until: t + Math.min(...due),
      hold: {
        flowOk: 0,
        circulating: 0,
        chlorineTankLow: 0,
        acidTankLow: 0,
        reset: 0,
        touch: 0,
      },
      within: {
        chlorine: now.chlorineFull
          ? [-Infinity, chlorineEdge]
          : [chlorineEdge + 1e-9, Infinity],
        pH: now.acidFull ? [acidEdge, Infinity] : [-Infinity, acidEdge - 1e-9],
      },
    };
    return { state, outputs: now.outputs, sleep };
  },
};

// ---- The panel ------------------------------------------------------------------

/**
 * The dosing room's water-quality panel as one block: flow cell, probes
 * and controller. Its probes' drift and fouling may be set (a panel whose
 * chlorine probe is going off, for a scenario).
 */
export function waterQualityPanel(
  probes: {
    chlorine?: Partial<ProbeParams>;
    pH?: Partial<ProbeParams>;
  } = {},
  controller: Partial<ControllerParams> = {},
) {
  return compose({
    kind: 'water-quality-panel',
    blocks: {
      cell: { kind: FLOW_CELL },
      cl: { kind: CHLORINE_PROBE, params: probes.chlorine },
      ph: { kind: PH_PROBE, params: probes.pH },
      temp: { kind: TEMPERATURE_PROBE },
      controller: { kind: WATER_QUALITY_CONTROLLER, params: controller },
    },
    wires: {
      'cl.value': 'cell.chlorine',
      'ph.value': 'cell.pH',
      'temp.value': 'cell.temperature',
      'controller.chlorine': 'cl.reading',
      'controller.pH': 'ph.reading',
      'controller.temperature': 'temp.reading',
      'controller.flowOk': 'cell.flowOk',
    },
    inputs: {
      sampleFlow: ['cell.flow'],
      chlorine: ['cell.chlorine'],
      pH: ['cell.pH'],
      temperature: ['cell.temperature'],
      fooled: ['cell.fooled'],
      circulating: ['controller.circulating'],
      chlorineTankLow: ['controller.chlorineTankLow'],
      acidTankLow: ['controller.acidTankLow'],
      reset: ['controller.reset'],
      touch: ['controller.touch'],
      calibrateChlorine: ['cl.calibrate'],
      testChlorine: ['cl.test'],
      calibratePH: ['ph.calibrate'],
      testPH: ['ph.test'],
    },
    outputs: Object.fromEntries(
      WATER_QUALITY_CONTROLLER.outputs.map(({ name }) => [
        name,
        `controller.${name}`,
      ]),
    ),
  });
}

export const WATER_QUALITY_PANEL = waterQualityPanel();
