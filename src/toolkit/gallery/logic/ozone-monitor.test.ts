import { describe, expect, it } from 'vite-plus/test';
import { layoutRoom } from './room-equipment';
import { pipeObstacles, roomPipes } from './room-pipes';
import { MONITOR_POST, ozoneMonitorPlace } from './ozone-monitor';

describe('a plant room’s ozone monitor', () => {
  for (const room of ['plant_pool_01']) {
    it(`stands on its own post by ${room}’s generator, clear of its pipework`, () => {
      const place = ozoneMonitorPlace(room);
      expect(place).not.toBeNull();
      const generator = layoutRoom(room)!.placed.find((p) =>
        p.item.key.startsWith('ozone-generator'),
      )!;
      // Off one end of the generator, near it.
      expect(Math.abs(place!.x)).toBeGreaterThan(generator.item.w / 2);
      expect(Math.abs(place!.x)).toBeLessThan(generator.item.w / 2 + 2.1);
      const cx = generator.x + Math.cos(generator.yaw) * place!.x;
      const cz = generator.z - Math.sin(generator.yaw) * place!.x;
      const h = MONITOR_POST / 2;
      for (const o of pipeObstacles(roomPipes(room)))
        expect(
          cx + h <= o.minX ||
            cx - h >= o.maxX ||
            cz + h <= o.minZ ||
            cz - h >= o.maxZ,
        ).toBe(true);
    });
  }

  it('has no place in a room with no generator', () => {
    expect(ozoneMonitorPlace('plant_pool_04')).toBeNull();
  });
});
