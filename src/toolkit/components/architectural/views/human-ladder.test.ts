import { describe, expect, it } from 'vite-plus/test';
import { Group } from 'three';
import { createHumanLadder, humanLadderZones } from './human-ladder';

describe('human ladder placement', () => {
  it('transforms a rotated, scaled ladder and gates the matching zone', () => {
    const room = new Group();
    room.scale.setScalar(2);
    const ladder = createHumanLadder('pool', 1);
    ladder.group.position.set(3, 0, -4);
    ladder.group.rotation.y = Math.PI / 2;
    room.add(ladder.group);
    expect(humanLadderZones(room, () => -1.8)[0]).toMatchObject({
      bottom: -1.8,
      top: 0,
    });
    ladder.setEnabled(() => false);
    expect(humanLadderZones(room)).toEqual([]);
  });
});
