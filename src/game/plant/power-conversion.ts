/**
 * Battery-backed power (the owner, 2026-10-23): the three parts of an
 * online double-conversion UPS as separate components, after the 40 kVA
 * class of three-phase UPS with internal batteries (the Riello Multi
 * Sentry's sort), so that each can be joined, isolated and watched on its
 * own:
 *
 * - a **rectifier** (charger): AC in, DC out to the battery's bus, while
 *   its supply is within its input range; it carries the load and
 *   recharges the battery, up to its rating and its charge limit;
 * - a **battery bank**: stores energy on the DC bus, gives it back when
 *   the rectifier cannot carry the load, until it is flat;
 * - an **inverter**: DC in, three-phase AC out at its own voltage, up to
 *   its rating, at its efficiency; it cuts out when the DC side cannot
 *   carry what it is asked for, and restarts when it can.
 *
 * One step solves the DC bus: what the inverter needs, from the rectifier
 * first and the battery after; the rectifier's spare charging the battery.
 * Pure; kilowatts, kilowatt-hours, volts, seconds.
 */

export interface RectifierSpec {
  /** The AC input it accepts, volts (line to line). */
  inputMin: number;
  inputMax: number;
  /** The most DC power it gives, kW (load and charging together). */
  rating: number;
  /** The most of that it gives to charging, kW. */
  chargeLimit: number;
  /** Its own losses: output over input. */
  efficiency: number;
}

export interface BatterySpec {
  /** Blocks in series, each `blockVolts` nominal. */
  blocks: number;
  blockVolts: number;
  /** Each block's capacity, ampere-hours. */
  ampHours: number;
}

export interface InverterSpec {
  /** Its AC output, volts (line to line). */
  outputVolts: number;
  /** The most it gives, kW. */
  rating: number;
  efficiency: number;
}

/** The 40 kVA class (working figures after the Riello Multi Sentry's range). */
export const RECTIFIER_40: RectifierSpec = {
  inputMin: 340,
  inputMax: 480,
  rating: 45,
  chargeLimit: 4,
  efficiency: 0.97,
};
export const BATTERY_40: BatterySpec = {
  blocks: 36,
  blockVolts: 12,
  ampHours: 10,
};
export const INVERTER_40: InverterSpec = {
  outputVolts: 400,
  rating: 36,
  efficiency: 0.95,
};

/** A battery bank's stored energy when full, kWh. */
export const batteryEnergy = (b: BatterySpec) =>
  (b.blocks * b.blockVolts * b.ampHours) / 1000;

/** A battery bank's voltage: on float when charging, falling as it discharges (lead-acid, 2.27 V to 1.75 V a cell). */
export function batteryVolts(
  b: BatterySpec,
  charge: number,
  discharging: boolean,
) {
  const cells = b.blocks * (b.blockVolts / 2);
  return discharging
    ? cells * (1.75 + 0.35 * charge)
    : cells * (2.1 + 0.17 * charge);
}

export interface PowerChainState {
  /** The battery's state of charge, 0 to 1. */
  charge: number;
  /** Whether the inverter is giving its output. */
  inverterOn: boolean;
}

export interface PowerChainStep {
  state: PowerChainState;
  /** The rectifier's AC input is within its range and it is working. */
  rectifierOn: boolean;
  /** The rectifier's DC output, kW. */
  rectifierKW: number;
  /** Into the battery (+) or out of it (−), kW. */
  batteryKW: number;
  /** The inverter's AC output, kW, and its voltage (0 when off). */
  inverterKW: number;
  /** What the inverter draws from the DC bus, kW. */
  inverterDcKW: number;
  outputVolts: number;
  /** Drawn from the AC supply, kW. */
  supplyKW: number;
  /** Seconds the battery would carry the present load from here, if the rectifier stopped. */
  runtime: number;
  batteryVolts: number;
}

/**
 * One step of the chain: `inputVolts` reaching the rectifier (0 if it is
 * isolated or its supply is dead), `loadKW` asked of the inverter by what
 * it feeds (0 if that is isolated or stopped).
 */
