import { describe, expect, it } from 'vite-plus/test';
import {
  ATTRACT_SHOTS,
  FADE_SECONDS,
  attractBlack,
  newAttract,
  nextShot,
  stepAttract,
} from './attract-sequence';
import type { AttractState } from './attract-sequence';
import { orbitPose } from './title-orbit';
import { POOL_HALLS } from '../../gallery/logic/pool-halls';

const run = (s: AttractState, seconds: number, ready = true, dt = 0.05) => {
  for (let t = 0; t < seconds - 1e-9; t += dt)
    s = stepAttract(s, dt, ATTRACT_SHOTS, ready);
  return s;
};

describe('the title’s attract sequence', () => {
  it('has three shots in three different rooms, for now', () => {
    expect(ATTRACT_SHOTS).toHaveLength(3);
    expect(new Set(ATTRACT_SHOTS.map((s) => s.room)).size).toBe(3);
    expect(new Set(ATTRACT_SHOTS.map((s) => s.id)).size).toBe(3);
  });

  it('keeps every shot’s camera inside its hall, over its floor', () => {
    for (const shot of ATTRACT_SHOTS) {
      const hall = POOL_HALLS[shot.room as keyof typeof POOL_HALLS];
      for (let t = 0; t <= shot.orbit.period; t += 0.5) {
        const p = orbitPose(shot.orbit, t);
        expect(Math.abs(p.x), shot.id).toBeLessThan(hall.w / 2 - 0.3);
        expect(Math.abs(p.z), shot.id).toBeLessThan(hall.d / 2 - 0.3);
        expect(p.y, shot.id).toBeGreaterThan(1);
      }
    }
  });

  it('starts black, and holds black until its first shot is built', () => {
    let s = newAttract();
    expect(attractBlack(s)).toBe(1);
    s = run(s, 10, false);
    expect(s.phase).toBe('black');
    expect(attractBlack(s)).toBe(1);
  });

  it('fades in, shows, fades out to black and moves on to the next shot', () => {
    let s = run(newAttract(), 0.05);
    expect(s.phase).toBe('fade-in');
    s = run(s, FADE_SECONDS / 2);
    expect(attractBlack(s)).toBeGreaterThan(0.3);
    expect(attractBlack(s)).toBeLessThan(0.7);
    s = run(s, FADE_SECONDS);
    expect(s.phase).toBe('showing');
    expect(attractBlack(s)).toBe(0);
    // The next room not built yet: it holds black.
    s = run(s, ATTRACT_SHOTS[0].seconds + FADE_SECONDS + 0.1, false);
    expect(s.phase).toBe('black');
    expect(s.shot).toBe(1);
  });

  it('runs its camera’s clock through the shot, from its fade-in to its fade-out', () => {
    const s = run(newAttract(), FADE_SECONDS + 5);
    expect(s.shotTime).toBeGreaterThan(FADE_SECONDS + 4.5);
  });

  it('goes round: after the last shot, the first', () => {
    let s = newAttract();
    const seen: number[] = [];
    for (let i = 0; i < ATTRACT_SHOTS.length + 1; i++) {
      s = run(s, 0.1);
      seen.push(s.shot);
      s = run(s, ATTRACT_SHOTS[s.shot].seconds + FADE_SECONDS * 2 + 0.2);
    }
    expect(seen).toEqual([0, 1, 2, 0]);
    expect(nextShot({ ...s, shot: 2 }, ATTRACT_SHOTS)).toBe(0);
  });
});
