/**
 * Hall 5, "A Day in the Life" (107l): a poolman's day through the
 * decades, as a photographic exhibition, and where everything in the hall
 * stands. Pure. Each decade is a bay of three photographs (morning,
 * midday, night), hung earliest on the visitor's left as they walk round
 * all four walls (`GALLERY_RUNS`). Each frame has a placeholder carrying its decade and caption
 * until its photograph loads. The scenes follow 107h's research
 * (the yellow orthotolidine comparator before the 1960s, the pink DPD
 * after, cells on the controller from the 1990s) and the pool's day.
 */

import { hallArches, hallSize } from './museum-plan';

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

/**
 * The hall's walls' inner faces, from its interior (layout C: 15.4 ×
 * 13.4 m). The audit (2026-10-31) found them 40 mm inside the walls, so
 * everything hung on them floated; now the faces themselves.
 */
const INSIDE = hallSize('museum5');
export const WALL = {
  north: -INSIDE.d / 2,
  east: INSIDE.w / 2,
  south: INSIDE.d / 2,
  west: -INSIDE.w / 2,
} as const;

export type GalleryWall = 'north' | 'east' | 'south' | 'west';

export interface BayPlace {
  decade: Decade;
  /** Its middle, on the wall's face. */
  x: number;
  z: number;
  /** Its face's yaw (+z of its group out into the hall). */
  yaw: number;
  wall: GalleryWall;
}

/** How high a bay's middle hangs, and its print's height (its picture lights 0.075 m over its top). */
export const BAY_HANG = { y: 1.6, h: 1.25 } as const;

/** The entrance panel: on the north wall towards its west end, ahead of the visitor coming in (the audit, 2026-10-31: it stood in the doorway from Hall 4), west of the fire alarm's sounder-beacon, which hangs in the gap after it. */
export const ENTRANCE_PANEL = {
  w: 1.9,
  h: 1.5,
  y: 1.65,
  x: WALL.west + 2.15 + 1.9 / 2,
  z: WALL.north,
} as const;

/**
 * The stretches of wall the photographs hang along, in the order of the
 * walk (the owner, 2026-10-31: spread over all the hall's walls, in date
 * order round the route): in from Hall 4's doorway (the west wall's north
 * end), round the hall with the wall on the visitor's left, so the
 * earliest is on the left of each wall as it is faced: the north wall
 * west to east, after the entrance panel; the east wall north to south,
 * up to the doorway to Hall 6; on past it, the south wall east to west;
 * and the west wall south to north, ending short of the fire alarm call
 * point and notices by the way in. `from` and `to` are along the wall
 * (x for north and south, z for east and west), in the walk's direction;
 * `bays` how many hang on it, chosen so the gaps between bays are much
 * the same everywhere (1.0 to 1.3 m); the north wall's first gap is
 * under the fire alarm's sounder-beacon (`museum-safety.ts`).
 */
export const GALLERY_RUNS: readonly {
  wall: GalleryWall;
  from: number;
  to: number;
  bays: number;
}[] = [
  { wall: 'north', from: ENTRANCE_PANEL.x + 1.9 / 2 + 0.25, to: 7.4, bays: 3 },
  { wall: 'east', from: -6.0, to: 4.5 - 1.8 - 0.3, bays: 2 },
  { wall: 'south', from: 7.4, to: -7.4, bays: 4 },
  { wall: 'west', from: 6.4, to: -1.4, bays: 2 },
];

const YAW: Record<GalleryWall, number> = {
  north: 0,
  east: -Math.PI / 2,
  south: Math.PI,
  west: Math.PI / 2,
};

/** A point `u` along a wall's face, and the yaw facing into the hall. */
export function onGalleryWall(wall: GalleryWall, u: number) {
  return wall === 'north' || wall === 'south'
    ? { x: u, z: WALL[wall], yaw: YAW[wall] }
    : { x: WALL[wall], z: u, yaw: YAW[wall] };
}

/** Every bay's place along its run: evenly spaced, the gaps between them and at the run's ends equal. */
function galleryPlaces(): { wall: GalleryWall; u: number; gap: number }[] {
  const out: { wall: GalleryWall; u: number; gap: number }[] = [];
  for (const run of GALLERY_RUNS) {
    const s = Math.sign(run.to - run.from);
    const length = Math.abs(run.to - run.from);
    const gap = (length - run.bays * BAY.w) / (run.bays + 1);
    for (let k = 0; k < run.bays; k++)
      out.push({
        wall: run.wall,
        u: run.from + s * (gap + BAY.w / 2 + k * (BAY.w + gap)),
        gap,
      });
  }
  return out;
}

/** The gaps between bays on each run, metres. */
export function galleryGaps(): Record<GalleryWall, number> {
  return Object.fromEntries(
    galleryPlaces().map((p) => [p.wall, p.gap]),
  ) as Record<GalleryWall, number>;
}

/** Where each decade's bay hangs, earliest first; the Pool of the Future?'s is the last place (`futureBayPlace`). */
export function bayPlaces(): BayPlace[] {
  const places = galleryPlaces();
  return DECADES.map((decade, k) => ({
    decade,
    ...onGalleryWall(places[k].wall, places[k].u),
    wall: places[k].wall,
  }));
}

