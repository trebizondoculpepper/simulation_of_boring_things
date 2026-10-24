import { expect, it } from 'vite-plus/test';
import {
  actOnZoneMusic,
  JACUZZI_DURATIONS,
  newZoneMusic,
  stepZoneMusic,
} from './music';
import { amplifierOutput } from '../../toolkit/components/sound/logic/amplifier';
it('keeps each amplifier independent, clamping volume and preserving it across off/on', () => {
  const initial = newZoneMusic();
  let s = actOnZoneMusic(initial, {
    type: 'volume',
    zone: 'jacuzzi',
    volume: 0.8,
  });
  s = actOnZoneMusic(s, { type: 'toggle', zone: 'jacuzzi' });
  expect(amplifierOutput(s.zones.jacuzzi.amplifier, true)).toBe(0.8);
  expect(amplifierOutput(s.zones.jacuzzi.amplifier, false)).toBe(0);
  expect(s.zones.olympic).toBe(initial.zones.olympic);
  s = actOnZoneMusic(s, { type: 'toggle', zone: 'jacuzzi' });
  expect(s.zones.jacuzzi.amplifier.volume).toBe(0.8);
  expect(amplifierOutput(s.zones.jacuzzi.amplifier, true)).toBe(0);
  expect(
    actOnZoneMusic(s, { type: 'volume', zone: 'jacuzzi', volume: 3 }).zones
      .jacuzzi.amplifier.volume,
  ).toBe(1);
});
it('advances the powered source even with its amplifier off, stopping on power loss', () => {
  const s = newZoneMusic();
  const next = stepZoneMusic(s, JACUZZI_DURATIONS[0] + 3, true);
  expect(next.zones.jacuzzi.source).toEqual({ track: 1, position: 3 });
  expect(stepZoneMusic(next, 500, false)).toBe(next);
  expect(next.zones.jacuzzi.amplifier.on).toBe(false);
});
it('skips and wraps tracks, resets position, and handles a long unattended advance', () => {
  let s = stepZoneMusic(newZoneMusic(), 20, true);
  for (let i = 0; i < 6; i++)
    s = actOnZoneMusic(s, { type: 'skip', zone: 'jacuzzi' });
  expect(s.zones.jacuzzi.source).toEqual({ track: 0, position: 0 });
  const cycle = JACUZZI_DURATIONS.reduce((a, b) => a + b, 0);
  const next = stepZoneMusic(s, cycle * 100 + JACUZZI_DURATIONS[0] + 10, true);
  expect(next.zones.jacuzzi.source.track).toBe(1);
  expect(next.zones.jacuzzi.source.position).toBeCloseTo(10, 5);
});
