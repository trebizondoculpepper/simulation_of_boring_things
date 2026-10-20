/**
 * How a skip is dressed beyond its paint: spray-painted graffiti tags on
 * its sides and ends, and amber flashing skip lamps clamped to its top
 * rail's corners, as councils require of a skip left on the road after
 * dark (one at each corner, at least 1 candela, flashing or steady, the
 * battery lamps that clip to a skip and light themselves at dusk). Not
 * every skip has either: each is chosen at random. Pure logic.
 */

import { GRAFFITI } from './graffiti';
import type { GraffitiPiece } from './graffiti';

/** The skip's two long sides, clear of the hire firm's name. */
export type SkipFace = 'front' | 'back';
/** A corner of its top rail, by its end (-1 left, 1 right) and side. */
export interface SkipCorner {
  end: -1 | 1;
  side: -1 | 1;
}

export interface GraffitiTag {
  face: SkipFace;
  /** Sign: left or right of the hire firm's middle panel. */
  side: -1 | 1;
  /** Height of the sprayed image, metres. */
  size: number;
  angle: number;
  art: GraffitiPiece;
}

export interface SkipLamp extends SkipCorner {
  /** Where in its flash it starts, 0 to 1, so lamps never flash as one. */
  phase: number;
}

export interface SkipDressing {
  tags: GraffitiTag[];
  lamps: SkipLamp[];
}

/** How often a skip has graffiti, and lamps. */
export const GRAFFITI_CHANCE = 0.6;
export const LAMP_CHANCE = 0.5;
/** A skip lamp flashes once a second, briefly. */
export const FLASH_SECONDS = 1;
export const FLASH_ON = 0.18;

const TAG_ART = GRAFFITI.filter((art) => art.kind === 'tag');

const pick = <T>(list: readonly T[], random: () => number) =>
  list[Math.floor(random() * list.length)];

/**
 * A skip's dressing at random: one tag beside the hire firm's name on
 * one long side, perhaps lamps on two or all four corners. The two
 * probabilities are independent.
 */
export function dressSkip(random: () => number = Math.random): SkipDressing {
  const tags: GraffitiTag[] = [];
  if (random() < GRAFFITI_CHANCE) {
    tags.push({
      face: random() < 0.5 ? 'front' : 'back',
      side: random() < 0.5 ? -1 : 1,
      size: 0.22 + random() * 0.08,
      angle: (random() - 0.5) * 0.25,
      art: pick(TAG_ART, random),
    });
  }
  const lamps: SkipLamp[] = [];
  if (random() < LAMP_CHANCE) {
    const corners: SkipCorner[] = [
      { end: -1, side: -1 },
      { end: 1, side: -1 },
      { end: -1, side: 1 },
      { end: 1, side: 1 },
    ];
    // Four, as the councils ask; often only the two on the road side.
    const all = random() < 0.5;
    const roadSide = random() < 0.5 ? -1 : 1;
    for (const corner of corners)
      if (all || corner.side === roadSide)
        lamps.push({ ...corner, phase: random() });
  }
  return { tags, lamps };
}

/** Whether a lamp is lit at `seconds`, flashing from its phase. */
export function lampLit(lamp: SkipLamp, seconds: number) {
  const at = (seconds / FLASH_SECONDS + lamp.phase) % 1;
  return at < FLASH_ON / FLASH_SECONDS;
}
