import { expect, it } from 'vite-plus/test';
import { layoutRoom } from './room-equipment';
import { JACUZZI_MUSIC_CABINET as c } from './jacuzzi-music';
import { jacuzziSpeakerMounts } from './jacuzzi-music';
import { POOL_HALLS } from './pool-halls';
it('keeps the north-wall music cabinet and its access clear of doors, stairs, mimic and jacuzzi plant', () => {
  const layout = layoutRoom('plant_pool_03')!;
  const overlaps = (
    a: typeof c.footprint | typeof c.access,
    b: { minX: number; maxX: number; minZ: number; maxZ: number },
  ) => a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
  for (const box of [c.footprint, c.access]) {
    expect(box.maxX).toBeLessThanOrEqual(layout.box.w / 2);
    expect(box.maxZ).toBeLessThanOrEqual(layout.box.d / 2);
    for (const reserved of [
      ...layout.box.keepClear,
      ...layout.box.solid,
      ...layout.placed.flatMap((p) => [p.footprint, p.access]),
    ])
      expect(overlaps(box, reserved)).toBe(false);
  }
});

it('puts speakers in the two west-side corners above the tile line, wired through concrete and aimed at the jacuzzi', () => {
  const mounts = jacuzziSpeakerMounts();
  const hall = POOL_HALLS.pool_03;
  expect(mounts).toHaveLength(2);
  expect(mounts[0].z).toBeGreaterThan(3);
  expect(mounts[1].z).toBeLessThan(-3);
  for (const m of mounts) {
    expect(m.x).toBeLessThan(-hall.w / 2 + 0.2);
    expect(m.y - 0.238 / 2).toBeGreaterThan(hall.tileTop);
    expect(m.wireFrom[0]).toBeCloseTo(-hall.w / 2, 2);
    expect(m.wireFrom[1]).toBeGreaterThan(m.y);
    const dx = Math.sin(m.yaw) * Math.cos(m.pitch);
    const dz = Math.cos(m.yaw) * Math.cos(m.pitch);
    const t = (-2.7 - m.x) / dx;
    expect(t).toBeGreaterThan(0);
    expect(m.z + t * dz).toBeCloseTo(0, 6);
    expect(m.y - t * Math.sin(m.pitch)).toBeCloseTo(1.1, 6);
  }
});
