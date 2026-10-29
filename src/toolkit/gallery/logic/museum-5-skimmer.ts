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
  | 'leaves'
  | 'dead-rat'
  | 'dildo'
  | 'butt-plug'
  | 'more-hair';

export interface Find {
  /** Its id, and its voice clip's name. */
  id: FindId;
  /** What it is, for the overlay. */
  name: string;
  /** What the reveal's banner calls it: "You got …!" */
  got: string;
  /** Its caption, and the script for its voice clip. */
  caption: string;
}

/**
 * Every find, in the order they come out (the owner, 2026-10-29): each
 * revealed above the walker as a treasure is (`skimmer-reveal.ts`), each
 * modelled, and each disgusting.
 */
export const FINDS: readonly Find[] = [
  {
    id: 'hair-clump',
    name: 'a clump of hair',
    got: 'a CLUMP OF HAIR',
    caption:
      'A clump of hair. Hair floats, so the skimmer catches lots of it. Yuck.',
  },
  {
    id: 'leaves',
    name: 'a handful of rotting leaves',
    got: 'ROTTING LEAVES',
    caption:
      'Leaves, blown in through the doors and left to stew. They smell of pond.',
  },
  {
    id: 'dead-rat',
    name: 'a dead rat',
    got: 'a DEAD RAT',
    caption:
      'A dead rat. It came up through the drains, and the drains won. Hold it by the tail.',
  },
  {
    id: 'dildo',
    name: 'a dildo',
    got: 'a DILDO',
    caption:
      'A dildo. Waterproof, as advertised. Nobody has asked at lost property.',
  },
  {
    id: 'butt-plug',
    name: 'a butt plug',
    got: 'a BUTT PLUG',
    caption:
      'A butt plug. How it got into the skimmer is a question for the CCTV, and nobody wants to ask the CCTV.',
  },
  {
    id: 'more-hair',
    name: 'more hair',
    got: 'MORE HAIR',
    caption: 'More hair. There is always more hair.',
  },
];

export const findOf = (id: FindId) => FINDS.find((f) => f.id === id)!;

/** The find always on top, because it always is. */
export const FIRST_FIND: FindId = 'hair-clump';

/** The skimmer's tags, derived from the hall's room code (107-0). */
export const SKIMMER_TAGS = {
  skimmer: `${hallRoomCode('museum5')}-SK1`,
  lid: `${hallRoomCode('museum5')}-SK1-L`,
  basket: `${hallRoomCode('museum5')}-SK1-B`,
} as const;

/** Where a thing is: in the basket, in the visitor's hands, on the deck, in the skip. */
export type Place =
  | { at: 'basket' }
  | { at: 'held' }
  | { at: 'deck'; x: number; z: number }
  | { at: 'skip' };

/** Where the lid is: on its seat, held, or set down on the deck. */
export type LidPlace =
  | { at: 'on' }
  | { at: 'held' }
  | { at: 'deck'; x: number; z: number };

export interface SkimmerGame {
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
  | { type: 'pick'; index: number }
  /** A find lands in the skip, tossed from the hands (107f carrying). */
  | { type: 'land'; index: number };

export function newSkimmerGame(): SkimmerGame {
  const order = FINDS.map((f) => f.id);
  return {
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
        g.lid.at === 'on'
          ? 'The lid lifts off. Put it to one side.'
          : 'The lid.',
      );
    case 'skimmer': {
      if (hands === 'lid')
        return say({ ...g, lid: { at: 'on' } }, 'The lid goes back on.');
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
      const next = {
        ...placeAt(g, hands, { at: 'skip' }),
        binned: g.binned + 1,
      };
      return cleared(next) ? say(next, CLEARED_LINE(next.binned)) : next;
    }
    case 'deck':
      if (hands === null) return g;
      if (hands === 'lid') return { ...g, lid: { at: 'deck', x: a.x, z: a.z } };
      return placeAt(g, hands, { at: 'deck', x: a.x, z: a.z });
    case 'land': {
      const p = g.places[a.index];
      if (!p || p.at === 'skip' || p.at === 'basket') return g;
      const next = {
        ...placeAt(g, a.index, { at: 'skip' }),
        binned: g.binned + 1,
      };
      return cleared(next) ? say(next, CLEARED_LINE(next.binned)) : next;
    }
    case 'pick': {
      if (hands !== null) return say(g, 'Your hands are full.');
      if (g.places[a.index]?.at !== 'deck') return g;
      return say(
        placeAt(g, a.index, { at: 'held' }),
        findOf(g.order[a.index]).caption,
      );
    }
  }
}
