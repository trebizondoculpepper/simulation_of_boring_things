import { expect, it } from 'vite-plus/test';
import {
  JACUZZI_DRAIN_AT_DOOR,
  JACUZZI_DRAIN_TO_DOOR,
  jacuzziApproachGain,
  jacuzziDrainDoorGain,
} from './jacuzzi-acoustics';
import { carry, roomCorridors } from './pool-loop';
import { pieceLength } from '../../components/architectural/logic/corridor-path';

const direction = [
  [1, 0],
  [0, -1],
  [-1, 0],
  [0, 1],
] as const;
it.each([
  ['pool_02', 'pool_03'],
  ['pool_03', 'pool_04'],
] as const)(
  'preserves music gain across %s → %s corridor-copy handovers',
  (from, to) => {
    const a = roomCorridors(from).leaving;
    const b = roomCorridors(to).arriving;
    for (const p of a.placed) {
      const [dx, dz] = direction[p.heading];
      const point = {
        x: p.x + dx * pieceLength(p.piece) * 0.5,
        z: p.z + dz * pieceLength(p.piece) * 0.5,
        y: p.y,
        yaw: 0,
      };
      const other = carry(point, a, b);
      expect(jacuzziApproachGain(from, point.x, point.z)).toBeCloseTo(
        jacuzziApproachGain(to, other.x, other.z),
        8,
      );
    }
  },
);
it('gets louder down the Olympic stairs and is fully audible before entering the jacuzzi', () => {
  const route = roomCorridors('pool_02').leaving;
  const stairs = route.placed.find((p) => p.piece.kind === 'stairs')!;
  const [dx, dz] = direction[stairs.heading];
  const gain = (distance: number) =>
    jacuzziApproachGain(
      'pool_02',
      stairs.x + dx * distance,
      stairs.z + dz * distance,
    );
  expect(gain(pieceLength(stairs.piece) - 0.05)).toBeGreaterThan(gain(0.05));
  expect(gain(0.05)).toBeGreaterThan(0);
  const last = route.placed.at(-1)!;
  const [lx, lz] = direction[last.heading];
  const distance = pieceLength(last.piece) - 0.5;
  expect(
    jacuzziApproachGain(
      'pool_02',
      last.x + lx * distance,
      last.z + lz * distance,
    ),
  ).toBe(1);
  expect(jacuzziApproachGain('pool_03', -2.7, 0)).toBe(1);
  expect(jacuzziApproachGain('plant_pool_03', 0, 0)).toBe(0);
});
it('grows louder toward the jacuzzi through the rotunda approach', () => {
  const route = roomCorridors('pool_04').arriving;
  const first = route.placed[0];
  const last = route.placed.at(-1)!;
  const [fx, fz] = direction[first.heading];
  const [lx, lz] = direction[last.heading];
  expect(
    jacuzziApproachGain('pool_04', first.x + fx * 0.5, first.z + fz * 0.5),
  ).toBe(1);
  expect(
    jacuzziApproachGain('pool_04', last.x + lx * 0.5, last.z + lz * 0.5),
  ).toBeLessThan(1);
});
it('attenuates a closed-door drain by exactly 30 dB and opens smoothly', () => {
  expect(20 * Math.log10(jacuzziDrainDoorGain(0))).toBeCloseTo(-30, 8);
  expect(jacuzziDrainDoorGain(0.15)).toBeGreaterThan(jacuzziDrainDoorGain(0));
  expect(jacuzziDrainDoorGain(0.35)).toBe(1);
});

it('hears the drain quieter at the hall door than at its tundish, across the plant room', () => {
  expect(JACUZZI_DRAIN_TO_DOOR).toBeGreaterThan(4);
  expect(JACUZZI_DRAIN_TO_DOOR).toBeLessThan(12);
  expect(JACUZZI_DRAIN_AT_DOOR).toBeLessThan(0.3);
  // Even with the door wide open, the hall never hears it at full level.
  expect(JACUZZI_DRAIN_AT_DOOR * jacuzziDrainDoorGain(1)).toBeLessThan(0.3);
});
