import { describe, expect, it } from 'vite-plus/test';
import {
  PLAIN_USE,
  cueGoes,
  cuePlace,
  knobAnswer,
  turnSide,
  useCue,
  useCueKey,
} from './use-cue';

const knob = (down: boolean, up: boolean) => ({
  canTurn: (d: -1 | 1) => (d < 0 ? down : up),
});

describe('the turn cue', () => {
  it('turns down left of the centre and up right of it, and up at it', () => {
    expect(turnSide(-0.1, 0)).toBe(-1);
    expect(turnSide(0.1, 0)).toBe(1);
    expect(turnSide(0.25, 0.25)).toBe(1);
  });

  it('shows nothing off a usable thing', () => {
    expect(useCue(null, false)).toBeNull();
    expect(useCueKey(null)).toBe('');
  });

  it('is green where the turn would move the knob, red where it would not', () => {
    const atBottom = knob(false, true);
    expect(useCue(knobAnswer(atBottom, 0.2, 0), false)).toEqual({
      kind: 'one',
      gesture: 'turn',
      direction: 1,
      possible: true,
      button: '',
    });
    expect(useCue(knobAnswer(atBottom, -0.2, 0), false)).toMatchObject({
      direction: -1,
      possible: false,
    });
  });

  it('gives a gamepad both directions, whatever the side', () => {
    expect(useCue(knobAnswer(knob(true, false), 5, 0), true)).toEqual({
      kind: 'both',
      down: true,
      up: false,
    });
  });

  it('gives a turn by state one arrow, labelled A on a gamepad', () => {
    const byState = {
      gesture: 'turn',
      direction: -1,
      possible: true,
    } as const;
    expect(useCue(byState, true)).toEqual({
      kind: 'one',
      gesture: 'turn',
      direction: -1,
      possible: true,
      button: 'A',
    });
    expect(cuePlace(useCue(byState, true)!)).toBe('above');
  });
});

describe('the push, pull and plain cues', () => {
  it('shows a push or a pull up to the right of the ring', () => {
    const push = useCue({ gesture: 'push', possible: true }, false)!;
    const pull = useCue({ gesture: 'pull', possible: true }, false)!;
    expect(push).toMatchObject({ gesture: 'push', direction: 0, button: '' });
    expect(cuePlace(push)).toBe('upper-right');
    expect(cuePlace(pull)).toBe('upper-right');
  });

  it('labels a push or pull A on a gamepad, but never the plain ring', () => {
    expect(useCue({ gesture: 'pull', possible: true }, true)).toMatchObject({
      button: 'A',
    });
    expect(useCue(PLAIN_USE, true)).toMatchObject({ button: '' });
    expect(cuePlace(useCue(PLAIN_USE, true)!)).toBe('none');
  });

  it('is green where the use will do something, red where it will not', () => {
    expect(cueGoes(useCue({ gesture: 'push', possible: true }, false)!)).toBe(
      true,
    );
    expect(cueGoes(useCue({ gesture: 'push', possible: false }, false)!)).toBe(
      false,
    );
    expect(cueGoes(useCue(PLAIN_USE, false)!)).toBe(true);
    expect(cueGoes(useCue(knobAnswer(knob(false, false), 0, 0), true)!)).toBe(
      false,
    );
    expect(cueGoes(useCue(knobAnswer(knob(false, true), 0, 0), true)!)).toBe(
      true,
    );
  });
});

describe('the cue key', () => {
  it('changes only when what the cue shows changes', () => {
    const a = useCue(knobAnswer(knob(true, true), 0.3, 0), false);
    const b = useCue(knobAnswer(knob(true, true), 0.6, 0), false);
    const c = useCue(knobAnswer(knob(true, false), 0.6, 0), false);
    expect(useCueKey(a)).toBe(useCueKey(b));
    expect(useCueKey(b)).not.toBe(useCueKey(c));
  });

  it('tells each gesture, its possibility and its button apart', () => {
    const keys = [
      useCue({ gesture: 'push', possible: true }, false),
      useCue({ gesture: 'push', possible: false }, false),
      useCue({ gesture: 'push', possible: true }, true),
      useCue({ gesture: 'pull', possible: true }, false),
      useCue(PLAIN_USE, false),
      useCue({ gesture: 'use', possible: false }, false),
      useCue(knobAnswer(knob(true, true), 1, 0), false),
      useCue(knobAnswer(knob(true, true), -1, 0), false),
      useCue(knobAnswer(knob(true, true), 1, 0), true),
    ].map(useCueKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
