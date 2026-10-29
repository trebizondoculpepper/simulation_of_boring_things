/**
 * When a museum photograph shows its full resolution (the owner,
 * 2026-10-29: "Unless you are close and looking directly at the photos we
 * need to use a low resolution version. That way they don't seem to
 * suddenly draw in"): otherwise it shows its low-resolution copy, a
 * sixteenth of its pixels (`scripts/photo-lows.ts`), loaded with its hall.
 * Pure.
 */

/** Within this distance of a photograph, metres, and seen this square on, it may show in full. */
export const PHOTO_NEAR = 3;
/** Its face seen within this angle of square on, degrees. */
export const PHOTO_FACING = 40;
/** The eye turned within this angle of it, degrees. */
export const PHOTO_AIM = 25;
/** Once in full, how much further it holds, so it does not flicker at the edge. */
export const PHOTO_HOLD = { metres: 0.5, degrees: 10 } as const;

export interface PhotoSighting {
  /** The eye's distance from the photograph's middle, metres. */
  distance: number;
  /** The cosine of the angle between its face's normal and the way to the eye. */
  facing: number;
  /** The cosine of the angle between the eye's direction and the way to the photograph. */
  aim: number;
}

const cosOf = (degrees: number) => Math.cos((degrees * Math.PI) / 180);

/** Whether a photograph shows in full, given whether it did. */
export function showsFull(was: boolean, s: PhotoSighting): boolean {
  const hold = was ? PHOTO_HOLD : { metres: 0, degrees: 0 };
  return (
    s.distance <= PHOTO_NEAR + hold.metres &&
    s.facing >= cosOf(PHOTO_FACING + hold.degrees) &&
    s.aim >= cosOf(PHOTO_AIM + hold.degrees)
  );
}

/**
 * The part of an image that fills a print of another shape, cropped about
 * its middle (as a print is trimmed to its mount): its texture's repeat
 * and offset.
 */
export function coverCrop(
  image: { width: number; height: number },
  print: { width: number; height: number },
) {
  const image_ = image.width / image.height;
  const print_ = print.width / print.height;
  const repeat =
    image_ > print_
      ? { x: print_ / image_, y: 1 }
      : { x: 1, y: image_ / print_ };
  return {
    repeat,
    offset: { x: (1 - repeat.x) / 2, y: (1 - repeat.y) / 2 },
  };
}
