import { describe, expect, it } from 'vite-plus/test';
import { pipeClashes } from './pipe-route';
import { routeVoxelLines } from './voxel-router';
import type { RouterLine, RouterRoom } from './voxel-router';

const room: RouterRoom = { halfX: 3, halfZ: 3, height: 5 };
const line = (
  id: string,
  a: [number, number, number],
  b: [number, number, number],
  out: [number, number, number],
): RouterLine => ({
  id,
  start: { at: a, outward: out },
  end: { at: b, outward: out.map((v) => -v) as [number, number, number] },
  od: 0.05,
  joint: 'socket',
  price: 10,
});

describe('voxel router', () => {
  it('takes crossing lines to different levels without a clash', () => {
    const lines = [
      line('east-west', [-2, 1, 0], [2, 1, 0], [1, 0, 0]),
      line('north-south', [0, 1, -2], [0, 1, 2], [0, 0, 1]),
    ];
    const result = routeVoxelLines(room, lines);
    expect(result.problems).toEqual([]);
    expect(
      pipeClashes(
        lines.map((l) => ({
          name: l.id,
          points: result.routes.get(l.id)!,
          od: l.od,
          joint: l.joint,
        })),
      ),
    ).toEqual([]);
  });

  it('keeps a riser off a run above it', () => {
    const lines = [
      line('high', [-2, 3, 0], [2, 3, 0], [1, 0, 0]),
      line('rising', [0, 0.8, -2], [0, 3.5, 2], [0, 1, 0]),
    ];
    const result = routeVoxelLines(room, lines);
    expect(result.problems).toEqual([]);
    expect(
      pipeClashes(
        lines.map((l) => ({
          name: l.id,
          points: result.routes.get(l.id)!,
          od: l.od,
          joint: l.joint,
        })),
      ),
    ).toEqual([]);
  });

  it('keeps every segment out of a reserved box', () => {
    const box = {
      min: [-0.5, 0, -0.5] as const,
      max: [0.5, 5, 0.5] as const,
      forbids: { runs: true },
    };
    const result = routeVoxelLines({ ...room, regions: [box] }, [
      line('detour', [-2, 1, 0], [2, 1, 0], [1, 0, 0]),
    ]);
    expect(result.problems).toEqual([]);
    const points = result.routes.get('detour')!;
    expect(
      points.some(
        (p) => p[0] > -0.5 && p[0] < 0.5 && p[2] > -0.5 && p[2] < 0.5,
      ),
    ).toBe(false);
  });
});
