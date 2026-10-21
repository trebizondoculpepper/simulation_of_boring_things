import { describe, expect, it } from 'vite-plus/test';
import { doorwayStops, overlaps } from './doorway';

const leaf = { minX: -1, maxX: 1, minZ: 0, maxZ: 0.2 };
const beyond = { minX: -1, maxX: 1, minZ: 0.2, maxZ: 0.4 };

describe('a doorway between scenes', () => {
  it('bars the way while shut, but never shuts a walker in', () => {
    expect(
      doorwayStops({ inside: false, shut: true, seen: true }, leaf, beyond),
    ).toEqual([leaf]);
    expect(
      doorwayStops({ inside: true, shut: true, seen: true }, leaf, beyond),
    ).toEqual([]);
    expect(
      doorwayStops({ inside: false, shut: false, seen: true }, leaf, beyond),
    ).toEqual([]);
  });

  it('stops a walker short of the room beyond until it is seen', () => {
    expect(
      doorwayStops({ inside: true, shut: false, seen: false }, leaf, beyond),
    ).toEqual([beyond]);
    expect(overlaps(leaf, 0, -0.2, 0.25)).toBe(true);
    expect(overlaps(leaf, 0, -0.3, 0.25)).toBe(false);
  });
});