/**
 * The south wall's two small signs, each in the middle of a gap between
 * its bays, clear of them (the owner, 2026-10-31: the opening checks
 * sheet printed over the Pool of the Future?'s bay): the No running sign
 * between the first two, the opening checks sheet between the last two.
 */
export function southSigns() {
  const south = galleryPlaces().filter((p) => p.wall === 'south');
  const between = (a: number, b: number) => (south[a].u + south[b].u) / 2;
  return {
    noRunning: {
      ...onGalleryWall('south', between(0, 1)),
      w: 0.4,
      h: 0.5,
      y: 1.6,
    },
    checks: {
      ...onGalleryWall('south', between(2, 3)),
      w: 0.42,
      h: 0.6,
      y: 1.5,
    },
  };
}

/** Hall 5's doorways, along the walls they are in (its own frame). */
export function hall5Openings(): {
  wall: GalleryWall;
  from: number;
  to: number;
}[] {
  return hallArches('museum5').map((a) => {
    const along = a.axis === 'x';
    const u = along ? a.frame.x : a.frame.z;
    const wall: GalleryWall = along
      ? a.frame.z < 0
        ? 'north'
        : 'south'
      : a.frame.x < 0
        ? 'west'
        : 'east';
    return { wall, from: u - a.w / 2, to: u + a.w / 2 };
  });
}

/**
 * The timeline rail, brass, at hand height round all four walls, under
 * the bays: each wall's face, broken at its doorway (the owner,
 * 2026-10-31: it ran across the way on to Hall 6), stopped 50 mm short of
 * the opening. Each run: its wall and its ends along it.
 */
export const RAIL = { y: 0.92, size: 0.03 } as const;
export function railRuns(
  openings: readonly { wall: GalleryWall; from: number; to: number }[],
): { wall: GalleryWall; from: number; to: number }[] {
  const out: { wall: GalleryWall; from: number; to: number }[] = [];
  for (const wall of ['north', 'east', 'south', 'west'] as const) {
    const half = wall === 'north' || wall === 'south' ? WALL.east : WALL.south;
    let at = -half;
    for (const o of openings
      .filter((q) => q.wall === wall)
      .sort((p, q) => p.from - q.from)) {
      if (o.from - 0.05 > at) out.push({ wall, from: at, to: o.from - 0.05 });
      at = Math.max(at, o.to + 0.05);
    }
    if (half > at) out.push({ wall, from: at, to: half });
  }
  return out;
}

/**
 * The last bay (the owner, 2026-10-29): "The Pool of the Future?", the
 * end of the walk after the 2020s; its photographs `future-1.jpg` to
 * `future-3.jpg`.
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

/** The future's bay: the last place of the walk, at the west wall's north end, by the way out of the loop (layout C, the owner, 2026-10-31). */
export function futureBayPlace(): BayPlace {
  const p = galleryPlaces()[DECADES.length];
  return { decade: FUTURE, ...onGalleryWall(p.wall, p.u), wall: p.wall };
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

/**
 * The "Inside a skimmer" cut-away, on a lectern at the water's edge just
 * west of the skimmer (the owner, 2026-10-31: off the wall, by the
 * skimmer). By the facing rule (`doc/museum-hall-model.md`) its front
 * faces into the room: north, the way the visitor comes along the deck,
 * turned 20° east towards the skimmer, so that whoever reads it stands
 * by the TRY ME arrow with the skimmer at their left hand. `yaw` turns
 * its +z (its front) to (sin yaw, cos yaw).
 */
export const SKIMMER_LECTERN = {
  x: POOLSIDE.skimmer.x - 0.95,
  z: POOLSIDE.skimmer.z - 0.25,
  yaw: Math.PI - (20 * Math.PI) / 180,
} as const;

/**
 * The RESET SIMULATION pedestal and its sign, beside the bin (the owner,
 * 2026-10-31: it stood on the west wall, far from the game): east of
 * the bin, facing west, back towards the bin and the skimmer.
 */
export const RESET_POINT = {
  x: POOLSIDE.skip.x + 0.85,
  z: POOLSIDE.skip.z,
  yaw: -Math.PI / 2,
} as const;

/** The hall's words: its entrance panel. */
export function hall5Entrance() {
  return {
    title: 'A Day in the Life',
    subtitle: 'Hall 5: a poolman’s duties through the decades',
    introduction:
      'Before the first swimmer arrives, somebody has already been round the pool. For a hundred years the day has run the same way: open up, empty the skimmers, test the water, take the deliveries, backwash the filters, lock up. The tools changed, from a yellow comparator and a chalkboard to a touch screen and a pager. The skimmer basket did not. Walk the photographs from the 1920s to today, and empty the skimmer yourself.',
    route: [
      {
        station: 1,
        name: 'The 1920s to the 1970s',
        what: 'north and east walls',
      },
      {
        station: 2,
        name: 'The 1980s to the Pool of the Future?',
        what: 'south and west walls',
      },
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

/** The laminated opening checks sheet on the south wall (`southSigns`). */
export const OPENING_CHECKS: readonly [string, boolean][] = [
  ['Plant room: pumps running, no leaks', true],
  ['Pool water tested (free and total chlorine, pH)', true],
  ['Empty skimmer baskets', true],
  ['Hair traps cleaned', false],
  ['Pool clear, floor visible', false],
  ['Rescue equipment in place', false],
  ['Poolside clean, no glass', false],
];
