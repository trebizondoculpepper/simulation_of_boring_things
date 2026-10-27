/**
 * The bridge's room tone (mission 095; the owner, 2026-10-27: "find the
 * Star Trek bridge noise and see if we can resynthesize something that
 * sounds similar"). Our own synthesis, in the spirit of a starship
 * bridge's background, sampling nothing: a low engine drone, beating
 * slowly; the broad rumble and body of a big ship's air (the show's hum is
 * said to be a processed recording of an airliner in flight); a soft hiss
 * of ventilation; and, over them, sparse quiet computer chirps: blips,
 * pairs, trills, glides and console warbles, at irregular times.
 *
 * This module is the pure part: the variants' settings, the drone's
 * partials, and the chirp field, a seeded stream of chirps whose timing
 * and pitches are random but repeatable. The sound itself is built from
 * these in `audio/bridge-ambience.ts`.
 */

export type ChirpKind = 'blip' | 'pair' | 'trill' | 'glide' | 'warble';
export const CHIRP_KINDS: readonly ChirpKind[] = [
  'blip',
  'pair',
  'trill',
  'glide',
  'warble',
];

/** One note of a chirp: seconds after the chirp's start, a pitch (gliding to `toHz`), a length and a level. */
export interface ChirpNote {
  at: number;
  hz: number;
  toHz?: number;
  seconds: number;
  level: number;
}

/** One chirp: when (seconds after the field began), what, where in the stereo field (−1 to 1), on what wave. */
export interface Chirp {
  at: number;
  kind: ChirpKind;
  pan: number;
  wave: 'sine' | 'triangle' | 'square';
  notes: ChirpNote[];
}

export type BridgeAmbienceId = 'quiet' | 'standard' | 'busy';

/** A variant: each layer's level (peak amplitude at full gain) and the chirps' rate and mix. */
export interface BridgeAmbienceVariant {
  id: BridgeAmbienceId;
  name: string;
  caption: string;
  /** The drone's oscillators, all together. */
  drone: number;
  /** The low rumble: noise under about 120 Hz. */
  rumble: number;
  /** The ship's body: noise in a band about 250 Hz, the airliner's roar. */
  body: number;
  /** The ventilation's hiss, high and soft. */
  air: number;
  /** How far apart the layers' left and right are spread, 0 to 1. */
  width: number;
  chirps: {
    /** Mean chirps a minute. */
    perMinute: number;
    /** The least gap between one chirp's end and the next's start, seconds. */
    minGap: number;
    /** The loudest a chirp's note may be. */
    level: number;
    /** How often each kind comes, by weight. */
    kinds: Record<ChirpKind, number>;
  };
}

export const BRIDGE_AMBIENCE: Record<BridgeAmbienceId, BridgeAmbienceVariant> =
  {
    quiet: {
      id: 'quiet',
      name: 'QUIET',
      caption: 'The drone and the air, an occasional chirp',
      drone: 0.07,
      rumble: 0.06,
      body: 0.04,
      air: 0.008,
      width: 0.6,
      chirps: {
        perMinute: 5,
        minGap: 1.5,
        level: 0.012,
        kinds: { blip: 4, pair: 3, trill: 1, glide: 2, warble: 0.5 },
      },
    },
    standard: {
      id: 'standard',
      name: 'STANDARD',
      caption: 'The bridge on a normal watch',
      drone: 0.08,
      rumble: 0.07,
      body: 0.05,
      air: 0.011,
      width: 0.7,
      chirps: {
        perMinute: 14,
        minGap: 0.9,
        level: 0.016,
        kinds: { blip: 4, pair: 3, trill: 2, glide: 2, warble: 1 },
      },
    },
    busy: {
      id: 'busy',
      name: 'BUSY',
      caption: 'Every console talking: chirps, trills and warbles',
      drone: 0.085,
      rumble: 0.07,
      body: 0.052,
      air: 0.013,
      width: 0.8,
      chirps: {
        perMinute: 36,
        minGap: 0.35,
        level: 0.02,
        kinds: { blip: 3, pair: 3, trill: 3, glide: 2, warble: 2 },
      },
    },
  };

export const BRIDGE_AMBIENCE_IDS = Object.keys(
  BRIDGE_AMBIENCE,
) as BridgeAmbienceId[];

