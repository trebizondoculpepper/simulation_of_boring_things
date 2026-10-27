import { describe, expect, it } from 'vite-plus/test';
import {
  BRIDGE_AMBIENCE,
  BRIDGE_AMBIENCE_IDS,
  CHIRP_KINDS,
  CHIRP_PITCHES,
  DRONE_PARTIALS,
  PEAK_CEILING,
  SWELL_HZ,
  DOOR_LEAK,
  ambienceGain,
  createAmbienceGate,
  chirpLength,
  doorShare,
  reportedPresence,
  createChirpField,
  peakBudget,
  seededRandom,
} from './bridge-ambience';
import type { Chirp } from './bridge-ambience';

const take = (
  id: keyof typeof BRIDGE_AMBIENCE,
  seed: number,
  count: number,
) => {
  const field = createChirpField(BRIDGE_AMBIENCE[id], seed);
  return Array.from({ length: count }, () => field.next());
};

describe('the bridge’s ambience', () => {
  it('a seed gives the same chirps every time, another seed others', () => {
    expect(take('standard', 7, 40)).toEqual(take('standard', 7, 40));
    expect(take('standard', 7, 40)).not.toEqual(take('standard', 8, 40));
  });

  it('the generator stays between 0 and 1', () => {
    const random = seededRandom(123);
    for (let i = 0; i < 10000; i++) {
      const r = random();
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(1);
    }
  });

  for (const id of BRIDGE_AMBIENCE_IDS) {
    const variant = BRIDGE_AMBIENCE[id];
    describe(`${id}`, () => {
      const chirps = take(id, 2026, 2000);

      it('chirps never overlap, and keep the least gap', () => {
        for (let i = 1; i < chirps.length; i++) {
          const end = chirps[i - 1].at + chirpLength(chirps[i - 1]);
          expect(chirps[i].at - end).toBeGreaterThanOrEqual(
            variant.chirps.minGap - 1e-9,
          );
        }
      });

      it('come at about the variant’s rate, never long silent', () => {
        const span = chirps.at(-1)!.at - chirps[0].at;
        const perMinute = ((chirps.length - 1) / span) * 60;
        expect(perMinute).toBeGreaterThan(variant.chirps.perMinute * 0.75);
        expect(perMinute).toBeLessThan(variant.chirps.perMinute * 1.25);
        const mean = 60 / variant.chirps.perMinute;
        for (let i = 1; i < chirps.length; i++)
          expect(chirps[i].at - chirps[i - 1].at).toBeLessThanOrEqual(
            4 * mean + 1,
          );
      });

      it('at irregular times: the gaps spread widely, never a beat', () => {
        const gaps = chirps.slice(1).map((c, i) => c.at - chirps[i].at);
        const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        const sd = Math.sqrt(
          gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / gaps.length,
        );
        expect(sd / mean).toBeGreaterThan(0.3);
        // No run of ten gaps comes round again.
        const runs = new Set<string>();
        for (let i = 0; i + 10 <= gaps.length; i++) {
          const key = gaps
            .slice(i, i + 10)
            .map((g) => g.toFixed(4))
            .join();
          expect(runs.has(key)).toBe(false);
          runs.add(key);
        }
      });

      it('every kind it weights is heard, in the chirps’ band, never above its level', () => {
        const seen = new Set(chirps.map((c) => c.kind));
        for (const k of CHIRP_KINDS)
          if (variant.chirps.kinds[k] > 0) expect(seen.has(k)).toBe(true);
        const lo = Math.min(...CHIRP_PITCHES) * 0.6;
        const hi = Math.max(...CHIRP_PITCHES) * 1.7;
        for (const chirp of chirps as Chirp[]) {
          expect(Math.abs(chirp.pan)).toBeLessThanOrEqual(variant.width);
          expect(chirpLength(chirp)).toBeLessThan(0.8);
          for (const n of chirp.notes) {
            for (const hz of [n.hz, n.toHz ?? n.hz]) {
              expect(hz).toBeGreaterThan(lo);
              expect(hz).toBeLessThan(hi);
            }
            expect(n.level).toBeGreaterThan(0);
            expect(n.level).toBeLessThanOrEqual(variant.chirps.level);
          }
        }
      });

      it('stays under its ceiling at full gain, whatever meets in phase', () => {
        expect(peakBudget(variant)).toBeLessThan(PEAK_CEILING);
      });
    });
  }

  it('the variants get busier in order', () => {
    const { quiet, standard, busy } = BRIDGE_AMBIENCE;
    expect(quiet.chirps.perMinute).toBeLessThan(standard.chirps.perMinute);
    expect(standard.chirps.perMinute).toBeLessThan(busy.chirps.perMinute);
  });

  it('the drone’s shares make one, and its beats are slow and all different', () => {
    expect(DRONE_PARTIALS.reduce((a, p) => a + p.share, 0)).toBeCloseTo(1, 6);
    const beats = new Set<string>();
    for (let i = 0; i < DRONE_PARTIALS.length; i++)
      for (let j = i + 1; j < DRONE_PARTIALS.length; j++) {
        const ratio = DRONE_PARTIALS[j].hz / DRONE_PARTIALS[i].hz;
        const near = Math.round(ratio);
        if (near < 1) continue;
        // Near a harmonic: the beat against it, Hz.
        const beat = Math.abs(
          DRONE_PARTIALS[j].hz - near * DRONE_PARTIALS[i].hz,
        );
        if (beat < 2) {
          expect(beat).toBeGreaterThan(0.05);
          beats.add(beat.toFixed(3));
        }
      }
    expect(beats.size).toBeGreaterThan(2);
  });

  it('the swells are slow, none a simple multiple of another', () => {
    const rates = Object.values(SWELL_HZ);
    for (const r of rates) expect(r).toBeLessThan(0.1);
    for (let i = 0; i < rates.length; i++)
      for (let j = 0; j < rates.length; j++) {
        if (i === j) continue;
        const ratio = rates[j] / rates[i];
        for (const simple of [1, 2, 3, 0.5, 1.5, 2 / 3, 1 / 3])
          expect(Math.abs(ratio - simple)).toBeGreaterThan(0.02);
      }
  });
});

