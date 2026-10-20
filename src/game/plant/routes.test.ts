import { describe, expect, it } from 'vite-plus/test';
import { majorRoutes } from './routes';
import { CHAMBERS, RISERS, span } from './warren-plan';

const { routes, unrouted } = majorRoutes();
const insideRect = (
  r: { minX: number; maxX: number; minZ: number; maxZ: number },
  x: number,
  z: number,
) =>
  x >= r.minX - 1e-6 &&
  x <= r.maxX + 1e-6 &&
  z >= r.minZ - 1e-6 &&
  z <= r.maxZ + 1e-6;

describe('the major pipes and cables, routed', () => {
  it('routes every major service from its source to every machine it serves', () => {
    expect(unrouted).toEqual([]);
    expect(routes.length).toBeGreaterThanOrEqual(25);
  });

  it('runs square: every run along one axis only', () => {
    for (const r of routes)
      for (let i = 1; i < r.points.length; i++) {
        const [ax, ay, az] = r.points[i - 1];
        const [bx, by, bz] = r.points[i];
        const moved = [
          Math.abs(bx - ax) > 1e-6,
          Math.abs(by - ay) > 1e-6,
          Math.abs(bz - az) > 1e-6,
        ].filter(Boolean).length;
        expect(moved, `${r.id} at ${i}`).toBeLessThanOrEqual(1);
      }
  });

  it('stays inside rooms and risers, and never in an escape stair', () => {
    for (const r of routes) {
      expect(
        r.via.some((v) =>
          ['stair-main', 'stair-down', 'stair-roof'].includes(v),
        ),
      ).toBe(false);
      for (const [x, y, z] of r.points) {
        const inChamber = CHAMBERS.some((c) => {
          const { low, high } = span(c);
          return (
            insideRect(c.rect, x, z) &&
            y >= low - 0.01 &&
            y <= high + Math.max(c.height, 3) + 0.01
          );
        });
        const inRiser = RISERS.some((s) => insideRect(s.rect, x, z));
        expect(inChamber || inRiser, `${r.id} at ${x}, ${y}, ${z}`).toBe(true);
      }
    }
  });

  it('changes level only inside a riser that carries it (but for its drops to its machines)', () => {
    for (const r of routes)
      for (let i = 1; i < r.points.length; i++) {
        const [ax, ay, az] = r.points[i - 1];
        const [, by] = r.points[i];
        // Its first and last legs rise from and drop to its machines.
        if (i === 1 || i === r.points.length - 1) continue;
        if (Math.abs(by - ay) < 2.5) continue;
        const riser = RISERS.find((s) => insideRect(s.rect, ax, az));
        expect(riser, `${r.id} climbs outside a riser`).toBeDefined();
        expect(riser!.carries).toContain(r.medium);
      }
  });

  it('takes the heat from the basement, the power from the switch room, the chemicals from the store', () => {
    for (const r of routes.filter((x) => x.medium === 'lthw'))
      expect(r.via[0]).toBe('boiler-house');
    for (const r of routes.filter((x) => x.medium === 'power'))
      expect(r.via[0]).toBe('switch-room');
    for (const r of routes.filter((x) => x.medium === 'chemical'))
      expect(r.via[0]).toBe('chemical-store');
    for (const r of routes.filter(
      (x) => x.medium === 'drain' && x.id !== 'sewer',
    ))
      expect(r.via.at(-1)).toBe('drainage');
    // And the wastewater leaves by the utilities intake, for the sewer.
    const sewer = routes.find((x) => x.id === 'sewer')!;
    expect(sewer.via[0]).toBe('drainage');
    expect(sewer.via.at(-1)).toBe('utilities-intake');
  });
});
