/**
 * The pools the plant must serve: the input to the plant sizing program
 * (`sizing.ts`, run by `scripts/plant-sizing.test.ts`). Edit this file and
 * rerun to resize the plant. Metres, m², m³, °C.
 *
 * Each attraction is a room of the game with one or more bodies of water
 * in it, and gets its own small plant room, however small it is, linked to
 * the main plant facility, which holds everything they share.
 *
 * The game starts with four: a lounge pool, an Olympic pool, a jacuzzi
 * and a footbath (the rooms pool_01 to pool_04, `pool-halls.ts`), from the very large to the very small; more
 * follow as it grows (a children's area, the ring pool…). The figures are
 * estimates taken from the rooms as built (October 2026); where a room has
 * no pool yet built, they are what we think it will be.
 */

export type WaterUse =
  /** A general leisure pool. */
  | 'leisure'
  /** A learner or teaching pool: warm, shallow, busy. */
  | 'teaching'
  /** A hot tub or spa: hot, agitated, a very short turnover. */
  | 'spa'
  /** A foot spa: tiny, hot, its water changed often. */
  | 'footspa'
  /**
   * A footbath: the shallow walk-through channel on the way to the pools,
   * strongly disinfected and its water changed all the time.
   */
  | 'footbath'
  /** A 50 m competition pool: deep, cool, calm, a long turnover. */
  | 'competition'
  /**
   * A children's pool or splash area: shallow, warm, crowded and the most
   * fouled, so the shortest turnover and the most disinfection.
   */
  | 'children';

export interface WaterBodyConfig {
  name: string;
  use: WaterUse;
  /** Water surface, m². */
  area: number;
  /** Water volume, m³. */
  volume: number;
  /** Water temperature, °C. */
  temperature: number;
  /** Whether it has ozone treatment as well as chlorine. */
  ozone?: boolean;
}

export interface AttractionConfig {
  id: string;
  name: string;
  /** The game room it is, for reference. */
  room: string;
  /** The hall's air volume, m³: what its air handling must dry and heat. */
  hallAir: number;
  bodies: readonly WaterBodyConfig[];
  /** Open-top water slides: how many, and how far each drops, m. */
  slides?: { count: number; drop: number };
}

export const POOLS: readonly AttractionConfig[] = [
  {
    id: 'lounge',
    name: 'Lounge pool hall',
    room: 'pool_01',
    // 28 m × 20 m under a 7 m roof.
    hallAir: 3920,
    bodies: [
      // A free-form lounge pool about 19 m × 11 m, 0.9 m deep, warm, two
      // islands in it, two shelves to lie on and a deep well.
      {
        name: 'Lounge pool',
        use: 'leisure',
        area: 153.8,
        volume: 138.9,
        temperature: 32,
        ozone: true,
      },
    ],
  },
  {
    id: 'olympic',
    name: 'Olympic pool hall',
    room: 'pool_02',
    // 66 m × 40 m round the pool, under a roof sloping from 9 m to 23.6 m.
    hallAir: 42978,
    bodies: [
      // 50 m × 25 m, ten lanes, 2 m deep throughout, as a competition pool must be.
      {
        name: 'Olympic pool',
        use: 'competition',
        area: 1250,
        volume: 2500,
        temperature: 27,
        ozone: true,
      },
    ],
  },
  {
    id: 'spa',
    name: 'Jacuzzi room',
    room: 'pool_03',
    // 10 m × 8 m × 3 m.
    hallAir: 240,
    bodies: [
      // A hot tub for eight: 2.4 m round, 0.9 m deep, a seat round it.
      {
        name: 'Jacuzzi',
        use: 'spa',
        area: 4.52,
        volume: 2.83,
        temperature: 37,
      },
    ],
  },
  {
    id: 'footbath',
    name: 'Footbath passage',
    room: 'pool_04',
    // 4 m × 9 m × 3 m.
    hallAir: 108,
    bodies: [
      // A channel 4 m across the passage, 1.5 m to wade, 0.15 m deep.
      {
        name: 'Footbath',
        use: 'footbath',
        area: 6,
        volume: 0.9,
        temperature: 28,
      },
    ],
  },
];
