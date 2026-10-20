import { describe, expect, it } from 'vite-plus/test';
import { createDoorSoundPicker } from './door-sounds';

describe('large door sounds', () => {
  it('uses ten distinct recordings in every set and never repeats across sets', () => {
    // Exercises the boundary swap as well as ordinary shuffled sets.
    for (const random of [() => 0, () => 0.999, Math.random]) {
      const next = createDoorSoundPicker(random);
      let previous;
      for (let cycle = 0; cycle < 20; cycle++) {
        const files = new Set<string>();
        for (let i = 0; i < 10; i++) {
          const sound = next();
          expect(sound).not.toBe(previous);
          expect('recording' in sound).toBe(true);
          if ('recording' in sound) {
            files.add(sound.recording.href);
            expect(sound.level).toBe(0.025);
          }
          previous = sound;
        }
        expect(files.size).toBe(10);
      }
    }
  });
});
