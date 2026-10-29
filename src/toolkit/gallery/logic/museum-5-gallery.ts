/**
 * Hall 5, "A Day in the Life" (107l): a poolman's day through the
 * decades, as a photographic exhibition, and where everything in the hall
 * stands. Pure. Each decade is a bay of three photographs (morning,
 * midday, night), hung earliest on the visitor's left as they walk round:
 * along the north wall west to east, then down the east wall north to
 * south. Each frame has a placeholder carrying its decade and caption
 * until its photograph loads. The scenes follow 107h's research
 * (the yellow orthotolidine comparator before the 1960s, the pink DPD
 * after, cells on the controller from the 1990s) and the pool's day.
 */

/** A photograph's look, by its decade. */
export type PhotoLook =
  | 'sepia'
  | 'black-and-white'
  | 'faded-colour'
  | 'colour-print'
  | 'early-digital'
  | 'digital';

export interface Photograph {
  /** The time of day it shows, or the future bay's stage of the round. */
  when: 'Morning' | 'Midday' | 'Night' | 'Opening' | 'Testing' | 'Closing';
  /** Its image's file name, without extension, where not `<decade>-<when>`. */
  file?: string;
  /** The caption: the scene, as a gallery label says it. */
  caption: string;
}

export interface Decade {
  decade: string;
  look: PhotoLook;
  /** One line under the decade's heading. */
  strap: string;
  photos: readonly [Photograph, Photograph, Photograph];
}

