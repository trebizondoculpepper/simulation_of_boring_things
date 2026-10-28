import { describe, expect, it } from 'vite-plus/test';
import {
  BUSY_WEIGHT,
  budgetVerdict,
  countUsage,
  knownOverBudget,
  medianOf,
  starved,
  overBudget,
  rankSamples,
  rankedTable,
  textureBytes,
  uploadSize,
  uploadTexels,
  uploadsBySize,
  usageWeight,
} from './component-bench';
import type { BenchSample, PhaseStats } from './component-bench';

const phase = (over: Partial<PhaseStats> = {}): PhaseStats => ({
  frames: 60,
  seconds: 1,
  updateMeanMs: 0,
  updateWorstMs: 0,
  renderMeanMs: 0,
  uploadsPerS: 0,
  texelsPerS: 0,
  ops2dPerS: 0,
  ...over,
});

const sample = (
  id: string,
  active: Partial<PhaseStats> = {},
  idle: Partial<PhaseStats> = {},
): BenchSample => ({
  id,
  label: id,
  source: 'room',
  buildMs: 1,
  updateUs: 10,
  idle: phase(idle),
  active: phase(active),
  drawCalls: 3,
  triangles: 100,
  materials: 2,
  textures: 1,
  textureBytes: 1000,
  live: true,
});

describe('component bench', () => {
  it('counts copies, busy rooms and kinds', () => {
    const usage = countUsage([
      { room: 'control_room', keys: ['cctv', 'store-extract:a'] },
      { room: 'boiler_house', keys: ['cctv', 'store-extract:b'] },
    ]);
    expect(usage.get('cctv')).toEqual({
      count: 2,
      busy: 1,
      rooms: ['control_room', 'boiler_house'],
    });
    expect(usage.get('kind:store-extract')?.count).toBe(2);
    expect(usageWeight(usage.get('cctv'))).toBe(1 + BUSY_WEIGHT);
    expect(usageWeight(undefined)).toBe(0);
  });

  it('ranks by cost where used, then unit cost', () => {
    const usage = countUsage([
      { room: 'control_room', keys: ['cheap', 'cheap', 'cheap'] },
      { room: 'boiler_house', keys: ['dear'] },
    ]);
    const ranked = rankSamples(
      [
        sample('dear', { updateMeanMs: 0.2 }),
        sample('cheap', { updateMeanMs: 0.05 }),
        sample('dev-only', { updateMeanMs: 1 }),
        sample('also-dev', { updateMeanMs: 0.5 }),
      ],
      usage,
    );
    expect(ranked.map((r) => r.sample.id)).toEqual([
      'cheap',
      'dear',
      'dev-only',
      'also-dev',
    ]);
    expect(ranked[0].whereUsedMs).toBeCloseTo(0.05 * 6);
  });

  it('takes the empty scene off the render time', () => {
    const [r] = rankSamples(
      [sample('a', { updateMeanMs: 0.1, renderMeanMs: 0.5 })],
      new Map(),
      0.4,
    );
    expect(r.unitMs).toBeCloseTo(0.2);
  });

  it('flags uploads with nothing changing', () => {
    expect(overBudget(sample('ok'))).toEqual([]);
    const over = overBudget(
      sample('chart', {}, { uploadsPerS: 60, texelsPerS: 60 * 512 * 512 }),
    );
    expect(over).toHaveLength(2);
    expect(over[0]).toMatch(/uploads 60.0\/s/);
  });

  it('reads texels from an upload call', () => {
    const canvas = { width: 512, height: 256 };
    expect(uploadTexels('texSubImage2D', [0, 0, 0, 0, 0, 0, canvas])).toBe(
      512 * 256,
    );
    expect(
      uploadTexels('texSubImage2D', [0, 0, 0, 0, 64, 32, 0, 0, null]),
    ).toBe(64 * 32);
    expect(uploadTexels('texImage2D', [0, 0, 0, 0, 0, canvas])).toBe(512 * 256);
    expect(uploadTexels('texImage2D', [0, 0, 0, 8, 4, 0, 0, 0, null])).toBe(32);
    expect(uploadTexels('texImage2D', [0, 0, 0, 0, 0, null])).toBe(0);
  });

  it('sizes a texture with its mip chain', () => {
    expect(textureBytes(256, 256, false)).toBe(262_144);
    expect(textureBytes(256, 256, true)).toBe(349_525);
  });

  it('prints a table row for every sample', () => {
    const table = rankedTable(
      rankSamples(
        [sample('a'), { ...sample('b'), error: 'no | way' }],
        new Map(),
      ),
    );
    const lines = table.split('\n');
    expect(lines).toHaveLength(4);
    for (const line of lines)
      expect(line.split(' | ').length).toBe(lines[0].split(' | ').length);
    expect(table).toContain('no / way');
  });

  it('fails a run on any component over budget that is not known', () => {
    const chart = sample(
      'mimic-pool',
      {},
      {
        uploadsPerS: 60,
        texelsPerS: 60 * 512 * 512,
        uploadsBy: '512×512 ×72',
      },
    );
    const panel = sample(
      'exhibit:dev48:SYSTEMS STATUS BOARD',
      {},
      { uploadsPerS: 60, texelsPerS: 1e7 },
    );
    const passing = budgetVerdict([sample('a'), panel]);
    expect(passing.passed).toBe(true);
    expect(passing.known.map((k) => k.id)).toEqual([panel.id]);
    const failing = budgetVerdict([sample('a'), panel, chart]);
    expect(failing.passed).toBe(false);
    expect(failing.failures.map((f) => f.id)).toEqual(['mimic-pool']);
    // It says which texture it uploads.
    expect(failing.failures[0].over.at(-1)).toBe('uploading 512×512 ×72');
    expect(knownOverBudget('exhibit:dev47:Lectern')).toMatch(/TODO/);
    expect(knownOverBudget('mimic-pool')).toBeUndefined();
  });

  it('names an upload by its size', () => {
    const canvas = { width: 512, height: 256 };
    expect(uploadSize('texImage2D', [0, 0, 0, 0, 0, canvas])).toBe('512×256');
    expect(uploadSize('texSubImage2D', [0, 0, 0, 0, 64, 32, 0, 0, null])).toBe(
      '64×32',
    );
    expect(
      uploadsBySize(
        new Map([
          ['8×8', 1],
          ['512×512', 72],
          ['64×64', 3],
          ['4×4', 2],
        ]),
      ),
    ).toBe('512×512 ×72, 64×64 ×3, 4×4 ×2');
  });

  it('takes the median, so one pause does not fail a budget', () => {
    expect(medianOf([5, 6, 5, 4000, 6, 5])).toBe(5.5);
    expect(medianOf([3, 1, 2])).toBe(2);
    expect(medianOf([])).toBe(0);
  });

  it('knows a sample measured with the page starved of frames', () => {
    expect(starved(sample('a'), 1)).toBe(false);
    expect(starved(sample('a', { frames: 3 }), 1.2)).toBe(true);
    expect(starved(sample('a', {}, { frames: 8 }), 1.2)).toBe(true);
  });

  it('does not judge a sample starved of frames, but lists it', () => {
    const slow = sample('mimic-pool', { frames: 2 }, { uploadsPerS: 60 });
    const verdict = budgetVerdict([slow], undefined, 1.2);
    expect(verdict.passed).toBe(true);
    expect(verdict.unsteady.map((u) => u.id)).toEqual(['mimic-pool']);
  });
});
