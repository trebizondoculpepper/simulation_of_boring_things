import { describe, expect, it } from 'vite-plus/test';
import { roomPipes } from '../../toolkit/gallery/logic/room-pipes';
import { applyAction, newWorld } from '../world';
import {
  INSTALLED_VALVES,
  installedValveByCommandId,
  installedValveFor,
  newInstalledValveStates,
} from './installed-valves';
import { plantInventory } from './equipment-catalogue';

const ROOMS = ['plant_pool_01', 'plant_pool_02', 'wet_hall', 'boiler_house'];

describe('installed pipework valves', () => {
  it('has exactly one permanent identity and display tag for every drawn valve', () => {
    const seen = new Set<string>();
    for (const room of ROOMS)
      for (const run of roomPipes(room))
        for (const valve of run.valves) {
          const installed = installedValveFor(room, run.name, valve.name);
          expect(seen.has(installed.assetId)).toBe(false);
          seen.add(installed.assetId);
        }
    expect(seen.size).toBe(Object.keys(INSTALLED_VALVES).length);
    expect(
      new Set(Object.values(INSTALLED_VALVES).map((v) => v.tag)).size,
    ).toBe(seen.size);
    expect(
      new Set(Object.values(INSTALLED_VALVES).map((v) => v.assetId)).size,
    ).toBe(seen.size);
    for (const valve of Object.values(INSTALLED_VALVES)) {
      expect(installedValveByCommandId(valve.assetId)).toBe(valve);
      expect(installedValveByCommandId(valve.tag)).toBe(valve);
    }
  });

  it('keeps the valve position in world state by asset ID and exposes it in the inventory', () => {
    const installed = installedValveFor(
      'plant_pool_02',
      'Filter 1 inlet drop',
      'F1 inlet valve',
    );
    const start = newWorld();
    expect(start.installedValves).toEqual(newInstalledValveStates());
    const closed = applyAction(start, {
      type: 'plant/valve',
      id: installed.assetId,
      open: false,
    });
    expect(closed.installedValves[installed.assetId]).toBe(false);
    expect(start.installedValves[installed.assetId]).toBe(true);
    expect(
      plantInventory(closed.identifiedPlant, closed.installedValves).find(
        (part) => part.id === installed.tag,
      )?.state,
    ).toEqual({ open: false });
  });
});
