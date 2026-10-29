/**
 * More things found in a skimmer (the owner, 2026-10-29), tried in dev53
 * beside Hall 5's six (`museum-5-skimmer.ts`) before the hall takes any:
 * each with its banner's words and its caption, in the hall's deadpan
 * voice, and its true size. Four are made from other people's models
 * (`resources/models/skimmer/`, credited in `CREDITS.md`); the goggles
 * and the crisp packet are modelled here (`hall-5-extra-finds.ts`).
 */

export type ExtraFindId =
  | 'dead-frog'
  | 'plaster'
  | 'earring'
  | 'bottle-cap'
  | 'goggles'
  | 'crisp-packet';

export interface ExtraFind {
  id: ExtraFindId;
  /** What the reveal's banner calls it: "You got …!" */
  got: string;
  caption: string;
  /** Its longest side, metres. */
  size: number;
  /** Its model's file in `resources/models/skimmer/`, if it is not modelled here. */
  model?: string;
}

export const EXTRA_FINDS: readonly ExtraFind[] = [
  {
    id: 'dead-frog',
    got: 'a DEAD FROG',
    caption:
      'A frog. It came in for a swim and the chlorine won. Nobody kissed it.',
    size: 0.08,
    model: 'dead-frog.glb',
  },
  {
    id: 'plaster',
    got: 'a PLASTER',
    caption:
      'A plaster, used. Somewhere in the changing rooms a verruca walks free.',
    size: 0.07,
    model: 'plaster.glb',
  },
  {
    id: 'earring',
    got: 'some EARRINGS',
    caption:
      'A pair of hoop earrings, still hooked together. Somebody swam home lighter.',
    size: 0.04,
    model: 'earring.glb',
  },
  {
    id: 'bottle-cap',
    got: 'a BOTTLE CAP',
    caption:
      'A bottle cap. No glass on poolside, so somebody smuggled it. The bottle got away.',
    size: 0.03,
    model: 'bottle-cap.glb',
  },
  {
    id: 'goggles',
    got: 'some GOGGLES',
    caption:
      'Swimming goggles, the strap snapped. Lost property has had them twice already.',
    size: 0.17,
  },
  {
    id: 'crisp-packet',
    got: 'a CRISP PACKET',
    caption:
      'A crisp packet, ready salted, empty. No eating on poolside, and yet.',
    size: 0.18,
  },
];
