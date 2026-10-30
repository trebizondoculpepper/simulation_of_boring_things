import { describe, expect, it } from 'vite-plus/test';
import { DEFAULT_BAKE, geometryHash, subdivideLongEdges } from './ao-geometry';
import type { BakeMeshData } from './ao-geometry';
import {
  createVertexAoJob,
  hemisphereSamples,
  occlusionFalloff,
  tangentBasis,
  toAoByte,
} from './ao-rays';
import type { CastFirst } from './ao-rays';
import {
  BAKE_PRIORITY,
  createBakeQueue,
  isPinnedRoom,
  mayBake,
  planEviction,
} from './ao-cache-policy';

/** A unit square in the floor plane (y = 0), two triangles, facing up. */
const square = (size = 1) => ({
  positions: new Float32Array([
    0,
    0,
    0,
    0,
    0,
    size,
    size,
    0,
    0,
    size,
    0,
    0,
    0,
    0,
    size,
    size,
    0,
    size,
  ]),
  normals: new Float32Array(Array.from({ length: 6 }, () => [0, 1, 0]).flat()),
  uvs: new Float32Array([0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1]),
});

describe('geometryHash', () => {
  const mesh = (): BakeMeshData => ({ ...square(), receiver: true });
  it('is the same for the same geometry', () => {
    expect(geometryHash([mesh()], DEFAULT_BAKE)).toBe(
      geometryHash([mesh()], DEFAULT_BAKE),
    );
    expect(geometryHash([mesh()], DEFAULT_BAKE)).toMatch(/^[0-9a-f]{16}$/);
  });
  it('changes with a moved vertex, the settings or the receivers', () => {
    const base = geometryHash([mesh()], DEFAULT_BAKE);
    const moved = mesh();
    moved.positions[0] = 0.002;
    expect(geometryHash([moved], DEFAULT_BAKE)).not.toBe(base);
    expect(geometryHash([mesh()], { ...DEFAULT_BAKE, rays: 16 })).not.toBe(
      base,
    );
    expect(
      geometryHash([{ ...mesh(), receiver: false }], DEFAULT_BAKE),
    ).not.toBe(base);
  });
  it('ignores differences below a millimetre', () => {
    const nudged = mesh();
    nudged.positions[0] = 0.0001;
    expect(geometryHash([nudged], DEFAULT_BAKE)).toBe(
      geometryHash([mesh()], DEFAULT_BAKE),
    );
  });
});

describe('subdivideLongEdges', () => {
  it('leaves small triangles alone', () => {
    const out = subdivideLongEdges(square(0.3), 0.5);
    expect(out.positions.length).toBe(18);
  });
  it('splits a large face until no edge is too long, keeping its area', () => {
    const out = subdivideLongEdges(square(4), 0.5);
    let area = 0;
    let longest = 0;
    for (let t = 0; t < out.positions.length / 9; t++) {
      const p = (k: number) =>
        [0, 1, 2].map((i) => out.positions[t * 9 + k * 3 + i]);
      const [a, b, c] = [p(0), p(1), p(2)];
      const e = (u: number[], v: number[]) =>
        Math.hypot(u[0] - v[0], u[1] - v[1], u[2] - v[2]);
      longest = Math.max(longest, e(a, b), e(b, c), e(c, a));
      // Signed area in the floor plane, facing up (y): winding kept.
      area +=
        ((b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2])) / 2;
    }
    expect(longest).toBeLessThanOrEqual(0.5 + 1e-6);
    expect(area).toBeCloseTo(16, 5);
    expect(out.uvs!.length / 2).toBe(out.positions.length / 3);
    expect(
      [...out.normals].every((n, i) => (i % 3 === 1 ? n === 1 : n === 0)),
    ).toBe(true);
  });
  it('splits a shared edge alike from both sides, leaving no T-junction', () => {
    const out = subdivideLongEdges(square(3), 0.5);
    // Every vertex on the diagonal is a vertex of triangles on both sides.
    const onDiagonal = new Map<string, Set<number>>();
    for (let t = 0; t < out.positions.length / 9; t++)
      for (let k = 0; k < 3; k++) {
        const x = out.positions[t * 9 + k * 3];
        const z = out.positions[t * 9 + k * 3 + 2];
        if (Math.abs(x + z - 3) < 1e-6 && x > 0 && z > 0) {
          const key = `${x.toFixed(5)},${z.toFixed(5)}`;
          // Which original triangle: centroid side of the diagonal.
          let cx = 0;
          let cz = 0;
          for (let j = 0; j < 3; j++) {
            cx += out.positions[t * 9 + j * 3];
            cz += out.positions[t * 9 + j * 3 + 2];
          }
          if (!onDiagonal.has(key)) onDiagonal.set(key, new Set());
          onDiagonal.get(key)!.add(cx + cz < 9 ? 0 : 1);
        }
      }
    expect(onDiagonal.size).toBeGreaterThan(0);
    for (const sides of onDiagonal.values()) expect(sides.size).toBe(2);
  });
  it('stops at its triangle limit', () => {
    const out = subdivideLongEdges(square(20), 0.1, 100);
    expect(out.positions.length / 9).toBeLessThanOrEqual(103);
  });
});

