import {
  CO2_MANIFOLD,
  co2Pressures,
  co2SupplyAlarms,
  drawCo2,
  newCo2Supply,
} from '../../toolkit/components/plant/logic/co2-supply';
import type { Co2Supply } from '../../toolkit/components/plant/logic/co2-supply';

/**
 * The CO₂ distribution (CO₂ dosing, the owner, 2026-10-31;
 * `doc/plans/co2-system.md`): the cylinder supply at the loading bay (the
 * banks, changeover manifold, regulator and emergency isolation valve of
 * mission 109's `co2-supply.ts`, reused as it is), the **master valve**
 * after it, and the low-pressure **building line** that carries the gas to
 * a **wall port** in each plant room that doses CO₂. The route between is
 * not modelled pipe by pipe: the line is one small volume of gas at one
 * pressure. Pure.
 *
 * - **The master valve** is a normally closed solenoid valve (after the
 *   gas-industry master shut-off solenoids that a CO₂ detection panel
 *   drives): open only while it is switched on, powered, and not tripped.
 *   A gas alarm's high level trips it (`tripMaster`); it stays shut until
 *   reset at the loading bay (a local control).
 * - **The line** holds a little gas (`CO2_LINE.volumeM3`, some 80 m of
 *   15 mm copper): its pressure is the ideal-gas pressure of what is in it.
 *   The regulator tops it up to its outlet pressure, up to its rated flow,
 *   while the master valve passes; with the supply stopped, whatever is
 *   still drawn (the dosing valves, a leak) empties it in a minute or two,
 *   and the pressure falls. A line nobody draws on holds its pressure (the
 *   regulator locks up; the line is tight).
 * - **Each wall port** has its isolating ball valve; open, the room sees
 *   the line's pressure, shut, nothing (the gas trapped behind it is
 *   neglected). A leaking joint on the room side of a port gives its gas
 *   into that room's air (`co2-detection.ts`), in proportion to the line's
 *   absolute pressure.
 * - **A leak at the manifold** (a pigtail) gives the cylinders' gas
 *   straight into the loading bay, master valve or no.
 */

/** The plant rooms with a CO₂ wall port: the Lounge (PL1) and the Olympic (PL2). */
export type Co2PortId = 'plant_pool_01' | 'plant_pool_02';
export const CO2_PORT_IDS: readonly Co2PortId[] = [
  'plant_pool_01',
  'plant_pool_02',
];

/** The building line's sizes. */
export const CO2_LINE = {
  /** Its volume, m³: about 80 m of 15 mm copper (13.6 mm bore), 12 litres. */
  volumeM3: 0.012,
  /** The gas's temperature in it, °C. */
  temperature: 15,
  /** The regulator's most, kg/h: well above both rooms' dosing valves together. */
  regulatorKgH: 10,
  /** LINE PRESSURE LOW below this, bar gauge, while the master valve is switched on. */
  lowAlarm: 2.5,
  /** The nominal line pressure a port leak is rated at, bar gauge: the regulator's outlet. */
  nominal: CO2_MANIFOLD.outlet,
} as const;

const R = 8.314;
const M_CO2 = 0.04401;
const ATM = 1.013;

/**
 * Kilograms of CO₂ in the line above what it holds at atmospheric pressure,
 * at `bar` gauge (an ideal gas: at 4 bar about 88 g). Only that much can
 * flow out of it.
 */
export const lineKgAt = (bar: number) =>
  (Math.max(0, bar) * 1e5 * CO2_LINE.volumeM3 * M_CO2) /
  (R * (CO2_LINE.temperature + 273.15));

/** The line's pressure, bar gauge, holding `kg` above atmospheric. */
export const linePressureOf = (kg: number) => Math.max(0, kg) / lineKgAt(1);

export interface Co2WallPort {
  /** Its isolating ball valve open. */
  open: boolean;
  /** A leaking joint on the room side, g/h at the nominal line pressure (0: tight). */
  leakGh: number;
}

export interface Co2MasterValve {
  /** Switched on at its panel. */
  on: boolean;
  /** Tripped by the gas detection: shut until reset. */
  tripped: boolean;
}

