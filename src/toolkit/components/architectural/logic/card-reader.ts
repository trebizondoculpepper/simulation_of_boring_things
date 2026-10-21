/**
 * A proximity card reader at a staff door (after Paxton's Net2 and HID's
 * iCLASS mullion readers): idle, its LED red; a card presented, it reads
 * it, beeps twice and shows green for a few seconds as the door's lock
 * is released, then goes back to red. The plant room doors are not
 * locked, so any card it is shown is good. Pure.
 */

export const CARD_READER = {
  /** How long the LED shows green after a read, seconds. */
  granted: 3,
} as const;

export interface CardReaderState {
  /** Seconds left showing a read: 0 is idle. */
  granted: number;
}

export const initialCardReader = (): CardReaderState => ({ granted: 0 });

/** A card presented: read, and granted. */
export const presentCard = (): CardReaderState => ({
  granted: CARD_READER.granted,
});

export const stepCardReader = (
  s: CardReaderState,
  dt: number,
): CardReaderState => ({ granted: Math.max(0, s.granted - dt) });

/** The LED's colour: green for a read, red idle. */
export const readerLed = (s: CardReaderState) =>
  s.granted > 0 ? 'green' : 'red';

/**
 * A door's card readers, frame by frame: lit green while the door stands
 * open; beeping only when it is opened here (shut last frame, open now),
 * not when the walker arrives to find it already open (`was` null, the
 * first frame after arriving). Returns whether to light them, whether
 * with a beep, and what `was` becomes.
 */
export function doorReaders(was: boolean | null, open: boolean) {
  return { light: open, audible: open && was === false, was: open };
}
