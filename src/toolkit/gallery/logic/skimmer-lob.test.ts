import { describe, expect, it } from 'vite-plus/test';
import jingleUrl from '../../../../resources/sound/music/item-reveal/reveal-suspense.mp3?inline';
import { REVEAL } from './skimmer-reveal';
import {
  CINEMATIC,
  REVEAL_RISE,
  WHIP,
  cinematicFrame,
} from './skimmer-cinematic';
import {
  CORKSCREW,
  LOB_ALIGN,
  LOB_SHORT,
  LOB_TARGET,
  LOB_TILT,
  corkscrewDive,
  corkscrewEye,
  directionAngles,
  lobEye,
  lobPath,
} from './skimmer-lob';

/** An MP3's length, seconds, from its frames' headers (MPEG-1 layer III). */
function mp3Seconds(dataUrl: string) {
  const text = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  const b = Uint8Array.from(text, (ch) => ch.charCodeAt(0));
  const latin = (from: number, to: number) => text.slice(from, to);
  let i = 0;
  // Past an ID3 tag.
  if (latin(0, 3) === 'ID3')
    i = 10 + ((b[6] << 21) | (b[7] << 14) | (b[8] << 7) | b[9]);
  const rates = [
    0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320,
  ];
  const hz = [44100, 48000, 32000];
  let samples = 0;
  let rate = 44100;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff || (b[i + 1] & 0xfe) !== 0xfa) {
      i++;
      continue;
    }
    const kbps = rates[b[i + 2] >> 4];
    rate = hz[(b[i + 2] >> 2) & 3];
    if (!kbps || !rate) {
      i++;
      continue;
    }
    const pad = (b[i + 2] >> 1) & 1;
    samples += 1152;
    i += Math.floor((144000 * kbps) / rate) + pad;
  }
  return samples / rate;
}

/** Standing 2 m south-east of the skimmer, eye high, looking about. */
const START = { x: 1.4, y: 1.8, z: 1.4, yaw: 0.3, pitch: -0.2 };
const D = CINEMATIC.suspense;
const close = (a: number, b: number, d = 1e-9) =>
  expect(Math.abs(a - b)).toBeLessThan(d);
const angle = (a: number, b: number) =>
  Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

describe('the skimmer films’ timing', () => {
  it('is the suspense jingle’s own length', () => {
    const seconds = mp3Seconds(jingleUrl);
    // The encoder's padding aside, to a frame or two.
    expect(Math.abs(seconds - REVEAL.suspense)).toBeLessThan(0.06);
    expect(CINEMATIC.suspense).toBe(REVEAL.suspense);
  });
});

