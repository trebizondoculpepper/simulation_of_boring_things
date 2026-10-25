import type { BalanceTankReading } from './spa-balance-tank';

/**
 * The jacuzzi's treatment cabinet's controller, in the world (the owner,
 * 2026-10-24): its POWER switch, its circulation pump's no-flow trip, and
 * what its two-line display says. The cabinet in the plant room shows it
 * and works it (`spa-pack.ts`); the plant room's water mimic, the wall
 * plate by the tub and the tub itself follow the circulation it allows.
 * Pure.
 *
 * The pump is called for while the cabinet is supplied (its room's power
 * and its isolator) and switched on, and not tripped. With no way through
 * its valves (its suction or its return shut, `jacuzziPaths`) it runs
 * dead-headed, PUMP RUN lit and nothing moving; after `NO_FLOW_TRIP`
 * seconds of that its flow switch trips it, and it stays tripped, dark,
 * until RESET is pressed with a way through again. A valve passing
 * through shut and back, briefly, trips nothing. Its water supply cut off
 * and its balance tank run down to low-low, it trips too (TRIP: TANK
 * LOW), but restarts by itself as the tank recovers: a latch there would
 * want RESET at every dip while the tub refills.
 */

/** How long the pump may run with no flow before it trips, seconds. */
export const NO_FLOW_TRIP = 5;

/** How far below its setting the water may fall before TEMP LOW, °C. */
export const TEMP_LOW_BAND = 2;

/** How long each of several messages holds the display's second line, s. */
export const MESSAGE_SECONDS = 2;

export interface JacuzziCabinetState {
  /** Its POWER switch, on or off. */
  power: boolean;
  /** Why it has tripped, latched until RESET; '' while not tripped. */
  trip: '' | 'no-flow';
  /** How long its pump has run with no flow, s. */
  noFlow: number;
}

export const newJacuzziCabinet = (): JacuzziCabinetState => ({
  power: true,
  trip: '',
  noFlow: 0,
});

export type JacuzziCabinetAction =
  /** Its POWER switch turned on or off. */
  | { act: 'power'; on: boolean }
  /** Its RESET pressed: clears a trip once there is a way through. */
  | { act: 'reset' };

/**
 * What it is given: power to it, a way through its valves, and the
 * balance tank it draws from, outside it (`spa-balance-tank.ts`; for
 * trying it alone, `IDEAL_BALANCE_TANK`).
 */
export interface JacuzziCabinetInputs {
  /** Its room's power and its isolator, both on. */
  supplied: boolean;
  /** Its suction and return valves both open (`jacuzziPaths`). */
  path: boolean;
  /** Its balance tank. */
  tank: BalanceTankReading;
  /**
   * Its controller running, every servo open (`cabinet-boot.ts`): booting,
   * checking or starting, it holds the pump off. Absent, as on a trial's
   * bench, it is taken as running.
   */
  ready?: boolean;
}

/**
 * Whether its pump's motor runs: supplied, switched on, not tripped, and
 * its tank not at low-low (TRIP: TANK LOW, which clears itself as the
 * tank recovers).
 */
export const jacuzziPumpCalled = (
  c: JacuzziCabinetState,
  inputs: JacuzziCabinetInputs,
) =>
  inputs.supplied &&
  c.power &&
  c.trip === '' &&
  !inputs.tank.low &&
  (inputs.ready ?? true);

/**
 * Where a packaged spa cabinet's pump draws from (the owner, 2026-10-24):
 * its own small surge vessel inside it, or an external balance tank
 * beside it, never both. With an external tank its surge vessel is
 * disconnected, empty, reading 0 %; with its own vessel there is no
 * external tank to give it. The type makes the two exclusive.
 */
export type CabinetPlumbing =
  | { tank: 'internal' }
  | { tank: 'external'; external: BalanceTankReading };

/** Its own surge vessel, inside it, m³: about 35 L. */
export const SURGE_VESSEL_VOLUME = 0.035;

/** A disconnected surge vessel: empty, never low, never filling. */
export const DISCONNECTED_VESSEL: BalanceTankReading = {
  fill: 0,
  low: false,
  filling: false,
};

/**
 * The tank its pump draws from, and what its own surge vessel reads,
 * given its plumbing and its vessel's own reading.
 */
