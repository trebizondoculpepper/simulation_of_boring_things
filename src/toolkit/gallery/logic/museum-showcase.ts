import type { Footprint } from '../../controls/logic/walk-collision';

/**
 * A museum showcase's proportions (the owner, 2026-10-28: "model and
 * improve the museum cabinet"), after the free-standing table vitrines
 * museums buy from the specialist case makers: a plinth with a recessed
 * black kick plate and a shadow gap under its deck, a hood of low-iron
 * glass bonded at its corners standing in a thin metal channel, and over
 * it a shallow lighting attic, its LED strips and spot lighting the
 * object through a diffuser. Sized round what it shows: the glass a
 * clear margin off the object all round and above it, the deck at a
 * height that puts the object's middle near a standing visitor's eye
 * line, within the makers' usual range. In metres, the case's origin on
 * the floor at the middle of its footprint, its front facing +z.
 */
export const SHOWCASE = {
  /** The kick plate: its height, and how far it is set back under the plinth. */
  kick: { h: 0.075, setBack: 0.04 },
  /** The shadow gap between the plinth's body and its deck: its height and depth. */
  reveal: { h: 0.012, depth: 0.012 },
  /** The deck's thickness (fabric over a board). */
  deck: 0.025,
  /** The metal channel the glass stands in, and the frame round the attic: its section. */
  frame: 0.022,
  /** The glass's thickness: 10 mm low-iron, laminated. */
  glass: 0.01,
  /** The lighting attic over the glass. */
  attic: 0.1,
  /** The glass's least margin off the object, on each side, and above it. */
  clearance: 0.1,
  headroom: 0.15,
  /** The deck's height: the object's middle near this, within the range. */
  eyeLine: 1.3,
  deckMin: 0.6,
  deckMax: 0.95,
  /** The object label's card. */
  label: { w: 0.22, h: 0.11 },
  /** How far a visitor is kept from the plinth. */
  margin: 0.05,
} as const;

/** What a showcase shows: its envelope, metres, standing on the deck. */
export interface ShowcaseContents {
  w: number;
  d: number;
  h: number;
}

export interface ShowcaseLayout {
  /** The plinth (body, kick plate and deck): its width and depth, and the deck's top. */
  w: number;
  d: number;
  deckY: number;
  /** The glass hood, outside: its width, depth and height, standing on the deck. */
  hood: { w: number; d: number; h: number };
  /** The attic's underside and top. */
  atticY: number;
  topY: number;
  /** The case's spot: where it hangs (under the attic) and its cone's half-angle, radians. */
  spot: { y: number; angle: number };
  /** The label's middle on the deck, inside the glass at its front right. */
  label: { x: number; z: number };
  /** What a walker cannot enter. */
  solid: Footprint;
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/** Size a showcase round `contents`; `deckY` fixes the deck's height. */
export function sizeShowcase(
  contents: ShowcaseContents,
  deckY?: number,
): ShowcaseLayout {
  const S = SHOWCASE;
  const hood = {
    w: contents.w + 2 * (S.clearance + S.glass),
    d: contents.d + 2 * (S.clearance + S.glass),
    h: contents.h + S.headroom,
  };
  const deck = deckY ?? clamp(S.eyeLine - contents.h / 2, S.deckMin, S.deckMax);
  const atticY = deck + hood.h;
  // The spot's cone reaches the deck's far corners from the attic.
  const reach = Math.hypot(hood.w, hood.d) / 2;
  const angle = clamp(Math.atan(reach / hood.h) * 1.05, 0.3, 1.2);
  const w = hood.w;
  const d = hood.d;
  return {
    w,
    d,
    deckY: deck,
    hood,
    atticY,
    topY: atticY + S.attic,
    spot: { y: atticY - 0.01, angle },
    label: {
      x: w / 2 - S.glass - 0.04 - S.label.w / 2,
      z: d / 2 - S.glass - 0.04 - S.label.h / 2,
    },
    solid: {
      minX: -w / 2 - S.margin,
      maxX: w / 2 + S.margin,
      minZ: -d / 2 - S.margin,
      maxZ: d / 2 + S.margin,
    },
  };
}
