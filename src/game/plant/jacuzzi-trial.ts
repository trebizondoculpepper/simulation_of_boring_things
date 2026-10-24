/**
 * The jacuzzi's cabinet on trial (the owner, 2026-10-24: a cabinet that
 * tests the jacuzzi cabinet with idealised pools, sources and tanks, and
 * a control panel to try it all out): the real cabinet controller
 * (`jacuzzi-cabinet.ts`) plumbed to an ideal spa, an ideal external
 * balance tank of the jacuzzi's size (`spa-balance-tank.ts`) and ideal
 * sources of power, water and heat, each of which the trial's panel can
 * cut; and the cabinet's eight valves, each the panel's to open or shut.
 * Nothing in it is the world's. Pure.
 *
 * The water goes round: the pump draws from the tank and returns to the
 * spa; the spa spills over its lip into its gutter, which drains to the
 * tank through the overflow valve. Bathers getting in lift the spa's
 * water over the lip, and it ends up in the tank; the gutter's water
 * drains back when the pump stops. The make-up tops the tank to its float
 * while the water source is on; above its brim the tank overflows to
 * waste. The drain empties the spa by gravity. Heat reaches the water
 * through the heat exchanger while the pump runs, the heat source is on
 * and both heating valves are open; otherwise it cools. Its rates are
 * quickened, so a trial takes minutes, not hours.
 */
import {
  actOnJacuzziCabinet,
  cabinetTanks,
  DISCONNECTED_VESSEL,
  jacuzziCabinetDisplay,
  jacuzziPumpCalled,
  jacuzziWaterFlowing,
  newJacuzziCabinet,
  stepJacuzziCabinet,
} from './jacuzzi-cabinet';
import type {
  JacuzziCabinetAction,
  JacuzziCabinetInputs,
  JacuzziCabinetState,
} from './jacuzzi-cabinet';
import {
  JACUZZI_BALANCE_TANK,
  JACUZZI_SPA,
  DISPLACEMENT_PER_BATHER,
} from './spa-balance-tank';

/** The trial's sizes and rates: SI units, quickened where it says. */
export const TRIAL = {
  /** The spa's water, brimming, m³. */
  spa: 2.8,
  /** Its surface, m². */
  area: JACUZZI_SPA.area,
  /** The pump's flow, m³/s. */
  flow: JACUZZI_SPA.flow / 3600,
  /** The gutter's water while the pump runs, m³; with its way to the tank shut, it holds this much before it floods the deck. */
  gutter: JACUZZI_SPA.transit,
  gutterFlood: 0.3,
  /** The tank. */
  tank: JACUZZI_BALANCE_TANK,
  /** The ideal water source's make-up, m³/s: 2 L/s. */
  makeUp: 0.002,
  /** The drain, by gravity, m³/s: 4 L/s. */
  drain: 0.004,
  /** Its seats, every one taken when the bathers are in. */
  seats: JACUZZI_SPA.seats,
  /** Heating and cooling, °C a second: quickened, 2 °C a minute up, 0.5 down. */
  heat: 2 / 60,
  cool: 0.5 / 60,
  ambient: 20,
  /** How far under the lip the jets' level switch sits, as depth over the surface, m. */
  levelSwitch: 0.03,
  /** The tank's low-low clears this much above its setting. */
  lowLowBand: 0.05,
} as const;

export type TrialValve =
  | 'suction'
  | 'overflow'
  | 'return'
  | 'heatingFlow'
  | 'heatingReturn'
  | 'jetsSuction'
  | 'jetsDischarge'
  | 'air'
  | 'drain';

/** The cabinet's valves, in its panel's order, each with its tag and name. */
export const TRIAL_VALVES: readonly {
  id: TrialValve;
  tag: string;
  legend: string;
}[] = [
  { id: 'suction', tag: 'IV8', legend: 'SUCTION FROM TANK' },
  { id: 'overflow', tag: 'IV2', legend: 'OVERFLOW FROM SPA' },
  { id: 'return', tag: 'IV1', legend: 'RETURN TO SPA' },
  { id: 'heatingFlow', tag: 'IV3', legend: 'HEATING FLOW' },
  { id: 'heatingReturn', tag: 'IV4', legend: 'HEATING RETURN' },
  { id: 'jetsSuction', tag: 'IV5', legend: 'JETS SUCTION' },
  { id: 'jetsDischarge', tag: 'IV6', legend: 'JETS DISCHARGE' },
  { id: 'air', tag: 'IV7', legend: 'AIR TO BLOWER RING' },
  { id: 'drain', tag: 'DV1', legend: 'DRAIN TO WASTE' },
];

