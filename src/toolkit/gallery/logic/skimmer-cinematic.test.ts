import { describe, expect, it } from 'vite-plus/test';
import { LOOK_UP } from './skimmer-reveal';
import {
  CINEMATIC,
  LID_ASIDE,
  ORBIT_END,
  REVEAL_EYE,
  WHIP,
  backOut,
  cinematicFrame,
  lidPose,
  lookAt,
  pickAnother,
} from './skimmer-cinematic';

/** Standing 1.5 m south of the skimmer, looking at it. */
const START = { x: 0, y: 1.8, z: 1.5, yaw: 0, pitch: -0.9 };
const { suspense, reveal, replace } = CINEMATIC;

describe('dev53’s skimmer cinematic', () => {
  it('lifts the lid and raises the caustics at once', () => {
    const f = cinematicFrame(0.5, START);
    expect(f.phase).toBe('suspense');
    expect(f.lid).toBe(1);
    expect(f.rise).toBe(1);
    expect(f.glow).toBe(1);
    expect(cinematicFrame(0, START).rise).toBe(0);
  });

  it('starts the orbit from where the walker stands', () => {
    const eye = cinematicFrame(0, START).eye!;
    expect(eye.x).toBeCloseTo(0);
    expect(eye.y).toBeCloseTo(1.8);
    expect(eye.z).toBeCloseTo(1.5);
    expect(eye.yaw).toBeCloseTo(0);
    expect(eye.pitch).toBeCloseTo(-0.9);
  });

  it('orbits the skimmer, sinking, always looking at it', () => {
    const half = cinematicFrame(suspense / 2, START).eye!;
    // Half way round: on the far side.
    expect(half.z).toBeLessThan(0);
    expect(Math.abs(half.x)).toBeLessThan(0.01);
    const late = cinematicFrame(suspense - 0.01, START).eye!;
    expect(late.y).toBeCloseTo(ORBIT_END.height, 1);
    expect(Math.hypot(late.x, late.z)).toBeCloseTo(ORBIT_END.radius, 1);
    // Looking down at the mouth.
    const look = lookAt(late, { x: 0, y: 0.02, z: 0 });
    expect(late.yaw).toBeCloseTo(look.yaw);
    expect(late.pitch).toBeCloseTo(look.pitch);
    expect(late.pitch).toBeLessThan(0);
  });

  it('whips up from the orbit’s end, overshooting and correcting', () => {
    const was = cinematicFrame(suspense - 1e-6, START).eye!;
    const first = cinematicFrame(suspense, START).eye!;
    expect(first.pitch).toBeCloseTo(was.pitch, 3);
    expect(first.y).toBeCloseTo(was.y, 3);
    let most = -Infinity;
    for (let s = 0; s <= WHIP; s += WHIP / 50)
      most = Math.max(most, cinematicFrame(suspense + s, START).eye!.pitch);
    expect(most).toBeGreaterThan(LOOK_UP + 0.03);
    expect(most).toBeLessThan(LOOK_UP + 0.2);
    expect(cinematicFrame(suspense + WHIP, START).eye!.pitch).toBeCloseTo(
      LOOK_UP,
    );
  });

  it('shows the find where the whip comes to rest, the banner once it has', () => {
    const during = cinematicFrame(suspense + WHIP / 2, START);
    expect(during.banner).toBe(false);
    expect(during.rest).toEqual(cinematicFrame(suspense + 2, START).rest);
    expect(during.rest!.pitch).toBe(LOOK_UP);
    expect(cinematicFrame(suspense + WHIP + 0.01, START).banner).toBe(true);
    expect(cinematicFrame(1, START).rest).toBeNull();
  });

  it('eases out past the end and back', () => {
    expect(backOut(0)).toBeCloseTo(0);
    expect(backOut(1)).toBe(1);
    expect(backOut(0.7)).toBeGreaterThan(1);
  });

  it('looks diagonally up, the find shown with the banner', () => {
    const f = cinematicFrame(suspense + 1, START);
    expect(f.phase).toBe('reveal');
    expect(f.eye!.pitch).toBeCloseTo(LOOK_UP);
    expect(f.eye!.y).toBeCloseTo(REVEAL_EYE.height);
    expect(f.size).toBe(1);
    expect(f.banner).toBe(true);
    expect(cinematicFrame(suspense + 1.5, START).spin).toBeGreaterThan(f.spin);
  });

  it('puts the lid back, the caustics dying, the walker back where it stood', () => {
    const mid = cinematicFrame(suspense + reveal + replace / 2, START);
    expect(mid.phase).toBe('replace');
    expect(mid.eye).toBeNull();
    expect(mid.lid).toBeCloseTo(0.5);
    expect(mid.glow).toBeCloseTo(0.5);
    const done = cinematicFrame(suspense + reveal + replace + 0.01, START);
    expect(done.phase).toBe('done');
    expect(done.lid).toBe(0);
    expect(done.glow).toBe(0);
  });

  it('turns the eye as the walker’s does: 0 north, positive east', () => {
    const o = { x: 0, y: 0, z: 0 };
    expect(lookAt(o, { x: 0, y: 0, z: -1 }).yaw).toBeCloseTo(0);
    expect(lookAt(o, { x: 1, y: 0, z: 0 }).yaw).toBeCloseTo(Math.PI / 2);
    expect(lookAt(o, { x: 0, y: 1, z: -1 }).pitch).toBeCloseTo(Math.PI / 4);
  });

  it('lifts the lid up and over to lie beside the skimmer', () => {
    expect(lidPose(0)).toEqual({ x: 0, y: 0, tilt: -0 });
    expect(lidPose(0.5).y).toBeGreaterThan(0.2);
    const off = lidPose(1);
    expect(off.x).toBe(LID_ASIDE);
    expect(off.y).toBeCloseTo(0);
  });

  it('never picks the same find twice running', () => {
    for (let last = 0; last < 5; last++)
      for (const r of [0, 0.3, 0.6, 0.999])
        expect(pickAnother(5, last, () => r)).not.toBe(last);
    expect(pickAnother(5, -1, () => 0.999)).toBe(3);
    expect(pickAnother(1, 0, () => 0.5)).toBe(0);
  });
});
