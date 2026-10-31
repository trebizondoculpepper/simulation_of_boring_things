import { isBlackBox, type MuseumHallId } from './museum-plan';

/**
 * A museum corridor's finish: the halls' 95 % grey paint and polished
 * floor, or, between two black boxes (`isBlackBox`; Hall 7 and Hall 8,
 * corridor c78), the black boxes' own matt black walls, floor and deck,
 * so the two are never joined by a white corridor (the owner,
 * 2026-10-31). Both halls build the corridor, and both ask this of the
 * same pair, so the two copies match. Pure.
 */
export type CorridorFinish = 'gallery' | 'blackBox';

export function corridorFinish(
  a: MuseumHallId,
  b: MuseumHallId,
): CorridorFinish {
  return isBlackBox(a) && isBlackBox(b) ? 'blackBox' : 'gallery';
}