export interface JacuzziTrial {
  cabinet: JacuzziCabinetState;
  valves: Record<TrialValve, boolean>;
  /** The ideal sources: power (through the cabinet's isolator), water and heat. */
  power: boolean;
  water: boolean;
  heat: boolean;
  /** Every seat taken. */
  bathers: boolean;
  /** Called for at the cabinet: the jets' pump and the blower. */
  jets: boolean;
  air: boolean;
  /** The water, m³: in the spa (its own, not the bathers'), in its gutter, in the tank. */
  spa: number;
  gutter: number;
  tank: number;
  /** The tank at low-low (latched until it recovers past its band). */
  tankLow: boolean;
  /** Lost, m³: over the tank's brim to waste, and over the gutter onto the deck. */
  overflowed: number;
  flooded: number;
  celsius: number;
  setpoint: number;
  time: number;
}

export function newJacuzziTrial(): JacuzziTrial {
  return {
    cabinet: newJacuzziCabinet(),
    valves: {
      suction: true,
      overflow: true,
      return: true,
      heatingFlow: true,
      heatingReturn: true,
      jetsSuction: true,
      jetsDischarge: true,
      air: true,
      drain: false,
    },
    power: true,
    water: true,
    heat: true,
    bathers: false,
    jets: false,
    air: false,
    spa: TRIAL.spa,
    gutter: TRIAL.gutter,
    tank: TRIAL.tank.float * TRIAL.tank.volume,
    tankLow: false,
    overflowed: 0,
    flooded: 0,
    celsius: 37,
    setpoint: 37,
    time: 0,
  };
}

/** The bathers' water, m³. */
const bathersIn = (t: JacuzziTrial) =>
  t.bathers ? TRIAL.seats * DISPLACEMENT_PER_BATHER : 0;

/** Whether the spa is full: its level within the jets' switch of its lip. */
export const trialFull = (t: JacuzziTrial) =>
  t.spa + bathersIn(t) >= TRIAL.spa - TRIAL.area * TRIAL.levelSwitch;

/** Whether its make-up is filling the tank: the water source on, below the float. */
const makingUp = (t: JacuzziTrial) =>
  t.water && t.tank < TRIAL.tank.float * TRIAL.tank.volume;

/** What the cabinet is given: the ideal power, its valves, and the ideal tank. */
export function trialInputs(t: JacuzziTrial): JacuzziCabinetInputs {
  return {
    supplied: t.power,
    path: t.valves.suction && t.valves.return,
    tank: cabinetTanks(
      {
        tank: 'external',
        external: {
          fill: t.tank / TRIAL.tank.volume,
          low: t.tankLow,
          filling: makingUp(t),
        },
      },
      DISCONNECTED_VESSEL,
    ).draws,
  };
}

/** What runs: the jets and the blower, with the water moving, full, and their valves open. */
export function trialRuns(t: JacuzziTrial) {
  const flowing = jacuzziWaterFlowing(t.cabinet, trialInputs(t));
  const ok = flowing && trialFull(t);
  return {
    jets: ok && t.jets && t.valves.jetsSuction && t.valves.jetsDischarge,
    air: ok && t.air && t.valves.air,
  };
}

/** Heat reaching the heat exchanger: the source on and both valves open. */
const heatSupply = (t: JacuzziTrial) =>
  t.heat && t.valves.heatingFlow && t.valves.heatingReturn;

export type TrialAction =
  | { act: 'valve'; valve: TrialValve; open: boolean }
  | { act: 'source'; source: 'power' | 'water' | 'heat'; on: boolean }
  | { act: 'bathers'; in: boolean }
  | { act: 'cabinet'; action: JacuzziCabinetAction }
  /** The cabinet's JETS or AIR pressed: refused, as the world's, unless full. */
  | { act: 'toggle'; what: 'jets' | 'air' }
  | { act: 'setpoint'; celsius: number };

export function actOnJacuzziTrial(
  t: JacuzziTrial,
  a: TrialAction,
): JacuzziTrial {
  switch (a.act) {
    case 'valve':
      return { ...t, valves: { ...t.valves, [a.valve]: a.open } };
    case 'source':
      return { ...t, [a.source]: a.on };
    case 'bathers':
      return { ...t, bathers: a.in };
    case 'cabinet':
      return {
        ...t,
        cabinet: actOnJacuzziCabinet(t.cabinet, a.action, trialInputs(t).path),
      };
    case 'toggle':
      // Stopping is always allowed; starting, only full.
      return t[a.what] || trialFull(t) ? { ...t, [a.what]: !t[a.what] } : t;
    case 'setpoint':
      return { ...t, setpoint: Math.max(30, Math.min(40, a.celsius)) };
  }
}

