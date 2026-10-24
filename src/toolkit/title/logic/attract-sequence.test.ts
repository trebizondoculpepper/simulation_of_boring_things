import { describe, expect, it } from 'vite-plus/test';
import {
  ATTRACT_SHOTS,
  SHOT_SECONDS,
  shotPeriod,
  shotPose,
  FADE_SECONDS,
  attractBlack,
  newAttract,
  nextShot,
  stepAttract,
} from './attract-sequence';
import type { AttractState } from './attract-sequence';
import { POOL_HALLS } from '../../gallery/logic/pool-halls';
import { PLANT_FLOOR, layoutRoom } from '../../gallery/logic/room-equipment';

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

  it('keeps every shot’s camera inside its room, over its floor', () => {
    for (const shot of ATTRACT_SHOTS.filter((s) => s.room in POOL_HALLS)) {
      const hall = POOL_HALLS[shot.room as keyof typeof POOL_HALLS];
      const period = shot.path?.period ?? shot.orbit!.period;
      for (let t = 0; t <= period; t += 0.5) {
        const p = shotPose(shot, t);
        expect(Math.abs(p.x), shot.id).toBeLessThan(hall.w / 2 - 0.3);
        expect(Math.abs(p.z), shot.id).toBeLessThan(hall.d / 2 - 0.3);
        // An orbit high over the hall; a fly-by low, but above its deck.
        expect(p.y, shot.id).toBeGreaterThan(shot.path ? 0.2 : 1);
      }
    }
    // A plant room's fly-by flies close to its plant on purpose: only
    // inside its walls and over its floor.
    for (const shot of ATTRACT_SHOTS.filter((s) => !(s.room in POOL_HALLS))) {
      const box = layoutRoom(shot.room)!.box;
      for (let t = 0; t <= shot.path!.period; t += 0.25) {
        const p = shotPose(shot, t);
        expect(Math.abs(p.x), shot.id).toBeLessThan(box.w / 2);
        expect(Math.abs(p.z), shot.id).toBeLessThan(box.d / 2);
        expect(p.y, shot.id).toBeGreaterThan(PLANT_FLOOR + 0.2);
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

  it('shows each shot for 25 s, from a point chosen at random round its move', () => {
    expect(ATTRACT_SHOTS.every((shot) => shot.seconds === SHOT_SECONDS)).toBe(
      true,
    );
    expect(SHOT_SECONDS).toBe(25);
    const draws = [0.25, 0.5];
    const random = () => draws.shift() ?? 0;
    let s = newAttract(ATTRACT_SHOTS, random);
    const first = 0.25 * shotPeriod(ATTRACT_SHOTS[0]);
    expect(s.shotTime).toBeCloseTo(first, 9);
    // Its camera runs on from there, through its fade in and its 25 s.
    for (let t = 0; t < FADE_SECONDS + 10; t += 0.05)
      s = stepAttract(s, 0.05, ATTRACT_SHOTS, true, random);
    expect(s.phase).toBe('showing');
    expect(s.shotTime).toBeCloseTo(first + FADE_SECONDS + 10, 1);
    // On to the next, from its own random point.
    for (let t = 0; t < SHOT_SECONDS - 10 + FADE_SECONDS + 0.2; t += 0.05)
      s = stepAttract(s, 0.05, ATTRACT_SHOTS, false, random);
    expect(s.shot).toBe(1);
    expect(s.phase).toBe('black');
    expect(s.shotTime).toBeCloseTo(0.5 * shotPeriod(ATTRACT_SHOTS[1]), 9);
  });

  it('goes round: after the last shot, the first', () => {
    let s = newAttract();
    const seen: number[] = [];
    for (let i = 0; i < ATTRACT_SHOTS.length + 1; i++) {
      s = run(s, 0.1);
      seen.push(s.shot);
      s = run(s, ATTRACT_SHOTS[s.shot].seconds + FADE_SECONDS * 2 + 0.2);
    }
    expect(seen).toEqual([...ATTRACT_SHOTS.keys(), 0]);
    expect(
      nextShot({ ...s, shot: ATTRACT_SHOTS.length - 1 }, ATTRACT_SHOTS),
    ).toBe(0);
  });
});