export function cabinetTanks(
  plumbing: CabinetPlumbing,
  vessel: BalanceTankReading,
): { draws: BalanceTankReading; vessel: BalanceTankReading } {
  return plumbing.tank === 'external'
    ? { draws: plumbing.external, vessel: DISCONNECTED_VESSEL }
    : { draws: vessel, vessel };
}

/** Whether its water moves: the pump running, with a way through. */
export const jacuzziWaterFlowing = (
  c: JacuzziCabinetState,
  inputs: JacuzziCabinetInputs,
) => jacuzziPumpCalled(c, inputs) && inputs.path;

export function actOnJacuzziCabinet(
  c: JacuzziCabinetState,
  a: JacuzziCabinetAction,
  path: boolean,
): JacuzziCabinetState {
  if (a.act === 'power')
    return a.on === c.power ? c : { ...c, power: a.on, noFlow: 0 };
  // RESET: nothing, unless tripped and the fault is cleared.
  return c.trip !== '' && path ? { ...c, trip: '', noFlow: 0 } : c;
}

/** `dt` seconds on: its no-flow timer, and its trip when that runs out. */
export function stepJacuzziCabinet(
  c: JacuzziCabinetState,
  inputs: JacuzziCabinetInputs,
  dt: number,
): JacuzziCabinetState {
  if (!jacuzziPumpCalled(c, inputs) || inputs.path)
    return c.noFlow === 0 ? c : { ...c, noFlow: 0 };
  const noFlow = c.noFlow + dt;
  return noFlow >= NO_FLOW_TRIP
    ? { ...c, trip: 'no-flow', noFlow: 0 }
    : { ...c, noFlow };
}

/** What its display is told. */
export interface JacuzziDisplayInputs {
  cabinet: JacuzziCabinetState;
  supplied: boolean;
  /** Its water moving (`jacuzziWaterFlowing`). */
  flowing: boolean;
  /** The water's temperature and its setting, °C. */
  waterC: number;
  setC: number;
  /** Heat reaching its heat exchanger: the heat service and both valves. */
  heatSupply: boolean;
  /** Its balance tank. */
  tank: BalanceTankReading;
  /** Its drain open. */
  draining: boolean;
  /** Either of its doors open, its UV held off. */
  doorOpen: boolean;
  /** The world's time, s, for cycling several messages. */
  time: number;
}

/** A line of the display, 16 characters, padded. */
const line = (text: string) => text.slice(0, 16).padEnd(16);

/**
 * What its 16 × 2 display shows: nothing while it has no power; else the
 * water's temperature and its setting on the first line, and on the
 * second its state, or, with more than one thing to say, each in turn.
 * A trip comes first, then warnings, then what it is doing.
 */
export function jacuzziCabinetDisplay(d: JacuzziDisplayInputs): {
  lines: [string, string] | null;
  messages: string[];
} {
  if (!d.supplied) return { lines: null, messages: [] };
  const messages: string[] = [];
  if (d.cabinet.trip === 'no-flow')
    messages.push('TRIP: NO FLOW', 'CHECK VALVES+RST');
  if (d.tank.low) messages.push('TRIP: TANK LOW');
  // Heat wanted but not coming: the heat service off, or a valve shut.
  const wantsHeat = d.waterC < d.setC - 0.2;
  if (d.flowing && wantsHeat && !d.heatSupply) messages.push('NO HEAT');
  if (d.waterC < d.setC - TEMP_LOW_BAND) messages.push('TEMP LOW');
  if (d.draining) messages.push('DRAINING');
  if (d.cabinet.trip === '' && !d.tank.low) {
    if (!d.cabinet.power) messages.push('STOPPED');
    else if (d.flowing)
      messages.push(d.doorOpen ? 'RUNNING  UV OFF' : 'RUNNING  UV ON');
    else messages.push('NO FLOW');
  }
  // Its tank, always: how full, and whether its make-up is filling it.
  messages.push(
    `TANK ${Math.round(d.tank.fill * 100)}%${d.tank.filling ? ' FILLING' : ''}`,
  );
  const shown =
    messages[Math.floor(d.time / MESSAGE_SECONDS) % messages.length] ?? '';
  return {
    lines: [
      line(`${d.waterC.toFixed(1)}C  SET ${d.setC.toFixed(1)}`),
      line(shown),
    ],
    messages,
  };
}