export function stepPowerChain(
  s: PowerChainState,
  inputVolts: number,
  loadKW: number,
  dt: number,
  {
    rectifier = RECTIFIER_40,
    battery = BATTERY_40,
    inverter = INVERTER_40,
  }: {
    rectifier?: RectifierSpec;
    battery?: BatterySpec;
    inverter?: InverterSpec;
  } = {},
): PowerChainStep {
  const energy = batteryEnergy(battery);
  const rectifierOn =
    inputVolts >= rectifier.inputMin && inputVolts <= rectifier.inputMax;
  const asked = Math.min(Math.max(0, loadKW), inverter.rating);
  const dcNeeded = asked / inverter.efficiency;
  const rectifierAvailable = rectifierOn ? rectifier.rating : 0;
  // What the battery would have to give, kW, and whether it can for this step.
  const shortfall = Math.max(0, dcNeeded - rectifierAvailable);
  const stored = s.charge * energy;
  const canCarry = shortfall === 0 || stored > (shortfall * dt) / 3600;
  // The inverter stops when the DC side cannot carry it; a flat battery
  // keeps it off until the rectifier can carry the load alone.
  // Cut out on a flat battery, it stays off until the rectifier is back
  // (no hunting on and off as the load drops away and returns).
  const lockedOut = !s.inverterOn && !rectifierOn;
  const inverterOn = canCarry && !lockedOut;
  const output = inverterOn ? asked : 0;
  const dcOut = inverterOn ? dcNeeded : 0;
  const fromRectifier = Math.min(rectifierAvailable, dcOut);
  const fromBattery = dcOut - fromRectifier;
  // The rectifier's spare charges the battery, up to its charge limit, until full.
  const room = (1 - s.charge) * energy;
  const charging = rectifierOn
    ? Math.min(
        rectifier.chargeLimit,
        rectifier.rating - fromRectifier,
        room > 0 ? (room * 3600) / Math.max(dt, 1e-9) : 0,
      )
    : 0;
  const batteryKW = charging - fromBattery;
  const charge = Math.min(
    1,
    Math.max(0, s.charge + (batteryKW * dt) / 3600 / energy),
  );
  const rectifierKW = rectifierOn ? fromRectifier + charging : 0;
  const discharging = fromBattery > 0;
  return {
    state: { charge, inverterOn },
    rectifierOn,
    rectifierKW,
    batteryKW,
    inverterKW: output,
    inverterDcKW: dcOut,
    outputVolts: inverterOn ? inverter.outputVolts : 0,
    supplyKW: rectifierKW / rectifier.efficiency,
    runtime: dcNeeded > 0 ? ((charge * energy) / dcNeeded) * 3600 : Infinity,
    batteryVolts: batteryVolts(battery, charge, discharging),
  };
}

// ---- A pump set on that supply ---------------------------------------------------

export interface PumpDriveSpec {
  /** The motor's input at its duty point, kW. */
  inputKW: number;
  /** The least voltage it runs on, volts. */
  minVolts: number;
  /** Its duty flow, m³/h. */
  flow: number;
  /** Its gauges at its duty point, bar (gauge): discharge, and suction (below atmospheric, drawing from an open source). */
  dischargeBar: number;
  suctionBar: number;
}

/**
 * The end-suction pump set (`createEndSuctionPump`: a Grundfos NK 150-315
 * with a 30 kW four-pole motor): about 32 kW drawn at a duty of about
 * 300 m³/h against about 28 m (2.7 bar). Working figures.
 */
export const NK_150_315: PumpDriveSpec = {
  inputKW: 32,
  minVolts: 360,
  flow: 300,
  dischargeBar: 2.7,
  suctionBar: -0.15,
};

/** Whether a pump runs on `volts`, and what it draws and moves. */
export function pumpDrive(p: PumpDriveSpec, volts: number) {
  const running = volts >= p.minVolts;
  return {
    running,
    kW: running ? p.inputKW : 0,
    flow: running ? p.flow : 0,
    dischargeBar: running ? p.dischargeBar : 0,
    suctionBar: running ? p.suctionBar : 0,
  };
}

// ---- Currents, as the panels show them ------------------------------------------

/** The rectifier's input power factor, and a pump motor's at full load. */
export const RECTIFIER_PF = 0.95;
export const MOTOR_PF = 0.86;

/** A three-phase AC current, amperes: P / (√3 · V · pf). Nothing at no voltage. */
export const acAmps = (kW: number, volts: number, pf = 1) =>
  volts > 0 ? (kW * 1000) / (Math.sqrt(3) * volts * pf) : 0;

/** A DC current, amperes: P / V. Nothing at no voltage. */
export const dcAmps = (kW: number, volts: number) =>
  volts > 0 ? (Math.abs(kW) * 1000) / volts : 0;
