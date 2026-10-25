/**
 * A deck-level spa's balance tank, sized from what it must absorb (the
 * owner, 2026-10-24; `doc/prompts/056-jacuzzi-balance-tank.md`): not, as a
 * pool's is, as a share of the water (5 to 10 %), since in a spa the
 * bathers displace a large share of a small body of water. Pure.
 *
 * Its make-up float holds it, while the pump runs, low enough that
 * everything that can come back to it fits above: every seat's surge, the
 * air's lift, and the gutter's and pipes' water draining back when the
 * pump stops. Its low-low cutout leaves the pump's working reserve below
 * the float.
 */

/** Water displaced by one bather, m³ (PWTAG, as Pool & Spa News gives it). */
export const DISPLACEMENT_PER_BATHER = 0.08;
/** How far the air and jets lift the surface, m. */
export const AIR_LIFT = 0.02;
/** The pump's working reserve: this many seconds of its flow. */
export const RESERVE_SECONDS = 30;
/** The margin over the allowances. */
export const MARGIN = 0.1;

export interface SpaForTank {
  /** Its seats: every one taken, as a spa often is. */
  seats: number;
  /** Its water's surface, m². */
  area: number;
  /** Its circulation, m³/h. */
  flow: number;
  /** Water in its gutter and pipes, draining back when the pump stops, m³. */
  transit: number;
}

/** What its tank must hold, m³, each allowance and their sum. */
export function spaTankAllowances(s: SpaForTank) {
  const bathers = s.seats * DISPLACEMENT_PER_BATHER;
  const lift = s.area * AIR_LIFT;
  const reserve = (s.flow * RESERVE_SECONDS) / 3600;
  return {
    bathers,
    transit: s.transit,
    lift,
    reserve,
    total: bathers + s.transit + lift + reserve,
  };
}

/**
 * Its tank: the allowances with the margin, to the next 0.1 m³; its float
 * (the fill share the make-up holds while the pump runs) with room above
 * for the surge, the lift and the water draining back, and its low-low
 * the reserve below it.
 */
export function sizeSpaTank(s: SpaForTank) {
  const a = spaTankAllowances(s);
  const volume = Math.ceil(a.total * (1 + MARGIN) * 10 - 1e-9) / 10;
  const float = (volume - a.bathers - a.lift - a.transit) / volume;
  const lowLow = float - a.reserve / volume;
  return { volume, float, lowLow, allowances: a };
}

/** The jacuzzi (POOL-03): eight seats, 4.5 m², 28 m³/h. */
export const JACUZZI_SPA: SpaForTank = {
  seats: 8,
  area: 4.5,
  flow: 28.3,
  // Its gutter's ring (2.6 m round, 0.2 m wide, 50 mm of water running)
  // and its pipes' 50 L.
  transit: 0.13,
};

/**
 * The jacuzzi's balance tank: a vertical GRP cylinder 1.1 m across, 1.55 m
 * tall, standing beside its cabinet; its water depth from its volume.
 */
export const JACUZZI_BALANCE_TANK = (() => {
  const size = sizeSpaTank(JACUZZI_SPA);
  const diameter = 1.1;
  const area = (Math.PI * diameter * diameter) / 4;
  return {
    ...size,
    diameter,
    height: 1.55,
    /** Its water's depth full, m. */
    depth: size.volume / area,
  };
})();

/** What a spa's cabinet is told of the tank it draws from. */
export interface BalanceTankReading {
  /** How full, 0 to 1. */
  fill: number;
  /** At its low-low level: the pump held off until it recovers. */
  low: boolean;
  /** Its make-up filling it. */
  filling: boolean;
}

/**
 * An ideal balance tank, for trying a cabinet alone: always at its working
 * level, never low, never filling.
 */
export const IDEAL_BALANCE_TANK: BalanceTankReading = {
  fill: JACUZZI_BALANCE_TANK.float,
  low: false,
  filling: false,
};

/**
 * The jacuzzi's balance tank's drain to waste (the owner, 2026-10-25): a
 * DN50 lever valve on a nozzle at the tank's foot, discharging by gravity
 * into a tundish on a floor gully. It runs as an orifice under the tank's
 * head (Torricelli): its flow `coefficient × √depth`, the coefficient
 * `Cd · a · √(2g)` for its 45 mm bore, `Cd` 0.5 for the nozzle's entry,
 * the valve and the pipe's bends. So about 8.6 m³/h from the float's
 * depth, falling as the tank empties: from the float in about six
 * minutes, from brim full in about ten. Its make-up (some 2.8 m³/h) holds
 * it, open, a few centimetres deep, under the low-low; to empty it, shut
 * the make-up. With the pump stopped the tub's main drains run on into
 * the tank by gravity (`water-balance.ts`), so the tub empties through
 * it too, in about an hour, before the tank is empty.
 */
export const JACUZZI_TANK_DRAIN = (() => {
  const bore = 0.045;
  const cd = 0.5;
  const area = (Math.PI * bore * bore) / 4;
  return {
    bore,
    cd,
    /** Its flow per root metre of head, m³/h. */
    coefficient: cd * area * Math.sqrt(2 * 9.81) * 3600,
  };
})();
