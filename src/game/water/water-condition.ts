/**
 * The water's condition (prompt 070, the owner, 2026-10-25): what a body
 * of water or a flow carries besides its volume, the core values for now,
 * for the waters whose chemistry matters (the pools', the mains', the
 * drains'); the heating loop and the like carry only their temperature
 * (`ThermalWater`).
 * Pressure and flow are not the water's but the pipe network's. Turbidity
 * and redox are not carried: they are derived where an instrument reads
 * them (`turbidity`, `redox`).
 *
 * Volumes hold one well-mixed condition; a flow carries its source's;
 * where flows meet, conditions mix in proportion to flow (`mix`). Machines
 * are black boxes on a flow, each changing the condition by its own rule
 * (`filterSolids`, `heat`, `loseHeat`, `irradiate`, `ozonate`,
 * `doseHypochlorite`, `doseAcid`), and within a volume the chlorine reacts
 * with the pollution in it (`react`): mass balances, not targets. Pure;
 * °C, g/m³ (= mg/l), m³, m³/h, kW, seconds.
 */

export interface WaterCondition {
  /** °C. */
  temperature: number;
  /** Suspended solids, g/m³: what a sand filter removes. */
  solids: number;
  /** Free chlorine, mg/l: the disinfectant. */
  freeChlorine: number;
  /** Combined chlorine (chloramines), mg/l: chlorine bound to pollution. */
  combinedChlorine: number;
  ph: number;
  /** Bathers' pollution, mg/l as an organic-load index: what uses chlorine up and forms chloramines. */
  organics: number;
}

/** The plant's waters, each its usual condition. */
export const WATERS = {
  /** The ideal clean water: almost nothing in it. */
  clean: {
    temperature: 20,
    solids: 0,
    freeChlorine: 0,
    combinedChlorine: 0,
    ph: 7.4,
    organics: 0,
  },
  /** The town's main: cold, clean, a little residual chlorine. */
  mains: {
    temperature: 10,
    solids: 0.2,
    freeChlorine: 0.3,
    combinedChlorine: 0,
    ph: 7.6,
    organics: 0,
  },
  /** A healthy pool's water. */
  pool: {
    temperature: 28,
    solids: 1,
    freeChlorine: 1.4,
    combinedChlorine: 0.12,
    ph: 7.4,
    organics: 1,
  },
  /** Dirty water: a pool's, heavily soiled, its chlorine spent. */
  dirty: {
    temperature: 28,
    solids: 20,
    freeChlorine: 0.2,
    combinedChlorine: 0.8,
    ph: 7.5,
    organics: 6,
  },
} as const satisfies Record<string, WaterCondition>;

/**
 * Waters whose chemistry does not matter to the plant's running (the
 * owner, 2026-10-25): the heating loop, the hot water, the chilled water.
 * They carry their temperature alone; their chemistry is not simulated.
 */
export interface ThermalWater {
  temperature: number;
}
export const THERMAL_WATERS = {
  /** Heating water, the boilers' closed circuit (LTHW). */
  lthw: { temperature: 80 },
  /** Domestic hot water, from the calorifier. */
  dhw: { temperature: 60 },
  chilled: { temperature: 6 },
} as const satisfies Record<string, ThermalWater>;

const KEYS = [
  'temperature',
  'solids',
  'freeChlorine',
  'combinedChlorine',
  'ph',
  'organics',
] as const;

/**
 * Waters mixed, each in proportion to its share (a flow, or a volume).
 * Every heat capacity is taken as equal; pH is mixed linearly, which real
 * water does not do (it mixes through its alkalinity), until water balance
 * is modelled. No share at all gives the first condition unchanged.
 */
export function mix(
  parts: readonly { condition: WaterCondition; share: number }[],
): WaterCondition {
  const total = parts.reduce((t, p) => t + Math.max(0, p.share), 0);
  if (!(total > 0)) return parts[0]?.condition ?? WATERS.clean;
  return Object.fromEntries(
    KEYS.map((k) => [
      k,
      parts.reduce((t, p) => t + p.condition[k] * Math.max(0, p.share), 0) /
        total,
    ]),
  ) as unknown as WaterCondition;
}

/** A volume's condition after `inflow` m³ of water came into its `volume` m³ (as much leaving as it held). */
export const intoVolume = (
  held: WaterCondition,
  volume: number,
  inflow: WaterCondition,
  added: number,
) =>
  mix([
    { condition: held, share: volume },
    { condition: inflow, share: added },
  ]);