/** The decades, earliest first. */
export const DECADES: readonly Decade[] = [
  {
    decade: '1920s',
    look: 'sepia',
    strap: 'The baths superintendent and his attendant',
    photos: [
      {
        when: 'Morning',
        caption:
          'Six o’clock. The attendant skims the floating dirt off by hand with a long-handled net, then chalks the water’s temperature on the board.',
      },
      {
        when: 'Midday',
        caption:
          'Testing: a few drops of orthotolidine turn a tube of pool water yellow, matched by eye against coloured glass.',
      },
      {
        when: 'Night',
        caption:
          'Closing: the steam valve to the calorifier shut by its handwheel, the pump’s starter arm thrown back to OFF.',
      },
    ],
  },
  {
    decade: '1930s',
    look: 'sepia',
    strap: 'Filtered and chlorinated, the new way',
    photos: [
      {
        when: 'Morning',
        caption:
          'The scum channel round the pool hosed clean, its strainer emptied into a bucket before the first swimmers.',
      },
      {
        when: 'Midday',
        caption:
          'An enamel jug of bleach tipped into the balance tank; the bigger baths already dose chlorine gas.',
      },
      {
        when: 'Night',
        caption:
          'Backwashing the pressure filters: the valves turned in their order by hand, the dirty water run to waste.',
      },
    ],
  },
  {
    decade: '1950s',
    look: 'black-and-white',
    strap: 'The brown panel',
    photos: [
      {
        when: 'Morning',
        caption:
          'The new wall skimmers, one basket at a time: hair, leaves and a hair grip or two into the bin.',
      },
      {
        when: 'Midday',
        caption:
          'The gas chlorinator’s glass rotameter read and its rate knob nudged; still the yellow comparator on the shelf.',
      },
      {
        when: 'Night',
        caption:
          'The circular chart recorder’s paper changed: one turn a day, the pool’s temperature drawn in ink.',
      },
    ],
  },
  {
    decade: '1960s',
    look: 'black-and-white',
    strap: 'Pink, not yellow',
    photos: [
      {
        when: 'Morning',
        caption:
          'Opening checks on a clipboard: skimmer baskets, hair traps, pool clear, lifesaving pole on its hooks.',
      },
      {
        when: 'Midday',
        caption:
          'The first DPD tablets: the water turns pink, and free and combined chlorine can be told apart at last.',
      },
      {
        when: 'Night',
        caption:
          'A sack of soda ash hauled in for the pH, the plant room door locked, the boiler left to its thermostat.',
      },
    ],
  },
  {
    decade: '1970s',
    look: 'faded-colour',
    strap: 'Metric, and the leisure centre',
    photos: [
      {
        when: 'Morning',
        caption:
          'The new leisure centre’s skimmers emptied before the doors open; the thermometer reads in Celsius now.',
      },
      {
        when: 'Midday',
        caption:
          'A chlorine drum delivery signed for at the back door, stacked in the store under its warning signs.',
      },
      {
        when: 'Night',
        caption:
          'The vacuum cleaner run along the floor of the empty pool, its hose snaking across the deck.',
      },
    ],
  },
  {
    decade: '1980s',
    look: 'colour-print',
    strap: 'The big panel',
    photos: [
      {
        when: 'Morning',
        caption:
          'The pump selector from HAND to AUTO, the time switch’s pins checked, then out to the poolside with the basket hook.',
      },
      {
        when: 'Midday',
        caption:
          'A pink DPD test on the poolside, written in the log against the moving-coil chlorine meter on the panel.',
      },
      {
        when: 'Night',
        caption:
          'An annunciator window lit (LOW CL); ACCEPT pressed, the analyser’s sample line cleared, RESET.',
      },
    ],
  },
  {
    decade: '1990s',
    look: 'colour-print',
    strap: 'The numbers',
    photos: [
      {
        when: 'Morning',
        caption:
          'Red seven-segment readings checked against the hand test; hair and plasters out of the skimmers, as ever.',
      },
      {
        when: 'Midday',
        caption:
          'E 07 on the controller: low sample flow. The manual, chained to the desk, says what that means.',
      },
      {
        when: 'Night',
        caption:
          'Backwash by the clock: the filter’s pressure differential written down before and after.',
      },
    ],
  },
  {
    decade: '2000s',
    look: 'early-digital',
    strap: 'The menus, and the pager',
    photos: [
      {
        when: 'Morning',
        caption:
          'The BMS fault log scrolled on a small LCD, one line at a time, before the skimmers and the hair traps.',
      },
      {
        when: 'Midday',
        caption:
          'A tanker delivery of sodium hypochlorite, the fill point unlocked and the hose coupled by the book.',
      },
      {
        when: 'Night',
        caption:
          'The pager goes off at home: the building has rung someone up because it is unhappy.',
      },
    ],
  },
  {
    decade: '2010s',
    look: 'digital',
    strap: 'The screen',
    photos: [
      {
        when: 'Morning',
        caption:
          'A tablet with the opening checklist ticked on the poolside; the skimmer basket still emptied by hand.',
      },
      {
        when: 'Midday',
        caption:
          'The colour touch screen of the dosing controller compared, as always, with a pink DPD test.',
      },
      {
        when: 'Night',
        caption:
          'The pool cover rolled out over the water to keep the heat in until the morning.',
      },
    ],
  },
  {
    decade: '2020s',
    look: 'digital',
    strap: 'Today',
    photos: [
      {
        when: 'Morning',
        caption:
          'The skimmer baskets, the first job of the day, as they were a hundred years ago. Hair still floats.',
      },
      {
        when: 'Midday',
        caption:
          'Water samples logged on a phone; the pool test kit and its pink tablets still in the plant room drawer.',
      },
      {
        when: 'Night',
        caption:
          'Last round: the plant room’s gauges read, the lights off, the pool left still and dark until six.',
      },
    ],
  },
];

/** A bay's width along its wall, and its frames' size. */
export const BAY = { w: 2.3, frameW: 0.62, frameH: 0.5, gap: 0.08 } as const;

/** The hall's walls' inner faces (its interior is 15.4 × 13.4 m). */
export const WALL = {
  north: -6.66,
  east: 7.66,
  south: 6.66,
  west: -7.66,
} as const;

export interface BayPlace {
  decade: Decade;
  /** Its middle, on the wall's face. */
  x: number;
  z: number;
  /** Its face's yaw (+z of its group out into the hall). */
  yaw: number;
  wall: 'north' | 'east' | 'south';
}

/**
 * Where each decade's bay hangs: the first five along the north wall,
 * west to east (left to right, facing it), the rest down the east wall,
 * north to south (left to right, facing it).
 */
export function bayPlaces(): BayPlace[] {
  const north = Math.ceil(DECADES.length / 2);
  return DECADES.map((decade, k) => {
    if (k < north)
      return {
        decade,
        x: -5.0 + k * (BAY.w + 0.25),
        z: WALL.north,
        yaw: 0,
        wall: 'north' as const,
      };
    const j = k - north;
    return {
      decade,
      x: WALL.east,
      z: -5.0 + j * (BAY.w + 0.25),
      yaw: -Math.PI / 2,
      wall: 'east' as const,
    };
  });
}

