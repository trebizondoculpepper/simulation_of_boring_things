import { describe, expect, it } from 'vite-plus/test';
import {
  A0_SHORT,
  CORRIDOR_DECALS,
  decalPose,
  decalProblems,
  legRun,
  outerSize,
} from './museum-corridor-decals';
import { CORRIDOR, LAYOUT_CORRIDORS } from './museum-layout';

describe('museum corridor decals', () => {
  it('hangs two pieces or more in every corridor, one by each hall', () => {
    for (let n = 0; n < LAYOUT_CORRIDORS.length; n++) {
      const here = CORRIDOR_DECALS.filter((d) => d.corridor === n);
      expect(here.length).toBeGreaterThanOrEqual(2);
      expect(new Set(here.map((d) => d.leg)).size).toBe(2);
    }
  });

  it('keeps each piece inside its wall, at eye level, apart, frames at least A0', () => {
    expect(decalProblems(CORRIDOR_DECALS)).toEqual([]);
  });

  it('catches a piece out of place', () => {
    const d = CORRIDOR_DECALS[0];
    expect(decalProblems([{ ...d, at: 0.2 }])).not.toEqual([]);
    expect(decalProblems([{ ...d, y: 3 }])).not.toEqual([]);
    expect(decalProblems([{ ...d, width: 0.5, height: 0.4 }])).not.toEqual([]);
    expect(decalProblems([d, { ...d }])).not.toEqual([]);
  });

  it('frames every rectangular picture at least A0 and stickers the rest', () => {
    const framed = CORRIDOR_DECALS.filter((d) => d.kind === 'framed').map(
      (d) => d.file,
    );
    expect(framed.sort()).toEqual([
      'c01-1-victorian-baths',
      'c56-1-below-the-waterline',
      'c89-1-pipe-colour-chart',
      'c89-2-valve-specimens',
      'c90-1-pool-architectural',
    ]);
    for (const d of CORRIDOR_DECALS.filter((d) => d.kind === 'framed'))
      expect(Math.min(d.width, d.height)).toBeGreaterThanOrEqual(A0_SHORT);
  });

  it('themes each piece to its corridor by its file name', () => {
    for (const d of CORRIDOR_DECALS) {
      const a = d.corridor;
      const b = (a + 1) % 10;
      expect(d.file.startsWith(`c${a}${b}-`)).toBe(true);
    }
  });

  it('has a game copy of every image', () => {
    const files = Object.keys(
      import.meta.glob(
        '../../../../resources/images/museum_decals/game/*.webp',
        { query: '?url', import: 'default', eager: true },
      ),
    ).map((p) => p.split('/').pop());
    for (const d of CORRIDOR_DECALS) expect(files).toContain(`${d.file}.webp`);
  });

  it('puts each on its wall face, facing into the corridor, within its leg', () => {
    const half = CORRIDOR.width / 2;
    for (const d of CORRIDOR_DECALS) {
      const c = LAYOUT_CORRIDORS[d.corridor];
      const p = decalPose(c.path, d);
      const [a, m, b] = c.path;
      const mouth = d.leg === 0 ? a : b;
      // Its distance from the leg's centre line is the half-width; along it, `at`.
      const dx = m.x - mouth.x;
      const dz = m.z - mouth.z;
      const l = Math.hypot(dx, dz);
      const along = ((p.x - mouth.x) * dx + (p.z - mouth.z) * dz) / l;
      const across = Math.abs((p.x - mouth.x) * dz - (p.z - mouth.z) * dx) / l;
      expect(along).toBeCloseTo(d.at, 6);
      expect(across).toBeCloseTo(half, 6);
      expect(d.at + outerSize(d).width / 2).toBeLessThan(
        legRun(d.corridor, d.leg),
      );
      // Stepping in from it leaves the wall.
      const q = { x: p.x + p.into[0], z: p.z + p.into[1] };
      const acrossQ = Math.abs((q.x - mouth.x) * dz - (q.z - mouth.z) * dx) / l;
      expect(acrossQ).toBeCloseTo(half - 1, 6);
    }
  });
});
