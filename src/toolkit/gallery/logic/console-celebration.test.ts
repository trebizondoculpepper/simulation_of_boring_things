import { describe, expect, it } from 'vite-plus/test';
import {
  CELEBRATION_SECONDS,
  FRAME_RATE,
  celebrationFrame,
  celebrationKey,
  celebrationOn,
  fireworks,
  raindrops,
} from './console-celebration';

describe('the console celebration timeline', () => {
  it('plays for its length, then ends', () => {
    expect(celebrationFrame('won', 0)?.frame).toBe(0);
    expect(celebrationFrame('won', CELEBRATION_SECONDS.won - 0.01)).not.toBe(
      null,
    );
    expect(celebrationFrame('won', CELEBRATION_SECONDS.won)).toBe(null);
    expect(celebrationFrame('lost', CELEBRATION_SECONDS.lost)).toBe(null);
    expect(celebrationFrame('won', -1)).toBe(null);
  });

  it('steps at no more than 10 Hz', () => {
    expect(FRAME_RATE).toBeLessThanOrEqual(10);
    const keys = new Set<string>();
    for (let t = 0; t < CELEBRATION_SECONDS.won; t += 1 / 60)
      keys.add(celebrationKey(celebrationFrame('won', t)));
    expect(keys.size).toBeLessThanOrEqual(
      CELEBRATION_SECONDS.won * FRAME_RATE + 1,
    );
    expect(celebrationKey(celebrationFrame('won', 0.31))).toBe(
      celebrationKey(celebrationFrame('won', 0.39)),
    );
    expect(celebrationKey(null)).toBe('');
  });

  it('fades in and out at its ends, full in the middle', () => {
    expect(celebrationFrame('won', 0)?.alpha).toBe(0);
    expect(celebrationFrame('won', 3)?.alpha).toBe(1);
    expect(celebrationFrame('won', 5.9)?.alpha).toBeLessThan(0.5);
  });

  it('plays once a card being played is won or lost, not when shown from the start', () => {
    expect(celebrationOn('challenge', 'won')).toBe('won');
    expect(celebrationOn('challenge', 'failed')).toBe('lost');
    expect(celebrationOn('challenge', 'challenge')).toBe(null);
    expect(celebrationOn(null, 'won')).toBe(null);
    expect(celebrationOn('won', 'won')).toBe(null);
    expect(celebrationOn('failed', 'free')).toBe(null);
  });
});

describe('the fireworks and rain', () => {
  it('are the same for the same frame and differ by screen', () => {
    expect(fireworks(0, 1.2, 512, 384)).toEqual(fireworks(0, 1.2, 512, 384));
    expect(fireworks(0, 1.2, 512, 384)).not.toEqual(
      fireworks(1, 1.2, 512, 384),
    );
  });

  it('has sparks while it plays and a clear sky by the end', () => {
    expect(fireworks(1, 1, 512, 384).length).toBeGreaterThan(0);
    expect(fireworks(1, CELEBRATION_SECONDS.won - 0.05, 512, 384)).toEqual([]);
    for (const s of fireworks(2, 2, 512, 384)) {
      expect(s.alpha).toBeGreaterThanOrEqual(0);
      expect(s.alpha).toBeLessThanOrEqual(1);
    }
  });

  it("rains inside its cloud's column", () => {
    for (const d of raindrops(1.7, 100, 200, 50, 150)) {
      expect(d.x).toBeGreaterThan(90);
      expect(d.x).toBeLessThan(210);
      expect(d.y).toBeGreaterThanOrEqual(50);
      expect(d.y).toBeLessThan(150);
    }
  });
});
