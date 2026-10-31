import { describe, expect, it } from 'vite-plus/test';
import { turnCue, turnCueKey, turnSide } from './turn-cue';

const knob = (down: boolean, up: boolean) => ({
  canTurn: (d: -1 | 1) => (d < 0 ? down : up),
});

describe('the turn cue', () => {
  it('turns down left of the centre and up right of it, and up at it', () => {
    expect(turnSide(-0.1, 0)).toBe(-1);
    expect(turnSide(0.1, 0)).toBe(1);
    expect(turnSide(0.25, 0.25)).toBe(1);
  });

  it('shows nothing off a knob', () => {
    expect(turnCue(null, false)).toBeNull();
    expect(turnCueKey(null)).toBe('');
  });

  it('is green where the turn would move the knob, red where it would not', () => {
    const atBottom = knob(false, true);
    expect(turnCue({ knob: atBottom, point: 0.2, centre: 0 }, false)).toEqual({
      kind: 'pointer',
      direction: 1,
      possible: true,
    });
    expect(turnCue({ knob: atBottom, point: -0.2, centre: 0 }, false)).toEqual({
      kind: 'pointer',
      direction: -1,
      possible: false,
    });
  });

  it('gives a gamepad both directions, whatever the side', () => {
    expect(
      turnCue({ knob: knob(true, false), point: 5, centre: 0 }, true),
    ).toEqual({
      kind: 'pad',
      down: true,
      up: false,
    });
  });

  it('changes its key only when what it shows changes', () => {
    const a = turnCue({ knob: knob(true, true), point: 0.3, centre: 0 }, false);
    const b = turnCue({ knob: knob(true, true), point: 0.6, centre: 0 }, false);
    const c = turnCue(
      { knob: knob(true, false), point: 0.6, centre: 0 },
      false,
    );
    expect(turnCueKey(a)).toBe(turnCueKey(b));
    expect(turnCueKey(b)).not.toBe(turnCueKey(c));
  });
});
