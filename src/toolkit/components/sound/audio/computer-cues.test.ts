import { expect, it } from 'vite-plus/test';
import { COMPUTER_CUES, computerCueSound } from './computer-cues';

it('offers twelve short, individually labelled computer cues', () => {
  expect(COMPUTER_CUES).toHaveLength(12);
  expect(new Set(COMPUTER_CUES.map((cue) => cue.id)).size).toBe(12);
  for (const cue of COMPUTER_CUES) {
    expect(cue.name.length).toBeGreaterThan(0);
    expect(cue.caption.length).toBeGreaterThan(0);
    expect(cue.notes.length).toBeGreaterThan(0);
    expect(
      Math.max(...cue.notes.map((note) => note.at + note.seconds)),
    ).toBeLessThan(0.3);
    expect(cue.notes.every((note) => note.level > 0 && note.level < 0.05)).toBe(
      true,
    );
    expect(computerCueSound(cue)).toEqual({ tones: cue.notes });
  }
});