export interface Co2Distribution {
  supply: Co2Supply;
  master: Co2MasterValve;
  /** The master valve's 24 V supply (a normally closed solenoid: no power, shut). */
  powered: boolean;
  /** CO₂ in the building line above atmospheric, kg. */
  lineKg: number;
  ports: Record<Co2PortId, Co2WallPort>;
  /** A leaking pigtail at the manifold, g/h into the loading bay. */
  manifoldLeakGh: number;
}

/** A new distribution: the supply full, the master valve open, the line at its pressure, every port open and tight. */
export function newCo2Distribution(ambient = 15): Co2Distribution {
  return {
    supply: newCo2Supply(ambient),
    master: { on: true, tripped: false },
    powered: true,
    lineKg: lineKgAt(CO2_MANIFOLD.outlet),
    ports: {
      plant_pool_01: { open: true, leakGh: 0 },
      plant_pool_02: { open: true, leakGh: 0 },
    },
    manifoldLeakGh: 0,
  };
}

/** Whether the master valve is open: switched on, powered and not tripped. */
export const masterOpen = (d: Co2Distribution) =>
  d.master.on && d.powered && !d.master.tripped;

/** The building line's pressure, bar gauge. */
export const linePressure = (d: Co2Distribution) => linePressureOf(d.lineKg);

/** A wall port's pressure, bar gauge: the line's while its valve is open. */
export const portPressure = (d: Co2Distribution, id: Co2PortId) =>
  d.ports[id].open ? linePressure(d) : 0;

/** A port's leak now, g/h: its rating scaled by the absolute pressure behind it. */
export function portLeak(d: Co2Distribution, id: Co2PortId): number {
  const p = portPressure(d, id);
  if (!(p > 0) || !(d.ports[id].leakGh > 0)) return 0;
  return (d.ports[id].leakGh * (p + ATM)) / (CO2_LINE.nominal + ATM);
}

export interface Co2DistributionStep {
  state: Co2Distribution;
  /** What each port's dosing valve actually got, g. */
  delivered: Record<Co2PortId, number>;
  /** Gas leaked into each room's air this step, g: the plant rooms and the loading bay. */
  leaked: Record<Co2PortId | 'loading_bay', number>;
}

/**
 * The distribution `dt` seconds on, with each port's dosing valve drawing
 * `draws` (g/h, as it would at the pressure it sees). The draws and leaks
 * come out of the line first; if the line cannot give them all they are
 * scaled down together. Then the regulator tops the line up toward its
 * outlet pressure, drawing on the cylinders, while the master valve passes.
 */
export function stepCo2Distribution(
  d: Co2Distribution,
  draws: Partial<Record<Co2PortId, number>>,
  dt: number,
): Co2DistributionStep {
  const delivered = { plant_pool_01: 0, plant_pool_02: 0 };
  const leaked = { plant_pool_01: 0, plant_pool_02: 0, loading_bay: 0 };
  if (!(dt > 0)) return { state: d, delivered, leaked };
  const h = dt / 3600;

  // The manifold's leak: straight from the cylinders into the loading bay.
  let supply = d.supply;
  if (d.manifoldLeakGh > 0) {
    const before = totalKg(supply);
    supply = drawCo2(
      { ...supply, isolation: true },
      (d.manifoldLeakGh * h) / 1000,
    );
    supply = { ...supply, isolation: d.supply.isolation };
    leaked.loading_bay = (before - totalKg(supply)) * 1000;
  }

  // Out of the line: each port's draw and leak, at most what is in it.
  const want: Record<Co2PortId, { draw: number; leak: number }> = {
    plant_pool_01: { draw: 0, leak: 0 },
    plant_pool_02: { draw: 0, leak: 0 },
  };
  let asked = 0;
  for (const id of CO2_PORT_IDS) {
    const open = d.ports[id].open;
    want[id] = {
      draw: open ? (Math.max(0, draws[id] ?? 0) * h) / 1000 : 0,
      leak: (portLeak(d, id) * h) / 1000,
    };
    asked += want[id].draw + want[id].leak;
  }
  // Into the line: the regulator, through the master valve, gives what is
  // drawn and tops the line up to its outlet pressure, up to its rated flow.
  let inflow = 0;
  if (masterOpen(d)) {
    const target = lineKgAt(co2Pressures(supply).line);
    const wanted = Math.min(
      Math.max(0, asked + target - d.lineKg),
      CO2_LINE.regulatorKgH * h,
    );
    if (wanted > 0) {
      const before = totalKg(supply);
      supply = drawCo2(supply, wanted);
      inflow = before - totalKg(supply);
    }
  }
  const available = d.lineKg + inflow;
  const share = asked > available ? available / asked : 1;
  for (const id of CO2_PORT_IDS) {
    delivered[id] = want[id].draw * share * 1000;
    leaked[id] = want[id].leak * share * 1000;
  }
  const lineKg = Math.max(0, available - asked * share);
  return {
    state: { ...d, supply, lineKg: lineKg < 1e-9 ? 0 : lineKg },
    delivered,
    leaked,
  };
}

