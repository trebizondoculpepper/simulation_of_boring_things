import { expect, it, vi } from 'vite-plus/test';
import { createRoomModuleCache } from './room-module-cache';

it('shares a background import with a doorway request without starting the room', async () => {
  const start = vi.fn();
  let finish!: (starter: typeof start) => void;
  const load = vi.fn(
    () =>
      new Promise<typeof start>((resolve) => {
        finish = resolve;
      }),
  );
  const cached = createRoomModuleCache(load);
  const background = cached('plant');
  const doorway = cached('plant');
  expect(doorway).toBe(background);
  expect(load).toHaveBeenCalledTimes(1);
  finish(start);
  expect(await doorway).toBe(start);
  expect(await cached('plant')).toBe(start);
  expect(start).not.toHaveBeenCalled();
});

it('retries a failed speculative import when the room is needed', async () => {
  const start = vi.fn();
  const load = vi
    .fn()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(start);
  const cached = createRoomModuleCache(load);
  await expect(cached('plant')).rejects.toThrow('offline');
  expect(await cached('plant')).toBe(start);
  expect(load).toHaveBeenCalledTimes(2);
});
