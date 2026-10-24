import { afterEach, expect, it, vi } from 'vite-plus/test';
import { signal } from '@preact/signals-core';
import { musicPlaylist } from './music-playlist';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function fakeAudio(events: Map<string, () => void>) {
  return {
    dataset: {},
    currentTime: 0,
    readyState: 4,
    src: '',
    play: vi.fn(async () => {}),
    pause: vi.fn(),
    load: vi.fn(),
    remove: vi.fn(),
    removeAttribute: vi.fn(),
    addEventListener: (name: string, fn: () => void) => events.set(name, fn),
    removeEventListener: (name: string) => events.delete(name),
  };
}

it('streams tracks in order, updates volume without restarting, and releases stopped media', () => {
  vi.useFakeTimers();
  const players: {
    events: Map<string, () => void>;
    audio: ReturnType<typeof fakeAudio>;
  }[] = [];
  vi.stubGlobal('document', {
    body: { append: vi.fn() },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    createElement: () => {
      const events = new Map<string, () => void>();
      const audio = fakeAudio(events);
      players.push({ events, audio });
      return audio;
    },
  });
  vi.stubGlobal('window', { setTimeout });
  const gain = {
    gain: { value: 1, setTargetAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  const input = { connect: vi.fn(() => gain), disconnect: vi.fn() };
  const context = {
    currentTime: 0,
    createGain: () => gain,
    createMediaElementSource: () => input,
  } as unknown as AudioContext;
  const tracks = ['one', 'two'].map((title) => ({
    title,
    url: new URL(`https://example.com/${title}.mp3`),
  }));
  const volume = signal(0.4);
  const title = vi.fn();
  const loop = musicPlaylist(tracks, volume, title);
  const held = loop(context, {} as AudioNode);
  const { audio, events } = players[0];
  expect(audio.src).toBe(tracks[0].url.href);
  events.get('playing')!();
  expect(title).toHaveBeenLastCalledWith('one');
  volume.value = 0.8;
  expect(audio.play).toHaveBeenCalledTimes(1);
  expect(gain.gain.setTargetAtTime).toHaveBeenLastCalledWith(
    0.8 ** 2 * 0.7,
    0,
    0.08,
  );
  events.get('ended')!();
  expect(audio.src).toBe(tracks[1].url.href);
  events.get('ended')!();
  expect(audio.src).toBe(tracks[0].url.href);
  audio.currentTime = 12;
  held[0].stop(0);
  expect(events.has('ended')).toBe(false);
  vi.advanceTimersByTime(500);
  expect(audio.pause).toHaveBeenCalledOnce();
  expect(audio.remove).toHaveBeenCalledOnce();
  expect(input.disconnect).toHaveBeenCalledOnce();
  const restarted = loop(context, {} as AudioNode);
  players[1].events.get('loadedmetadata')!();
  expect(players[1].audio.currentTime).toBe(12);
  restarted[0].stop(0);
  vi.runAllTimers();

  // A world-bound receiver joins the transport at its current track and time.
  const transport = signal({ track: 1, position: 5 });
  const bound = musicPlaylist(
    tracks,
    volume,
    title,
    transport,
  )(context, {} as AudioNode);
  const receiver = players[2];
  expect(receiver.audio.src).toBe(tracks[1].url.href);
  receiver.events.get('loadedmetadata')!();
  expect(receiver.audio.currentTime).toBe(5);
  receiver.events.get('ended')!();
  expect(receiver.audio.src).toBe(tracks[1].url.href);
  transport.value = { track: 0, position: 0 };
  expect(receiver.audio.src).toBe(tracks[0].url.href);
  bound[0].stop(0);
  const calls = receiver.audio.play.mock.calls.length;
  transport.value = { track: 1, position: 2 };
  expect(receiver.audio.play).toHaveBeenCalledTimes(calls);
  vi.runAllTimers();
});

it('recovers from an autoplay refusal on a later gesture and cancels that retry on disposal', async () => {
  vi.useFakeTimers();
  const events = new Map<string, () => void>();
  const gestures = new Map<string, () => void>();
  const audio = fakeAudio(events);
  audio.play.mockRejectedValueOnce({ name: 'NotAllowedError' });
  vi.stubGlobal('document', {
    body: { append: vi.fn() },
    createElement: () => audio,
    addEventListener: (name: string, fn: () => void) => gestures.set(name, fn),
    removeEventListener: (name: string) => gestures.delete(name),
  });
  vi.stubGlobal('window', { setTimeout });
  const gain = {
    gain: { value: 1, setTargetAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  const input = { connect: () => gain, disconnect: vi.fn() };
  const context = {
    currentTime: 0,
    createGain: () => gain,
    createMediaElementSource: () => input,
  } as unknown as AudioContext;
  const held = musicPlaylist(
    [{ title: 'One', url: new URL('https://example.com/one.mp3') }],
    signal(0.4),
    vi.fn(),
  )(context, {} as AudioNode);
  await Promise.resolve();
  expect(gestures.has('pointerdown')).toBe(true);
  gestures.get('pointerdown')!();
  expect(audio.play).toHaveBeenCalledTimes(2);
  events.get('playing')!();
  expect(gestures.size).toBe(0);
  held[0].stop(0);
  expect(gestures.size).toBe(0);
  vi.runAllTimers();
});
