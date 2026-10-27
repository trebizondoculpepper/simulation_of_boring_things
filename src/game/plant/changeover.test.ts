import { describe, expect, it } from 'vite-plus/test';
import {
  CHANGEOVER_POSITIONS,
  changeoverStatus,
  generatorAvailable,
  mainsAvailable,
  switchboardSource,
  turnChangeover,
} from './changeover';
import { newPlantServices, serviceAvailable } from './services';
import type { PlantServices } from './services';
import { applyAction, newWorld, stepWorld } from '../world';
import { siteLoadKw } from './site-intake';
import { SWITCH_ROOM_SCHEMATIC } from './switch-room-schematic';
import { LOADING_BAY_SCHEMATIC } from './back-room-schematics';

const at = (
  changeover: PlantServices['changeover'],
  power = true,
): PlantServices => ({
  ...newPlantServices(),
  changeover,
  sources: { ...newPlantServices().sources, power },
});

describe('the mains/generator changeover switch', () => {
  it('starts at I, the switchboard on the mains', () => {
    expect(newPlantServices().changeover).toBe('I');
    expect(newWorld().plant.changeover).toBe('I');
    expect(switchboardSource(newPlantServices())).toBe('mains');
  });

  it('feeds the switchboard from one supply at most, in each position', () => {
    for (const p of CHANGEOVER_POSITIONS)
      for (const power of [true, false]) {
        const source = switchboardSource(at(p, power));
        expect(source === null || ['mains', 'generator'].includes(source)).toBe(
          true,
        );
        if (p !== 'I') expect(source).not.toBe('mains');
        if (p !== 'II') expect(source).not.toBe('generator');
      }
  });

  it('in I, the mains feeds the rooms; with the main switch off, nothing', () => {
    expect(serviceAvailable(at('I'), 'plant_pool_01', 'power')).toBe(true);
    expect(serviceAvailable(at('I', false), 'plant_pool_01', 'power')).toBe(
      false,
    );
  });

  it('in 0, nothing: the rooms lose their power, the mains still available', () => {
    const plant = at('0');
    expect(switchboardSource(plant)).toBeNull();
    expect(serviceAvailable(plant, 'plant_pool_01', 'power')).toBe(false);
    expect(serviceAvailable(plant, 'switch_room', 'power')).toBe(false);
    expect(mainsAvailable(plant)).toBe(true);
  });

  it('in II, no power until a generator is modelled (GENERATOR AVAILABLE unlit)', () => {
    const plant = at('II');
    expect(generatorAvailable(plant)).toBe(false);
    expect(switchboardSource(plant)).toBeNull();
    expect(serviceAvailable(plant, 'wet_hall', 'power')).toBe(false);
    expect(changeoverStatus(plant)).toContain('GENERATOR AVAILABLE unlit');
  });

  it('turns one position at a time, through 0 (break before make), stopping at its ends', () => {
    expect(turnChangeover('I', 1)).toBe('0');
    expect(turnChangeover('0', 1)).toBe('II');
    expect(turnChangeover('II', 1)).toBe('II');
    expect(turnChangeover('II', -1)).toBe('0');
    expect(turnChangeover('I', -1)).toBe('I');
  });

  it('is turned in the world, and the site draws no mains load off I', () => {
    let w = newWorld();
    w = applyAction(w, { type: 'plant/changeover', direction: 1 });
    expect(w.plant.changeover).toBe('0');
    expect(serviceAvailable(w.plant, 'plant_pool_02', 'power')).toBe(false);
    expect(siteLoadKw(w)).toBe(0);
    w = stepWorld(w, 1);
    expect(w.plant.changeover).toBe('0');
    w = applyAction(w, { type: 'plant/changeover', direction: -1 });
    expect(w.plant.changeover).toBe('I');
    expect(siteLoadKw(w)).toBeGreaterThan(0);
  });

  it('is in the switch room model between the main switch and the switchboard, the bay’s generator cable on its II side', () => {
    const ids = SWITCH_ROOM_SCHEMATIC.nodes.map((n) => n.id);
    expect(ids).toContain('changeover');
    expect(ids).not.toContain('generator-point');
    const ends = SWITCH_ROOM_SCHEMATIC.links.map((l) => [
      `${l.sourceId}.${l.sourcePort}`,
      `${l.targetId}.${l.targetPort}`,
    ]);
    expect(ends).toContainEqual(['main-switch.out', 'changeover.mains']);
    expect(ends).toContainEqual(['changeover.out', 'switchboard.in']);
    expect(ends).toContainEqual([
      'generator-cable.out',
      'changeover.generator',
    ]);
    // The one generator connection is the loading bay's cabinet.
    expect(
      LOADING_BAY_SCHEMATIC.nodes.filter((n) => n.kind === 'generator-point'),
    ).toHaveLength(1);
  });
});
