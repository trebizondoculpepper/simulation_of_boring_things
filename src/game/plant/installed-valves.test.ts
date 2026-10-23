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
      'plant_pool_01',
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

  it('attaches every registered valve to exactly one authored route and catalogue entry', () => {
    const world = newWorld();
    const inventory = plantInventory(
      world.identifiedPlant,
      world.installedValves,
    );
    const authored = ROOMS.flatMap((room) =>
      roomPipes(room).flatMap((run) =>
        run.valves.map((valve) => ({ room, run, valve })),
      ),
    );
    const offRoute: string[] = [];
    for (const [key, installed] of Object.entries(INSTALLED_VALVES)) {
      const matches = authored.filter(
        ({ room, run, valve }) => `${room}|${run.name}|${valve.name}` === key,
      );
      expect(matches, key).toHaveLength(1);
      const { run, valve } = matches[0];
      const onRoute = run.points.slice(1).some((end, index) => {
        const start = run.points[index];
        return [0, 1, 2].every((coordinate) => {
          const low = Math.min(start[coordinate], end[coordinate]) - 1e-3;
          const high = Math.max(start[coordinate], end[coordinate]) + 1e-3;
          return valve.at[coordinate] >= low && valve.at[coordinate] <= high;
        });
      });
      if (!onRoute) offRoute.push(key);
      expect(
        inventory.filter(
          (entry) =>
            entry.assetId === installed.assetId && entry.id === installed.tag,
        ),
        `${key} has one inventory row`,
      ).toHaveLength(1);
      expect(world.installedValves[installed.assetId]).toBe(
        installed.normal === 'open',
      );
      const toggled = applyAction(world, {
        type: 'plant/valve',
        id: installed.assetId,
        open: installed.normal !== 'open',
      });
      expect(toggled.installedValves[installed.assetId]).toBe(
        installed.normal !== 'open',
      );
    }
    expect(offRoute, 'valves drawn away from their assigned pipe runs').toEqual(
      [],
    );
  });
});
