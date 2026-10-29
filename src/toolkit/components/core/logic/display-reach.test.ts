import { describe, expect, it } from 'vite-plus/test';
import {
  DISPLAY_LEAVE,
  DISPLAY_MAX_OFF_NORMAL,
  DISPLAY_MIN_SUBTENDED,
  DISPLAY_REACH,
  displayInReach,
  isLiveDisplay,
  meanColour,
} from './display-reach';

describe('display reach', () => {
  const seen = (metres: number, offNormal: number | null = 0, subtended = 5) =>
    ({ metres, offNormal, subtended }) as const;

  it('draws a display in full within reach and flat beyond it', () => {
    expect(displayInReach(false, seen(DISPLAY_REACH - 0.1))).toBe(true);
    expect(displayInReach(false, seen(DISPLAY_REACH + 0.1))).toBe(false);
  });

  it('keeps a display in full until it is past the margin', () => {
    expect(displayInReach(true, seen(DISPLAY_REACH + DISPLAY_LEAVE / 2))).toBe(
      true,
    );
    expect(
      displayInReach(true, seen(DISPLAY_REACH + DISPLAY_LEAVE + 0.1)),
    ).toBe(false);
  });

  it('never draws a display seen from behind', () => {
    expect(displayInReach(true, seen(1, 120))).toBe(false);
  });

  it('draws a display flat when seen far off its normal', () => {
    expect(displayInReach(false, seen(2, DISPLAY_MAX_OFF_NORMAL + 1))).toBe(
      false,
    );
    expect(displayInReach(false, seen(2, 30))).toBe(true);
    expect(displayInReach(false, seen(2, null))).toBe(true);
  });

  it('draws a display flat when too small to read', () => {
    expect(displayInReach(false, seen(2, 0, DISPLAY_MIN_SUBTENDED / 2))).toBe(
      false,
    );
  });

  it('treats only a texture redrawn after its first drawing as live', () => {
    expect(isLiveDisplay(1)).toBe(false);
    expect(isLiveDisplay(2)).toBe(true);
  });

  it('averages pixels into a colour', () => {
    expect(meanColour([0, 0, 0, 255, 200, 100, 50, 255])).toBe(
      'rgb(100,50,25)',
    );
    expect(meanColour([])).toBe('rgb(0,0,0)');
  });
});