/** The trial `dt` seconds on. */
export function stepJacuzziTrial(t: JacuzziTrial, dt: number): JacuzziTrial {
  const V = TRIAL.tank.volume;
  const inputs = trialInputs(t);
  const cabinet = stepJacuzziCabinet(t.cabinet, inputs, dt);
  const flowing = jacuzziWaterFlowing(cabinet, inputs);
  let { spa, gutter, tank, overflowed, flooded, celsius } = t;
  // The pump: from the tank to the spa.
  const pumped = flowing ? Math.min(TRIAL.flow * dt, tank) : 0;
  tank -= pumped;
  spa += pumped;
  // Over the lip into the gutter: whatever stands above it, bathers and all.
  const over = spa + bathersIn(t) - TRIAL.spa;
  if (over > 0) {
    spa -= Math.min(over, spa);
    gutter += over;
  }
  // The gutter to the tank, through the overflow valve: it holds the pump's
  // water in transit while it runs and drains back when it stops.
  if (t.valves.overflow) {
    const k = Math.min(1, (TRIAL.flow / TRIAL.gutter) * dt);
    const back = gutter * k;
    gutter -= back;
    tank += back;
  }
  // Shut, it backs up, and over its brim onto the deck.
  if (!t.valves.overflow && gutter > TRIAL.gutterFlood) {
    flooded += gutter - TRIAL.gutterFlood;
    gutter = TRIAL.gutterFlood;
  }
  // The drain, by gravity.
  if (t.valves.drain) spa -= Math.min(TRIAL.drain * dt, spa);
  // The make-up, to the float.
  if (makingUp({ ...t, tank }))
    tank = Math.min(TRIAL.tank.float * V, tank + TRIAL.makeUp * dt);
  if (tank > V) {
    overflowed += tank - V;
    tank = V;
  }
  // Low-low, and its recovery past its band.
  const fill = tank / V;
  const tankLow = t.tankLow
    ? fill < TRIAL.tank.lowLow + TRIAL.lowLowBand
    : fill <= TRIAL.tank.lowLow;
  // The water's heat: to the setting while it can, else cooling.
  if (flowing && heatSupply(t) && celsius < t.setpoint)
    celsius = Math.min(t.setpoint, celsius + TRIAL.heat * dt);
  else if (celsius > TRIAL.ambient)
    celsius = Math.max(TRIAL.ambient, celsius - TRIAL.cool * dt);
  const next = {
    ...t,
    cabinet,
    spa,
    gutter,
    tank,
    tankLow,
    overflowed,
    flooded,
    celsius,
    time: t.time + dt,
  };
  // The jets' interlock: no longer full, both cut out.
  return trialFull(next) ? next : { ...next, jets: false, air: false };
}

/** The trial `seconds` on, in steps of `dt`. */
export function runJacuzziTrial(t: JacuzziTrial, seconds: number, dt = 0.5) {
  for (let s = 0; s < seconds - 1e-9; s += dt) t = stepJacuzziTrial(t, dt);
  return t;
}

/** The cabinet's panel on trial, as `jacuzziCabinetPanel` gives the world's. */
export function trialPanel(t: JacuzziTrial, doorOpen = false) {
  const inputs = trialInputs(t);
  const pumpRun = jacuzziPumpCalled(t.cabinet, inputs);
  const flowing = jacuzziWaterFlowing(t.cabinet, inputs);
  return {
    supplied: inputs.supplied,
    pumpRun,
    flowing,
    uv: flowing && !doorOpen,
    dosing: flowing,
    heating: flowing && heatSupply(t) && t.celsius < t.setpoint,
    noFlow:
      inputs.supplied &&
      (t.cabinet.trip !== '' || inputs.tank.low || (pumpRun && !inputs.path)),
    ...jacuzziCabinetDisplay({
      cabinet: t.cabinet,
      supplied: inputs.supplied,
      flowing,
      waterC: t.celsius,
      setC: t.setpoint,
      heatSupply: heatSupply(t),
      tank: inputs.tank,
      draining: t.valves.drain && t.spa > 0.001,
      doorOpen,
      time: t.time,
    }),
  };
}

/** The trial's readings, for its displays: litres and shares. */
export function trialReadings(t: JacuzziTrial) {
  return {
    spaLitres: (t.spa + bathersIn(t)) * 1000,
    spaShare: (t.spa + bathersIn(t)) / TRIAL.spa,
    tankLitres: t.tank * 1000,
    tankShare: t.tank / TRIAL.tank.volume,
    gutterLitres: t.gutter * 1000,
    wasteLitres: (t.overflowed + t.flooded) * 1000,
    full: trialFull(t),
  };
}