/**
 * The drone: Hz, share of the drone's level, wave, and pan (as a share of
 * the variant's width). Pairs a fraction of a hertz apart beat slowly
 * (55 and 55.23 Hz once every four seconds or so), and no two beats share
 * a period, so the drone never settles into a pattern.
 */
export const DRONE_PARTIALS: readonly {
  hz: number;
  share: number;
  wave: 'sine' | 'triangle';
  pan: number;
}[] = [
  { hz: 55, share: 0.3, wave: 'sine', pan: -0.5 },
  { hz: 55.23, share: 0.3, wave: 'sine', pan: 0.5 },
  { hz: 82.41, share: 0.12, wave: 'triangle', pan: -0.2 },
  { hz: 110.17, share: 0.16, wave: 'sine', pan: 0.3 },
  { hz: 164.9, share: 0.07, wave: 'sine', pan: -0.4 },
  { hz: 220.6, share: 0.05, wave: 'sine', pan: 0.4 },
];

/**
 * Slow swells, Hz: each layer's level and the rumble's filter drift at
 * one of these, none a simple multiple of another, so their pattern
 * comes round again only after hours.
 */
export const SWELL_HZ = {
  rumbleFilter: 0.0371,
  rumble: 0.0213,
  body: 0.0293,
  air: 0.0461,
  drone: 0.0137,
} as const;

/** How deep each swell is, as a share of its layer's level. */
export const SWELL_DEPTH = 0.25;

/** The pitches chirps are made of, Hz: a pentatonic run from A5 up, so any two together sound like one machine. */
export const CHIRP_PITCHES: readonly number[] = [
  880, 988, 1109, 1319, 1480, 1760, 1976, 2217, 2637, 2960,
];

/** A small, fast, seeded generator (mulberry32): the same seed, the same numbers. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** How long a chirp sounds, seconds, from its start to its last note's end. */
export const chirpLength = (chirp: Chirp) =>
  Math.max(...chirp.notes.map((n) => n.at + n.seconds));

/**
 * The chirp field: chirps one after another, each `next()` the following
 * one, timed from the field's start. Gaps are drawn from an exponential
 * (as a Geiger counter's clicks, so they are irregular and never a beat),
 * with the variant's mean, never shorter than its least gap and never
 * longer than four means, so the bridge is never long silent.
 */
export function createChirpField(
  variant: BridgeAmbienceVariant,
  seed: number,
): { next(): Chirp } {
  const random = seededRandom(seed);
  const { perMinute, minGap, level, kinds } = variant.chirps;
  const mean = 60 / perMinute;
  const total = CHIRP_KINDS.reduce((sum, k) => sum + kinds[k], 0);
  const pick = <T>(list: readonly T[]) =>
    list[Math.floor(random() * list.length) % list.length];
  const between = (lo: number, hi: number) => lo + (hi - lo) * random();
  const chooseKind = (): ChirpKind => {
    let r = random() * total;
    for (const k of CHIRP_KINDS) {
      r -= kinds[k];
      if (r < 0) return k;
    }
    return 'blip';
  };
  let clock = 0;
  let lastEnd = 0;
  const notes = (kind: ChirpKind, loud: number): ChirpNote[] => {
    switch (kind) {
      case 'blip':
        return [{ at: 0, hz: pick(CHIRP_PITCHES), seconds: 0.05, level: loud }];
      case 'pair': {
        const a = pick(CHIRP_PITCHES);
        const b = pick(CHIRP_PITCHES);
        return [
          { at: 0, hz: a, seconds: 0.045, level: loud },
          { at: 0.07, hz: b, seconds: 0.055, level: loud * 0.85 },
        ];
      }
      case 'trill': {
        const a = pick(CHIRP_PITCHES);
        const b = a * (random() < 0.5 ? 1.125 : 1.25);
        const count = 6 + Math.floor(random() * 7);
        const step = between(0.035, 0.05);
        return Array.from({ length: count }, (_, i) => ({
          at: i * step,
          hz: i % 2 ? b : a,
          seconds: step * 0.8,
          // Tailing off, as a console's chatter does.
          level: loud * (1 - (0.4 * i) / count),
        }));
      }
      case 'glide': {
        const from = pick(CHIRP_PITCHES);
        const up = random() < 0.6;
        return [
          {
            at: 0,
            hz: from,
            toHz: from * (up ? 1.6 : 0.62),
            seconds: between(0.12, 0.22),
            level: loud * 0.8,
          },
        ];
      }
      case 'warble': {
        const centre = pick(CHIRP_PITCHES.slice(0, 5));
        const count = 3 + Math.floor(random() * 3);
        return Array.from({ length: count }, (_, i) => ({
          at: i * 0.09,
          hz: centre * (i % 2 ? 1.06 : 0.94),
          toHz: centre * (i % 2 ? 0.94 : 1.06),
          seconds: 0.085,
          level: loud * 0.6,
        }));
      }
    }
  };
  return {
    next() {
      const gap = Math.min(
        4 * mean,
        Math.max(minGap, -Math.log(1 - random()) * mean),
      );
      clock = Math.max(clock + gap, lastEnd + minGap);
      const kind = chooseKind();
      const loud = level * between(0.45, 1);
      const chirp: Chirp = {
        at: clock,
        kind,
        pan: between(-1, 1) * variant.width,
        // Warbles on a square wave (softened when played), the rest pure.
        wave:
          kind === 'warble' ? 'square' : random() < 0.75 ? 'sine' : 'triangle',
        notes: notes(kind, loud),
      };
      lastEnd = clock + chirpLength(chirp);
      return chirp;
    },
  };
}

