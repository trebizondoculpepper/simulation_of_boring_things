import { describe, expect, it } from 'vite-plus/test';
import {
  PATH_RATES,
  createCameraLoop,
  createCameraPath,
  parseViewLink,
} from './camera-path';
import type { CameraKey } from './camera-path';
import { LOUNGE_FLYBY } from './attract-sequence';

const deg = (r: number) => (r * 180) / Math.PI;
const wrap = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

/** A square loop, 4 m a side, turning once round as it goes. */
const SQUARE: CameraKey[] = [
  { x: 0, y: 1, z: 0, yaw: 0, pitch: 0 },
  { x: 4, y: 1, z: 0, yaw: 90, pitch: -5, roll: 10 },
  { x: 4, y: 1, z: 4, yaw: 180, pitch: 0, zoom: 2 },
  { x: 0, y: 1, z: 4, yaw: 270, pitch: 5, roll: -10 },
];

describe('a camera loop', () => {
  it('reads a noclip link', () => {
    expect(
      parseViewLink(
        'http://127.0.0.1:5175/?room=pool_01&x=-10.55&y=0.83&z=2.92&yaw=35.3&pitch=-7.2&zoom=0.942&noclip=true&roll=-8.7',
      ),
    ).toEqual({
      x: -10.55,
      y: 0.83,
      z: 2.92,
      yaw: 35.3,
      pitch: -7.2,
      roll: -8.7,
      zoom: 0.942,
    });
  });

  it('passes through every key at its time', () => {
    const loop = createCameraLoop(SQUARE, 1);
    SQUARE.forEach((k, i) => {
      const s = loop.sample(loop.times[i]);
      expect(s.x).toBeCloseTo(k.x, 3);
      expect(s.y).toBeCloseTo(k.y, 3);
      expect(s.z).toBeCloseTo(k.z, 3);
      expect(wrap(deg(s.yaw) - k.yaw)).toBeCloseTo(0, 6);
      expect(deg(s.pitch)).toBeCloseTo(k.pitch, 6);
      expect(deg(s.roll)).toBeCloseTo(k.roll ?? 0, 6);
      expect(s.zoom).toBeCloseTo(k.zoom ?? 1, 6);
    });
  });

  it('flies at a steady speed', () => {
    const loop = createCameraLoop(SQUARE, 0.8);
    const dt = 0.05;
    for (let t = 0; t < loop.period; t += 0.37) {
      const a = loop.sample(t),
        b = loop.sample(t + dt);
      const v = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) / dt;
      expect(v).toBeGreaterThan(0.8 * 0.97);
      expect(v).toBeLessThan(0.8 * 1.01);
    }
  });

  it('comes round seamlessly: the same pose a period on, its turning smooth across the seam', () => {
    const loop = createCameraLoop(SQUARE, 1);
    const a = loop.sample(0.3),
      b = loop.sample(0.3 + loop.period);
    expect(b.x).toBeCloseTo(a.x, 6);
    expect(b.z).toBeCloseTo(a.z, 6);
    expect(wrap(deg(b.yaw - a.yaw))).toBeCloseTo(0, 6);
    // Its yaw rate just before the seam and just after it agree.
    const h = 0.01;
    const rate = (t: number) =>
      (loop.sample(t + h).yaw - loop.sample(t - h).yaw) / (2 * h);
    expect(rate(loop.period - 0.02)).toBeCloseTo(rate(loop.period + 0.02), 1);
  });

  it('keeps turning the same way: a yaw that goes once round never swings back', () => {
    const loop = createCameraLoop(SQUARE, 1);
    let last = loop.sample(0).yaw;
    for (let t = 0.05; t < 2 * loop.period; t += 0.05) {
      const yaw = loop.sample(t).yaw;
      expect(yaw).toBeGreaterThanOrEqual(last - 1e-9);
      last = yaw;
    }
    expect(deg(loop.sample(loop.period).yaw - loop.sample(0).yaw)).toBeCloseTo(
      360,
      6,
    );
  });

  it('takes the short way between keys either side of north', () => {
    const loop = createCameraLoop(
      [
        { x: 0, y: 1, z: 0, yaw: 170, pitch: 0 },
        { x: 5, y: 1, z: 0, yaw: -170, pitch: 0 },
      ],
      1,
    );
    // Half-way it faces south, 180°, never north.
    const half = deg(loop.sample(loop.times[1] / 2).yaw);
    expect(Math.abs(wrap(half - 180))).toBeLessThan(5);
  });

  it('never swings past a framed angle: two keys rolled alike hold it between them', () => {
    const loop = createCameraLoop(
      [
        { x: 0, y: 1, z: 0, yaw: 0, pitch: 0, roll: 0 },
        { x: 4, y: 1, z: 0, yaw: 0, pitch: 0, roll: 10 },
        { x: 8, y: 1, z: 0, yaw: 0, pitch: 0, roll: 10 },
        { x: 8, y: 1, z: 4, yaw: 0, pitch: 0, roll: -10 },
      ],
      1,
    );
    for (let t = loop.times[1]; t <= loop.times[2]; t += 0.05)
      expect(deg(loop.sample(t).roll)).toBeLessThanOrEqual(10 + 1e-6);
  });

  it('keeps inside walls it is given, where its curve would bulge through one', () => {
    const keys: CameraKey[] = [
      { x: 0, y: 1, z: 0, yaw: 0, pitch: 0 },
      { x: 10, y: 1, z: 0, yaw: 0, pitch: 0 },
      { x: 11, y: 1, z: 2, yaw: 0, pitch: 0 },
      { x: -1, y: 1, z: 2, yaw: 0, pitch: 0 },
    ];
    const free = createCameraLoop(keys, 1);
    const walled = createCameraLoop(keys, 1, {
      minX: -1,
      maxX: 11,
      minZ: 0,
      maxZ: 2,
    });
    let bulge = 0;
    for (let t = 0; t < free.period; t += 0.1) {
      bulge = Math.max(bulge, -free.sample(t).z);
      const s = walled.sample(t);
      expect(s.z).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThanOrEqual(11);
    }
    expect(bulge).toBeGreaterThan(0);
  });

  it('dollies between two keys, out and back, easing to rest at each end', () => {
    const loop = createCameraLoop(
      [
        { x: 0, y: 9, z: 0, yaw: 179.6, pitch: -32, zoom: 1.2 },
        { x: 40, y: 9, z: 0, yaw: 180, pitch: -32, zoom: 1.2 },
      ],
      0.8,
    );
    expect(loop.period).toBeCloseTo(100, 6);
    expect(loop.sample(0).x).toBeCloseTo(0, 6);
    expect(loop.sample(50).x).toBeCloseTo(40, 6);
    expect(loop.sample(100).x).toBeCloseTo(0, 6);
    // At rest at the ends, fastest midway.
    const speed = (t: number) =>
      Math.abs(loop.sample(t + 0.05).x - loop.sample(t - 0.05).x) / 0.1;
    expect(speed(50)).toBeLessThan(0.01);
    expect(speed(25)).toBeCloseTo((0.8 * Math.PI) / 2, 2);
    expect(deg(loop.sample(25).yaw)).toBeCloseTo(179.8, 6);
  });

  it('runs an open path once, start to end, easing from rest and to rest', () => {
    const path = createCameraPath(SQUARE, 1);
    expect(path.open).toBe(true);
    SQUARE.forEach((k, i) => {
      const s = path.sample(path.times[i]);
      expect(s.x).toBeCloseTo(k.x, 3);
      expect(s.z).toBeCloseTo(k.z, 3);
      expect(wrap(deg(s.yaw) - k.yaw)).toBeCloseTo(0, 6);
    });
    // Held at its ends.
    expect(path.sample(-5).x).toBeCloseTo(0, 6);
    expect(path.sample(path.period + 5).x).toBeCloseTo(0, 6);
    expect(path.sample(path.period + 5).z).toBeCloseTo(4, 6);
    // At rest at both ends; never backwards along its line.
    const step = 0.05;
    const moved = (t: number) => {
      const a = path.sample(t),
        b = path.sample(t + step);
      return Math.hypot(b.x - a.x, b.z - a.z) / step;
    };
    expect(moved(0)).toBeLessThan(0.05);
    expect(moved(path.period - step)).toBeLessThan(0.05);
  });

  it('gives two keys in one place time to turn between them', () => {
    const path = createCameraPath(
      [
        { x: 0, y: 1, z: 0, yaw: 0, pitch: 0 },
        { x: 3, y: 1, z: 0, yaw: 0, pitch: 0 },
        { x: 3, y: 1, z: 0, yaw: 90, pitch: 0, roll: 20 },
        { x: 6, y: 1, z: 0, yaw: 90, pitch: 0, roll: 20 },
      ],
      1,
    );
    const hold = path.times[2] - path.times[1];
    expect(hold).toBeCloseTo(90 / PATH_RATES.turn, 6);
    // It stands still there, turning.
    const mid = (path.times[1] + path.times[2]) / 2;
    expect(path.sample(mid).x).toBeCloseTo(3, 3);
    expect(deg(path.sample(mid).yaw)).toBeGreaterThan(10);
    expect(deg(path.sample(mid).yaw)).toBeLessThan(80);
  });

  it('takes at least a key’s own seconds to reach it', () => {
    const path = createCameraPath(
      [
        { x: 0, y: 1, z: 0, yaw: 0, pitch: 0 },
        { x: 0, y: 1, z: 0, yaw: 5, pitch: 0, seconds: 3 },
      ],
      1,
    );
    expect(path.period).toBeCloseTo(3, 6);
  });

  it('zooms at a steady rate: midway between 1× and 4× is 2×', () => {
    const loop = createCameraLoop(
      [
        { x: 0, y: 1, z: 0, yaw: 0, pitch: 0, zoom: 1 },
        { x: 5, y: 1, z: 0, yaw: 0, pitch: 0, zoom: 4 },
      ],
      1,
    );
    expect(loop.sample(loop.times[1] / 2).zoom).toBeCloseTo(2, 6);
  });

  it('flies the owner’s lounge loop through all eleven of its shots, and a waypoint round a column', () => {
    const loop = createCameraLoop(LOUNGE_FLYBY.keys, LOUNGE_FLYBY.speed);
    expect(loop.times).toHaveLength(12);
    LOUNGE_FLYBY.keys.forEach((k, i) => {
      const s = loop.sample(loop.times[i]);
      expect(Math.hypot(s.x - k.x, s.y - k.y, s.z - k.z)).toBeLessThan(0.01);
    });
  });
});
