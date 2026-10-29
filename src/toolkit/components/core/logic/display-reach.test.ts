import { describe, expect, it } from 'vite-plus/test';
import {
  DISPLAY_LEAVE,
  DISPLAY_PROFILES,
  SIGN_FULL,
  SIGN_HEADINGS,
  letteringShown,
  signDetail,
  mayRefresh,
  withinRoomLimits,
  DISPLAY_REACH,
  displayVisibility,
  isLiveDisplay,
  meanColour,
} from './display-reach';

const { maxOffNormal, fullOffNormal, minSubtended } = DISPLAY_PROFILES.lcd;

describe('display reach', () => {
  const seen = (metres: number, offNormal: number | null = 0, subtended = 5) =>
    ({ metres, offNormal, subtended }) as const;

  it('draws a display in full within reach and flat beyond it', () => {
    expect(displayVisibility(false, seen(DISPLAY_REACH - 0.1))).toBe(1);
    expect(displayVisibility(false, seen(DISPLAY_REACH + 0.1))).toBe(0);
  });

  it('keeps a display in full until it is past the margin', () => {
    expect(
      displayVisibility(true, seen(DISPLAY_REACH + DISPLAY_LEAVE / 2)),
    ).toBe(1);
    expect(
      displayVisibility(true, seen(DISPLAY_REACH + DISPLAY_LEAVE + 0.1)),
    ).toBe(0);
  });

  it('never draws a display seen from behind', () => {
    expect(displayVisibility(true, seen(1, 120))).toBe(0);
  });

  it('draws a display flat when seen far off its normal', () => {
    expect(displayVisibility(false, seen(2, maxOffNormal + 1))).toBe(0);
    expect(displayVisibility(false, seen(2, 30))).toBe(1);
    expect(displayVisibility(false, seen(2, null))).toBe(1);
  });

  it('fades a display up between 70 and 65 degrees off its normal', () => {
    expect(displayVisibility(false, seen(2, maxOffNormal))).toBe(0);
    expect(displayVisibility(false, seen(2, 67.5))).toBe(0.5);
    expect(displayVisibility(false, seen(2, fullOffNormal))).toBe(1);
    expect(displayVisibility(false, seen(2, 68.9))).toBe(0.25);
  });

  it('lets a CRT be read further off its normal than an LCD', () => {
    expect(displayVisibility(false, seen(2, 75), DISPLAY_PROFILES.lcd)).toBe(0);
    expect(displayVisibility(false, seen(2, 75), DISPLAY_PROFILES.crt)).toBe(1);
  });

  it("always draws LCARS screens and the game's own panels in full", () => {
    expect(
      displayVisibility(false, seen(50, 120, 0.1), DISPLAY_PROFILES.lcars),
    ).toBe(1);
    expect(
      displayVisibility(false, seen(50, 120, 0.1), DISPLAY_PROFILES.ui),
    ).toBe(1);
  });

  it('draws a display flat when too small to read', () => {
    expect(displayVisibility(false, seen(2, 0, minSubtended / 2))).toBe(0);
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

  it('lets a room only tighten a kind of screen, never loosen it', () => {
    const tight = withinRoomLimits(DISPLAY_PROFILES.lcd, {
      reach: 5,
      minSubtended: 2,
      narrowBy: 10,
    });
    expect(tight).toMatchObject({
      reach: 5,
      minSubtended: 2,
      maxOffNormal: 60,
      fullOffNormal: 55,
    });
    expect(withinRoomLimits(DISPLAY_PROFILES.lcd, { reach: 20 }).reach).toBe(8);
    expect(withinRoomLimits(DISPLAY_PROFILES.lcars, { reach: 1 })).toBe(
      DISPLAY_PROFILES.lcars,
    );
    expect(displayVisibility(false, seen(6), tight)).toBe(0);
  });

  it('shows a new picture no more often than its kind could', () => {
    expect(mayRefresh(DISPLAY_PROFILES.lcd, 0, 150)).toBe(false);
    expect(mayRefresh(DISPLAY_PROFILES.lcd, 0, 200)).toBe(true);
    expect(mayRefresh(DISPLAY_PROFILES.crt, 0, 40)).toBe(true);
    expect(mayRefresh(DISPLAY_PROFILES.printed, 0, 1)).toBe(true);
  });

  it('draws a sign as regions far off, headings nearer, everything close', () => {
    expect(signDetail('full', SIGN_HEADINGS + 2)).toBe('regions');
    expect(signDetail('regions', SIGN_HEADINGS - 1)).toBe('headings');
    expect(signDetail('headings', SIGN_FULL - 1)).toBe('full');
    expect(signDetail('full', SIGN_FULL + 0.5)).toBe('full');
  });

  it('keeps large lettering at headings detail and drops small', () => {
    expect(letteringShown('headings', 'bold 60px Arial', 1000)).toBe(true);
    expect(letteringShown('headings', '20px Arial', 1000)).toBe(false);
    expect(letteringShown('regions', 'bold 200px Arial', 1000)).toBe(false);
    expect(letteringShown('full', '8px Arial', 1000)).toBe(true);
  });
});
