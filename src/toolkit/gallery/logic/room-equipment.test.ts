import { describe, expect, it } from 'vite-plus/test';
import type { Footprint } from '../../controls/logic/walk-collision';
import { EQUIPPED_ROOMS, layoutRoom } from './room-equipment';
import type { Placed, RoomBox } from './room-equipment';
import {
  pipeObstacles,
  roomIsolators,
  roomPipes,
  standFootprint,
} from './room-pipes';

/** A walker's half-width, metres: as the controls have it, near enough. */
const RADIUS = 0.3;
const CELL = 0.1;

const inside = (f: Footprint, x: number, z: number, by = 0) =>
  x > f.minX - by && x < f.maxX + by && z > f.minZ - by && z < f.maxZ + by;

/**
 * Where a walker can stand, on a grid: in the room, clear of every
 * machine (but a walkable bay) and of the solid floor, by its radius; and
 * which of those cells it can reach from the room's way in.
 */
/** How far from where one stands a hand reaches, in plan: shoulder and arm. */
const REACH_ARM = 0.8;

function walkable(
  box: RoomBox,
  placed: Placed[],
  extra: readonly Footprint[] = [],
) {
  const hw = box.w / 2;
  const hd = box.d / 2;
  const nx = Math.round(box.w / CELL);
  const nz = Math.round(box.d / CELL);
  const obstacles = [
    ...placed
      .filter((p) => p.item.mount === 'floor' && !p.item.walkable)
      .map((p) => p.footprint),
    ...box.solid,
    ...extra,
  ];
  const at = (i: number, k: number) => ({
    x: -hw + (i + 0.5) * CELL,
    z: -hd + (k + 0.5) * CELL,
  });
  const free = (i: number, k: number) => {
    const { x, z } = at(i, k);
    if (
      x < -hw + RADIUS ||
      x > hw - RADIUS ||
      z < -hd + RADIUS ||
      z > hd - RADIUS
    )
      return false;
    return !obstacles.some((f) => inside(f, x, z, RADIUS));
  };
  const reached = new Uint8Array(nx * nz);
  const cellOf = (x: number, z: number) => [
    Math.floor((x + hw) / CELL),
    Math.floor((z + hd) / CELL),
  ];
  const [i0, k0] = cellOf(box.entry.x, box.entry.z);
  expect(free(i0, k0), 'the way in is clear').toBe(true);
  const queue = [[i0, k0]];
  reached[k0 * nx + i0] = 1;
  while (queue.length) {
    const [i, k] = queue.pop()!;
    for (const [di, dk] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const a = i + di;
      const b = k + dk;
      if (a < 0 || b < 0 || a >= nx || b >= nz || reached[b * nx + a]) continue;
      if (!free(a, b)) continue;
      reached[b * nx + a] = 1;
      queue.push([a, b]);
    }
  }
  /** Whether any reached cell lies in `f`. */
  return (f: Footprint) => {
    for (let k = 0; k < nz; k++)
      for (let i = 0; i < nx; i++) {
        if (!reached[k * nx + i]) continue;
        const { x, z } = at(i, k);
        if (inside(f, x, z)) return true;
      }
    return false;
  };
}

