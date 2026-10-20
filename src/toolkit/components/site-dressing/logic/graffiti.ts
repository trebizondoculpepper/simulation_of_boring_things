/**
 * The graffiti collection: street art of our own invention, exhibited in
 * dev16 and drawn from there onto whatever gets sprayed. It is about
 * nothing in particular: taggers put their names on everything. Every
 * name and word is made up. Each piece is a kind of graffiti, its
 * words and colours, and a seed for the drawing's wobble, so it is drawn
 * the same every time (`src/toolkit/components/site-dressing/views/graffiti.ts`). Pure data.
 */

export type GraffitiKind =
  /** A quick signature in one colour, with drips. */
  | 'tag'
  /** Fat bubble letters, filled and outlined, done fast. */
  | 'throwup'
  /** A worked, many-coloured piece: 3D, highlights, arrows. */
  | 'piece'
  /** Sprayed through a cut stencil: crisp, one colour, overspray. */
  | 'stencil'
  /** A HELLO MY NAME IS sticker, tagged in marker. */
  | 'sticker'
  /** A cartoon face. */
  | 'character'
  /** Initials in a heart. */
  | 'heart'
  /** One tag gone over by another's: a feud. */
  | 'crossed'
  /** A few words scrawled in marker. */
  | 'message'
  /** Huge flat letters painted with a roller. */
  | 'roller';

export interface GraffitiPiece {
  id: string;
  /** Its title on the gallery label. */
  title: string;
  kind: GraffitiKind;
  /** Its words; a crossed piece's second is the one going over. */
  text: readonly string[];
  /** Fill, outline and extra colours, in that order. */
  colours: readonly string[];
  seed: number;
}

/** Spray colours the collection is painted from. */
const PINK = '#e8306b';
const CYAN = '#2fd0e0';
const YELLOW = '#ffd23a';
const LIME = '#7ee04a';
const PURPLE = '#8b5cf6';
const ORANGE = '#ff7a1a';
const RED = '#d4202a';
const BLACK = '#141414';
const WHITE = '#f5f5f5';
const CHROME = '#c9ccd1';
const BLUE = '#2f6fe0';

let seed = 0;
const art = (
  kind: GraffitiKind,
  title: string,
  text: readonly string[],
  colours: readonly string[],
): GraffitiPiece => ({
  id: `${kind}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  title,
  kind,
  text,
  colours,
  seed: 11 + 14 * seed++,
});

export const GRAFFITI: readonly GraffitiPiece[] = [
  // Tags: the names that go everywhere.
  ...(
    [
      ['ZOK', PINK],
      ['KEV', BLACK],
      ['NUB', BLUE],
      ['FIZ', LIME],
      ['TEKS', RED],
      ['VOLE', PURPLE],
      ['SPUD', ORANGE],
      ['MOTH', BLACK],
      ['GLUM', CYAN],
      ['PIKE', PINK],
      ['OHNO', BLACK],
      ['JUNO', WHITE],
    ] as const
  ).map(([name, colour]) => art('tag', name, [name], [colour])),
  // Throw-ups.
  art('throwup', 'BOSH, chrome', ['BOSH'], [CHROME, BLACK, '#6f7378']),
  art('throwup', 'DAZ, pink', ['DAZ'], ['#f05aa0', WHITE, '#7a1f4f']),
  art('throwup', 'POP, yellow', ['POP'], [YELLOW, BLACK, '#a07a10']),
  art('throwup', 'MUNG, blue', ['MUNG'], [BLUE, WHITE, '#18306b']),
  art('throwup', 'YOB, lime', ['YOB'], [LIME, BLACK, '#3a7a1a']),
  art('throwup', 'BLIT, chrome', ['BLIT'], [CHROME, PURPLE, '#55585d']),
  // Pieces.
  art('piece', 'SKUD, a piece', ['SKUD'], [YELLOW, BLACK, ORANGE, CYAN, LIME]),
  art('piece', 'GRIM, a piece', ['GRIM'], [LIME, BLACK, CYAN, PURPLE, WHITE]),
  art('piece', 'FLUX, a piece', ['FLUX'], [PINK, BLACK, PURPLE, YELLOW, WHITE]),
  art('piece', 'RAVE, a piece', ['RAVE'], [CYAN, BLACK, BLUE, PINK, YELLOW]),
  art('piece', 'KROME, a piece', ['KROME'], [CHROME, BLACK, WHITE, RED, CYAN]),
  art('piece', 'VEX, a piece', ['VEX'], [ORANGE, BLACK, RED, LIME, WHITE]),
  // Stencils.
  art('stencil', 'This Is Not Art', ['THIS IS', 'NOT ART'], [BLACK]),
  art('stencil', 'Nothing to See Here', ['NOTHING TO', 'SEE HERE'], [BLUE]),
  art('stencil', 'King Kev', ['KING', 'KEV'], [RED]),
  art('stencil', 'Look Up', ['LOOK UP'], [BLACK]),
  // Stickers.
  art('sticker', 'Hello, My Name Is WOT', ['WOT'], [RED, BLACK]),
  art('sticker', 'Hello, My Name Is NUB', ['NUB'], [BLUE, BLACK]),
  art('sticker', 'Hello, My Name Is OHNO', ['OHNO'], [RED, BLUE]),
  // Characters.
  art('character', 'Grinning Blob', [], [CYAN, BLACK, WHITE]),
  art('character', 'Green Grinner', [], [LIME, BLACK, WHITE]),
  // Hearts.
  art('heart', 'DAZ 4 SHAZ', ['DAZ', 'SHAZ'], [RED]),
  art('heart', 'KEV 4 BEV', ['KEV', 'BEV'], [PINK]),
  // Going over.
  art('crossed', 'ZOK, gone over by KRAK', ['ZOK', 'KRAK'], [CYAN, BLACK]),
  art('crossed', 'NUB, gone over by TEKS', ['NUB', 'TEKS'], [YELLOW, RED]),
  // Messages, in marker.
  art('message', 'Kev Woz Ere', ['KEV', 'WOZ ERE'], [BLACK]),
  art('message', 'Wot U Lookin At', ['WOT U', 'LOOKIN AT'], [BLUE]),
  art('message', 'Bored', ['BORED', 'BORED', 'BORED'], [RED]),
  // Roller letters.
  art('roller', 'ZOK, rollered', ['ZOK'], [WHITE]),
  art('roller', 'FIZ, rollered', ['FIZ'], [YELLOW]),
];

/** The kinds, as the gallery labels name them. */
export const GRAFFITI_KIND_NAMES: Record<GraffitiKind, string> = {
  tag: 'Tag, spray paint',
  throwup: 'Throw-up, spray paint',
  piece: 'Piece, spray paint',
  stencil: 'Stencil, spray paint',
  sticker: 'Sticker, marker on vinyl',
  character: 'Character, spray paint',
  heart: 'Heart, marker',
  crossed: 'Going over, spray paint',
  message: 'Message, marker',
  roller: 'Roller letters, emulsion',
};

/** A piece chosen at random; `random` gives numbers in [0, 1). */
export const anyGraffiti = (random: () => number = Math.random) =>
  GRAFFITI[Math.floor(random() * GRAFFITI.length)];
