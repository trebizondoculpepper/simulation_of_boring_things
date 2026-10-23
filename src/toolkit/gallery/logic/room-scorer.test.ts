import { describe, expect, it } from 'vite-plus/test';
import { rank, scoreRoom } from './room-scorer';
import type { ScoredRoom } from './room-scorer';

const room = (over: Partial<ScoredRoom> = {}): ScoredRoom => ({
  name: 'test',
  w: 10,
  d: 10,
  h: 8,
  minimumArea: 100,
  machines: [{ minX: -1, maxX: 1, minZ: -1, maxZ: 1 }],
  unreachableAccess: 0,
  runPrices: [24],
  endPrices: [24],
  runs: [
    {
      name: 'a',
      points: [
        [0, 1, 0],
        [4, 1, 0],
      ],
      od: 0.05,
      joint: 'socket',
    },
  ],
  ends: [
    [
      [0, 1, 0],
      [4, 1, 0],
    ],
  ],
  regions: [],
  fittings: { wanted: 2, installed: 2, reachable: 2 },
  ...over,
});

describe('the scorer', () => {
  it('passes a room with nothing wrong, and scores it well', () => {
    const s = scoreRoom(room());
    expect(s.passes).toBe(true);
    expect(s.gates).toEqual([]);
    expect(s.total).toBeGreaterThan(95);
  });

  it('fails a gate for missing or unreachable fittings, or a machine no one can reach', () => {
    expect(
      scoreRoom(room({ fittings: { wanted: 2, installed: 1, reachable: 1 } }))
        .passes,
    ).toBe(false);
    expect(
      scoreRoom(room({ fittings: { wanted: 2, installed: 2, reachable: 1 } }))
        .passes,
    ).toBe(false);
    expect(scoreRoom(room({ unreachableAccess: 1 })).passes).toBe(false);
  });

  it('fails a gate for a run through a reserved region', () => {
    const s = scoreRoom(
      room({
        regions: [
          {
            name: 'stair',
            kind: 'stair',
            min: [1, 0, -1],
            max: [2, 8, 1],
            forbids: { machines: true, runs: true },
          },
        ],
      }),
    );
    expect(s.passes).toBe(false);
    expect(s.gates[0]).toMatch(/reserved region/);
  });

  it('marks down a long way round and an oversized room, from baselines it does not choose', () => {
    const roundabout = scoreRoom(
      room({
        runs: [
          {
            name: 'a',
            points: [
              [0, 1, 0],
              [0, 3, 0],
              [4, 3, 0],
              [4, 1, 0],
            ],
            od: 0.05,
            joint: 'socket',
          },
        ],
      }),
    );
    expect(roundabout.total).toBeLessThan(scoreRoom(room()).total);
    const big = scoreRoom(room({ w: 20, d: 20 }));
    expect(big.dimensions.find((d) => d.name === 'room area')!.score).toBe(0);
  });

  it('ranks a room that passes its gates above one that does not, whatever their scores', () => {
    const good = scoreRoom(room());
    const fast = { ...scoreRoom(room({ unreachableAccess: 1 })), total: 100 };
    expect(rank([fast, good])[0]).toBe(good);
  });
});
