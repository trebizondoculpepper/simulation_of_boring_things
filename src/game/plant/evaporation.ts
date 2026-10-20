/**
 * How much water a pool loses to the air: per tick, in proportion to the
 * water's temperature (°C) and its surface, scaled by how agitated it is.
 * A still pool barely steams; a pool under a slide, churned to spray,
 * loses several times as much at the same temperature. It is a simple
 * model, the owner's: the real loss follows the difference between the
 * water's vapour pressure and the air's, but in proportion to
 * temperature is enough for the plant to answer (heat to replace what
 * evaporates, water to make it up, moisture for the air handling to take
 * back out). Pure.
 */

/** How agitated a body of water is. */
export type Activity = 'still' | 'calm' | 'flowing' | 'gushing';

/**
 * Each activity's evaporation, against a calm pool's: a still pool half
 * as much, flowing water twice, water under slides three times (rules of
 * thumb).
 */
export const ACTIVITY_FACTOR: Record<Activity, number> = {
  still: 0.5,
  calm: 1,
  flowing: 2,
  gushing: 3,
};

/**
 * A calm pool's evaporation, kg per m² per hour per °C of its water:
 * chosen so that a calm pool at 28 °C loses 0.1 kg/m²·h, about what an
 * unoccupied indoor pool does.
 */
export const EVAPORATION_PER_DEGREE = 0.1 / 28;

/** The heat each kilogram evaporated carries away, kWh (2.45 MJ/kg). */
export const LATENT_HEAT = 2.45e3 / 3600;

/** A body of water's evaporation, kg/h, at `temperature` °C (none below freezing). */
export function evaporationRate(
  area: number,
  temperature: number,
  activity: Activity,
): number {
  return (
    area *
    Math.max(0, temperature) *
    EVAPORATION_PER_DEGREE *
    ACTIVITY_FACTOR[activity]
  );
}

/** The water it loses over a tick of `seconds`, kg. */
export function evaporated(
  area: number,
  temperature: number,
  activity: Activity,
  seconds: number,
): number {
  return (evaporationRate(area, temperature, activity) * seconds) / 3600;
}

/** The heat that evaporation takes from the water, kW. */
export const evaporationHeat = (kgPerHour: number) => kgPerHour * LATENT_HEAT;