describe('the lob', () => {
  const path = lobPath(START);

  it('runs from the walker’s eye to the dead centre of the skimmer’s mouth, high over both', () => {
    const a = path.at(0);
    const b = path.at(1);
    close(a.x, START.x);
    close(a.y, START.y);
    close(b.x, LOB_TARGET.x);
    close(b.y, LOB_TARGET.y);
    close(b.z, LOB_TARGET.z);
    expect(path.apex).toBeGreaterThan(0);
    expect(path.apex).toBeLessThan(1);
    close(path.at(path.apex).y, path.top, 1e-6);
    expect(path.top).toBeGreaterThan(START.y + 1);
    for (let u = 0; u <= 1; u += 0.01)
      expect(path.at(u).y).toBeLessThanOrEqual(path.top + 1e-9);
  });

  it('turns at once to the skimmer’s centre', () => {
    const e = lobEye(LOB_ALIGN, START, D);
    const want = directionAngles({
      x: -START.x,
      y: LOB_TARGET.y - START.y,
      z: -START.z,
    });
    expect(angle(e.yaw, want.yaw)).toBeLessThan(1e-6);
    close(e.pitch, want.pitch, 1e-6);
    close(e.x, START.x);
  });

  it('then tips up along the launch, not yet moving', () => {
    const e = lobEye(LOB_ALIGN + LOB_TILT, START, D);
    const launch = directionAngles(path.tangent(0));
    expect(launch.pitch).toBeGreaterThan(0.5);
    close(e.pitch, launch.pitch, 1e-6);
    close(e.x, START.x);
    close(e.y, START.y);
  });

  it('flies the parabola looking along it: up, over at the top, down into the skimmer', () => {
    const flight = D - LOB_ALIGN - LOB_TILT;
    const at = (k: number) =>
      lobEye(LOB_ALIGN + LOB_TILT + flight * k, START, D);
    for (const k of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      const e = at(k);
      const ahead = at(k + 0.01);
      const go = directionAngles({
        x: ahead.x - e.x,
        y: ahead.y - e.y,
        z: ahead.z - e.z,
      });
      expect(Math.abs(go.pitch - e.pitch)).toBeLessThan(0.08);
    }
    expect(at(0.1).pitch).toBeGreaterThan(0);
    expect(at(0.95).pitch).toBeLessThan(-0.9);
    // Slow at the off, slow at the end: slow motion.
    const speed = (k: number) => {
      const a = at(k);
      const b = at(k + 0.01);
      return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    };
    expect(speed(0.01)).toBeLessThan(speed(0.5) / 4);
  });

  it('arrives all but inside the skimmer exactly as the jingle ends', () => {
    const e = lobEye(D, START, D);
    const end = path.at(path.arrive());
    close(e.x, end.x, 1e-9);
    close(e.y, end.y, 1e-9);
    const off = Math.hypot(e.x, e.y - LOB_TARGET.y, e.z);
    close(off, LOB_SHORT, 1e-6);
    // And the whip to the find begins there.
    const f = cinematicFrame(D, START, CINEMATIC, 'lob');
    expect(f.phase).toBe('reveal');
    close(f.eye!.x, e.x, 1e-9);
    close(f.eye!.y, e.y, 1e-9);
    expect(cinematicFrame(D - 0.01, START, CINEMATIC, 'lob').phase).toBe(
      'suspense',
    );
  });
});

describe('the corkscrew', () => {
  it('dives from 3 m over the skimmer to 0.2 m, turning exactly three times', () => {
    const a = corkscrewDive(0);
    const b = corkscrewDive(1);
    close(a.height, 3);
    close(b.height, 0.2);
    close(a.turned, 0);
    close(b.turned, 3 * 2 * Math.PI);
    // Ever down and round.
    for (let k = 0; k < 1; k += 0.05) {
      expect(corkscrewDive(k + 0.05).height).toBeLessThan(
        corkscrewDive(k).height,
      );
      expect(corkscrewDive(k + 0.05).turned).toBeGreaterThan(
        corkscrewDive(k).turned,
      );
    }
  });

  it('whips up over the skimmer, looking down, then lands as the jingle ends', () => {
    const top = corkscrewEye(CORKSCREW.whip, START, D);
    close(top.x, 0);
    close(top.z, 0);
    close(top.y, LOB_TARGET.y + 3);
    expect(top.pitch).toBeLessThan(-1.4);
    const end = corkscrewEye(D, START, D);
    close(end.y, LOB_TARGET.y + 0.2);
    close(end.yaw - top.yaw, 6 * Math.PI, 1e-9);
    // Never looks past plumb.
    for (let t = 0; t < D; t += 0.02)
      expect(corkscrewEye(t, START, D).pitch).toBeGreaterThan(-Math.PI / 2);
    const f = cinematicFrame(D, START, CINEMATIC, 'corkscrew');
    expect(f.phase).toBe('reveal');
    close(f.eye!.y, end.y, 1e-9);
  });
});

describe('the caustics through the find', () => {
  it('stand taller while it is shown, so they stay in the shot, in every film', () => {
    for (const style of ['orbit', 'lob', 'corkscrew'] as const) {
      const f = cinematicFrame(D + WHIP + 0.1, START, CINEMATIC, style);
      expect(f.phase).toBe('reveal');
      expect(f.rise).toBeCloseTo(REVEAL_RISE);
      expect(f.glow).toBe(1);
      // Through every moment of the film, while the lid is off, they play.
      for (let t = 0.4; t < D + CINEMATIC.reveal; t += 0.1) {
        const g = cinematicFrame(t, START, CINEMATIC, style);
        expect(g.rise).toBeGreaterThan(0.9);
        expect(g.glow).toBe(1);
      }
    }
  });
});
