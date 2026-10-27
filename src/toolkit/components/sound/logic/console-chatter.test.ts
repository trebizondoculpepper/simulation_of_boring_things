import { describe, expect, it } from 'vite-plus/test';
import {
  CHATTER,
  CHIRP_SHAPES,
  createChatter,
  makeChirp,
  nextGap,
  seeded,
} from './console-chatter';

describe('the bridge consoles’ chatter', () => {
  it('spaces its chirps about 25 s apart, give or take 10 s, never under its floor', () => {
    const random = seeded(7);
    const gaps = Array.from({ length: 20000 }, () => nextGap(random));
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const sd = Math.sqrt(
      gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / gaps.length,
    );
    expect(mean).toBeGreaterThan(24);
    expect(mean).toBeLessThan(26);
    expect(sd).toBeGreaterThan(9);
    expect(sd).toBeLessThan(10.5);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(CHATTER.minGap);
  });

  it('makes every shape of chirp short and soft, its pitches electronic', () => {
    const random = seeded(3);
    for (const shape of CHIRP_SHAPES)
      for (let i = 0; i < 50; i++) {
        const { tones } = makeChirp(random, shape);
        expect(tones.length).toBeGreaterThan(0);
        const end = Math.max(...tones.map((t) => t.at + t.seconds));
        expect(end).toBeLessThan(0.6);
        for (const t of tones) {
          expect(t.hz).toBeGreaterThanOrEqual(600);
          expect(t.hz).toBeLessThanOrEqual(2900);
          expect(t.level).toBeLessThanOrEqual(CHATTER.level);
        }
      }
  });

  it('chirps from a random console, only while active', () => {
    const chatter = createChatter(10, seeded(11));
    // Inactive: an hour passes in silence.
    for (let t = 0; t < 3600; t++) expect(chatter.step(1)).toBeNull();
    chatter.setActive(true);
    const heard: number[] = [];
    for (let t = 0; t < 3600; t += 0.5) {
      const c = chatter.step(0.5);
      if (c) heard.push(c.console);
    }
    // About 3600 / 25 chirps an hour, from several consoles.
    expect(heard.length).toBeGreaterThan(110);
    expect(heard.length).toBeLessThan(190);
    expect(new Set(heard).size).toBeGreaterThan(5);
    for (const i of heard) expect(i).toBeLessThan(10);
  });
});
