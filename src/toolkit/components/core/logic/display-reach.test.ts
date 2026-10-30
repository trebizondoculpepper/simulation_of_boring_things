import { describe, expect, it } from 'vite-plus/test';
import {
  DISPLAY_LEAVE,
  DISPLAY_PROFILES,
  SIGN_CUTOFFS,
  letteringShown,
  signStep,
  smallestReadable,
  mayRefresh,
  withinRoomLimits,
  DISPLAY_REACH,
  GIANT_LED_REACH,
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

  it('draws a giant LED readout in full across a whole hall', () => {
    const giant = DISPLAY_PROFILES['giant-led'];
    // Hall 1's TI5 from the hall's far corner: 0.81 m wide at 18.5 m.
    const across = seen(18.5, 30, 2.5);
    expect(displayVisibility(false, across, giant)).toBe(1);
    expect(displayVisibility(false, across, DISPLAY_PROFILES.led)).toBe(0);
    expect(displayVisibility(false, seen(GIANT_LED_REACH + 0.1), giant)).toBe(
      0,
    );
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

  const view = (metres: number, offNormal: number | null = 0) => ({
    metres,
    fov: 60,
    zoom: 1,
    screenPixels: 1000,
    offNormal,
  });

  it('shows a big title from much further than small print', () => {
    const at = (metres: number) =>
      SIGN_CUTOFFS[signStep(0, smallestReadable(view(metres)))];
    expect(letteringShown(at(15), 'bold 100px Arial', 1000)).toBe(true);
    expect(letteringShown(at(15), '10px Arial', 1000)).toBe(false);
    expect(letteringShown(at(1), '10px Arial', 1000)).toBe(true);
  });

  it('needs bigger lettering seen obliquely or on a smaller screen', () => {
    expect(smallestReadable(view(10, 70))).toBeGreaterThan(
      smallestReadable(view(10, 0)),
    );
    expect(smallestReadable({ ...view(10), screenPixels: 500 })).toBeCloseTo(
      smallestReadable(view(10)) * 2,
    );
  });

  it('loses detail only once past a step', () => {
    const near = signStep(0, 0.03);
    expect(signStep(near, 0.03)).toBe(near);
    expect(signStep(0, 10)).toBe(SIGN_CUTOFFS.length - 1);
  });
});
