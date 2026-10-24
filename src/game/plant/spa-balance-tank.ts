/**
 * A deck-level spa's balance tank, sized from what it must absorb (the
 * owner, 2026-10-24; `doc/prompts/056-jacuzzi-balance-tank.md`): not, as a
 * pool's is, as a share of the water (5 to 10 %), since in a spa the
 * bathers displace a large share of a small body of water. Pure.
 *
 * Its make-up float holds it low enough that the bathers' surge and the
 * air's lift fit above; its low-low cutout leaves the water in transit and
 * the pump's working reserve below the float.
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
 * (the fill share the make-up holds) with the surge's room above it, and
 * its low-low with the transit and the reserve between them.
 */
export function sizeSpaTank(s: SpaForTank) {
  const a = spaTankAllowances(s);
  const volume = Math.ceil(a.total * (1 + MARGIN) * 10 - 1e-9) / 10;
  const float = (volume - a.bathers - a.lift) / volume;
  const lowLow = float - (a.transit + a.reserve) / volume;
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
