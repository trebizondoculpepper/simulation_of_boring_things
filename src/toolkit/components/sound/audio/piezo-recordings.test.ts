import { describe, expect, it } from 'vite-plus/test';
import {
  piezoBeep,
  piezoFilesBundled,
  piezoLoop,
  piezoSounder,
} from './piezo-recordings';
import {
  PIEZO_LEVELS,
  PIEZO_MEANINGS,
  PIEZO_PITCHES,
  PIEZO_ROOMS,
  piezoFile,
} from '../logic/piezo-beeps';

describe('the piezo recordings', () => {
  it('carries every file the logic names, and only those', () => {
    const named = PIEZO_MEANINGS.flatMap((m) =>
      PIEZO_PITCHES.flatMap((p) => PIEZO_ROOMS.map((r) => piezoFile(m, p, r))),
    );
    expect(piezoFilesBundled().sort()).toEqual([...named].sort());
  });

  it('makes a one-shot recording of the chosen file at its level', () => {
    const recipe = piezoBeep('error', { pitch: 'low', room: 'small' });
    expect('recording' in recipe).toBe(true);
    if (!('recording' in recipe)) return;
    expect(recipe.recording.href).toContain('piezo_error_low_small');
    expect(recipe.level).toBe(PIEZO_LEVELS.error);
    // The same file's URL each time.
    const again = piezoBeep('error', { pitch: 'low', room: 'small' });
    if ('recording' in again) expect(again.recording).toBe(recipe.recording);
  });

  it('makes a loop recipe for a held cadence', () => {
    expect(typeof piezoLoop('alarm', { room: 'large' })).toBe('function');
  });

  it('gives a device one sounder, its key press the entry chirp', () => {
    const sounder = piezoSounder({ pitch: 'mid', room: 'small' });
    const recipe = sounder.beep('confirm');
    if ('recording' in recipe)
      expect(recipe.recording.href).toContain('piezo_confirm_mid_small');
    expect(typeof sounder.key).toBe('function');
  });
});
