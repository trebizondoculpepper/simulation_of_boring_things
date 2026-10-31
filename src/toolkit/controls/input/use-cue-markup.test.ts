import { describe, expect, it } from 'vite-plus/test';
import { useCue, useCueKey } from '../logic/use-cue';
import type { UseAnswer } from '../logic/use-cue';
import { CUE_GO, CUE_STOP, useCueMarkup } from './use-cue-markup';

const answers: UseAnswer[] = [
  { gesture: 'push', possible: true },
  { gesture: 'push', possible: false },
  { gesture: 'pull', possible: true },
  { gesture: 'pull', possible: false },
  { gesture: 'turn', direction: 1, possible: true },
  { gesture: 'turn', direction: -1, possible: false },
  {
    gesture: 'turn',
    direction: 1,
    possible: true,
    ways: { down: false, up: true },
  },
];

describe('the use cue drawings', () => {
  it('draws one svg per glyph, in green or red', () => {
    for (const answer of answers) {
      const markup = useCueMarkup(useCue(answer, false)!);
      expect(markup.match(/<svg /g)).toHaveLength(1);
      expect(markup).toContain(answer.possible ? CUE_GO : CUE_STOP);
    }
  });

  it('draws nothing for the plain ring', () => {
    const plain = useCue({ gesture: 'use', possible: true }, false)!;
    expect(useCueMarkup(plain)).toBe('');
  });

  it('draws push and pull differently, and labels a pad A', () => {
    const push = useCueMarkup(useCue(answers[0], false)!);
    const pull = useCueMarkup(useCue(answers[2], false)!);
    expect(push).not.toBe(pull);
    expect(useCueMarkup(useCue(answers[0], true)!)).toContain('>A</text>');
  });

  it('gives a knob on a pad LB and RB arrows', () => {
    const markup = useCueMarkup(useCue(answers[6], true)!);
    expect(markup.match(/<svg /g)).toHaveLength(2);
    expect(markup).toContain('>LB</text>');
    expect(markup).toContain('>RB</text>');
  });

  it('draws every carrying glyph in both sets, green and red, a pad labelled A', () => {
    const gestures = [
      'pick-up',
      'put-down',
      'put-back',
      'put-in',
      'fit',
    ] as const;
    const drawn = new Set<string>();
    for (const set of ['full', 'simple'] as const)
      for (const gesture of gestures)
        for (const possible of [true, false]) {
          const cue = useCue({ gesture, possible }, false, set)!;
          const markup = useCueMarkup(cue);
          expect(markup.match(/<svg /g)).toHaveLength(1);
          expect(markup).toContain(possible ? CUE_GO : CUE_STOP);
          expect(markup).not.toContain(possible ? CUE_STOP : CUE_GO);
          drawn.add(markup);
          expect(
            useCueMarkup(useCue({ gesture, possible }, true, set)!),
          ).toContain('>A</text>');
        }
    // Five full glyphs and the simple set's one down arrow, each two ways.
    expect(drawn.size).toBe(12);
  });

  it('draws the same exactly when the key is the same', () => {
    const cues = [false, true].flatMap((pad) =>
      answers.map((a) => useCue(a, pad)!),
    );
    for (const a of cues)
      for (const b of cues)
        if (useCueKey(a) === useCueKey(b))
          expect(useCueMarkup(a)).toBe(useCueMarkup(b));
        else expect(useCueMarkup(a)).not.toBe(useCueMarkup(b));
  });
});
