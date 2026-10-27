import { CHATTER_SOUNDS, createPicker } from './console-sounds';
import type { UsedSound } from './console-sounds';

/**
 * The bridge's consoles chattering to themselves (the owner, 2026-10-27):
 * now and then a station round the room bleeps or bloops, unbidden, as a
 * starship's consoles do in the background. The gaps between chirps are
 * drawn from a normal distribution, mean 25 s, standard deviation 10 s,
 * never shorter than `MIN_GAP`; each chirp is one of the owner's console
 * sounds, resynthesised (`console-sounds.ts`, `CHATTER_SOUNDS`), at
 * random, never the same twice running (2026-10-27; before, a short run
 * of tones made up afresh, `makeChirp`, kept for any console without
 * recordings). Pure: seeded, so tests can follow it.
 */

export const CHATTER = {
  /** Seconds between chirps: mean and standard deviation. */
  mean: 25,
  sd: 10,
  /** The shortest gap allowed, seconds. */
  minGap: 3,
  /** Each synthesised tone's level (`makeChirp`): soft, from across the room. */
  level: 0.035,
} as const;

/** A tone of a chirp: when (s from its start), pitch, length, waveform. */
export interface ChirpTone {
  at: number;
  hz: number;
  seconds: number;
  level: number;
  type: 'sine' | 'triangle' | 'square';
}

export type ChirpShape = 'blip' | 'pair' | 'trill' | 'rise' | 'fall' | 'warble';
export const CHIRP_SHAPES: readonly ChirpShape[] = [
  'blip',
  'pair',
  'trill',
  'rise',
  'fall',
  'warble',
];

/** A small seeded generator (mulberry32), 0 ≤ x < 1. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A gap before the next chirp, seconds: normal (Box–Muller), floored at `minGap`. */
export function nextGap(random: () => number, c = CHATTER): number {
  const u = Math.max(1e-9, random());
  const v = random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.max(c.minGap, c.mean + c.sd * z);
}

/** A chirp of the given shape (or a random one), its tones made up from `random`. */
export function makeChirp(
  random: () => number,
  shape: ChirpShape = CHIRP_SHAPES[Math.floor(random() * CHIRP_SHAPES.length)],
  level: number = CHATTER.level,
): { shape: ChirpShape; tones: ChirpTone[] } {
  // Pitches from a pentatonic-ish ladder, 660 to 2,640 Hz, so a chirp
  // sounds electronic but never sour.
  const ladder = [
    660, 784, 880, 1047, 1175, 1319, 1568, 1760, 2093, 2349, 2640,
  ];
  const pick = () => ladder[Math.floor(random() * ladder.length)];
  const type: ChirpTone['type'] = random() < 0.7 ? 'sine' : 'triangle';
  const tone = (at: number, hz: number, seconds: number): ChirpTone => ({
    at,
    hz,
    seconds,
    level,
    type,
  });
  const tones: ChirpTone[] = [];
  switch (shape) {
    case 'blip':
      tones.push(tone(0, pick(), 0.05 + random() * 0.05));
      break;
    case 'pair': {
      const a = pick();
      const b = pick();
      tones.push(tone(0, a, 0.05), tone(0.07, b, 0.06));
      break;
    }
    case 'trill': {
      const a = pick();
      const ratio = random() < 0.5 ? 1.25 : 1.5;
      // A third or a fifth up, or down where up would shriek.
      const b = a * ratio <= 2640 ? a * ratio : a / ratio;
      const n = 4 + Math.floor(random() * 5);
      for (let i = 0; i < n; i++)
        tones.push(tone(i * 0.035, i % 2 ? b : a, 0.03));
      break;
    }
    case 'rise':
    case 'fall': {
      const n = 3 + Math.floor(random() * 3);
      const start = Math.floor(random() * (ladder.length - n));
      for (let i = 0; i < n; i++) {
        const k = shape === 'rise' ? start + i : start + n - 1 - i;
        tones.push(tone(i * 0.05, ladder[k], 0.045));
      }
      break;
    }
    case 'warble': {
      const a = pick();
      const n = 6 + Math.floor(random() * 6);
      for (let i = 0; i < n; i++)
        tones.push(tone(i * 0.03, a * (i % 2 ? 1.06 : 1), 0.028));
      break;
    }
  }
  return { shape, tones };
}

/**
 * The chatter's clock: `step(dt)` gives the chirp due now, if one is (the
 * recording it plays), with the index of the console it comes from (of
 * `consoles`), and sets the next. Silent while `active` is false (the walker elsewhere); the
 * clock starts afresh, a gap ahead, when it becomes active.
 */
export function createChatter(consoles: number, random: () => number) {
  let wait = nextGap(random);
  let active = false;
  const pick = createPicker(random);
  return {
    setActive(on: boolean) {
      if (on && !active) wait = nextGap(random);
      active = on;
    },
    step(dt: number): { console: number; sound: UsedSound } | null {
      if (!active || consoles <= 0) return null;
      wait -= dt;
      if (wait > 0) return null;
      wait = nextGap(random);
      return {
        console: Math.floor(random() * consoles),
        sound: pick(CHATTER_SOUNDS),
      };
    },
  };
}
