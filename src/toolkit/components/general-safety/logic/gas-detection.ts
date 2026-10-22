/**
 * Toxic gas detection for a plant room: the gas in the room's air, the
 * fixed detector that reads it, the two alarm levels it latches, and the
 * extract fan it switches to purge. Pure; units: gas g/h and g, air mg/m³,
 * readings ppm, room m³, air changes an hour, time s.
 *
 * After present-day UK practice: an electrochemical detector at breathing
 * or floor level (chlorine and ozone are both heavier than air, so low),
 * a low alarm (A1) at the gas's short-term workplace exposure limit (HSE
 * EH40) and a high alarm (A2) above it, each latched until someone resets
 * it with the air clear again. A1 flashes the beacon; A2 sounds the
 * sounder as well and runs the extract at its purge speed. ACCEPT silences
 * the sounder until the alarm rises again; the beacon flashes until reset.
 */

export interface GasParams {
  /** Its name on the detector, and its range, ppm. */
  gas: string;
  range: number;
  /** mg/m³ in a ppm, at 20 °C: molar mass over 24.06. */
  mgPerPpm: number;
  /** The alarm levels, ppm. */
  a1: number;
  a2: number;
  /** The detector's T90 (90 % of a step in this many seconds). */
  t90: number;
  /** The room's air, m³, and its air changes an hour: extract running, purging, and stopped. */
  volume: number;
  changes: number;
  purge: number;
  still: number;
}

/**
 * Chlorine, in a hypochlorite store about 6 × 6 × 2.8 m: EH40's STEL 0.5
 * ppm (1.5 mg/m³) is A1; the detector after a Crowcon Xgard Cl₂, 0–5 ppm,
 * T90 under a minute; the store's low-level extract after a Vent-Axia
 * ACM150, about 4 air changes, and 15 on its purge speed.
 */
export const CHLORINE: GasParams = {
  gas: 'Cl₂',
  range: 5,
  mgPerPpm: 70.9 / 24.06,
  a1: 0.5,
  a2: 1,
  t90: 60,
  volume: 100,
  changes: 4,
  purge: 15,
  still: 0.5,
};

/**
 * Ozone, in the ozone plant room (`src/game/plant/ozone.ts`'s monitor):
 * A1 0.1 ppm, A2 at EH40's 0.2 ppm; 0–1 ppm, T90 90 s; 60 m³ at six air
 * changes, twenty purging.
 */
export const OZONE: GasParams = {
  gas: 'O₃',
  range: 1,
  mgPerPpm: 48 / 24.06,
  a1: 0.1,
  a2: 0.2,
  t90: 90,
  volume: 60,
  changes: 6,
  purge: 20,
  still: 0.5,
};

/**
 * A hypochlorite tank wrongly filled with hydrochloric acid: NaOCl + 2 HCl
 * → Cl₂ + NaCl + H₂O. 33 % acid is 10.5 mol of HCl a litre, so a litre
 * frees up to 372 g of chlorine. The driver stops at the first smell,
 * about 20 litres in; most of the gas stays in solution or goes out of the
 * tank's vent, and some 5 % comes into the room, over about a minute.
 */
export const MISDELIVERY = {
  litres: 20,
  chlorinePerLitre: 372,
  escapes: 0.05,
  /** How fast the burst comes out, s (time constant). */
  release: 60,
} as const;
export const MISDELIVERY_GRAMS =
  MISDELIVERY.litres * MISDELIVERY.chlorinePerLitre * MISDELIVERY.escapes;

export interface GasState {
  /** The gas in the room's air, mg/m³. */
  conc: number;
  /** Gas still to come out of a burst, g. */
  pending: number;
  /** The detector's reading, ppm (not limited to its range). */
  reading: number;
  /** The latched alarms, and whether the sounder has been accepted. */
  a1: boolean;
  a2: boolean;
  accepted: boolean;
}

export const newGasState = (): GasState => ({
  conc: 0,
  pending: 0,
  reading: 0,
  a1: false,
  a2: false,
  accepted: false,
});

export interface GasInputs {
  /** A steady leak, g/h. */
  leak: number;
  /** Whether the extract fan is switched on. */
  fan: boolean;
}

/** The extract's air changes an hour now. */
export function airChanges(p: GasParams, s: GasState, fan: boolean) {
  if (!fan) return p.still;
  return s.a2 ? p.purge : p.changes;
}

/** Run the room on by `dt` seconds. */
export function stepGas(
  p: GasParams,
  s: GasState,
  i: GasInputs,
  dt: number,
): GasState {
  // The burst's gas coming out this step, g.
  const released = s.pending * (1 - Math.exp(-dt / MISDELIVERY.release));
  const pending = s.pending - released;
  // Mixed into the room, then carried off by the extract toward what the
  // leak alone would hold it at.
  const k = airChanges(p, s, i.fan) / 3600;
  const settle = (Math.max(0, i.leak) * 1000) / 3600 / (p.volume * k);
  const mixed = s.conc + (released * 1000) / p.volume;
  const conc = settle + (mixed - settle) * Math.exp(-k * dt);
  // The cell follows the air with a first-order lag.
  const ppm = conc / p.mgPerPpm;
  const tau = p.t90 / Math.LN10;
  const reading = ppm + (s.reading - ppm) * Math.exp(-dt / tau);
  const a1 = s.a1 || reading >= p.a1;
  const a2 = s.a2 || reading >= p.a2;
  return {
    conc: conc < 1e-6 ? 0 : conc,
    pending: pending < 1e-6 ? 0 : pending,
    reading: reading < 1e-6 ? 0 : reading,
    a1,
    a2,
    // A new high alarm sounds again, accepted or not.
    accepted: s.accepted && !(a2 && !s.a2),
  };
}

/** A mis-delivery begins: its gas is on its way into the room. */
export const misdeliver = (s: GasState): GasState => ({
  ...s,
  pending: s.pending + MISDELIVERY_GRAMS,
});

/** ACCEPT: the sounder stops; the beacon keeps flashing. */
export const accept = (s: GasState): GasState => ({ ...s, accepted: true });

/** RESET: the alarms clear, but only once the reading is under A1 again. */
export function reset(p: GasParams, s: GasState): GasState {
  if (s.reading >= p.a1) return s;
  return { ...s, a1: false, a2: false, accepted: false };
}

/** What the detection shows: the beacon flashing, the sounder sounding. */
export function gasAlarms(s: GasState) {
  return {
    beacon: s.a1 || s.a2,
    sounder: s.a2 && !s.accepted,
  };
}

/** The detector's display: its reading to two places, or over range. */
export function gasDisplay(p: GasParams, s: GasState): string {
  if (s.reading > p.range) return ' O-R';
  return s.reading.toFixed(2).padStart(4);
}
