import { afterEach, expect, it, vi } from 'vite-plus/test';
import { createScenarioStore, roomWorld, setRoomWorld } from './world-store';
import { attractScenario } from '../../game/attract-scenarios';

afterEach(() => {
  setRoomWorld(null);
  vi.useRealTimers();
});

it('an attract scenario’s store acts and runs on a copy of its frozen preset, and never saves', () => {
  vi.useFakeTimers();
  const preset = attractScenario('normal');
  const store = createScenarioStore(preset);
  store.dispatch({ type: 'lighting/supply', on: false });
  expect(store.world.value.lighting.supply).toBe(false);
  expect(preset.lighting.supply).toBe(true);
  expect(store.save()).toBe(false);
  store.run(true);
  vi.advanceTimersByTime(2000);
  expect(store.world.value.time).toBeGreaterThan(preset.time);
  store.stop();
  const t = store.world.value.time;
  vi.advanceTimersByTime(2000);
  expect(store.world.value.time).toBe(t);
  store.reset();
  expect(store.world.value).toBe(preset);
});

it('rooms read the world they are given while it is set, each shot its own', () => {
  const first = createScenarioStore(attractScenario('lights-out'));
  const second = createScenarioStore(attractScenario('normal'));
  setRoomWorld(first);
  expect(roomWorld()).toBe(first);
  setRoomWorld(second);
  expect(roomWorld()).toBe(second);
  expect(roomWorld().world.value.lighting.supply).toBe(true);
});
