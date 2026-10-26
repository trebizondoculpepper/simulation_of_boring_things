import { signal } from '@preact/signals-core';
import { afterEach, expect, it, vi } from 'vite-plus/test';
import { AmbientLight, Group, PointLight } from 'three';
import { applyAction, newWorld } from '../../../game/world';
import type { WorldAction } from '../../../game/world';
import { zoneOfRoom } from '../../../game/plant/lighting';
import {
  addWallBatten,
  createWallBattenMaterials,
} from '../../../scene/wall-batten';
import { bindRoomLights } from './room-lights';

const store = { world: signal(newWorld()) };
vi.mock('../../save/world-store', () => ({ roomWorld: () => store }));
afterEach(() => vi.unstubAllGlobals());

it('switches the tank hall’s illumination and real batten diffusers with the plant circuit and main supply, then restores them', () => {
  vi.stubGlobal('window', {});
  expect(zoneOfRoom('tank_hall')).toBe('plant_pool_02');
  const scene = new Group();
  const point = new PointLight('#fff', 3);
  const fill = new AmbientLight('#fff', 0.12);
  scene.add(point, fill);
  const materials = createWallBattenMaterials();
  addWallBatten(scene, materials, 0, 2.7, 0, 'x');
  const baseGlow = materials.diffuser.emissiveIntensity;
  const lights = bindRoomLights(scene, zoneOfRoom('tank_hall'));
  const actions: WorldAction[] = [
    { type: 'lighting/supply', on: false },
    { type: 'lighting/zone', zone: 'plant_pool_02', on: false },
    { type: 'plant/feeder', room: 'switch_room', on: false },
  ];
  for (const action of actions) {
    store.world.value = newWorld();
    lights.update(0);
    expect(point.intensity).toBe(3);
    expect(fill.intensity).toBe(0.12);
    expect(materials.diffuser.emissiveIntensity).toBe(baseGlow);
    store.world.value = applyAction(store.world.value, action);
    lights.update(0.1);
    // Normal lighting goes out; the shared binder may retain a dim emergency share.
    expect(point.intensity).toBeLessThan(3);
    expect(fill.intensity).toBeLessThan(0.12);
    expect(materials.diffuser.emissiveIntensity).toBeLessThan(baseGlow);
  }
  store.world.value = newWorld();
  lights.update(0.1);
  expect(point.intensity).toBe(3);
  expect(materials.diffuser.emissiveIntensity).toBe(baseGlow);
  for (const material of Object.values(materials)) material.dispose();
});
