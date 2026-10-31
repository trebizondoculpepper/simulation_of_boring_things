import { describe, expect, it } from 'vite-plus/test';
import type { Mood } from '../../../../game/plant/aqualis-types';
import {
  BLEND_S,
  CYCLES,
  FRAME_HZ,
  aimAt,
  drAqualisPose,
  drAqualisState,
  isPlaying,
  poseAt,
  poseKey,
  setMood,
  shoulderIn,
} from './dr-aqualis';

const MOODS: Mood[] = ['idle', 'concerned', 'alarmed', 'pleased', 'pointing'];

/** How many times the key changes over `secs`, sampled at 60 Hz. */
function keyChanges(mood: Mood, secs: number) {
  const s = drAqualisState(mood, 0);
  let last = '';
  let n = 0;
  for (let i = 0; i <= secs * 60; i++) {
    const k = poseKey(poseAt(s, i / 60));
    if (k !== last) n++;
    last = k;
  }
  return n;
}

describe('Dr Aqualis', () => {
  it('changes his pose no more than ten times a second', () => {
    for (const mood of MOODS)
      expect(keyChanges(mood, 20)).toBeLessThanOrEqual(20 * FRAME_HZ + 1);
  });

  it('holds still between plays, so a display need not redraw', () => {
    for (const mood of MOODS) {
      const { play, every } = CYCLES[mood];
      const s = drAqualisState(mood, 0);
      const held = poseKey(poseAt(s, play + 0.05));
      for (let t = play + 0.05; t < every - 0.01; t += 0.07) {
        expect(isPlaying(s, t)).toBe(false);
        expect(poseKey(poseAt(s, t))).toBe(held);
      }
      // On average he redraws only a few times a second.
      expect(keyChanges(mood, 30) / 30).toBeLessThan(4);
    }
  });

  it('plays each mood at its start', () => {
    for (const mood of MOODS) {
      const s = drAqualisState(mood, 0);
      expect(isPlaying(s, 0.1)).toBe(true);
      const keys = new Set<string>();
      for (let t = 0; t < CYCLES[mood].play; t += 0.1)
        keys.add(poseKey(poseAt(s, t)));
      expect(keys.size).toBeGreaterThan(2);
    }
  });

  it('bobs when idle, and blinks once in a while', () => {
    const s = drAqualisState('idle', 0);
    const bobs = [];
    let blinked = false;
    for (let t = 0; t < 7; t += 0.1) {
      const p = poseAt(s, t);
      bobs.push(p.bob);
      if (p.eyeOpen < 0.2) blinked = true;
    }
    expect(Math.min(...bobs)).toBeLessThan(-0.01);
    expect(blinked).toBe(true);
  });

  it('frowns and taps his clipboard when concerned', () => {
    const s = drAqualisState('concerned', 0);
    const taps = new Set<number>();
    for (let t = 0; t < 1.6; t += 0.1) {
      const p = poseAt(s, t);
      expect(p.smile).toBeLessThan(0);
      expect(p.brow).toBeLessThan(0);
      taps.add(p.clipTap);
    }
    expect(taps.has(1)).toBe(true);
    expect(taps.has(0)).toBe(true);
  });

  it('widens his eyes and jumps when alarmed', () => {
    const s = drAqualisState('alarmed', 0);
    let top = 0;
    for (let t = 0; t < 1.2; t += 0.1) top = Math.max(top, poseAt(s, t).jump);
    expect(top).toBeGreaterThan(0.1);
    expect(poseAt(s, 2).eyeOpen).toBeGreaterThan(1.2);
    expect(poseAt(s, 2).mouth).toBe('o');
  });

  it('gives a thumbs up when pleased', () => {
    const p = poseAt(drAqualisState('pleased', 0), 3);
    expect(p.thumbsUp).toBe(true);
    expect(p.arms.right.hand).toBe('thumb');
    expect(p.smile).toBeGreaterThan(0.5);
  });

  it('points the way he is told, with the arm on that side', () => {
    const right = poseAt(drAqualisState('pointing', 0, { x: 1, y: 0 }), 3);
    expect(right.point).toEqual({ x: 1, y: 0 });
    expect(right.arms.right.hand).toBe('point');
    expect(right.clipboard).toBe('left');
    expect(right.arms.right.angle).toBeCloseTo(Math.PI / 2);
    const left = poseAt(drAqualisState('pointing', 0, { x: -1, y: 0 }), 3);
    expect(left.arms.left.hand).toBe('point');
    expect(left.clipboard).toBe('right');
  });

  it('aims at a target point from the shoulder nearer it', () => {
    const box = { x: 20, y: 120, w: 230, h: 300 };
    const target = { x: 520, y: 400 };
    const f = drAqualisPose('pointing', 3, null, { target, box });
    const want = aimAt(shoulderIn(box, 'right'), target);
    expect(f.pose.point!.x).toBeCloseTo(want.x);
    expect(f.pose.point!.y).toBeCloseTo(want.y);
    expect(Math.hypot(want.x, want.y)).toBeCloseTo(1);
  });

  it('blends from his old mood into the new', () => {
    let s = drAqualisState('alarmed', 0);
    s = setMood(s, 'pleased', 10);
    expect(isPlaying(s, 10.05)).toBe(true);
    const mid = poseAt(s, 10 + BLEND_S / 2);
    const old = poseAt(drAqualisState('alarmed', 0), 10);
    const next = poseAt(drAqualisState('pleased', 10), 10 + BLEND_S / 2);
    expect(mid.eyeOpen).toBeLessThan(old.eyeOpen);
    expect(mid.eyeOpen).toBeGreaterThanOrEqual(next.eyeOpen);
    expect(poseAt(s, 10 + BLEND_S + 0.1)).toEqual(
      poseAt(drAqualisState('pleased', 10), 10 + BLEND_S + 0.1),
    );
  });

  it('keeps his animation running through repeated frames, restarting only on a change', () => {
    let f = drAqualisPose('concerned', 0);
    f = drAqualisPose('concerned', 2, f);
    expect(f.state.since).toBe(0);
    f = drAqualisPose('alarmed', 3, f);
    expect(f.state.since).toBe(3);
    expect(f.state.previous?.mood).toBe('concerned');
    expect(f.key).toBe(poseKey(f.pose));
  });
});
