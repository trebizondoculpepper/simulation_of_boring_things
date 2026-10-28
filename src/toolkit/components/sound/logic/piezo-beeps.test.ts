import { describe, expect, it } from 'vite-plus/test';
import {
  PIEZO_LEVELS,
  PIEZO_LOOPS,
  PIEZO_LOOP_CYCLES,
  PIEZO_MEANINGS,
  PIEZO_ONE_SHOTS,
  PIEZO_PITCHES,
  PIEZO_ROOMS,
  piezoChoice,
  piezoFile,
  piezoLoops,
} from './piezo-beeps';

interface ManifestFile {
  file: string;
  meaning: string;
  pitch: string;
  room: string;
  seconds: number;
  loops: boolean;
  loopSeconds: number | null;
  gainDb: number;
  loudness: number;
  peak: number;
  onsetMs: number;
}
interface Manifest {
  sampleRate: number;
  targetLoudness: number;
  peakLimit: number;
  files: ManifestFile[];
}

const RAW = import.meta.glob<string>(
  '../../../../../resources/sound/effects/piezo/manifest.json',
  { query: '?raw', import: 'default', eager: true },
);
const manifest = JSON.parse(Object.values(RAW)[0]) as Manifest;

const every = () =>
  PIEZO_MEANINGS.flatMap((meaning) =>
    PIEZO_PITCHES.flatMap((pitch) =>
      PIEZO_ROOMS.map((room) => ({ meaning, pitch, room })),
    ),
  );

describe('the piezo beep library', () => {
  it('names every combination of its axes once, by the scheme', () => {
    const names = every().map(({ meaning, pitch, room }) =>
      piezoFile(meaning, pitch, room),
    );
    expect(names).toHaveLength(13 * 3 * 3);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names)
      expect(name).toMatch(
        /^piezo_[a-z]+(-[a-z]+)?_(low|mid|high)_(dry|small|large)\.mp3$/,
      );
    expect(piezoFile('priority-high', 'mid', 'large')).toBe(
      'piezo_priority-high_mid_large.mp3',
    );
  });

  it('parts its meanings into one-shots and loops', () => {
    const shots = new Set<string>(PIEZO_ONE_SHOTS);
    for (const loop of PIEZO_LOOPS) expect(shots.has(loop)).toBe(false);
    expect(PIEZO_ONE_SHOTS.length + PIEZO_LOOPS.length).toBe(
      PIEZO_MEANINGS.length,
    );
    for (const meaning of PIEZO_ONE_SHOTS)
      expect(piezoLoops(meaning)).toBe(false);
    for (const meaning of PIEZO_LOOPS) expect(piezoLoops(meaning)).toBe(true);
  });

  it('plays every meaning at a level between 0 and 1, a key softer than an alarm', () => {
    for (const meaning of PIEZO_MEANINGS) {
      expect(PIEZO_LEVELS[meaning]).toBeGreaterThan(0);
      expect(PIEZO_LEVELS[meaning]).toBeLessThanOrEqual(1);
    }
    expect(PIEZO_LEVELS.entry).toBeLessThan(PIEZO_LEVELS.alarm);
  });

  it('defaults to the high pitch, dry, at its meaning’s level', () => {
    expect(piezoChoice('entry')).toEqual({
      file: 'piezo_entry_high_dry.mp3',
      level: PIEZO_LEVELS.entry,
    });
    expect(
      piezoChoice('alarm', { pitch: 'low', room: 'large', level: 3 }),
    ).toEqual({ file: 'piezo_alarm_low_large.mp3', level: 1 });
  });
});

describe('the generated files (manifest.json)', () => {
  const byName = new Map(manifest.files.map((f) => [f.file, f]));

  it('holds every file the logic names, and nothing else', () => {
    const named = every().map(({ meaning, pitch, room }) =>
      piezoFile(meaning, pitch, room),
    );
    expect([...byName.keys()].sort()).toEqual([...named].sort());
    for (const { meaning, pitch, room } of every()) {
      const f = byName.get(piezoFile(meaning, pitch, room))!;
      expect([f.meaning, f.pitch, f.room]).toEqual([meaning, pitch, room]);
      expect(f.loops).toBe(piezoLoops(meaning));
    }
  });

  it('brings every dry file to one loudness, to 0.5 dB', () => {
    for (const f of manifest.files.filter((f) => f.room === 'dry'))
      expect(Math.abs(f.loudness - manifest.targetLoudness)).toBeLessThan(0.5);
  });

  it('keeps each room’s direct part as loud as its dry file', () => {
    for (const f of manifest.files.filter((f) => f.room !== 'dry')) {
      const dry = byName.get(
        piezoFile(f.meaning as never, f.pitch as never, 'dry'),
      )!;
      expect(f.gainDb).toBe(dry.gainDb);
      expect(Math.abs(f.loudness - dry.loudness)).toBeLessThan(0.5);
    }
  });

  it('peaks every file at −1 dBFS or under, and starts it at once', () => {
    for (const f of manifest.files) {
      expect(f.peak).toBeLessThanOrEqual(manifest.peakLimit);
      // `ready` keeps 50 ms of silence before its beep, by design.
      const expected = f.meaning === 'ready' ? 50 : 0;
      expect(Math.abs(f.onsetMs - expected)).toBeLessThanOrEqual(2);
    }
  });

  it('makes each loop exactly whole cycles long', () => {
    for (const f of manifest.files.filter((f) => f.loops)) {
      const cycle =
        PIEZO_LOOP_CYCLES[f.meaning as keyof typeof PIEZO_LOOP_CYCLES];
      expect(f.loopSeconds).toBe(cycle);
      const cycles = f.seconds / cycle;
      expect(Math.abs(cycles - Math.round(cycles))).toBeLessThan(1e-6);
      expect(Math.round(cycles)).toBeGreaterThanOrEqual(1);
    }
  });
});