/** The share of a chirp's level the room's echo adds back at most (its feedback's sum). */
export const ECHO = { seconds: 0.19, feedback: 0.28, wet: 0.3 } as const;

/**
 * The loudest the ambience can be at full gain: every layer's peak
 * summed as though all met in phase at once, each swell at its top, and
 * the loudest chirp with all its echoes. Real peaks are far lower; this
 * is a ceiling, kept well under clipping.
 */
export function peakBudget(variant: BridgeAmbienceVariant): number {
  const swell = 1 + SWELL_DEPTH;
  const echo = 1 + (ECHO.wet * 1) / (1 - ECHO.feedback);
  // Filtered noise from a uniform ±1 source can overshoot a little: allow half again.
  const noisy = 1.5;
  return (
    variant.drone * swell +
    (variant.rumble + variant.body + variant.air) * swell * noisy +
    variant.chirps.level * echo
  );
}

/** The ceiling the ambience must keep under at full gain, leaving room for every other sound in the room. */
export const PEAK_CEILING = 0.4;

/** Where the walker is, as the bridge's ambience needs it. */
export interface AmbiencePresence {
  /** The walker is in the bridge itself (not the bridge merely built, prefetched, or drawn past a doorway). */
  inside: boolean;
  /** The room only follows another's eye (drawn beyond a doorway): it is not where the walker is. */
  following?: boolean;
  /** Next door with the bridge's doors (in the corridor outside them): how far they are open, 0 shut to 1. */
  doorOpen?: number;
}

/** The share of its level heard through the open doors from outside. */
export const DOOR_LEAK = 0.15;

/**
 * How loud the bridge's ambience is for where the walker is (the owner,
 * 2026-10-27: not heard in the corridor with the doors shut): its full
 * level only inside; outside, a little through the doors only while they
 * are open, nothing as they shut; nothing for a room that only follows
 * another's eye.
 */
export function ambienceGain(presence: AmbiencePresence): number {
  if (presence.following) return 0;
  if (presence.inside) return 1;
  const open = Math.min(1, Math.max(0, presence.doorOpen ?? 0));
  return DOOR_LEAK * open;
}

/**
 * The ambience's switch for a room to drive each frame: told where the
 * walker is, says whether to start or stop it and at what level, so it
 * starts on entering, stops on leaving, and never sounds anywhere else.
 */
export function createAmbienceGate() {
  let playing = false;
  return {
    update(presence: AmbiencePresence): {
      action: 'start' | 'stop' | null;
      level: number;
    } {
      const level = ambienceGain(presence);
      let action: 'start' | 'stop' | null = null;
      if (level > 0 && !playing) action = 'start';
      if (level === 0 && playing) action = 'stop';
      playing = level > 0;
      return { action, level };
    },
    get playing() {
      return playing;
    },
  };
}