const totalKg = (s: Co2Supply) =>
  [...s.banks.left, ...s.banks.right].reduce((sum, c) => sum + c.kg, 0);

/** The distribution's alarms, for the loading bay's panel and both control rooms. */
export function co2DistributionAlarms(d: Co2Distribution) {
  const supply = co2SupplyAlarms(d.supply);
  return {
    /** BANK EMPTY, CHANGE CYLINDERS. */
    bankEmpty: supply.bankEmpty,
    /** CO₂ SUPPLY EXHAUSTED: both banks spent. */
    exhausted: supply.exhausted,
    /** MASTER VALVE TRIPPED: by the gas detection. */
    masterTripped: d.master.tripped,
    /** LINE PRESSURE LOW: the master valve switched on and the line below its alarm. */
    lineLow: d.master.on && linePressure(d) < CO2_LINE.lowAlarm,
  };
}

// ---- What can be done to it ------------------------------------------------------

/** The master valve switched on or off at its panel. */
export const setMaster = (d: Co2Distribution, on: boolean): Co2Distribution =>
  d.master.on === on ? d : { ...d, master: { ...d.master, on } };

/** The gas detection trips the master valve shut. */
export const tripMaster = (d: Co2Distribution): Co2Distribution =>
  d.master.tripped ? d : { ...d, master: { ...d.master, tripped: true } };

/** RESET at the master valve's panel: clears the trip, unless the detection still holds it (`holding`). */
export const resetMaster = (
  d: Co2Distribution,
  holding = false,
): Co2Distribution =>
  holding || !d.master.tripped
    ? d
    : { ...d, master: { ...d.master, tripped: false } };

export const setMasterPower = (
  d: Co2Distribution,
  powered: boolean,
): Co2Distribution => (d.powered === powered ? d : { ...d, powered });

/** A wall port's isolating valve opened or shut. */
export const setPortOpen = (
  d: Co2Distribution,
  id: Co2PortId,
  open: boolean,
): Co2Distribution => ({
  ...d,
  ports: { ...d.ports, [id]: { ...d.ports[id], open } },
});

/** A leak at a port's joints, g/h at the nominal pressure (0 to mend it). */
export const setPortLeak = (
  d: Co2Distribution,
  id: Co2PortId,
  leakGh: number,
): Co2Distribution => ({
  ...d,
  ports: { ...d.ports, [id]: { ...d.ports[id], leakGh: Math.max(0, leakGh) } },
});

/** A leaking pigtail at the manifold, g/h (0 to mend it). */
export const setManifoldLeak = (
  d: Co2Distribution,
  leakGh: number,
): Co2Distribution => ({ ...d, manifoldLeakGh: Math.max(0, leakGh) });

/** The supply worked on (its lever, cylinders, emergency isolation valve), with `co2-supply.ts`'s own actions. */
export const withSupply = (
  d: Co2Distribution,
  f: (s: Co2Supply) => Co2Supply,
): Co2Distribution => ({ ...d, supply: f(d.supply) });