/**
 * The last bay (the owner, 2026-10-29): "The Pool of the Future?", on the
 * south wall east of the No running sign, the end of the walk after the
 * 2020s; its photographs `future-1.jpg` to `future-3.jpg`.
 */
export const FUTURE: Decade = {
  decade: 'The Pool of the Future?',
  look: 'digital',
  strap: 'Some things never change',
  photos: [
    {
      when: 'Opening',
      file: 'future-1',
      caption:
        'Reg makes his round through a bath where pools climb the walls and water runs overhead. He still checks every basin.',
    },
    {
      when: 'Testing',
      file: 'future-2',
      caption:
        'Reg reaches into the water model, checking one glowing cube at a time. The readings are instant; the round still takes time.',
    },
    {
      when: 'Closing',
      file: 'future-3',
      caption:
        'Reg checks the skimmer and finds hair, a plaster and a hair grip. Some things never change.',
    },
  ],
};

/** The future's bay: on the south wall, facing north into the hall, clear of the No running sign (x 1.9) and the east wall. */
export function futureBayPlace() {
  return {
    decade: FUTURE,
    x: 4.6,
    z: WALL.south,
    yaw: Math.PI,
    wall: 'south' as const,
  };
}

/** The dry poolside: its painted water, its deck, and the skimmer in its north edge, the bin along the deck. */
/**
 * The painted poolside's height over the museum's floor, metres (the
 * owner, 2026-10-29): a layer of its own, 2 mm up, and everything
 * standing on it (the bin, its sign, the reset point, the lectern, the
 * skimmer, the floor's arrows and the hall's fittings) lifted with it.
 */
export const DECK_LIFT = 0.002;

export const POOLSIDE = {
  water: { minX: -4.6, maxX: 3.4, minZ: 0.2, maxZ: 4.6 },
  deck: { minX: -5.6, maxX: 4.6, minZ: -3.2, maxZ: 5.4 },
  /** The coping's width, along the water's edge. */
  coping: 0.3,
  /**
   * The skimmer's lid (0.13 m round), in the deck's tiles beyond the
   * coping of the north edge, its nearest edge 7 cm past the coping (the
   * owner, 2026-10-29: not so close to the water); its throat runs on
   * under the coping to the pool's wall.
   */
  skimmer: { x: -0.6, z: -0.3 },
  /** The floor arrow pointing the visitor to it, this far north of it. */
  skimmerArrow: 0.75,
  /** The waste bin (the owner, 2026-10-29: a bin, not a skip). */
  skip: { x: 2.6, z: -1.9 },
} as const;

/** The hall's words: its entrance panel. */
export function hall5Entrance() {
  return {
    title: 'A Day in the Life',
    subtitle: 'Hall 5: a poolman’s duties through the decades',
    introduction:
      'Before the first swimmer arrives, somebody has already been round the pool. For a hundred years the day has run the same way: open up, empty the skimmers, test the water, take the deliveries, backwash the filters, lock up. The tools changed, from a yellow comparator and a chalkboard to a touch screen and a pager. The skimmer basket did not. Walk the photographs from the 1920s to today, and empty the skimmer yourself.',
    route: [
      { station: 1, name: 'The 1920s to the 1970s', what: 'north wall' },
      { station: 2, name: 'The 1980s to today', what: 'east wall' },
      { station: 3, name: 'What’s in the Skimmer?', what: 'the poolside' },
    ],
    reset:
      'Can’t break it: the big red RESET SIMULATION button fills the skimmer again.',
  };
}

/** The bin's sign. */
export const BIN_SIGN = {
  headline: 'For things found in the skimmer',
  body: 'Lined with a bin bag, emptied daily, and never, ever reached into.',
};

/** The laminated opening checks sheet on the wall. */
export const OPENING_CHECKS: readonly [string, boolean][] = [
  ['Plant room: pumps running, no leaks', true],
  ['Pool water tested (free and total chlorine, pH)', true],
  ['Empty skimmer baskets', true],
  ['Hair traps cleaned', false],
  ['Pool clear, floor visible', false],
  ['Rescue equipment in place', false],
  ['Poolside clean, no glass', false],
];
