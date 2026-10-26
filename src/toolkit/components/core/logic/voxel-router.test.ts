import { describe, expect, it } from 'vite-plus/test';
import { pipeClashes } from './pipe-route';
import { neverRises, routeVoxelLines } from './voxel-router';
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

describe('gravity lines (prompt 065)', () => {
  /** A drain from a nozzle high on one side to a gully on the far side, with a box between. */
  const drain = (gravity: boolean): RouterLine => ({
    id: 'drain',
    start: { at: [-2, 1.5, 0], outward: [1, 0, 0] },
    end: { at: [2, 0.2, 0], outward: [0, 1, 0] },
    od: 0.05,
    joint: 'socket',
    price: 10,
    ...(gravity ? { gravity: true as const } : {}),
  });
  type Box = [number, number, number];
  const obstacle = {
    min: [-0.5, 0, -0.6] as Box,
    max: [0.5, 1.8, 0.6] as Box,
  };
  const rises = (points: readonly (readonly number[])[]) =>
    points.some((p, i) => i > 0 && p[1] > points[i - 1][1] + 1e-9);

  it('routes a gravity line round an obstacle, never rising', () => {
    const result = routeVoxelLines({ ...room, obstacles: [obstacle] }, [
      drain(true),
    ]);
    expect(result.problems).toEqual([]);
    const points = result.routes.get('drain')!;
    expect(rises(points)).toBe(false);
    expect(neverRises(points)).toBe(true);
  });

  it('refuses a gravity line whose end is above its start', () => {
    const up: RouterLine = {
      ...drain(true),
      start: { at: [2, 0.2, 0], outward: [0, 1, 0] },
      end: { at: [-2, 1.5, 0], outward: [1, 0, 0] },
    };
    const result = routeVoxelLines(room, [up]);
    expect(result.routes.has('drain')).toBe(false);
    expect(result.problems).toEqual([
      'drain: a gravity line whose end is not below its start',
    ]);
  });

  it('still lets an ordinary line between the same ends rise over the obstacle', () => {
    const result = routeVoxelLines({ ...room, obstacles: [obstacle] }, [
      drain(false),
    ]);
    expect(result.problems).toEqual([]);
    expect(rises(result.routes.get('drain')!)).toBe(true);
  });
});
