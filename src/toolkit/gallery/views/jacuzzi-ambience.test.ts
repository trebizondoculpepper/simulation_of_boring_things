import { afterEach, expect, it, vi } from 'vite-plus/test';
import { signal } from '@preact/signals-core';
import { partAudio } from '../../components/core/audio/part-audio';
import { createJacuzziAmbience } from './jacuzzi-ambience';
const powered = signal(true);
const amplifier = signal({ on: true, volume: 0.4 });
vi.mock('./jacuzzi-music', () => ({
  bindJacuzziMusic: () => ({
    powered,
    amplifier,
    source: signal({ track: 0, position: 0 }),
  }),
}));
vi.mock('../../components/sound/audio/music-playlist', () => ({
  musicPlaylist: () => () => [],
}));
afterEach(() => vi.restoreAllMocks());
it('changes approach gain without restarting the programme at every frame or room handover', () => {
  powered.value = true;
  const gain = () => ({
    gain: { value: 0, setTargetAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  });
  const context = {
    currentTime: 0,
    createGain: gain,
  } as unknown as AudioContext;
  const hold = vi
    .spyOn(partAudio, 'hold')
    .mockImplementation((_owner, recipe) => {
      recipe?.(context, {} as AudioNode);
    });
  const music = createJacuzziAmbience();
  hold.mockClear();
  music.setGain(0.1);
  expect(hold).toHaveBeenCalledTimes(1);
  for (const level of [0.2, 0.5, 0.8, 1, 1, 0.9]) music.setGain(level);
  expect(hold).toHaveBeenCalledTimes(1);
  amplifier.value = { on: true, volume: 0.7 };
  expect(hold).toHaveBeenCalledTimes(1);
  powered.value = false;
  expect(hold).toHaveBeenLastCalledWith(expect.anything(), null);
  music.dispose();
});
