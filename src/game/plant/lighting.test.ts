import { describe, expect, it } from 'vite-plus/test';
import { applyAction, newWorld } from '../world';
import {
  LIGHTING_BOARD_WAYS,
  LIGHTING_ZONES,
  LIGHTING_ZONE_IDS,
  zoneLit,
  zoneOfRoom,
} from './lighting';

const lit = (
  w: ReturnType<typeof newWorld>,
  zone: (typeof LIGHTING_ZONE_IDS)[number],
) => zoneLit(w.plant, w.lighting, zone);

describe('the lighting’s zones', () => {
  it('are eighteen, one way each on DB-L1, the corridors one zone, with spares', () => {
    expect(LIGHTING_ZONE_IDS).toHaveLength(18);
    const ways = LIGHTING_ZONE_IDS.map((z) => LIGHTING_ZONES[z].way);
    expect(new Set(ways).size).toBe(18);
    expect(Math.max(...ways)).toBeLessThanOrEqual(LIGHTING_BOARD_WAYS);
    expect(zoneOfRoom('main_corridor')).toBe('corridors');
    expect(zoneOfRoom('pool_02_gallery')).toBe('corridors');
  });

  it('cover every room of the leisure centre once, and only the skylit halls have daylight', () => {
    const rooms = LIGHTING_ZONE_IDS.flatMap((z) => LIGHTING_ZONES[z].rooms);
    expect(new Set(rooms).size).toBe(rooms.length);
    for (const room of [
      'pool_01',
      'pool_02',
      'pool_03',
      'pool_04',
      'plant_pool_01',
      'plant_pool_02',
      'plant_pool_03',
      'plant_pool_04',
      'wet_hall',
      'boiler_house',
      'air_plant',
      'switch_room',
      'control_room',
      'engineers_office',
      'hypo_store',
      'acid_store',
      'loading_bay',
    ])
      expect(zoneOfRoom(room), room).toBeDefined();
    expect(
      LIGHTING_ZONE_IDS.filter((z) => LIGHTING_ZONES[z].daylight).sort(),
    ).toEqual(['lounge', 'olympic']);
  });

  it('are lit, and each goes out with its breaker, DB-LIGHTING, the switch room’s feeder or the main switch', () => {
    let w = newWorld();
    for (const z of LIGHTING_ZONE_IDS) expect(lit(w, z), z).toBe(true);
    w = applyAction(w, {
      type: 'lighting/zone',
      zone: 'boiler_house',
      on: false,
    });
    expect(lit(w, 'boiler_house')).toBe(false);
    expect(lit(w, 'wet_hall')).toBe(true);
    const supplyOff = applyAction(newWorld(), {
      type: 'lighting/supply',
      on: false,
    });
    const mainsOff = applyAction(newWorld(), {
      type: 'plant/source',
      utility: 'power',
      on: false,
    });
    const feederOff = applyAction(newWorld(), {
      type: 'plant/feeder',
      room: 'switch_room',
      on: false,
    });
    for (const dark of [supplyOff, mainsOff, feederOff])
      for (const z of LIGHTING_ZONE_IDS) expect(lit(dark, z), z).toBe(false);
  });

  it('all come back with FULL ON', () => {
    let w = applyAction(newWorld(), { type: 'lighting/supply', on: false });
    w = applyAction(w, { type: 'lighting/zone', zone: 'corridors', on: false });
    w = applyAction(w, { type: 'plant/full-on' });
    for (const z of LIGHTING_ZONE_IDS) expect(lit(w, z), z).toBe(true);
  });
});
