import { hallRoomCode } from './museum-plan';

/**
 * Hall 5's hands-on duty, "What's in the Skimmer?" (107f, folded into
 * 107l): the skimmer's finds, their captions, and the game, pure. Lift
 * the lid and set it down; take the finds out one at a time; put each in
 * the skip. The game is for adults (the owner, 2026-10-28): adult finds
 * are shown plainly and captioned deadpan, never graphically.
 */

export type FindId =
  | 'hair-clump'
  | 'hair-bobble'
  | 'hair-grips'
  | 'plaster'
  | 'verruca-sock'
  | 'leaves'
  | 'bee'
  | 'frog'
  | 'earring'
  | 'coins'
  | 'sixpence'
  | 'wedding-ring'
  | 'car-key'
  | 'goggle-lens'
  | 'nose-clip'
  | 'earplug'
  | 'swimming-badge'
  | 'dummy'
  | 'dinosaur'
  | 'rubber-duck'
  | 'grapes'
  | 'crisp-packet'
  | 'contact-lens'
  | 'tampon'
  | 'vibrator'
  | 'condom-wrapper'
  | 'false-teeth';

export interface Find {
  /** Its id, and its voice clip's name. */
  id: FindId;
  /** What it is, for the overlay. */
  name: string;
  /** Its caption, and the script for its voice clip. */
  caption: string;
}

/** Every find the skimmer may hold (107f's research, the owner's rulings). */
export const FINDS: readonly Find[] = [
  {
    id: 'hair-clump',
    name: 'a clump of hair',
    caption:
      'A clump of hair. Hair floats, so the skimmer catches lots of it. Yuck.',
  },
  {
    id: 'hair-bobble',
    name: 'a hair bobble',
    caption: 'A hair bobble. Somebody’s ponytail came undone.',
  },
  {
    id: 'hair-grips',
    name: 'hair grips',
    caption:
      'Hair grips. They sink, rust and stain the tiles, so we’re glad to catch these.',
  },
  {
    id: 'plaster',
    name: 'a sticking plaster',
    caption: 'A plaster. Warm water makes them peel off. Ew.',
  },
  {
    id: 'verruca-sock',
    name: 'a verruca sock',
    caption: 'A verruca sock. Only ever one: where do the other ones go?',
  },
  {
    id: 'leaves',
    name: 'a handful of leaves',
    caption: 'Leaves, blown in through the doors.',
  },
  {
    id: 'bee',
    name: 'a drowned bee',
    caption: 'A bee. Insects land on the water and can’t climb out.',
  },
  {
    id: 'frog',
    name: 'a rubber frog',
    caption: 'A frog! Only a rubber one. Outdoor pools get the real thing.',
  },
  {
    id: 'earring',
    name: 'an earring',
    caption: 'An earring. Lost property will be pleased.',
  },
  {
    id: 'coins',
    name: 'a few coins',
    caption: 'Coins: 47p. Nobody knows why people swim with money.',
  },
  {
    id: 'sixpence',
    name: 'an old sixpence',
    caption: 'An old sixpence. They stopped making these over fifty years ago.',
  },
  {
    id: 'wedding-ring',
    name: 'a wedding ring',
    caption:
      'A wedding ring! Cold water shrinks fingers and rings slip off. Somebody will be very happy.',
  },
  {
    id: 'car-key',
    name: 'a locker key on a wristband',
    caption: 'A locker key. Somebody is standing in a towel, waiting.',
  },
  {
    id: 'goggle-lens',
    name: 'a goggle lens',
    caption: 'Half a pair of goggles.',
  },
  {
    id: 'nose-clip',
    name: 'a nose clip',
    caption:
      'A nose clip, for synchronised swimmers and people who hate water up their nose.',
  },
  {
    id: 'earplug',
    name: 'an earplug',
    caption: 'An earplug. It’s been in someone’s ear.',
  },
  {
    id: 'swimming-badge',
    name: 'a cloth swimming badge',
    caption:
      'A 25 metres badge, sewn on and come off. Well done, whoever you are.',
  },
  {
    id: 'dummy',
    name: 'a baby’s dummy',
    caption: 'A dummy. Somebody small is very upset about this.',
  },
  {
    id: 'dinosaur',
    name: 'a toy dinosaur',
    caption: 'A toy dinosaur. It’s extinct now.',
  },
  {
    id: 'rubber-duck',
    name: 'a rubber duck',
    caption: 'A rubber duck, where it belongs, nearly.',
  },
  {
    id: 'grapes',
    name: 'a bunch of grapes',
    caption: 'Grapes. Somebody brought a picnic into the pool.',
  },
  {
    id: 'crisp-packet',
    name: 'a crisp packet',
    caption: 'A crisp packet. No eating on the poolside!',
  },
  {
    id: 'contact-lens',
    name: 'a contact lens',
    caption: 'A contact lens. Very hard to spot. Well found!',
  },
  {
    id: 'tampon',
    name: 'a tampon',
    caption:
      'A tampon. They do not flush, and they do not swim either. Into the skip.',
  },
  {
    id: 'vibrator',
    name: 'a small pink vibrator',
    caption:
      'A small pink vibrator. Waterproof, as advertised. Nobody has asked at lost property.',
  },
  {
    id: 'condom-wrapper',
    name: 'an empty condom wrapper',
    caption:
      'An empty condom wrapper. The pool closes at ten. We will not be asking.',
  },
  {
    id: 'false-teeth',
    name: 'a set of false teeth',
    caption:
      'FALSE TEETH! The rarest find of all. Somebody laughed too hard on the flume.',
  },
];

export const findOf = (id: FindId) => FINDS.find((f) => f.id === id)!;

