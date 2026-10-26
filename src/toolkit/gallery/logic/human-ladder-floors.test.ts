import { describe, expect, it } from 'vite-plus/test';
import { BACKWASH_PIT } from '../../../game/plant/wet-hall';
import { TANK, tankHallFloorAt } from './balance-tank-hall';
import {
  WET_HALL,
  WET_HALL_LAYOUT,
  wetHallFloorAt,
  wetHallPitWalls,
} from './shell-rooms';

describe('wet maintenance ladder destinations', () => {
  it('keeps the gantry over the balance tank and its floor after descent', () => {
    const x = TANK.maxX - 0.6;
    expect(tankHallFloorAt(x, 0, 0)).toBe(0);
    expect(tankHallFloorAt(x, 0, TANK.floor)).toBe(TANK.floor);
    expect(tankHallFloorAt(TANK.maxX + 0.2, 0, TANK.floor)).toBe(0);
  });

  it('has a bounded pit floor below the wet hall deck', () => {
    const p = WET_HALL_LAYOUT.pit;
    const x = (p.minX + p.maxX) / 2;
    const z = (p.minZ + p.maxZ) / 2;
    const deck = -WET_HALL.drop;
    expect(wetHallFloorAt(x, z, deck)).toBe(deck);
    expect(wetHallFloorAt(x, z, deck - BACKWASH_PIT.depth)).toBe(
      deck - BACKWASH_PIT.depth,
    );
    expect(wetHallPitWalls(deck - BACKWASH_PIT.depth)).toHaveLength(4);
    expect(wetHallPitWalls(deck)).toEqual([]);
  });
});