describe('the bridge’s ambience is heard only where the walker is', () => {
  it('in the bridge, its full level', () => {
    expect(ambienceGain({ inside: true })).toBe(1);
  });
  it('in the corridor with the doors shut, or the bridge only built, silent', () => {
    expect(ambienceGain({ inside: false })).toBe(0);
    expect(ambienceGain({ inside: false, doorOpen: 0 })).toBe(0);
  });
  it('a room that only follows another’s eye never sounds', () => {
    expect(ambienceGain({ inside: true, following: true })).toBe(0);
    expect(ambienceGain({ inside: false, following: true, doorOpen: 1 })).toBe(
      0,
    );
  });
  it('through the open doors, quietly, fading as they shut', () => {
    expect(ambienceGain({ inside: false, doorOpen: 1 })).toBe(DOOR_LEAK);
    expect(ambienceGain({ inside: false, doorOpen: 0.5 })).toBeCloseTo(
      DOOR_LEAK / 2,
    );
    expect(DOOR_LEAK).toBeLessThan(0.25);
  });
});

describe('the ambience’s gate starts it on entering and stops it on leaving', () => {
  it('built but not entered: never starts', () => {
    const gate = createAmbienceGate();
    for (let i = 0; i < 5; i++)
      expect(gate.update({ inside: false }).action).toBe(null);
    expect(gate.playing).toBe(false);
  });
  it('drawn past the corridor’s doorway, following the corridor’s eye: never starts', () => {
    const gate = createAmbienceGate();
    expect(
      gate.update({ inside: false, following: true, doorOpen: 1 }).action,
    ).toBe(null);
    expect(gate.playing).toBe(false);
  });
  it('entering starts it once, leaving with the doors shut stops it once', () => {
    const gate = createAmbienceGate();
    expect(gate.update({ inside: true })).toEqual({
      action: 'start',
      level: 1,
    });
    expect(gate.update({ inside: true }).action).toBe(null);
    // Stepping out, the doors still open: quiet, still playing.
    const out = gate.update({ inside: false, doorOpen: 1 });
    expect(out.action).toBe(null);
    expect(out.level).toBe(DOOR_LEAK);
    // The doors shut behind: stopped.
    expect(gate.update({ inside: false, doorOpen: 0 })).toEqual({
      action: 'stop',
      level: 0,
    });
    expect(gate.update({ inside: false, doorOpen: 0 }).action).toBe(null);
    expect(gate.playing).toBe(false);
  });
});

describe('the room tone wherever the walker hears it (the owner, 2026-10-27)', () => {
  const gain = (bridge: boolean, corridorDoor: number | null) =>
    ambienceGain(reportedPresence({ bridge, corridorDoor }));

  it('is full whenever the walker is on the bridge, whatever the corridor says', () => {
    expect(gain(true, null)).toBe(1);
    expect(gain(true, 0)).toBe(1);
    expect(gain(true, 1)).toBe(1);
  });

  it('is heard from the corridor only through doors that lead to the bridge, as far as they are open', () => {
    expect(gain(false, null)).toBe(0);
    expect(gain(false, 0)).toBe(0);
    expect(gain(false, 1)).toBeCloseTo(DOOR_LEAK);
    expect(gain(false, 0.5)).toBeCloseTo(DOOR_LEAK / 2);
  });

  it('measures the doors open by their swing, fully at a right angle', () => {
    expect(doorShare(0)).toBe(0);
    expect(doorShare(Math.PI / 4)).toBeCloseTo(0.5);
    expect(doorShare(-Math.PI / 2)).toBe(1);
    expect(doorShare(3)).toBe(1);
  });

  it('starts once from the corridor, rises on entering without starting again, and stops as the doors shut behind', () => {
    const gate = createAmbienceGate();
    const at = (bridge: boolean, door: number | null) =>
      gate.update(reportedPresence({ bridge, corridorDoor: door }));
    expect(at(false, 0).action).toBe(null);
    expect(at(false, 0.3).action).toBe('start');
    expect(at(true, null)).toEqual({ action: null, level: 1 });
    expect(at(false, 1).action).toBe(null);
    expect(at(false, 0)).toEqual({ action: 'stop', level: 0 });
  });
});