/** The find always on top, because it always is. */
export const FIRST_FIND: FindId = 'hair-clump';
/** The rare find, and its chance in a fill. */
export const RARE_FIND: FindId = 'false-teeth';
export const RARE_CHANCE = 0.2;
/** How many finds in a fill, the hair clump and any false teeth included. */
export const FILL = { min: 12, max: 15 } as const;

/** The skimmer's tags, derived from the hall's room code (107-0). */
export const SKIMMER_TAGS = {
  skimmer: `${hallRoomCode('museum5')}-SK1`,
  lid: `${hallRoomCode('museum5')}-SK1-L`,
  basket: `${hallRoomCode('museum5')}-SK1-B`,
} as const;

/** A seeded random in [0, 1) (mulberry32). */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fill of the basket, top first: the hair clump, then a shuffled dozen or so, the false teeth one fill in five. */
export function fillOrder(seed: number): FindId[] {
  const rand = seeded(seed);
  const rest = FINDS.map((f) => f.id).filter(
    (id) => id !== FIRST_FIND && id !== RARE_FIND,
  );
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  const count = FILL.min + Math.floor(rand() * (FILL.max - FILL.min + 1));
  const rare = rand() < RARE_CHANCE;
  const picked = rest.slice(0, count - 1 - (rare ? 1 : 0));
  if (rare) picked.splice(Math.floor(rand() * (picked.length + 1)), 0, RARE_FIND);
  return [FIRST_FIND, ...picked];
}

/** Where a thing is: in the basket, in the visitor's hands, on the deck, in the skip. */
export type Place =
  | { at: 'basket' }
  | { at: 'held' }
  | { at: 'deck'; x: number; z: number }
  | { at: 'skip' };

/** Where the lid is: on its seat, held, or set down on the deck. */
export type LidPlace = { at: 'on' } | { at: 'held' } | { at: 'deck'; x: number; z: number };

export interface SkimmerGame {
  seed: number;
  /** The fill, top first; each find's place by its index here. */
  order: readonly FindId[];
  places: readonly Place[];
  lid: LidPlace;
  /** How many are in the skip. */
  binned: number;
  /** The last thing said, for the caption card. */
  said: string;
  /** Bumped whenever `said` is said again, so the card shows it afresh. */
  saidCount: number;
}

export type SkimmerAction =
  | { type: 'lid' }
  | { type: 'skimmer' }
  | { type: 'skip'; besideX: number; besideZ: number }
  | { type: 'deck'; x: number; z: number }
  | { type: 'pick'; index: number };

export function newSkimmerGame(seed: number): SkimmerGame {
  const order = fillOrder(seed);
  return {
    seed,
    order,
    places: order.map(() => ({ at: 'basket' }) as const),
    lid: { at: 'on' },
    binned: 0,
    said: '',
    saidCount: 0,
  };
}

/** What the visitor holds: nothing, the lid, or a find by its index. */
export function held(g: SkimmerGame): null | 'lid' | number {
  if (g.lid.at === 'held') return 'lid';
  const i = g.places.findIndex((p) => p.at === 'held');
  return i < 0 ? null : i;
}

/** The next find in the basket, by index, or -1 when it is empty. */
export const nextInBasket = (g: SkimmerGame) =>
  g.places.findIndex((p) => p.at === 'basket');

export const inBasket = (g: SkimmerGame) =>
  g.places.filter((p) => p.at === 'basket').length;

/** Cleared: every find in the skip. */
export const cleared = (g: SkimmerGame) => g.binned === g.order.length;

export const CLEARED_LINE = (n: number) =>
  `SKIMMER CLEARED! You took out ${n} things. Lovely.`;

const say = (g: SkimmerGame, said: string): SkimmerGame => ({
  ...g,
  said,
  saidCount: g.saidCount + 1,
});
const placeAt = (g: SkimmerGame, i: number, p: Place) => ({
  ...g,
  places: g.places.map((q, k) => (k === i ? p : q)),
});

/** The game's one step: what the visitor did, and what follows. */
export function actOnSkimmer(g: SkimmerGame, a: SkimmerAction): SkimmerGame {
  const hands = held(g);
  switch (a.type) {
    case 'lid':
      if (g.lid.at === 'held') return g;
      if (hands !== null) return say(g, 'Your hands are full.');
      return say(
        { ...g, lid: { at: 'held' } },
        g.lid.at === 'on' ? 'The lid lifts off. Put it to one side.' : 'The lid.',
      );
    case 'skimmer': {
      if (hands === 'lid') return say({ ...g, lid: { at: 'on' } }, 'The lid goes back on.');
      if (g.lid.at === 'on') return say(g, 'Lift the lid off first.');
      if (hands !== null) return say(g, 'Your hands are full.');
      const i = nextInBasket(g);
      if (i < 0) return say(g, 'The basket is empty.');
      return say(placeAt(g, i, { at: 'held' }), findOf(g.order[i]).caption);
    }
    case 'skip': {
      if (hands === null) return g;
      if (hands === 'lid')
        return say(
          { ...g, lid: { at: 'deck', x: a.besideX, z: a.besideZ } },
          'The skip takes only what came out of the skimmer. The lid stays here.',
        );
      const next = { ...placeAt(g, hands, { at: 'skip' }), binned: g.binned + 1 };
      return cleared(next) ? say(next, CLEARED_LINE(next.binned)) : next;
    }
    case 'deck':
      if (hands === null) return g;
      if (hands === 'lid') return { ...g, lid: { at: 'deck', x: a.x, z: a.z } };
      return placeAt(g, hands, { at: 'deck', x: a.x, z: a.z });
    case 'pick': {
      if (hands !== null) return say(g, 'Your hands are full.');
      if (g.places[a.index]?.at !== 'deck') return g;
      return say(placeAt(g, a.index, { at: 'held' }), findOf(g.order[a.index]).caption);
    }
  }
}
