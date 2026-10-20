/**
 * How the pool rooms lose heat to the cold world they stand in: through
 * their fabric (walls, roofs, floors), through the pools' basins into the
 * ground, and in the air their air handling changes. Every surface loses
 * in proportion to its area and to the difference between the warmth
 * inside and the cold outside (Q = U·A·ΔT), so a bigger room, with more
 * wall, loses more, and the plant must put it all back, or the water and
 * the air cool towards the world's temperature. Pure; temperatures °C,
 * areas m², heat kW.
 */

/** The world outside the pool rooms: cold, as a winter's day is. */
export const OUTSIDE = 5;
/** The ground under the basins: steadier, but cool. */
export const GROUND = 10;

/**
 * How readily heat passes through each kind of surface, kW per m² per
 * kelvin (U-values of a building of around 2000: insulated cavity walls,
 * an insulated roof, a slab on the ground, a tiled concrete basin).
 */
export const U = {
  wall: 0.00045,
  roof: 0.00025,
  floor: 0.00025,
  basin: 0.0005,
} as const;

/** The heat that passes through `area` m² of `kind` with `inside` against `outside`, kW. */
export function fabricLoss(
  kind: keyof typeof U,
  area: number,
  inside: number,
  outside: number,
): number {
  return U[kind] * area * Math.max(0, inside - outside);
}

/** Air's heat, kWh per m³ per kelvin. */
export const AIR_HEAT = 0.00033;

/**
 * The heat lost in ventilating a hall of `volume` m³ at `changes` air
 * changes an hour, a share `recovered` of it won back by heat recovery,
 * kW.
 */
export function ventilationLoss(
  volume: number,
  changes: number,
  inside: number,
  outside: number,
  recovered: number,
): number {
  return (
    volume *
    changes *
    AIR_HEAT *
    Math.max(0, inside - outside) *
    (1 - recovered)
  );
}

/** The heat lost over a tick of `seconds` at `kw`, kWh. */
export const overTick = (kw: number, seconds: number) => (kw * seconds) / 3600;
