import { describe, expect, it } from 'vite-plus/test';
import {
  APPROACH_FAR,
  BENCH,
  approachedPlinth,
  approachLampAt,
  HALL7,
  PLACES,
  PLINTHS,
  PROJECTOR,
  PLINTH_HALF,
  hall7Solids,
  jointLength,
  MUSIC_FILES,
  musicFor,
  lecternAt,
  MIDDLE_BENCHES,
  middleBenchRect,
  yawOf,
} from './museum-7-grout';
import {
  ARCH_CLEAR,
  archClearHits,
  archClearZones,
  hallArches,
} from './museum-plan';

describe('Hall 7, grout', () => {
  it('has ten plinths, numbered in order, each with its place', () => {
    expect(PLINTHS.map((p) => p.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const p of PLINTHS) expect(PLACES[p.n]).toBeDefined();
  });

  it('stands every plinth round the edge, its plaque on the hall’s side', () => {
    for (const p of PLINTHS) {
      const { x, z } = PLACES[p.n];
      expect(
        HALL7.halfX - Math.abs(x) < 1.2 || HALL7.halfZ - Math.abs(z) < 1.2,
        `plinth ${p.n}`,
      ).toBe(true);
      // Its plaque stands on the hall's side of it, not in a wall.
      const l = lecternAt(p.n);
      expect(Math.abs(l.x)).toBeLessThan(HALL7.halfX - 0.5);
      expect(Math.abs(l.z)).toBeLessThan(HALL7.halfZ - 0.5);
    }
  });

  it('hangs the projector high, over the way in to the 1970s’ plinth', () => {
    expect(PROJECTOR.y).toBeGreaterThan(4);
    expect(PROJECTOR.y).toBeLessThan(HALL7.h);
    expect(PROJECTOR.z).toBeLessThan(PLACES[5].z);
  });

  it('colours two specimens: the 1970s avocado, the furan black', () => {
    const coloured = PLINTHS.filter((p) => p.grout !== 'grey');
    expect(coloured.map((p) => [p.name, p.grout])).toEqual([
      ['Coloured cement grout', 'avocado'],
      ['Furan resin grout', 'black'],
    ]);
    expect(coloured[0].years).toContain('1970s');
  });

  it('keeps the research’s corrections', () => {
    const all = JSON.stringify(PLINTHS);
    expect(all).not.toMatch(/thick joint/i);
    expect(PLINTHS[1].what).toContain('1840s');
    expect(PLINTHS[7].years).toMatch(/1940s.*1960s/);
    expect(PLINTHS[6].reverence).toContain('So is this one');
    expect(all).not.toMatch(/Mapei|ARDEX|Laticrete|Sika|Weber|BAL\b/);
  });

  it('works the joint fact: nearly six kilometres', () => {
    expect(jointLength()).toBeGreaterThan(5600);
    expect(jointLength()).toBeLessThan(5700);
  });

  it('keeps everything inside the hall and clear of both archways and of each other', () => {
    const solids = hall7Solids();
    for (const s of solids) {
      expect(s.minX).toBeGreaterThan(-HALL7.halfX);
      expect(s.maxX).toBeLessThan(HALL7.halfX);
      expect(s.minZ).toBeGreaterThan(-HALL7.halfZ);
      expect(s.maxZ).toBeLessThan(HALL7.halfZ);
      expect(archClearHits('museum7', s)).toEqual([]);
    }
    // No two plinths overlap.
    for (const a of PLINTHS)
      for (const b of PLINTHS)
        if (a.n < b.n) {
          const pa = PLACES[a.n];
          const pb = PLACES[b.n];
          expect(
            Math.abs(pa.x - pb.x) > 2 * PLINTH_HALF ||
              Math.abs(pa.z - pb.z) > 2 * PLINTH_HALF,
          ).toBe(true);
        }
    expect(BENCH.x).toBeLessThan(-HALL7.halfX + 1);
  });
});

describe('the archways’ clear ground (the owner, 2026-10-31)', () => {
  it('sets a zone at each archway, 2 m beyond its sides and 2 m into the hall', () => {
    const zones = archClearZones('museum7');
    expect(zones).toHaveLength(2);
    for (const [i, a] of hallArches('museum7').entries()) {
      const z = zones[i];
      const along = a.into[0] === 0 ? z.maxX - z.minX : z.maxZ - z.minZ;
      expect(along).toBeCloseTo(a.w + 2 * ARCH_CLEAR.along);
    }
  });

  it('stands no plinth, lectern or bench in one, nor in the corner beside it', () => {
    const r = (x: number, z: number, h: number) => ({
      minX: x - h,
      maxX: x + h,
      minZ: z - h,
      maxZ: z + h,
    });
    for (const p of PLINTHS) {
      const { x, z } = PLACES[p.n];
      const yaw = yawOf(p.n);
      const h =
        PLINTH_HALF * (Math.abs(Math.cos(yaw)) + Math.abs(Math.sin(yaw)));
      expect(archClearHits('museum7', r(x, z, h)), `plinth ${p.n}`).toEqual([]);
      const l = lecternAt(p.n);
      expect(
        archClearHits('museum7', r(l.x, l.z, 0.22)),
        `lectern ${p.n}`,
      ).toEqual([]);
    }
    for (const b of MIDDLE_BENCHES)
      expect(archClearHits('museum7', middleBenchRect(b))).toEqual([]);
  });
});

describe('the middle benches', () => {
  it('stand inside the hall, clear of each other and of every other solid', () => {
    const solids = hall7Solids();
    const benches = MIDDLE_BENCHES.map(middleBenchRect);
    const overlap = (a: (typeof benches)[0], b: (typeof benches)[0]) =>
      a.maxX > b.minX && a.minX < b.maxX && a.maxZ > b.minZ && a.minZ < b.maxZ;
    for (const b of benches) {
      expect(
        Math.abs(b.minX) < HALL7.halfX && Math.abs(b.maxX) < HALL7.halfX,
      ).toBe(true);
      // Away from the walls: in the middle of the hall, room to walk round.
      expect(Math.abs(b.minZ)).toBeLessThan(HALL7.halfZ - 3);
      const others = solids.filter(
        (s) => !benches.some((o) => o.minX === s.minX && o.minZ === s.minZ),
      );
      for (const s of others) expect(overlap(b, s)).toBe(false);
    }
    expect(overlap(benches[0], benches[1])).toBe(false);
  });

  it('leaves the straight walk from the way in to the way out clear by a metre', () => {
    const [out, into] = hallArches('museum7');
    const a = into.frame;
    const b = out.frame;
    for (const r of MIDDLE_BENCHES.map(middleBenchRect)) {
      for (let t = 0; t <= 1; t += 0.01) {
        const x = a.x + (b.x - a.x) * t;
        const z = a.z + (b.z - a.z) * t;
        const dx = Math.max(r.minX - x, 0, x - r.maxX);
        const dz = Math.max(r.minZ - z, 0, z - r.maxZ);
        expect(Math.hypot(dx, dz)).toBeGreaterThan(1);
      }
    }
  });
});

describe('the approach light', () => {
  it('lights the plinth approached, holds it to the far edge, and lets go', () => {
    // Plinth 6, on the south wall, facing north into the hall.
    const at = lecternAt(6);
    expect(approachedPlinth(at.x, at.z, null)).toBe(6);
    expect(approachedPlinth(0, -1, null)).toBeNull();
    // Held a little past the near edge, so it does not flicker.
    expect(approachedPlinth(at.x, at.z - 2.5, 6)).toBe(6);
    expect(approachedPlinth(at.x, at.z - APPROACH_FAR - 0.1, 6)).toBeNull();
  });

  it('hangs each approach lamp over plinth and lectern, aimed at the plinth', () => {
    for (const p of PLINTHS) {
      const { from, to } = approachLampAt(p.n, 4.9);
      const place = PLACES[p.n];
      const lectern = lecternAt(p.n);
      expect(Math.abs(from.x)).toBeLessThan(HALL7.halfX);
      expect(Math.abs(from.z)).toBeLessThan(HALL7.halfZ);
      expect(from.y).toBe(4.9);
      // Halfway out from the plinth to its lectern.
      expect(from.x).toBeCloseTo((place.x + lectern.x) / 2);
      expect(from.z).toBeCloseTo((place.z + lectern.z) / 2);
      expect(to).toEqual({ x: place.x, y: 0, z: place.z });
    }
  });
});

describe('the era music', () => {
  it('names one loop for each plinth', () => {
    expect(PLINTHS.map((p) => MUSIC_FILES[p.n]).every(Boolean)).toBe(true);
    expect(new Set(Object.values(MUSIC_FILES)).size).toBe(PLINTHS.length);
  });
  it("plays the shown plinth's loop only where its file exists", () => {
    const present = new Set(['5-coloured.ogg']);
    expect(musicFor(5, present)).toBe('5-coloured.ogg');
    expect(musicFor(4, present)).toBeNull();
    expect(musicFor(null, present)).toBeNull();
  });
});