describe.each(EQUIPPED_ROOMS)('%s', (room) => {
  const layout = layoutRoom(room)!;

  it('has room for every machine', () => {
    expect(layout.failed.map((i) => i.label)).toEqual([]);
  });

  it('keeps every machine clear of the others, the walls, the doors and the stairs', () => {
    const { box, placed } = layout;
    const floor = placed.filter((p) => p.item.mount === 'floor');
    for (const p of floor) {
      expect(p.footprint.minX, p.item.label).toBeGreaterThanOrEqual(
        -box.w / 2 - 1e-9,
      );
      expect(p.footprint.maxX, p.item.label).toBeLessThanOrEqual(
        box.w / 2 + 1e-9,
      );
      expect(p.footprint.minZ, p.item.label).toBeGreaterThanOrEqual(
        -box.d / 2 - 1e-9,
      );
      expect(p.footprint.maxZ, p.item.label).toBeLessThanOrEqual(
        box.d / 2 + 1e-9,
      );
      for (const b of [...box.keepClear, ...box.solid])
        expect(
          p.footprint.maxX <= b.minX + 1e-9 ||
            p.footprint.minX >= b.maxX - 1e-9 ||
            p.footprint.maxZ <= b.minZ + 1e-9 ||
            p.footprint.minZ >= b.maxZ - 1e-9,
          `${p.item.label} in a doorway or on the stair`,
        ).toBe(true);
      for (const q of floor) {
        if (q === p) continue;
        const apart =
          p.footprint.maxX <= q.footprint.minX + 1e-9 ||
          p.footprint.minX >= q.footprint.maxX - 1e-9 ||
          p.footprint.maxZ <= q.footprint.minZ + 1e-9 ||
          p.footprint.minZ >= q.footprint.maxZ - 1e-9;
        expect(apart, `${p.item.label} overlaps ${q.item.label}`).toBe(true);
      }
    }
  });

  it('can be walked about, from the door to the front of every machine and panel', () => {
    const { box, placed } = layout;
    // The room's low pipework is in the way too.
    const reaches = walkable(box, placed, [
      ...pipeObstacles(roomPipes(room)),
      ...roomIsolators(room).stands.map(standFootprint),
    ]);
    // Every isolator, too: someone can stand in front of it.
    for (const iso of roomIsolators(room).isolators)
      expect(
        reaches({
          minX: Math.min(iso.at[0], iso.at[0] + iso.facing[0] * 0.9) - 0.4,
          maxX: Math.max(iso.at[0], iso.at[0] + iso.facing[0] * 0.9) + 0.4,
          minZ: Math.min(iso.at[2], iso.at[2] + iso.facing[2] * 0.9) - 0.4,
          maxZ: Math.max(iso.at[2], iso.at[2] + iso.facing[2] * 0.9) + 0.4,
        }),
        `${iso.name} out of reach`,
      ).toBe(true);
    for (const p of placed)
      expect(reaches(p.access), `${p.item.label} out of reach`).toBe(true);
  });

  it('puts every valve within an arm’s reach of somewhere to stand', () => {
    const { box, placed } = layout;
    const reaches = walkable(box, placed, [
      ...pipeObstacles(roomPipes(room)),
      ...roomIsolators(room).stands.map(standFootprint),
    ]);
    // Standing (the middle of one's body) within REACH_ARM of it in plan:
    // a lever, or a chain wheel's chain, comes to hand.
    const out = roomPipes(room)
      .flatMap((r) => r.valves)
      // A solenoid valve is operated from its local mimic; its actuator
      // need not be reachable from the floor beside a pump.
      .filter((v) => v.operator === 'lever' || v.operator === 'chain')
      .filter(
        (v) =>
          !reaches({
            minX: v.at[0] - REACH_ARM,
            maxX: v.at[0] + REACH_ARM,
            minZ: v.at[2] - REACH_ARM,
            maxZ: v.at[2] + REACH_ARM,
          }),
      )
      .map((v) => `${v.name} at ${v.at.map((n) => n.toFixed(2)).join(', ')}`);
    expect(out, 'out of reach').toEqual([]);
  });

  it('hangs every panel within reach, between knee and head height', () => {
    for (const p of layout.placed.filter((q) => q.item.mount === 'wall')) {
      const y = p.y;
      const floorY = 0;
      expect(y - floorY, p.item.label).toBeGreaterThanOrEqual(0.5);
      expect(y - floorY, p.item.label).toBeLessThanOrEqual(2.0);
    }
  });
});

import { PLANT_ROOM, plantRoomPlan } from './plant-rooms';
import { roomEquipment } from './room-equipment';

describe('the balance tanks', () => {
  it('stand below their pools’ decks, so the overflow falls to them', () => {
    for (const room of ['plant_pool_01']) {
      const tank = roomEquipment(room)!.items.find((i) =>
        i.key.startsWith('balance-tank'),
      )!;
      expect(tank.h, room).toBeLessThan(PLANT_ROOM.storey);
    }
  });
});

describe('the Olympic plant room, redone (prompt 033)', () => {
  it('stands its fifteen machines and panels as its plan has them, in a room of 22 × 14 m, plumbed', () => {
    const layout = layoutRoom('plant_pool_02')!;
    expect(layout.placed).toHaveLength(15);
    expect([layout.box.w, layout.box.d]).toEqual([22, 14]);
    expect(roomPipes('plant_pool_02').length).toBeGreaterThan(40);
  });

  it('keeps the square template rooms without balance tank doors', () => {
    expect(plantRoomPlan('large').tankDoor).toBeNull();
  });
});
