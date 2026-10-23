/**
 * Each pool hall's heat: a lumped model of two bodies, its pool's water
 * and its hall's air (with the hall's fabric, its walls, roof and slab,
 * which hold far more heat than the air), each exchanging heat with the
 * other and losing it to the outside, the world's ambient temperature.
 *
 * Water: heated through its heat exchanger while its circulation and the
 * heating run, up to the exchanger's output, by a thermostat; it loses
 * heat by evaporation (the most: in proportion to the difference between
 * the vapour pressure at its surface and the hall air's, calibrated to the
 * plant sizing's evaporation at design), by convection to the hall's air
 * across its surface, by conduction to the ground, and to the cold
 * make-up water mixed in.
 *
 * Air: heated by the air handling units' coils while they run, up to
 * their output, by a thermostat, and by the water below it; it loses heat
 * through the hall's envelope (its U-value) and by infiltration.
 *
 * Big bodies of water cool slowly (the Olympic pool about a degree a
 * day), small ones fast (the jacuzzi degrees an hour); warm water keeps a
 * hall mild; with nothing heated, everything settles to the ambient.
 *
 * SI units within; temperatures °C, times seconds. Pure.
 */

/** The outside's temperature, °C, unless the weather says otherwise. */
export const AMBIENT = 12;

/** The physical constants and the assumptions this model rests on. */
export const THERMAL = {
  /** Water's heat capacity per m³, J/K; dry air's per m³, J/K. */
  waterPerM3: 4.19e6,
  airPerM3: 1.2 * 1005,
  /**
   * The hall's fabric (walls, roof, slab) held in the air's body: this
   * many times the air's own heat capacity, so a hall cools over hours,
   * not minutes. A tuned figure.
   */
  fabric: 10,
  /** Convection between water surface and hall air, W/m²·K. */
  surfaceH: 4,
  /** The pool's tank to the ground, W/m²·K of water surface (tank walls and floor together). */
  groundU: 0.6,
  /** The hall's envelope (around 2000), W/m²·K. */
  envelopeU: 0.35,
  /** Infiltration, air changes an hour. */
  infiltration: 0.5,
  /** Water's latent heat of evaporation, J/kg. */
  latent: 2.45e6,
  /**
   * The hall's relative humidity: as its air handling holds it, and as a
   * hall left unventilated soon has it, so nearly saturated that its water
   * hardly evaporates (and cannot chill itself much below the outside).
   */
  humidity: 0.6,
  stillHumidity: 0.9,
  /** A thermostat's proportional band, K: full output this far below its setting. */
  band: 0.1,
  /** Each heater's output is this many times its design load, for warming up. */
  headroom: 2.5,
} as const;

/** What the model needs to know of one pool and its hall. */
export interface PoolHallShape {
  /** The pool's surface, m², volume, m³, and evaporation at design, m³/h. */
  area: number;
  volume: number;
  evaporation: number;
  /** The hall, metres: its length, breadth and mean height. */
  hall: { w: number; d: number; h: number };
  /** The design temperatures, °C: water, hall air. */
  water: number;
  air: number;
}

/** Saturation vapour pressure over water at `t` °C, Pa (Magnus–Tetens, Alduchov and Eskridge). */
export const saturation = (t: number) =>
  610.94 * Math.exp((17.625 * t) / (t + 243.04));

/** A pool hall's thermal parameters, all in W/K, J/K and W. */
export function thermalParams(s: PoolHallShape) {
  const T = THERMAL;
  const hallVolume = s.hall.w * s.hall.d * s.hall.h;
  const envelope =
    2 * (s.hall.w * s.hall.d + s.hall.w * s.hall.h + s.hall.d * s.hall.h);
  const surface = T.surfaceH * s.area;
  const ground = T.groundU * s.area;
  const fabric = T.envelopeU * envelope;
  const leak = (hallVolume * T.infiltration * T.airPerM3) / 3600;
  // Evaporation, kg/s per Pa of vapour-pressure difference, set so that
  // at design it is the sizing's.
  const designDrive = saturation(s.water) - T.humidity * saturation(s.air);
  const evaporation = (s.evaporation * 1000) / 3600 / Math.max(1, designDrive);
  // The heaters' outputs, from their design loads at the usual 12 °C.
  const waterLoad =
    evaporation * designDrive * T.latent +
    surface * (s.water - s.air) +
    ground * (s.water - AMBIENT);
  const airLoad =
    (fabric + leak) * (s.air - AMBIENT) - surface * (s.water - s.air);
  return {
    waterCapacity: s.volume * T.waterPerM3,
    airCapacity: hallVolume * T.airPerM3 * T.fabric,
    surface,
    ground,
    fabric,
    leak,
    evaporation,
    waterHeater: T.headroom * waterLoad,
    airHeater:
      T.headroom * Math.max(airLoad, 0.3 * (fabric + leak) * (s.air - AMBIENT)),
    water: s.water,
    air: s.air,
  };
}
export type ThermalParams = ReturnType<typeof thermalParams>;

export interface ThermalState {
  water: number;
  air: number;
}

/** What drives the two bodies in a step. */
export interface ThermalInputs {
  /** Whether each heater may run: the water's (circulation and heating), the air's (air handling and heating). */
  heatWater: boolean;
  heatAir: boolean;
  /** The outside's temperature, °C. */
  ambient: number;
  /** Whether the hall's air handling is running: dried, or still and nearly saturated. */
  ventilated: boolean;
  /** Cold make-up mixed into the water this step, m³ (at the ambient). */
  madeUp: number;
  /** The water's thermostat's setting, °C, where someone has set it; its design temperature otherwise. */
  waterSet?: number;
}

/** A thermostat's output, W: full this far under its setting (`band`), none at it. */
const thermostat = (max: number, set: number, now: number) =>
  max * Math.min(1, Math.max(0, (set - now) / THERMAL.band));

/**
 * The two bodies `dt` seconds on, and the heat their heaters gave, W, in
 * sub-steps of at most five seconds.
 */
export function stepThermal(
  s: ThermalState,
  p: ThermalParams,
  inputs: ThermalInputs,
  dt: number,
): ThermalState & { waterHeat: number; airHeat: number } {
  let { water, air } = s;
  // The make-up mixes in at once.
  if (inputs.madeUp > 0)
    water =
      (water * (p.waterCapacity / THERMAL.waterPerM3) +
        inputs.ambient * inputs.madeUp) /
      (p.waterCapacity / THERMAL.waterPerM3 + inputs.madeUp);
  const n = Math.max(1, Math.ceil(dt / 5));
  const h = dt / n;
  let waterHeat = 0;
  let airHeat = 0;
  for (let i = 0; i < n; i++) {
    const qWater = inputs.heatWater
      ? thermostat(p.waterHeater, inputs.waterSet ?? p.water, water)
      : 0;
    const qAir = inputs.heatAir ? thermostat(p.airHeater, p.air, air) : 0;
    const humidity = inputs.ventilated
      ? THERMAL.humidity
      : THERMAL.stillHumidity;
    const drive = Math.max(0, saturation(water) - humidity * saturation(air));
    const toAir = p.surface * (water - air);
    const waterLoss =
      p.evaporation * drive * THERMAL.latent +
      toAir +
      p.ground * (water - inputs.ambient);
    const airLoss = (p.fabric + p.leak) * (air - inputs.ambient) - toAir;
    water += ((qWater - waterLoss) * h) / p.waterCapacity;
    air += ((qAir - airLoss) * h) / p.airCapacity;
    waterHeat += qWater / n;
    airHeat += qAir / n;
  }
  return { water, air, waterHeat, airHeat };
}
