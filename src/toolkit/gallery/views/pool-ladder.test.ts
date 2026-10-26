import { describe, expect, it } from 'vite-plus/test';
import { Group } from 'three';
import {
  createHumanLadder,
  humanLadderZones,
} from '../../components/architectural/views/human-ladder';

describe('pool ladder movement zones', () => {
  it('follows a rotated, scaled ladder and uses the actual pool floor', () => {
    const room = new Group();
    room.scale.setScalar(2);
    const ladder = createHumanLadder('pool', 1).group;
    ladder.position.set(3, 0, -4);
    ladder.rotation.y = Math.PI / 2;
    room.add(ladder);
    const [zone] = humanLadderZones(room, () => -1.8);
    expect(zone.bottom).toBe(-1.8);
    expect(zone.top).toBe(0);
    expect(zone.rung.x).toBeCloseTo(6);
    expect(zone.rung.z).toBeCloseTo(-8.32);
    expect(zone.topExit.z).toBeGreaterThan(zone.bottomExit.z);
  });
});
