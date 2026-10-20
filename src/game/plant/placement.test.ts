import { describe, expect, it } from 'vite-plus/test';
import { ATTRACTIONS, buildGraph } from './inventory';
import {
  LEVELS,
  LEVEL_HEIGHT,
  allPlaced,
  placements,
  served,
  stairs,
} from './placement';

const list = placements();
const at = (room: string) => list.find((p) => p.room === room)!;
const height = (room: string) => LEVEL_HEIGHT[at(room).level];
const { nodes, edges } = buildGraph();
const where = (id: string) => nodes.find((n) => n.id === id)?.in ?? id;

describe('how the plant rooms are arranged', () => {
  it('places every room of the inventory', () => {
    expect(allPlaced(list)).toBe(true);
  });

  it('puts what serves everything in the middle, and what serves one attraction at the edge', () => {
    for (const a of ATTRACTIONS) {
      expect(at(`plant-${a.id}`).ring).toBe('peripheral');
      expect(at(`plant-${a.id}`).serves).toBe(1);
    }
    for (const room of [
      'boiler-house',
      'switch-room',
      'chemical-store',
      'balance-tanks',
    ])
      expect(at(room).ring).toBe('core');
    expect(served('boiler-house').size).toBe(ATTRACTIONS.length);
  });

  it('puts what must reach the outside world on the outer edge', () => {
    for (const room of [
      'loading-bay',
      'utilities-intake',
      'make-up',
      'air-plant',
    ])
      expect(at(room).ring).toBe('outer');
  });

  it('lets the pools overflow into their balance tanks by gravity: every tank below its water', () => {
    for (const e of edges.filter(
      (e) => e.medium === 'pool-water' && e.to.startsWith('balance-'),
    )) {
      expect(nodes.find((n) => n.id === e.from)?.kind).toBe('water');
      // Pools' water is at the decks (0); their tanks are below.
      expect(height(where(e.to))).toBeLessThan(0);
    }
    // And the break tank feeds them from above.
    expect(height('make-up')).toBeGreaterThan(height('balance-tanks'));
  });

  it('drains everything downhill: the drainage lowest of all', () => {
    // Everything drains downhill to the drainage; only its pumping station
    // lifts the wastewater out, up its rising main to the sewer.
    for (const e of edges.filter(
      (e) => e.medium === 'drain' && e.from !== 'backwash-tank',
    ))
      expect(height(where(e.to))).toBeLessThanOrEqual(height(where(e.from)));
    expect(height('drainage')).toBe(
      Math.min(...list.map((p) => LEVEL_HEIGHT[p.level])),
    );
  });

  it('keeps the electrics above the wet plant, and the chemicals out of the basement, by the loading bay', () => {
    for (const p of list.filter(
      (p) => p.room.startsWith('plant-') || p.room === 'balance-tanks',
    ))
      expect(height('switch-room')).toBeGreaterThan(LEVEL_HEIGHT[p.level]);
    expect(at('chemical-store').level).not.toBe('basement');
    expect(at('chemical-store').level).toBe(at('loading-bay').level);
  });

  it('puts the air handling at the top and the boilers below, their flue rising past everything', () => {
    expect(at('air-plant').level).toBe('roof');
    expect(at('boiler-house').level).toBe('basement');
  });

  it('joins every level by stairs, and brings deliveries to every room that needs them by hoist', () => {
    const flights = stairs();
    expect(flights).toHaveLength(LEVELS.length - 1);
    for (let i = 1; i < LEVELS.length; i++)
      expect(flights).toContainEqual({ from: LEVELS[i - 1], to: LEVELS[i] });
    for (const a of ATTRACTIONS) expect(at(`plant-${a.id}`).hoist).toBe(true);
    expect(at('chemical-store').hoist).toBe(true);
  });

  it('says why each room is where it is', () => {
    for (const p of list) expect(p.why.length).toBeGreaterThan(10);
  });
});
