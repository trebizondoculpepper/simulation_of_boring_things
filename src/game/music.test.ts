import { expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from './world';
import { deserialiseWorld, serialiseWorld } from './save';

it('saves the source and amplifier and pauses the transport when the jacuzzi feeder loses power', () => {
  let w = applyAction(newWorld(), {
    type: 'music',
    action: { type: 'toggle', zone: 'jacuzzi' },
  });
  w = applyAction(w, {
    type: 'music',
    action: { type: 'volume', zone: 'jacuzzi', volume: 0.7 },
  });
  w = advance(w, 0.5);
  expect(w.music.zones.jacuzzi.source.position).toBeCloseTo(0.5);
  const loaded = deserialiseWorld(serialiseWorld(w, 123));
  expect(loaded.ok && loaded.world.music).toEqual(w.music);
  w = applyAction(w, {
    type: 'plant/feeder',
    room: 'plant_pool_03',
    on: false,
  });
  w = advance(w, 0.5);
  expect(w.music.zones.jacuzzi.source.position).toBeCloseTo(0.5);
  expect(w.music.zones.jacuzzi.amplifier).toEqual({ on: true, volume: 0.7 });
  w = applyAction(w, { type: 'plant/feeder', room: 'plant_pool_03', on: true });
  w = applyAction(w, {
    type: 'music',
    action: { type: 'skip', zone: 'jacuzzi' },
  });
  expect(w.music.zones.jacuzzi.source).toEqual({ track: 1, position: 0 });
  expect(advance(w, 0.5).music.zones.jacuzzi.source.position).toBeCloseTo(0.5);
});

it('migrates a version 23 save to silent music without losing existing plant state', () => {
  const { music: _music, ...previous } = newWorld();
  previous.demo.on = true;
  const loaded = deserialiseWorld(
    JSON.stringify({
      format: 'pool-plant-save',
      version: 23,
      savedAt: 10,
      world: previous,
    }),
  );
  expect(loaded.ok && loaded.world.music).toEqual(newWorld().music);
  expect(loaded.ok && loaded.world.demo.on).toBe(true);
});
