import { describe, expect, it } from 'vite-plus/test';
import {
  CARD_READER,
  initialCardReader,
  presentCard,
  readerLed,
  stepCardReader,
} from './card-reader';

describe('the card reader', () => {
  it('shows red idle, green for a few seconds after a card, then red again', () => {
    expect(readerLed(initialCardReader())).toBe('red');
    const read = presentCard();
    expect(readerLed(read)).toBe('green');
    expect(readerLed(stepCardReader(read, CARD_READER.granted - 0.1))).toBe(
      'green',
    );
    expect(readerLed(stepCardReader(read, CARD_READER.granted + 0.1))).toBe(
      'red',
    );
  });
});

import { doorReaders } from './card-reader';

describe('a door’s card readers', () => {
  it('beep when the door is opened here, and not when it is found open', () => {
    // Arriving to an open door: lit, silent.
    expect(doorReaders(null, true)).toEqual({
      light: true,
      audible: false,
      was: true,
    });
    // Shut, then opened: lit, with a beep.
    expect(doorReaders(false, true)).toEqual({
      light: true,
      audible: true,
      was: true,
    });
    // Still open: lit, silent.
    expect(doorReaders(true, true)).toEqual({
      light: true,
      audible: false,
      was: true,
    });
    // Shut: not lit (they go red again once their read runs out).
    expect(doorReaders(true, false)).toEqual({
      light: false,
      audible: false,
      was: false,
    });
    expect(doorReaders(null, false).light).toBe(false);
  });
});
