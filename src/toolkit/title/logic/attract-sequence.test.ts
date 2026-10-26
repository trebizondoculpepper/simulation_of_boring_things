import { attractScenario } from '../../../game/attract-scenarios';
import { describe, expect, it } from 'vite-plus/test';
import {
  ATTRACT_SHOTS,
  SWITCH_ROOM_FLYBY,
  SHOT_SECONDS,
  THEME_BEAT,
  inPoolRoom,
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
import { MAIN_CORRIDOR, inCorridor } from '../../gallery/logic/main-corridor';
import { PLANT_FLOOR, layoutRoom } from '../../gallery/logic/room-equipment';

const run = (s: AttractState, seconds: number, ready = true, dt = 0.05) => {
  for (let t = 0; t < seconds - 1e-9; t += dt)
    s = stepAttract(s, dt, ATTRACT_SHOTS, ready);
  return s;
};

describe('the title’s attract sequence', () => {
  it('has nine shots in eight rooms, for now, each a path, start to end, none a loop or an orbit', () => {
    expect(ATTRACT_SHOTS.every((s) => s.path?.open)).toBe(true);
    expect(ATTRACT_SHOTS).toHaveLength(9);
    expect(new Set(ATTRACT_SHOTS.map((s) => s.room)).size).toBe(8);
    expect(new Set(ATTRACT_SHOTS.map((s) => s.id)).size).toBe(9);
    expect(ATTRACT_SHOTS.every((s) => s.path)).toBe(true);
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
    for (const shot of ATTRACT_SHOTS.filter(
      (s) => !(s.room in POOL_HALLS) && layoutRoom(s.room),
    )) {
      const box = layoutRoom(shot.room)!.box;
      for (let t = 0; t <= shot.path!.period; t += 0.25) {
        const p = shotPose(shot, t);
        expect(Math.abs(p.x), shot.id).toBeLessThan(box.w / 2);
        expect(Math.abs(p.z), shot.id).toBeLessThan(box.d / 2);
        expect(p.y, shot.id).toBeGreaterThan(PLANT_FLOOR + 0.2);
      }
    }
  });

  it('keeps the corridor fly-by in the corridor, clear of its walls', () => {
    const shot = ATTRACT_SHOTS.find((s) => s.room === 'main_corridor')!;
    const margin = 0.15;
    for (let t = 0; t <= shot.path!.period; t += 0.1) {
      const p = shotPose(shot, t);
      for (const [dx, dz] of [
        [margin, 0],
        [-margin, 0],
        [0, margin],
        [0, -margin],
      ])
        expect(inCorridor(p.x + dx, p.z + dz), `${shot.id} at ${t}`).toBe(true);
      expect(p.y).toBeGreaterThan(0.2);
      expect(p.y).toBeLessThan(MAIN_CORRIDOR.height - 0.2);
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
    const coming = s.next;
    expect(s.phase).toBe('fade-in');
    s = run(s, FADE_SECONDS / 2);
    expect(attractBlack(s)).toBeGreaterThan(0.3);
    expect(attractBlack(s)).toBeLessThan(0.7);
    s = run(s, FADE_SECONDS);
    expect(s.phase).toBe('showing');
    expect(attractBlack(s)).toBe(0);
    // The next room not built yet: it holds black.
    s = run(s, SHOT_SECONDS + FADE_SECONDS + 0.1, false);
    expect(s.phase).toBe('black');
    expect(s.shot).toBe(coming);
  });

  it('runs its camera’s clock through the shot, from its fade-in to its fade-out', () => {
    const s = run(newAttract(), FADE_SECONDS + 5);
    expect(s.shotTime).toBeGreaterThan(FADE_SECONDS + 4.5);
  });

  it('shows each shot for eight beats of the theme, fades and all, from a point chosen at random round its move', () => {
    expect(ATTRACT_SHOTS.every((shot) => shot.seconds === SHOT_SECONDS)).toBe(
      true,
    );
    expect(SHOT_SECONDS + 2 * FADE_SECONDS).toBeCloseTo(8 * THEME_BEAT, 9);
    // Draws: the first shot, the one after it, where the first starts;
    // then (on to the next) the one after that, and where it starts.
    const draws = [0, 0, 0.25, 0, 0.5];
    const random = () => draws.shift() ?? 0;
    let s = newAttract(ATTRACT_SHOTS, random);
    // A path starts early enough to be seen, fades and all, before it ends.
    const span = (shot: (typeof ATTRACT_SHOTS)[number]) =>
      shot.path?.open
        ? shotPeriod(shot) - (shot.seconds + 2 * FADE_SECONDS)
        : shotPeriod(shot);
    const first = 0.25 * span(ATTRACT_SHOTS[s.shot]);
    expect(s.shotTime).toBeCloseTo(first, 9);
    // Its camera runs on from there, through its fade in and on.
    for (let k = 0; k < Math.round((FADE_SECONDS + 2) / 0.05); k++)
      s = stepAttract(s, 0.05, ATTRACT_SHOTS, true, random);
    expect(s.phase).toBe('showing');
    // (The step that leaves black starts its fade; the camera moves from the next.)
    expect(s.shotTime).toBeCloseTo(first + FADE_SECONDS + 2 - 0.05, 6);
    // On to the next, from its own random point.
    const coming = s.next;
    for (
      let k = 0;
      k < Math.round((SHOT_SECONDS - 2 + FADE_SECONDS + 0.2) / 0.05);
      k++
    )
      s = stepAttract(s, 0.05, ATTRACT_SHOTS, false, random);
    expect(s.shot).toBe(coming);
    expect(s.phase).toBe('black');
    expect(s.shotTime).toBeCloseTo(0.5 * span(ATTRACT_SHOTS[coming]), 9);
  });

  it('has three pool hall shots and six back room shots, so it can alternate', () => {
    const pools = ATTRACT_SHOTS.filter(inPoolRoom).length;
    expect(pools).toBe(3);
    expect(ATTRACT_SHOTS.length - pools).toBe(6);
  });

  it('plays its shots in a random order, a pool hall’s and a back room’s by turns, never one room twice running nor a shot straight back', () => {
    // A seeded random, so the test is the same every run.
    let seed = 7;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    let s = newAttract(ATTRACT_SHOTS, random);
    const seen: number[] = [];
    for (let i = 0; i < 120; i++) {
      seen.push(s.shot);
      // What is fetched while it shows is what comes next.
      const coming = nextShot(s);
      const now = s.shot;
      while (s.shot === now)
        s = stepAttract(s, 0.05, ATTRACT_SHOTS, true, random);
      expect(s.shot).toBe(coming);
    }
    for (let i = 1; i < seen.length; i++) {
      const [a, b] = [ATTRACT_SHOTS[seen[i - 1]], ATTRACT_SHOTS[seen[i]]];
      expect(inPoolRoom(a), `${a.id} then ${b.id}`).not.toBe(inPoolRoom(b));
      expect(b.room).not.toBe(a.room);
      if (i > 1) expect(seen[i]).not.toBe(seen[i - 2]);
    }
    // Every shot comes round, and not in one fixed order.
    expect(new Set(seen).size).toBe(ATTRACT_SHOTS.length);
    const pairs = new Set(seen.slice(1).map((b, i) => `${seen[i]}>${b}`));
    expect(pairs.size).toBeGreaterThan(ATTRACT_SHOTS.length);
  });

  it('starts an open path early enough that it is seen to the end, never past it', () => {
    const index = ATTRACT_SHOTS.findIndex((s) => s.path?.open);
    const shot = ATTRACT_SHOTS[index];
    const shown = shot.seconds + 2 * FADE_SECONDS;
    expect(shot.path!.period).toBeGreaterThan(shown);
    const shots = [shot];
    const late = newAttract(shots, () => 0.999999);
    expect(late.shotTime + shown).toBeLessThanOrEqual(shot.path!.period);
  });
});

it('stages the eight switch-room views with the lighting circuit off and the camera torch off', () => {
  const shot = ATTRACT_SHOTS.find(
    (s) => s.id === 'switch-room-lights-out-flyby',
  )!;
  expect(shot.room).toBe('switch_room');
  expect(shot.scenario).toBe('lights-out');
  expect(shot.torch).toBe(false);
  const dark = attractScenario(shot.scenario);
  expect(dark.lighting.supply).toBe(false);
  expect(dark.plant.sources.power).toBe(true);
  expect(attractScenario('normal').lighting.supply).toBe(true);
  expect(SWITCH_ROOM_FLYBY.keys).toHaveLength(8);
  expect(shot.path?.open).toBe(true);
  const first = shotPose(shot, 0);
  expect(first.x).toBeCloseTo(0.13);
  expect(first.z).toBeCloseTo(-0.25);
  const last = shotPose(shot, shotPeriod(shot));
  expect(last.x).toBeCloseTo(-0.32);
  expect(last.y).toBeCloseTo(1.81);
  expect(last.z).toBeCloseTo(0);
  expect(Math.atan2(Math.sin(last.yaw), Math.cos(last.yaw))).toBeCloseTo(
    (145.7 * Math.PI) / 180,
  );
  expect(last.pitch).toBeCloseTo((50.7 * Math.PI) / 180);
  expect(last.zoom).toBeCloseTo(0.745);
});