describe('rays', () => {
  it('spreads cosine-weighted unit directions over the upper hemisphere', () => {
    const s = hemisphereSamples(64);
    let meanZ = 0;
    for (let i = 0; i < 64; i++) {
      expect(Math.hypot(s[i * 3], s[i * 3 + 1], s[i * 3 + 2])).toBeCloseTo(
        1,
        5,
      );
      expect(s[i * 3 + 2]).toBeGreaterThan(0);
      meanZ += s[i * 3 + 2] / 64;
    }
    // Cosine-weighted: the mean of cos θ is 2/3.
    expect(meanZ).toBeCloseTo(2 / 3, 1);
  });
  it('builds a right-angled frame about any normal', () => {
    for (const n of [
      [0, 0, 1],
      [0, 0, -1],
      [1, 0, 0],
      [0.6, 0, -0.8],
    ] as const) {
      const { t, b } = tangentBasis(n[0], n[1], n[2]);
      const dot = (u: readonly number[], v: readonly number[]) =>
        u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
      expect(dot(t, n)).toBeCloseTo(0, 6);
      expect(dot(b, n)).toBeCloseTo(0, 6);
      expect(dot(t, b)).toBeCloseTo(0, 6);
      expect(dot(t, t)).toBeCloseTo(1, 6);
    }
  });
  it('falls off with distance, to nothing at the reach', () => {
    expect(occlusionFalloff(0, 1)).toBe(1);
    expect(occlusionFalloff(0.5, 1)).toBeCloseTo(0.75);
    expect(occlusionFalloff(1, 1)).toBe(0);
    expect(occlusionFalloff(2, 1)).toBe(0);
    expect(toAoByte(1)).toBe(255);
    expect(toAoByte(-0.1)).toBe(0);
  });
});

describe('createVertexAoJob', () => {
  const floor = (n: number) => {
    const positions = new Float32Array(n * 3);
    const normals = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      positions[i * 3] = i * 0.25;
      normals[i * 3 + 1] = 1;
    }
    return { positions, normals };
  };
  it('leaves an open floor unoccluded', () => {
    const job = createVertexAoJob(
      { ...floor(4), rays: 16, distance: 1, bias: 0.001 },
      () => null,
    );
    while (!job.step(10));
    expect([...job.result]).toEqual([255, 255, 255, 255]);
  });
  it('darkens a floor under a low ceiling, more the lower it is', () => {
    // A ceiling at height h over the floor: hit distance along d is (h - y) / dy.
    const under =
      (h: number): CastFirst =>
      (_ox, oy, _oz, _dx, dy, _dz, far) => {
        if (dy <= 0) return null;
        const d = (h - oy) / dy;
        return d <= far ? d : null;
      };
    const bake = (h: number) => {
      const job = createVertexAoJob(
        { ...floor(1), rays: 64, distance: 1, bias: 0.001 },
        under(h),
      );
      job.step(1000);
      return job.result[0];
    };
    expect(bake(0.2)).toBeLessThan(bake(0.6));
    expect(bake(0.6)).toBeLessThan(255);
    expect(bake(2)).toBe(255);
  });
  it('bakes coincident corners once, alike, and works in slices', () => {
    const { positions, normals } = floor(3);
    const doubled = {
      positions: new Float32Array([...positions, ...positions]),
      normals: new Float32Array([...normals, ...normals]),
    };
    let calls = 0;
    const job = createVertexAoJob(
      { ...doubled, rays: 8, distance: 1, bias: 0.001 },
      () => {
        calls++;
        return 0.5;
      },
    );
    expect(job.unique).toBe(3);
    expect(job.step(8)).toBe(false);
    while (!job.step(8));
    expect(calls).toBe(24);
    expect(job.result.slice(0, 3)).toEqual(job.result.slice(3));
  });
});

describe('the cache policy', () => {
  const entry = (
    hash: string,
    roomId: string,
    bytes: number,
    lastUsed: number,
  ) => ({
    hash,
    roomId,
    bytes,
    lastUsed,
  });
  it("evicts a room's old geometry at once", () => {
    const out = planEviction(
      [entry('a', 'pool_01', 10, 1)],
      entry('b', 'pool_01', 10, 2),
      1000,
    );
    expect(out).toEqual(['a']);
  });
  it('evicts the least recently used past the limit, sparing hubs', () => {
    const entries = [
      entry('hub', 'main_corridor', 40, 0),
      entry('old', 'pool_02', 40, 1),
      entry('mid', 'pool_03', 40, 2),
      entry('new', 'pool_04', 40, 3),
    ];
    expect(planEviction(entries, entry('x', 'dev56', 40, 4), 130)).toEqual([
      'old',
      'mid',
    ]);
  });
  it('pins corridors, lifts and control rooms', () => {
    expect(isPinnedRoom('main_corridor')).toBe(true);
    expect(isPinnedRoom('CR_A_UP')).toBe(true);
    expect(isPinnedRoom('freight_lift')).toBe(true);
    expect(isPinnedRoom('pool_01')).toBe(false);
  });
});

describe('the bake queue', () => {
  it('takes the most urgent first, then the first asked', () => {
    const q = createBakeQueue();
    q.add('n1', BAKE_PRIORITY.neighbour);
    q.add('n2', BAKE_PRIORITY.neighbour);
    q.add('here', BAKE_PRIORITY.current);
    expect(q.take()?.hash).toBe('here');
    expect(q.take()?.hash).toBe('n1');
    expect(q.size).toBe(1);
  });
  it('only raises a job asked for again; reprioritise moves it either way', () => {
    const q = createBakeQueue();
    q.add('a', BAKE_PRIORITY.facing);
    q.add('b', BAKE_PRIORITY.neighbour);
    q.add('b', BAKE_PRIORITY.beyond);
    q.add('b', BAKE_PRIORITY.current);
    expect(q.peek()?.hash).toBe('b');
    q.reprioritise('b', BAKE_PRIORITY.beyond);
    expect(q.peek()?.hash).toBe('a');
  });
  it('lets the baker work only when calm', () => {
    expect(mayBake(100, 200, [])).toBe(false);
    expect(mayBake(300, 200, [16, 17])).toBe(true);
    expect(mayBake(300, 200, [40, 50])).toBe(false);
  });
});