/** A filter: it keeps `capture` of the suspended solids; what is dissolved passes it untouched. */
export const filterSolids = (
  w: WaterCondition,
  capture: number,
  fines = 0,
): WaterCondition => ({
  ...w,
  solids: w.solids * (1 - Math.min(1, Math.max(0, capture))) + fines,
});

/** Water's heat capacity, kWh per m³ per kelvin. */
export const HEAT_CAPACITY = 1.163;

/** A heater (a boiler, a heat exchanger) on a flow: `kW` raise its temperature, never past its primary's. */
export function heat(
  w: WaterCondition,
  kW: number,
  flow: number,
  primary = Infinity,
): WaterCondition {
  if (!(flow > 0)) return w;
  const rise = kW / (HEAT_CAPACITY * flow);
  return { ...w, temperature: Math.min(primary, w.temperature + rise) };
}

/**
 * Heat lost on the way, through a vessel or a pipe's surface to its room:
 * `ua` W per kelvin, over `flow` m³/h passing.
 */
export function loseHeat(
  w: WaterCondition,
  ua: number,
  ambient: number,
  flow: number,
): WaterCondition {
  if (!(flow > 0)) return w;
  const drop = ((w.temperature - ambient) * ua) / 1000 / (HEAT_CAPACITY * flow);
  return { ...w, temperature: w.temperature - drop };
}

/**
 * UV on a flow, its share of a full dose (0 to 1, while lit): it breaks
 * down chloramines (most of them at a full dose) and some of the organic
 * load.
 */
export const irradiate = (w: WaterCondition, dose: number): WaterCondition => {
  const d = Math.min(1, Math.max(0, dose));
  return {
    ...w,
    combinedChlorine: w.combinedChlorine * (1 - 0.7 * d),
    organics: w.organics * (1 - 0.2 * d),
  };
};

/** Ozone and its contact tank on a flow, a share of a full dose: they oxidise the organic load and chloramines. */
export const ozonate = (w: WaterCondition, dose: number): WaterCondition => {
  const d = Math.min(1, Math.max(0, dose));
  return {
    ...w,
    combinedChlorine: w.combinedChlorine * (1 - 0.5 * d),
    organics: w.organics * (1 - 0.6 * d),
  };
};

/** Sodium hypochlorite dosed into a flow: `mgPerL` of free chlorine added, raising its pH a little. */
export const doseHypochlorite = (
  w: WaterCondition,
  mgPerL: number,
): WaterCondition => ({
  ...w,
  freeChlorine: w.freeChlorine + Math.max(0, mgPerL),
  ph: w.ph + 0.02 * Math.max(0, mgPerL),
});

/** Acid dosed into a flow: its pH lowered by `drop`. */
export const doseAcid = (w: WaterCondition, drop: number): WaterCondition => ({
  ...w,
  ph: w.ph - Math.max(0, drop),
});

/**
 * The chlorine's reactions in a body of water over `dt` seconds (a
 * simplified breakpoint): free chlorine reacts with the organic load,
 * using itself and the load up and forming combined chlorine; free
 * chlorine in excess slowly destroys the combined. Rates per mg/l per hour.
 */
export const REACTION = {
  /** Free chlorine meeting the organic load. */
  rate: 0.5,
  /** Combined chlorine formed per mg/l of organic load used. */
  combines: 0.3,
  /** Free chlorine used per mg/l of organic load. */
  uses: 1,
  /** Free chlorine destroying combined chlorine (breakpoint). */
  breakpoint: 0.05,
} as const;

export function react(w: WaterCondition, dt: number): WaterCondition {
  if (!(dt > 0)) return w;
  const R = REACTION;
  const hours = dt / 3600;
  const reacted = Math.min(
    w.organics,
    w.freeChlorine / R.uses,
    R.rate * w.freeChlorine * w.organics * hours,
  );
  const broken = Math.min(
    w.combinedChlorine,
    R.breakpoint * w.freeChlorine * w.combinedChlorine * hours,
  );
  return {
    ...w,
    organics: w.organics - reacted,
    freeChlorine: Math.max(0, w.freeChlorine - R.uses * reacted - broken),
    combinedChlorine: Math.max(
      0,
      w.combinedChlorine + R.combines * reacted - broken,
    ),
  };
}

/** Turbidity, NTU, as a turbidity meter reads it from the suspended solids. */
export const turbidity = (w: WaterCondition) => w.solids * 0.5;

/**
 * Redox (ORP), mV, as a probe reads it: from the hypochlorous acid the
 * free chlorine gives at the water's pH (more of it, the lower the pH).
 */
export function redox(w: WaterCondition): number {
  const hocl = w.freeChlorine / (1 + 10 ** (w.ph - 7.54));
  return Math.round(733 + 140 * Math.log10(hocl + 0.01));
}
